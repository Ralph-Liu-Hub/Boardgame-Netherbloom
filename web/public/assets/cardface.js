// The card template of the Netherbloom design system (CardFaces), shared by the print factory and the web table so a
// card on screen is the printed card. All words come from cards.js and zh.js, in either language.
//   print/factory/cards.mjs draws these faces at 63 x 88 mm plus 3 mm bleed; the web draws them at any width, the same
//   millimetres scaled by the card's own width (webCardCSS).
import {
  CARDS, ECHO_IDS, SOUL_PACKS, SOULS, MIST, HARSH, MIST_EXTRA, MIST_TEXT, GHOST, MANTLES, TILE_NAMES, REACH_NAMES, opsText, FIRST_SOUL,
} from "./cards.js";
import { ZH_TAGS, ZH_SLOTS, ZH_TILES, ZH_REACHES, ZH_CARD_NAMES, ZH_BANDS, ZH_SOULS, ZH_MIST, ZH_MANTLES, zhOpsText } from "./zh.js";

export const C = { ink: "#0e0c11", ink2: "#17141b", ash: "#2a2530", bone: "#E6D3A3", paper: "#F2E8D5", mist: "#9A948C",
  crimson: "#D7263D", cyan: "#8FD6E1", gilt: "#8a6d48", water: "#0b1418" };
export const TAG_COL = [C.crimson, C.bone, C.cyan];
export const TAG_ICON = ["nb-obsession", "nb-acceptance", "nb-oblivion"];
export const SLOT_ICON = { Place: "nb-slot-place", Person: "nb-slot-person", Deed: "nb-slot-deed", Feeling: "nb-slot-feeling" };
// Per-language font stacks: English uses the design system's faces; Chinese sets everything in Noto Serif TC, the Book in WenKai.
export const FACE = {
  en: { display: `"IM Fell English SC", Georgia, serif`, serif: `"IM Fell English", Georgia, serif`, body: `"Alegreya Sans", sans-serif`, hand: `"IM Fell English", Georgia, serif`, mono: `"IBM Plex Mono", monospace` },
  zh: { display: `"Noto Serif TC", serif`, serif: `"Noto Serif TC", serif`, body: `"Noto Serif TC", serif`, hand: `"LXGW WenKai TC", "Noto Serif TC", serif`, mono: `"IBM Plex Mono", "Noto Serif TC", monospace` },
};
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const icon = (id, col = "currentColor", cls = "ic") => `<svg class="${cls}" style="color:${col}" aria-hidden="true"><use href="#${id}"/></svg>`;

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
export const SOUL_ART = { open: "nameless", child: "child", garland: "garland", king: "king", bride: "bride" };
export const SOUL_PAINT = {
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

// ---------------------------------------------------------------- which pack a card is in, and its art window
const PACK = {};
ECHO_IDS.forEach(i => { PACK[i] = "open"; });
Object.entries(SOUL_PACKS).forEach(([soul, ids]) => ids.forEach(i => { PACK[i] = soul; }));
export const tagArt = t => ["card-obsession", "card-acceptance", "card-oblivion"][t];
// Core cards show their thread's painting; Echo and Soul-pack cards their Soul's Book paintings (Oblivion cards keep the
// thread painting, the Key Memory gets the last Reach).
export function memoryArt(cid) {
  const c = CARDS[cid], soul = PACK[cid];
  if (!soul || c.tag === 2) return tagArt(c.tag);
  const p = SOUL_PAINT[soul];
  return c.key ? p[2] : c.tag === 0 ? p[0] : p[1];
}
export const packLabel = (L, cid) => (PACK[cid] === undefined ? L.pack.core : PACK[cid] === "open" ? L.pack.echo : L.soul(PACK[cid]).name);
// Card IDs as printed: Mist M<reach>-<n> in deck order (the Reach's 10, then its 2 extra), Harsh MH-<n>, Ghost GH<n>.
export const mistDeck = r => [...MIST[r], ...MIST_EXTRA];
export const mistId = (r, i) => `M${r + 1}-${String(i + 1).padStart(2, "0")}`;
export const harshId = i => `MH-${String(i + 1).padStart(2, "0")}`;
export const ghostId = i => `GH${String(i + 1).padStart(2, "0")}`;

// ---------------------------------------------------------------- the faces
// artImg(name, pos) draws a painting filling its positioned parent (the factory embeds the masters; the web its WebP copies).
export function cardKit(artImg) {
  const card = (cls, inner, extra = "") => `<div class="nbcard ${cls}"><div class="tex"></div>${extra}<div class="frame"></div><div class="in">${inner}</div></div>`;
  const artBox = (name, seal = false, pos = "50% 50%") => `<div class="art">${artImg(name, pos)}${seal ? `<svg class="seal"><use href="#nb-seal"/></svg>` : ""}</div>`;

  function memoryFace(L, cid, pack, artName) {
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
    <div class="foot"><span>${esc(pack)}</span><span>${c.id}</span></div>`);
  }
  // A Memory card by its index, with its own pack label and painting.
  const memoryCard = (L, cid) => memoryFace(L, cid, packLabel(L, cid), memoryArt(cid));

  function mistFace(L, [name, ops], id, r, harsh) {
    const [nm, flav] = L.mist(name);
    return card(harsh ? "mist harsh" : "mist", `
    <div class="top">${icon("nb-fog", harsh ? C.crimson : C.cyan)}<div class="nm">${esc(nm)}<small>${L.mistKick(harsh)}${harsh ? "" : ` · ${L.reach(r)}`}</small></div><span class="id">${id}</span></div>
    <div class="rules">${esc(L.mistJoin(ops))}</div>
    ${artBox(harsh ? "card-harsh" : `card-mist-${r + 1}`)}
    <div class="band ${harsh ? "red" : "cyan"}"><span>${esc(flav)}</span></div>
    <div class="foot"><span>${harsh ? L.harsh : L.reach(r)}</span><span>${id}</span></div>`);
  }

  const ghostFace = (L, t, a, id) => card("ghost", `
      <div class="top">${icon(TAG_ICON[t], TAG_COL[t])}<div class="nm">${esc(L.ghostName(t))}<small>${L.ghostKick}</small></div><span class="id">${id}</span></div>
      <div class="rules">${esc(L.ghostAct(a))}</div>
      ${artBox("card-ghost")}
      <div class="band cyan"><span>${esc(L.ghostNote(t))}</span></div>
      <div class="foot"><span>${L.ghostKick}</span><span>${id}</span></div>`);

  function mantleFace(L, m) {
    const t = MANTLES[m].tag, info = L.mantle(m);
    return card(`t${t}`, `
      <div class="top">${icon(TAG_ICON[t], TAG_COL[t])}<div class="nm">${esc(info.name)}<small>${L.mantleKick} · ${L.tag[t]}</small></div><span class="id">${m.toUpperCase()}</span></div>
      ${artBox(`card-mantle-${m}`)}
      <div class="rules">${esc(info.text)}</div>
      <div class="band none"><span>${esc(L.mantleNote(t))}</span></div>
      <div class="foot"><span>${L.mantleKick}</span><span>${m}</span></div>`);
  }

  function soulFace(L, k) {
    const s = L.soul(k);
    return card("soulc", `
      <div class="kick">${L.soulKick(k)}</div>
      <div class="big">${esc(s.name)}</div>
      <div class="flav">${esc(s.blurb)}</div>
      <div class="rules"><b style="color:${C.bone};font-weight:500">${L.twist}</b> ${esc(s.twist)}</div>
      <div class="note">${L.soulNote(k)}</div>
      <div class="foot"><span>${L.backWord.soul}</span><span>${k}</span></div>`, `<div class="full">${artImg(`soul-${SOUL_ART[k]}`, "50% 12%")}</div>`);
  }

  const bankCard = (art, ic, name, text, foot) => `<div class="nbcard bank"><div class="full">${artImg(art)}</div><div class="frame"></div>
      <div class="lab">${ic}<b>${esc(name)}</b><small>${esc(text)}</small><em>${esc(foot)}</em></div></div>`;
  const BANK = { icons: ["nb-fertile", "nb-stony", "nb-memorysite", "nb-grave"], names: ["fertile", "stony", "memory", "grave"] };
  const bankFace = (L, t, r) => bankCard(`card-bank-${BANK.names[t]}`, icon(BANK.icons[t], ["#c9c1b2", C.mist, C.bone, C.cyan][t]), L.tile(t), L.tileText[t], `${L.reach(r)} · ${L.reachName(r)}`);

  // Backs. Memory, Mist, Ghost and Soul use their painted backs; Mantles share the Soul back; bank cards are fog, one per Reach.
  const paintedBack = file => `<div class="nbback"><div class="bart">${artImg(file)}</div></div>`;
  const fogBack = (L, r) => `<div class="nbback"><div class="fogart">${artImg("card-fog")}</div><div class="fogframe"></div>
      <div class="reach"><b>${NUM[r]}</b><span>${L.fog} · ${esc(L.reachName(r))}</span></div></div>`;

  return { card, artBox, memoryFace, memoryCard, mistFace, ghostFace, mantleFace, soulFace, bankCard, bankFace, paintedBack, fogBack };
}

// ---------------------------------------------------------------- the stylesheet
// In millimetres and points, for a card drawn with B mm of bleed on each side (the factory prints 3 mm; the web shows the
// card as cut, B = 0). The frame sits 2 mm inside the cut, the text 3.4 mm.
export function cardCSS(B = 0) {
  const at = n => `${+(B + n).toFixed(2)}mm`;
  return `
.nbcard { position: absolute; inset: 0; background: ${C.ink}; color: ${C.paper}; text-align: left; }
.nbcard .ic { width: 1em; height: 1em; flex: none; }
.nbcard .tex { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 35%, rgba(230,211,163,.06), transparent 60%), repeating-linear-gradient(170deg, rgba(255,255,255,.012) 0 .6mm, transparent .6mm 1.2mm); }
.nbcard .frame { position: absolute; inset: ${at(2)}; border: .35mm solid ${C.gilt}; border-radius: 2.6mm; }
.nbcard .frame::after { content: ""; position: absolute; inset: .8mm; border: .15mm solid rgba(138,109,72,.55); border-radius: 2mm; }
.nbcard .in { position: absolute; left: ${at(3.6)}; right: ${at(3.6)}; top: ${at(3.4)}; bottom: ${at(3.2)}; display: flex; flex-direction: column; gap: 1.6mm; }
.nbcard .top { display: flex; align-items: center; gap: 1.8mm; }
.nbcard .top .ic { width: 6.2mm; height: 6.2mm; }
.nbcard .top .nm { flex: 1; font-family: var(--f-serif); font-size: 11.5pt; line-height: 1.05; color: ${C.paper}; }
.nbcard .top .nm small { display: block; font-family: var(--f-mono); font-size: 5.4pt; letter-spacing: .14em; text-transform: uppercase; color: ${C.mist}; margin-top: .5mm; }
.nbcard .top .id { font-family: var(--f-mono); font-size: 5.4pt; color: ${C.mist}; align-self: flex-start; }
.nbcard .rules { font-size: 7.6pt; line-height: 1.32; color: ${C.paper}; }
.nbcard .rules .res { display: block; margin-top: 1mm; padding: .9mm 1.3mm; border-radius: 1.2mm; background: rgba(230,211,163,.08); color: #ddd2bf; font-size: 7.1pt; }
.nbcard .rules .res b { color: ${C.bone}; font-weight: 500; }
[lang="zh-Hant-TW"] .nbcard .rules { font-size: 7.4pt; line-height: 1.45; }
.nbcard .art { position: relative; flex: 1; min-height: 18mm; border-radius: 1.6mm; overflow: hidden; }
.nbcard .art::after { content: ""; position: absolute; inset: 0; border-radius: 1.6mm; box-shadow: inset 0 0 0 .25mm rgba(138,109,72,.7), inset 0 0 4mm rgba(0,0,0,.6); }
.nbcard .art .seal { z-index: 1; position: absolute; right: 1.2mm; bottom: 1.2mm; width: 7mm; height: 7mm; color: ${C.crimson}; filter: drop-shadow(0 0 1mm rgba(0,0,0,.8)); }
.nbcard .band { display: flex; gap: 1.5mm; align-items: flex-start; background: ${C.bone}; color: ${C.ink}; border-radius: 1.2mm; padding: 1.3mm 1.6mm; min-height: 10.5mm; }
.nbcard .band .ic { width: 4.2mm; height: 4.2mm; color: #5c4a3a; margin-top: .3mm; }
.nbcard .band span { font-family: var(--f-hand); font-style: italic; font-size: 7.6pt; line-height: 1.25; }
.nbcard .band span i { display: block; font-style: normal; font-family: var(--f-mono); font-size: 5pt; letter-spacing: .2em; text-transform: uppercase; color: #7a6450; margin-bottom: .3mm; }
[lang="zh-Hant-TW"] .nbcard .band span { font-style: normal; font-size: 7.8pt; }
.nbcard .band.none { background: transparent; color: ${C.mist}; border: .2mm dashed rgba(154,148,140,.5); min-height: 0; }
.nbcard .band.none span { font-family: var(--f-body); font-style: normal; font-size: 6.6pt; }
.nbcard .band.cyan { background: ${C.cyan}; }
.nbcard .band.red { background: #e9b8bf; }
.nbcard .foot { display: flex; justify-content: space-between; font-family: var(--f-mono); font-size: 4.8pt; letter-spacing: .12em; text-transform: uppercase; color: ${C.mist}; }
.nbcard.mist .frame { border-color: #4f7d86; } .nbcard.harsh .frame { border-color: #8a2e3a; }
.nbcard.ghost .frame { border: .35mm dashed ${C.cyan}; }
.nbcard.key .frame { border-color: #b08a4e; box-shadow: 0 0 0 .3mm rgba(215,38,61,.35); }
.nbcard .kick { font-family: var(--f-mono); font-size: 5.4pt; letter-spacing: .3em; text-transform: uppercase; text-align: center; color: ${C.mist}; }
.nbcard .c { text-align: center; }
.nbcard .big { font-family: var(--f-display); font-size: 14pt; color: ${C.bone}; text-align: center; line-height: 1.1; }
.nbcard .flav { font-family: var(--f-hand); font-style: italic; font-size: 8pt; color: #d8cdb8; text-align: center; line-height: 1.3; }
.nbcard .note { font-size: 6.6pt; color: ${C.mist}; line-height: 1.35; }
/* full-art cards: Soul and bank */
.nbcard .full { position: absolute; inset: 0; }
.nbcard .full::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(14,12,17,0) 30%, rgba(14,12,17,.88) 66%, ${C.ink} 100%); }
.nbcard.soulc .in { justify-content: flex-end; }
.nbcard.soulc .in > * { position: relative; z-index: 1; }
.nbcard.bank .lab { position: absolute; left: 0; right: 0; bottom: ${at(6)}; text-align: center; z-index: 1; }
.nbcard.bank .lab .ic { width: 9mm; height: 9mm; display: block; margin: 0 auto 1mm; filter: drop-shadow(0 0 1.2mm #000); }
.nbcard.bank .lab b { display: block; font-family: var(--f-display); font-weight: 400; font-size: 14pt; color: ${C.paper}; text-shadow: 0 .3mm 1mm #000; }
.nbcard.bank .lab small { display: block; font-size: 6.8pt; padding: 0 9mm; line-height: 1.3; color: ${C.bone}; margin-top: .6mm; text-shadow: 0 .3mm 1mm #000; }
.nbcard.bank .lab em { display: block; font-family: var(--f-mono); font-style: normal; font-size: 5pt; letter-spacing: .2em; text-transform: uppercase; color: ${C.mist}; margin-top: 1mm; }
/* backs */
.nbback { position: absolute; inset: 0; background: ${C.ink}; }
.nbback .bart { position: absolute; top: ${at(2)}; left: ${at(3.5)}; width: 56mm; height: 84mm; }
.nbback .fogart { position: absolute; inset: 0; }
.nbback .fogframe { position: absolute; inset: ${at(2)}; border: .35mm solid rgba(143,214,225,.45); border-radius: 2.6mm; }
.nbback .reach { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; }
.nbback .reach b { display: block; font-family: "IM Fell English SC", serif; font-weight: 400; font-size: 30pt; color: ${C.bone}; text-shadow: 0 0 3mm #000; }
.nbback .reach span { display: block; font-family: var(--f-display); font-size: 9pt; letter-spacing: .3em; color: ${C.paper}; text-shadow: 0 0 2mm #000; }
`;
}

// The same sheet for the screen: every millimetre and point becomes a share of the card's width (63 mm across), so a card
// drawn at any size inside a .nbface box (an inline-size container) is the printed card scaled.
export function webCardCSS() {
  const scaled = cardCSS(0).replace(/(-?\d*\.?\d+)(mm|pt)\b/g, (_, n, u) => `calc(${+(u === "pt" ? n * 0.352778 : +n).toFixed(4)} * var(--mm))`);
  const f = k => `--f-display: ${FACE[k].display}; --f-serif: ${FACE[k].serif}; --f-body: ${FACE[k].body}; --f-hand: ${FACE[k].hand}; --f-mono: ${FACE[k].mono};`;
  return `
.nbface { position: relative; aspect-ratio: 63 / 88; container-type: inline-size; border-radius: 4.76% / 3.41%; overflow: hidden; }
.nbface > .nbcard, .nbface > .nbback { --mm: calc(100cqw / 63); line-height: normal; ${f("en")} }
html:lang(zh-Hant-TW) .nbface > .nbcard, html:lang(zh-Hant-TW) .nbface > .nbback { ${f("zh")} }
.nbface img.pa { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
${scaled}`;
}
