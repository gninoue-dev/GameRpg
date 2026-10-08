// ─────────────────────────────────────────
//  render.js  —  Rendu : caméra, éclairage, effets, mini-carte
//  Dépend de : sprites.js, map.js
// ─────────────────────────────────────────

const canvas = document.getElementById('gc');
const ctx    = canvas.getContext('2d');
const VIEW_W = canvas.width;
const VIEW_H = canvas.height;

const camera = { x: 0, y: 0 };
let shake       = 0;
let floatTexts  = [];
let sparks      = [];
let showMinimap = true;

// ── Effets ──────────────────────────────

function floatText(x, y, text, color, big = false) {
  // Décale vers le haut si un autre texte récent occupe déjà la case
  const px = (x + 0.5) * TW;
  const stacked = floatTexts.filter(t => t.x === px && t.life > 0.75).length;
  floatTexts.push({ x: px, y: y * TW + 4 - stacked * 13, text, color, life: 1, big });
}

function spawnSparks(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 1.8;
    sparks.push({ x: (x + 0.5) * TW, y: (y + 0.5) * TW, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, life: 1, color });
  }
}

function addShake(amount) { shake = Math.max(shake, amount); }

function updateEffects(dt) {
  const k = dt / 16.67;
  for (const t of floatTexts) { t.y -= 0.45 * k; t.life -= 0.016 * k; }
  floatTexts = floatTexts.filter(t => t.life > 0);
  for (const s of sparks) { s.x += s.vx * k; s.y += s.vy * k; s.vy += 0.08 * k; s.life -= 0.035 * k; }
  sparks = sparks.filter(s => s.life > 0);
  shake = Math.max(0, shake - 0.5 * k);

  // Glissement des entités vers leur case (mouvement fluide)
  const f = Math.min(1, dt / 70);
  for (const e of [player, ...entities]) {
    e.rx += (e.x - e.rx) * f;
    e.ry += (e.y - e.ry) * f;
    if (e.bump) { e.bump.t -= dt / 160; if (e.bump.t <= 0) e.bump = null; }
    if (e.flash) e.flash = Math.max(0, e.flash - dt / 300);
  }

  // Caméra centrée sur le joueur, bornée aux limites de la carte
  const tx = Math.max(0, Math.min(COLS * TW - VIEW_W, (player.rx + 0.5) * TW - VIEW_W / 2));
  const ty = Math.max(0, Math.min(ROWS * TW - VIEW_H, (player.ry + 0.5) * TW - VIEW_H / 2));
  camera.x += (tx - camera.x) * Math.min(1, dt / 90);
  camera.y += (ty - camera.y) * Math.min(1, dt / 90);
}

function snapCamera() {
  camera.x = Math.max(0, Math.min(COLS * TW - VIEW_W, (player.x + 0.5) * TW - VIEW_W / 2));
  camera.y = Math.max(0, Math.min(ROWS * TW - VIEW_H, (player.y + 0.5) * TW - VIEW_H / 2));
}

// ── Rendu principal ─────────────────────

function render(animFrame) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (!grid.length) return;

  ctx.save();
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;
  ctx.translate(Math.round(-camera.x + sx), Math.round(-camera.y + sy));

  const x0 = Math.max(0, Math.floor(camera.x / TW) - 1), x1 = Math.min(COLS - 1, Math.ceil((camera.x + VIEW_W) / TW) + 1);
  const y0 = Math.max(0, Math.floor(camera.y / TW) - 1), y1 = Math.min(ROWS - 1, Math.ceil((camera.y + VIEW_H) / TW) + 1);

  // Tuiles
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!explored[y][x]) continue;
      drawTile(ctx, grid[y][x] === 0 ? 'wall' : 'floor', x * TW, y * TW, variantMap[y][x]);
    }

  // Torches (avec halo lumineux)
  for (const t of torchPositions) {
    if (!explored[t.y][t.x]) continue;
    drawTile(ctx, 'torch', t.x * TW, t.y * TW, 0);
    const g = ctx.createRadialGradient((t.x + 0.5) * TW, (t.y + 0.5) * TW, 2, (t.x + 0.5) * TW, (t.y + 0.5) * TW, TW * 2.2);
    g.addColorStop(0, 'rgba(255,150,40,0.20)');
    g.addColorStop(1, 'rgba(255,150,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect((t.x - 2) * TW, (t.y - 2) * TW, TW * 5, TW * 5);
  }

  // Objets fixes : visibles s'ils ont déjà été découverts
  for (const e of entities) {
    if (e.type === 'monster' || !explored[e.y][e.x]) continue;
    if (e.type === 'trap' && !e.revealed) continue;
    const px = e.x * TW, py = e.y * TW;
    if (e.type === 'merchant') drawSprite(ctx, 'merchant', px, py, animFrame, 'right');
    else if (e.type === 'stairs') drawTile(ctx, e.locked ? 'stairsLocked' : 'stairs', px, py, 0);
    else drawTile(ctx, e.type, px, py, 0);
  }

  // Brouillard : assombrit les cases découvertes mais hors de vue
  ctx.fillStyle = 'rgba(5,5,10,0.55)';
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (explored[y][x] && !visible[y][x]) ctx.fillRect(x * TW, y * TW, TW, TW);

  // Monstres (seulement dans le champ de vision)
  for (const e of entities) {
    if (e.type !== 'monster' || !isVisible(e.x, e.y)) continue;
    if (e.flash && Math.floor(e.flash * 10) % 2 === 1) continue; // clignote quand touché
    const off = bumpOffset(e);
    const px = e.rx * TW + off.x, py = e.ry * TW + off.y;
    if (e.boss) {
      const g = ctx.createRadialGradient(px + TW / 2, py + TW / 2, 2, px + TW / 2, py + TW / 2, TW * 1.3);
      g.addColorStop(0, e.key === 'lich' ? 'rgba(124,77,255,0.35)' : 'rgba(46,204,113,0.3)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - TW, py - TW, TW * 3, TW * 3);
    }
    drawSprite(ctx, e.sprite, px, py, animFrame, e.dir || 'left');
    if (!e.boss) {
      ctx.fillStyle = '#333';
      ctx.fillRect(px + 2, py - 2, TW - 4, 3);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#e74c3c' : '#ff7043';
      ctx.fillRect(px + 2, py - 2, Math.ceil((TW - 4) * e.hp / e.maxHp), 3);
    }
    if (e.awake === false) {
      ctx.fillStyle = 'rgba(200,200,255,0.8)';
      ctx.font = 'bold 9px Courier New';
      ctx.fillText('z', px + TW - 6, py + 6 - (animFrame % 4));
    }
  }

  // Joueur
  if (!(player.flash && Math.floor(player.flash * 10) % 2 === 1)) {
    const off = bumpOffset(player);
    drawSprite(ctx, 'player', player.rx * TW + off.x, player.ry * TW + off.y, animFrame, player.dir);
  }

  // Étincelles et textes flottants
  for (const s of sparks) {
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.fillStyle = s.color;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const t of floatTexts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, t.life * 1.5));
    ctx.font = (t.big ? 'bold 15px' : 'bold 12px') + ' Courier New';
    ctx.fillStyle = '#000';
    ctx.fillText(t.text, t.x + 1, t.y + 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.restore();

  drawLighting();
  drawBossBar();
  if (showMinimap) drawMinimap();
}

function bumpOffset(e) {
  if (!e.bump) return { x: 0, y: 0 };
  const k = Math.sin(e.bump.t * Math.PI) * TW * 0.3;
  return { x: e.bump.dx * k, y: e.bump.dy * k };
}

// Vignette de lumière autour du joueur
function drawLighting() {
  const cx = (player.rx + 0.5) * TW - camera.x;
  const cy = (player.ry + 0.5) * TW - camera.y;
  const flicker = Math.sin(performance.now() / 180) * 4;
  const g = ctx.createRadialGradient(cx, cy, TW * 3, cx, cy, TW * (VIEW_RADIUS + 3) + flicker);
  g.addColorStop(0, 'rgba(255,200,120,0.04)');
  g.addColorStop(0.4, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawBossBar() {
  const boss = entities.find(e => e.type === 'monster' && e.boss && e.awake);
  if (!boss) return;
  const w = 260, x = (VIEW_W - w) / 2, y = 10;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - 6, y - 4, w + 12, 28);
  ctx.fillStyle = '#f1c40f';
  ctx.font = 'bold 11px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('☠ ' + boss.name.toUpperCase() + ' ☠', VIEW_W / 2, y + 7);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y + 12, w, 7);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(x, y + 12, Math.ceil(w * boss.hp / boss.maxHp), 7);
  ctx.strokeStyle = '#555';
  ctx.strokeRect(x + 0.5, y + 12.5, w - 1, 6);
}

function drawMinimap() {
  const s = 3;
  const w = COLS * s, h = ROWS * s;
  const ox = VIEW_W - w - 8, oy = VIEW_H - h - 8;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(ox - 3, oy - 3, w + 6, h + 6);
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (!explored[y][x] || grid[y][x] === 0) continue;
      ctx.fillStyle = visible[y][x] ? 'rgba(180,180,220,0.55)' : 'rgba(120,120,160,0.35)';
      ctx.fillRect(ox + x * s, oy + y * s, s, s);
    }
  for (const e of entities) {
    if (!explored[e.y][e.x]) continue;
    let c = null;
    if (e.type === 'stairs') c = e.locked ? '#e74c3c' : '#b388ff';
    else if (e.type === 'merchant') c = '#3ad1ff';
    else if (e.type === 'healer') c = '#2ecc71';
    else if (e.type === 'chest') c = '#f1c40f';
    else if (e.type === 'monster' && visible[e.y][e.x]) c = '#ff5252';
    if (c) { ctx.fillStyle = c; ctx.fillRect(ox + e.x * s, oy + e.y * s, s, s); }
  }
  ctx.fillStyle = performance.now() % 600 < 300 ? '#fff' : '#63b3ed';
  ctx.fillRect(ox + player.x * s - 1, oy + player.y * s - 1, s + 2, s + 2);
}
