// The story cards from the Card Compendium v0.2 and Soul Roster v3. The Keepsake and ending cards ship (cards.mjs adds
// them to the factory files; Rulebook sections 5 and 9). The rest is PARKED, with no rules yet, built on its own by
// parked.mjs: the chapter cards for the four authored Souls, and the Nameless Souls module
// (the generic Soul pool, Lives, Wounds, Last Wishes with their endings, and the two Wish tiles).
// The words are in data/compendium.json, parsed from the two design docs in both languages; card effects
// come from the web game's own shapes (cards.js), so their wording matches every other Memory card.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CARDS, SOULS } from "../../web/public/assets/cards.js";
import { ZH_SOULS } from "../../web/public/assets/zh.js";
import { ROOT, C, TAG_ICON, TAG_COL, esc, icon, artImg } from "./lib.mjs";

export const COMP = JSON.parse(readFileSync(join(ROOT, "print/factory/data/compendium.json"), "utf8"));
const NUM = ["I", "II", "III"];
const PAINT = { child: ["child-road", "child-fields", "child-lethe"], garland: ["garland-brook", "garland-wade", "garland-lethe"],
  king: ["king-field", "king-barge", "king-lake"], bride: ["bride-wedding", "bride-stair", "bride-shore"] };
const SOUL_KEYS = ["king", "garland", "bride", "child"];
const LETTER = { king: "K", garland: "G", bride: "B", child: "L" };   // the Souls' pack letters

export const W = {
  en: {
    soul: k => SOULS[k].name, reach: r => `Reach ${NUM[r]}`, keepsake: "Keepsake", chapter: i => `Chapter ${NUM[i]}`,
    ending: e => e === "H" ? "Hidden ending" : `Ending ${e}`, when: "Triggers when:", nameless: "Nameless Soul",
    life: "Life", key: "Key Memory", deck: "Uses", tags: ["Obsession", "Acceptance", "Oblivion"], wound: "Wound", wish: "Last Wish",
    wishNote: "Three endings: fulfilled and remembered (0–7 forgotten), fulfilled and hollow (8 or more), or unfulfilled.",
    wishEnd: ["Fulfilled, remembered", "Fulfilled, hollow", "Unfulfilled"], wishWhen: ["The Wish is fulfilled and 0–7 memories were forgotten.",
      "The Wish is fulfilled and 8 or more memories were forgotten.", "The Wish was not fulfilled."],
    tile: "Wish tile", tileText: (w, r) => `Acts as Fertile: the Root takes. Used only with the Wish ${w}: it replaces a random Fertile bank card of Reach ${NUM[r]} at setup, face up.`,
    back: { keepsake: "Keepsake", story: "Story", life: "Life", wound: "Wound", wish: "Last Wish" },
    lifeDeck: "Build the Memory deck from these 8 cards (the Key Memory sealed).",
  },
  zh: {
    soul: k => ZH_SOULS[k].name, reach: r => `第${["一", "二", "三"][r]}河段`, keepsake: "信物", chapter: i => `第${["一", "二", "三"][i]}章`,
    ending: e => e === "H" ? "隱藏結局" : `結局${e}`, when: "觸發條件：", nameless: "無名亡魂",
    life: "生平", key: "關鍵記憶", deck: "使用卡牌", tags: ["執念", "釋懷", "忘卻"], wound: "創傷", wish: "遺願",
    wishNote: "三種結局：達成且仍記得（遺忘0–7張）、達成但空洞（遺忘8張以上），或未達成。",
    wishEnd: ["達成，仍記得", "達成，空洞", "未達成"], wishWhen: ["遺願達成，且遺忘了0–7段記憶。", "遺願達成，且遺忘了8段或更多記憶。", "遺願未達成。"],
    tile: "遺願板塊", tileText: (w, r) => `視為沃土：根順利生長。僅在遺願「${w}」時使用：設置時以它取代第${["一", "二", "三"][r]}河段中隨機一張沃土河岸牌，面朝上。`,
    back: { keepsake: "信物", story: "故事", life: "生平", wound: "創傷", wish: "遺願" },
    lifeDeck: "以這8張牌組成記憶牌庫（關鍵記憶密封）。",
  },
};

export const COMP_CSS = `
.nbcard.story .frame { border-color: #b08a4e; }
.nbcard.story .art { flex: 1.25; }
.quote { background: ${C.bone}; color: ${C.ink}; border-radius: 1.2mm; padding: 2mm 2.4mm; font-family: var(--f-hand); font-style: italic; font-size: 8.6pt; line-height: 1.3; text-align: center; }
[lang="zh-Hant-TW"] .quote { font-style: normal; font-size: 8.4pt; line-height: 1.5; }
.etitle { font-family: var(--f-display); font-size: 12pt; color: ${C.bone}; text-align: center; line-height: 1.1; }
.etext { font-family: var(--f-hand); font-style: italic; font-size: 10.5pt; line-height: 1.22; color: #e3d8c3; text-align: center; }
[lang="zh-Hant-TW"] .etext { font-style: normal; font-size: 10.5pt; line-height: 1.38; }
.nbcard.hidden .frame { border-color: ${C.crimson}; }
.when { font-size: 10.5pt; line-height: 1.22; color: ${C.mist}; border-top: .2mm dashed rgba(154,148,140,.5); padding-top: 1mm; }
.when b { color: ${C.bone}; font-weight: 500; }
.keep { text-align: center; font-family: var(--f-serif); font-size: 11pt; line-height: 1.2; color: ${C.paper}; padding: 0 1mm; }
.uses { font-size: 6.6pt; line-height: 1.4; color: ${C.paper}; }
.uses b { font-weight: 500; }
.nbcard.wound .frame { border-color: #8a2e3a; }
.nbcard.wish .frame { border-color: #4f7d86; }
/* labelled backs */
.nbback .lart { position: absolute; inset: 0; opacity: .38; }
.nbback .lart img { width: 100%; height: 100%; object-fit: cover; }
.nbback .lframe { position: absolute; inset: 5mm; border: .35mm solid ${C.gilt}; border-radius: 2.6mm; }
.nbback .lframe::after { content: ""; position: absolute; inset: .8mm; border: .15mm solid rgba(138,109,72,.55); border-radius: 2mm; }
.nbback .lab2 { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; }
.nbback .lab2 .ic { width: 14mm; height: 14mm; display: block; margin: 0 auto 2mm; filter: drop-shadow(0 0 2mm #000); }
.nbback .lab2 b { display: block; font-family: var(--f-display); font-weight: 400; font-size: 17pt; letter-spacing: .12em; color: ${C.bone}; text-shadow: 0 0 3mm #000; }
`;

const id2 = n => String(n).padStart(2, "0");
const genById = Object.fromEntries(COMP.generic.map(g => [g.id, g]));
const TEMPLATE = Object.fromEntries(CARDS.map(c => [c.id, c]));

export function compendiumDecks(lang, { card, artBox, memoryFace, bankCard, T }) {
  const L = W[lang];
  const foot = (a, b) => `<div class="foot"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;

  // Keepsakes: 9 per Soul, 3 per Reach. Shared art; the Soul and the Reach are printed on the face for sorting.
  const keepsakes = [];
  for (const k of SOUL_KEYS) COMP.souls[k][lang].keepsakes.forEach((list, r) => list.forEach((name, i) => {
    const id = `KS-${LETTER[k]}${r + 1}${i + 1}`;
    keepsakes.push({ name: id, html: card("story", `
      <div class="kick">${L.keepsake} · ${L.reach(r)}</div>
      ${artBox("card-keepsake")}
      <div class="keep">${esc(name)}</div>
      <div class="band none"><span style="text-align:center;width:100%">${esc(L.soul(k))}</span></div>
      ${foot(L.soul(k), id)}`) });
  }));

  // Chapters: each uses that Reach's painting from the Soul's Book.
  const chapters = [];
  for (const k of SOUL_KEYS) COMP.souls[k][lang].chapters.forEach((q, i) => {
    const id = `CH-${LETTER[k]}${i + 1}`;
    chapters.push({ name: id, html: card("story", `
      <div class="kick">${L.chapter(i)}</div>
      <div class="etitle">${esc(L.soul(k))}</div>
      ${artBox(PAINT[k][i])}
      <div class="quote">${lang === "zh" ? "「" : "“"}${esc(q)}${lang === "zh" ? "」" : "”"}</div>
      ${foot(L.chapter(i), id)}`) });
  });

  // Endings: A–D for every Soul, plus the hidden one for the three adults. The Soul's portrait; the hidden ending its Lethe painting.
  const endings = [];
  for (const k of SOUL_KEYS) for (const e of COMP.souls[k][lang].endings) {
    const id = `EN-${LETTER[k]}${e.code}`;
    endings.push({ name: id, html: card(`story${e.code === "H" ? " hidden" : ""}`, `
      <div class="kick">${L.ending(e.code)} · ${esc(L.soul(k))}</div>
      ${artBox(e.code === "H" ? PAINT[k][2] : `soul-${k}`)}
      <div class="etitle">${esc(e.title)}</div>
      <div class="etext">${esc(e.text)}</div>
      <div class="when"><b>${L.when}</b> ${esc(e.trigger)}</div>
      ${foot(L.ending(e.code), id)}`) });
  }

  // The generic Soul pool: ordinary Memory cards (Memory back). The Key Memories G17–G24 show their Life's portrait.
  const tagArt = t => ["card-obsession", "card-acceptance", "card-oblivion"][t];
  const generic = COMP.generic.map(g => {
    const t = TEMPLATE[g.shape];
    const c = { ...t, id: g.id, tag: g.tag, slot: g.slot, band: g.band ? g.band.en : "", key: !!g.key };
    const Lc = lang === "zh" ? { ...T[lang], band: () => g.band.zh } : T[lang];
    return { name: g.id, html: memoryFace(Lc, c, L.nameless, g.life ? `life-${g.life}` : tagArt(g.tag)) };
  });

  // Lives: the Soul's portrait, its Key Memory and the 8 cards it plays with, and the epilogue line.
  const lives = COMP.lives.map((l, i) => {
    const ids = [l.key, ...l.uses], byTag = [0, 1, 2].map(t => ids.filter(x => genById[x].tag === t));
    const id = `LF${id2(i + 1)}`;
    return { name: `${id}-${l.slug}`, html: card("story", `
      <div class="top">${icon("nb-soul", C.bone)}<div class="nm">${esc(l.name[lang])}<small>${L.life} · ${L.nameless}</small></div><span class="id">${id}</span></div>
      ${artBox(`life-${l.slug}`)}
      <div class="uses">${byTag.map((list, t) => `<b style="color:${TAG_COL[t]}">${L.tags[t]}</b> ${list.map(x => x === l.key ? `<b>${x}</b> (${L.key})` : x).join(" ")}`).join("<br>")}<br><span style="color:${C.mist}">${L.lifeDeck}</span></div>
      <div class="quote">${lang === "zh" ? "「" : "“"}${esc(l.epilogue[lang])}${lang === "zh" ? "」" : "”"}</div>
      ${foot(L.life, id)}`) };
  });

  const wounds = COMP.wounds.map((w, i) => {
    const id = `WD${id2(i + 1)}`;
    return { name: id, html: card("wound", `
      <div class="top">${icon("nb-fracture", C.crimson)}<div class="nm">${esc(w.name[lang])}<small>${L.wound} · ${L.nameless}</small></div><span class="id">${id}</span></div>
      ${artBox("card-wound")}
      <div class="rules">${esc(w.text[lang])}</div>
      ${foot(L.wound, id)}`) };
  });

  const wishes = COMP.wishes.map((w, i) => {
    const id = `WS${id2(i + 1)}`;
    return { name: id, html: card("wish", `
      <div class="top">${icon("nb-light", C.cyan)}<div class="nm">${esc(w.name[lang])}<small>${L.wish} · ${L.nameless}</small></div><span class="id">${id}</span></div>
      ${artBox("card-wish")}
      <div class="rules">${esc(w.text[lang])}</div>
      <div class="band none"><span>${L.wishNote}</span></div>
      ${foot(L.wish, id)}`) };
  });

  // Wish endings: three per Wish, except Be Forgotten, which cannot be fulfilled while remembered (23 cards).
  const wishEnds = [];
  COMP.wishes.forEach((w, i) => w.endings.forEach((e, j) => {
    if (!e) return;
    const id = `WE${id2(i + 1)}${"ABC"[j]}`;
    wishEnds.push({ name: id, html: card("story wish", `
      <div class="kick">${L.wish} · ${esc(w.name[lang])}</div>
      ${artBox("card-wish")}
      <div class="etitle">${L.wishEnd[j]}</div>
      <div class="quote">${lang === "zh" ? "「" : "“"}${esc(e[lang])}${lang === "zh" ? "」" : "”"}</div>
      <div class="when">${L.wishWhen[j]}</div>
      ${foot(L.wish, id)}`) });
  }));

  // The two Wish tiles, as bank cards; each goes on the fog back of its Reach.
  const wishOf = { sea: COMP.wishes[0].name[lang], waiting: COMP.wishes[7].name[lang] };
  const tiles = COMP.wishTiles.map(t => ({ name: `bank-wish-${t.slug}`,
    html: bankCard(`card-bank-${t.slug}`, icon("nb-fertile", "#c9c1b2"), t.name[lang], L.tileText(wishOf[t.slug], t.reach), `${L.tile} · ${L.reach(t.reach)}`) }));

  return [
    ["cards-keepsake", keepsakes, "back-keepsake"],
    ["cards-chapter", chapters, "back-story"],
    ["cards-ending", endings, "back-story"],
    ["cards-nameless-memory", generic, "back-memory"],
    ["cards-life", lives, "back-life"],
    ["cards-wound", wounds, "back-wound"],
    ["cards-wish", wishes, "back-wish"],
    ["cards-wish-ending", wishEnds, "back-story"],
    ["cards-wish-tile", tiles, "back-bank-3 (the Sea), back-bank-2 (the Waiting Soul)"],
  ];
}

export function compendiumBacks(lang) {
  const L = W[lang];
  const lab = (name, art, ic, col, word) => ({ name: `back-${name}`, html: `<div class="nbback"><div class="lart">${artImg(art)}</div><div class="lframe"></div>
    <div class="lab2">${icon(ic, col)}<b>${esc(word)}</b></div></div>` });
  return [
    lab("keepsake", "card-keepsake", "nb-memorysite", C.bone, L.back.keepsake),
    lab("story", "back-soul", "nb-seal", C.crimson, L.back.story),
    lab("life", "soul-nameless", "nb-soul", C.bone, L.back.life),
    lab("wound", "card-wound", "nb-fracture", C.crimson, L.back.wound),
    lab("wish", "card-wish", "nb-light", C.cyan, L.back.wish),
  ];
}
