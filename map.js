// ─────────────────────────────────────────
//  map.js  —  Map generation & rendering
// ─────────────────────────────────────────

const COLS = 20;
const ROWS = 15;

// Shared map state (read/written by game.js too)
let grid        = [];
let variantMap  = [];
let fogMap      = [];
let visitedMap  = [];
let torchPositions = [];
let entities    = [];

// ── Helpers ─────────────────────────────

function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function entityAt(x, y) {
  return entities.find(e => e.x === x && e.y === y);
}

// ── Map builder ─────────────────────────

function buildMap() {
  grid       = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  variantMap = Array.from({ length: ROWS }, () => Array(COLS).fill(0).map(() => rnd(0, 2)));
  fogMap     = Array.from({ length: ROWS }, () => Array(COLS).fill(true));
  visitedMap = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  entities   = [];
  torchPositions = [];

  // Generate rooms
  const rooms = [];
  for (let i = 0; i < 7; i++) {
    const w  = rnd(3, 6), h = rnd(3, 5);
    const rx = rnd(1, COLS - w - 2), ry = rnd(1, ROWS - h - 2);
    rooms.push({ x: rx, y: ry, w, h, cx: Math.floor(rx + w / 2), cy: Math.floor(ry + h / 2) });
    for (let y = ry; y < ry + h; y++)
      for (let x = rx; x < rx + w; x++)
        grid[y][x] = 1;
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    let { cx: ax, cy: ay } = rooms[i - 1];
    let { cx: bx, cy: by } = rooms[i];
    while (ax !== bx) { grid[ay][ax] = 1; ax += ax < bx ? 1 : -1; }
    while (ay !== by) { grid[ay][ax] = 1; ay += ay < by ? 1 : -1; }
  }

  // Scatter torches on wall-adjacent floor tiles
  for (let y = 1; y < ROWS - 1; y++)
    for (let x = 1; x < COLS - 1; x++)
      if (grid[y][x] === 0 && (grid[y][x + 1] === 1 || grid[y + 1][x] === 1) && Math.random() < 0.08)
        torchPositions.push({ x, y });

  // Place player in first room centre
  const r0 = rooms[0];
  player.x = r0.cx;
  player.y = r0.cy;

  // Collect free floor tiles (excluding player start)
  let floors = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (grid[y][x] === 1 && !(x === player.x && y === player.y))
        floors.push({ x, y });
  shuffle(floors);

  // Spawn entities
  const MNAMES = ['Goblin', 'Goblin', 'Squelette', 'Slime', 'Goblin', 'Squelette', 'Slime'];
  let fi = 0;
  const spawn = (type, count, extra = {}) => {
    for (let i = 0; i < count && fi < floors.length; i++, fi++)
      entities.push({ ...floors[fi], type, ...extra, id: Math.random() });
  };

  spawn('monster', 4 + floorNum, {
    mtype:  MNAMES[rnd(0, MNAMES.length - 1)],
    hp:     8  + floorNum * 2,
    maxHp:  8  + floorNum * 2,
    atk:    3  + floorNum,
    def:    1,
    frame:  0
  });
  spawn('chest',   2);
  spawn('trap',    2);
  spawn('healer',  1);
  spawn('stairs',  1);

  revealAround(player.x, player.y, 4);
}

// ── Fog of war ──────────────────────────

function revealAround(px, py, r) {
  for (let y = Math.max(0, py - r); y <= Math.min(ROWS - 1, py + r); y++)
    for (let x = Math.max(0, px - r); x <= Math.min(COLS - 1, px + r); x++)
      if (Math.abs(x - px) + Math.abs(y - py) <= r + 1) {
        fogMap[y][x]     = false;
        visitedMap[y][x] = true;
      }
}

//Rendu de la map

function render() {
  const C   = document.getElementById('gc');
  const ctx = C.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, C.width, C.height);

  const camX = Math.max(0, Math.min(player.x - 10, COLS - 20)) * TW;
  const camY = Math.max(0, Math.min(player.y - 7,  ROWS - 15)) * TW;

  ctx.save();
  ctx.translate(-camX, -camY);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px       = x * TW, py = y * TW;
      const isFog    = fogMap[y][x];
      const visited  = visitedMap[y][x];

      if (isFog && !visited) continue;

      // Draw base tile
      if (grid[y][x] === 0) drawTile(ctx, 'wall',  px, py, variantMap[y][x]);
      else                   drawTile(ctx, 'floor', px, py, variantMap[y][x]);

      // Dim visited-but-fogged tiles
      if (isFog) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(px, py, TW, TW);
        continue;
      }

      // Torches
      if (torchPositions.find(t => t.x === x && t.y === y))
        drawTile(ctx, 'torch', px, py, 0);

      // Entities
      const e = entityAt(x, y);
      if (e) {
        if      (e.type === 'chest')   drawTile(ctx, 'chest',  px, py, 0);
        else if (e.type === 'stairs')  drawTile(ctx, 'stairs', px, py, 0);
        else if (e.type === 'healer')  drawTile(ctx, 'healer', px, py, 0);
        else if (e.type === 'trap')    { /* hidden */ }
        else if (e.type === 'monster') {
          const mt = e.mtype === 'Goblin'   ? 'goblin'
                   : e.mtype === 'Squelette' ? 'skeleton'
                   : 'slime';
          drawSprite(ctx, mt, px, py, animFrame, e.dir || 'right');
          // HP bar de vie
          ctx.fillStyle = '#333';
          ctx.fillRect(px, py, TW, 3);
          ctx.fillStyle = '#e74c3c';
          ctx.fillRect(px, py, Math.floor(TW * e.hp / e.maxHp), 3);
        }
      }
    }
  }

  // joueur
  drawSprite(ctx, 'player', player.x * TW, player.y * TW, animFrame, player.dir);

  ctx.restore();
}
