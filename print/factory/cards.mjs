// Every card in the game, one per page at 63 x 88 mm plus 3 mm bleed (69 x 94 mm), fronts and backs, in either language.
// All text comes from the web game's data (web/public/assets/cards.js and zh.js), so it always matches the shipped rules.
import {
  CARDS, CORE_IDS, ECHO_IDS, SOUL_PACKS, SOULS, MIST, HARSH, MIST_EXTRA, MIST_TEXT, GHOST, MANTLES, TILES, TILE_NAMES, REACH_NAMES, opsText, FIRST_SOUL,
} from "../../web/public/assets/cards.js";
import { ZH_TAGS, ZH_SLOTS, ZH_TILES, ZH_REACHES, ZH_CARD_NAMES, ZH_BANDS, ZH_SOULS, ZH_MIST, ZH_MANTLES, zhOpsText } from "../../web/public/assets/zh.js";
import { BLEED, C, TAG_COL, TAG_ICON, SLOT_ICON, esc, icon, artImg, doc } from "./lib.mjs";
import { compendiumDecks, compendiumBacks, COMP_CSS, setCardLang } from "./compendium.mjs";

export const CW = 63 + 2 * BLEED, CH = 88 + 2 * BLEED;
const NUM = ["I", "II", "III"];

// ---------------------------------------------------------------- words, per language
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
function mistOpEn(op) {
  switch (op[0]) {
    case "bw": return `Place 1 Black Water ${op[1]} ${op[1] === 1 ? "space" : "spaces"} ahead of the soul (if that space is flooded, the next one)`;
    case "grv": return `Place 1 Grievance on the ${op[2] ? "right" : "left"} bank ${op[1]} ${op[1] === 1 ? "space" : "spaces"} ahead of the soul`;
    case "grv_near": return "Place 1 Grievance on the soul's space (left bank first; if both are taken, the left bank of the next space)";
    case "wither": return `The ${plural(op[1], "Bloom")} furthest ahead of the soul wither to Roots`;
    case "wither_far": return `Every Bloom more than ${op[1]} spaces ahead of the soul withers to a Root`;
    case "wither_at": return `The Bloom ${op[1]} ${op[1] === 1 ? "space" : "spaces"} ahead of the soul withers to a Root`;
    case "fog": return `Turn the ${plural(op[1], "furthest revealed empty bank")} back to fog`;
    case "forget": return `Forget the top ${plural(op[1], "card")} of the deck`;
    case "sever": return "Remove the Echo from the Loom";
    case "karma_all": return "Tie 1 knot on every thread";
    case "dark_wind": return "Lose 2 Light; with less than 2 Light, suffer 1 Fracture instead";
  }
  return op[0];
}
function mistOpZh(op) {
  switch (op[0]) {
    case "bw": return `在亡魂前方第${op[1]}格放置1個黑水（該格已淹沒則放在下一格）`;
    case "grv": return `在亡魂前方第${op[1]}格的${op[2] ? "右岸" : "左岸"}放置1個怨念`;
    case "grv_near": return "在亡魂所在格放置1個怨念（左岸優先；兩岸都有時，放在下一格的左岸）";
    case "wither": return `亡魂前方最遠的${op[1]}朵花凋零為根`;
    case "wither_far": return `亡魂前方第${op[1]}格以外的所有花凋零為根`;
    case "wither_at": return `亡魂前方第${op[1]}格的花凋零為根`;
    case "fog": return `前方最遠的${op[1]}個已掀開且空著的河岸重新蓋上霧`;
    case "forget": return `遺忘牌庫頂的${op[1]}張牌`;
    case "sever": return "將迴響從織機上移除";
    case "karma_all": return "每條絲線各打1個結";
    case "dark_wind": return "失去2點光；光不足2點時，改為承受1道裂痕";
  }
  return op[0];
}
const GHOST_ACT = {
  en: { root_far: "Roots on the furthest open bank.", root_near: "Roots on the nearest open bank.", bloom_near: "Blooms the nearest Root.",
    bloom_far: "Blooms the furthest Root.", banish_forget: "Banishes the nearest Grievance, or drains Black Water.", none: "Does nothing." },
  zh: { root_far: "在最遠的空河岸扎根。", root_near: "在最近的空河岸扎根。", bloom_near: "使最近的根綻放。",
    bloom_far: "使最遠的根綻放。", banish_forget: "驅散最近的怨念，或排乾黑水。", none: "不採取行動。" },
};
const SOUL_ART = { open: "nameless", child: "child", garland: "garland", king: "king", bride: "bride" };
const SOUL_PAINT = {
  open: ["nameless-road", "nameless-mourners", "nameless-lethe"], child: ["child-road", "child-fields", "child-lethe"],
  garland: ["garland-brook", "garland-wade", "garland-lethe"], king: ["king-field", "king-barge", "king-lake"],
  bride: ["bride-wedding", "bride-stair", "bride-shore"],
};

export const T = {
  en: {
    tag: ["Obsession", "Acceptance", "Oblivion"], slot: s => s, name: n => n, band: c => c.band, ops: opsText,
    res: "Resonance:", resInstead: "instead, ", key: "Key Memory", oblNote: "An Oblivion card is forgotten after use.",
    soul: k => SOULS[k], soulKick: k => `Soul${k === FIRST_SOUL ? " · first game" : ""}`, twist: "Twist:",
    soulNote: k => k === "open" ? "Add the 8 Echo cards." : "Add this Soul's 8 cards (1 Key Memory).",
    mist: n => [n, MIST_TEXT[n]], mistOp: mistOpEn, mistJoin: ops => ops.length ? ops.map(mistOpEn).join(". ") + "." : "No effect.",
    mistKick: h => h ? "Harsh Mist" : "Mist", reach: r => `Reach ${NUM[r]}`, harsh: "Harsh",
    ghostKick: "Ghost · solo", ghostName: t => ["The Ghost Roots", "The Ghost Blooms", "The Ghost Forgets"][t], ghostAct: a => GHOST_ACT.en[a],
    ghostNote: t => `Tie a knot on the ${["Obsession", "Acceptance", "Oblivion"][t]} thread; the Echo moves there.`,
    mantle: m => MANTLES[m], mantleKick: "Mantle", mantleNote: t => `Summon: pay 3 Light (2 with the King) and discard one ${["Obsession", "Acceptance", "Oblivion"][t]} card.`,
    tile: t => TILE_NAMES[t], tileText: ["The Root takes.", "An ordinary Root will not take, and the Root is lost. Stubborn Roots and the Root-Weaver can grow here.", "The Root takes and you find a keepsake. In the Open Crossing it also gives +2 Light.", "No Root grows, and a Grievance rises on that bank."],
    reachName: r => REACH_NAMES[r], fog: "Fog", bank: "Bank card", pack: { core: "Core", echo: "Echo · Open Crossing" },
    backWord: { mist: "Mist", ghost: "Ghost", soul: "Soul", mantle: "Mantle" },
  },
  zh: {
    tag: ZH_TAGS, slot: s => ZH_SLOTS[s], name: n => ZH_CARD_NAMES[n] || n, band: c => ZH_BANDS[c.id] || c.band, ops: zhOpsText,
    res: "共鳴：", resInstead: "改為", key: "關鍵記憶", oblNote: "忘卻牌使用後會被遺忘。",
    soul: k => ZH_SOULS[k], soulKick: k => `亡魂${k === FIRST_SOUL ? " · 新手推薦" : ""}`, twist: "特色規則：",
    soulNote: k => k === "open" ? "加入8張迴響牌。" : "加入此亡魂的8張專屬牌（含1張關鍵記憶）。",
    mist: n => ZH_MIST[n], mistOp: mistOpZh, mistJoin: ops => ops.length ? ops.map(mistOpZh).join("；") + "。" : "沒有任何效果。",
    mistKick: h => h ? "凶霧" : "迷霧", reach: r => `第${["一", "二", "三"][r]}河段`, harsh: "凶霧",
    ghostKick: "幽靈 · 單人模式", ghostName: t => ["幽靈扎根", "幽靈綻放", "幽靈遺忘"][t], ghostAct: a => GHOST_ACT.zh[a],
    ghostNote: t => `在${ZH_TAGS[t]}絲線上打一個結，並將迴響設為${ZH_TAGS[t]}。`,
    mantle: m => ZH_MANTLES[m], mantleKick: "稱號", mantleNote: t => `召喚：支付3點光（國王為2點），並棄掉一張${ZH_TAGS[t]}牌。`,
    tile: t => ZH_TILES[t], tileText: ["根順利生長。", "一般的根無法生長，該根就此失去。頑根與織根者則能在此生長。", "根順利生長，並且你們找到一件信物。在無名渡河中，它還會給予+2點光。", "根無法生長，且該河岸會升起一個怨念。"],
    reachName: r => ZH_REACHES[r], fog: "霧", bank: "河岸牌", pack: { core: "基本", echo: "迴響 · 無名渡河" },
    backWord: { mist: "迷霧", ghost: "幽靈", soul: "亡魂", mantle: "稱號" },
  },
};

setCardLang(T);

// ---------------------------------------------------------------- the card template (design system CardFaces)
const CSS = `
.card { position: absolute; inset: 0; background: ${C.ink}; color: ${C.paper}; }
.card .tex { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 35%, rgba(230,211,163,.06), transparent 60%), repeating-linear-gradient(170deg, rgba(255,255,255,.012) 0 .6mm, transparent .6mm 1.2mm); }
.card .frame { position: absolute; inset: 5mm; border: .35mm solid ${C.gilt}; border-radius: 2.6mm; }
.card .frame::after { content: ""; position: absolute; inset: .8mm; border: .15mm solid rgba(138,109,72,.55); border-radius: 2mm; }
.card .in { position: absolute; left: 6.6mm; right: 6.6mm; top: 6.4mm; bottom: 6.2mm; display: flex; flex-direction: column; gap: 1.6mm; }
.top { display: flex; align-items: center; gap: 1.8mm; }
.top .ic { width: 6.2mm; height: 6.2mm; }
.top .nm { flex: 1; font-family: var(--f-serif); font-size: 11.5pt; line-height: 1.05; color: ${C.paper}; }
.top .nm small { display: block; font-family: var(--f-mono); font-size: 5.4pt; letter-spacing: .14em; text-transform: uppercase; color: ${C.mist}; margin-top: .5mm; }
.top .id { font-family: var(--f-mono); font-size: 5.4pt; color: ${C.mist}; align-self: flex-start; }
.rules { font-size: 7.6pt; line-height: 1.32; color: ${C.paper}; }
.rules .res { display: block; margin-top: 1mm; padding: .9mm 1.3mm; border-radius: 1.2mm; background: rgba(230,211,163,.08); color: #ddd2bf; font-size: 7.1pt; }
.rules .res b { color: ${C.bone}; font-weight: 500; }
[lang="zh-Hant-TW"] .rules { font-size: 7.4pt; line-height: 1.45; }
.art { position: relative; flex: 1; min-height: 18mm; border-radius: 1.6mm; overflow: hidden; }
.art::after { content: ""; position: absolute; inset: 0; border-radius: 1.6mm; box-shadow: inset 0 0 0 .25mm rgba(138,109,72,.7), inset 0 0 4mm rgba(0,0,0,.6); }
.art .seal { z-index: 1; }
.art .seal { position: absolute; right: 1.2mm; bottom: 1.2mm; width: 7mm; height: 7mm; color: ${C.crimson}; filter: drop-shadow(0 0 1mm rgba(0,0,0,.8)); }
.band { display: flex; gap: 1.5mm; align-items: flex-start; background: ${C.bone}; color: ${C.ink}; border-radius: 1.2mm; padding: 1.3mm 1.6mm; min-height: 10.5mm; }
.band .ic { width: 4.2mm; height: 4.2mm; color: #5c4a3a; margin-top: .3mm; }
.band span { font-family: var(--f-hand); font-style: italic; font-size: 7.6pt; line-height: 1.25; }
.band span i { display: block; font-style: normal; font-family: var(--f-mono); font-size: 5pt; letter-spacing: .2em; text-transform: uppercase; color: #7a6450; margin-bottom: .3mm; }
[lang="zh-Hant-TW"] .band span { font-style: normal; font-size: 7.8pt; }
.band.none { background: transparent; color: ${C.mist}; border: .2mm dashed rgba(154,148,140,.5); min-height: 0; }
.band.none span { font-family: var(--f-body); font-style: normal; font-size: 6.6pt; }
.band.cyan { background: ${C.cyan}; }
.band.red { background: #e9b8bf; }
.foot { display: flex; justify-content: space-between; font-family: var(--f-mono); font-size: 4.8pt; letter-spacing: .12em; text-transform: uppercase; color: ${C.mist}; }
.card.mist .frame { border-color: #4f7d86; } .card.harsh .frame { border-color: #8a2e3a; }
.card.ghost .frame { border: .35mm dashed ${C.cyan}; }
.card.key .frame { border-color: #b08a4e; box-shadow: 0 0 0 .3mm rgba(215,38,61,.35); }
.kick { font-family: var(--f-mono); font-size: 5.4pt; letter-spacing: .3em; text-transform: uppercase; text-align: center; color: ${C.mist}; }
.c { text-align: center; }
.big { font-family: var(--f-display); font-size: 14pt; color: ${C.bone}; text-align: center; line-height: 1.1; }
.flav { font-family: var(--f-hand); font-style: italic; font-size: 8pt; color: #d8cdb8; text-align: center; line-height: 1.3; }
.note { font-size: 6.6pt; color: ${C.mist}; line-height: 1.35; }
/* full-art cards: Soul and bank */
.full { position: absolute; inset: 0; }
.full::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(14,12,17,0) 30%, rgba(14,12,17,.88) 66%, ${C.ink} 100%); }
.card.soulc .in { justify-content: flex-end; }
.card.soulc .in > * { position: relative; z-index: 1; }
.card.bank .lab { position: absolute; left: 0; right: 0; bottom: 9mm; text-align: center; z-index: 1; }
.card.bank .lab .ic { width: 9mm; height: 9mm; display: block; margin: 0 auto 1mm; filter: drop-shadow(0 0 1.2mm #000); }
.card.bank .lab b { display: block; font-family: var(--f-display); font-weight: 400; font-size: 14pt; color: ${C.paper}; text-shadow: 0 .3mm 1mm #000; }
.card.bank .lab small { display: block; font-size: 6.8pt; padding: 0 9mm; line-height: 1.3; color: ${C.bone}; margin-top: .6mm; text-shadow: 0 .3mm 1mm #000; }
.card.bank .lab em { display: block; font-family: var(--f-mono); font-style: normal; font-size: 5pt; letter-spacing: .2em; text-transform: uppercase; color: ${C.mist}; margin-top: 1mm; }
/* backs */
.back { position: absolute; inset: 0; background: ${C.ink}; }
.back .bart { position: absolute; top: 5mm; left: 6.5mm; width: 56mm; height: 84mm; }
.back .fogart { position: absolute; inset: 0; }
.back .reach { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; }
.back .reach b { display: block; font-family: "IM Fell English SC", serif; font-weight: 400; font-size: 30pt; color: ${C.bone}; text-shadow: 0 0 3mm #000; }
.back .reach span { display: block; font-family: var(--f-display); font-size: 9pt; letter-spacing: .3em; color: ${C.paper}; text-shadow: 0 0 2mm #000; }
`;

const card = (cls, inner, extra = "") => `<div class="card ${cls}"><div class="tex"></div>${extra}<div class="frame"></div><div class="in">${inner}</div></div>`;
const artBox = (name, seal = false, pos = "50% 50%") => `<div class="art">${artImg(name, pos)}${seal ? `<svg class="seal"><use href="#nb-seal"/></svg>` : ""}</div>`;

function memoryFace(L, cid, packLabel, artName) {
  const c = typeof cid === "object" ? cid : CARDS[cid];
  const res = `<span class="res"><b>${L.res}</b> ${c.rr ? L.resInstead : ""}${esc(L.ops(c.res))}</span>`;
  const band = c.slot
    ? `<div class="band">${icon(SLOT_ICON[c.slot], "#5c4a3a")}<span><i>${L.slot(c.slot)}</i>${esc(L.band(c))}</span></div>`
    : `<div class="band none"><span>${L.oblNote}</span></div>`;
  return card(`t${c.tag}${c.key ? " key" : ""}`, `
    <div class="top">${icon(TAG_ICON[c.tag], TAG_COL[c.tag])}<div class="nm">${esc(L.name(c.name))}<small>${L.tag[c.tag]}${c.key ? ` · <span style="color:${C.crimson}">${L.key}</span>` : ""}</small></div><span class="id">${c.id}</span></div>
    <div class="rules">${esc(L.ops(c.eff))}${res}</div>
    ${artBox(artName, c.key)}
    ${band}
    <div class="foot"><span>${esc(packLabel)}</span><span>${c.id}</span></div>`);
}

function memoryCards(lang) {
  const L = T[lang];
  const tagArt = t => ["card-obsession", "card-acceptance", "card-oblivion"][t];
  const out = [];
  for (const i of CORE_IDS) out.push({ name: CARDS[i].id, html: memoryFace(L, i, L.pack.core, tagArt(CARDS[i].tag)) });
  const packArt = (soul, i) => {
    const c = CARDS[i], p = SOUL_PAINT[soul];
    return c.tag === 2 ? tagArt(2) : c.key ? p[2] : c.tag === 0 ? p[0] : p[1];
  };
  for (const i of ECHO_IDS) out.push({ name: CARDS[i].id, html: memoryFace(L, i, L.pack.echo, packArt("open", i)) });
  for (const [soul, ids] of Object.entries(SOUL_PACKS))
    for (const i of ids) out.push({ name: CARDS[i].id, html: memoryFace(L, i, L.soul(soul).name, packArt(soul, i)) });
  return out;
}

function mistFace(L, [name, ops], id, r, harsh) {
  const [nm, flav] = L.mist(name);
  return card(harsh ? "mist harsh" : "mist", `
    <div class="top">${icon("nb-fog", harsh ? C.crimson : C.cyan)}<div class="nm">${esc(nm)}<small>${L.mistKick(harsh)}${harsh ? "" : ` · ${L.reach(r)}`}</small></div><span class="id">${id}</span></div>
    <div class="rules">${esc(L.mistJoin(ops))}</div>
    ${artBox(harsh ? "card-harsh" : `card-mist-${r + 1}`)}
    <div class="band ${harsh ? "red" : "cyan"}"><span>${esc(flav)}</span></div>
    <div class="foot"><span>${harsh ? L.harsh : L.reach(r)}</span><span>${id}</span></div>`);
}
function mistCards(lang) {
  const L = T[lang], out = [];
  MIST.forEach((deck, r) => [...deck, ...MIST_EXTRA].forEach((m, i) => {
    const id = `M${r + 1}-${String(i + 1).padStart(2, "0")}`;
    out.push({ name: id, html: mistFace(L, m, id, r, false) });
  }));
  HARSH.forEach((m, i) => { const id = `MH-${String(i + 1).padStart(2, "0")}`; out.push({ name: id, html: mistFace(L, m, id, 0, true) }); });
  return out;
}

function ghostCards(lang) {
  const L = T[lang];
  return GHOST.map(([t, a], i) => {
    const id = `GH${String(i + 1).padStart(2, "0")}`;
    return { name: id, html: card("ghost", `
      <div class="top">${icon(TAG_ICON[t], TAG_COL[t])}<div class="nm">${esc(L.ghostName(t))}<small>${L.ghostKick}</small></div><span class="id">${id}</span></div>
      <div class="rules">${esc(L.ghostAct(a))}</div>
      ${artBox("card-ghost")}
      <div class="band cyan"><span>${esc(L.ghostNote(t))}</span></div>
      <div class="foot"><span>${L.ghostKick}</span><span>${id}</span></div>`) };
  });
}

function mantleCards(lang) {
  const L = T[lang];
  return Object.keys(MANTLES).map(m => {
    const t = MANTLES[m].tag, info = L.mantle(m);
    return { name: `mantle-${m}`, html: card(`t${t}`, `
      <div class="top">${icon(TAG_ICON[t], TAG_COL[t])}<div class="nm">${esc(info.name)}<small>${L.mantleKick} · ${L.tag[t]}</small></div><span class="id">${m.toUpperCase()}</span></div>
      ${artBox(`card-mantle-${m}`)}
      <div class="rules">${esc(info.text)}</div>
      <div class="band none"><span>${esc(L.mantleNote(t))}</span></div>
      <div class="foot"><span>${L.mantleKick}</span><span>${m}</span></div>`) };
  });
}

function soulCards(lang) {
  const L = T[lang];
  return Object.keys(SOULS).map(k => {
    const s = L.soul(k);
    return { name: `soul-${k}`, html: card("soulc", `
      <div class="kick">${L.soulKick(k)}</div>
      <div class="big">${esc(s.name)}</div>
      <div class="flav">${esc(s.blurb)}</div>
      <div class="rules"><b style="color:${C.bone};font-weight:500">${L.twist}</b> ${esc(s.twist)}</div>
      <div class="note">${L.soulNote(k)}</div>
      <div class="foot"><span>${L.backWord.soul}</span><span>${k}</span></div>`, `<div class="full">${artImg(`soul-${SOUL_ART[k]}`, "50% 12%")}</div>`) };
  });
}

function bankCards(lang) {
  const L = T[lang], icons = ["nb-fertile", "nb-stony", "nb-memorysite", "nb-grave"], names = ["fertile", "stony", "memory", "grave"];
  const out = [];
  TILES.forEach(([, list], r) => list.forEach((t, i) => out.push({ name: `bank-${r + 1}-${String(i + 1).padStart(2, "0")}-${names[t]}`,
    html: bankCard(`card-bank-${names[t]}`, icon(icons[t], ["#c9c1b2", C.mist, C.bone, C.cyan][t]), L.tile(t), L.tileText[t], `${L.reach(r)} · ${L.reachName(r)}`) })));
  return out;
}
const bankCard = (art, ic, name, text, foot) => `<div class="card bank"><div class="full">${artImg(art)}</div><div class="frame"></div>
      <div class="lab">${ic}<b>${esc(name)}</b><small>${esc(text)}</small><em>${esc(foot)}</em></div></div>`;

// Backs. Memory, Mist, Ghost and Soul use their painted backs; Mantles share the Soul back; bank cards are fog, one per Reach.
function backs(lang) {
  const L = T[lang];
  const painted = (name, file) => ({ name: `back-${name}`, html: `<div class="back"><div class="bart">${artImg(file)}</div></div>` });
  return [
    painted("memory", "back-memory"), painted("mist", "back-mist"), painted("ghost", "back-ghost"), painted("soul", "back-soul"), painted("mantle", "back-soul"),
    ...[0, 1, 2].map(r => ({ name: `back-bank-${r + 1}`, html: `<div class="back"><div class="fogart">${artImg("card-fog")}</div><div class="frame" style="position:absolute;inset:5mm;border:.35mm solid rgba(143,214,225,.45);border-radius:2.6mm"></div>
      <div class="reach"><b>${NUM[r]}</b><span>${L.fog} · ${esc(L.reachName(r))}</span></div></div>` })),
  ];
}

// Each deck as [file, cards, back]; the factory prints every card in a deck with that one back.
export function decks(lang) {
  return [
    ["cards-memory", memoryCards(lang), "back-memory"],
    ["cards-mist", mistCards(lang), "back-mist"],
    ["cards-ghost", ghostCards(lang), "back-ghost"],
    ["cards-mantle", mantleCards(lang), "back-mantle"],
    ["cards-soul", soulCards(lang), "back-soul"],
    ["cards-bank", bankCards(lang), "back-bank-1/2/3 by Reach"],
    ...compendiumDecks(lang, { card, artBox, memoryFace, bankCard }),
  ];
}
export const cardBacks = lang => [...backs(lang), ...compendiumBacks(lang)];
export const cardDoc = (lang, title, pages) => doc({ lang, title, w: CW, h: CH, css: CSS + COMP_CSS, pages });
