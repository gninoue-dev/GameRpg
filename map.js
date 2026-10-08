// ─────────────────────────────────────────
//  map.js  —  Génération du donjon & champ de vision
//  Dépend de : data.js
// ─────────────────────────────────────────

const COLS = 40;
const ROWS = 30;

// État partagé de la carte (lu/écrit aussi par game.js et render.js)
let grid        = [];   // 0 = mur, 1 = sol
let variantMap  = [];
let explored    = [];   // cases déjà vues
let visible     = [];   // cases actuellement dans le champ de vision
let torchPositions = [];
let entities    = [];
let rooms       = [];
let startRoom   = null;

// ── Outils ──────────────────────────────

function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function chance(p) { return Math.random() < p; }

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function inBounds(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
function isFloor(x, y)  { return inBounds(x, y) && grid[y][x] === 1; }
function makeGrid(v)    { return Array.from({ length: ROWS }, () => Array(COLS).fill(v)); }

function entityAt(x, y, filter) {
  return entities.find(e => e.x === x && e.y === y && (!filter || filter(e)));
}
function monsterAt(x, y) { return entityAt(x, y, e => e.type === 'monster'); }

let nextId = 1;
function addEntity(type, x, y, extra = {}) {
  const e = { id: nextId++, type, x, y, rx: x, ry: y, ...extra };
  entities.push(e);
  return e;
}

// ── Génération ──────────────────────────

function carveRoom(r) {
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++)
      grid[y][x] = 1;
}

function carveCorridor(a, b) {
  let x = a.cx, y = a.cy;
  const horizontalFirst = chance(0.5);
  const stepX = () => { while (x !== b.cx) { grid[y][x] = 1; x += x < b.cx ? 1 : -1; } };
  const stepY = () => { while (y !== b.cy) { grid[y][x] = 1; y += y < b.cy ? 1 : -1; } };
  if (horizontalFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
  grid[y][x] = 1;
}

const roomDist = (a, b) => Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy);

function generateRooms(target) {
  rooms = [];
  for (let tries = 0; tries < 400 && rooms.length < target; tries++) {
    const w = rnd(4, 8), h = rnd(4, 6);
    const x = rnd(1, COLS - w - 1), y = rnd(1, ROWS - h - 1);
    const r = { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
    // Marge d'une case entre les salles
    const overlaps = rooms.some(o => x - 1 <= o.x + o.w && x + w + 1 >= o.x && y - 1 <= o.y + o.h && y + h + 1 >= o.y);
    if (!overlaps) rooms.push(r);
  }
}

function connectRooms() {
  // Arbre couvrant minimal (Prim) : chaque salle reliée à la plus proche déjà connectée
  const connected = [rooms[0]];
  const remaining = rooms.slice(1);
  while (remaining.length) {
    let best = null;
    for (const r of remaining)
      for (const c of connected) {
        const d = roomDist(r, c);
        if (!best || d < best.d) best = { r, c, d };
      }
    carveCorridor(best.c, best.r);
    connected.push(best.r);
    remaining.splice(remaining.indexOf(best.r), 1);
  }
  // Quelques couloirs supplémentaires pour créer des boucles
  for (let i = 0; i < 2; i++) carveCorridor(pick(rooms), pick(rooms));
}

// Distance de marche depuis une case (BFS)
function distanceMap(sx, sy) {
  const dist = makeGrid(Infinity);
  dist[sy][sx] = 0;
  const queue = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (isFloor(nx, ny) && dist[ny][nx] === Infinity) {
        dist[ny][nx] = dist[y][x] + 1;
        queue.push([nx, ny]);
      }
    }
  }
  return dist;
}

function freeTileInRoom(room, avoid = () => false) {
  const tiles = [];
  for (let y = room.y; y < room.y + room.h; y++)
    for (let x = room.x; x < room.x + room.w; x++)
      if (!entityAt(x, y) && !(x === player.x && y === player.y) && !avoid(x, y)) tiles.push({ x, y });
  return tiles.length ? pick(tiles) : null;
}

function buildMap(floor) {
  grid           = makeGrid(0);
  variantMap     = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => rnd(0, 2)));
  explored       = makeGrid(false);
  visible        = makeGrid(false);
  entities       = [];
  torchPositions = [];

  generateRooms(9 + Math.min(3, Math.floor(floor / 3)));
  rooms.forEach(carveRoom);
  connectRooms();

  // Départ dans une salle aléatoire, escalier dans la salle la plus éloignée à pied
  startRoom = pick(rooms);
  player.x = startRoom.cx;
  player.y = startRoom.cy;
  const dist = distanceMap(player.x, player.y);
  const stairsRoom = rooms.reduce((a, b) => (dist[b.cy][b.cx] > dist[a.cy][a.cx] ? b : a));
  const others = rooms.filter(r => r !== startRoom);
  const farFromStart = (x, y) => Math.abs(x - player.x) + Math.abs(y - player.y) < 4;

  // Escalier (verrouillé à un étage de boss tant que le boss est vivant)
  const bossKey = bossForFloor(floor);
  addEntity('stairs', stairsRoom.cx, stairsRoom.cy, { locked: !!bossKey });

  if (bossKey) {
    const spot = freeTileInRoom(stairsRoom, (x, y) => Math.abs(x - stairsRoom.cx) + Math.abs(y - stairsRoom.cy) > 2);
    if (spot) addEntity('monster', spot.x, spot.y, { ...scaledMonster(bossKey, floor), awake: false });
  }

  // Monstres répartis dans les autres salles
  const monsterCount = 4 + floor + rnd(0, 2) - (bossKey ? 2 : 0);
  for (let i = 0; i < monsterCount; i++) {
    const spot = freeTileInRoom(pick(others), farFromStart);
    if (spot) addEntity('monster', spot.x, spot.y, { ...scaledMonster(randomMonsterKey(floor), floor), awake: false, turn: 0 });
  }

  // Objets
  const place = (type, count, extra = {}, rooms_ = others) => {
    for (let i = 0; i < count; i++) {
      const spot = freeTileInRoom(pick(rooms_), farFromStart);
      if (spot) addEntity(type, spot.x, spot.y, typeof extra === 'function' ? extra() : { ...extra });
    }
  };
  place('chest',  rnd(2, 3));
  place('gold',   rnd(2, 4), () => ({ amount: rnd(3, 8) + floor * 2 }));
  place('potion', chance(0.6) ? 1 : 0);
  place('healer', 1);

  // Pièges cachés (aussi dans les couloirs)
  const corridorTiles = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (grid[y][x] === 1 && !rooms.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)
          && !entityAt(x, y) && !farFromStart(x, y)) corridorTiles.push({ x, y });
  shuffle(corridorTiles);
  const trapCount = 2 + Math.floor(floor / 2);
  for (let i = 0; i < trapCount; i++) {
    const spot = i % 2 === 0 && corridorTiles.length ? corridorTiles.pop() : freeTileInRoom(pick(others), farFromStart);
    if (spot) addEntity('trap', spot.x, spot.y, { revealed: false });
  }

  // Marchand dans la salle de départ certains étages
  if (hasShop(floor)) {
    // Jamais devant une sortie de salle : le marchand bloquerait le passage
    const inRoom = (x, y) => x >= startRoom.x && x < startRoom.x + startRoom.w && y >= startRoom.y && y < startRoom.y + startRoom.h;
    const nearExit = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isFloor(x + dx, y + dy) && !inRoom(x + dx, y + dy));
    const spot = freeTileInRoom(startRoom, (x, y) => Math.abs(x - player.x) + Math.abs(y - player.y) < 2 || nearExit(x, y));
    if (spot) addEntity('merchant', spot.x, spot.y);
  }

  // Torches sur les murs qui bordent une salle
  for (const r of rooms) {
    for (let x = r.x + 1; x < r.x + r.w - 1; x += 3)
      if (grid[r.y - 1] && grid[r.y - 1][x] === 0 && chance(0.6)) torchPositions.push({ x, y: r.y - 1 });
  }

  computeFOV();
}

// ── Champ de vision (ligne de vue Bresenham) ──

function lineOfSight(x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  while (!(x === x1 && y === y1)) {
    if (!(x === x0 && y === y0) && grid[y][x] === 0) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return true;
}

function computeFOV() {
  visible = makeGrid(false);
  const r = VIEW_RADIUS;
  for (let y = Math.max(0, player.y - r); y <= Math.min(ROWS - 1, player.y + r); y++)
    for (let x = Math.max(0, player.x - r); x <= Math.min(COLS - 1, player.x + r); x++) {
      const dx = x - player.x, dy = y - player.y;
      if (dx * dx + dy * dy <= r * r + r && lineOfSight(player.x, player.y, x, y)) {
        visible[y][x]  = true;
        explored[y][x] = true;
      }
    }
}

function isVisible(x, y) { return inBounds(x, y) && visible[y][x]; }
