// Original generative soundtrack and sound effects, synthesised live with the Web Audio API.
// Nothing is sampled or recorded and every melody is original, so there is no copyright to clear.
// Mood: a horror film about a life remembered. Beneath, the underworld: a low string drone rubbing against the note a
// semitone above it, high string clusters that creep upward and cut off, trembling strings, a pulse, brass and a deep
// drum as the crossing grows dangerous, the river and the wind. Above it, the soul's own theme, written for its story
// and played on the instrument of that story: a music box for the child, a wordless voice for the girl in the brook,
// a horn for the fallen king, a violin for the bride who almost reached the light, a bare piano for the nameless soul.

let ctx = null, master = null, musicBus = null, sfxBus = null, wet = null;
let amb = null, lull = null;  // the underworld bed and the soul's theme, mixed apart so the Book can bring the theme forward
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

// ---------------------------------------------------------------- the underworld beneath
// Everything is built around the soul's key. The drone sits two octaves below it in Reaches I and II; in Reach III it
// sinks a semitone below, so the soul's own theme sounds wrong over it, as if the river were pulling it out of tune.
const BEAT = 1, BED = 12;   // a new drone every 12 s
const SOUL_KEY = { child: 57, garland: 50, king: 48, bride: 52, open: 50 };   // A, D, C, E, D
let soulNow = "open", reachNow = 0, tension = 0, reading = false;
let scoreTimer = 0, nextBed = 0, nextPulse = 0, pulseIx = 0, nextSwell = 0;
const tonic = () => SOUL_KEY[soulNow] ?? 50;
const droneRoot = () => tonic() - 24 - (reachNow >= 2 ? 1 : 0);
const dreadNow = () => (reading ? Math.min(tension, 0.15) : tension);   // reading the Book, the story is told without dread

// One section of strings on one note: a handful of bowed voices a few cents apart, so it breathes like players.
function bowed(freq, t, dur, vol, bright, out = amb) {
  const g = ctx.createGain(), lp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.Q.value = 0.5; lp.frequency.value = bright;
  hp.type = "highpass"; hp.frequency.value = 40;
  const att = Math.min(3.2, dur * 0.4), rel = 3.5;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + att);
  g.gain.setValueAtTime(vol, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + rel);
  const vib = ctx.createOscillator(), va = ctx.createGain();
  vib.frequency.value = 4.4 + Math.random() * 0.8; va.gain.value = freq > 200 ? 6 : 2;
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
// The drone: basses on the root and its fifth, and above them a quiet voice a minor ninth up, beating against them.
// Reach II and III add the tritone; the rub grows louder with dread.
function drone(t, dread) {
  const r = droneRoot();
  bowed(NOTE(r), t, BED, 0.032, 380);
  bowed(NOTE(r + 7), t, BED, 0.015, 520);
  bowed(NOTE(r + 13), t, BED, 0.008 + 0.014 * dread, 760);
  if (reachNow >= 1) bowed(NOTE(r + 18), t, BED, 0.006 + 0.01 * dread, 900);
}
// The horror swell: high strings on a cluster of neighbouring notes, creeping upward together as they grow, then cut off.
function clusterSwell(t, dread) {
  const base = tonic() + 12, dur = 6 + Math.random() * 4, rise = 80 + 220 * Math.random(), peak = 0.006 + 0.006 * dread;
  for (const iv of [0, 1, 2, 3, 5, 6]) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 3200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.12);
    for (const det of [-9, 9]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = NOTE(base + iv);
      o.detune.setValueAtTime(det, t); o.detune.linearRampToValueAtTime(det + rise, t + dur);
      o.connect(lp); o.start(t); o.stop(t + dur + 0.2);
    }
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = (iv / 3 - 1) * 0.7; lp.connect(g).connect(pan).connect(amb); } else lp.connect(g).connect(amb);
  }
}
// Trembling strings: a small cluster bowed in fast tremolo, for when things are going wrong.
function tremolo(t, dur, vol) {
  const g = ctx.createGain(), lp = ctx.createBiquadFilter(), depth = ctx.createGain();
  const trem = ctx.createOscillator(), tg = ctx.createGain();
  lp.type = "lowpass"; lp.frequency.value = 2400;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.5); g.gain.linearRampToValueAtTime(0, t + dur);
  depth.gain.value = 0.5; trem.frequency.value = 11; tg.gain.value = 0.5;
  trem.connect(tg).connect(depth.gain);
  for (const iv of [0, 1, 6]) for (const det of [-6, 6]) {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = NOTE(tonic() + iv); o.detune.value = det;
    o.connect(lp); o.start(t); o.stop(t + dur + 0.1);
  }
  trem.start(t); trem.stop(t + dur + 0.1);
  lp.connect(depth).connect(g).connect(amb);
}
// Low strings, short and heavy, the pulse under a tense scene.
function pulseNote(freq, t, vol) {
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(240, t + 0.32);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  for (const det of [-7, 0, 7]) {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq; o.detune.value = det;
    o.connect(lp); o.start(t); o.stop(t + 0.45);
  }
  lp.connect(g).connect(amb);
}
// Low brass: a slow blare on the root and the tritone that opens up as it grows, then falls away.
function horns(root, t, dur, vol) {
  for (const n of [root, root + 6, root + 12]) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(200, t); lp.frequency.linearRampToValueAtTime(1300, t + dur * 0.6); lp.frequency.linearRampToValueAtTime(240, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.6); g.gain.linearRampToValueAtTime(0, t + dur + 0.5);
    for (const [type, det] of [["sawtooth", -5], ["sawtooth", 5], ["square", 0]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = NOTE(n); o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.6);
    }
    lp.connect(g).connect(amb);
  }
}
// A deep drum, felt more than heard; at the worst, a rush of breath is drawn in before it lands.
function boom(t, vol, rush = false, out = amb) {
  if (rush) {
    const n = ctx.createBufferSource(), ng = ctx.createGain(), bp = ctx.createBiquadFilter();
    n.buffer = noiseBuffer(2.2, false); bp.type = "bandpass"; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(300, t - 2); bp.frequency.exponentialRampToValueAtTime(2600, t);
    ng.gain.setValueAtTime(0.0001, t - 2); ng.gain.exponentialRampToValueAtTime(vol * 0.35, t - 0.02); ng.gain.linearRampToValueAtTime(0, t);
    n.connect(bp).connect(ng).connect(out); n.start(t - 2); n.stop(t + 0.1);
  }
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(32, t + 1.2);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  o.connect(g).connect(out); o.start(t); o.stop(t + 1.9);
  const n = ctx.createBufferSource(), ng = ctx.createGain(), lp = ctx.createBiquadFilter();
  n.buffer = noiseBuffer(0.4, true); lp.type = "lowpass"; lp.frequency.value = 180;
  ng.gain.setValueAtTime(vol * 0.8, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  n.connect(lp).connect(ng).connect(out); n.start(t);
}
// Looks ahead and lays down what is due. Called a few times a second; Web Audio keeps the timing exact.
function score() {
  if (!ctx) return;
  const ahead = ctx.currentTime + 2.2, dread = dreadNow();
  // the soul's theme steps back as the dread takes over, and forward while the Book is open
  lull.gain.setTargetAtTime(reading ? 1.2 : 1 - 0.55 * Math.max(0, (dread - 0.55) / 0.45), ctx.currentTime, 1.5);
  while (nextBed < ahead) {
    drone(nextBed, dread);
    if (dread > 0.5) tremolo(nextBed + 2, BED - 2, 0.004 + 0.008 * (dread - 0.5) / 0.5);
    if (dread > 0.65) horns(droneRoot() + 12, nextBed + 3, BED - 4, 0.01 + 0.014 * (dread - 0.65) / 0.35);
    if (dread > 0.8) { boom(nextBed + 2.2, 0.24, true); boom(nextBed + 8.2, 0.16); }
    nextBed += BED;
  }
  while (nextSwell < ahead) {
    if (!reading && Math.random() < 0.4 + 0.5 * dread) clusterSwell(nextSwell, dread);
    nextSwell += (20 + Math.random() * 14) * (1 - 0.5 * dread);
  }
  while (nextPulse < ahead) {
    if (dread > 0.4) {
      const pat = [0, 12, 1, 12], vol = 0.02 + 0.03 * Math.min(1, (dread - 0.4) / 0.45);
      pulseNote(NOTE(droneRoot() + 12 + pat[pulseIx % 4]), nextPulse, pulseIx % 4 === 0 ? vol * 1.3 : vol);
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


// ---------------------------------------------------------------- the souls' themes
// Original melodies, one for each soul, on the instrument of its story. Written as "note/beats" ("r" for a rest,
// "|" between bars). A rest splits a theme into phrases; each phrase is played in one breath or one bow.
const THEMES = {
  // The match girl: a music box, a little out of tune, its phrases reaching up and then going out like a flame.
  child: { inst: "musicbox", bpm: 66, tune: `
    E5/1 A5/1 B5/.5 C6/1.5 | B5/.5 A5/.5 G#5/1 E5/2 | r/2 |
    F5/1 E5/.5 D5/.5 C5/1 B4/1 | A4/3 r/1 |
    E5/.5 A5/.5 C6/.5 E6/1.5 D6/.5 C6/.5 | B5/2 G#5/1 r/1 | A5/4` },
  // The girl in the brook: a wordless voice, drifting in the old Dorian mode, sinking lower as she goes under.
  garland: { inst: "voice", bpm: 60, tune: `
    A4/1 D5/1 E5/1 | F5/2 E5/1 | D5/1 C5/1 A4/1 | B4/3 | r/1 |
    A4/1 D5/1 E5/1 | F5/1 G5/1 A5/1 | G5/1.5 F5/.5 E5/1 | D5/3 | r/1 |
    C5/1 D5/1 F5/1 | E5/2 D5/1 | C5/1 A4/1 G4/1 | A4/2 | r/1 |
    F4/1 E4/1 D4/1 | D4/3` },
  // The fallen king: a lone horn, slow and noble, every phrase falling, with a far-off war drum.
  king: { inst: "horn", bpm: 52, drum: true, tune: `
    C4/2 G4/2 | Ab4/1.5 G4/.5 F4/2 | Eb4/1 F4/1 G4/2 | C4/4 | r/2 |
    Eb4/2 Bb4/2 | C5/1.5 Bb4/.5 Ab4/2 | G4/1 F4/1 Eb4/1 D4/1 | C4/4` },
  // The bride: a solo violin climbing step by step towards the light, one step short, and turning back.
  bride: { inst: "violin", bpm: 58, tune: `
    E4/1 F4/1 G#4/1 A4/1 | B4/1 C5/1 D5/1 E5/1 | F5/3 E5/1 | r/1 |
    F5/1 E5/1 D5/1 C5/1 | B4/1 A4/1 G#4/1 F4/1 | E4/4 | r/2 |
    E4/.5 G#4/.5 B4/1 E5/1.5 F5/.5 | E5/4` },
  // The nameless soul: no song yet, only a bare piano finding a few notes in the dark.
  open: { inst: "piano", bpm: 50, tune: `
    D4/2 Eb4/2 | r/2 A3/3 | r/3 |
    D5/1.5 C#5/.5 G#4/3 | r/3 |
    F4/1 E4/1 A3/4` },
};
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function parseTune(text) {
  return text.trim().split(/[\s|]+/).filter(Boolean).map(tok => {
    const [n, b] = tok.split("/");
    if (n === "r") return [0, +b];
    const m = n.match(/^([A-G])(#|b)?(\d)$/);
    return [12 * (+m[3] + 1) + STEP[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0), +b];
  });
}
// A music box tine: a bright pluck that rings and fades, each one a few cents out of tune.
function tine(freq, t, vol, out) {
  const g = ctx.createGain(), det = Math.random() * 24 - 12;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  for (const [r, a] of [[1, 1], [2.01, 0.28], [4.98, 0.12], [8.1, 0.05]]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "sine"; o.frequency.value = freq * r; o.detune.value = det; og.gain.value = a;
    o.connect(og).connect(g); o.start(t); o.stop(t + 2.7);
  }
  g.connect(out);
}
// A held, singing line in one breath or one bow: the voice, the violin and the horn. Notes glide into each other,
// each one swells, and the vibrato blooms a moment after the note begins.
const VOICES = {
  voice:  { osc: [["sawtooth", -5], ["sawtooth", 5]], formants: [[800, 7, 1], [1150, 9, 0.6], [2900, 10, 0.25]], vib: [5.4, 16], vol: 0.05, breath: 0.012, pan: 0.1 },
  violin: { osc: [["sawtooth", -4], ["sawtooth", 4], ["sawtooth", 0]], lowpass: 4200, body: [2600, 4], vib: [6, 18], vol: 0.03, pan: 0.2 },
  horn:   { osc: [["sawtooth", -4], ["sawtooth", 4], ["square", 0]], lowpass: 900, body: [400, 4], vib: [4.6, 7], vol: 0.045, pan: -0.15 },
};
function sing(inst, notes, t, beat, out) {
  const v = VOICES[inst];
  const g = ctx.createGain(), mix = ctx.createGain();
  const vib = ctx.createOscillator(), va = ctx.createGain();
  vib.frequency.value = v.vib[0]; va.gain.value = 0; vib.connect(va);
  const oscs = v.osc.map(([type, det]) => { const o = ctx.createOscillator(); o.type = type; o.detune.value = det; va.connect(o.detune); o.connect(mix); return o; });
  let shaped;
  if (v.formants) {
    shaped = ctx.createGain();
    for (const [f, q, a] of v.formants) {
      const bp = ctx.createBiquadFilter(), ag = ctx.createGain();
      bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q; ag.gain.value = a * 4;
      mix.connect(bp).connect(ag).connect(shaped);
    }
  } else {
    const lp = ctx.createBiquadFilter(), body = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = v.lowpass; lp.Q.value = 0.6;
    body.type = "peaking"; body.frequency.value = v.body[0]; body.Q.value = 1; body.gain.value = v.body[1];
    mix.connect(body).connect(lp); shaped = lp;
  }
  let at = t;
  g.gain.setValueAtTime(0, t);
  for (const [n, beats] of notes) {
    const len = beats * beat;
    oscs.forEach(o => o.frequency.setTargetAtTime(NOTE(n), at, at === t ? 0.001 : 0.07));
    g.gain.setTargetAtTime(v.vol, at, Math.min(0.35, len * 0.2));
    g.gain.setTargetAtTime(v.vol * 0.6, at + len * 0.65, len * 0.15);
    va.gain.setValueAtTime(0, at); va.gain.linearRampToValueAtTime(v.vib[1], at + Math.min(0.9, len * 0.45));
    at += len;
  }
  g.gain.setTargetAtTime(0, at - 0.25, 0.35);
  oscs.forEach(o => { o.start(t); o.stop(at + 2); });
  vib.start(t); vib.stop(at + 2);
  if (v.breath) {
    const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = noiseBuffer(at - t + 1, false); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 1.2; ng.gain.value = v.breath / v.vol;
    n.connect(bp).connect(ng).connect(g); n.start(t); n.stop(at + 1);
  }
  shaped.connect(g);
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan) { pan.pan.value = v.pan; g.connect(pan).connect(out); } else g.connect(out);
}

let verse = null, verseTimer = 0;
// The soul's theme once through, then a silence before it returns (a shorter one while the Book is open).
function playVerse() {
  if (!ctx) return;
  const th = THEMES[soulNow] || THEMES.open, beat = 60 / th.bpm;
  verse = ctx.createGain();
  verse.connect(lull);
  let t = ctx.currentTime + 0.3, start = t, phrase = [];
  const flush = () => {
    if (!phrase.length) return;
    if (th.inst === "musicbox" || th.inst === "piano") {
      let at = start;
      for (const [n, b] of phrase) {
        if (th.inst === "musicbox") tine(NOTE(n), at, 0.05, verse);
        else piano(NOTE(n), at, 0.06, Math.max(2.5, b * beat * 2.5), 0.1, verse);
        at += b * beat;
      }
    } else sing(th.inst, phrase, start, beat, verse);
    phrase = [];
  };
  for (const [n, b] of parseTune(th.tune)) {
    if (!n) { flush(); t += b * beat; continue; }
    if (!phrase.length) start = t;
    phrase.push([n, b]);
    t += b * beat;
  }
  flush();
  if (th.drum) { boom(ctx.currentTime + 0.3, 0.07, false, verse); boom(t - 4 * beat, 0.06, false, verse); }   // the king's far-off war drum
  const len = t - ctx.currentTime;
  verseTimer = setTimeout(playVerse, (len + (reading ? 5 : 14 + Math.random() * 8)) * 1000);
  timers.push(verseTimer);
}

// soul: whose theme should play (null or "open" for the nameless soul). The theme playing now fades out, the
// underworld moves to the new soul's key, and the new theme begins a moment later.
export function lullaby(soul) {
  const want = soul && THEMES[soul] ? soul : "open";
  if (want === soulNow) return;
  soulNow = want;
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
  nextBed = nextPulse = ctx.currentTime + 0.5;
  nextSwell = ctx.currentTime + 14;
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
// While the Book is open it is a life being read: the dread falls away, the underworld sinks back, and the soul's own
// theme comes forward and returns sooner.
export function storyTheme(soul) {
  if (!ctx) return;
  const now = ctx.currentTime;
  if (soul) lullaby(soul);
  reading = !!soul;
  amb.gain.setTargetAtTime(soul && musicOn ? 0.5 : 1, now, 0.8);
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
    // Going down to a table: the air rushes past, a low swell as the surface closes overhead, two deep bells a semitone apart.
    case "descend": hiss(2400, 0.7, 0.12, 1.6, 120); thump(52, 0.45, 2.6); bell(NOTE(38), t + 0.9, 0.05, sfxBus, 5); bell(NOTE(39), t + 1.05, 0.04, sfxBus, 5); break;
    // Coming back up: a rising breath, then the pale bells of the world of the living, with a low one left behind.
    case "ascend": hiss(160, 0.7, 0.1, 1.8, 2600); bell(NOTE(45), t + 0.6, 0.035, sfxBus, 4); bell(NOTE(69), t + 1.1, 0.03, sfxBus, 4); bell(NOTE(76), t + 1.4, 0.025, sfxBus, 4); break;
    case "loss": [62, 61, 58, 57, 50].forEach((n, i) => bell(NOTE(n), t + i * 0.45, 0.07, sfxBus, 6)); thump(45, 0.5, 3); break;
  }
}
