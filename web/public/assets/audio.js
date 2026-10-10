// Original generative soundtrack and sound effects, synthesised live with the Web Audio API.
// Nothing is sampled or recorded, so there is no copyright to clear.
// Mood: a tranquil river at night with something wrong underneath. D Aeolian bells over a low drone,
// running water, and now and then a slow minor-second swell.

let ctx = null, master = null, musicBus = null, sfxBus = null, wet = null;
let musicOn = true, sfxOn = true, started = false, timers = [];

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
const BELLS = [62, 65, 67, 69, 72, 74, 77, 70, 81];   // D4 F4 G4 A4 C5 D5 F5 Bb4 A5
const SWELLS = [[57, 58], [62, 63], [50, 51], [69, 70]];

function prefs() {
  try {
    const p = JSON.parse(localStorage.getItem("nb-audio") || "{}");
    if (typeof p.music === "boolean") musicOn = p.music;
    if (typeof p.sfx === "boolean") sfxOn = p.sfx;
  } catch { /* storage blocked */ }
}
function save() {
  try { localStorage.setItem("nb-audio", JSON.stringify({ music: musicOn, sfx: sfxOn })); } catch { /* ignore */ }
}
prefs();

function impulse(seconds, decay) {
  const len = ctx.sampleRate * seconds, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}
function noiseBuffer(seconds, brown) {
  const len = ctx.sampleRate * seconds, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return buf;
}

function init() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  const verb = ctx.createConvolver();
  verb.buffer = impulse(5, 2.6);
  wet = ctx.createGain();
  wet.gain.value = 0.55;
  wet.connect(verb).connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = musicOn ? 1 : 0;
  musicBus.connect(master);
  musicBus.connect(wet);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = sfxOn ? 0.8 : 0;
  sfxBus.connect(master);
  sfxBus.connect(wet);
}

// ---------------------------------------------------------------- music layers
function drone() {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, ctx.currentTime);
  out.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 8);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 320;
  lp.Q.value = 4;
  const lfo = ctx.createOscillator(), lfoAmt = ctx.createGain();
  lfo.frequency.value = 0.045;
  lfoAmt.gain.value = 160;
  lfo.connect(lfoAmt).connect(lp.frequency);
  lfo.start();
  [[38, 0], [38, 7], [45, -5], [50, 3]].forEach(([n, cents], i) => {
    const o = ctx.createOscillator();
    o.type = i < 2 ? "sawtooth" : "triangle";
    o.frequency.value = NOTE(n);
    o.detune.value = cents;
    const g = ctx.createGain();
    g.gain.value = i < 2 ? 0.35 : 0.5;
    o.connect(g).connect(lp);
    o.start();
  });
  lp.connect(out).connect(musicBus);
}

function river() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(6, true);
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 420;
  bp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.value = 0.11;
  const lfo = ctx.createOscillator(), amt = ctx.createGain();
  lfo.frequency.value = 0.11;
  amt.gain.value = 0.05;
  lfo.connect(amt).connect(g.gain);
  lfo.start();
  src.connect(bp).connect(g).connect(musicBus);
  src.start();
}

function bell(freq, when, vol = 0.08, bus = musicBus, length = 5) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + length);
  [[1, 1], [2.76, 0.35], [5.4, 0.12], [0.5, 0.25]].forEach(([ratio, amp]) => {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq * ratio;
    og.gain.value = amp;
    o.connect(og).connect(g);
    o.start(when);
    o.stop(when + length + 0.1);
  });
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan) { pan.pan.value = Math.random() * 1.2 - 0.6; g.connect(pan).connect(bus); } else g.connect(bus);
}

function phrase() {
  const t = ctx.currentTime + 0.1;
  const count = 1 + Math.floor(Math.random() * 3);
  let idx = Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    idx = Math.max(0, Math.min(BELLS.length - 1, idx + Math.floor(Math.random() * 5) - 2));
    bell(NOTE(BELLS[idx]), t + i * (0.6 + Math.random() * 0.9), 0.05 + Math.random() * 0.04);
  }
  timers.push(setTimeout(phrase, 3500 + Math.random() * 5500));
}

function swell() {
  const [a, b] = SWELLS[Math.floor(Math.random() * SWELLS.length)];
  const t = ctx.currentTime + 0.1, dur = 9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.035, t + 4.5);
  g.gain.linearRampToValueAtTime(0, t + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(400, t);
  lp.frequency.linearRampToValueAtTime(1400, t + 4.5);
  lp.frequency.linearRampToValueAtTime(300, t + dur);
  for (const n of [a, b]) {
    for (const det of [-8, 8]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = NOTE(n);
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.2);
    }
  }
  lp.connect(g).connect(musicBus);
  timers.push(setTimeout(swell, 22000 + Math.random() * 26000));
}

function whisper() {
  // a breath of filtered noise sweeping past, like wind through reeds
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(4, false);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 9;
  const t = ctx.currentTime;
  bp.frequency.setValueAtTime(600 + Math.random() * 400, t);
  bp.frequency.exponentialRampToValueAtTime(2400 + Math.random() * 1200, t + 3.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.05, t + 1.6);
  g.gain.linearRampToValueAtTime(0, t + 3.8);
  src.connect(bp).connect(g).connect(musicBus);
  src.start();
  timers.push(setTimeout(whisper, 30000 + Math.random() * 40000));
}

export function start() {
  init();
  if (ctx.state === "suspended") ctx.resume();
  if (started) return;
  started = true;
  drone();
  river();
  timers.push(setTimeout(phrase, 2500));
  timers.push(setTimeout(swell, 15000));
  timers.push(setTimeout(whisper, 26000));
}

export const isMusicOn = () => musicOn;
export const isSfxOn = () => sfxOn;
export function setMusic(on) {
  musicOn = on;
  save();
  if (on) start();
  if (musicBus) musicBus.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.6);
}
export function setSfx(on) {
  sfxOn = on;
  save();
  if (on) init();
  if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.1);
}

// ---------------------------------------------------------------- sound effects
function thump(freq, vol, dur) {
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function hiss(freq, q, vol, dur, sweepTo) {
  const t = ctx.currentTime, src = ctx.createBufferSource();
  src.buffer = noiseBuffer(dur + 0.2, false);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(freq, t);
  if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(bp).connect(g).connect(sfxBus);
  src.start(t);
}

export function sfx(kind) {
  if (!ctx || !sfxOn) return;
  const t = ctx.currentTime;
  switch (kind) {
    case "root": thump(140, 0.25, 0.25); break;
    case "bloom": bell(NOTE(74), t, 0.07, sfxBus, 2.5); bell(NOTE(81), t + 0.12, 0.05, sfxBus, 2.5); break;
    case "card": hiss(3000, 1.2, 0.05, 0.25, 1200); break;
    case "resonance": [62, 69, 74, 77].forEach((n, i) => bell(NOTE(n), t + i * 0.09, 0.06, sfxBus, 3)); break;
    case "flood": hiss(300, 0.8, 0.25, 1.6, 120); thump(60, 0.3, 1.2); break;
    case "drain": hiss(200, 0.8, 0.12, 1.2, 900); break;
    case "grievance": bell(NOTE(63), t, 0.06, sfxBus, 3); bell(NOTE(64), t, 0.05, sfxBus, 3); hiss(900, 6, 0.06, 1.4, 300); break;
    case "fracture": thump(90, 0.6, 0.9); hiss(2400, 2, 0.18, 0.5, 600); bell(NOTE(49), t, 0.06, sfxBus, 2); bell(NOTE(50), t, 0.06, sfxBus, 2); break;
    case "backlash": thump(55, 0.7, 1.6); hiss(150, 0.5, 0.25, 1.8, 60); break;
    case "mist": hiss(500, 1.5, 0.12, 2.2, 1800); break;
    case "move": bell(NOTE(69), t, 0.05, sfxBus, 3); bell(NOTE(76), t + 0.3, 0.04, sfxBus, 3); break;
    case "linger": bell(NOTE(57), t, 0.05, sfxBus, 4); bell(NOTE(58), t + 0.4, 0.04, sfxBus, 4); break;
    case "forget": hiss(1800, 3, 0.07, 1.1, 400); break;
    case "inscribe": [74, 77, 81, 86].forEach((n, i) => bell(NOTE(n), t + i * 0.16, 0.05, sfxBus, 3.5)); break;
    case "summon": [50, 57, 62, 69].forEach((n, i) => bell(NOTE(n), t + i * 0.11, 0.06, sfxBus, 4)); break;
    case "turn": bell(NOTE(81), t, 0.035, sfxBus, 2.5); break;
    case "win": [62, 66, 69, 74, 78, 81].forEach((n, i) => bell(NOTE(n), t + i * 0.25, 0.07, sfxBus, 6)); break;
    case "loss": [62, 61, 58, 57, 50].forEach((n, i) => bell(NOTE(n), t + i * 0.45, 0.07, sfxBus, 6)); thump(45, 0.5, 3); break;
  }
}
