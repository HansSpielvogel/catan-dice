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

### Story 5 — Shake to Roll ✅ DONE
- [x] Use DeviceMotion API to detect phone shake
- [x] Triggers same roll action as tap
- [x] Sensitivity auto-tuned (threshold = 15 m/s², cooldown = 1000ms)

### Story 7 — Die & Pip Color Themes ✅ DONE
- [x] Preset swatches for die face background color (8 presets)
- [x] Preset swatches for pip/number color (6 presets)
- [x] Settings persisted in localStorage (part of cfg)
- [x] Live preview: CSS vars update immediately on swatch tap; reverted on cancel

### Story 6 — Adjustable Aggressiveness ✅ DONE
- [x] Stepper in settings: pool multiplier (1× to 5×)
- [x] Label explains effect: "1× = strong correction, 3× = balanced, 5× = mild"
- [x] Changing multiplier triggers implicit reset with confirmation

### Story 8 — Background Color, Catan Mode Toggle, Theme Tweaks ✅ DONE
- [x] Die color swatch: replaced light cream `#f5f0e0` with darker wooden brown `#8B5E3C`
- [x] Pip color: changed orange `#f39c12` to brighter golden `#FFD700`, added silver `#C0C0C0`
- [x] Background color picker: 5 swatch options (`#f7f2e8` warm parchment, `#ffffff` white, `#e8ddd0` warm sand, `#2c2418` dark espresso, `#1e2530` dark slate)
- [x] Background persisted as `cfg.bg`, applied via `--bg` CSS var, live preview on tap, reverts on cancel
- [x] Catan mode: iOS-style toggle slider in settings (`cfg.catan` boolean)
- [x] When Catan mode on: 6 & 8 highlighted red (sum display, history, chart labels), 7 bold black
- [x] Replaces old auto-detected `isCatan` (`count===2 && sides===6`) with manual opt-in toggle
- [x] localStorage bumped to `catan-dice-v3`

### Story 9 — Dice Hop Animation & Roll Sound Effects
Improve the roll experience with physical animation and audio feedback.

#### 9a: Hop/Bounce Animation
- [ ] Add `@keyframes die-hop` on `.die-wrapper` (not `.cube` — that's used for 3D rotation)
  - 0%: resting (`translateY(0) scale(1)`)
  - 30%: peak — die lifts up and shrinks slightly (`translateY(-28px) scale(0.92)`) to look "farther away"
  - 55%: lands back at origin
  - 68%: micro-bounce (`translateY(-6px) scale(0.98)`)
  - 80–100%: settles to rest
  - Duration: `0.75s` matching existing cube rotation transition
- [ ] Add ground shadow via `.die-wrapper::after` pseudo-element
  - Permanent subtle elliptical shadow (`radial-gradient`, ~0.6 opacity)
  - `@keyframes shadow-hop`: spreads wider + fades when die is "up", tightens on impact
- [ ] `.die-wrapper.hopping` class triggers both keyframe animations
- [ ] `.die-wrapper` needs `position: relative` for shadow positioning
- [ ] In `doRoll()`: add `.hopping` to each `cubes[i].parentElement` at animation start
- [ ] In the existing 800ms `setTimeout`: remove `.hopping` from all wrappers
- [ ] Safety: force-remove `.hopping` at start of `doRoll()` in case of rapid re-rolls at the 800ms boundary

#### 9b: Synthesized Roll Sounds (Web Audio API)
No external audio files — sounds generated inline via Web Audio API.
- [ ] Lazy `audioCtx` init (created on first use inside a user gesture; add `resume()` for iOS suspend safety)
- [ ] `playWood()` — warm thud: filtered noise burst (lowpass 800Hz, Q=1.5) + sine oscillator (120→60Hz), ~100ms decay. Gain envelope: 0.5→0.001 exponential ramp.
- [ ] `playPlastic()` — bright click: shorter noise burst (bandpass 3500Hz, Q=2) + triangle osc (800→300Hz), ~50ms decay. Gain: 0.4→0.001.
- [ ] `playLandSound()` — dispatches based on `cfg.sound`: `'wood'` → `playWood()`, `'plastic'` → `playPlastic()`, `'none'` → no-op
- [ ] In `doRoll()`: `setTimeout(playLandSound, 520)` — fires just before visual landing for perceptual sync
- [ ] One sound per roll (not per die)

#### 9c: Sound Settings UI
- [ ] Add `cfg.sound` (default: `'none'`), bump localStorage key `v3` → `v4`
- [ ] Add `pendingSound` to pending state vars, reset in settings-btn click handler
- [ ] New settings section (after Background, before Apply button):
  ```html
  <span class="settings-label">Roll sound</span>
  <div class="die-type-btns" id="sound-btns">
    <button class="die-type-btn" data-sound="wood">Wood</button>
    <button class="die-type-btn" data-sound="plastic">Plastic</button>
    <button class="die-type-btn" data-sound="none">None</button>
  </div>
  ```
  Reuses existing `.die-type-btns` / `.die-type-btn` styling.
- [ ] Sound button click listeners → set `pendingSound` + call `updateSettingsUI()`
- [ ] Play preview sound when tapping Wood/Plastic in settings (immediate feedback before Apply)
- [ ] `updateSettingsUI()`: toggle `.active` on `#sound-btns .die-type-btn` by `data-sound`
- [ ] `themeChanged` check: include `pendingSound !== cfg.sound` (no game reset needed)
- [ ] In apply closure: `cfg.sound = pendingSound`
- [ ] `loadState()`: add `sound: c.sound ?? 'none'` + same in catch fallback

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

### Story 5
### Story 7
- Swatch active state tracked via `data-color` attribute — avoids ambiguity between `style.background` and `style.backgroundColor` browser normalization.
- Live preview: update CSS vars (`--die-bg`, `--pip`) on `:root` immediately when swatch is tapped; `closePanel()` calls `applyTheme()` to revert to saved cfg if not applied.
- Theme stored as `cfg.dieBg` / `cfg.pip` — same localStorage key (v2), with fallback defaults in `loadState` so old saves still work.
- Theme-only changes (no dice count/sides change) apply silently without confirmation modal — no data loss.
- `buildSwatchRow()` is a small shared helper; swatches are built once at init, not on every panel open.

### Story 5
- `DeviceMotionEvent.requestPermission()` exists only on iOS 13+ — call it inside a user-gesture handler (tap), not on page load, or it silently fails.
- Permission is cached by iOS after first grant; no need to request on subsequent page loads.
- `accelerationIncludingGravity` always available (gravity ~9.8 m/s² at rest); magnitude > 15 m/s² reliably detects a shake without false positives from walking.
- 1000ms cooldown prevents a single aggressive shake from firing multiple rolls.
- Roll logic extracted into `doRoll()` so tap and shake share identical code paths.
- Hint text updated to "Tap or shake" only when `DeviceMotionEvent` exists (guards desktop).
