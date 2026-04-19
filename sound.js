// ─────────────────────────────────────────
//  sound.js  —  Moteur audio procédural
//  Tous les sons sont générés via Web Audio API
//  (aucun fichier audio externe requis)
// ─────────────────────────────────────────

let audioCtx = null;
let bgmGain  = null;
let sfxGain  = null;
let bgmNode  = null;   // nœud de musique de fond en cours
let soundEnabled = true;

// Initialise le contexte audio (doit être appelé après un geste utilisateur)
function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Gain global pour la musique de fond
  bgmGain = audioCtx.createGain();
  bgmGain.gain.value = 0.18;
  bgmGain.connect(audioCtx.destination);

  // Gain global pour les effets sonores
  sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 0.55;
  sfxGain.connect(audioCtx.destination);

  startBGM();
}

function setSoundEnabled(val) {
  soundEnabled = val;
  if (!audioCtx) return;
  bgmGain.gain.value = val ? 0.18 : 0;
  sfxGain.gain.value = val ? 0.55 : 0;
}

// ── Utilitaires bas niveau ───────────────

function playTone(freq, type, duration, gainVal, destination, delay = 0, rampDown = true) {
  if (!audioCtx) return null;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
  gain.gain.setValueAtTime(gainVal, audioCtx.currentTime + delay);
  if (rampDown) gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration + 0.01);
  return { osc, gain };
}

function playNoise(duration, gainVal, destination, delay = 0, filterFreq = 2000) {
  if (!audioCtx) return;
  const bufSize = audioCtx.sampleRate * duration;
  const buffer  = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data    = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src    = audioCtx.createBufferSource();
  src.buffer   = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type  = 'bandpass';
  filter.frequency.value = filterFreq;

  const gain   = audioCtx.createGain();
  gain.gain.setValueAtTime(gainVal, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  src.start(audioCtx.currentTime + delay);
}

// ── Effets sonores ───────────────────────

// Coup d'épée / attaque
function sfxAttack() {
  if (!audioCtx || !soundEnabled) return;
  playNoise(0.08, 0.6, sfxGain, 0, 1800);
  playTone(180, 'sawtooth', 0.12, 0.3, sfxGain, 0);
}

// Mort d'ennemi
function sfxEnemyDie() {
  if (!audioCtx || !soundEnabled) return;
  playTone(440, 'square',   0.05, 0.4, sfxGain, 0.00);
  playTone(330, 'square',   0.05, 0.4, sfxGain, 0.06);
  playTone(220, 'sawtooth', 0.12, 0.4, sfxGain, 0.12);
  playNoise(0.15, 0.3, sfxGain, 0.12, 600);
}

// Dégâts reçus
function sfxHurt() {
  if (!audioCtx || !soundEnabled) return;
  playTone(150, 'sawtooth', 0.1, 0.5, sfxGain);
  playNoise(0.1, 0.4, sfxGain, 0, 400);
}

// Coffre ouvert
function sfxChest() {
  if (!audioCtx || !soundEnabled) return;
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'triangle', 0.18, 0.35, sfxGain, i * 0.07));
}

// Soin / fontaine
function sfxHeal() {
  if (!audioCtx || !soundEnabled) return;
  [392, 494, 587, 784].forEach((f, i) => playTone(f, 'sine', 0.2, 0.3, sfxGain, i * 0.06));
}

// Piège
function sfxTrap() {
  if (!audioCtx || !soundEnabled) return;
  playNoise(0.2, 0.7, sfxGain, 0, 300);
  playTone(100, 'sawtooth', 0.3, 0.5, sfxGain, 0);
}

// Level up 🎉
function sfxLevelUp() {
  if (!audioCtx || !soundEnabled) return;
  const melody = [523, 659, 784, 1047, 784, 1047, 1319];
  melody.forEach((f, i) => playTone(f, 'square', 0.18, 0.4, sfxGain, i * 0.09));
  // shimmer
  [2093, 2637].forEach((f, i) => playTone(f, 'sine', 0.22, 0.2, sfxGain, 0.55 + i * 0.08));
}

// Changement d'étage / nouveau donjon
function sfxNewFloor() {
  if (!audioCtx || !soundEnabled) return;
  // Descente mystérieuse
  [800, 600, 400, 250].forEach((f, i) => playTone(f, 'sine', 0.25, 0.35, sfxGain, i * 0.1));
  playNoise(0.4, 0.2, sfxGain, 0.1, 200);
}

// Game over ☠
function sfxGameOver() {
  if (!audioCtx || !soundEnabled) return;
  stopBGM();
  // Mélodie descendante dramatique
  const notes = [440, 370, 330, 220, 185, 147, 110];
  notes.forEach((f, i) => {
    playTone(f, 'sawtooth', 0.35, 0.45, sfxGain, i * 0.18);
    playTone(f / 2, 'square', 0.35, 0.25, sfxGain, i * 0.18);
  });
  playNoise(0.6, 0.5, sfxGain, 1.0, 150);
}

// Repos
function sfxRest() {
  if (!audioCtx || !soundEnabled) return;
  [330, 392, 494].forEach((f, i) => playTone(f, 'sine', 0.25, 0.25, sfxGain, i * 0.1));
}

// Pas / mouvement (léger)
function sfxStep() {
  if (!audioCtx || !soundEnabled) return;
  playNoise(0.04, 0.08, sfxGain, 0, 3000);
}

// ── Musique de fond procédurale ──────────

// Notes de la gamme pentatonique mineure pour l'ambiance donjon
const BGM_SCALE  = [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23];
const BGM_BASS   = [65.41, 77.78, 87.31, 98.00];
let bgmInterval  = null;
let bgmStep      = 0;
let bgmRunning   = false;

function startBGM() {
  if (bgmRunning || !audioCtx || !soundEnabled) return;
  bgmRunning = true;
  bgmStep    = 0;
  scheduleBGM();
}

function stopBGM() {
  bgmRunning = false;
  if (bgmInterval) { clearTimeout(bgmInterval); bgmInterval = null; }
}

function scheduleBGM() {
  if (!bgmRunning || !audioCtx) return;

  const beat = 420; // ms par temps

  // Mélodie ambient aléatoire sur la gamme
  const notesPerBar = 8;
  const bar = [];
  for (let i = 0; i < notesPerBar; i++) {
    const rest    = Math.random() < 0.30;
    const noteIdx = Math.floor(Math.random() * BGM_SCALE.length);
    const oct     = Math.random() < 0.3 ? 2 : 1;
    bar.push(rest ? null : BGM_SCALE[noteIdx] * oct);
  }

  // Basse rythmique (toutes les 2 temps)
  const bassNote = BGM_BASS[Math.floor(Math.random() * BGM_BASS.length)];

  bar.forEach((freq, i) => {
    if (!freq) return;
    const t = (i * beat) / 1000;
    playTone(freq, 'triangle', 0.28, 0.15, bgmGain, t);
  });

  // Basse
  [0, 0.5, 1].forEach(mult => {
    playTone(bassNote, 'sine', 0.35, 0.18, bgmGain, mult * ((beat * 2) / 1000));
  });

  // Drone ambiant (pédale basse continue)
  playTone(BGM_BASS[0], 'sine', (beat * notesPerBar) / 1000, 0.08, bgmGain, 0, false);

  bgmInterval = setTimeout(scheduleBGM, beat * notesPerBar);
}

// ── Contrôle son depuis l'UI ─────────────

function toggleSound() {
  soundEnabled = !soundEnabled;
  if (!audioCtx && soundEnabled) initAudio();
  else if (audioCtx) setSoundEnabled(soundEnabled);

  const btn = document.getElementById('btn-sound');
  if (btn) btn.textContent = soundEnabled ? '🔊 Son [M]' : '🔇 Muet [M]';

  if (soundEnabled && audioCtx && !bgmRunning) startBGM();
  if (!soundEnabled) stopBGM();
}
