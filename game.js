// ─────────────────────────────────────────
//  game.js  —  Logique du jeu (tour par tour)
//  Dépend de : data.js, sprites.js, map.js, render.js, ui.js, sound.js
// ─────────────────────────────────────────

// ── État ────────────────────────────────

let player    = { x: 0, y: 0, rx: 0, ry: 0 };
let floorNum  = 1;
let gameState = 'title';   // title | playing | dead | won
let endless   = false;     // continuer après la victoire
let stats     = {};
let animFrame = 0;
let lastActionTime = 0;
const ACTION_DELAY = 110;  // ms minimum entre deux actions (maintien de touche)

// ── Sauvegarde locale ───────────────────

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('rpg.' + key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem('rpg.' + key, JSON.stringify(value)); } catch { /* indisponible */ } },
  del(key)        { try { localStorage.removeItem('rpg.' + key); } catch { /* indisponible */ } }
};

const records = store.get('records', { bestFloor: 0, wins: 0, bestKills: 0 });

function saveGame() {
  const { rx, ry, bump, flash, ...p } = player;
  store.set('save', { player: p, floorNum, stats, endless });
}

function updateRecords() {
  records.bestFloor = Math.max(records.bestFloor, floorNum);
  records.bestKills = Math.max(records.bestKills, stats.kills || 0);
  store.set('records', records);
}

// ── Joueur ──────────────────────────────

function newPlayer() {
  return {
    x: 0, y: 0, rx: 0, ry: 0,
    hp: 30, maxHp: 30,
    baseAtk: 5, baseDef: 2,
    bonusAtk: 0, bonusDef: 0, bonusHp: 0,   // achats chez le marchand
    weapon: 0, armor: 0,                      // paliers d'équipement
    xp: 0, xpNext: 10, lvl: 1,
    gold: 0, potions: 1,
    dir: 'right'
  };
}

function totalAtk() { return player.baseAtk + player.bonusAtk + WEAPONS[player.weapon].atk; }
function totalDef() { return player.baseDef + player.bonusDef + ARMORS[player.armor].def; }

// ── Parties ─────────────────────────────

function newGame() {
  resumeAudio();
  player   = newPlayer();
  floorNum = 1;
  endless  = false;
  stats    = { kills: 0, goldEarned: 0, turns: 0, chests: 0, startedAt: Date.now() };
  clearLog();
  gameState = 'playing';
  enterFloor();
  if (audioCtx) { stopBGM(); startBGM(); }
  addLog('⚔ Bienvenue dans le donjon ! Atteins l\'étage ' + FINAL_FLOOR + ' et terrasse la Liche.', 'lw');
  addLog('💡 Fonce sur un monstre pour l\'attaquer. [H] potion, [R] repos.', 'li');
}

function continueGame() {
  const save = store.get('save', null);
  if (!save) return newGame();
  resumeAudio();
  player   = { ...newPlayer(), ...save.player };
  floorNum = save.floorNum;
  stats    = save.stats;
  endless  = save.endless;
  clearLog();
  gameState = 'playing';
  enterFloor();
  if (audioCtx) { stopBGM(); startBGM(); }
  addLog('📜 Partie reprise à l\'étage ' + floorNum + '.', 'lw');
}

function enterFloor() {
  floatTexts = [];
  sparks = [];
  buildMap(floorNum);
  player.rx = player.x;
  player.ry = player.y;
  snapCamera();
  saveGame();
  updateRecords();
  updateHUD();
  addLog('🏚 Étage ' + floorNum + (endless ? ' (mode infini)' : ' / ' + FINAL_FLOOR), 'lw');
  if (bossForFloor(floorNum)) addLog('☠ Une présence maléfique garde l\'escalier...', 'lc');
  if (hasShop(floorNum)) addLog('🧙 Un marchand t\'attend près de l\'entrée.', 'lh');
}

// ── Tour de jeu ─────────────────────────

// Exécute une action du joueur ; si elle consomme un tour, les monstres jouent ensuite
function playerAct(action) {
  if (gameState !== 'playing' || isOverlayOpen()) return;
  const now = performance.now();
  if (now - lastActionTime < ACTION_DELAY) return;
  lastActionTime = now;
  const floorBefore = floorNum;
  if (action() && gameState === 'playing' && floorNum === floorBefore) endTurn();
  updateHUD();
}

function endTurn() {
  stats.turns++;
  computeFOV();
  monstersTurn();
  detectTraps();
  computeFOV();
}

// ── Actions du joueur ───────────────────

function tryMove(dx, dy) {
  playerAct(() => {
    if (dx > 0) player.dir = 'right';
    if (dx < 0) player.dir = 'left';
    const nx = player.x + dx, ny = player.y + dy;
    if (!isFloor(nx, ny)) return false;

    // Un monstre peut se tenir sur l'escalier : il a la priorité
    const e = monsterAt(nx, ny) || entityAt(nx, ny);
    if (e) {
      if (e.type === 'monster')  { attack(e, dx, dy); return true; }
      if (e.type === 'merchant') { openShop(); return false; }
      if (e.type === 'stairs')   return useStairs(e);
    }

    player.x = nx;
    player.y = ny;
    sfxStep();
    if (e) stepOn(e);
    return true;
  });
}

function stepOn(e) {
  const remove = () => { entities = entities.filter(x => x !== e); };
  switch (e.type) {
    case 'chest':  openChest(e); remove(); break;
    case 'gold': {
      player.gold += e.amount;
      stats.goldEarned += e.amount;
      sfxCoin();
      floatText(e.x, e.y, '+' + e.amount + ' or', '#f1c40f');
      addLog('💰 Tu ramasses ' + e.amount + ' pièces d\'or.', 'll');
      remove();
      break;
    }
    case 'potion':
      player.potions++;
      sfxChest();
      floatText(e.x, e.y, '+1 potion', '#ff8a80');
      addLog('🧪 Tu trouves une potion de soin !', 'lh');
      remove();
      break;
    case 'healer':
      if (player.hp >= player.maxHp) { addLog('✨ Une fontaine sacrée... tu es déjà en pleine forme.', 'li'); break; }
      heal(Math.floor(player.maxHp * 0.6));
      sfxHeal();
      addLog('✨ L\'eau de la fontaine te revigore.', 'lh');
      remove();
      break;
    case 'trap':
      if (e.revealed) {
        addLog('🔧 Tu désamorces le piège. +2 XP', 'li');
        gainXp(2);
      } else {
        const d = rnd(4, 8) + floorNum;
        hurtPlayer(d, 'un piège');
        sfxTrap();
        addShake(6);
        spawnSparks(e.x, e.y, '#b0b0c0', 10);
        addLog('🪤 PIÈGE ! -' + d + ' PV', 'lc');
      }
      remove();
      break;
  }
}

function useStairs(e) {
  if (e.locked) {
    // Escalier scellé : on peut marcher dessus (il ne doit jamais bloquer un couloir)
    sfxDenied();
    addLog('🔒 L\'escalier est scellé. Vaincs le gardien de l\'étage !', 'lc');
    player.x = e.x;
    player.y = e.y;
    return true;
  }
  floorNum++;
  sfxNewFloor();
  enterFloor();
  return false;
}

function attackAdjacent() {
  playerAct(() => {
    // Priorité au monstre dans la direction du regard
    const order = player.dir === 'left'
      ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
      : [[1, 0], [-1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of order) {
      const m = monsterAt(player.x + dx, player.y + dy);
      if (m) {
        if (dx) player.dir = dx > 0 ? 'right' : 'left';
        attack(m, dx, dy);
        return true;
      }
    }
    addLog('Aucun ennemi à portée.', 'li');
    return false;
  });
}

function drinkPotion() {
  playerAct(() => {
    if (player.potions < 1)            { sfxDenied(); addLog('Tu n\'as plus de potion.', 'li'); return false; }
    if (player.hp >= player.maxHp)     { addLog('Tu es déjà en pleine forme.', 'li'); return false; }
    player.potions--;
    const h = heal(Math.floor(player.maxHp * POTION_HEAL));
    sfxPotion();
    addLog('🧪 Tu bois une potion : +' + h + ' PV', 'lh');
    return true;
  });
}

function rest() {
  playerAct(() => {
    if (entities.some(e => e.type === 'monster' && isVisible(e.x, e.y))) {
      sfxDenied(); addLog('Impossible de se reposer avec des ennemis en vue !', 'lc'); return false;
    }
    if (player.hp >= player.maxHp) { addLog('Tu es déjà en pleine forme.', 'li'); return false; }
    if (player.gold < REST_COST)    { sfxDenied(); addLog('Il faut ' + REST_COST + ' or pour installer un campement.', 'li'); return false; }
    player.gold -= REST_COST;
    const h = heal(Math.floor(player.maxHp * REST_HEAL));
    sfxRest();
    addLog('⛺ Tu te reposes : +' + h + ' PV (-' + REST_COST + ' or)', 'lh');
    // Le bruit du campement peut réveiller un monstre proche
    const sleeper = entities.find(e => e.type === 'monster' && !e.awake && Math.abs(e.x - player.x) + Math.abs(e.y - player.y) < 12);
    if (sleeper && chance(0.35)) { sleeper.awake = true; addLog('👂 Quelque chose remue dans l\'obscurité...', 'lc'); }
    return true;
  });
}

function waitTurn() {
  playerAct(() => true);
}

function heal(amount) {
  const before = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + amount);
  const gained = player.hp - before;
  if (gained > 0) floatText(player.x, player.y, '+' + gained, '#2ecc71');
  return gained;
}

// ── Combat ──────────────────────────────

function attack(m, dx, dy) {
  wake(m);
  player.bump = { dx, dy, t: 1 };
  const crit = chance(0.12);
  let dmg = Math.max(1, totalAtk() - m.def + rnd(-1, 2));
  if (crit) dmg *= 2;
  m.hp -= dmg;
  m.flash = 1;
  if (crit) { sfxCrit(); addShake(5); } else sfxAttack();
  spawnSparks(m.x, m.y, crit ? '#f1c40f' : '#e74c3c', crit ? 14 : 7);
  floatText(m.x, m.y, (crit ? 'CRITIQUE ' : '') + '-' + dmg, crit ? '#f1c40f' : '#fff', crit);
  addLog('⚔ Tu frappes ' + m.name + (crit ? ' (CRITIQUE !)' : '') + ' : ' + dmg + ' dégâts', crit ? 'll' : 'lc');
  if (m.hp <= 0) killMonster(m);
}

function killMonster(m) {
  entities = entities.filter(e => e !== m);
  stats.kills++;
  const gold = rnd(m.gold[0], m.gold[1]);
  player.gold += gold;
  stats.goldEarned += gold;
  sfxEnemyDie();
  spawnSparks(m.x, m.y, '#9b59b6', 16);
  addLog('💀 ' + m.name + ' vaincu ! +' + m.xp + ' XP' + (gold ? ' +' + gold + ' or' : ''), 'll');
  if (!m.boss && chance(0.08)) addEntity('potion', m.x, m.y);

  if (m.boss) {
    const stairs = entities.find(e => e.type === 'stairs');
    if (stairs) stairs.locked = false;
    addShake(10);
    addLog('🔓 Le sceau de l\'escalier se brise !', 'lw');
    player.potions++;
    addLog('🧪 Le boss laisse tomber une potion.', 'lh');
    if (floorNum === FINAL_FLOOR && !endless) {
      gainXp(m.xp);
      gameState = 'won';
      setTimeout(victory, 900);
      return;
    }
  }
  gainXp(m.xp);
}

function monstersTurn() {
  const dist = distanceMap(player.x, player.y); // carte de poursuite partagée
  for (const m of entities.filter(e => e.type === 'monster')) {
    if (gameState !== 'playing') return;
    const d = Math.abs(player.x - m.x) + Math.abs(player.y - m.y);

    if (!m.awake) {
      if (isVisible(m.x, m.y) && d <= VIEW_RADIUS && (m.boss || chance(0.6))) wake(m);
      continue;
    }

    m.turn = (m.turn || 0) + 1;
    if (m.ai === 'slow' && m.turn % 2 === 0) continue;
    if (d === 1) { monsterAttack(m); continue; }

    // Pouvoirs des boss
    if (m.key === 'lich' && d <= 5 && m.turn % 3 === 0 && lineOfSight(m.x, m.y, player.x, player.y)) { lichBolt(m); continue; }

    if (m.ai === 'erratic' && chance(0.45)) { randomStep(m); continue; }
    if (d > 16) { m.awake = false; continue; } // perd la trace
    chaseStep(m, dist);
  }
}

function wake(m) {
  if (m.awake) return;
  m.awake = true;
  if (m.boss) {
    sfxBoss();
    addShake(8);
    addLog('☠ ' + m.name + ' se dresse devant toi !', 'lc');
  }
}

function canMonsterEnter(x, y) {
  return isFloor(x, y) && !(x === player.x && y === player.y)
    && !entities.some(e => e.x === x && e.y === y && e.type !== 'trap' && e.type !== 'stairs');
}

function moveMonster(m, nx, ny) {
  if (nx !== m.x) m.dir = nx > m.x ? 'right' : 'left';
  m.x = nx; m.y = ny;
}

function chaseStep(m, dist) {
  // Descend la carte de distances vers le joueur (contourne les obstacles)
  let best = null;
  for (const [dx, dy] of shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]])) {
    const nx = m.x + dx, ny = m.y + dy;
    if (!canMonsterEnter(nx, ny)) continue;
    if (dist[ny][nx] < dist[m.y][m.x] && (!best || dist[ny][nx] < best.d)) best = { x: nx, y: ny, d: dist[ny][nx] };
  }
  if (best) moveMonster(m, best.x, best.y);
}

function randomStep(m) {
  for (const [dx, dy] of shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]])) {
    if (canMonsterEnter(m.x + dx, m.y + dy)) { moveMonster(m, m.x + dx, m.y + dy); return; }
  }
}

function monsterAttack(m) {
  const dx = Math.sign(player.x - m.x), dy = Math.sign(player.y - m.y);
  m.bump = { dx, dy, t: 1 };
  if (dx) m.dir = dx > 0 ? 'right' : 'left';

  if (chance(0.08)) {
    sfxMiss();
    floatText(player.x, player.y, 'esquive', '#63b3ed');
    addLog('💨 Tu esquives l\'attaque de ' + m.name + '.', 'li');
    return;
  }
  // Le Roi Gobelin enrage à mi-vie
  if (m.key === 'goblinKing' && !m.enraged && m.hp <= m.maxHp / 2) {
    m.enraged = true;
    m.atk += 3;
    addLog('😡 ' + m.name + ' entre dans une rage folle !', 'lc');
  }
  const dmg = Math.max(1, m.atk - totalDef() + rnd(-1, 2));
  hurtPlayer(dmg, m.name);
  sfxHurt();
  addLog('🩸 ' + m.name + ' te frappe : -' + dmg + ' PV', 'lc');
}

function lichBolt(m) {
  const dmg = Math.max(2, Math.round(m.atk * 0.8) - Math.floor(totalDef() / 2));
  m.bump = { dx: Math.sign(player.x - m.x), dy: Math.sign(player.y - m.y), t: 1 };
  spawnSparks(player.x, player.y, '#b388ff', 18);
  sfxTrap();
  hurtPlayer(dmg, m.name);
  addLog('🔮 ' + m.name + ' lance un rayon d\'ombre : -' + dmg + ' PV', 'lc');
}

function hurtPlayer(dmg, source) {
  player.hp = Math.max(0, player.hp - dmg);
  player.flash = 1;
  addShake(4);
  floatText(player.x, player.y, '-' + dmg, '#ff5252');
  if (player.hp <= 0) death(source);
}

// ── Progression ─────────────────────────

function gainXp(amount) {
  player.xp += amount;
  let gained = 0;
  while (player.xp >= player.xpNext) {
    player.xp    -= player.xpNext;
    player.xpNext = Math.floor(player.xpNext * 1.45);
    player.lvl++;
    player.maxHp += 8;
    player.baseAtk += 2;
    player.baseDef += 1;
    gained++;
  }
  if (!gained) return;
  player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.3));
  sfxLevelUp();
  floatText(player.x, player.y - 0.5, 'NIVEAU ' + player.lvl + ' !', '#f1c40f', true);
  addLog('✨ Niveau ' + player.lvl + ' atteint ! +' + 8 * gained + ' PV max, +' + 2 * gained + ' ATK, +' + gained + ' DEF', 'lw');
}

function detectTraps() {
  for (const t of entities) {
    if (t.type !== 'trap' || t.revealed) continue;
    if (Math.abs(t.x - player.x) + Math.abs(t.y - player.y) === 1 && chance(0.35)) {
      t.revealed = true;
      floatText(t.x, t.y, '!', '#f39c12', true);
      addLog('👁 Tu repères un piège à tes pieds.', 'li');
    }
  }
}

function openChest(e) {
  stats.chests++;
  sfxChest();
  spawnSparks(e.x, e.y, '#f1c40f', 12);
  const roll = Math.random();
  const canWeapon = player.weapon < WEAPONS.length - 1;
  const canArmor  = player.armor  < ARMORS.length - 1;
  // Moins de chances d'équipement si on est déjà bien équipé par rapport à l'étage
  const gearChance = 0.38 - 0.06 * Math.max(0, player.weapon + player.armor - floorNum);

  if (roll < gearChance && (canWeapon || canArmor)) {
    const weapon = canWeapon && (!canArmor || chance(0.5));
    if (weapon) {
      player.weapon++;
      const w = WEAPONS[player.weapon];
      floatText(e.x, e.y, w.name, '#63b3ed', true);
      addLog('🗡 Coffre : ' + w.name + ' ! (ATK ' + totalAtk() + ')', 'lw');
    } else {
      player.armor++;
      const a = ARMORS[player.armor];
      floatText(e.x, e.y, a.name, '#63b3ed', true);
      addLog('🛡 Coffre : ' + a.name + ' ! (DEF ' + totalDef() + ')', 'lw');
    }
  } else if (roll < gearChance + 0.25) {
    player.potions++;
    floatText(e.x, e.y, '+1 potion', '#ff8a80');
    addLog('📦 Coffre : une potion de soin !', 'lh');
  } else {
    const g = rnd(8, 15) + floorNum * 3;
    player.gold += g;
    stats.goldEarned += g;
    floatText(e.x, e.y, '+' + g + ' or', '#f1c40f');
    addLog('📦 Coffre : +' + g + ' or !', 'll');
  }
}

// ── Marchand ────────────────────────────

function openShop() {
  sfxCoin();
  const items = SHOP_ITEMS.map(it => {
    const price = it.price(player);
    return {
      label: it.label + ' — ' + price + ' or',
      disabled: player.gold < price,
      keep: true,
      fn: () => buy(it.id, price)
    };
  });
  items.push({ label: 'Partir', cancel: true, fn: () => {} });
  showOv('🧙 MARCHAND', 'Ton or : ' + player.gold + ' 💰', items, { vertical: true, numbered: true, theme: 'shop' });
}

function buy(id, price) {
  if (player.gold < price) return;
  player.gold -= price;
  if (id === 'potion') player.potions++;
  if (id === 'atk')    player.bonusAtk++;
  if (id === 'def')    player.bonusDef++;
  if (id === 'hp')     { player.bonusHp++; player.maxHp += 10; player.hp += 10; }
  sfxBuy();
  addLog('🛒 Achat effectué (-' + price + ' or).', 'll');
  updateHUD();
  openShop(); // rafraîchit les prix et l'or restant
}

// ── Fins de partie ──────────────────────

function runTime() {
  const s = Math.floor((Date.now() - (stats.startedAt || Date.now())) / 1000);
  return Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s';
}

function endStats() {
  return [
    ['Étage atteint', floorNum],
    ['Niveau', player.lvl],
    ['Monstres vaincus', stats.kills],
    ['Or gagné', stats.goldEarned],
    ['Coffres ouverts', stats.chests],
    ['Durée', runTime()]
  ];
}

function death(source) {
  gameState = 'dead';
  player.hp = 0;
  updateRecords();
  store.del('save'); // mort définitive
  updateHUD();
  sfxGameOver();
  addShake(12);
  addLog('☠ Tu as été vaincu par ' + source + '.', 'lc');
  setTimeout(() => {
    if (gameState !== 'dead') return;
    const body = document.createElement('div');
    body.append(paragraph('Vaincu par ' + source + '...'), statsTable(endStats()),
      paragraph('Record : étage ' + records.bestFloor, 'ov-note'));
    showOv('☠ TU ES MORT', body, [
      { label: '↻ Recommencer', primary: true, fn: newGame },
      { label: 'Menu', cancel: true, fn: showTitle }
    ], { theme: 'death' });
  }, 900);
}

function victory() {
  if (gameState !== 'won') return;
  records.wins++;
  updateRecords();
  store.del('save');
  sfxVictory();
  const body = document.createElement('div');
  body.append(paragraph('La Liche Ancienne est tombée. Le donjon est libéré !'), statsTable(endStats()),
    paragraph('Victoires : ' + records.wins, 'ov-note'));
  showOv('🏆 VICTOIRE !', body, [
    { label: '∞ Continuer (mode infini)', primary: true, fn: () => {
      endless = true;
      gameState = 'playing';
      floorNum++;
      enterFloor();
      if (audioCtx) { stopBGM(); startBGM(); }
    } },
    { label: 'Menu', cancel: true, fn: showTitle }
  ], { theme: 'victory' });
}

// ── Écrans ──────────────────────────────

function showTitle() {
  gameState = 'title';
  const save = store.get('save', null);
  const body = document.createElement('div');
  body.append(
    paragraph('Descends ' + FINAL_FLOOR + ' étages, terrasse le Roi Gobelin et la Liche Ancienne.'),
    paragraph('Record : étage ' + records.bestFloor + ' · Victoires : ' + records.wins, 'ov-note')
  );
  const btns = [];
  if (save) btns.push({ label: '▶ Continuer (étage ' + save.floorNum + ')', primary: true, fn: continueGame });
  btns.push({ label: '⚔ Nouvelle partie', primary: !save, fn: newGame });
  btns.push({ label: '❔ Comment jouer', keep: true, fn: showHelp });
  showOv('DONJON RPG', body, btns, { vertical: true, theme: 'title' });
}

function showHelp(back = showTitle) {
  const body = document.createElement('div');
  body.className = 'help';
  [
    '⬆⬇⬅➡ / ZQSD : se déplacer, foncer sur un monstre pour l\'attaquer',
    'Espace : attaquer un ennemi adjacent · . : passer son tour',
    'H : boire une potion · R : se reposer (' + REST_COST + ' or, aucun ennemi en vue)',
    'C : mini-carte · M : son · Échap : menu',
    '📦 Coffres : or, potions ou meilleur équipement',
    '🪤 Pièges cachés : longe-les pour les repérer puis les désamorcer',
    '🧙 Marchand aux étages ' + SHOP_FLOORS.join(', ') + ' · ☠ Boss aux étages 5 et 10'
  ].forEach(t => body.appendChild(paragraph(t)));
  showOv('COMMENT JOUER', body, [{ label: 'Retour', cancel: true, primary: true, fn: back }], { theme: 'help' });
}

function showPauseMenu() {
  if (gameState !== 'playing' || isOverlayOpen()) return;
  showOv('PAUSE', 'Partie sauvegardée au début de chaque étage.', [
    { label: '▶ Reprendre', primary: true, cancel: true, fn: () => {} },
    { label: '❔ Comment jouer', keep: true, fn: () => showHelp(showPauseMenuForce) },
    { label: '🏠 Menu principal', fn: showTitle }
  ], { vertical: true });
}
function showPauseMenuForce() { hideOv(); showPauseMenu(); }

// ── Boucle d'animation ──────────────────

let lastFrame = performance.now(), animTimer = 0;
function gameLoop(now) {
  const dt = Math.min(100, now - lastFrame);
  lastFrame = now;
  animTimer += dt;
  if (animTimer > 200) { animTimer = 0; animFrame = (animFrame + 1) % 8; }
  updateEffects(dt);
  render(animFrame);
  requestAnimationFrame(gameLoop);
}

// ── Démarrage ───────────────────────────

player = newPlayer();
stats  = { kills: 0, goldEarned: 0, turns: 0, chests: 0 };
buildMap(1);           // décor de fond derrière l'écran titre
snapCamera();
updateHUD();
updateSoundButton();
requestAnimationFrame(gameLoop);
showTitle();
