// ─────────────────────────────────────────
//  sprites.js  —  Pixel-art sprite drawers
// ─────────────────────────────────────────

const TW = 28; // tile width/height in pixels

/**
 * Dispatch sprite drawing based on type.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} type  'player'|'goblin'|'skeleton'|'slime'
 * @param {number} px    pixel x (top-left of tile)
 * @param {number} py    pixel y
 * @param {number} frame animation frame counter
 * @param {string} dir   'left'|'right'
 */
function drawSprite(ctx, type, px, py, frame, dir) {
  const w = TW, h = TW;
  ctx.save();
  ctx.translate(px + w / 2, py + h / 2);
  if (dir === 'left') ctx.scale(-1, 1);
  ctx.translate(-w / 2, -h / 2);

  if      (type === 'player')   drawPlayer(ctx, frame);
  else if (type === 'goblin')   drawGoblin(ctx, frame);
  else if (type === 'skeleton') drawSkeleton(ctx, frame);
  else if (type === 'slime')    drawSlime(ctx, frame);

  ctx.restore();
}

// ── Player ──────────────────────────────
function drawPlayer(ctx, f) {
  const bob     = f % 2 === 0 ? 0 : 1;
  const legOff  = f % 4 < 2   ? 0 : 2;

  // cape
  ctx.fillStyle = '#8b0000';
  ctx.fillRect(9, 14 + bob, 10, 10);
  // body armor
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(8, 13 + bob, 12, 9);
  // armor highlight
  ctx.fillStyle = '#718096';
  ctx.fillRect(9, 14 + bob, 5, 4);
  // arms
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(5,  14 + bob, 4, 6);
  ctx.fillRect(19, 14 + bob, 4, 6);
  // sword blade
  ctx.fillStyle = '#b0bec5';
  ctx.fillRect(22, 8 + bob, 2, 12);
  // sword guard
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(20, 14 + bob, 6, 2);
  // head / skin
  ctx.fillStyle = '#c9a96e';
  ctx.fillRect(9, 6, 10, 9);
  // helmet
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(8, 4, 12, 7);
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(9, 5, 10, 5);
  // visor slit
  ctx.fillStyle = '#63b3ed';
  ctx.fillRect(10, 7, 3, 2);
  ctx.fillRect(15, 7, 3, 2);
  // legs
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(9,  22 + bob, 4, 5);
  ctx.fillRect(15, 22 + bob, 4, 5);
  // boots
  ctx.fillStyle = '#5c3d1e';
  ctx.fillRect(8,  25 + bob + legOff,  5, 3);
  ctx.fillRect(15, 25 + bob - legOff,  5, 3);
}

// ── Goblin ──────────────────────────────
function drawGoblin(ctx, f) {
  const bob = f % 2 === 0 ? 0 : 1;

  ctx.fillStyle = '#2d6a2d';
  ctx.fillRect(8, 14 + bob, 12, 10);
  ctx.fillStyle = '#3d8c3d';
  ctx.fillRect(7, 6, 14, 10);
  // ears
  ctx.fillStyle = '#2d6a2d';
  ctx.fillRect(4,  8, 4, 4);
  ctx.fillRect(20, 8, 4, 4);
  // eyes
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(9,  9, 3, 3);
  ctx.fillRect(16, 9, 3, 3);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(10, 10, 1, 1);
  ctx.fillRect(17, 10, 1, 1);
  // teeth
  ctx.fillStyle = '#f0e68c';
  ctx.fillRect(10, 14, 2, 3);
  ctx.fillRect(14, 14, 2, 3);
  // dagger
  ctx.fillStyle = '#aaa';
  ctx.fillRect(21, 12 + bob, 2, 8);
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(20, 18 + bob, 4, 2);
  // legs
  ctx.fillStyle = '#1a4d1a';
  ctx.fillRect(9,  23 + bob, 4, 5);
  ctx.fillRect(15, 23 + bob, 4, 5);
}

// ── Skeleton ────────────────────────────
function drawSkeleton(ctx, f) {
  const bob = f % 2 === 0 ? 0 : 1;

  // ribs
  ctx.fillStyle = '#ddd';
  for (let i = 0; i < 3; i++) ctx.fillRect(9, 14 + i * 3 + bob, 10, 2);
  // shoulders
  ctx.fillStyle = '#ccc';
  ctx.fillRect(6,  13 + bob, 5, 3);
  ctx.fillRect(17, 13 + bob, 5, 3);
  // arms
  ctx.fillRect(7,  15 + bob, 3, 7);
  ctx.fillRect(18, 15 + bob, 3, 7);
  // skull
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(8, 4, 12, 12);
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(9,  8,  4, 4);
  ctx.fillRect(15, 8,  4, 4);
  ctx.fillRect(11, 13, 2, 2);
  ctx.fillRect(15, 13, 2, 2);
  // spine
  ctx.fillStyle = '#ccc';
  ctx.fillRect(12, 22 + bob, 4, 6);
  // legs
  ctx.fillStyle = '#bbb';
  ctx.fillRect(9,  22 + bob, 4, 6);
  ctx.fillRect(15, 22 + bob, 4, 6);
  // sword
  ctx.fillStyle = '#999';
  ctx.fillRect(22, 9 + bob, 2, 13);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(20, 15 + bob, 6, 2);
}

// ── Slime ───────────────────────────────
function drawSlime(ctx, f) {
  const bob = f % 4 < 2 ? 0 : 2;
  const w   = f % 4 < 2 ? 14 : 12;
  const off = f % 4 < 2 ? 7  : 8;

  ctx.fillStyle = '#1a7aad';
  ctx.fillRect(off,     14 + bob, w,     12 - bob);
  ctx.fillStyle = '#2196f3';
  ctx.fillRect(off + 2, 13 + bob, w - 4, 10 - bob);
  // shine
  ctx.fillStyle = '#90caf9';
  ctx.fillRect(off + 3, 14 + bob, 4, 3);
  // eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(off + 2, 16 + bob, 3, 3);
  ctx.fillRect(off + 8, 16 + bob, 3, 3);
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(off + 3, 17 + bob, 2, 2);
  ctx.fillRect(off + 9, 17 + bob, 2, 2);
  // drips
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(off,         24 - bob, 3, 2);
  ctx.fillRect(off + w - 3, 24 - bob, 3, 2);
}

// ── Tiles ───────────────────────────────

/**
 * Draw a map tile.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} type  'wall'|'floor'|'torch'|'chest'|'stairs'|'trap'|'healer'
 * @param {number} px    pixel x
 * @param {number} py    pixel y
 * @param {number} variant  0-2 visual variant seed
 */
function drawTile(ctx, type, px, py, variant) {
  const x = px, y = py;

  if (type === 'wall') {
    ctx.fillStyle = '#1c1c28';
    ctx.fillRect(x, y, TW, TW);
    ctx.fillStyle = '#252535';
    ctx.fillRect(x + 1, y + 1, TW - 2, TW - 2);

    const bc = variant === 0 ? '#2e2e42' : '#2a2a3e';
    ctx.fillStyle = bc;
    if ((Math.floor(py / TW) % 2) === 0) {
      ctx.fillRect(x + 2,        y + 4,       TW/2 - 3, TW/2 - 4);
      ctx.fillRect(x + TW/2 + 1, y + 4,       TW/2 - 3, TW/2 - 4);
      ctx.fillRect(x + 2,        y + TW/2 + 2, TW/2 - 3, TW/2 - 4);
      ctx.fillRect(x + TW/2 + 1, y + TW/2 + 2, TW/2 - 3, TW/2 - 4);
    } else {
      ctx.fillRect(x + TW/4, y + 4,       TW/2, TW/2 - 4);
      ctx.fillRect(x + TW/4, y + TW/2 + 2, TW/2, TW/2 - 4);
    }
    ctx.fillStyle = '#3a3a55';
    ctx.fillRect(x, y, TW, 1);
    ctx.fillRect(x, y, 1, TW);

  } else if (type === 'floor') {
    const cols = ['#1e1e2e', '#1a1a2a', '#1c1c2c'];
    ctx.fillStyle = cols[variant % 3];
    ctx.fillRect(x, y, TW, TW);
    ctx.fillStyle = '#141420';
    ctx.fillRect(x, y, TW, 1);
    ctx.fillRect(x, y, 1, TW);
    if (variant === 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(x + 4, y + 4, TW - 8, TW - 8);
    }

  } else if (type === 'torch') {
    ctx.fillStyle = '#2a1a00';
    ctx.fillRect(x + 10, y + 14, 8, 12);
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x + 11, y + 15, 6, 10);
    const flicker = (Date.now() % 400 < 200) ? 0 : 1;
    ctx.fillStyle = '#ff8c00';
    ctx.fillRect(x + 10, y + 8  + flicker, 8, 8);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 12, y + 6  + flicker, 4, 6);
    ctx.fillStyle = '#fff8dc';
    ctx.fillRect(x + 13, y + 5  + flicker, 2, 4);
    ctx.fillStyle = 'rgba(255,140,0,0.08)';
    ctx.fillRect(x - TW, y - TW, TW * 3, TW * 3);

  } else if (type === 'chest') {
    ctx.fillStyle = '#5c3d1e';
    ctx.fillRect(x + 4, y + 12, TW - 8, TW - 14);
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(x + 5, y + 13, TW - 10, 6);
    ctx.fillStyle = '#3d2a0e';
    ctx.fillRect(x + 4, y + 18, TW - 8, 2);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(x + 11, y + 14, 6, 5);
    ctx.fillStyle = '#d4ac0d';
    ctx.fillRect(x + 12, y + 15, 4, 3);
    ctx.fillStyle = '#d4a017';
    [6, TW - 10].forEach(ox => ctx.fillRect(x + ox, y + 13, 3, 3));

  } else if (type === 'stairs') {
    ctx.fillStyle = '#4a3570';
    for (let s = 0; s < 4; s++)
      ctx.fillRect(x + 4 + s * 4, y + TW - 8 - s * 5, TW - 8 - s * 8, 5);
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(x + 12, y + 4, 4, 4);
    ctx.fillStyle = 'rgba(155,89,182,0.15)';
    ctx.fillRect(x, y, TW, TW);

  } else if (type === 'trap') {
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(x, y, TW, TW);
    ctx.fillStyle = '#141420';
    ctx.fillRect(x, y, TW, 1);
    ctx.fillRect(x, y, 1, TW);
    ctx.fillStyle = '#3d1a00';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 6 + i * 6, y + TW - 6, 2, 5);

  } else if (type === 'healer') {
    ctx.fillStyle = '#0d2d1a';
    ctx.fillRect(x + 4, y + 4, TW - 8, TW - 8);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(x + 11, y + 8,  6, TW - 16);
    ctx.fillRect(x + 8,  y + 11, TW - 16, 6);
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(x + 12, y + 9,  4, TW - 18);
    ctx.fillRect(x + 9,  y + 12, TW - 18, 4);
  }
}
