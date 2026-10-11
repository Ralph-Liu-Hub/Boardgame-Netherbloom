// Shadow-theatre puppets for the Book of Remembrance.
// Each Soul is a jointed silhouette (hips, torso, head, two arms, two legs) with its own costume and prop,
// drawn in ink with a hand-sketched, gently "boiling" edge. The story drives the poses: the soul walks
// the river turn by turn, and each moment of its journey (a Linger, a Fracture, an inscribed memory,
// the ending) plays a gesture in that Soul's character.
import { stepsFor } from "./replay.js";
import { zh, cardBand } from "./i18n.js";
const L = (en, zhText) => (zh() ? zhText : en);

const NS = "http://www.w3.org/2000/svg";
const INK = "#2a1d12", RED = "#a32a30", WARM = "#f2c46b";
const W = 560, H = 420, GROUND = 352;
let uid = 0;

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
// A limb hanging straight down from its joint: a tapered capsule.
const limb = (len, w0, w1) => `M${-w0 / 2} 0 Q0 ${-w0 * 0.6} ${w0 / 2} 0 L${w1 / 2} ${len} Q0 ${len + w1 * 0.7} ${-w1 / 2} ${len} Z`;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ---------------------------------------------------------------- the five Souls
const LOOKS = {
  child: { scale: 0.92, dress: "short", shawl: true, prop: "match", hair: "short", gait: 1.25 },
  garland: { scale: 1.08, dress: "long", hair: "long", garland: true, prop: "flower", gait: 0.95 },
  king: { scale: 1.14, dress: "robe", cape: true, crown: true, beard: true, prop: "sword", gait: 0.7 },
  bride: { scale: 1.08, dress: "long", veil: true, hair: "bun", prop: null, gait: 0.85 },
  open: { scale: 1.08, dress: "robe", hood: true, prop: "lantern", gait: 0.9 },
};

// Poses are joint angles in degrees (positive swings forward) plus a few extras.
const STAND = { dx: 0, dy: 0, lean: 3, nod: 0, uaF: 8, faF: 12, uaB: -6, faB: 10, thF: 0, shF: 0, thB: 0, shB: 0, glow: 0, alpha: 1 };
const P = (o) => ({ ...STAND, ...o });
const CROUCH = P({ dy: 46, lean: 30, nod: 26, thF: 100, shF: -125, thB: 70, shB: -130, uaF: 38, faF: 105, uaB: 30, faB: 100 });
const KNEEL = P({ dy: 34, lean: 14, nod: 30, thF: 88, shF: -88, thB: -12, shB: -98, uaF: 34, faF: 30, uaB: 10, faB: 20 });
const FLINCH = P({ lean: -20, nod: -14, uaF: 70, faF: 120, uaB: 60, faB: 110, thF: -8, thB: 10 });
const OPEN_ARMS = P({ lean: -8, nod: -18, uaF: 150, faF: 0, uaB: 140, faB: 0, glow: 1 });
const FALLEN = P({ dy: 60, lean: 72, nod: 30, thF: 90, shF: -100, thB: 80, shB: -120, uaF: 10, faF: 20, uaB: 0, faB: 10, alpha: 0.35 });

const GESTURES = {
  child: {
    idle: P({ uaF: 30, faF: 100, uaB: 25, faB: 105, nod: 8, lean: 6 }),
    linger: [[CROUCH, 700], [P({ ...CROUCH, nod: 34 }), 1200, "shiver"]],
    sign: [[P({ uaF: 60, faF: 70, uaB: 40, faB: 95, nod: 12 }), 550], [P({ uaF: 95, faF: 20, uaB: 40, faB: 95, nod: -6, glow: 1 }), 350],
      [P({ uaF: 50, faF: 118, uaB: 45, faB: 118, nod: 18, glow: 1 }), 900], [P({ uaF: 50, faF: 118, uaB: 45, faB: 118, nod: 22, glow: 0.7 }), 900]],
  },
  garland: {
    idle: P({ uaF: 20, faF: 30, uaB: -24, faB: 20, nod: -6 }),
    linger: [[P({ dy: 44, lean: 10, nod: 24, thF: 92, shF: -40, thB: 85, shB: -60, uaF: 45, faF: 80, uaB: 40, faB: 85 }), 800],
      [P({ dy: 44, lean: 10, nod: 24, thF: 92, shF: -40, thB: 85, shB: -60, uaF: 50, faF: 60, uaB: 36, faB: 95 }), 700],
      [P({ dy: 44, lean: 10, nod: 24, thF: 92, shF: -40, thB: 85, shB: -60, uaF: 45, faF: 85, uaB: 42, faB: 75 }), 700]],
    sign: [[P({ uaF: 60, faF: 40, nod: 4, lean: 6 }), 600], [P({ uaF: 100, faF: 0, uaB: -40, faB: 10, nod: -14, lean: -4 }), 500, "release"],
      [P({ uaF: 110, faF: 0, uaB: -50, faB: 0, nod: -20, lean: -8 }), 1300]],
  },
  king: {
    idle: P({ uaF: 26, faF: 40, uaB: 20, faB: 50, lean: 2, nod: 4 }),
    linger: [[KNEEL, 900], [P({ ...KNEEL, nod: 38 }), 1500]],
    sign: [[P({ uaF: 90, faF: 40, nod: -6 }), 600], [P({ uaF: 172, faF: 4, uaB: 20, faB: 20, nod: -22, lean: -6, glow: 1 }), 700],
      [P({ uaF: 172, faF: 4, uaB: 20, faB: 20, nod: -24, lean: -6, glow: 1 }), 1200]],
  },
  bride: {
    idle: P({ uaF: 40, faF: 120, uaB: 34, faB: 118, nod: 10 }),
    linger: [[P({ lean: 24, nod: 34, uaF: 62, faF: 140, uaB: 58, faB: 140, dy: 6, thF: 10, shF: -14 }), 800], [P({ lean: 30, nod: 40, uaF: 64, faF: 142, uaB: 60, faB: 142, dy: 10, thF: 14, shF: -20 }), 1400]],
    sign: [[P({ lean: 10, uaF: 80, faF: 6, uaB: 72, faB: 8, nod: -4 }), 700], [P({ lean: 16, uaF: 88, faF: 0, uaB: 82, faB: 0, nod: -8, thF: 18, thB: -14 }), 1500]],
    look: [[P({ lean: -14, nod: -26, uaF: -10, faF: 20, uaB: -30, faB: 30 }), 600], [P({ lean: -16, nod: -30, uaF: -24, faF: 30, uaB: -40, faB: 34 }), 900]],
  },
  open: {
    idle: P({ uaF: 14, faF: 22, glow: 0.45 }),
    linger: [[P({ dy: 44, lean: 18, nod: 20, thF: 92, shF: -60, thB: 80, shB: -70, uaF: 20, faF: 30, uaB: 30, faB: 70, glow: 0.4 }), 900],
      [P({ dy: 44, lean: 22, nod: 30, thF: 92, shF: -60, thB: 80, shB: -70, uaF: 18, faF: 30, uaB: 30, faB: 74, glow: 0.3 }), 1300]],
    sign: [[P({ uaF: 90, faF: 30, nod: -6 }), 600], [P({ uaF: 150, faF: 18, nod: -20, lean: -6, glow: 1 }), 600], [P({ uaF: 150, faF: 18, nod: -22, lean: -6, glow: 1 }), 1300]],
  },
};

// ---------------------------------------------------------------- building a puppet
function build(svg, soul, id) {
  const L = LOOKS[soul] || LOOKS.open;
  const fig = el("g", { id: `fig-${id}`, filter: `url(#sk-${id})` }, svg);
  const root = el("g", {}, fig);
  const j = {};
  const part = (parent, d, extra = {}) => el("path", { d, fill: INK, ...extra }, parent);

  // back leg
  j.thB = el("g", {}, root);
  part(j.thB, limb(42, 13, 10), { opacity: 0.82 });
  j.shB = el("g", {}, j.thB);
  part(j.shB, limb(42, 10, 7), { opacity: 0.82 });
  part(j.shB, "M-4 40 Q4 38 12 43 Q8 47 -4 46 Z", { opacity: 0.82 });

  j.torso = el("g", {}, root);
  // capes and veils sit behind the body
  j.back = el("g", {}, j.torso);
  if (L.cape) j.cape = part(j.back, "M-2 -64 C-26 -40 -40 10 -56 78 L-8 76 C-4 30 4 -30 4 -60 Z", { opacity: 0.9 });
  if (L.veil) j.veil = part(j.back, "M-4 -96 C-40 -80 -70 -30 -112 46 C-80 40 -50 20 -20 -40 C-12 -60 -6 -76 -2 -86 Z", { opacity: 0.45 });
  if (L.hair === "long") j.hairBack = part(j.back, "M-6 -98 C-24 -86 -26 -50 -34 -24 C-24 -30 -16 -44 -10 -60 C-6 -72 -2 -82 0 -88 Z", { opacity: 0.95 });

  // back arm
  j.uaB = el("g", { }, j.torso);
  part(j.uaB, limb(33, 10, 8), { opacity: 0.8 });
  j.faB = el("g", {}, j.uaB);
  part(j.faB, limb(31, 8, 7), { opacity: 0.8 });
  el("circle", { cx: 0, cy: 33, r: 4.5, fill: INK, opacity: 0.8 }, j.faB);

  // torso and dress
  part(j.torso, "M-11 -4 C-14 -30 -13 -52 -9 -66 L9 -66 C13 -52 14 -30 11 -4 Z");
  if (L.dress === "long") j.skirt = part(j.torso, "M-12 -10 L12 -10 C18 20 26 56 34 86 C10 92 -14 92 -36 86 C-26 56 -18 20 -12 -10 Z");
  if (L.dress === "short") j.skirt = part(j.torso, "M-12 -8 L12 -8 C16 10 22 28 26 44 C8 48 -10 48 -26 44 C-20 28 -16 10 -12 -8 Z");
  if (L.dress === "robe") j.skirt = part(j.torso, "M-13 -60 L13 -60 C18 -10 22 40 26 88 C8 92 -12 92 -30 88 C-24 40 -18 -10 -13 -60 Z");
  if (L.shawl) part(j.torso, "M-16 -76 C-24 -58 -22 -40 -14 -24 L16 -30 C20 -46 18 -62 12 -76 Z");

  // head
  j.head = el("g", {}, j.torso);
  el("circle", { cx: 0, cy: -16, r: 13, fill: INK }, j.head);
  part(j.head, "M10 -18 L17 -14 L10 -11 Z");                                   // nose and chin profile
  part(j.head, "M-6 -4 L6 -4 L5 4 L-5 4 Z");                                   // neck
  if (L.hair === "short") part(j.head, "M-13 -18 C-14 -32 4 -36 12 -26 C2 -28 -6 -24 -8 -12 Z");
  if (L.hair === "long") part(j.head, "M-13 -14 C-14 -34 8 -36 14 -24 C4 -28 -4 -22 -6 -10 Z");
  if (L.hair === "bun") el("circle", { cx: -12, cy: -26, r: 7, fill: INK }, j.head);
  if (L.hood) part(j.head, "M-18 -10 C-22 -34 -4 -44 12 -32 C16 -26 16 -18 14 -12 C8 -24 -4 -24 -6 -8 C-10 2 -16 4 -18 -10 Z");
  if (L.shawl) part(j.head, "M-16 -12 C-18 -34 2 -40 14 -28 C6 -30 -4 -26 -6 -10 Z");
  if (L.crown) part(j.head, "M-11 -27 L-9 -40 L-4 -32 L1 -42 L5 -32 L10 -40 L11 -27 Z");
  if (L.beard) part(j.head, "M2 -8 C6 -2 10 2 14 -2 C14 -8 12 -12 10 -12 Z");
  if (L.garland) for (let i = 0; i < 6; i++) el("circle", { cx: -11 + i * 4.4, cy: -28 - Math.sin(i / 5 * Math.PI) * 4, r: 2.6, fill: RED }, j.head);

  // front leg (drawn over the dress hem only below it)
  j.thF = el("g", {}, root);
  part(j.thF, limb(42, 13, 10));
  j.shF = el("g", {}, j.thF);
  part(j.shF, limb(42, 10, 7));
  part(j.shF, "M-4 40 Q4 38 12 43 Q8 47 -4 46 Z");
  if (j.skirt) root.appendChild(j.torso);   // the dress covers both legs

  // front arm and prop
  j.uaF = el("g", {}, j.torso);
  part(j.uaF, limb(33, 10, 8));
  j.faF = el("g", {}, j.uaF);
  part(j.faF, limb(31, 8, 7));
  el("circle", { cx: 0, cy: 33, r: 4.5, fill: INK }, j.faF);
  const hand = el("g", { transform: "translate(0,33)" }, j.faF);
  j.glowEls = [];
  if (L.prop === "match") {
    el("rect", { x: -1, y: -14, width: 2, height: 16, fill: INK }, hand);
    const f = el("g", { class: "pp-flame" }, hand);
    el("circle", { cx: 0, cy: -17, r: 16, fill: WARM, opacity: 0.35 }, f);
    el("path", { d: "M0 -26 C5 -20 4 -15 0 -13 C-4 -15 -5 -20 0 -26 Z", fill: RED }, f);
    j.glowEls.push(f);
  } else if (L.prop === "flower") {
    el("path", { d: "M0 0 L0 -26", stroke: INK, "stroke-width": 1.6 }, hand);
    j.flower = el("use", { href: "#nb-bloom", x: -9, y: -40, width: 18, height: 18, style: `color:${RED}` }, hand);
  } else if (L.prop === "sword") {
    const sw = el("g", {}, hand);
    el("rect", { x: -9, y: -2, width: 18, height: 3, fill: INK }, sw);
    el("path", { d: "M-2.5 2 L2.5 2 L2 74 L0 80 L-2 74 Z", fill: INK }, sw);
    el("rect", { x: -1.5, y: -12, width: 3, height: 10, fill: INK }, sw);
    const g = el("circle", { cx: 0, cy: 40, r: 30, fill: WARM, opacity: 0, class: "pp-swordglow" }, sw);
    j.glowEls.push(g);
  } else if (L.prop === "lantern") {
    el("path", { d: "M0 0 L0 10", stroke: INK, "stroke-width": 1.5 }, hand);
    const lg = el("g", {}, hand);
    const halo = el("circle", { cx: 0, cy: 22, r: 22, fill: WARM, opacity: 0.25 }, lg);
    el("use", { href: "#nb-light", x: -10, y: 8, width: 20, height: 24, style: `color:${INK}` }, lg);
    j.glowEls.push(halo);
  }
  return { fig, root, j, L };
}

function apply(pp, x, p, t) {
  const { root, j, L } = pp;
  const s = L.scale * 1.32;
  const hipY = GROUND - 84 * s;
  root.setAttribute("transform", `translate(${x + p.dx * s} ${hipY + p.dy * s}) scale(${s})`);
  root.setAttribute("opacity", p.alpha);
  j.torso.setAttribute("transform", `rotate(${p.lean})`);
  j.head.setAttribute("transform", `translate(0 -70) rotate(${p.nod})`);
  j.uaF.setAttribute("transform", `translate(0 -64) rotate(${-p.uaF})`);
  j.faF.setAttribute("transform", `translate(0 33) rotate(${-p.faF})`);
  j.uaB.setAttribute("transform", `translate(0 -64) rotate(${-p.uaB})`);
  j.faB.setAttribute("transform", `translate(0 33) rotate(${-p.faB})`);
  j.thF.setAttribute("transform", `rotate(${-p.thF})`);
  j.shF.setAttribute("transform", `translate(0 42) rotate(${-p.shF})`);
  j.thB.setAttribute("transform", `rotate(${-p.thB})`);
  j.shB.setAttribute("transform", `translate(0 42) rotate(${-p.shB})`);
  const flutter = Math.sin(t / 700) * 3 + (p.walk || 0) * 6;
  if (j.cape) j.cape.setAttribute("transform", `rotate(${flutter} 0 -64)`);
  if (j.veil) j.veil.setAttribute("transform", `rotate(${flutter * 1.4 - 2} 0 -90)`);
  if (j.hairBack) j.hairBack.setAttribute("transform", `rotate(${flutter} 0 -88)`);
  if (j.skirt) j.skirt.setAttribute("transform", `rotate(${-p.lean * 0.5 + Math.sin(t / 500) * 1.2} 0 -8)`);
  for (const g of j.glowEls) g.setAttribute("opacity", p.glow ? (0.35 + 0.25 * Math.sin(t / 160)) * p.glow + 0.05 * p.glow : 0);
}

const mix = (a, b, k) => {
  const o = {};
  for (const key of Object.keys(STAND)) o[key] = lerp(a[key] ?? STAND[key], b[key] ?? STAND[key], k);
  return o;
};

// Walking: legs swing, arms counter-swing, the body bobs. The gait depends on the Soul.
function walkPose(base, phase, gait) {
  const s = Math.sin(phase), c = Math.cos(phase);
  return { ...base, walk: 1, dy: -2 * Math.abs(c), thF: 24 * s, shF: -12 - 16 * Math.max(0, Math.sin(phase + 1.4)),
    thB: -24 * s, shB: -12 - 16 * Math.max(0, Math.sin(phase + Math.PI + 1.4)),
    uaF: base.uaF + 16 * -s * (gait > 1 ? 0.6 : 1), uaB: base.uaB + 16 * s, lean: base.lean + 4 * gait };
}

// ---------------------------------------------------------------- the stage
export function mountPuppet(host, S, { lo = 1, hi = 11, mode = "chapter" } = {}) {
  const id = ++uid;
  const soul = S.cfg.soul;
  const G = GESTURES[soul] || GESTURES.open;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: `pp pp-${mode}`, role: "img", "aria-label": L("The soul's story, in shadow", "亡魂故事的剪影") });
  host.replaceChildren(svg);
  const defs = el("defs", {}, svg);
  const f = el("filter", { id: `sk-${id}`, x: "-20%", y: "-20%", width: "140%", height: "140%" }, defs);
  const turb = el("feTurbulence", { type: "fractalNoise", baseFrequency: "0.045", numOctaves: "2", seed: "1", result: "n" }, f);
  el("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "3.2" }, f);
  const f2 = el("filter", { id: `sk2-${id}`, x: "-20%", y: "-20%", width: "140%", height: "140%" }, defs);
  const turb2 = el("feTurbulence", { type: "fractalNoise", baseFrequency: "0.06", numOctaves: "2", seed: "7", result: "n" }, f2);
  el("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "6" }, f2);

  // ground: a sketched bank and the river beneath it, with the spaces of this stretch marked
  const far = hi === 11 && mode !== "portrait";
  const first = mode === "portrait" ? 0 : lo - 1, last = mode === "portrait" ? 1 : far ? 12 : hi;
  const X = sp => 70 + (sp - first) * ((W - 140) / Math.max(1, last - first));
  const gnd = el("g", { fill: "none", stroke: INK, "stroke-linecap": "round", filter: `url(#sk2-${id})` }, svg);
  el("path", { d: `M10 ${GROUND + 2} C120 ${GROUND - 4} 260 ${GROUND + 6} 400 ${GROUND} S540 ${GROUND - 2} 552 ${GROUND + 3}`, "stroke-width": 1.6, opacity: 0.8 }, gnd);
  for (let i = 0; i < 3; i++) el("path", { d: `M${20 + i * 14} ${GROUND + 22 + i * 12} C150 ${GROUND + 14 + i * 12} 300 ${GROUND + 30 + i * 12} 540 ${GROUND + 18 + i * 12}`, "stroke-width": 0.9, opacity: 0.45 - i * 0.1, class: `pp-water w${i}` }, gnd);
  for (let i = 0; i < 14; i++) el("path", { d: `M${30 + i * 38} ${GROUND + 6} l-7 9`, "stroke-width": 0.8, opacity: 0.35 }, gnd);
  if (mode !== "portrait") {
    const m = el("g", { "font-family": "IM Fell English SC, serif", "font-size": 13, fill: INK, "text-anchor": "middle", opacity: 0.65 }, svg);
    for (let sp = first; sp <= last; sp++) {
      el("path", { d: `M${X(sp)} ${GROUND - 3} l0 7`, stroke: INK, "stroke-width": 1.2 }, m);
      el("text", { x: X(sp), y: GROUND + 62 }, m).textContent = sp === 0 ? L("near shore", "此岸") : sp === 12 ? L("Far Shore", "彼岸") : sp;
    }
    if (far) {
      const fs = el("g", { class: "pp-shore" }, svg);
      el("circle", { cx: X(12), cy: GROUND - 120, r: 70, fill: WARM, opacity: 0.12 }, fs);
      el("use", { href: "#nb-light", x: X(12) - 14, y: GROUND - 150, width: 28, height: 34, style: `color:${INK}`, opacity: 0.6 }, fs);
    }
  }
  const lilies = el("g", { filter: `url(#sk2-${id})` }, svg);
  const shadow = el("ellipse", { cy: GROUND + 4, rx: 34, ry: 5, fill: INK, opacity: 0.15 }, svg);
  const ghost = el("use", { href: `#fig-${id}`, transform: "translate(3 2)", opacity: 0.18, filter: `url(#sk2-${id})` }, svg);
  const pp = build(svg, soul, id);
  svg.appendChild(ghost);   // keep the faint second line above the ground, behind nothing important
  const words = el("g", {}, svg);
  const label = el("text", { x: W - 12, y: 26, "text-anchor": "end", "font-family": "IM Fell English, serif", "font-style": "italic", "font-size": 15, fill: INK, opacity: 0.7 }, svg);

  // ---------------------------------------------------------------- timeline
  let x = X(first), pose = { ...G.idle }, from = pose, target = pose, segStart = 0, segDur = 1, alive = true, raf = 0;
  let queue = [], current = null, walkFrom = x, walkTo = x, walking = false, shiver = false, t0 = performance.now();

  const lily = sp => {
    if (sp <= 0 || sp >= 12) return;
    const g = el("g", { class: "pp-lily" }, lilies);
    el("path", { d: `M${X(sp)} ${GROUND} C${X(sp) - 3} ${GROUND - 20} ${X(sp) + 2} ${GROUND - 34} ${X(sp)} ${GROUND - 46}`, stroke: INK, "stroke-width": 1.4, fill: "none" }, g);
    el("use", { href: "#nb-bloom", x: X(sp) - 14, y: GROUND - 70, width: 28, height: 28, style: `color:${RED}` }, g);
  };
  const rise = (text, cls) => {
    const tx = el("text", { x: Math.min(W - 140, Math.max(140, x)), y: 70, "text-anchor": "middle", class: `pp-word ${cls || ""}`,
      "font-family": "IM Fell English, serif", "font-style": "italic", "font-size": 19, fill: cls === "x" ? RED : INK }, words);
    tx.textContent = text.length > 54 ? text.slice(0, 52) + "…" : text;
    setTimeout(() => tx.remove(), 3400);
  };
  const flower = () => {
    if (!pp.j.flower) return;
    const fl = el("use", { href: "#nb-bloom", x: x + 30, y: GROUND - 230, width: 20, height: 20, style: `color:${RED}`, class: "pp-drift" }, words);
    setTimeout(() => fl.remove(), 3000);
  };

  // Each action is { kind, ... } and runs as one or more pose segments.
  function moveTo(p, ms, opts = {}) { queue.push({ p, ms, ...opts }); }
  function gesture(list) { for (const [p, ms, fx] of list) moveTo(p, ms, { fx }); }

  function script() {
    queue = [];
    x = X(first);
    lilies.replaceChildren();
    words.replaceChildren();
    if (mode === "portrait") {
      x = W / 2;
      moveTo(G.idle, 1800);
      gesture(G.sign);
      moveTo(G.idle, 1600);
      return;
    }
    const steps = mode === "epilogue" ? epilogueSteps() : stepsFor(S, lo, hi);
    if (!steps.length) { moveTo({ ...G.idle, alpha: 0.4 }, 2000, { label: S.result ? L("never reached", "未曾抵達") : L("not yet reached", "尚未抵達") }); return; }
    moveTo(G.idle, 900);
    for (const e of steps) {
      const label = e.t ? L(`Turn ${e.t}`, `第${e.t}回合`) : "";
      if (e.k === "m") queue.push({ walk: X(Math.min(e.to, last)), from: e.f, b: e.b, label });
      else if (e.k === "p") { gesture((G.look || [[FLINCH, 600]]).map(([p, ms]) => [p, ms])); queue.push({ walk: X(e.to), back: true, label, say: L("pulled back toward the living", "被拉回生者的方向") }); }
      else if (e.k === "w") moveTo({ ...G.idle, nod: -8 }, 1200, { label });
      else if (e.k === "l") { moveTo(G.idle, 300, { label, say: L("lingers, and forgets…", "徘徊，並遺忘了…") }); gesture(G.linger); moveTo(G.idle, 700); }
      else if (e.k === "x") { moveTo(FLINCH, 350, { label, say: L("a Fracture", "一道裂痕"), sayCls: "x", fx: "crack" }); moveTo(FLINCH, 700); moveTo(G.idle, 600); }
      else if (e.k === "i") { moveTo(G.idle, 300, { label, say: L(`“${cardBand(e.cid)}”`, `「${cardBand(e.cid)}」`) }); gesture(G.sign); moveTo(G.idle, 700); }
      else if (e.k === "win") { moveTo(OPEN_ARMS, 1200, { say: L("the Far Shore", "彼岸") }); moveTo(OPEN_ARMS, 2200); }
      else if (e.k === "end") { moveTo(FLINCH, 600, { say: (zh() ? { Faded: "消散", Shattered: "破碎", Deluge: "被洪水吞沒", Stalled: "靜止" } : { Faded: "faded", Shattered: "shattered", Deluge: "lost to the flood", Stalled: "still" })[e.cause] || "", sayCls: "x" }); moveTo(FALLEN, 1800); moveTo(FALLEN, 1600); }
    }
    moveTo(G.idle, 600);
  }

  // The epilogue tells the whole crossing in a few beats.
  function epilogueSteps() {
    const t = S.trail || [];
    const end = t.at(-1);
    const out = [{ k: "m", f: 0, to: Math.min(S.soul, 12), b: 0 }];
    const ins = t.filter(e => e.k === "i").slice(-2);
    out.push(...ins.map(e => ({ ...e, t: 0 })));
    if (end) out.push({ ...end, t: 0 });
    return out;
  }

  function next(now) {
    current = queue.shift();
    if (!current) {
      svg.classList.add("pp-fade");
      setTimeout(() => { if (!alive) return; svg.classList.remove("pp-fade"); script(); next(performance.now()); }, 1500);
      current = { hold: true, ms: 1e9, p: pose };
    }
    from = { ...pose };
    segStart = now;
    shiver = current.fx === "shiver";
    if (current.label) label.textContent = current.label;
    if (current.say) rise(current.say, current.sayCls);
    if (current.fx === "release") flower();
    if (current.fx === "crack") { svg.classList.remove("pp-crack"); void svg.getBBox?.(); svg.classList.add("pp-crack"); }
    if (current.walk !== undefined) {
      walking = true;
      walkFrom = x;
      walkTo = current.walk;
      const spaces = Math.abs(walkTo - walkFrom) / ((W - 140) / Math.max(1, last - first));
      segDur = Math.min(7000, Math.max(700, 1150 * spaces / pp.L.gait));
      if (current.b > 0) lily(current.from);
      target = G.idle;
    } else {
      walking = false;
      target = current.p;
      segDur = current.ms;
    }
  }

  function frame(now) {
    if (!alive || !host.isConnected) { stop(); return; }
    const k = Math.min(1, (now - segStart) / segDur);
    if (walking) {
      x = lerp(walkFrom, walkTo, ease(k));
      const dir = walkTo >= walkFrom ? 1 : -1;
      const phase = (now - segStart) / (330 / pp.L.gait) * (current.back ? -1 : 1);
      pose = walkPose(G.idle, phase, pp.L.gait);
      pp.fig.setAttribute("transform", dir < 0 && !current.back ? `translate(${2 * x} 0) scale(-1 1)` : "");
    } else {
      pose = mix(from, target, ease(k));
      pp.fig.setAttribute("transform", "");
    }
    const t = now - t0;
    const breath = { ...pose, lean: pose.lean + Math.sin(t / 900) * 1.2, nod: pose.nod + Math.sin(t / 1300) * 1.5 };
    if (shiver) { breath.dx = Math.sin(t / 30) * 0.8; breath.uaF += Math.sin(t / 45) * 2; }
    if (soul === "child" && !walking) breath.dx = (breath.dx || 0) + Math.sin(t / 60) * 0.25;
    apply(pp, x, breath, t);
    shadow.setAttribute("cx", x);
    if (k >= 1 && !current.hold) next(now);
    raf = requestAnimationFrame(frame);
  }

  // The sketched edge "boils": the noise pattern changes a few times a second, like redrawn pencil lines.
  let seed = 1;
  const boil = setInterval(() => { seed = (seed % 5) + 1; turb.setAttribute("seed", seed); turb2.setAttribute("seed", seed + 6); }, 160);

  function stop() { alive = false; cancelAnimationFrame(raf); clearInterval(boil); }

  script();
  apply(pp, x, pose, 0);
  next(performance.now());
  raf = requestAnimationFrame(frame);
  return stop;
}
