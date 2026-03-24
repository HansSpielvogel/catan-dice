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

### Story 2 — Stats View
- [ ] Scrollable history of all rolls (number + sum)
- [ ] Bar chart: actual frequency vs theoretical frequency per sum (2–12)
- [ ] Toggle button to show/hide stats panel

### Story 3 — Reset
- [ ] Reset button visible in UI
- [ ] "Are you sure?" confirmation modal before reset
- [ ] Clears pool, history, and localStorage

### Story 4 — Configurable Dice
- [ ] Settings panel: choose number of dice (1–5)
- [ ] Settings panel: choose sides per die (d4, d6, d8, d10, d12, d20)
- [ ] Pool recalculates on change (all N^S combinations × multiplier)
- [ ] Triggers implicit reset with confirmation

### Story 5 — Shake to Roll
- [ ] Use DeviceMotion API to detect phone shake
- [ ] Triggers same roll action as tap
- [ ] Sensitivity configurable or auto-tuned

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
