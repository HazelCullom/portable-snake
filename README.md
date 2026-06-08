# portable-snake

A framework-free, drop-in Snake game for any website. No dependencies, no build step — just include two files and go.

## Quick start

```html
<link rel="stylesheet" href="snake.css" />
<div id="snake-game"></div>
<script src="snake.js"></script>
<script>
  const game = new SnakeGame('#snake-game');
</script>
```

## Files

| File | Purpose |
|------|---------|
| `snake.js` | Self-contained game class |
| `snake.css` | Companion styles |
| `index.html` | Live demo |

## Constructor options

```js
const game = new SnakeGame('#snake-game', {
  gridSize:    20,       // cells per row/column
  cellSize:    24,       // px per cell — canvas size = gridSize × cellSize
  speed:       8,        // moves per second
  arena:       'medium', // 'small' | 'medium' | 'large'
  theme:       'dark',   // any registered theme key
  wallMode:    'wrap',   // 'wrap' | 'lethal'
  bigFruit:    false,    // enable big 2×2 fruit
  onScore:     (score) => console.log(score),
  onGameOver:  (score) => console.log('Game over:', score),
});
```

**Arena sizes** share the same canvas pixel footprint — only grid density changes:

| Arena | Grid | Feel |
|-------|------|------|
| `small` | 15 × 15 | Fewer, larger cells — easier |
| `medium` | 20 × 20 | Default |
| `large` | 30 × 30 | More, smaller cells — harder |

## Public API

```js
game.start();    // start or restart
game.pause();    // pause mid-game
game.resume();   // resume after pause
game.destroy();  // remove from DOM and clean up
game.score;      // current score (read-only)
```

## Controls

| Input | Action |
|-------|--------|
| Arrow keys / WASD | Move |
| P | Pause / resume |
| Enter / Space | Start / restart |
| Escape | Close settings |

Swipe gestures are supported on touch screens.

## In-game settings

A gear icon in the top-right corner of the game opens a settings panel with:

- **Arena size** — S / M / L density toggle
- **Speed** — 1–20 moves per second
- **Walls** — Wrap (pass through) or Lethal (game over on hit). Lethal mode shows a pulsing hazard glow around the edges.
- **Big fruit** — when enabled, a 2×2 oversized fruit has a ~15% chance to spawn alongside normal fruit. Eating it scores 4 points and grows the snake by 4 over the next four moves.
- **Theme** — visual theme picker with mini previews

## Themes

Eight themes ship out of the box:

| Key | Description |
|-----|-------------|
| `dark` | Deep navy with green snake — the default |
| `light` | Off-white with slate snake |
| `trans` | Trans pride flag colors |
| `muted` | Warm earth tones, low contrast |
| `ocean` | Deep sea navy with cyan snake and coral food |
| `forest` | Dark green with mint snake and red berry food |
| `neon` | Near-black with lime snake and fuchsia food |
| `sunset` | Deep purple with orange snake and pink food |

### Adding a custom theme

Call `SnakeGame.registerTheme()` before (or after) instantiating the game:

```js
SnakeGame.registerTheme('mytheme', {
  label: 'My Theme',
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
});

const game = new SnakeGame('#snake-game', { theme: 'mytheme' });
```

## License

[MIT](LICENSE)
