// ─────────────────────────────────────────
//  controls.js  —  Clavier, boutons, joystick tactile
//  Dépend de : game.js, ui.js, sound.js, render.js
// ─────────────────────────────────────────

// ── Clavier ─────────────────────────────

const MOVE_KEYS = {
  arrowup: [0, -1], z: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], q: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0]
};

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'm') { toggleSound(); return; }

  if (isOverlayOpen()) {
    if (overlayKey(e)) e.preventDefault();
    return; // Entrée / Espace activent le bouton sélectionné
  }
  if (gameState !== 'playing') return;
  resumeAudio();

  if (MOVE_KEYS[k]) { e.preventDefault(); tryMove(...MOVE_KEYS[k]); return; }
  switch (k) {
    case ' ':      e.preventDefault(); attackAdjacent(); break;
    case 'h':
    case 'p':      drinkPotion(); break;
    case 'r':      rest(); break;
    case '.':      waitTurn(); break;
    case 'c':      showMinimap = !showMinimap; break;
    case 'escape': showPauseMenu(); break;
  }
});

// ── Boutons (PC et mobile) ──────────────

function bindButton(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', () => { resumeAudio(); fn(); el.blur(); });
}

bindButton('btn-att',    attackAdjacent);
bindButton('btn-potion', drinkPotion);
bindButton('btn-rest',   rest);
bindButton('btn-wait',   waitTurn);
bindButton('btn-menu',   showPauseMenu);
bindButton('btn-sound',  toggleSound);
bindButton('btn-map',    () => { showMinimap = !showMinimap; });

// D-pad : maintenir le bouton répète le déplacement
function holdRepeat(el, action) {
  let timer = null;
  const start = e => {
    e.preventDefault();
    resumeAudio();
    action();
    el.classList.add('pressed');
    clearInterval(timer);
    timer = setInterval(action, 170);
  };
  const stop = () => { clearInterval(timer); timer = null; el.classList.remove('pressed'); };
  el.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, stop));
}

holdRepeat(document.getElementById('du'), () => tryMove(0, -1));
holdRepeat(document.getElementById('dd'), () => tryMove(0,  1));
holdRepeat(document.getElementById('dl'), () => tryMove(-1, 0));
holdRepeat(document.getElementById('dr'), () => tryMove( 1, 0));

// Boutons ronds mobiles
[['mobile-attack', attackAdjacent], ['mobile-potion', drinkPotion], ['mobile-rest', rest], ['mobile-menu', showPauseMenu]]
  .forEach(([id, fn]) => {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      resumeAudio();
      fn();
      el.classList.add('pressed');
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, () => el.classList.remove('pressed')));
  });

// ── Joystick tactile ────────────────────

(function () {
  const DEAD_ZONE  = 18;
  const MOVE_DELAY = 170;
  const base = document.getElementById('joystick-base');
  const knob = document.getElementById('joystick-knob');

  let pointerId = null, originX = 0, originY = 0, timer = null, lastDir = null;

  const getDir = (dx, dy) => {
    if (Math.abs(dx) < DEAD_ZONE && Math.abs(dy) < DEAD_ZONE) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'r' : 'l';
    return dy > 0 ? 'd' : 'u';
  };
  const VEC = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
  const move = () => { if (lastDir) tryMove(...VEC[lastDir]); };

  function setDir(dir) {
    if (dir === lastDir) return;
    lastDir = dir;
    clearInterval(timer);
    timer = null;
    if (dir) { move(); timer = setInterval(move, MOVE_DELAY); }
  }

  function updateKnob(dx, dy) {
    const max = 38;
    const dist = Math.min(Math.hypot(dx, dy), max);
    const a = Math.atan2(dy, dx);
    knob.style.transform = `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist}px))`;
  }

  function release() {
    pointerId = null;
    setDir(null);
    knob.style.transform = 'translate(-50%, -50%)';
  }

  base.addEventListener('pointerdown', e => {
    e.preventDefault();
    resumeAudio();
    pointerId = e.pointerId;
    base.setPointerCapture(e.pointerId);
    const r = base.getBoundingClientRect();
    originX = r.left + r.width / 2;
    originY = r.top + r.height / 2;
  });
  base.addEventListener('pointermove', e => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - originX, dy = e.clientY - originY;
    updateKnob(dx, dy);
    setDir(getDir(dx, dy));
  });
  base.addEventListener('pointerup', release);
  base.addEventListener('pointercancel', release);
})();

// ── Affichage PC / mobile ───────────────

const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)');
function applyControlLayout() {
  document.body.classList.toggle('touch', touchQuery.matches);
}
applyControlLayout();
touchQuery.addEventListener('change', applyControlLayout);

// Évite le zoom par double-tap pendant le jeu
document.addEventListener('dblclick', e => e.preventDefault());
