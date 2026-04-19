// ─────────────────────────────────────────
//  game.js  —  Core game logic
//  Dépend de : sprites.js, map.js, ui.js, sound.js
// ─────────────────────────────────────────

// ── Game state ──────────────────────────

let player   = {};
let floorNum = 1;
let animFrame = 0;
let animRAF;
let lastTime  = 0;

// ── Init ────────────────────────────────

function initGame() {
  floorNum = 1;
  player = {
    x: 2, y: 2,
    hp: 30, maxHp: 30,
    atk: 5, def: 2,
    xp: 0, xpNext: 10,
    gold: 0,
    lvl: 1,
    dir: 'right',
    frame: 0
  };
  buildMap();
}

// ── Animation loop ──────────────────────

function gameLoop(ts) {
  if (ts - lastTime > 200) {
    lastTime  = ts;
    animFrame = (animFrame + 1) % 8;
  }
  render();
  animRAF = requestAnimationFrame(gameLoop);
}

function scheduleAnim() {
  if (animRAF) cancelAnimationFrame(animRAF);
  animRAF = requestAnimationFrame(gameLoop);
}

// ── Mouvement & interaction ──────────────

function tryMove(dx, dy) {
  if (isOverlayOpen()) return;

  const nx = player.x + dx;
  const ny = player.y + dy;

  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return;
  if (grid[ny][nx] === 0) return; // mur

  if (dx > 0) player.dir = 'right';
  if (dx < 0) player.dir = 'left';

  const e = entityAt(nx, ny);
  if (e) {
    if      (e.type === 'monster') { doCombat(e);           return; }
    else if (e.type === 'chest')   { openChest(e, nx, ny);  return; }
    else if (e.type === 'trap')    { doTrap(e, nx, ny);     return; }
    else if (e.type === 'healer')  { doHeal(e, nx, ny);     return; }
    else if (e.type === 'stairs')  { doStairs(nx, ny);      return; }
  }

  player.x = nx;
  player.y = ny;
  sfxStep();
  revealAround(nx, ny, 4);
  updateHUD();
}

// ── Combat ──────────────────────────────

function doCombat(e) {
  const pd = Math.max(1, player.atk - e.def + rnd(-1, 2));
  const md = Math.max(1, e.atk - player.def + rnd(-1, 2));

  e.hp -= pd;
  sfxAttack();
  addLog('⚔ Tu frappes ' + e.mtype + ' (' + pd + ' dégâts)', 'lc');

  if (e.hp <= 0) {
    const xg = rnd(4, 8) + floorNum;
    const gg = rnd(2, 5);
    player.xp   += xg;
    player.gold += gg;
    entities = entities.filter(en => en.id !== e.id);
    sfxEnemyDie();
    addLog('💀 ' + e.mtype + ' vaincu ! +' + xg + ' XP +' + gg + ' or', 'll');
    checkLvlUp();
  } else {
    player.hp = Math.max(0, player.hp - md);
    sfxHurt();
    addLog(e.mtype + ' riposte (' + md + ' dégâts). PV monstre: ' + e.hp, 'lc');
    if (player.hp <= 0) { doDeath(); return; }
  }
  updateHUD();
}

function checkLvlUp() {
  if (player.xp >= player.xpNext) {
    player.lvl++;
    player.xp      -= player.xpNext;
    player.xpNext   = Math.floor(player.xpNext * 1.5);
    player.maxHp   += 8;
    player.hp       = Math.min(player.hp + 8, player.maxHp);
    player.atk     += 2;
    player.def     += 1;
    sfxLevelUp();
    showOv(
      'NIVEAU ' + player.lvl + ' !',
      'Statistiques améliorées !\n+8 PV max · +2 ATK · +1 DEF',
      [{ label: 'Continuer', fn: () => {} }]
    );
    addLog('✨ Niveau ' + player.lvl + ' atteint !', 'lw');
  }
}

// ── Interactions de tuiles ───────────────

function openChest(e, nx, ny) {
  const g = rnd(5, 15) + floorNum * 2;
  player.gold += g;
  entities = entities.filter(en => en.id !== e.id);
  player.x = nx; player.y = ny;
  sfxChest();
  addLog('📦 Coffre : +' + g + ' or !', 'll');
  revealAround(nx, ny, 4);
  updateHUD();
}

function doTrap(e, nx, ny) {
  const d = rnd(4, 10);
  player.hp = Math.max(0, player.hp - d);
  entities = entities.filter(en => en.id !== e.id);
  player.x = nx; player.y = ny;
  sfxTrap();
  addLog('🪤 PIÈGE ! -' + d + ' PV', 'lc');
  revealAround(nx, ny, 4);
  if (player.hp <= 0) { doDeath(); return; }
  updateHUD();
}

function doHeal(e, nx, ny) {
  const h = Math.floor(player.maxHp * 0.45);
  player.hp = Math.min(player.maxHp, player.hp + h);
  entities = entities.filter(en => en.id !== e.id);
  player.x = nx; player.y = ny;
  sfxHeal();
  addLog('✨ Fontaine : +' + h + ' PV', 'lh');
  revealAround(nx, ny, 4);
  updateHUD();
}

function doStairs(nx, ny) {
  player.x = nx; player.y = ny;
  floorNum++;
  sfxNewFloor();
  addLog('🌀 Étage ' + floorNum + ' du donjon...', 'lw');
  buildMap();
  updateHUD();
}

function doDeath() {
  player.hp = 0;
  updateHUD();
  sfxGameOver();
  showOv(
    '☠ TU ES MORT',
    'Le donjon t\'a englouti... Courage, réessaie !',
    [{
      label: 'Recommencer',
      fn: () => {
        initGame();
        updateHUD();
        if (audioCtx) { stopBGM(); startBGM(); }
        addLog('🔄 Nouvelle partie !', 'lw');
      }
    }]
  );
}

// ── Boutons ─────────────────────────────

document.getElementById('btn-rest').onclick = () => {
  initAudio();
  if (player.gold < 1) { addLog('Pas assez d\'or.', 'li'); return; }
  const h = rnd(5, 10);
  player.gold--;
  player.hp = Math.min(player.maxHp, player.hp + h);
  sfxRest();
  addLog('⛺ Repos : +' + h + ' PV (-1 or)', 'lh');
  updateHUD();
};

document.getElementById('btn-new').onclick = () => {
  initAudio();
  floorNum = 1;
  initGame();
  sfxNewFloor();
  if (audioCtx) { stopBGM(); startBGM(); }
  updateHUD();
  addLog('🗺 Nouveau donjon !', 'lw');
};

document.getElementById('btn-att').onclick = () => {
  initAudio();
  const adj = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
  for (const { dx, dy } of adj) {
    const e = entityAt(player.x + dx, player.y + dy);
    if (e && e.type === 'monster') { doCombat(e); return; }
  }
  addLog('Aucun ennemi adjacent.', 'li');
};

//D-pad desktop

document.getElementById('du').onclick = () => { initAudio(); tryMove(0, -1); };
document.getElementById('dd').onclick = () => { initAudio(); tryMove(0,  1); };
document.getElementById('dl').onclick = () => { initAudio(); tryMove(-1, 0); };
document.getElementById('dr').onclick = () => { initAudio(); tryMove( 1, 0); };

//Clavier

document.addEventListener('keydown', e => {
  if      (e.key === 'ArrowUp'    || e.key === 'z' || e.key === 'Z') { e.preventDefault(); initAudio(); tryMove(0, -1); }
  else if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') { e.preventDefault(); initAudio(); tryMove(0,  1); }
  else if (e.key === 'ArrowLeft'  || e.key === 'q' || e.key === 'Q') { e.preventDefault(); initAudio(); tryMove(-1, 0); }
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); initAudio(); tryMove( 1, 0); }
  else if (e.key === ' ')  { e.preventDefault(); initAudio(); document.getElementById('btn-att').click(); }
  else if (e.key === 'r' || e.key === 'R') { initAudio(); document.getElementById('btn-rest').click(); }
  else if (e.key === 'n' || e.key === 'N') { initAudio(); document.getElementById('btn-new').click(); }
  else if (e.key === 'm' || e.key === 'M') toggleSound();
});

//Démarrage

initGame();
scheduleAnim();
updateHUD();
addLog('⚔ Bienvenue dans le donjon ! Explorez, combattez, survivez...', 'lw');
addLog('🔊 Clique/touche pour activer le son — [M] pour couper', 'li');
