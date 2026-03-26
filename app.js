// ── Pip layout per face value ──────────────────────────────────────────────
const PIPS = {
  1: [[1,1]],
  2: [[0,2],[2,0]],
  3: [[0,2],[1,1],[2,0]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

function buildCube(el, sides) {
  el.innerHTML = '';
  for (let v = 1; v <= 6; v++) {
    const face = document.createElement('div');
    face.className = `face face-${v}`;
    if (sides === 6) {
      const grid = document.createElement('div');
      grid.className = 'pip-grid';
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const cell = document.createElement('span');
          if (PIPS[v].some(([pr, pc]) => pr === r && pc === c)) cell.className = 'pip';
          grid.appendChild(cell);
        }
      }
      face.appendChild(grid);
    } else {
      const num = document.createElement('span');
      num.className = 'die-number';
      num.textContent = v; // placeholder; overwritten on each roll
      face.appendChild(num);
    }
    el.appendChild(face);
  }
}

// ── 3D rotation map: cube rotation needed to show each face toward viewer ──
// Verified: viewer looks in -Z; each face placed with rotateAxis(deg) translateZ(half)
const FACE_ROT = {
  1: { x:   0, y:   0 },  // front  (+Z normal)
  2: { x:   0, y: 180 },  // back   (-Z normal)
  3: { x:   0, y: -90 },  // right  (+X normal)
  4: { x:   0, y:  90 },  // left   (-X normal)
  5: { x:  90, y:   0 },  // top    (+Y normal)
  6: { x: -90, y:   0 },  // bottom (-Y normal)
};

function rotateTo(cubeEl, state, face) {
  const cur = FACE_ROT[state.face];
  const tgt = FACE_ROT[face];
  // Accumulating absolute degrees avoids gimbal issues with CSS transitions.
  state.x += (tgt.x - cur.x) + 1080;
  state.y += (tgt.y - cur.y) + 1080;
  state.face = face;
  cubeEl.style.transform = `rotateX(${state.x}deg) rotateY(${state.y}deg)`;
}

// ── Balanced pool ─────────────────────────────────────────────────────────
// Enumeration is too expensive above this threshold — fall back to pure random
const isPoolCapped = cfg => Math.pow(cfg.sides, cfg.count) * cfg.mult > 7777;

function freshPool(cfg) {
  if (isPoolCapped(cfg)) return [];
  function combos(n) {
    if (n === 0) return [[]];
    return combos(n - 1).flatMap(c =>
      Array.from({ length: cfg.sides }, (_, i) => [...c, i + 1])
    );
  }
  const all = combos(cfg.count);
  const pool = [];
  for (let m = 0; m < cfg.mult; m++) pool.push(...all.map(c => [...c]));
  return pool;
}

function drawRoll(pool, cfg) {
  if (pool.length === 0) {
    if (isPoolCapped(cfg))
      return Array.from({ length: cfg.count }, () => Math.ceil(Math.random() * cfg.sides));
    pool.push(...freshPool(cfg));
  }
  const i = Math.floor(Math.random() * pool.length);
  return pool.splice(i, 1)[0];
}

// ── State persistence ─────────────────────────────────────────────────────
const KEY = 'catan-dice-v4';

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    const c = s?.cfg ?? {};
    return {
      pool:    s?.pool    ?? null,
      history: s?.history ?? [],
      cfg: {
        count: c.count ?? 2,
        sides: c.sides ?? 6,
        mult:  c.mult  ?? 3,
        dieBgs: Array.isArray(c.dieBgs) ? c.dieBgs : Array(c.count ?? 2).fill(c.dieBg ?? '#ffffff'),
        pip:   c.pip   ?? '#1c1c1e',
        bg:    c.bg    ?? '#f7f2e8',
        catan: c.catan ?? false,
        sound: c.sound ?? 'none',
        citiesKnights: c.citiesKnights ?? false,
      },
    };
  } catch { return { pool: null, history: [], cfg: { count: 2, sides: 6, mult: 3, dieBgs: ['#ffffff','#ffffff'], pip: '#1c1c1e', bg: '#f7f2e8', catan: false, sound: 'none', citiesKnights: false } }; }
}

function saveState(pool, history) {
  try { localStorage.setItem(KEY, JSON.stringify({ pool, history, cfg })); } catch {}
}

// ── Theoretical distribution via DP ───────────────────────────────────────
function computeTheo(n, s) {
  let dp = { 0: 1 };
  for (let d = 0; d < n; d++) {
    const next = {};
    for (const [sum, ways] of Object.entries(dp))
      for (let v = 1; v <= s; v++) {
        const ns = +sum + v;
        next[ns] = (next[ns] || 0) + ways;
      }
    dp = next;
  }
  const total = Math.pow(s, n);
  const result = {};
  for (const [sum, ways] of Object.entries(dp)) result[+sum] = ways / total;
  return result;
}

const BAR_H = 100; // px, normalized max bar height

function renderStats() {
  const theo    = computeTheo(cfg.count, cfg.sides);
  const minSum  = cfg.count;
  const maxSum  = cfg.count * cfg.sides;
  const total   = history.length;

  const counts = {};
  for (let sum = minSum; sum <= maxSum; sum++) counts[sum] = 0;
  history.forEach(vs => counts[vs.reduce((a, b) => a + b, 0)]++);

  const maxTheo   = Math.max(...Object.values(theo));
  const maxActual = total > 0 ? Math.max(...Object.values(counts).map(c => c / total)) : 0;
  const scale     = Math.max(maxTheo, maxActual);

  chartEl.innerHTML = '';
  for (let sum = minSum; sum <= maxSum; sum++) {
    const theoH = Math.round((theo[sum] || 0) / scale * BAR_H);
    const actH  = total > 0 ? Math.round(counts[sum] / total / scale * BAR_H) : 0;
    const col = document.createElement('div');
    col.className = 'chart-col';
    col.innerHTML =
      `<div class="chart-bar-area">` +
        `<div class="bar-theo"   style="height:${theoH}px"></div>` +
        `<div class="bar-actual" style="height:${actH}px"></div>` +
      `</div>` +
      `<div class="chart-sum-label${catanLabelClass(sum, cfg)}">${sum}</div>`;
    chartEl.appendChild(col);
  }

  statsTitleEl.textContent =
    total === 0 ? 'Statistics' : `Statistics — ${total} roll${total === 1 ? '' : 's'}`;

  if (total === 0) {
    historyListEl.innerHTML = '<div class="no-rolls">No rolls yet</div>';
    return;
  }
  historyListEl.innerHTML = '';
  history.slice().reverse().forEach(vs => {
    const sum = vs.reduce((a, b) => a + b, 0);
    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML =
      `<span class="hist-dice">${vs.join(' + ')}</span>` +
      `<span class="history-sum${catanLabelClass(sum, cfg)}">= ${sum}</span>`;
    historyListEl.appendChild(row);
  });
}

// ── Dice DOM ──────────────────────────────────────────────────────────────
const DIE_SIZES = { 1: 150, 2: 130, 3: 90, 4: 70, 5: 56, 6: 46 };
const ROW_GAPS  = { 1: 0, 2: 32, 3: 20, 4: 12, 5: 8, 6: 6 };
const cubes  = [];
const states = [];
let eventCube  = null;
let eventState = { x: 0, y: 0, face: 1 };

function buildDiceRow() {
  diceRowEl.innerHTML = '';
  cubes.length = 0;
  states.length = 0;
  eventCube = null;
  eventState = { x: 0, y: 0, face: 1 };

  const useMultiRow = cfg.count >= 5;
  let size, gap;
  if (useMultiRow) {
    // Size by the widest row: row1 always has 3; row2 has (count-3) + optional event die
    const row2Count = (cfg.count - 3) + (cfg.citiesKnights ? 1 : 0);
    const maxPerRow = Math.max(3, row2Count);
    size = DIE_SIZES[Math.min(6, maxPerRow)];
    gap  = ROW_GAPS[Math.min(6, maxPerRow)];
  } else {
    const visualCount = cfg.count + (cfg.citiesKnights ? 1 : 0);
    size = DIE_SIZES[Math.min(6, visualCount)];
    gap  = ROW_GAPS[Math.min(6, visualCount)];
  }
  document.documentElement.style.setProperty('--size', size + 'px');
  document.documentElement.style.setProperty('--half', (size / 2) + 'px');

  let row1, row2;
  if (useMultiRow) {
    diceRowEl.style.flexDirection = 'column';
    diceRowEl.style.gap = '16px';
    row1 = document.createElement('div');
    row2 = document.createElement('div');
    row1.style.cssText = row2.style.cssText = `display:flex;align-items:center;gap:${gap}px`;
    diceRowEl.appendChild(row1);
    diceRowEl.appendChild(row2);
  } else {
    diceRowEl.style.flexDirection = 'row';
    diceRowEl.style.gap = gap + 'px';
  }

  for (let i = 0; i < cfg.count; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'die-wrapper';
    const cube = document.createElement('div');
    cube.className = 'cube';
    buildCube(cube, cfg.sides);
    wrapper.appendChild(cube);
    (useMultiRow ? (i < 3 ? row1 : row2) : diceRowEl).appendChild(wrapper);
    cubes.push(cube);
    states.push({ x: 0, y: 0, face: 1 });
  }

  if (cfg.citiesKnights) {
    const target = useMultiRow ? row2 : diceRowEl;
    eventCube = appendEventDie(target);
  }
  applyDieColors();
}

// ── Theme ─────────────────────────────────────────────────────────────────
const DIE_BG_PRESETS = [
  '#ffffff', '#fffde7', '#e8f5e9', '#ddeeff', '#fce4ec',
  '#8B5E3C', '#37474f', '#1c1c1e',
  '#c0392b',  // red  — reuse pip red
  '#C0C0C0',  // silver — reuse pip silver
  '#FFD700',  // gold   — reuse pip gold
  '#27ae60',  // green  — reuse pip green
  '#2980b9',  // blue   — reuse pip blue
  '#e67e22',  // orange
  '#9b59b6',  // purple / Lila
];
const PIP_PRESETS = ['#1c1c1e','#ffffff','#c0392b','#2980b9','#27ae60','#FFD700','#C0C0C0','#fffde7'];
const BG_PRESETS  = ['#f7f2e8','#ffffff','#e8ddd0','#2c2418','#1e2530'];

function applyTheme() {
  document.documentElement.style.setProperty('--pip', cfg.pip);
  document.documentElement.style.setProperty('--bg', cfg.bg);
}

function applyDieColors() {
  cubes.forEach((cube, i) => {
    cube.parentElement.style.setProperty('--die-bg', cfg.dieBgs[i] ?? cfg.dieBgs[0] ?? '#ffffff');
  });
}

// ── Audio ─────────────────────────────────────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function woodHit(ctx, t, gain, dur) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; lpf.frequency.value = 700; lpf.Q.value = 1.5;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(gain, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(lpf); lpf.connect(ng); ng.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + dur);
  const og = ctx.createGain();
  og.gain.setValueAtTime(gain * 0.7, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(og); og.connect(ctx.destination);
  src.start(t); src.stop(t + dur);
  osc.start(t); osc.stop(t + dur);
}

function playWoodRoll() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.005;
  woodHit(ctx, t,        0.25, 0.06);
  woodHit(ctx, t + 0.09, 0.30, 0.06);
  woodHit(ctx, t + 0.20, 0.25, 0.06);
  woodHit(ctx, t + 0.52, 0.60, 0.14); // landing thud
}

function plasticHit(ctx, t, gain, dur) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.frequency.value = 3200; bpf.Q.value = 2.5;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(gain, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bpf); bpf.connect(ng); ng.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(700, t);
  osc.frequency.exponentialRampToValueAtTime(220, t + dur);
  const og = ctx.createGain();
  og.gain.setValueAtTime(gain * 0.5, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(og); og.connect(ctx.destination);
  src.start(t); src.stop(t + dur);
  osc.start(t); osc.stop(t + dur);
}

function playPlasticRoll() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.005;
  plasticHit(ctx, t,        0.28, 0.04);
  plasticHit(ctx, t + 0.08, 0.28, 0.04);
  plasticHit(ctx, t + 0.18, 0.22, 0.04);
  plasticHit(ctx, t + 0.52, 0.50, 0.08); // landing click
}

function playRollSound() {
  if (cfg.sound === 'wood')         playWoodRoll();
  else if (cfg.sound === 'plastic') playPlasticRoll();
}

// ── Init ──────────────────────────────────────────────────────────────────
const sumEl          = document.getElementById('sum');
const chartEl        = document.getElementById('chart');
const statsTitleEl   = document.getElementById('stats-title');
const historyListEl  = document.getElementById('history-list');
const diceRowEl      = document.getElementById('dice-row');
const confirmTitleEl = document.querySelector('#confirm-card h2');
const confirmMsgEl   = document.querySelector('#confirm-card p');
const diceCountDisplayEl = document.getElementById('dice-count-display');
const diceMinusBtn       = document.getElementById('dice-minus');
const dicePlusBtn        = document.getElementById('dice-plus');
const multDisplayEl      = document.getElementById('mult-display');
const multHintEl         = document.getElementById('mult-hint');
const multMinusBtn       = document.getElementById('mult-minus');
const multPlusBtn        = document.getElementById('mult-plus');

const saved = loadState();
let cfg     = saved.cfg;
let pool    = saved.pool ?? freshPool(cfg);
let history = saved.history;
let locked  = false;

applyTheme();
buildDiceRow();
initCatanSettings(cfg);

// ── Settings override hook (called by catan.js) ───────────────────────────
let pendingCount       = cfg.count;
let pendingSides       = cfg.sides;
let pendingMult        = cfg.mult;
let pendingDieBgs      = [...cfg.dieBgs];
let pendingDieBgLinked = cfg.dieBgs.every(c => c === cfg.dieBgs[0]);
let pendingPip         = cfg.pip;
let pendingBg          = cfg.bg;
let pendingSound       = cfg.sound;

function applyPendingOverrides(overrides) {
  if (overrides.count !== undefined) {
    pendingCount  = overrides.count;
    pendingDieBgs = pendingDieBgs.slice(0, overrides.count);
    while (pendingDieBgs.length < overrides.count)
      pendingDieBgs.push(pendingDieBgs[pendingDieBgs.length - 1] ?? '#ffffff');
  }
  if (overrides.sides  !== undefined) pendingSides       = overrides.sides;
  if (overrides.dieBgs !== undefined) pendingDieBgs      = [...overrides.dieBgs];
  if (overrides.linked !== undefined) pendingDieBgLinked = overrides.linked;
  if (overrides.pip    !== undefined) pendingPip         = overrides.pip;
  if (overrides.bg     !== undefined) pendingBg          = overrides.bg;
  updateSettingsUI();
}

// ── Roll ──────────────────────────────────────────────────────────────────
function doRoll() {
  if (locked) return;
  locked = true;

  cubes.forEach(c => c.parentElement.classList.remove('hopping'));
  cubes.forEach(c => c.parentElement.classList.add('hopping'));

  const values = drawRoll(pool, cfg);
  history.push([...values]);
  saveState(pool, history);

  sumEl.classList.add('rolling');
  values.forEach((v, i) => {
    let targetFace;
    if (cfg.sides === 6) {
      // pip face index matches die value
      targetFace = v;
    } else {
      targetFace = Math.ceil(Math.random() * 6);
      cubes[i].querySelector(`.face-${targetFace} .die-number`).textContent = v;
    }
    rotateTo(cubes[i], states[i], targetFace);
  });
  if (cfg.citiesKnights && eventCube) {
    rotateTo(eventCube, eventState, Math.ceil(Math.random() * 6));
    eventCube.parentElement.classList.remove('hopping');
    eventCube.parentElement.classList.add('hopping');
  }

  playRollSound();
  setTimeout(() => {
    const total = values.reduce((a, b) => a + b, 0);
    sumEl.textContent = total;
    sumEl.style.color = catanSumColor(total, cfg);
    sumEl.classList.remove('rolling');
    cubes.forEach(c => c.parentElement.classList.remove('hopping'));
    if (eventCube) eventCube.parentElement.classList.remove('hopping');
    locked = false;
  }, 800);
}

// ── Shake to roll ─────────────────────────────────────────────────────────
const SHAKE_THRESHOLD = 20; // m/s² — tuned for a deliberate shake, ignores normal movement
const SHAKE_COOLDOWN  = 1000; // ms — prevents multiple triggers per shake gesture

let lastShakeTime = 0;

function initShake() {
  window.addEventListener('devicemotion', e => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    const now = Date.now();
    if (mag > SHAKE_THRESHOLD && now - lastShakeTime > SHAKE_COOLDOWN) {
      lastShakeTime = now;
      doRoll();
    }
  });
}

function setupShake() {
  if (typeof DeviceMotionEvent === 'undefined') return;
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    // iOS 13+ gates DeviceMotion behind a user-gesture permission prompt
    DeviceMotionEvent.requestPermission()
      .then(perm => { if (perm === 'granted') initShake(); })
      .catch(() => {});
  } else {
    initShake();
  }
}

let shakeSetupDone = false;

document.getElementById('roll-area').addEventListener('click', () => {
  if (!shakeSetupDone) { shakeSetupDone = true; setupShake(); }
  doRoll();
});

if (typeof DeviceMotionEvent !== 'undefined') {
  document.getElementById('hint').textContent = 'Tap or shake';
}

// ── Panel open/close ──────────────────────────────────────────────────────
const panelBackdrop = document.getElementById('panel-backdrop');
const statsPanel    = document.getElementById('stats-panel');
const settingsPanel = document.getElementById('settings-panel');

function openPanel(panelEl) {
  panelEl.classList.add('open');
  panelBackdrop.classList.add('open');
}

function closePanel() {
  statsPanel.classList.remove('open');
  settingsPanel.classList.remove('open');
  panelBackdrop.classList.remove('open');
  applyTheme();
  applyDieColors(); // revert any live preview that wasn't applied
}

panelBackdrop.addEventListener('click', closePanel);
document.getElementById('stats-handle').addEventListener('click', closePanel);
document.getElementById('settings-handle').addEventListener('click', closePanel);

document.getElementById('stats-btn').addEventListener('click', () => {
  renderStats();
  openPanel(statsPanel);
});

// ── Confirm modal (shared) ────────────────────────────────────────────────
const confirmOverlay = document.getElementById('confirm-overlay');
let confirmCallback  = null;

function openConfirm(title, msg, onConfirm) {
  confirmTitleEl.textContent = title;
  confirmMsgEl.textContent   = msg;
  confirmCallback = onConfirm;
  confirmOverlay.classList.add('open');
}

function closeConfirm() {
  confirmOverlay.classList.remove('open');
  confirmCallback = null;
}

document.getElementById('btn-cancel').addEventListener('click', closeConfirm);
document.getElementById('btn-confirm-reset').addEventListener('click', () => {
  confirmCallback?.();
  closeConfirm();
});

// ── Reset ─────────────────────────────────────────────────────────────────
function doReset() {
  pool = freshPool(cfg);
  history = [];
  saveState(pool, history);
  sumEl.textContent = '—';
  sumEl.style.color = 'var(--text)';
}

document.getElementById('reset-btn').addEventListener('click', () => {
  openConfirm('New game?', 'All rolls and history will be cleared.', () => {
    doReset();
    closePanel();
  });
});

// ── Settings ──────────────────────────────────────────────────────────────
const MULT_LABELS = { 1: 'Strong correction', 2: 'Moderate correction', 3: 'Balanced', 4: 'Mild', 5: 'Very mild' };

function renderDieBgSection() {
  const section = document.getElementById('die-bg-section');
  section.innerHTML = '';

  if (pendingCount > 1) {
    const row = document.createElement('div');
    row.className = 'toggle-row';
    row.style.marginBottom = '12px';
    row.innerHTML =
      `<span class="settings-label" style="margin-bottom:0">synchronize die color</span>` +
      `<label class="toggle">` +
        `<input type="checkbox" id="die-bg-link"${pendingDieBgLinked ? ' checked' : ''}>` +
        `<div class="toggle-track"></div><div class="toggle-thumb"></div>` +
      `</label>`;
    row.querySelector('input').addEventListener('change', e => {
      pendingDieBgLinked = e.target.checked;
      if (pendingDieBgLinked) {
        const color = pendingDieBgs[0] ?? '#ffffff';
        pendingDieBgs = Array(pendingCount).fill(color);
        cubes.forEach(cube => cube.parentElement.style.setProperty('--die-bg', color));
      }
      renderDieBgSection();
    });
    section.appendChild(row);
  } else {
    const lbl = document.createElement('span');
    lbl.className = 'settings-label';
    lbl.textContent = 'synchronize die color';
    section.appendChild(lbl);
  }

  const addSwatchRow = (idx) => {
    const row = document.createElement('div');
    row.className = 'swatch-row';
    DIE_BG_PRESETS.forEach(color => {
      const btn = document.createElement('button');
      btn.className = 'swatch' + (color === (pendingDieBgs[idx] ?? '#ffffff') ? ' active' : '');
      btn.style.background = color;
      btn.dataset.color = color;
      btn.addEventListener('click', () => {
        if (pendingDieBgLinked || pendingCount === 1) {
          pendingDieBgs = Array(pendingCount).fill(color);
          cubes.forEach(cube => cube.parentElement.style.setProperty('--die-bg', color));
        } else {
          pendingDieBgs[idx] = color;
          if (cubes[idx]) cubes[idx].parentElement.style.setProperty('--die-bg', color);
        }
        renderDieBgSection();
      });
      row.appendChild(btn);
    });
    section.appendChild(row);
  };

  if (pendingDieBgLinked || pendingCount === 1) {
    addSwatchRow(0);
  } else {
    for (let i = 0; i < pendingCount; i++) {
      const lbl = document.createElement('span');
      lbl.className = 'settings-label';
      if (i > 0) lbl.style.marginTop = '12px';
      lbl.textContent = `Die ${i + 1} color`;
      section.appendChild(lbl);
      addSwatchRow(i);
    }
  }
}

function updateSettingsUI() {
  diceCountDisplayEl.textContent = pendingCount;
  diceMinusBtn.disabled = pendingCount <= 1;
  dicePlusBtn.disabled  = pendingCount >= 6;
  document.querySelectorAll('.die-type-btn').forEach(btn => {
    btn.classList.toggle('active', +btn.dataset.s === pendingSides);
  });
  multDisplayEl.textContent = pendingMult + '×';
  const capped = isPoolCapped({ count: pendingCount, sides: pendingSides, mult: pendingMult });
  if (capped) {
    multHintEl.textContent = 'Too large — random rolls (no balancing)';
    multHintEl.classList.add('capped');
  } else {
    const poolSize = Math.pow(pendingSides, pendingCount) * pendingMult;
    multHintEl.textContent = MULT_LABELS[pendingMult] + ` — ${poolSize} combinations`;
    multHintEl.classList.remove('capped');
  }
  multMinusBtn.disabled = pendingMult <= 1;
  multPlusBtn.disabled  = pendingMult >= 5;
  renderDieBgSection();
  document.querySelectorAll('#pip-swatches .swatch').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === pendingPip);
  });
  document.querySelectorAll('#bg-swatches .swatch').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === pendingBg);
  });
  syncCatanUI();
  document.querySelectorAll('#sound-btns .die-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sound === pendingSound);
  });
}

function buildSwatchRow(containerEl, presets, onClick) {
  presets.forEach(color => {
    const btn = document.createElement('button');
    btn.className = 'swatch';
    btn.style.background = color;
    btn.dataset.color = color;
    btn.addEventListener('click', () => onClick(color));
    containerEl.appendChild(btn);
  });
}

buildSwatchRow(document.getElementById('pip-swatches'), PIP_PRESETS, color => {
  pendingPip = color;
  document.documentElement.style.setProperty('--pip', color);
  updateSettingsUI();
});

buildSwatchRow(document.getElementById('bg-swatches'), BG_PRESETS, color => {
  pendingBg = color;
  document.documentElement.style.setProperty('--bg', color);
  updateSettingsUI();
});

document.getElementById('settings-btn').addEventListener('click', () => {
  pendingCount       = cfg.count;
  pendingSides       = cfg.sides;
  pendingMult        = cfg.mult;
  pendingDieBgs      = [...cfg.dieBgs];
  pendingDieBgLinked = cfg.dieBgs.every(c => c === cfg.dieBgs[0]);
  pendingPip         = cfg.pip;
  pendingBg          = cfg.bg;
  pendingSound       = cfg.sound;
  resetCatanPending(cfg);
  updateSettingsUI();
  openPanel(settingsPanel);
});

diceMinusBtn.addEventListener('click', () => {
  if (pendingCount > 1) { pendingCount--; pendingDieBgs = pendingDieBgs.slice(0, pendingCount); updateSettingsUI(); }
});

dicePlusBtn.addEventListener('click', () => {
  if (pendingCount < 6) { pendingCount++; pendingDieBgs.push(pendingDieBgs[pendingDieBgs.length - 1] ?? '#ffffff'); updateSettingsUI(); }
});

multMinusBtn.addEventListener('click', () => {
  if (pendingMult > 1) { pendingMult--; updateSettingsUI(); }
});

multPlusBtn.addEventListener('click', () => {
  if (pendingMult < 5) { pendingMult++; updateSettingsUI(); }
});

document.querySelectorAll('.die-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!btn.dataset.s) return;
    pendingSides = +btn.dataset.s; updateSettingsUI();
  });
});

document.querySelectorAll('#sound-btns .die-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    pendingSound = btn.dataset.sound;
    if (pendingSound === 'wood')         playWoodRoll();
    else if (pendingSound === 'plastic') playPlasticRoll();
    updateSettingsUI();
  });
});

document.getElementById('settings-apply').addEventListener('click', () => {
  const diceChanged   = pendingCount !== cfg.count || pendingSides !== cfg.sides;
  const multChanged   = pendingMult  !== cfg.mult;
  const ckChanged     = pendingCitiesKnights !== cfg.citiesKnights;
  const dieBgsChanged = pendingDieBgs.some((c, i) => c !== cfg.dieBgs[i]) || pendingDieBgs.length !== cfg.dieBgs.length;
  const themeChanged  = dieBgsChanged || pendingPip !== cfg.pip || pendingBg !== cfg.bg || pendingCatan !== cfg.catan || pendingSound !== cfg.sound || ckChanged;
  const cfgChanged    = diceChanged || multChanged;
  if (!cfgChanged && !themeChanged) { closePanel(); return; }

  const apply = () => {
    cfg.count         = pendingCount;
    cfg.sides         = pendingSides;
    cfg.mult          = pendingMult;
    cfg.dieBgs        = [...pendingDieBgs];
    cfg.pip           = pendingPip;
    cfg.bg            = pendingBg;
    cfg.catan         = pendingCatan;
    cfg.sound         = pendingSound;
    cfg.citiesKnights = pendingCitiesKnights;
    applyTheme();
    if (cfgChanged) {
      buildDiceRow(); // calls applyDieColors internally
      doReset(); // saves state
    } else {
      if (ckChanged) buildDiceRow(); // calls applyDieColors internally
      else applyDieColors();
      saveState(pool, history);
    }
    closePanel();
  };

  if (cfgChanged && history.length > 0) {
    const title = diceChanged
      ? `Switch to ${pendingCount}d${pendingSides}?`
      : `Change balancing to ${pendingMult}×?`;
    openConfirm(title, 'All rolls and history will be cleared.', apply);
  } else {
    apply();
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
