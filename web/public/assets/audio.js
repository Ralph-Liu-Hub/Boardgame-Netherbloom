// Original generative soundtrack and sound effects, synthesised live with the Web Audio API.
// Nothing is sampled or recorded, and every melody is a public-domain lullaby, so there is no copyright to clear.
// Mood: a tranquil river at night, sad but tender. A low drone and running water, wind in the reeds, and
// over them one old lullaby at a time, played softly on a felt piano. Each Soul has the lullaby of the land
// its story comes from; the game itself and the nameless soul have Brahms'. Every melody here is in the
// public domain, transposed to D so it sits on the drone. Between verses there is silence, and now and then a slow swell.

let ctx = null, master = null, musicBus = null, sfxBus = null, wet = null;
let amb = null, lull = null;  // the ambient bed and the lullaby, mixed separately so the Book can bring the song forward
let musicOn = true, sfxOn = true, started = false, timers = [];

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
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
  amb = ctx.createGain();
  amb.connect(musicBus);
  lull = ctx.createGain();
  lull.connect(musicBus);
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
  lp.connect(out).connect(amb);
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
  g.gain.value = 0.085;
  const lfo = ctx.createOscillator(), amt = ctx.createGain();
  lfo.frequency.value = 0.11;
  amt.gain.value = 0.04;
  lfo.connect(amt).connect(g.gain);
  lfo.start();
  src.connect(bp).connect(g).connect(amb);
  src.start();
}

function bell(freq, when, vol = 0.08, bus = amb, length = 5) {
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
  lp.connect(g).connect(amb);
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
  src.connect(bp).connect(g).connect(amb);
  src.start();
  timers.push(setTimeout(whisper, 30000 + Math.random() * 40000));
}

// A felt piano: a soft hammer, a few gently decaying partials and a muffled tone that darkens as it rings.
function piano(freq, when, vol = 0.05, len = 3.2, pan = 0.2, out = amb) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.012);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, when + 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, when + len);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 0.5;
  lp.frequency.setValueAtTime(Math.min(3200, freq * 6), when);
  lp.frequency.exponentialRampToValueAtTime(Math.max(500, freq * 1.5), when + len * 0.6);
  for (const [r, a, det] of [[1, 1, -3], [1, 0.6, 3], [2, 0.32, 0], [3, 0.1, 0], [4.02, 0.04, 0]]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq * r;
    o.detune.value = det;
    og.gain.value = a;
    o.connect(og).connect(lp);
    o.start(when);
    o.stop(when + len + 0.05);
  }
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) { p.pan.value = pan; lp.connect(g).connect(p).connect(out); } else lp.connect(g).connect(out);
}

// A warm pad, like strings or a hummed choir far off: soft detuned tones that swell into each chord

// ---------------------------------------------------------------- the lullabies
// Written as "note/beats" with a quarter note as one beat, "r" for a rest and "|" between bars, in the key of
// the source; `shift` moves each one to D. All five are traditional or long out of copyright.
const LULLABIES = {
  // Brahms, "Wiegenlied", Op. 49 No. 4 (1868): the game's own song, and the nameless soul's.
  open: { title: "Brahms' Lullaby", bpm: 72, shift: -3, tune: `
    A4/.5 A4/.5 | C5/1.5 A4/.5 A4/1 | C5/2 A4/.5 C5/.5 | F5/1 E5/1.5 D5/.5 | D5/1 C5/1 G4/.5 A4/.5 |
    Bb4/1 G4/1 G4/.5 A4/.5 | Bb4/2 G4/.5 Bb4/.5 | E5/.5 D5/.5 C5/1 E5/1 | F5/2 F4/.5 F4/.5 |
    F5/2 D5/.5 Bb4/.5 | C5/2 A4/.5 F4/.5 | Bb4/1 C5/1 D5/1 | C5/2 F4/.5 F4/.5 |
    F5/2 D5/.5 Bb4/.5 | C5/2 A4/.5 F4/.5 | Bb4/1 A4/1 G4/1 | F4/3` },
  // "Schlaf, Kindlein, schlaf" (melody printed 1781, after a folk tune): the cradle song of the north, for the
  // child in the snow. Notation from the Essen folksong collection (Böhme).
  child: { title: "Schlaf, Kindlein, schlaf", bpm: 63, shift: -3, tune: `
    A4/1 G4/.5 G4/.5 | F4/1 r/.5 F4/.25 A4/.25 | C5/.5 C5/.5 Bb4/.5 Bb4/.5 | A4/1 r/.5 A4/.5 |
    Bb4/.5 Bb4/.5 G4/.5 G4/.5 | C5/.5 C5/.5 A4/.5 A4/.5 | Bb4/.5 Bb4/.5 G4/.5 G4/.5 | C5/.5 C5/.5 A4/1 |
    Bb4/1 G4/.5 G4/.5 | F4/2` },
  // "Can Ye Sew Cushions", a Scottish mother's lullaby (Aird's Selection, c. 1782), for the girl who sang to
  // the willow. Slow strain, as Aird prints it.
  garland: { title: "Can Ye Sew Cushions", bpm: 58, shift: -5, tune: `
    G4/.5 | G4/.75 B4/.25 G5/.75 E5/.25 D5/.5 B4/1 r/.25 G4/.25 | G4/.75 B4/.25 G5/.75 E5/.25 D5/1.5 E5/.5 |
    D5/.75 B4/.25 B4/.75 A4/.25 G4/.75 G4/.25 G4/.75 A4/.25 | B4/.75 A4/.25 A4/.75 G4/.25 G4/1.5 G4/.5 |
    G4/.75 B4/.25 G5/.75 E5/.25 D5/.5 B4/1 r/.25 G4/.25 | G4/.75 B4/.25 G5/.75 E5/.25 D5/1.5 E5/.5 |
    D5/.75 B4/.25 B4/.75 A4/.25 G4/.25 G4/.75 G4/.75 A4/.25 | B4/.75 A4/.25 A4/.75 G4/.25 G4/2` },
  // "Ar Hyd y Nos" (All Through the Night), Welsh, first printed 1784: the land the old king's legend came from.
  king: { title: "All Through the Night", bpm: 66, shift: -5, tune: `
    G4/1.5 F#4/.5 E4/1 G4/1 | A4/1.5 G4/.5 F#4/1 D4/1 | E4/1.5 F#4/.5 G4/1 E4/1 | D4/2 r/2 |
    G4/1.5 F#4/.5 E4/1 G4/1 | A4/1.5 G4/.5 F#4/1 D4/1 | E4/1.5 F#4/.5 G4/1 E4/1 | D4/2 r/2 |
    D5/1.5 C5/.5 B4/1 D5/1 | C5/1.5 B4/.5 A4/1 C5/1 | B4/1.5 A4/.5 G4/1 B4/1 | A4/1.5 G4/.5 F#4/1 D4/1 |
    G4/1.5 F#4/.5 E4/1 G4/1 | A4/1.5 G4/.5 F#4/1 D4/1 | E4/1.5 F#4/.5 G4/1 E4/1 | D4/3` },
  // "The Death-Bride", a Greek folk ballad in 7/8 (Essen collection), sung slowly as a lullaby for the bride
  // death kept. Its raised and lowered steps are the old Greek colour.
  bride: { title: "The Death-Bride", bpm: 60, shift: -5, repeat: 2, tune: `
    C5/.5 | C5/2 G4/1 F4/.5 | G4/1 Ab4/.5 B4/1 Ab4/1 | G4/2.5 r/1 |
    G4/1 Ab4/.5 Ab4/.5 F4/1.5 | G4/1 Ab4/.5 B4/.5 Ab4/.5 F4/1 | G4/2.5 r/1 |
    G4/1 Ab4/.5 Ab4/.5 F4/1.5 | G4/1 Ab4/.5 B4/.5 Ab4/.5 F4/1 | G4/3` },
};
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function parseTune(text, shift) {
  return text.trim().split(/[\s|]+/).filter(Boolean).map(tok => {
    const [n, b] = tok.split("/");
    if (n === "r") return [0, +b];
    const m = n.match(/^([A-G])(#|b)?(\d)$/);
    return [12 * (+m[3] + 1) + STEP[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + shift, +b];
  });
}
export const lullabyTitle = soul => (LULLABIES[soul] || LULLABIES.open).title;

let lullSoul = "open", verse = null, verseTimer = 0;

// One verse of the current Soul's lullaby, then a silence (with, now and then, the low swell) before the next.
function playVerse() {
  if (!ctx) return;
  const lb = LULLABIES[lullSoul] || LULLABIES.open, beat = 60 / lb.bpm;
  const notes = parseTune(lb.tune, lb.shift);
  verse = ctx.createGain();
  verse.connect(lull);
  let t = ctx.currentTime + 0.3;
  for (let rep = 0; rep < (lb.repeat || 1); rep++) {
    for (const [n, b] of notes) {
      if (n) piano(NOTE(n), t, 0.055, Math.max(1.8, b * beat * 2.2), 0.12, verse);
      t += b * beat;
    }
    t += beat;
  }
  const len = t - ctx.currentTime;
  const rest = 9 + Math.random() * 8;
  if (Math.random() < 0.45) timers.push(setTimeout(swell, (len + 2) * 1000));
  verseTimer = setTimeout(playVerse, (len + rest) * 1000);
  timers.push(verseTimer);
}

// soul: the Soul whose lullaby should play (null or "open" for the game's own). The verse playing now fades
// out and the new lullaby begins a moment later.
export function lullaby(soul) {
  const want = soul && LULLABIES[soul] ? soul : "open";
  if (want === lullSoul) return;
  lullSoul = want;
  if (!ctx || !started) return;
  clearTimeout(verseTimer);
  if (verse) {
    const old = verse;
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    setTimeout(() => old.disconnect(), 2500);
    verse = null;
  }
  verseTimer = setTimeout(playVerse, 2200);
  timers.push(verseTimer);
}


export function start() {
  init();
  if (ctx.state === "suspended") ctx.resume();
  if (started) return;
  started = true;
  drone();
  river();
  verseTimer = setTimeout(playVerse, 4000);
  timers.push(verseTimer);
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

// ---------------------------------------------------------------- the Souls' themes (played while the Book is open)

// ---------------------------------------------------------------- the Book
// While the Book is open the river and drone sink back and the Soul's lullaby comes forward. There is no
// second melody, so nothing plays against the song.
export function storyTheme(soul) {
  if (!ctx) return;
  const now = ctx.currentTime;
  if (soul) lullaby(soul);
  amb.gain.setTargetAtTime(soul && musicOn ? 0.45 : 1, now, 0.8);
  lull.gain.setTargetAtTime(soul && musicOn ? 1.25 : 1, now, 0.8);
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
    case "chime": bell(NOTE(86), t, 0.025, sfxBus, 3); break;
    case "win": [62, 66, 69, 74, 78, 81].forEach((n, i) => bell(NOTE(n), t + i * 0.25, 0.07, sfxBus, 6)); break;
    case "loss": [62, 61, 58, 57, 50].forEach((n, i) => bell(NOTE(n), t + i * 0.45, 0.07, sfxBus, 6)); thump(45, 0.5, 3); break;
  }
}
