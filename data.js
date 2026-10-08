// ─────────────────────────────────────────
//  data.js  —  Données du jeu (monstres, équipement, constantes)
// ─────────────────────────────────────────

const FINAL_FLOOR = 10;          // vaincre le boss de cet étage = victoire
const SHOP_FLOORS = [3, 6, 8];

// Un boss tous les 5 étages : Roi Gobelin puis Liche (en boucle en mode infini)
function bossForFloor(floor) {
  if (floor % 5 !== 0) return null;
  return floor % 10 === 0 ? 'lich' : 'goblinKing';
}

// Le marchand revient aussi régulièrement en mode infini
function hasShop(floor) {
  return SHOP_FLOORS.includes(floor) || (floor > FINAL_FLOOR && floor % 5 === 3);
}

// Types de monstres : stats de base (étage 1), avant mise à l'échelle
// minFloor : étage d'apparition · weight : fréquence relative
// ai : 'chase' (poursuite), 'slow' (agit un tour sur deux), 'erratic' (vol désordonné)
const MONSTERS = {
  slime:      { name: 'Slime',          sprite: 'slime',    hp: 8,  atk: 3, def: 0, xp: 3,  gold: [1, 3],   ai: 'slow',    minFloor: 1, weight: 4 },
  bat:        { name: 'Chauve-souris',  sprite: 'bat',      hp: 6,  atk: 3, def: 0, xp: 3,  gold: [0, 2],   ai: 'erratic', minFloor: 1, weight: 3 },
  goblin:     { name: 'Gobelin',        sprite: 'goblin',   hp: 11, atk: 4, def: 1, xp: 5,  gold: [2, 5],   ai: 'chase',   minFloor: 1, weight: 4 },
  skeleton:   { name: 'Squelette',      sprite: 'skeleton', hp: 15, atk: 5, def: 2, xp: 7,  gold: [2, 6],   ai: 'chase',   minFloor: 2, weight: 3 },
  orc:        { name: 'Orc',            sprite: 'orc',      hp: 24, atk: 7, def: 3, xp: 12, gold: [4, 9],   ai: 'chase',   minFloor: 4, weight: 2 },
  goblinKing: { name: 'Roi Gobelin',    sprite: 'goblinKing', hp: 70,  atk: 9,  def: 4, xp: 60,  gold: [40, 60],  ai: 'chase', boss: true },
  lich:       { name: 'Liche Ancienne', sprite: 'lich',       hp: 170, atk: 16, def: 7, xp: 150, gold: [90, 120], ai: 'chase', boss: true }
};

// Paliers d'équipement : chaque coffre peut faire monter d'un palier
const WEAPONS = [
  { name: 'Dague rouillée', atk: 0 },
  { name: 'Épée courte',    atk: 2 },
  { name: 'Épée longue',    atk: 4 },
  { name: 'Hache de guerre',atk: 6 },
  { name: 'Lame runique',   atk: 9 }
];
const ARMORS = [
  { name: 'Tunique',            def: 0 },
  { name: 'Armure de cuir',     def: 1 },
  { name: 'Cotte de mailles',   def: 3 },
  { name: 'Armure de plaques',  def: 5 },
  { name: 'Armure draconique',  def: 7 }
];

const POTION_HEAL = 0.5;   // fraction des PV max rendue par une potion
const REST_COST   = 5;     // or dépensé pour se reposer
const REST_HEAL   = 0.3;
const VIEW_RADIUS = 6;

// Articles du marchand (le prix peut dépendre de l'étage / du joueur)
const SHOP_ITEMS = [
  { id: 'potion', label: '🧪 Potion de soin', price: () => 12 },
  { id: 'atk',    label: '⚔ Aiguiser l\'arme (+1 ATK)', price: p => 20 + p.bonusAtk * 10 },
  { id: 'def',    label: '🛡 Renforcer l\'armure (+1 DEF)', price: p => 20 + p.bonusDef * 10 },
  { id: 'hp',     label: '❤ Élixir de vie (+10 PV max)', price: p => 25 + p.bonusHp * 5 }
];

// Stats d'un monstre mis à l'échelle de l'étage
function scaledMonster(key, floor) {
  const m = MONSTERS[key];
  const k = 1 + 0.16 * (floor - 1);
  // Les boss sont calibrés pour leur étage ; au-delà de l'étage final ils se renforcent
  const bk = 1 + 0.12 * Math.max(0, floor - FINAL_FLOOR);
  const hp = Math.round(m.hp * (m.boss ? bk : k));
  return {
    key,
    name:  m.name,
    sprite: m.sprite,
    ai:    m.ai,
    boss:  !!m.boss,
    hp, maxHp: hp,
    atk:   Math.round(m.atk * (m.boss ? bk : 1 + 0.15 * (floor - 1))),
    def:   m.def + (m.boss ? Math.floor(Math.max(0, floor - FINAL_FLOOR) / 3) : Math.floor((floor - 1) / 3)),
    xp:    Math.round(m.xp * (m.boss ? bk : 1 + 0.1 * (floor - 1))),
    gold:  m.gold
  };
}

// Tirage pondéré d'un monstre disponible à cet étage
function randomMonsterKey(floor) {
  const pool = Object.entries(MONSTERS).filter(([, m]) => !m.boss && m.minFloor <= floor);
  const total = pool.reduce((s, [, m]) => s + m.weight, 0);
  let r = Math.random() * total;
  for (const [key, m] of pool) {
    r -= m.weight;
    if (r <= 0) return key;
  }
  return pool[0][0];
}
