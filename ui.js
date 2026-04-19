// ─────────────────────────────────────────
//  ui.js  —  HUD, log, overlay helpers
// ─────────────────────────────────────────

// ── Log ─────────────────────────────────

function addLog(msg, cls = 'li') {
  const log = document.getElementById('log');
  const p   = document.createElement('p');
  p.className   = cls;
  p.textContent = msg;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
  // Keep at most 20 lines
  while (log.children.length > 20) log.removeChild(log.firstChild);
}

// ── HUD update ──────────────────────────

function updateHUD() {
  document.getElementById('hud-hp-fill').style.width  = (player.hp / player.maxHp * 100) + '%';
  document.getElementById('hud-hp-text').textContent  = player.hp + ' / ' + player.maxHp;
  document.getElementById('hud-xp-fill').style.width  = (player.xp / player.xpNext * 100) + '%';
  document.getElementById('hud-xp-text').textContent  = player.xp + ' / ' + player.xpNext;
  document.getElementById('hs-lvl').textContent  = player.lvl;
  document.getElementById('hs-atk').textContent  = player.atk;
  document.getElementById('hs-def').textContent  = player.def;
  document.getElementById('hs-gold').textContent = player.gold;
  document.getElementById('hs-floor').textContent = floorNum;
}

// ── Overlay ─────────────────────────────

function showOv(title, desc, btns) {
  document.getElementById('ov-title').textContent = title;
  document.getElementById('ov-desc').textContent  = desc;
  const bc = document.getElementById('ov-btns');
  bc.innerHTML = '';
  btns.forEach(b => {
    const btn   = document.createElement('button');
    btn.className   = 'ov-btn';
    btn.textContent = b.label;
    btn.onclick = () => { hideOv(); b.fn(); };
    bc.appendChild(btn);
  });
  document.getElementById('overlay').style.display = 'flex';
}

function hideOv() {
  document.getElementById('overlay').style.display = 'none';
}

function isOverlayOpen() {
  return document.getElementById('overlay').style.display !== 'none';
}
