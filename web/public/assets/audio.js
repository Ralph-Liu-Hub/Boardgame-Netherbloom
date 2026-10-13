// Original generative soundtrack and sound effects, synthesised live with the Web Audio API.
// Nothing is sampled or recorded, so there is no copyright to clear.
// Mood: a tranquil river at night with something wrong underneath. A slow D-minor song (harp, heartbeat,
// a flute or music-box melody) over a low drone and running water, bells between its rounds, and now and
// then a slow minor-second swell.

let ctx = null, master = null, musicBus = null, sfxBus = null, wet = null;
let amb = null, storyBus = null, storyTimer = null, storySoul = null;  // ambient layers can be ducked under a Soul's theme
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
  amb = ctx.createGain();
  amb.connect(musicBus);
  storyBus = ctx.createGain();
  storyBus.gain.value = 0;
  storyBus.connect(musicBus);
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

function phrase() {
  if (melodyOn) { timers.push(setTimeout(phrase, 4000)); return; }
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
  lp.connect(g).connect(amb);
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
  src.connect(bp).connect(g).connect(amb);
  src.start();
  timers.push(setTimeout(whisper, 30000 + Math.random() * 40000));
}

// ---------------------------------------------------------------- the song of the river
// A slow piece in D minor (84 bpm) over the drone: a harp arpeggio, a soft heartbeat, and a melody that
// comes and goes. Each 8-bar round picks a voice: a solo violin (always the first round), the flute, a
// music-box answer an octave up, or only the harp, so the bells have room to ring. The raised C sharp over the last chord keeps the unease.
const BPM = 84, BEAT = 60 / BPM, BAR = BEAT * 4;
const PROG = [            // [bass, chord tones] per bar: Dm Bb F C | Dm Gm Bb A
  [38, [62, 65, 69]], [34, [62, 65, 70]], [41, [60, 65, 69]], [36, [60, 64, 67]],
  [38, [62, 65, 69]], [43, [62, 67, 70]], [34, [62, 65, 70]], [45, [61, 64, 69]],
];
const MELODY = [          // [midi, beats] per bar; 0 is a rest
  [[69, 1], [74, 1], [76, .5], [77, 1.5]],
  [[76, 1], [74, 1], [77, 2]],
  [[72, 1], [69, 1], [72, .5], [74, 1.5]],
  [[76, 3], [0, 1]],
  [[69, 1], [74, 1], [76, .5], [77, 1.5]],
  [[79, 1], [77, 1], [74, 2]],
  [[77, 1], [76, 1], [74, 1], [70, 1]],
  [[73, 1.5], [76, .5], [74, 2]],
];
// The violin's line: long bowed notes that sigh down by a semitone and lean on unresolved tones
// (the raised C sharp, an E flat over G minor, a B natural against C) for a tranquil kind of dread.
const VIOLIN = [          // [midi, beats] per bar
  [[74, 3], [73, 1]],
  [[74, 2], [70, 2]],
  [[72, 3], [69, 1]],
  [[71, 2], [72, 2]],
  [[77, 3], [76, 1]],
  [[74, 2], [75, 2]],
  [[77, 2], [74, 2]],
  [[76, 2], [73, 2]],
];
let songBar = 0, songNext = 0, songVoice = "flute", melodyOn = false;

function pluck(freq, when, vol, len = 1.6, pan = 0) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + len);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(2600, when);
  lp.frequency.exponentialRampToValueAtTime(500, when + len);
  for (const [type, r, a] of [["triangle", 1, 1], ["sine", 2, 0.3]]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = type;
    o.frequency.value = freq * r;
    og.gain.value = a;
    o.connect(og).connect(lp);
    o.start(when);
    o.stop(when + len + 0.05);
  }
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) { p.pan.value = pan; lp.connect(g).connect(p).connect(amb); } else lp.connect(g).connect(amb);
}

function flute(freq, when, dur, vol = 0.06) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.09);
  g.gain.setValueAtTime(vol, when + Math.max(0.1, dur - 0.18));
  g.gain.linearRampToValueAtTime(0, when + dur + 0.25);
  const vib = ctx.createOscillator(), vibAmt = ctx.createGain();
  vib.frequency.value = 5.2;
  vibAmt.gain.setValueAtTime(0, when);
  vibAmt.gain.linearRampToValueAtTime(freq * 0.006, when + 0.4);
  vib.connect(vibAmt);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2200;
  for (const [type, r, a] of [["sine", 1, 1], ["triangle", 2, 0.12]]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = type;
    o.frequency.value = freq * r;
    vibAmt.connect(o.frequency);
    og.gain.value = a;
    o.connect(og).connect(lp);
    o.start(when);
    o.stop(when + dur + 0.3);
  }
  vib.start(when);
  vib.stop(when + dur + 0.3);
  lp.connect(g).connect(amb);
}

// A solo violin: two slightly detuned bowed tones through a body resonance, with a slow bow attack,
// a small scoop into each note and vibrato that only blooms once the note is held.
function violin(freq, when, dur, vol = 0.045) {
  const end = when + dur;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol * 0.7, when + 0.35);
  g.gain.linearRampToValueAtTime(vol, when + Math.min(dur * 0.6, 1.4));
  g.gain.setValueAtTime(vol, Math.max(when + 0.4, end - 0.5));
  g.gain.linearRampToValueAtTime(0, end + 0.6);
  const vib = ctx.createOscillator(), vibAmt = ctx.createGain();
  vib.frequency.value = 5.4;
  vibAmt.gain.setValueAtTime(0, when);
  vibAmt.gain.linearRampToValueAtTime(0, when + 0.45);
  vibAmt.gain.linearRampToValueAtTime(freq * 0.009, when + Math.min(dur, 1.6));
  vib.connect(vibAmt);
  const body = ctx.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = 2400;
  body.Q.value = 1.2;
  body.gain.value = 7;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1400, when);
  lp.frequency.linearRampToValueAtTime(3600, when + 0.6);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 220;
  for (const det of [-4, 5]) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(freq * 0.985, when);                 // the scoop up into the note
    o.frequency.exponentialRampToValueAtTime(freq, when + 0.22);
    o.detune.value = det;
    vibAmt.connect(o.frequency);
    o.connect(lp);
    o.start(when);
    o.stop(end + 0.7);
  }
  vib.start(when);
  vib.stop(end + 0.7);
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  const out = lp.connect(hp).connect(body).connect(g);
  if (p) { p.pan.value = -0.25; out.connect(p).connect(amb); } else out.connect(amb);
}

function heartbeat(when, vol) {
  for (const [dt, v] of [[0, vol], [0.24, vol * 0.6]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(70, when + dt);
    o.frequency.exponentialRampToValueAtTime(38, when + dt + 0.25);
    g.gain.setValueAtTime(v, when + dt);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dt + 0.32);
    o.connect(g).connect(amb);
    o.start(when + dt);
    o.stop(when + dt + 0.35);
  }
}

function songBarAt(t) {
  const i = songBar % 8;
  if (i === 0) {
    // a new round: choose who sings it
    const r = Math.random();
    songVoice = songBar === 0 || r < 0.4 ? "violin" : r < 0.65 ? "flute" : r < 0.85 ? "box" : "harp";
    melodyOn = songVoice !== "harp";
  }
  const [bass, tones] = PROG[i];
  pluck(NOTE(bass), t, 0.07, BAR * 0.95, -0.1);
  const arp = [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1], tones[0], tones[1]];
  arp.forEach((n, k) => pluck(NOTE(n - 12), t + k * BEAT / 2, k % 2 ? 0.022 : 0.03, 1.4, 0.35));
  heartbeat(t, 0.12);
  heartbeat(t + BEAT * 2, 0.08);
  if (songVoice === "violin") {
    let x = t;
    for (const [n, b] of VIOLIN[i]) { violin(NOTE(n), x, b * BEAT); x += b * BEAT; }
  } else if (melodyOn) {
    let x = t;
    for (const [n, b] of MELODY[i]) {
      if (n) {
        if (songVoice === "flute") flute(NOTE(n), x, b * BEAT);
        else bell(NOTE(n + 12), x, 0.045, amb, Math.max(1.5, b * BEAT * 2));
      }
      x += b * BEAT;
    }
  }
  songBar += 1;
}

function song() {
  // schedule bars a little ahead of time, so the rhythm stays steady even when the page is busy
  if (!songNext || songNext < ctx.currentTime) songNext = ctx.currentTime + 0.2;
  while (songNext < ctx.currentTime + 1.2) {
    songBarAt(songNext);
    songNext += BAR;
  }
  timers.push(setTimeout(song, 300));
}

export function start() {
  init();
  if (ctx.state === "suspended") ctx.resume();
  if (started) return;
  started = true;
  drone();
  river();
  timers.push(setTimeout(phrase, 2500));
  timers.push(setTimeout(song, 6000));
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

// ---------------------------------------------------------------- the Souls' themes (played while the Book is open)
// Each Soul has a short music-box melody over a soft drone; the river soundtrack sinks beneath it.
// Melodies are [midi note, beats]; 0 is a rest.
const THEMES = {
  open: { bpm: 66, notes: [[74, 1], [77, 1], [81, 2], [79, 1], [77, 1], [76, 2], [74, 1], [72, 1], [74, 3], [0, 1]], bass: [50, 45] },
  child: { bpm: 80, notes: [[69, 1], [74, 2], [76, 1], [77, 2], [76, 1], [74, 2], [72, 1], [74, 3], [69, 1], [72, 1], [74, 1], [76, 3], [0, 2]], bass: [50, 57] },
  garland: { bpm: 76, notes: [[74, .5], [76, .5], [77, 1], [81, 1], [79, .5], [77, .5], [76, 1], [72, 1], [74, 2], [77, .5], [76, .5], [74, 1], [69, 1], [74, 2], [0, 1]], bass: [50, 53] },
  king: { bpm: 54, notes: [[62, 2], [69, 2], [67, 1], [65, 1], [64, 2], [62, 2], [60, 1], [62, 3], [0, 1]], bass: [38, 45], low: true },
  bride: { bpm: 58, notes: [[69, 1.5], [70, .5], [69, 1], [65, 1], [64, 1.5], [65, .5], [62, 2], [61, 1], [62, 3], [0, 1]], bass: [50, 46] },
};

function musicBox(freq, when, vol, len) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + len);
  [[1, 1], [3.01, 0.18], [6.1, 0.05], [2, 0.12]].forEach(([r, a]) => {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq * r;
    og.gain.value = a;
    o.connect(og).connect(g);
    o.start(when);
    o.stop(when + len + 0.1);
  });
  g.connect(storyBus);
}

function pad(freq, when, dur) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(0.03, when + dur * 0.4);
  g.gain.linearRampToValueAtTime(0, when + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 600;
  for (const det of [-6, 6]) {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq;
    o.detune.value = det;
    o.connect(lp);
    o.start(when);
    o.stop(when + dur + 0.1);
  }
  lp.connect(g).connect(storyBus);
}

function themePhrase() {
  const th = THEMES[storySoul];
  if (!th || !ctx) return;
  const beat = 60 / th.bpm;
  let t = ctx.currentTime + 0.15, total = 0;
  for (const [n, b] of th.notes) {
    if (n) {
      musicBox(NOTE(n), t, th.low ? 0.075 : 0.06, Math.max(1.6, b * beat * 2.2));
      if (th.low) musicBox(NOTE(n - 12), t, 0.035, b * beat * 2);
    }
    t += b * beat;
    total += b;
  }
  const len = total * beat;
  pad(NOTE(th.bass[0]), ctx.currentTime + 0.15, len / 2 + 0.6);
  pad(NOTE(th.bass[1]), ctx.currentTime + 0.15 + len / 2, len / 2 + 0.6);
  storyTimer = setTimeout(themePhrase, (len + beat * 2) * 1000);
}

// soul: a Soul key to play its theme, or null to return to the river.
export function storyTheme(soul) {
  if (!ctx) return;
  clearTimeout(storyTimer);
  storyTimer = null;
  const now = ctx.currentTime;
  if (soul && musicOn) {
    storySoul = soul;
    amb.gain.setTargetAtTime(0.22, now, 0.8);
    storyBus.gain.cancelScheduledValues(now);
    storyBus.gain.setTargetAtTime(1, now, 0.5);
    themePhrase();
  } else {
    storySoul = null;
    amb.gain.setTargetAtTime(1, now, 1.2);
    storyBus.gain.setTargetAtTime(0, now, 0.4);
  }
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
