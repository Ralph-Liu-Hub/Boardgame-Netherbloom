// The painted art (art/masters, web copies in assets/art/ made by web/tools/build_art.py): which painting goes where,
// and how a painting is cut to fit a frame without ever cropping a figure's head (the same rule as the print factory).
import { CARDS, ECHO_IDS, SOUL_PACKS } from "./cards.js";

export const artSrc = name => `assets/art/${name}.webp`;

// Where each figure's head sits: [top, bottom] as fractions of the painting's height (print/factory/lib.mjs HEADS).
export const HEADS = {
  "child-road": [.12, .25], "child-fields": [.18, .33], "child-lethe": [.15, .28],
  "garland-brook": [.13, .27], "garland-wade": [.13, .27], "garland-lethe": [.13, .24],
  "king-field": [.03, .20], "king-barge": [.17, .32], "king-lake": [.13, .30],
  "bride-wedding": [.05, .17], "bride-stair": [.08, .30], "bride-shore": [.08, .22],
  "nameless-road": [.13, .28], "nameless-mourners": [.12, .30], "nameless-lethe": [.12, .30],
  "soul-child": [.10, .42], "soul-garland": [.05, .28], "soul-king": [.04, .34], "soul-bride": [.03, .25], "soul-nameless": [.02, .25],
};

const SOUL_ART = { open: "nameless", child: "child", garland: "garland", king: "king", bride: "bride" };
const SOUL_PAINT = {
  open: ["nameless-road", "nameless-mourners", "nameless-lethe"], child: ["child-road", "child-fields", "child-lethe"],
  garland: ["garland-brook", "garland-wade", "garland-lethe"], king: ["king-field", "king-barge", "king-lake"],
  bride: ["bride-wedding", "bride-stair", "bride-shore"],
};
export const soulPortrait = soul => `soul-${SOUL_ART[soul] || "nameless"}`;
export const reachPainting = (soul, r) => (SOUL_PAINT[soul] || SOUL_PAINT.open)[Math.max(0, Math.min(2, r))];

// A Memory card's art window: core cards by thread; Echo and Soul-pack cards use their Soul's Book paintings
// (Oblivion cards keep the thread painting, the Key Memory gets the last Reach), as on the printed cards.
const TAG_ART = ["card-obsession", "card-acceptance", "card-oblivion"];
const packOf = {};
ECHO_IDS.forEach(i => { packOf[i] = "open"; });
Object.entries(SOUL_PACKS).forEach(([soul, ids]) => ids.forEach(i => { packOf[i] = soul; }));
export function cardArt(cid) {
  const c = CARDS[cid], soul = packOf[cid];
  if (!c) return TAG_ART[1];
  if (!soul || c.tag === 2) return TAG_ART[c.tag];
  const p = SOUL_PAINT[soul];
  return c.key ? p[2] : c.tag === 0 ? p[0] : p[1];
}
export const mistArt = (reach, harsh) => (harsh ? "card-harsh" : `card-mist-${Math.max(0, Math.min(2, reach)) + 1}`);
export const mantleArt = m => `card-mantle-${m}`;
export const BANK_ART = ["card-bank-fertile", "card-bank-stony", "card-bank-memory", "card-bank-grave"];

// An <img> that fills its frame. Paintings with a figure are re-aimed once loaded so the whole head stays in view.
export const artImg = (name, cls = "pa", pos = "50% 50%") =>
  `<img class="${cls}" src="${artSrc(name)}" alt="" decoding="async" draggable="false" style="object-position:${pos}"${HEADS[name] ? ` data-head="${HEADS[name]}" onload="nbFit(this)"` : ""}>`;

// Shift a cropped painting (object-fit: cover) so the head and a little headroom stay in the frame; show it whole if they cannot.
function fit(img) {
  const [t, b] = (img.dataset.head || "").split(",").map(Number), W = img.clientWidth, H = img.clientHeight, w = img.naturalWidth, h = img.naturalHeight;
  if (!W || !H || !w || !h || isNaN(t)) return;
  const v = H / (h * Math.max(W / w, H / h));
  if (v >= .999) return;
  if (v < (b - t) + .06) { img.style.objectFit = "contain"; return; }
  let top = Math.max(0, t - .06);
  if (top + v < b + .03) top = b + .03 - v;
  top = Math.min(top, 1 - v);
  img.style.objectPosition = `${img.style.objectPosition.split(" ")[0] || "50%"} ${(top / (1 - v) * 100).toFixed(1)}%`;
}
window.nbFit = img => requestAnimationFrame(() => fit(img));

// Warm the browser cache with the paintings a game is about to need.
export function preloadArt(names) {
  for (const n of new Set(names)) { const i = new Image(); i.decoding = "async"; i.src = artSrc(n); }
}
