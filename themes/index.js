/**
 * themes/index.js — loads all built-in themes and registers them with SnakeGame.
 *
 * Include this script after snake.js to use the JSON theme files as the source of truth:
 *
 *   <script src="snake.js"></script>
 *   <script src="themes/index.js"></script>
 *   <script>
 *     SnakeThemesReady.then(() => {
 *       const game = new SnakeGame('#snake-game');
 *     });
 *   </script>
 *
 * To add a new theme, create themes/mytheme.json and add it to the THEME_FILES list below.
 */

const THEME_FILES = [
  { key: 'dark',   url: 'themes/dark.json'   },
  { key: 'light',  url: 'themes/light.json'  },
  { key: 'trans',  url: 'themes/trans.json'  },
  { key: 'muted',  url: 'themes/muted.json'  },
  { key: 'ocean',  url: 'themes/ocean.json'  },
  { key: 'forest', url: 'themes/forest.json' },
  { key: 'neon',   url: 'themes/neon.json'   },
  { key: 'sunset', url: 'themes/sunset.json' },
];

window.SnakeThemesReady = Promise.all(
  THEME_FILES.map(({ key, url }) =>
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load theme: ${url}`);
        return r.json();
      })
      .then((data) => SnakeGame.registerTheme(key, data))
  )
);
