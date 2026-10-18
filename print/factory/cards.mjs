// Every card in the game, one per page at 63 x 88 mm plus 3 mm bleed (69 x 94 mm), fronts and backs, in either language.
// The faces are the design system's card template (web/public/assets/cardface.js), the same one the web table draws, and
// all text comes from the web game's data (cards.js and zh.js), so the printed cards always match the shipped rules.
import { CARDS, CORE_IDS, ECHO_IDS, SOUL_PACKS, SOULS, MIST, HARSH, GHOST, MANTLES, TILES } from "../../web/public/assets/cards.js";
import { T, cardKit, cardCSS, mistDeck, mistId, harshId, ghostId } from "../../web/public/assets/cardface.js";
import { BLEED, artImg, doc } from "./lib.mjs";

export { T };
export const CW = 63 + 2 * BLEED, CH = 88 + 2 * BLEED;
const kit = cardKit(artImg);
const CSS = cardCSS(BLEED);

const memoryCards = lang => [...CORE_IDS, ...ECHO_IDS, ...Object.values(SOUL_PACKS).flat()]
  .map(i => ({ name: CARDS[i].id, html: kit.memoryCard(T[lang], i) }));
function mistCards(lang) {
  const L = T[lang], out = [];
  MIST.forEach((_, r) => mistDeck(r).forEach((m, i) => out.push({ name: mistId(r, i), html: kit.mistFace(L, m, mistId(r, i), r, false) })));
  HARSH.forEach((m, i) => out.push({ name: harshId(i), html: kit.mistFace(L, m, harshId(i), 0, true) }));
  return out;
}
const ghostCards = lang => GHOST.map(([t, a], i) => ({ name: ghostId(i), html: kit.ghostFace(T[lang], t, a, ghostId(i)) }));
const mantleCards = lang => Object.keys(MANTLES).map(m => ({ name: `mantle-${m}`, html: kit.mantleFace(T[lang], m) }));
const soulCards = lang => Object.keys(SOULS).map(k => ({ name: `soul-${k}`, html: kit.soulFace(T[lang], k) }));
function bankCards(lang) {
  const names = ["fertile", "stony", "memory", "grave"], out = [];
  TILES.forEach(([, list], r) => list.forEach((t, i) => out.push({ name: `bank-${r + 1}-${String(i + 1).padStart(2, "0")}-${names[t]}`, html: kit.bankFace(T[lang], t, r) })));
  return out;
}
// Backs. Memory, Mist, Ghost and Soul use their painted backs; Mantles share the Soul back; bank cards are fog, one per Reach.
const backs = lang => [
  ...[["memory", "back-memory"], ["mist", "back-mist"], ["ghost", "back-ghost"], ["soul", "back-soul"], ["mantle", "back-soul"]]
    .map(([name, file]) => ({ name: `back-${name}`, html: kit.paintedBack(file) })),
  ...[0, 1, 2].map(r => ({ name: `back-bank-${r + 1}`, html: kit.fogBack(T[lang], r) })),
];

// Each deck as [file, cards, back]; the factory prints every card in a deck with that one back.
export function decks(lang) {
  return [
    ["cards-memory", memoryCards(lang), "back-memory"],
    ["cards-mist", mistCards(lang), "back-mist"],
    ["cards-ghost", ghostCards(lang), "back-ghost"],
    ["cards-mantle", mantleCards(lang), "back-mantle"],
    ["cards-soul", soulCards(lang), "back-soul"],
    ["cards-bank", bankCards(lang), "back-bank-1/2/3 by Reach"],
  ];
}
export const cardBacks = backs;
export const cardDoc = (lang, title, pages) => doc({ lang, title, w: CW, h: CH, css: CSS, pages });
// The card parts, for the parked story cards (parked.mjs).
export const parts = { card: kit.card, artBox: kit.artBox, memoryFace: kit.memoryFace, bankCard: kit.bankCard, CSS };
