// ─────────────────────────────────────────
//  controls.js  —  Contrôles mobile
//  Joystick tactile + bouton attaque rapide
// ─────────────────────────────────────────

(function () {
  const DEAD_ZONE  = 20;  // pixels minimum avant déclenchement
  const MOVE_DELAY = 160; // ms entre chaque déplacement répété en maintenant

  // ── Joystick virtuel

  const joystickWrap  = document.getElementById('joystick-wrap');
  const joystickBase  = document.getElementById('joystick-base');
  const joystickKnob  = document.getElementById('joystick-knob');
  const mobileAttack  = document.getElementById('mobile-attack');
  const mobileRest    = document.getElementById('mobile-rest');

  if (!joystickWrap) return; // guards: pas dans le DOM

  let touchId     = null;
  let originX     = 0;
  let originY     = 0;
  let moveTimer   = null;
  let lastDir     = null;

  function getDir(dx, dy) {
    if (Math.abs(dx) < DEAD_ZONE && Math.abs(dy) < DEAD_ZONE) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? [1, 0] : [-1, 0];
    return dy > 0 ? [0, 1] : [0, -1];
  }

  function applyDir(dir) {
    if (!dir) return;
    if (typeof initAudio === 'function') initAudio();
    tryMove(dir[0], dir[1]);
  }

  function startRepeat(dir) {
    stopRepeat();
    applyDir(dir);
    moveTimer = setInterval(() => applyDir(lastDir), MOVE_DELAY);
  }

  function stopRepeat() {
    if (moveTimer) { clearInterval(moveTimer); moveTimer = null; }
  }

  function updateKnob(dx, dy) {
    const maxR = 38;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamp = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamp;
    const ky = Math.sin(angle) * clamp;
    joystickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
  }

  function resetKnob() {
    joystickKnob.style.transform = 'translate(-50%, -50%)';
  }

  joystickBase.addEventListener('touchstart', e => {
    e.preventDefault();
    if (touchId !== null) return;
    const t  = e.changedTouches[0];
    touchId  = t.identifier;
    const r  = joystickBase.getBoundingClientRect();
    originX  = r.left + r.width  / 2;
    originY  = r.top  + r.height / 2;
    if (typeof initAudio === 'function') initAudio();
  }, { passive: false });

  joystickBase.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      const dx = t.clientX - originX;
      const dy = t.clientY - originY;
      updateKnob(dx, dy);
      const dir = getDir(dx, dy);
      if (JSON.stringify(dir) !== JSON.stringify(lastDir)) {
        lastDir = dir;
        if (dir) startRepeat(dir);
        else     stopRepeat();
      }
    }
  }, { passive: false });

  joystickBase.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      touchId = null;
      lastDir = null;
      stopRepeat();
      resetKnob();
    }
  });

  joystickBase.addEventListener('touchcancel', e => {
    touchId = null; lastDir = null;
    stopRepeat(); resetKnob();
  });

  //Bouton Attaque mobile

  mobileAttack.addEventListener('touchstart', e => {
    e.preventDefault();
    if (typeof initAudio === 'function') initAudio();
    document.getElementById('btn-att').click();
    mobileAttack.classList.add('pressed');
  }, { passive: false });
  mobileAttack.addEventListener('touchend', () => mobileAttack.classList.remove('pressed'));

  //Bouton Repos mobile

  mobileRest.addEventListener('touchstart', e => {
    e.preventDefault();
    if (typeof initAudio === 'function') initAudio();
    document.getElementById('btn-rest').click();
    mobileRest.classList.add('pressed');
  }, { passive: false });
  mobileRest.addEventListener('touchend', () => mobileRest.classList.remove('pressed'));

  //Cacher les contrôles desktop sur mobile
  function checkMobile() {
    const isMobile = window.innerWidth <= 640 || 'ontouchstart' in window;
    document.getElementById('desktop-controls').style.display = isMobile ? 'none' : 'flex';
    joystickWrap.style.display = isMobile ? 'flex' : 'none';
  }
  checkMobile();
  window.addEventListener('resize', checkMobile);
})();
