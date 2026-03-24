# Catan Dice — Claude Instructions

## Project
Single-file PWA for iPhone. All app logic lives in `index.html`. No build step, no framework, no dependencies.

## Hosting
GitHub Pages. Use relative paths (`./`) everywhere — `start_url`, `scope`, asset references — to work correctly from a subdirectory URL.

## Key Architecture

### 3D Dice
- Each `.cube` contains 6 `.face` divs, placed with CSS 3D transforms
- Face positions: `face-1` front (+Z), `face-2` back, `face-3` right, `face-4` left, `face-5` top, `face-6` bottom
- To show face N, rotate the container using `FACE_ROT` map — do NOT move individual faces
- Accumulate absolute X/Y degrees in `state.x / state.y` across rolls (never reset) to avoid CSS transition artifacts

### Balancing Pool
- `freshPool()` generates all 36 (d1, d2) combinations × `MULT` (default 3) = 108 entries
- `drawRoll(pool)` picks a random index, splices it out (draw without replacement)
- When pool empties it auto-refills — this is the balancing mechanism
- Pool is saved to `localStorage` under key `catan-dice-v1` after every roll

### State
- `s1`, `s2` — die animation state `{ x, y, face }` — kept in memory only (resets to face 1 on reload, which is fine)
- `pool` — persisted in localStorage so balancing survives page reloads mid-game

## Stories
See `stories.md` for full backlog with checkboxes.

## iOS-specific
- `height: 100dvh` for correct viewport with Safari bottom bar
- `env(safe-area-inset-*)` for Dynamic Island + home indicator
- `touch-action: manipulation` removes 300ms tap delay
- `will-change: transform` on `.cube` for smooth GPU animation
- `apple-mobile-web-app-capable` + `apple-mobile-web-app-status-bar-style` meta tags required for standalone mode
