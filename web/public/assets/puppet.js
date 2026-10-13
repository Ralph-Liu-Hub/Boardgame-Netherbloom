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
  // A small, thin child: big head, short limbs, a shawl over her head, a ragged short dress, bare feet.
  child: { scale: 0.82, head: 15.5, neck: 3, torso: 44, sh: 8, hip: 8, thigh: 29, shin: 27, ua: 23, fa: 21, limbW: 0.78,
    dress: "ragged", shawl: true, prop: "match", hair: "short", gait: 1.3, stride: 30, bob: 4, swing: 0.5, stoop: 4 },
  // Tall and slender, with a long neck, long loose hair, a flowing gown hemmed with flowers.
  garland: { scale: 1.06, head: 11, neck: 9, torso: 64, sh: 8.5, hip: 9, thigh: 49, shin: 49, ua: 37, fa: 34, limbW: 0.78,
    dress: "flowing", hair: "long", garland: true, prop: "flower", gait: 0.95, stride: 16, bob: 0.8, swing: 1.1, stoop: -2 },
  // Broad, heavy and old: wide shoulders in pauldrons, thick limbs, a robe, torn cape, crown and beard.
  king: { scale: 1.12, head: 13.5, neck: 3, torso: 72, sh: 18, hip: 14, thigh: 40, shin: 40, ua: 35, fa: 32, limbW: 1.35,
    dress: "robe", cape: true, pauldrons: true, crown: true, beard: true, prop: "sword", gait: 0.62, stride: 18, bob: 1, swing: 0.45, stoop: 5 },
  // Slight and upright, narrow-waisted, in a wide bell-shaped wedding gown with a long train and veil.
  bride: { scale: 1.0, head: 12, neck: 6, torso: 60, sh: 9, hip: 7, thigh: 45, shin: 45, ua: 34, fa: 32, limbW: 0.86,
    dress: "bell", train: true, veil: true, hair: "bun", prop: "bouquet", gait: 0.8, stride: 13, bob: 0.6, swing: 0.6, stoop: 0 },
  // A gaunt, hooded traveller with long limbs and a stoop, cloaked to the ankles, holding a lantern out.
  open: { scale: 1.14, head: 12.5, neck: 4, torso: 68, sh: 11, hip: 10, thigh: 48, shin: 46, ua: 38, fa: 36, limbW: 0.9,
    dress: "cloak", hood: true, prop: "lantern", gait: 0.85, stride: 20, bob: 1.6, swing: 0.4, stoop: 9 },
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
  const w = L.limbW, T = L.torso, LEG = L.thigh + L.shin, k = L.head / 13;
  const foot = (g, op) => part(g, `M-4 ${L.shin - 2} Q4 ${L.shin - 4} ${12 * Math.min(1.1, w + 0.2)} ${L.shin + 1} Q8 ${L.shin + 5} -4 ${L.shin + 4} Z`, op);

  // back leg
  j.thB = el("g", {}, root);
  part(j.thB, limb(L.thigh, 13 * w, 10 * w), { opacity: 0.82 });
  j.shB = el("g", {}, j.thB);
  part(j.shB, limb(L.shin, 10 * w, 7 * w), { opacity: 0.82 });
  foot(j.shB, { opacity: 0.82 });

  j.torso = el("g", {}, root);
  // capes, trains and veils sit behind the body
  j.back = el("g", {}, j.torso);
  if (L.cape) j.cape = part(j.back, `M-${L.sh * 0.3} -${T} C-${L.sh + 14} -${T * 0.6} -${L.sh + 30} ${LEG * 0.2} -${L.sh + 44} ${LEG + 4} L-10 ${LEG + 2} C-6 ${LEG * 0.4} 2 -${T * 0.4} ${L.sh * 0.3} -${T - 4} Z`, { opacity: 0.9 });
  if (L.train) j.train = part(j.back, `M-6 0 C-30 ${LEG * 0.5} -70 ${LEG * 0.85} -120 ${LEG + 4} L-20 ${LEG + 4} C-14 ${LEG * 0.6} -8 ${LEG * 0.3} -4 0 Z`, { opacity: 0.55 });
  if (L.veil) j.veil = part(j.back, `M-4 -${T + 30} C-40 -${T + 14} -76 -${T * 0.4} -130 ${LEG * 0.7} C-90 ${LEG * 0.6} -54 ${LEG * 0.2} -20 -${T * 0.6} C-12 -${T * 0.85} -6 -${T + 10} -2 -${T + 20} Z`, { opacity: 0.4 });
  if (L.hair === "long") j.hairBack = part(j.back, `M-6 -${T + L.neck + 2 * L.head} C-26 -${T + 8} -30 -${T * 0.5} -38 -${T * 0.15} C-26 -${T * 0.3} -18 -${T * 0.55} -10 -${T * 0.8} C-6 -${T * 0.95} -2 -${T + 8} 0 -${T + 12} Z`, { opacity: 0.95 });

  // back arm
  j.uaB = el("g", {}, j.torso);
  part(j.uaB, limb(L.ua, 10 * w, 8 * w), { opacity: 0.8 });
  j.faB = el("g", {}, j.uaB);
  part(j.faB, limb(L.fa, 8 * w, 7 * w), { opacity: 0.8 });
  el("circle", { cx: 0, cy: L.fa, r: 4.5 * Math.min(1.2, w + 0.1), fill: INK, opacity: 0.8 }, j.faB);

  // torso, from the hips (y 0) to the shoulders (y -T)
  part(j.torso, `M-${L.hip} -4 C-${L.hip + 3} -${T * 0.45} -${L.sh + 2} -${T * 0.8} -${L.sh} -${T} L${L.sh} -${T} C${L.sh + 2} -${T * 0.8} ${L.hip + 3} -${T * 0.45} ${L.hip} -4 Z`);
  if (L.pauldrons) for (const s of [-1, 1]) part(j.torso, `M${s * (L.sh - 6)} -${T + 3} C${s * (L.sh + 6)} -${T + 5} ${s * (L.sh + 9)} -${T - 6} ${s * (L.sh + 5)} -${T - 12} C${s * L.sh} -${T - 8} ${s * (L.sh - 6)} -${T - 6} ${s * (L.sh - 6)} -${T + 3} Z`);
  const hemFlowers = [];
  if (L.dress === "flowing") { j.skirt = part(j.torso, `M-10 -12 L10 -12 C16 ${LEG * 0.3} 22 ${LEG * 0.7} 30 ${LEG + 2} C10 ${LEG + 8} -14 ${LEG + 8} -40 ${LEG + 2} C-28 ${LEG * 0.7} -16 ${LEG * 0.3} -10 -12 Z`); hemFlowers.push(-30, -16, -2, 12, 24); }
  if (L.dress === "bell") j.skirt = part(j.torso, `M-8 -10 L8 -10 C20 ${LEG * 0.15} 40 ${LEG * 0.6} 44 ${LEG + 3} C16 ${LEG + 10} -20 ${LEG + 10} -46 ${LEG + 3} C-40 ${LEG * 0.6} -20 ${LEG * 0.15} -8 -10 Z`);
  if (L.dress === "ragged") j.skirt = part(j.torso, `M-11 -8 L11 -8 C15 ${LEG * 0.2} 20 ${LEG * 0.4} 24 ${LEG * 0.55} L18 ${LEG * 0.5} L14 ${LEG * 0.58} L8 ${LEG * 0.5} L2 ${LEG * 0.6} L-4 ${LEG * 0.5} L-10 ${LEG * 0.6} L-16 ${LEG * 0.5} L-24 ${LEG * 0.56} C-20 ${LEG * 0.4} -15 ${LEG * 0.2} -11 -8 Z`);
  if (L.dress === "robe") j.skirt = part(j.torso, `M-${L.hip + 2} -${T - 4} L${L.hip + 2} -${T - 4} C${L.hip + 8} -10 ${L.hip + 12} ${LEG * 0.5} ${L.hip + 16} ${LEG + 4} C${L.hip} ${LEG + 8} -${L.hip + 4} ${LEG + 8} -${L.hip + 20} ${LEG + 4} C-${L.hip + 14} ${LEG * 0.5} -${L.hip + 8} -10 -${L.hip + 2} -${T - 4} Z`);
  if (L.dress === "cloak") j.skirt = part(j.torso, `M-${L.sh + 4} -${T - 2} C-${L.sh} -${T + 6} ${L.sh} -${T + 6} ${L.sh + 4} -${T - 2} C${L.sh + 10} -10 ${L.sh + 12} ${LEG * 0.5} ${L.sh + 14} ${LEG - 2} C${L.sh} ${LEG + 4} -${L.sh + 4} ${LEG + 4} -${L.sh + 22} ${LEG - 2} C-${L.sh + 18} ${LEG * 0.5} -${L.sh + 12} -10 -${L.sh + 4} -${T - 2} Z`);
  if (L.dress === "robe") part(j.torso, `M-${L.hip + 1} -6 L${L.hip + 1} -6 L${L.hip + 1} -1 L-${L.hip + 1} -1 Z`, { fill: WARM, opacity: 0.55 });   // the king's belt
  for (const x of hemFlowers) el("circle", { cx: x, cy: LEG + 2 + Math.abs(x) * 0.05, r: 2.6, fill: RED }, j.torso);
  if (L.shawl) part(j.torso, `M-${L.sh + 7} -${T + 6} C-${L.sh + 11} -${T * 0.7} -${L.sh + 9} -${T * 0.45} -${L.sh + 3} -${T * 0.25} L${L.sh + 6} -${T * 0.38} C${L.sh + 9} -${T * 0.6} ${L.sh + 8} -${T * 0.85} ${L.sh + 4} -${T + 6} Z`);

  // head, drawn at the classic 13-unit size and scaled to this Soul's head
  j.head = el("g", {}, j.torso);
  const h = el("g", { transform: `scale(${k})` }, j.head);
  el("circle", { cx: 0, cy: -16, r: 13, fill: INK }, h);
  part(h, "M10 -18 L17 -14 L10 -11 Z");                                   // nose and chin profile
  part(h, `M-6 -4 L6 -4 L5 ${4 + L.neck / k} L-5 ${4 + L.neck / k} Z`);    // neck
  if (L.hair === "short") part(h, "M-13 -18 C-14 -32 4 -36 12 -26 C2 -28 -6 -24 -8 -12 Z");
  if (L.hair === "long") part(h, "M-13 -14 C-14 -34 8 -36 14 -24 C4 -28 -4 -22 -6 -10 Z");
  if (L.hair === "bun") el("circle", { cx: -12, cy: -26, r: 7, fill: INK }, h);
  if (L.hood) part(h, "M-20 -8 C-26 -36 -4 -48 14 -34 C19 -27 19 -18 16 -11 C8 -24 -4 -24 -6 -6 C-10 6 -18 8 -20 -8 Z");
  if (L.shawl) part(h, "M-17 -10 C-20 -36 2 -42 15 -29 C6 -31 -4 -27 -6 -9 Z");
  if (L.crown) part(h, "M-11 -27 L-9 -42 L-4 -33 L1 -44 L5 -33 L10 -42 L11 -27 Z");
  if (L.beard) part(h, "M0 -8 C4 4 10 10 16 4 C16 -4 13 -12 10 -12 Z");
  if (L.garland) for (let i = 0; i < 6; i++) el("circle", { cx: -11 + i * 4.4, cy: -28 - Math.sin(i / 5 * Math.PI) * 4, r: 2.6, fill: RED }, h);
  if (L.veil) part(h, "M-14 -22 C-6 -32 6 -32 12 -26 L10 -23 C4 -28 -6 -28 -12 -20 Z", { fill: WARM, opacity: 0.7 });   // a thin bridal circlet

  // front leg (the skirt covers both legs where there is one)
  j.thF = el("g", {}, root);
  part(j.thF, limb(L.thigh, 13 * w, 10 * w));
  j.shF = el("g", {}, j.thF);
  part(j.shF, limb(L.shin, 10 * w, 7 * w));
  foot(j.shF);
  if (j.skirt) root.appendChild(j.torso);

  // front arm and prop
  j.uaF = el("g", {}, j.torso);
  part(j.uaF, limb(L.ua, 10 * w, 8 * w));
  j.faF = el("g", {}, j.uaF);
  part(j.faF, limb(L.fa, 8 * w, 7 * w));
  el("circle", { cx: 0, cy: L.fa, r: 4.5 * Math.min(1.2, w + 0.1), fill: INK }, j.faF);
  const hand = el("g", { transform: `translate(0,${L.fa})` }, j.faF);
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
    el("rect", { x: -10, y: -2, width: 20, height: 3.5, fill: INK }, sw);
    el("path", { d: "M-3 2 L3 2 L2.5 84 L0 91 L-2.5 84 Z", fill: INK }, sw);
    el("rect", { x: -2, y: -13, width: 4, height: 11, fill: INK }, sw);
    el("circle", { cx: 0, cy: -15, r: 3, fill: INK }, sw);
    const g = el("circle", { cx: 0, cy: 44, r: 32, fill: WARM, opacity: 0, class: "pp-swordglow" }, sw);
    j.glowEls.push(g);
  } else if (L.prop === "lantern") {
    el("path", { d: "M0 0 L0 12", stroke: INK, "stroke-width": 1.5 }, hand);
    const lg = el("g", {}, hand);
    const halo = el("circle", { cx: 0, cy: 24, r: 24, fill: WARM, opacity: 0.25 }, lg);
    el("use", { href: "#nb-light", x: -10, y: 10, width: 20, height: 24, style: `color:${INK}` }, lg);
    j.glowEls.push(halo);
  } else if (L.prop === "bouquet") {
    for (const [x, y, r] of [[-3, -3, 3.4], [3, -5, 3], [0, -8, 2.8], [5, -1, 2.4]]) el("circle", { cx: x, cy: y, r, fill: RED, opacity: 0.85 }, hand);
    el("path", { d: "M0 0 L-2 9 M1 0 L2 9", stroke: INK, "stroke-width": 1.4 }, hand);
  }
  return { fig, root, j, L };
}

function apply(pp, x, p, t) {
  const { root, j, L } = pp;
  const s = L.scale * 1.32, LEG = L.thigh + L.shin, legK = LEG / 84;
  const hipY = GROUND - (LEG + 2) * s;
  root.setAttribute("transform", `translate(${x + p.dx * s} ${hipY + p.dy * legK * s}) scale(${s})`);
  root.setAttribute("opacity", p.alpha);
  j.torso.setAttribute("transform", `rotate(${p.lean + L.stoop})`);
  j.head.setAttribute("transform", `translate(0 -${L.torso + 4 + L.neck}) rotate(${p.nod + L.stoop * 0.6})`);
  j.uaF.setAttribute("transform", `translate(0 -${L.torso - 2}) rotate(${-p.uaF})`);
  j.faF.setAttribute("transform", `translate(0 ${L.ua}) rotate(${-p.faF})`);
  j.uaB.setAttribute("transform", `translate(0 -${L.torso - 2}) rotate(${-p.uaB})`);
  j.faB.setAttribute("transform", `translate(0 ${L.ua}) rotate(${-p.faB})`);
  j.thF.setAttribute("transform", `rotate(${-p.thF})`);
  j.shF.setAttribute("transform", `translate(0 ${L.thigh}) rotate(${-p.shF})`);
  j.thB.setAttribute("transform", `rotate(${-p.thB})`);
  j.shB.setAttribute("transform", `translate(0 ${L.thigh}) rotate(${-p.shB})`);
  const flutter = Math.sin(t / 700) * 3 + (p.walk || 0) * 6;
  if (j.cape) j.cape.setAttribute("transform", `rotate(${flutter} 0 -${L.torso})`);
  if (j.veil) j.veil.setAttribute("transform", `rotate(${flutter * 1.4 - 2} 0 -${L.torso + 24})`);
  if (j.train) j.train.setAttribute("transform", `skewX(${-flutter * 0.8})`);
  if (j.hairBack) j.hairBack.setAttribute("transform", `rotate(${flutter} 0 -${L.torso + 10})`);
  if (j.skirt) j.skirt.setAttribute("transform", `rotate(${-p.lean * 0.5 + Math.sin(t / 500) * 1.2} 0 -8)`);
  for (const g of j.glowEls) g.setAttribute("opacity", p.glow ? (0.35 + 0.25 * Math.sin(t / 160)) * p.glow + 0.05 * p.glow : 0);
}

const mix = (a, b, k) => {
  const o = {};
  for (const key of Object.keys(STAND)) o[key] = lerp(a[key] ?? STAND[key], b[key] ?? STAND[key], k);
  return o;
};

// Walking: legs swing, arms counter-swing, the body bobs. The gait depends on the Soul.
function walkPose(base, phase, L) {
  const s = Math.sin(phase), c = Math.cos(phase), st = L.stride;
  return { ...base, walk: 1, dy: -L.bob * Math.abs(c), thF: st * s, shF: -12 - 16 * Math.max(0, Math.sin(phase + 1.4)),
    thB: -st * s, shB: -12 - 16 * Math.max(0, Math.sin(phase + Math.PI + 1.4)),
    uaF: base.uaF + 16 * L.swing * -s, uaB: base.uaB + 16 * L.swing * s, lean: base.lean + 4 * L.gait };
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
      pose = walkPose(G.idle, phase, pp.L);
      pp.fig.setAttribute("transform", dir < 0 && !current.back ? `translate(${2 * x} 0) scale(-1 1)` : "");
    } else {
      pose = mix(from, target, ease(k));
      pp.fig.setAttribute("transform", "");
    }
    const t = now - t0;
    const breath = { ...pose, lean: pose.lean + Math.sin(t / 900) * 1.2, nod: pose.nod + Math.sin(t / 1300) * 1.5 };
    if (shiver) { breath.dx = Math.sin(t / 30) * 0.8; breath.uaF += Math.sin(t / 45) * 2; }
    if (!walking) {
      // Each Soul has its own small habits while it waits.
      if (soul === "child") breath.dx = (breath.dx || 0) + Math.sin(t / 60) * 0.25;                       // shivering
      if (soul === "garland") { breath.dx = (breath.dx || 0) + Math.sin(t / 1100) * 3; breath.lean += Math.sin(t / 1100) * 2.5; breath.nod += Math.sin(t / 900) * 3; }   // swaying to her song
      if (soul === "king") { breath.nod += Math.sin(t / 2600) * 2; breath.lean += Math.sin(t / 2600) * 0.8; }   // slow, heavy breath
      if (soul === "bride") { const c = t % 7000; if (c < 1600) { const k = Math.sin(Math.PI * c / 1600); breath.nod -= 22 * k; breath.lean -= 6 * k; } }   // a glance back over her shoulder
      if (soul === "open") { breath.uaF += Math.sin(t / 850) * 4; breath.faF += Math.sin(t / 850 + 1) * 3; }  // the lantern sways
    }
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
