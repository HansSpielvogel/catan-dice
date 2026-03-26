// ── Event die (Cities & Knights) ──────────────────────────────────────────
// Faces 1–3: pirate ship (dark), faces 4–6: city in yellow / blue / green
const EVENT_CITY_COLORS = ['', '', '', '#e8c020', '#2176c7', '#2a8840'];

// Ship: traced from pirate-side reference — mast knob, top spar, 3 concave panels, bottom spar, hull with upswept arms + knobs
const SHIP_SVG = `<svg class="event-icon" viewBox="0 0 100 90" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="7" r="2.5"/><rect x="48.5" y="9" width="3" height="11"/><rect x="14" y="18" width="72" height="3" rx="1"/><path d="M14 21 C12 32 12 42 14 51 L30 51 C28 42 28 32 30 21 Z"/><rect x="32" y="21" width="16.5" height="30"/><rect x="51.5" y="21" width="16.5" height="30"/><path d="M70 21 C68 32 68 42 70 51 L86 51 C88 42 88 32 86 21 Z"/><rect x="14" y="51" width="72" height="2.5" rx="1"/><path d="M8 60 Q50 74 92 60 Q84 80 50 85 Q16 80 8 60 Z"/><path d="M92 60 C96 53 98 43 94 34 C93 40 91 49 88 56 Z"/><circle cx="94" cy="33" r="3.5"/><path d="M8 60 C4 53 2 43 6 34 C7 40 9 49 12 56 Z"/><circle cx="6" cy="33" r="3.5"/></svg>`;
// City: traced from city-side reference — two crenellated towers + central facade + base
const CITY_SVG = `<svg class="event-icon" viewBox="0 0 100 90" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="24" width="26" height="50"/><rect x="5" y="14" width="7" height="10"/><rect x="14" y="14" width="7" height="10"/><rect x="23" y="14" width="8" height="10"/><rect x="69" y="24" width="26" height="50"/><rect x="69" y="14" width="7" height="10"/><rect x="78" y="14" width="7" height="10"/><rect x="87" y="14" width="8" height="10"/><rect x="31" y="40" width="38" height="34"/><rect x="3" y="74" width="94" height="8" rx="2"/></svg>`;

function buildEventCube(el) {
  el.innerHTML = '';
  for (let v = 1; v <= 6; v++) {
    const face = document.createElement('div');
    face.className = `face face-${v}`;
    if (v <= 3) {
      face.style.background = '#1c1c1e';
      face.style.color = '#f7f2e8';
      face.innerHTML = SHIP_SVG;
    } else {
      face.style.color = EVENT_CITY_COLORS[v - 1];
      face.innerHTML = CITY_SVG;
    }
    el.appendChild(face);
  }
}

function appendEventDie(target) {
  const sep = document.createElement('div');
  sep.className = 'event-die-sep';
  const wrapper = document.createElement('div');
  wrapper.className = 'die-wrapper';
  const cube = document.createElement('div');
  cube.className = 'cube';
  buildEventCube(cube);
  wrapper.appendChild(cube);
  target.appendChild(sep);
  target.appendChild(wrapper);
  return cube;
}

// ── Catan-mode label classes for stats chart and history ───────────────────
function catanLabelClass(sum, cfg) {
  if (!cfg.catan) return '';
  if (sum === 7) return ' catan-bold';
  if (sum === 6 || sum === 8) return ' red';
  return '';
}

// ── Catan-mode sum display color ───────────────────────────────────────────
function catanSumColor(total, cfg) {
  return (cfg.catan && (total === 6 || total === 8)) ? 'var(--red)' : 'var(--text)';
}

// ── Catan settings state ───────────────────────────────────────────────────
var pendingCatan         = false;
var pendingCitiesKnights = false;

function resetCatanPending(cfg) {
  pendingCatan         = cfg.catan;
  pendingCitiesKnights = cfg.citiesKnights;
}

function syncCatanUI() {
  const catanToggle = document.getElementById('catan-toggle');
  const ckToggle    = document.getElementById('ck-toggle');
  if (catanToggle) catanToggle.checked = pendingCatan;
  if (ckToggle)    ckToggle.checked    = pendingCitiesKnights;
}

function initCatanSettings(cfg) {
  pendingCatan         = cfg.catan;
  pendingCitiesKnights = cfg.citiesKnights;

  document.getElementById('catan-settings-slot').innerHTML =
    `<div class="toggle-row">` +
      `<span class="settings-label" style="margin-bottom:0">Catan mode</span>` +
      `<label class="toggle">` +
        `<input type="checkbox" id="catan-toggle">` +
        `<div class="toggle-track"></div>` +
        `<div class="toggle-thumb"></div>` +
      `</label>` +
    `</div>` +
    `<span class="mult-hint" style="margin-bottom:12px">Highlights 6 &amp; 8 in red, 7 in bold</span>` +
    `<div class="toggle-row" style="margin-top:4px">` +
      `<span class="settings-label" style="margin-bottom:0">Cities &amp; Knights mode</span>` +
      `<label class="toggle">` +
        `<input type="checkbox" id="ck-toggle">` +
        `<div class="toggle-track"></div>` +
        `<div class="toggle-thumb"></div>` +
      `</label>` +
    `</div>` +
    `<span class="mult-hint">Adds event die · Sets 2d6 with white &amp; red dice</span>`;

  document.getElementById('catan-toggle').addEventListener('change', e => {
    pendingCatan = e.target.checked;
  });

  document.getElementById('ck-toggle').addEventListener('change', e => {
    pendingCitiesKnights = e.target.checked;
    if (pendingCitiesKnights) {
      applyPendingOverrides({
        count: 2, sides: 6,
        dieBgs: ['#ffffff', '#c0392b'],
        linked: false,
        pip: '#1c1c1e',
        bg: '#f7f2e8',
      });
    }
  });
}
