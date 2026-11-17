// Exports every printed card, tile and Book page of Netherbloom V5 in both languages as JSON, from the same data the
// web table uses (web/public/assets), so the printed game always matches the game online.
//   node print/v5/export_data.mjs  ->  print/v5/out/data.json
// The few helpers below are copied from web/public/assets/table.js (card faces); keep them in step with it.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CARDS, OBL, opText } from "../../web/public/assets/cards.js";
import { ZH_CARD_NAMES, ZH_BANDS, zhOpText } from "../../web/public/assets/zh.js";
import { STORY, PULL } from "../../web/public/assets/table-story.js";
import { STORY_EN } from "../../web/public/assets/table-story-en.js";
import { PROLOGUE } from "../../web/public/assets/table-prologue.js";
import * as D from "../../web/public/assets/table-data.js";

const HERE = dirname(fileURLToPath(import.meta.url));

// ---- from table.js: Memory cards
const V5_TEXT = {
  vigil: ["點亮 1 段記憶，不必支付光", "Light 1 memory for free"],
  cross: ["亡魂立即前進一格，即使該格未照亮，或兩岸都有怨念（有黑水的格子不行）。不得光；進入未照亮的格子時承受 1 道裂痕",
    "The soul steps forward at once, even onto an unlit space or past Shades on both banks (never onto Black Water). No Light; entering an unlit space costs 1 Fracture"],
};
const opLine = (op, lang) => V5_TEXT[op[0]] ? V5_TEXT[op[0]][lang === "en" ? 1 : 0] : (lang === "en" ? opText(op) : zhOpText(op));
const opsLine = (ops, lang) => ops.map(o => opLine(o, lang)).join(lang === "en" ? ". " : "。") + (lang === "en" ? "." : "。");
const MEM = {};
for (const c of CARDS) if (c.id !== "C27") MEM[c.id] = c;
MEM.C33 = { id: "C33", name: "Lightless Crossing", tag: OBL, eff: [["cross"]], res: [["light", 1]], slot: null, band: "", key: false };
const zhName = c => (c.id === "C33" ? "無光之渡" : ZH_CARD_NAMES[c.name] || c.name);
const TRAIT_ZH = { garland: "散花：亡魂離開一格時，那一格只要有 1 朵花，就可以留成光牆；只有一朵花的光牆只擋 1 點霧勢。" };
const PACK = { open: "E", child: "L", garland: "G-", king: "K", bride: "B" };
const SOUL_PAINT = {
  open: ["nameless-road", "nameless-mourners", "nameless-lethe"], child: ["child-road", "child-fields", "child-lethe"],
  garland: ["garland-brook", "garland-wade", "garland-lethe"], king: ["king-field", "king-barge", "king-lake"],
  bride: ["bride-wedding", "bride-stair", "bride-shore"],
};
const TAG_ART = ["card-obsession", "card-acceptance", "card-oblivion"];
function memSoul(card) { return Object.keys(PACK).find(k => card.id.startsWith(PACK[k]) && (k !== "garland" || card.id.startsWith("G-"))); }
function memArt(card) {
  const soul = memSoul(card);
  if (!soul || card.id[0] === "C" || card.tag === 2) return TAG_ART[card.tag] || TAG_ART[1];
  const pp = SOUL_PAINT[soul];
  return card.key ? pp[2] : card.tag === 0 ? pp[0] : pp[1];
}
const T = (zh, en) => ({ zh, en });

const out = { pull: PULL, threads: D.THREADS, slots: D.SLOT_NAMES, reaches: D.REACHES, levels: D.LEVELS, soulOrder: D.SOUL_ORDER,
  soulEn: D.SOUL_EN, soulArt: D.SOUL_ART, soulPaint: SOUL_PAINT, backlash: T(D.BACKLASH, D.BACKLASH_EN) };

// Memory cards, deck order: core, then each Soul's pack
out.memory = Object.values(MEM).map(c => {
  const soul = c.id[0] === "C" ? null : memSoul(c);
  return { id: c.id, soul, tag: c.tag, key: !!c.key, slot: c.slot, rr: !!c.rr, art: memArt(c),
    name: T(zhName(c), c.name), band: T(ZH_BANDS[c.id] || c.band || "", c.band || ""),
    eff: T(opsLine(c.eff, "zh"), opsLine(c.eff, "en")), res: T(opsLine(c.res, "zh"), opsLine(c.res, "en")) };
});

// Mist cards: the three chapter decks, then the harsh mist
out.mist = [];
D.MIST_DECKS.forEach((deck, di) => deck.forEach(([k, n]) => { for (let i = 0; i < n; i++) out.mist.push({ ...D.MIST_CARDS[k], deck: di, harsh: false }); }));
D.HARSH_CARDS.forEach(h => out.mist.push({ ...h, deck: null, harsh: true }));
out.deckNames = D.DECK_NAMES;

// Fate Mist, Commission, ending and Soul cards, per Soul
out.souls = {};
for (const s of D.SOUL_ORDER) {
  const zh = STORY[s], en = STORY_EN[s];
  out.souls[s] = {
    name: T(zh.name, D.SOUL_EN[s]), trait: T(TRAIT_ZH[s] || zh.trait.replace(/（同 V4\.0[^）]*）/, ""), en.trait),
    keymem: T(zh.keymem || "", en.keymem || ""), startLight: D.START_LIGHT[s],
    prologue: PROLOGUE[s] || PROLOGUE.open,
    chapters: zh.chapters.map((c, ci) => ({ zh: c, en: en.chapters[ci] })),
    fates: zh.chapters.flatMap((c, ci) => c.fates.map((f, fi) => ({ chapter: ci, zh: f, en: en.chapters[ci].fates[fi] }))),
    commissions: zh.commissions.map((k, i) => ({ zh: k, en: en.commissions[i] })),
    endings: zh.endings ? Object.keys(zh.endings).map(b => ({ kind: b, zh: zh.endings[b], en: en.endings[b] })) : [],
    hidden: zh.hidden ? { zh: zh.hidden, en: en.hidden } : null,
    fatelines: { zh: zh.fatelines || [], en: en.fatelines || [] }, keylines: { zh: zh.keylines || [], en: en.keylines || [] },
    blurb: { zh: zh.blurb || "", en: en.blurb || "" },
  };
}
out.mantles = D.MANTLES;
out.ghost = D.GHOST;
out.tiles = { kinds: D.TILE_KINDS, pools: D.TILE_POOLS, spares: D.SPARE_TILES, graves: 3 };

mkdirSync(join(HERE, "out"), { recursive: true });
writeFileSync(join(HERE, "out", "data.json"), JSON.stringify(out, null, 1));
const n = out.memory.length + out.mist.length + Object.values(out.souls).reduce((a, s) => a + s.fates.length + s.commissions.length + s.endings.length + (s.hidden ? 1 : 0), 0);
console.log("memory", out.memory.length, "mist", out.mist.length, "fate", Object.values(out.souls).reduce((a, s) => a + s.fates.length, 0),
  "commission", Object.values(out.souls).reduce((a, s) => a + s.commissions.length, 0),
  "ending", Object.values(out.souls).reduce((a, s) => a + s.endings.length + (s.hidden ? 1 : 0), 0), "cards incl. those", n);
