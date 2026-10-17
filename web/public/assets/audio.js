// Original generative soundtrack and sound effects, synthesised live with the Web Audio API.
// Nothing is sampled or recorded, and every melody is a public-domain lullaby, so there is no copyright to clear.
// Mood: a river at night, sad but tender, scored like a film: a string section holding slow chords in a hall, a pulse
// of low strings and horns as the crossing grows dangerous, running water and wind in the reeds, and over it all one
// old lullaby at a time on a felt piano. Each Soul has the lullaby of the land its story comes from; the game itself
// and the nameless soul have Brahms'. Every melody here is in the public domain, transposed so it sits on the strings.

let ctx = null, master = null, musicBus = null, sfxBus = null, wet = null;
let amb = null, lull = null;  // the ambient bed and the lullaby, mixed separately so the Book can bring the song forward
let musicOn = true, sfxOn = true, started = false, timers = [];

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);

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
  verb.buffer = impulse(6, 3);
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

// ---------------------------------------------------------------- the score
// An original cinematic score, built in layers the way a film cue is, around the lullabies:
//   a string section holding slow chords (many slightly detuned bowed voices, voiced low in open fifths, in a hall);
//   low strings in a steady ostinato that comes in as the crossing grows dangerous;
//   horns and a deep drum that swell only at the darkest moments;
//   and over it all the felt piano singing the Soul's lullaby, with the river and the wind underneath.
// Every chord stays inside the lullaby's key, so the song never rubs against the strings. Each Reach has its own
// progression, and `mood` sets how many layers play.
const BPM = 60, BEAT = 60 / BPM, BAR = 4 * BEAT, CHORD_BARS = 2;
// Chords as root + intervals above it (MIDI). D major keys for the lullabies; G minor for the bride's Greek song.
const MAJ = [0, 7, 12, 16, 19], MIN = [0, 7, 12, 15, 19], SUS = [0, 7, 12, 14, 19];
const PROG = {
  major: [
    [[38, MAJ], [33, SUS], [35, MIN], [31, MAJ]],          // Reach I:   D - A - Bm - G       (open, hopeful)
    [[35, MIN], [31, MAJ], [38, MAJ], [33, SUS]],          // Reach II:  Bm - G - D - Asus    (the weight of it)
    [[35, MIN], [31, MAJ], [28, MIN], [30, MIN]],          // Reach III: Bm - G - Em - F#m    (the long descent)
  ],
  minor: [
    [[31, MIN], [39, MAJ], [36, MIN], [38, MAJ]],          // Gm - Eb - Cm - D
    [[31, MIN], [36, MIN], [39, MAJ], [38, SUS]],
    [[31, MIN], [39, MAJ], [36, MIN], [38, MAJ]],
  ],
};
let reachNow = 0, tension = 0, mode = "major", scoreTimer = 0, nextChord = 0, chordIx = 0, nextPulse = 0, pulseIx = 0;
const laid = [];   // [start time, root] of the chords laid down, so the pulse follows the chord sounding at its moment

// One section of strings on one note: a handful of bowed voices a few cents apart, so it breathes like players.
function bowed(freq, t, dur, vol, bright, out) {
  const g = ctx.createGain(), lp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.Q.value = 0.5; lp.frequency.value = bright;
  hp.type = "highpass"; hp.frequency.value = 45;
  const att = Math.min(3.2, dur * 0.4), rel = 3.5;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + att);
  g.gain.setValueAtTime(vol, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + rel);
  const vib = ctx.createOscillator(), va = ctx.createGain();
  vib.frequency.value = 4.6 + Math.random() * 0.8; va.gain.value = freq > 200 ? 7 : 3;
  vib.connect(va);
  for (const det of [-11, -6, -2, 3, 7, 12]) {
    const o = ctx.createOscillator();
    o.type = "sawtooth"; o.frequency.value = freq; o.detune.value = det + (Math.random() * 4 - 2);
    va.connect(o.detune);
    o.connect(lp);
    o.start(t); o.stop(t + dur + rel + 0.1);
  }
  vib.start(t); vib.stop(t + dur + rel + 0.1);
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  lp.connect(hp).connect(g);
  if (pan) { pan.pan.value = Math.random() * 0.8 - 0.4; g.connect(pan).connect(out); } else g.connect(out);
}
// A chord for the whole section: basses and cellos on root and fifth, violas and violins above, quieter.
function strings(root, ivs, t, dur) {
  bowed(NOTE(root), t, dur, 0.034, 520, amb);
  bowed(NOTE(root + 12), t, dur, 0.028, 900, amb);
  for (const iv of ivs.slice(1)) bowed(NOTE(root + 12 + iv), t, dur, iv > 12 ? 0.013 : 0.02, iv > 12 ? 2200 : 1400, amb);
}
// Low strings, short and heavy, the pulse under a tense scene.
function pulseNote(freq, t, vol) {
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(1600, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.32);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  for (const det of [-7, 0, 7]) {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq; o.detune.value = det;
    o.connect(lp); o.start(t); o.stop(t + 0.45);
  }
  lp.connect(g).connect(amb);
}
// Horns: a slow brassy swell that opens up as it grows, then falls away.
function horns(root, t, dur, vol) {
  for (const n of [root, root + 7, root + 12]) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(220, t); lp.frequency.linearRampToValueAtTime(1300, t + dur * 0.55); lp.frequency.linearRampToValueAtTime(260, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.55); g.gain.linearRampToValueAtTime(0, t + dur + 0.5);
    for (const [type, det] of [["sawtooth", -5], ["sawtooth", 5], ["square", 0]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = NOTE(n); o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.6);
    }
    lp.connect(g).connect(amb);
  }
}
// A deep drum, felt more than heard.
function boom(t, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(34, t + 1.1);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  o.connect(g).connect(amb); o.start(t); o.stop(t + 1.7);
  const n = ctx.createBufferSource(), ng = ctx.createGain(), lp = ctx.createBiquadFilter();
  n.buffer = noiseBuffer(0.4, true); lp.type = "lowpass"; lp.frequency.value = 180;
  ng.gain.setValueAtTime(vol * 0.8, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  n.connect(lp).connect(ng).connect(amb); n.start(t);
}
// Looks ahead and lays down what is due: a new chord every two bars, the ostinato in eighths, horns and drum when
// tension is high. Called a few times a second; Web Audio keeps the timing exact.
function score() {
  if (!ctx) return;
  const ahead = ctx.currentTime + 1.2;
  const prog = PROG[mode][Math.min(2, reachNow)];
  while (nextChord < ahead) {
    const [root, ivs] = prog[chordIx % prog.length], len = CHORD_BARS * BAR;
    strings(root, ivs, nextChord, len);
    laid.push([nextChord, root]);
    if (laid.length > 8) laid.shift();
    if (tension > 0.6) horns(root, nextChord + BEAT, len - BEAT, 0.012 + 0.012 * (tension - 0.6) / 0.4);
    if (tension > 0.75) { boom(nextChord, 0.22); boom(nextChord + BAR, 0.16); }
    nextChord += len;
    chordIx++;
  }
  while (nextPulse < ahead) {
    if (tension > 0.3) {
      const root = [...laid].reverse().find(([at]) => at <= nextPulse + 0.01)?.[1] ?? prog[0][0];
      const pat = [0, 12, 7, 12], vol = 0.02 + 0.03 * Math.min(1, (tension - 0.3) / 0.5);
      pulseNote(NOTE(root + 12 + pat[pulseIx % 4]), nextPulse, pulseIx % 4 === 0 ? vol * 1.3 : vol);
    }
    nextPulse += BEAT / 2;
    pulseIx++;
  }
}

// reach: 0-2 (the Reach the soul is in); t: 0-1, how close the crossing is to being lost.
export function mood(reach = 0, t = 0) {
  reachNow = Math.max(0, Math.min(2, reach | 0));
  tension = Math.max(0, Math.min(1, t));
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
  g.gain.value = 0.03;
  const lfo = ctx.createOscillator(), amt = ctx.createGain();
  lfo.frequency.value = 0.11;
  amt.gain.value = 0.014;
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

// One verse of the current Soul's lullaby, then a silence before the next, with the strings playing on beneath.
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
  verseTimer = setTimeout(playVerse, (len + rest) * 1000);
  timers.push(verseTimer);
}

// soul: the Soul whose lullaby should play (null or "open" for the game's own). The verse playing now fades
// out and the new lullaby begins a moment later.
export function lullaby(soul) {
  const want = soul && LULLABIES[soul] ? soul : "open";
  if (want === lullSoul) return;
  lullSoul = want;
  mode = want === "bride" ? "minor" : "major";
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
  river();
  nextChord = nextPulse = ctx.currentTime + 0.5;
  scoreTimer = setInterval(score, 250);
  score();
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
// While the Book is open the strings and the river sink back and the Soul's lullaby comes forward. There is no
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
