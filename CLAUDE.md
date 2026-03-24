# Catan Dice — Claude Instructions

## Project
Single-file PWA for iPhone. All app logic lives in `index.html`. No build step, no framework, no dependencies.

## Hosting
GitHub Pages. Use relative paths (`./`) everywhere — `start_url`, `scope`, asset references — to work correctly from a subdirectory URL.

## Key Architecture

### Config (`cfg`)
```js
let cfg = { n: 2, s: 6 }; // n = number of dice (1–5), s = sides per die (4/6/8/10/12/20)
```
- Defaults to 2d6 (standard Catan)
- Persisted in localStorage as part of the unified state object
- Changing cfg triggers a full reset (pool + history cleared)

### localStorage
Single key `catan-dice-v1`, stores one JSON object:
```json
{ "pool": [...], "history": [[d1,d2], ...], "cfg": { "n": 2, "s": 6 } }
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
- `cubes[]` and `states[]` are parallel arrays built by `buildDiceRow()`; size = `cfg.n`

### Die sizing (set on `:root` CSS vars)
| N dice | `--size` | `--half` |
|--------|----------|----------|
| 1      | 150px    | 75px     |
| 2      | 130px    | 65px     |
| 3      | 90px     | 45px     |
| 4      | 70px     | 35px     |
| 5      | 56px     | 28px     |

### Balancing Pool
- `freshPool()` enumerates all `s^n` combinations recursively × `MULT=3`
- **Cap**: if `s^n > 5000`, returns `[]` — `drawRoll()` then generates pure random rolls (no balancing)
- `drawRoll(pool)` splices a random entry out (draw without replacement); auto-refills when empty
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
- Bars rendered for every sum from `cfg.n` to `cfg.n * cfg.s`
- Two bars per column: gray (expected) and dark (actual), heights in px normalized to `BAR_H=100`
- Scale = `max(maxTheoreticalFreq, maxActualFreq)` so actual bars never overflow
- Chart wrapped in `#chart-wrap` with `overflow-x: auto` for configs with many sums (up to 96 bars for 5d20)
- Red/bold label for sum=7 only when `cfg.n===2 && cfg.s===6` (Catan robber rule)

### Red-7 Highlight
Only applies when `cfg.n === 2 && cfg.s === 6` — the standard Catan robber trigger. Affects both the main sum display and the stats chart label.

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
