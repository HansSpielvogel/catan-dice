# Catan Dice — Claude Instructions

## Project
Single-file PWA for iPhone. All app logic lives in `index.html`. No build step, no framework, no dependencies.

## Hosting
GitHub Pages. Use relative paths (`./`) everywhere — `start_url`, `scope`, asset references — to work correctly from a subdirectory URL.

## Key Architecture

### Config (`cfg`)
```js
let cfg = { count: 2, sides: 6 }; // count = number of dice (1–5), sides = sides per die (4/6/8/10/12/20)
```
- Defaults to 2d6 (standard Catan)
- Persisted in localStorage as part of the unified state object
- Changing cfg triggers a full reset (pool + history cleared)

### localStorage
Single key `catan-dice-v2`, stores one JSON object:
```json
{ "pool": [...], "history": [[d1,d2], ...], "cfg": { "count": 2, "sides": 6 } }
```
- `pool` — remaining draw entries; null means use a fresh pool
- `history` — array of roll results, each an array of N die values
- `cfg` — current dice configuration
- All three are written together by `saveState(pool, history)` after every roll

### 3D Dice
- `buildCube(el, sides)` creates 6 `.face` divs inside a `.cube`
  - `sides === 6`: pip grid layout (`.pip-grid` with `.pip` spans)
  - `sides !== 6`: single `.die-number` span per face (text updated on each roll)
- Face CSS transforms: `face-1` front (+Z), `face-2` back, `face-3` right, `face-4` left, `face-5` top, `face-6` bottom
- To show face N, rotate the **container** using `FACE_ROT` map — never move individual faces
- `rotateTo(cubeEl, state, face)` accumulates absolute X/Y degrees in `state.x / state.y` across rolls (never reset) to avoid CSS transition artifacts; adds 1080° per roll for the spin effect
- For d6: `targetFace = rolledValue` (pip face index matches value 1–6)
- For non-d6: `targetFace = random 1–6`; that face's `.die-number` text is set to the rolled value before animating
- `cubes[]` and `states[]` are parallel arrays built by `buildDiceRow()`; size = `cfg.count`

### Die sizing (set on `:root` CSS vars)
| N dice | `--size` | `--half` |
|--------|----------|----------|
| 1      | 150px    | 75px     |
| 2      | 130px    | 65px     |
| 3      | 90px     | 45px     |
| 4      | 70px     | 35px     |
| 5      | 56px     | 28px     |

### Balancing Pool
- `freshPool(cfg)` enumerates all `sides^count` combinations recursively × `POOL_MULT=3`
- **Cap**: if `sides^count * mult > 5000`, returns `[]` — `drawRoll()` then generates pure random rolls (no balancing)
- `drawRoll(pool, cfg)` splices a random entry out (draw without replacement); auto-refills when empty
- Pool size for standard 2d6: 36 × 3 = 108 entries

### Theoretical Distribution
- `computeTheo(n, s)` uses DP convolution (not enumeration) — efficient for any NdS
- Returns `{ sum: probability }` map covering all reachable sums from `n` to `n*s`
- Used by `renderStats()` for the bar chart expected-frequency bars

### UI Panels
Two bottom-sheet panels, one shared backdrop (`#panel-backdrop`):
- `openPanel(panelEl)` — adds `.open` to panel + backdrop
- `closePanel()` — removes `.open` from both panels and backdrop
- Panels are mutually exclusive (closePanel closes both)
- Stats panel: `height: 72dvh`, scrollable content
- Settings panel: `height: auto; max-height: 60dvh`

### Confirm Modal
Shared `#confirm-overlay` with dynamic content and a callback:
```js
openConfirm(title, msg, onConfirm)  // sets text, stores callback
closeConfirm()                       // clears callback
```
Used for both "New Game" reset and "Switch to NdS?" settings change.

### Stats Chart
- Bars rendered for every sum from `cfg.count` to `cfg.count * cfg.sides`
- Two bars per column: gray (expected) and dark (actual), heights in px normalized to `BAR_H=100`
- Scale = `max(maxTheoreticalFreq, maxActualFreq)` so actual bars never overflow
- Chart wrapped in `#chart-wrap` with `overflow-x: auto` for configs with many sums (up to 96 bars for 5d20)
- Red/bold label for sum=7 only when `cfg.count===2 && cfg.sides===6` (Catan robber rule)
- `chartEl`, `statsTitleEl`, `historyListEl` are cached DOM refs (queried once at init)

### Red-7 Highlight
Only applies when `cfg.count === 2 && cfg.sides === 6` — the standard Catan robber trigger. Affects both the main sum display and the stats chart label.

## Code Quality Standards
These conventions are established and must be maintained in future stories:

- **cfg properties**: use `cfg.count` and `cfg.sides` — never single-letter abbreviations
- **Pure functions**: `freshPool(cfg)` and `drawRoll(pool, cfg)` take cfg as a parameter — do not revert to global access
- **DOM caching**: elements queried repeatedly (`chartEl`, `statsTitleEl`, `historyListEl`, `sumEl`) are cached at init — add new cached refs there, not inside render functions
- **Loop variables**: use descriptive names (`sum`, `value`) not single letters (`s`, `v`) in `renderStats`
- **Constants**: use `SCREAMING_SNAKE` and descriptive names (`POOL_MULT` not `MULT`, `BAR_H` is fine as domain-standard)
- **localStorage key**: currently `catan-dice-v2` — bump to v3 if the stored shape changes again

## Service Worker Cache
- Cache key is in `sw.js` line 1: `const CACHE = 'catan-dice-vX.Y'`
- Bump the version on every deploy so users get the latest app (old SW is replaced)
- Use semantic versioning: bump minor (v1.1 → v1.2) for content updates, major (v1.x → v2.0) for breaking changes
- The version label in the settings panel (`#version-label`) is populated at runtime from the SW cache key — **do not hardcode a version string in `index.html`**; only `sw.js` needs updating

## Git Workflow
- Commit after completing each story
- Do NOT push — user pushes manually

## Stories
See `stories.md` for full backlog with checkboxes.

## iOS-specific
- `height: 100dvh` for correct viewport with Safari bottom bar
- `env(safe-area-inset-*)` for Dynamic Island + home indicator
- `touch-action: manipulation` removes 300ms tap delay
- `will-change: transform` on `.cube` for smooth GPU animation
- `apple-mobile-web-app-capable` + `apple-mobile-web-app-status-bar-style` meta tags required for standalone mode
- `-webkit-overflow-scrolling: touch` on scrollable panels
