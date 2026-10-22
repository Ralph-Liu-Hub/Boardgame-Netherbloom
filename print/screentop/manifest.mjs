// Lists every Screentop variant in sheet order, from the same card data the printed cards use, and writes
// print/out/screentop/manifest.json for sheets.py. Usage: node print/screentop/manifest.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CARDS, CORE_IDS, ECHO_IDS, SOUL_PACKS, SOULS, MANTLES, GHOST, TILES, TILE_NAMES, TAG_NAMES } from "../../web/public/assets/cards.js";
import { mistDeck, mistId, harshId, ghostId } from "../../web/public/assets/cardface.js";
import { HARSH } from "../../web/public/assets/cards.js";
import { TOKENS, BIG, SMALL } from "../factory/tokens.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "print/out/screentop");
const PACK = { ...Object.fromEntries(ECHO_IDS.map(i => [i, "Echo"])), ...Object.fromEntries(Object.entries(SOUL_PACKS).flatMap(([k, ids]) => ids.map(i => [i, SOULS[k].name]))) };
const memory = [...CORE_IDS, ...ECHO_IDS, ...Object.values(SOUL_PACKS).flat()].map(i => {
  const c = CARDS[i];
  return { file: `cards/cards-memory_png/${c.id}.png`, name: `${PACK[i] || "Core"} · ${c.id} ${c.name}${c.key ? " (Key Memory)" : ""}`, tag: TAG_NAMES[c.tag] };
});
const mist = [0, 1, 2].flatMap(r => mistDeck(r).map(([n], j) => ({ file: `cards/cards-mist_png/${mistId(r, j)}.png`, name: `Reach ${["I", "II", "III"][r]} · ${n}`, reach: r })))
  .concat(HARSH.map(([n], j) => ({ file: `cards/cards-mist_png/${harshId(j)}.png`, name: `Harsh · ${n}`, reach: 3 })));
const ghost = GHOST.map((g, j) => ({ file: `cards/cards-ghost_png/${ghostId(j)}.png`, name: `Ghost ${j + 1} · ${TAG_NAMES[g[0]]}` }));
const KIND = ["fertile", "stony", "memory", "grave"];
const bank = TILES.flatMap(([, kinds], r) => kinds.map((t, j) => ({ file: `cards/cards-bank_png/bank-${r + 1}-${String(j + 1).padStart(2, "0")}-${KIND[t]}.png`, name: `Reach ${["I", "II", "III"][r]} · ${TILE_NAMES[t]}`, reach: r })));
const souls = ["child", "garland", "king", "bride", "open"].map(k => ({ file: `cards/cards-soul_png/soul-${k}.png`, name: `Soul · ${SOULS[k].name}` }));
const mantles = Object.keys(MANTLES).map(m => ({ file: `cards/cards-mantle_png/mantle-${m}.png`, name: `Mantle · ${MANTLES[m].name}` }));

// Tokens: where each disc sits on the punchboard (the same layout as tokens.mjs), so they can be cut out.
const discs = [];
{
  const SW = 297; let y = 14;
  for (const big of [true, false]) {
    const d = big ? BIG : SMALL, pitch = d + 4; let x = 14;
    for (const t of TOKENS.filter(t => (t[5] === BIG) === big))
      for (let i = 0; i < t[4]; i++) {
        if (x + d > SW - 12) { x = 14; y += pitch; }
        discs.push({ t, cx: x + d / 2, cy: y + d / 2, d });
        x += pitch;
      }
    y += pitch;
  }
}
const TOKEN_NAMES = { "nb-tok-oar": "Oar", "nb-tok-push": "Push Through", "nb-tok-hold": "Hold Fast", "nb-tok-shield": "Shield", "nb-tok-resign": "Resignation",
  "nb-soul": "Soul / Ghost", "nb-root": "Root / Bloom", "nb-grievance": "Shade", "nb-blackwater": "Black Water", "nb-fracture": "Fracture", "nb-light": "Light", "nb-knot": "Knot", "nb-echo": "Echo" };
const seen = new Set(), tokenTypes = [];
for (const disc of discs) if (!seen.has(disc.t[0])) { seen.add(disc.t[0]); tokenTypes.push({ id: disc.t[0], name: TOKEN_NAMES[disc.t[0]], count: disc.t[4], d: disc.d, cx: disc.cx, cy: disc.cy, twoSided: disc.t[0] !== disc.t[2] || disc.t[1] !== disc.t[3] }); }

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "manifest.json"), JSON.stringify({ memory, mist, ghost, bank, souls, mantles, tokenTypes }, null, 1));
console.log(`memory ${memory.length}, mist ${mist.length}, ghost ${ghost.length}, bank ${bank.length}, souls ${souls.length}, mantles ${mantles.length}, token types ${tokenTypes.length}`);
