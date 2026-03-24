# Catan Dice App — Project Plan

## Architecture

- **Type:** Progressive Web App (PWA), single `index.html` file
- **Stack:** Vanilla HTML/CSS/JS — no framework, no build step
- **Hosting:** GitHub Pages (static, free)
- **Install:** Safari → Share → "Add to Home Screen" on iPhone
- **Target device:** iPhone 17 (optimized for ~390pt logical width, Dynamic Island safe area, home indicator padding)

### Core modules (all in index.html)
- `DicePool` — manages the weighted roll pool and draw logic
- `DiceUI` — renders dice faces, triggers 3D CSS animation
- `State` — holds current game state (pool, history), persisted in `localStorage`

### Balancing Logic
- All 36 possible (die1, die2) combinations for 2×d6 are enumerated
- Pool = those 36 combinations × multiplier (default: 3 → 108 entries)
- Each roll draws randomly from the remaining pool entries
- When pool is exhausted, it refills automatically
- Multiplier controls aggressiveness: ×1 = very aggressive, ×3 = gentle (fits ~120-roll Catan game)
- Pool is stored in `localStorage` so it survives page reloads mid-game

---

## Stories

### Story 1 — MVP ✅ DONE
- [x] 2×d6, tap dice to roll
- [x] 3D CSS flip/roll animation on dice
- [x] Show both dice faces + sum prominently
- [x] Balancing pool logic (36×3, draw without replacement, auto-refill)
- [x] Light mode, iPhone-optimized layout
- [x] PWA manifest + service worker (offline support, home screen icon)
- [x] State persisted in localStorage
- [x] Sum "7" highlighted in red (triggers robber in Catan)

### Story 2 — Stats View ✅ DONE
- [x] Scrollable history of all rolls (number + sum)
- [x] Bar chart: actual frequency vs theoretical frequency per sum (2–12)
- [x] Toggle button to show/hide stats panel

### Story 3 — Reset ✅ DONE
- [x] Reset button visible in UI (inside stats panel, labeled "New Game")
- [x] "Are you sure?" confirmation modal before reset
- [x] Clears pool, history, and localStorage

### Story 4 — Configurable Dice ✅ DONE
- [x] Settings panel: choose number of dice (1–5)
- [x] Settings panel: choose sides per die (d4, d6, d8, d10, d12, d20)
- [x] Pool recalculates on change (all N^S combinations × multiplier)
- [x] Triggers implicit reset with confirmation

### Story 5 — Shake to Roll
- [ ] Use DeviceMotion API to detect phone shake
- [ ] Triggers same roll action as tap
- [ ] Sensitivity configurable or auto-tuned

### Story 7 — Die & Pip Color Themes
- [ ] Color picker or preset swatches for die face background color
- [ ] Color picker or preset swatches for pip/number color
- [ ] Settings persisted in localStorage (part of cfg)
- [ ] Live preview in settings panel

### Story 6 — Adjustable Aggressiveness
- [ ] Slider or stepper in settings: pool multiplier (1× to 5×)
- [ ] Label explains effect: "1× = strong correction, 3× = balanced, 5× = mild"
- [ ] Changing multiplier triggers implicit reset with confirmation

---

## Learnings

### Story 1
- CSS 3D cube: each face placed with `rotateAxis(deg) translateZ(half-size)`. To show face N, rotate the *container* so that face's normal points toward +Z (viewer direction).
- Accumulate absolute X/Y degrees per die state rather than resetting each roll — prevents gimbal-lock-like CSS transition artifacts and allows clean multi-rotation spin.
- `FACE_ROT` map: `{1:{x:0,y:0}, 2:{x:0,y:180}, 3:{x:0,y:-90}, 4:{x:0,y:90}, 5:{x:90,y:0}, 6:{x:-90,y:0}}`
- Pool multiplier=3 → 108 entries for 2×d6; gentle balancing that converges within a 120-roll Catan game.
- `manifest.json` `start_url: "./"` and `scope: "./"` are safest for GitHub Pages subdirectory hosting.
- `will-change: transform` on `.cube` improves animation performance on iOS Safari.
- `touch-action: manipulation` on body suppresses the 300ms tap delay on iOS without disabling scrolling.
- `height: 100dvh` (dynamic viewport height) handles iOS Safari bottom bar correctly; `env(safe-area-inset-*)` covers Dynamic Island and home indicator.

### Story 2
- localStorage key `catan-dice-v1` stores `{ pool, history }` — history is `[d1, d2][]`, added in Story 2 (old format `{ pool }` gracefully migrates via `?.history ?? []`).
- Bar chart: normalize bar heights against `max(MAX_THEO, maxActual)` so actual bars never overflow even when one sum is rolled disproportionately.
- Stats panel is a CSS bottom-sheet: `position:fixed; transform:translateY(100%)` → `.open { transform:translateY(0) }` with a backdrop overlay. Re-render on every open (cheap for ≤200 rolls).
- Two bars per column (gray=expected, dark=actual), both in a `display:flex; align-items:flex-end` container — height set via inline `style="height:Xpx"` since parent has no definite pixel height from CSS alone.
- `renderStats()` is called on open, not on every roll — avoids wasted work when panel is closed.

### Story 3
- Reset button lives inside the stats panel (natural placement — user reviews stats then decides to reset).
- Confirmation modal is a separate `#confirm-overlay` (fixed, centered card) layered above the stats panel — simpler than nesting it inside the panel.
- `closeStats()` is called after reset so the main screen shows the cleared state (`—`) immediately.
- No need to reset die animation state (`s1`, `s2`) — face position is cosmetic and resets on reload anyway.

### Story 4
- `cfg = { n, s }` stored in localStorage alongside pool/history; defaults to `{n:2, s:6}` for backward compat.
- `freshPool()` enumerates all `s^n` combos via recursion; capped at 5000 total — for larger configs `drawRoll` falls back to pure random (no balancing).
- `computeTheo(n, s)` uses DP convolution — works for any NdS, not just 2d6.
- `buildCube(el, sides)`: d6 gets pips; all others get a `.die-number` span updated on each roll (the target face's number is set before `rotateTo`; other faces retain previous values which is fine since they face away).
- `cubes[]` and `states[]` arrays replace `cube1/cube2/s1/s2`; rebuilt by `buildDiceRow()` on init and on settings apply.
- Die size set via CSS `--size`/`--half` on `:root` dynamically: N=1→150px, N=2→130px, N=3→90px, N=4→70px, N=5→56px.
- Shared `#panel-backdrop` for both stats and settings panels (mutually exclusive, `closePanel()` closes both).
- Confirm modal is reused for both reset and settings-change via `openConfirm(title, msg, callback)`.
- Red-7 highlight only when `cfg.n===2 && cfg.s===6` (Catan-specific rule).
- Stats chart is horizontally scrollable (`#chart-wrap` with `overflow-x:auto`) to handle up to 96 bars (5d20).
