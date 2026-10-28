// ─────────────────────────────────────────
//  ui.js  —  HUD, journal, fenêtres
// ─────────────────────────────────────────

const $ = id => document.getElementById(id);

// ── Journal ─────────────────────────────

function addLog(msg, cls = 'li') {
  const log = $('log');
  const p   = document.createElement('p');
  p.className   = cls;
  p.textContent = msg;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
  while (log.children.length > 40) log.removeChild(log.firstChild);
}

function clearLog() { $('log').innerHTML = ''; }

// ── HUD ─────────────────────────────────

function updateHUD() {
  const hpPct = player.hp / player.maxHp * 100;
  $('hud-hp-fill').style.width = hpPct + '%';
  $('hud-hp-fill').classList.toggle('low', hpPct <= 30);
  $('hud-hp-text').textContent = player.hp + ' / ' + player.maxHp;
  $('hud-xp-fill').style.width = (player.xp / player.xpNext * 100) + '%';
  $('hud-xp-text').textContent = player.xp + ' / ' + player.xpNext;
  majStat('hs-lvl', player.lvl);
  majStat('hs-atk', totalAtk());
  majStat('hs-def', totalDef());
  majStat('hs-gold', player.gold);
  majStat('hs-floor', floorNum);
  majStat('hs-potions', player.potions);
  $('eq-weapon').textContent = WEAPONS[player.weapon].name;
  $('eq-armor').textContent  = ARMORS[player.armor].name;
  document.querySelectorAll('.potion-count').forEach(el => { el.textContent = player.potions; });
}

// Change une valeur du HUD ; si elle a bougé, elle fait un petit saut
function majStat(id, valeur) {
  const el = $(id);
  const texte = String(valeur);
  if (el.textContent === texte) return;
  el.textContent = texte;
  el.classList.remove('saut');
  void el.offsetWidth; // relance l'animation même si elle était en cours
  el.classList.add('saut');
}

// ── Fenêtres (overlay) ──────────────────
// btns : [{ label, fn, cancel?, disabled?, keep? }]
//   cancel : déclenché par Échap · keep : ne ferme pas la fenêtre

let ovButtons = [];

function showOv(title, desc, btns, opts = {}) {
  $('ov-title').textContent = title;
  const d = $('ov-desc');
  d.innerHTML = '';
  if (desc instanceof Node) d.appendChild(desc);
  else d.textContent = desc || '';

  const bc = $('ov-btns');
  bc.innerHTML = '';
  bc.classList.toggle('vertical', !!opts.vertical);
  ovButtons = btns;
  btns.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.className = 'ov-btn' + (b.primary ? ' primary' : '');
    btn.textContent = (opts.numbered ? (i + 1) + '. ' : '') + b.label;
    btn.disabled = !!b.disabled;
    btn.onclick = () => triggerOvButton(i);
    bc.appendChild(btn);
  });
  const box = $('ov-box');
  box.className = opts.theme || '';
  // une fenêtre qui en remplace une autre rejoue aussi son ouverture
  box.style.animation = 'none';
  void box.offsetWidth;
  box.style.animation = '';
  $('overlay').style.display = 'flex';
  const first = bc.querySelector('button:not(:disabled)');
  if (first) first.focus({ preventScroll: true });
}

function triggerOvButton(i) {
  const b = ovButtons[i];
  if (!b || b.disabled) return;
  if (!b.keep) hideOv();
  b.fn();
}

function hideOv() {
  $('overlay').style.display = 'none';
  ovButtons = [];
}

function isOverlayOpen() {
  return $('overlay').style.display !== 'none';
}

// Clavier dans une fenêtre : chiffres = bouton n°, Échap = annuler
function overlayKey(e) {
  if (/^[1-9]$/.test(e.key)) { triggerOvButton(Number(e.key) - 1); return true; }
  if (e.key === 'Escape') {
    const i = ovButtons.findIndex(b => b.cancel);
    if (i !== -1) triggerOvButton(i);
    return true;
  }
  return false;
}

// Petite grille de statistiques pour les écrans de fin
function statsTable(rows) {
  const wrap = document.createElement('div');
  wrap.className = 'ov-stats';
  rows.forEach(([label, value]) => {
    const l = document.createElement('span');
    l.textContent = label;
    const v = document.createElement('b');
    v.textContent = value;
    wrap.append(l, v);
  });
  return wrap;
}

function paragraph(text, cls) {
  const p = document.createElement('p');
  p.textContent = text;
  if (cls) p.className = cls;
  return p;
}
