/**
 * SnakeGame — portable, framework-free snake game
 *
 * Usage:
 *   const game = new SnakeGame('#my-container');
 *   game.start();
 *
 * Options (second argument, all optional):
 *   gridSize    {number}  cells per row/column (default: 20)
 *   speed       {number}  moves per second (default: 8)
 *   cellSize    {number}  px per cell (default: 24)
 *   arena       {string}  'small' | 'medium' | 'large' (default: 'medium')
 *   theme       {string}  key of any registered theme (default: 'dark')
 *   onScore     {function(score)}
 *   onGameOver  {function(score)}
 *
 * Themes are defined inline in SnakeGame.THEMES. To add a custom theme at runtime:
 *   SnakeGame.registerTheme('mytheme', { label: 'My Theme', colors: { ... } });
 *
 * Arena sizes share the same canvas pixel footprint — only grid density changes.
 * Overall canvas size is set by gridSize × cellSize at construction time.
 */

class SnakeGame {
  static DEFAULTS = {
    gridSize: 20,
    speed: 12,
    cellSize: 24,
    arena: 'medium',
    theme: 'dark',
  };

  static ARENA_GRIDS = { small: 15, medium: 20, large: 30 };

  /**
   * Register a theme from a plain object (e.g. parsed from a JSON file).
   * Overwrites any existing theme with the same key.
   *
   *   SnakeGame.registerTheme('mytheme', {
   *     label: 'My Theme',
   *     colors: { background, grid, snake, snakeHead, food,
   *               overlay, overlayText, overlayBody, wallGlow }
   *   });
   */
  static registerTheme(key, data) {
    SnakeGame.THEMES[key] = data;
  }

  static THEMES = {
    dark: {
      label: 'Dark',
      colors: {
        background:  '#0f172a',
        grid:        '#1e293b',
        snake:       '#4ade80',
        snakeHead:   '#16a34a',
        food:        '#f87171',
        overlay:     'rgba(15, 23, 42, 0.82)',
        overlayText: '#f8fafc',
        overlayBody: '#94a3b8',
        wallGlow:    '#ef4444',
      },
    },
    light: {
      label: 'Light',
      colors: {
        background:  '#f1f5f9',
        grid:        '#e2e8f0',
        snake:       '#475569',
        snakeHead:   '#0f172a',
        food:        '#dc2626',
        overlay:     'rgba(241, 245, 249, 0.88)',
        overlayText: '#0f172a',
        overlayBody: '#64748b',
        wallGlow:    '#f97316',
      },
    },
    trans: {
      label: 'Pride',
      colors: {
        background:  '#55cdfc',
        grid:        '#3ba4ce',
        snake:       '#f7a8b8',
        snakeHead:   '#f36d88',
        food:        '#ffffff',
        overlay:     'rgba(192, 192, 192, 0.18)',
        overlayText: '#000000',
        overlayBody: '#000000ce',
        wallGlow:    '#ff0e36f6',
      },
    },
    muted: {
      label: 'Muted',
      colors: {
        background:  '#2a2825',
        grid:        '#35322e',
        snake:       '#7d7468',
        snakeHead:   '#5c564e',
        food:        '#b09a7e',
        overlay:     'rgba(30, 28, 25, 0.85)',
        overlayText: '#d4c9ba',
        overlayBody: '#7a7068',
        wallGlow:    '#c4935a',
      },
    },
    ocean: {
      label: 'Ocean',
      colors: {
        background:  '#0a1628',
        grid:        '#0d2137',
        snake:       '#22d3ee',
        snakeHead:   '#0891b2',
        food:        '#fb923c',
        overlay:     'rgba(10, 22, 40, 0.85)',
        overlayText: '#e0f2fe',
        overlayBody: '#7dd3fc',
        wallGlow:    '#06b6d4',
      },
    },
    forest: {
      label: 'Forest',
      colors: {
        background:  '#0d1f12',
        grid:        '#162b1d',
        snake:       '#86efac',
        snakeHead:   '#22c55e',
        food:        '#dc2626',
        overlay:     'rgba(13, 31, 18, 0.87)',
        overlayText: '#dcfce7',
        overlayBody: '#86efac',
        wallGlow:    '#ef4444',
      },
    },
    neon: {
      label: 'Neon',
      colors: {
        background:  '#080b14',
        grid:        '#0f1729',
        snake:       '#a3e635',
        snakeHead:   '#65a30d',
        food:        '#f0abfc',
        overlay:     'rgba(8, 11, 20, 0.88)',
        overlayText: '#e879f9',
        overlayBody: '#a855f7',
        wallGlow:    '#e879f9',
      },
    },
    sunset: {
      label: 'Sunset',
      colors: {
        background:  '#1e0a2e',
        grid:        '#2d1040',
        snake:       '#fb923c',
        snakeHead:   '#f97316',
        food:        '#fb7185',
        overlay:     'rgba(30, 10, 46, 0.86)',
        overlayText: '#fed7aa',
        overlayBody: '#c084fc',
        wallGlow:    '#f97316',
      },
    },
  };

  constructor(container, options = {}) {
    this._container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!this._container) {
      throw new Error(`SnakeGame: container "${container}" not found`);
    }

    const opts = { ...SnakeGame.DEFAULTS, ...options };
    this._canvasPx  = opts.gridSize * opts.cellSize;
    this._arena     = opts.arena;
    this._theme     = opts.theme;
    this._speed     = opts.speed;
    this._wallMode  = opts.wallMode ?? 'wrap'; // 'wrap' | 'lethal'
    this._bigFruit  = opts.bigFruit ?? false;
    this._onScore     = opts.onScore;
    this._onGameOver  = opts.onGameOver;

    // Resolve colors from theme
    this._colors = { ...SnakeGame.THEMES[this._theme]?.colors ?? SnakeGame.THEMES.dark.colors };
    // Compute grid/cell from arena
    this._gridSize = SnakeGame.ARENA_GRIDS[this._arena] ?? SnakeGame.ARENA_GRIDS.medium;
    this._cellSize = Math.round(this._canvasPx / this._gridSize);

    this._state = 'idle';
    this._animFrame = null;
    this._lastTick  = 0;
    this._stateBeforeSettings = null;
    this._onClickOutside = null;
    this._highScore = Number(localStorage.getItem('snakeHighScore') ?? 0);

    this._buildDOM();
    this._bindEvents();
    this._reset();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  start() {
    if (this._state === 'running') return;
    if (this._state === 'over') this._reset();
    this._state = 'running';
    this._overlay.classList.add('sg-hidden');
    this._loop(performance.now());
  }

  pause() {
    if (this._state !== 'running') return;
    this._state = 'paused';
    cancelAnimationFrame(this._animFrame);
    this._showOverlay('Paused', 'Press P or tap to resume');
  }

  resume() {
    if (this._state !== 'paused') return;
    this._state = 'running';
    this._overlay.classList.add('sg-hidden');
    this._loop(performance.now());
  }

  destroy() {
    cancelAnimationFrame(this._animFrame);
    this._unbindEvents();
    this._container.innerHTML = '';
    this._container.classList.remove('sg-container');
  }

  get score() { return this._score; }

  // ─── Theme ─────────────────────────────────────────────────────────────────

  _updateGlowEl() {
    const active = this._wallMode === 'lethal';
    this._glowEl.classList.toggle('sg-glow--active', active);
    this._glowEl.style.setProperty('--sg-glow-color', this._colors.wallGlow);
  }

  _applyTheme(key) {
    this._theme  = key;
    this._colors = { ...SnakeGame.THEMES[key].colors };
    this._syncOverlayColors();
    this._updateGlowEl();
    this._prerenderGrid();
    this._draw();
    this._settingsPanel.querySelectorAll('.sg-theme-btn').forEach((btn) => {
      btn.classList.toggle('sg-theme-btn--active', btn.dataset.theme === key);
    });
  }

  _syncOverlayColors() {
    const c = this._colors;
    this._overlay.style.background    = c.overlay;
    this._overlayTitle.style.color    = c.overlayText;
    this._overlayBody.style.color     = c.overlayBody;
    this._scoreEl.style.color         = c.overlayText;
  }

  // ─── Arena ─────────────────────────────────────────────────────────────────

  _switchArena(arena) {
    this._arena    = arena;
    this._gridSize = SnakeGame.ARENA_GRIDS[arena];
    this._cellSize = Math.round(this._canvasPx / this._gridSize);
    this._prerenderGrid();
    this._reset();
    this._draw();
    this._settingsPanel.querySelectorAll('.sg-arena-btn').forEach((btn) => {
      btn.classList.toggle('sg-arena-btn--active', btn.dataset.arena === arena);
    });
  }

  // ─── DOM ───────────────────────────────────────────────────────────────────

  _buildDOM() {
    this._container.classList.add('sg-container');
    this._container.innerHTML = '';

    this._canvas = document.createElement('canvas');
    this._canvas.width  = this._canvasPx;
    this._canvas.height = this._canvasPx;
    this._canvas.className = 'sg-canvas';
    this._ctx = this._canvas.getContext('2d');

    this._gridCanvas = document.createElement('canvas');
    this._gridCanvas.width  = this._canvasPx;
    this._gridCanvas.height = this._canvasPx;
    this._gridCtx = this._gridCanvas.getContext('2d');
    this._prerenderGrid();

    this._scoreEl = document.createElement('div');
    this._scoreEl.className = 'sg-score';
    this._scoreEl.textContent = '0';

    this._highScoreEl = document.createElement('div');
    this._highScoreEl.className = 'sg-high-score';
    this._highScoreEl.textContent = `HI ${this._highScore}`;

    this._settingsBtn = document.createElement('button');
    this._settingsBtn.className = 'sg-settings-btn';
    this._settingsBtn.setAttribute('aria-label', 'Settings');
    this._settingsBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
    </svg>`;

    this._overlay = document.createElement('div');
    this._overlay.className = 'sg-overlay';

    this._overlayTitle = document.createElement('div');
    this._overlayTitle.className = 'sg-overlay-title';

    this._overlayBody = document.createElement('div');
    this._overlayBody.className = 'sg-overlay-body';

    this._overlay.appendChild(this._overlayTitle);
    this._overlay.appendChild(this._overlayBody);

    this._settingsPanel = this._buildSettingsPanel();

    // Hazard glow — sits above overlay, only visible in lethal wall mode
    this._glowEl = document.createElement('div');
    this._glowEl.className = 'sg-glow';

    this._container.appendChild(this._highScoreEl);
    this._container.appendChild(this._scoreEl);
    this._container.appendChild(this._settingsBtn);
    this._container.appendChild(this._canvas);
    this._container.appendChild(this._overlay);
    this._container.appendChild(this._glowEl);
    this._container.appendChild(this._settingsPanel);

    this._syncOverlayColors();
    this._updateGlowEl();
    this._showOverlay('Snake', 'Press Space or tap to start');
  }

  _buildSettingsPanel() {
    const panel = document.createElement('div');
    panel.className = 'sg-settings sg-hidden';

    const header = document.createElement('div');
    header.className = 'sg-settings-header';

    const title = document.createElement('span');
    title.className = 'sg-settings-title';
    title.textContent = 'Settings';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'sg-settings-close';
    closeBtn.setAttribute('aria-label', 'Close settings');
    closeBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
    </svg>`;
    closeBtn.addEventListener('click', () => this._closeSettings());

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    panel.appendChild(this._makeSection('Gameplay', [
      this._makeArenaSelector(),
      this._makeSlider('Speed', 1, 20, this._speed, (v) => { this._speed = v; }),
      this._makeWallToggle(),
      this._makeBigFruitToggle(),
    ]));

    panel.appendChild(this._makeSection('Theme', [this._makeThemeSelector()]));

    const footer = document.createElement('div');
    footer.className = 'sg-settings-footer';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'sg-settings-reset';
    resetBtn.textContent = 'Reset to defaults';
    resetBtn.addEventListener('click', () => this._resetSettings());
    footer.appendChild(resetBtn);
    panel.appendChild(footer);

    return panel;
  }

  _makeSection(label, rows) {
    const section = document.createElement('div');
    section.className = 'sg-settings-section';
    const heading = document.createElement('div');
    heading.className = 'sg-settings-section-label';
    heading.textContent = label;
    section.appendChild(heading);
    rows.forEach((row) => section.appendChild(row));
    return section;
  }

  _makeArenaSelector() {
    const row = document.createElement('div');
    row.className = 'sg-settings-row';

    const lbl = document.createElement('label');
    lbl.className = 'sg-settings-label';
    lbl.textContent = 'Arena size';

    const group = document.createElement('div');
    group.className = 'sg-arena-group';

    ['small', 'medium', 'large'].forEach((size) => {
      const btn = document.createElement('button');
      btn.className = 'sg-arena-btn';
      btn.dataset.arena = size;
      btn.textContent = size.charAt(0).toUpperCase();
      btn.title = size.charAt(0).toUpperCase() + size.slice(1);
      if (size === this._arena) btn.classList.add('sg-arena-btn--active');
      btn.addEventListener('click', () => this._switchArena(size));
      group.appendChild(btn);
    });

    row.appendChild(lbl);
    row.appendChild(group);
    return row;
  }

  _makeSlider(label, min, max, initialValue, onChange) {
    const row = document.createElement('div');
    row.className = 'sg-settings-row';

    const lbl = document.createElement('label');
    lbl.className = 'sg-settings-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'sg-settings-value';
    val.textContent = initialValue;

    const slider = document.createElement('input');
    slider.type  = 'range';
    slider.className = 'sg-slider';
    slider.min   = min;
    slider.max   = max;
    slider.step  = 1;
    slider.value = initialValue;
    slider.dataset.sgRole = 'speed';

    slider.addEventListener('input', () => {
      val.textContent = slider.value;
      onChange(Number(slider.value));
    });

    const right = document.createElement('div');
    right.className = 'sg-settings-right';
    right.appendChild(slider);
    right.appendChild(val);

    row.appendChild(lbl);
    row.appendChild(right);
    return row;
  }

  _makeWallToggle() {
    const row = document.createElement('div');
    row.className = 'sg-settings-row';

    const lbl = document.createElement('label');
    lbl.className = 'sg-settings-label';
    lbl.textContent = 'Walls';

    const group = document.createElement('div');
    group.className = 'sg-arena-group';

    ['wrap', 'lethal'].forEach((mode) => {
      const btn = document.createElement('button');
      btn.className = 'sg-arena-btn';
      btn.dataset.wall = mode;
      btn.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
      if (mode === this._wallMode) btn.classList.add('sg-arena-btn--active');
      btn.addEventListener('click', () => {
        this._wallMode = mode;
        group.querySelectorAll('.sg-arena-btn').forEach((b) => {
          b.classList.toggle('sg-arena-btn--active', b.dataset.wall === mode);
        });
        this._updateGlowEl();
      });
      group.appendChild(btn);
    });

    row.appendChild(lbl);
    row.appendChild(group);
    return row;
  }

  _makeBigFruitToggle() {
    const row = document.createElement('div');
    row.className = 'sg-settings-row';

    const lbl = document.createElement('label');
    lbl.className = 'sg-settings-label';
    lbl.textContent = 'Big fruit';

    const group = document.createElement('div');
    group.className = 'sg-arena-group';

    ['Off', 'On'].forEach((label) => {
      const on = label === 'On';
      const btn = document.createElement('button');
      btn.className = 'sg-arena-btn';
      btn.dataset.bigFruit = String(on);
      btn.textContent = label;
      if (on === this._bigFruit) btn.classList.add('sg-arena-btn--active');
      btn.addEventListener('click', () => {
        this._bigFruit = on;
        group.querySelectorAll('.sg-arena-btn').forEach((b) => {
          b.classList.toggle('sg-arena-btn--active', b.dataset.bigFruit === String(on));
        });
      });
      group.appendChild(btn);
    });

    row.appendChild(lbl);
    row.appendChild(group);
    return row;
  }

  _makeThemeSelector() {
    const grid = document.createElement('div');
    grid.className = 'sg-theme-grid';

    Object.entries(SnakeGame.THEMES).forEach(([key, theme]) => {
      const btn = document.createElement('button');
      btn.className = 'sg-theme-btn';
      btn.dataset.theme = key;
      if (key === this._theme) btn.classList.add('sg-theme-btn--active');
      btn.title = theme.label;

      const preview = document.createElement('canvas');
      preview.width  = 48;
      preview.height = 34;
      preview.className = 'sg-theme-preview';
      this._drawThemePreview(preview, theme.colors);

      const lbl = document.createElement('span');
      lbl.textContent = theme.label;

      btn.appendChild(preview);
      btn.appendChild(lbl);
      btn.addEventListener('click', () => this._applyTheme(key));
      grid.appendChild(btn);
    });

    return grid;
  }

  _drawThemePreview(canvas, colors) {
    const ctx  = canvas.getContext('2d');
    const w    = canvas.width;
    const h    = canvas.height;
    const cols = 8;
    const rows = Math.round(cols * (h / w));
    const cw   = w / cols;
    const ch   = h / rows;

    // background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, w, h);

    // grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath(); ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, h); ctx.stroke();
    }
    for (let i = 0; i <= rows; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * ch); ctx.lineTo(w, i * ch); ctx.stroke();
    }

    // snake body (3 segments, horizontal)
    const sy = Math.floor(rows * 0.45);
    ctx.fillStyle = colors.snake;
    [[3, sy], [2, sy], [1, sy]].forEach(([x, y]) => {
      ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
    });

    // snake head
    ctx.fillStyle = colors.snakeHead;
    ctx.fillRect(4 * cw + 1, sy * ch + 1, cw - 2, ch - 2);

    // food
    ctx.fillStyle = colors.food;
    ctx.beginPath();
    ctx.arc(6.5 * cw, (rows * 0.68) * ch, Math.min(cw, ch) / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
  }

  _resetSettings() {
    const d = SnakeGame.DEFAULTS;
    this._speed    = d.speed;
    this._arena    = d.arena;
    this._theme    = d.theme;
    this._wallMode = 'wrap';
    this._bigFruit = false;

    this._gridSize = SnakeGame.ARENA_GRIDS[this._arena];
    this._cellSize = Math.round(this._canvasPx / this._gridSize);
    this._colors   = { ...SnakeGame.THEMES[this._theme].colors };

    // Sync speed slider
    const slider = this._settingsPanel.querySelector('[data-sg-role="speed"]');
    if (slider) {
      slider.value = this._speed;
      slider.closest('.sg-settings-row').querySelector('.sg-settings-value').textContent = this._speed;
    }

    // Sync arena buttons
    this._settingsPanel.querySelectorAll('[data-arena]').forEach((btn) => {
      btn.classList.toggle('sg-arena-btn--active', btn.dataset.arena === this._arena);
    });

    // Sync wall buttons
    this._settingsPanel.querySelectorAll('[data-wall]').forEach((btn) => {
      btn.classList.toggle('sg-arena-btn--active', btn.dataset.wall === this._wallMode);
    });

    // Sync big fruit buttons
    this._settingsPanel.querySelectorAll('[data-big-fruit]').forEach((btn) => {
      btn.classList.toggle('sg-arena-btn--active', btn.dataset.bigFruit === String(this._bigFruit));
    });

    // Sync theme buttons
    this._settingsPanel.querySelectorAll('.sg-theme-btn').forEach((btn) => {
      btn.classList.toggle('sg-theme-btn--active', btn.dataset.theme === this._theme);
    });

    this._syncOverlayColors();
    this._updateGlowEl();
    this._reset();
    this._draw();
  }

  _bindEvents() {
    this._onKey          = (e) => this._handleKey(e);
    this._onTouch        = (e) => this._handleTouch(e);
    this._onOverlayClick = ()  => this._handleOverlayClick();
    this._onSettingsBtn  = ()  => this._state === 'settings' ? this._closeSettings() : this._openSettings();

    document.addEventListener('keydown', this._onKey);
    this._canvas.addEventListener('touchstart', this._onTouch, { passive: false });
    this._overlay.addEventListener('click', this._onOverlayClick);
    this._settingsBtn.addEventListener('click', this._onSettingsBtn);
  }

  _unbindEvents() {
    document.removeEventListener('keydown', this._onKey);
    this._canvas.removeEventListener('touchstart', this._onTouch);
    this._overlay.removeEventListener('click', this._onOverlayClick);
    this._settingsBtn.removeEventListener('click', this._onSettingsBtn);
    if (this._onClickOutside) document.removeEventListener('mousedown', this._onClickOutside);
  }

  // ─── Settings open/close ───────────────────────────────────────────────────

  _openSettings() {
    if (this._state === 'settings') return;
    this._stateBeforeSettings = this._state;
    if (this._state === 'running') cancelAnimationFrame(this._animFrame);
    this._state = 'settings';

    const panel = this._settingsPanel;
    panel.classList.remove('sg-hidden', 'sg-settings--closing');
    panel.classList.add('sg-settings--opening');

    this._onClickOutside = (e) => {
      if (!panel.contains(e.target) && !this._settingsBtn.contains(e.target)) {
        this._closeSettings();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', this._onClickOutside), 0);
  }

  _closeSettings() {
    document.removeEventListener('mousedown', this._onClickOutside);
    this._onClickOutside = null;

    const panel = this._settingsPanel;
    panel.classList.remove('sg-settings--opening');
    panel.classList.add('sg-settings--closing');

    const onClose = (e) => {
      if (e.animationName !== 'sg-dropdown-out') return;
      panel.removeEventListener('animationend', onClose);
      panel.classList.add('sg-hidden');
      panel.classList.remove('sg-settings--closing');

      const prev = this._stateBeforeSettings;
      this._stateBeforeSettings = null;

      if (prev === 'running') {
        this._state = 'running';
        this._loop(performance.now());
      } else if (prev === 'over') {
        this._state = 'over';
        this._showOverlay('Game Over', `Score: ${this._score}\nPress Space or tap to restart`);
      } else {
        this._state = 'idle';
        this._showOverlay('Snake', 'Press Space or tap to start');
      }
    };
    panel.addEventListener('animationend', onClose);
  }

  // ─── Game State ────────────────────────────────────────────────────────────

  _reset() {
    const mid = Math.floor(this._gridSize / 2);
    this._snake = [
      { x: mid,     y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    this._dir          = { x: 1, y: 0 };
    this._inputQueue   = [];
    this._pendingGrowth = 0;
    this._score        = 0;
    this._scoreEl.textContent = '0';
    this._placeFood();
    this._draw();
  }

  _placeFood() {
    const occupied = new Set(this._snake.map((s) => `${s.x},${s.y}`));
    const g = this._gridSize;

    // Try big fruit first (~15% chance) if enabled and there's room
    if (this._bigFruit && Math.random() < 0.15) {
      const candidates = [];
      for (let x = 0; x < g - 1; x++) {
        for (let y = 0; y < g - 1; y++) {
          if (!occupied.has(`${x},${y}`)   && !occupied.has(`${x+1},${y}`) &&
              !occupied.has(`${x},${y+1}`) && !occupied.has(`${x+1},${y+1}`)) {
            candidates.push({ x, y });
          }
        }
      }
      if (candidates.length > 0) {
        this._food = { ...candidates[Math.floor(Math.random() * candidates.length)], big: true };
        return;
      }
    }

    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * g),
        y: Math.floor(Math.random() * g),
      };
    } while (occupied.has(`${pos.x},${pos.y}`));
    this._food = { ...pos, big: false };
  }

  // ─── Game Loop ─────────────────────────────────────────────────────────────

  _loop(now) {
    this._animFrame = requestAnimationFrame((t) => this._loop(t));
    const interval = 1000 / this._speed;
    if (now - this._lastTick < interval) return;
    this._lastTick = now;
    this._tick();
  }

  _tick() {
    if (this._inputQueue.length > 0) this._dir = this._inputQueue.shift();
    const head = this._snake[0];
    const nx = head.x + this._dir.x;
    const ny = head.y + this._dir.y;

    if (this._wallMode === 'lethal' &&
        (nx < 0 || nx >= this._gridSize || ny < 0 || ny >= this._gridSize)) {
      this._gameOver();
      return;
    }

    const next = {
      x: (nx + this._gridSize) % this._gridSize,
      y: (ny + this._gridSize) % this._gridSize,
    };

    if (this._snake.some((s) => s.x === next.x && s.y === next.y)) {
      this._gameOver();
      return;
    }

    this._snake.unshift(next);

    const f = this._food;
    const atFood = f.big
      ? (next.x === f.x || next.x === f.x + 1) && (next.y === f.y || next.y === f.y + 1)
      : next.x === f.x && next.y === f.y;

    if (atFood) {
      this._score += f.big ? 4 : 1;
      this._scoreEl.textContent = this._score;
      this._onScore?.(this._score);
      if (f.big) this._pendingGrowth += 3;
      this._placeFood();
    } else if (this._pendingGrowth > 0) {
      this._pendingGrowth--;
    } else {
      this._snake.pop();
    }

    this._draw();
  }

  _gameOver() {
    this._state = 'over';
    cancelAnimationFrame(this._animFrame);
    if (this._score > this._highScore) {
      this._highScore = this._score;
      localStorage.setItem('snakeHighScore', this._highScore);
      this._highScoreEl.textContent = `HI ${this._highScore}`;
    }
    this._onGameOver?.(this._score);
    this._showOverlay('Game Over', `Score: ${this._score}\nPress Space or tap to restart`);
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  _handleKey(e) {
    if (this._state === 'settings') {
      if (e.key === 'Escape') this._closeSettings();
      return;
    }

    const map = {
      ArrowUp:    { x: 0,  y: -1 },
      ArrowDown:  { x: 0,  y: 1  },
      ArrowLeft:  { x: -1, y: 0  },
      ArrowRight: { x: 1,  y: 0  },
      w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
      a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
    };

    if (e.key === 'Enter' || e.key === ' ') { this._handleOverlayClick(); return; }
    if (e.key === 'p' || e.key === 'P') {
      this._state === 'running' ? this.pause() : this.resume();
      return;
    }
    if (e.key === 'Escape') this._openSettings();
    

    const next = map[e.key];
    if (!next) return;
    const last = this._inputQueue.at(-1) ?? this._dir;
    if (next.x === last.x && next.y === last.y) return;
    if ((next.x !== -last.x || next.y !== -last.y) && this._inputQueue.length < 3)
      this._inputQueue.push(next);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  }

  _touchStart = null;

  _handleTouch(e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    this._touchStart = { x: t.clientX, y: t.clientY };

    const onEnd = (ev) => {
      const end = ev.changedTouches[0];
      const dx = end.clientX - this._touchStart.x;
      const dy = end.clientY - this._touchStart.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      const swipe = Math.abs(dx) > Math.abs(dy)
        ? { x: Math.sign(dx), y: 0 }
        : { x: 0, y: Math.sign(dy) };
      const last = this._inputQueue.at(-1) ?? this._dir;
      if ((swipe.x !== -last.x || swipe.y !== -last.y) && this._inputQueue.length < 3)
        this._inputQueue.push(swipe);
      this._canvas.removeEventListener('touchend', onEnd);
    };
    this._canvas.addEventListener('touchend', onEnd, { passive: true });
  }

  _handleOverlayClick() {
    if (this._state === 'idle' || this._state === 'over') this.start();
    else if (this._state === 'paused') this.resume();
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  _prerenderGrid() {
    const ctx = this._gridCtx;
    const c   = this._cellSize;
    const g   = this._gridSize;
    const px  = this._canvasPx;

    ctx.fillStyle = this._colors.background;
    ctx.fillRect(0, 0, px, px);

    ctx.strokeStyle = this._colors.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= g; i++) {
      ctx.beginPath(); ctx.moveTo(i * c, 0);  ctx.lineTo(i * c, px); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,  i * c); ctx.lineTo(px,  i * c); ctx.stroke();
    }
  }

  _draw() {
    const ctx = this._ctx;
    const c   = this._cellSize;
    const col = this._colors;

    ctx.drawImage(this._gridCanvas, 0, 0);

    ctx.fillStyle = col.food;
    if (this._food.big) {
      const fx = this._food.x * c + 2;
      const fy = this._food.y * c + 2;
      const fw = c * 2 - 4;
      const r  = Math.min(fw / 3, c / 2);
      ctx.beginPath();
      ctx.roundRect(fx, fy, fw, fw, r);
      ctx.fill();
    } else {
      const fx = this._food.x * c + c / 2;
      const fy = this._food.y * c + c / 2;
      ctx.beginPath();
      ctx.arc(fx, fy, c / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = col.snake;
    for (let i = 1; i < this._snake.length; i++) {
      const s = this._snake[i];
      ctx.fillRect(s.x * c + 1, s.y * c + 1, c - 2, c - 2);
    }

    const h = this._snake[0];
    ctx.fillStyle = col.snakeHead;
    ctx.fillRect(h.x * c + 1, h.y * c + 1, c - 2, c - 2);
  }

  _showOverlay(title, body) {
    this._overlayTitle.textContent = title;
    this._overlayBody.textContent  = body;
    this._overlay.classList.remove('sg-hidden');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SnakeGame;
}
