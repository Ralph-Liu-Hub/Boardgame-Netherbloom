// One Book of Remembrance per Soul: an 8-page A4 saddle-stitched booklet (210 x 297 mm, 3 mm bleed).
//   1 cover · 2 keeping the Book · 3 the Soul's tale · 4-6 one page per Reach, four 63 x 88 mm card wells each · 7 the Far Shore · 8 back
// The wells hold inscribed cards by four clear self-adhesive photo corners stuck on the printed corner marks (48 per Book).
// Not die-cut slits: in the saddle stitch page 4 backs onto page 3, so slits for its wells would cut through page 3's text.
// Text comes from the rulebook (web/public/assets/rules.js, rules_zh.js) and the card data.
import { join } from "node:path";
import { BLEED, C, doc, artImg, ghostArt, render, icon, esc, SLOT_ICON } from "./lib.mjs";
import { RULEBOOK } from "../../web/public/assets/rules.js";
import { RULEBOOK_ZH } from "../../web/public/assets/rules_zh.js";
import { SOULS, BOOK_FRAMES, CARDS, REACH_NAMES, PAIR_SLOTS, PAIR_REWARDS, opsText } from "../../web/public/assets/cards.js";
import { ZH_SOULS, ZH_BOOK_FRAMES, ZH_SLOTS, ZH_REACHES, ZH_BANDS, zhOpsText } from "../../web/public/assets/zh.js";
import { STORIES } from "./stories.mjs";

const PW = 210 + 2 * BLEED, PH = 297 + 2 * BLEED;
const WELL_W = 66, WELL_H = 91, GAP = 14;
const ORDER = ["child", "garland", "king", "bride", "open"];
const ART = { open: "nameless", child: "child", garland: "garland", king: "king", bride: "bride" };
const PAINT = { open: ["nameless-road", "nameless-mourners", "nameless-lethe"], child: ["child-road", "child-fields", "child-lethe"],
  garland: ["garland-brook", "garland-wade", "garland-lethe"], king: ["king-field", "king-barge", "king-lake"], bride: ["bride-wedding", "bride-stair", "bride-shore"] };
const KEY = { child: "L04", garland: "G-04", king: "K04", bride: "B04" };

const section = (book, id) => book.find(s => s.id === id).body;
// The rulebook's Book section: how to keep the Book comes before its "ending" heading, the ending after it.
const paras = html => [...html.replace(/<svg[^>]*>.*?<\/svg>/gs, "").matchAll(/<(p|li)>([\s\S]*?)<\/\1>/g)].map(m => m[2]);
const bookPart = (book, part) => section(book, "book").split("<h4>")[part];

const W = {
  en: { book: RULEBOOK, title: "Book of Remembrance", soul: k => SOULS[k], frames: BOOK_FRAMES, slot: s => s, reach: r => `Reach ${["I", "II", "III"][r]} · ${REACH_NAMES[r]}`,
    keeping: "Keeping the Book", tuck: "Tuck an inscribed card into the well for its slot: slide its four corners into the photo corners. Slide it out again to reuse the card next game.",
    taken: "…but this, the river has taken", blessing: "Chapter Blessing (full page)", ops: opsText, plus: " + ", keepsakes: "Keepsakes", tale: "The soul of this Book", ferry: "What the Ferrymen know", twist: "Twist", key: "Key Memory",
    far: "The Far Shore",
    bookLore: "The old grave-texts told the dead: do not drink from Lethe; find the spring of Memory. This Book is that spring.",
    endLore: "At the Far Shore the Keeper lifts the veil and offers the cup. What the soul remembers decides how it drinks.", sign: ["Ferrymen", "Lantern", "Date"], read: "Read the Book aloud, page by page.", band: id => CARDS.find(c => c.id === id).band,
    outcomes: ["Inscribed in the Book", "Forgotten", "Never written"] },
  zh: { book: RULEBOOK_ZH, title: "憶念之書", soul: k => ZH_SOULS[k], frames: ZH_BOOK_FRAMES, slot: s => ZH_SLOTS[s], reach: r => `第${["一", "二", "三"][r]}河段 · ${ZH_REACHES[r]}`,
    keeping: "保管這本書", tuck: "將銘刻的牌插入其欄位的牌槽：把四個角塞進相角裡。下一局要再用這張牌時，將它滑出即可。",
    taken: "……但這一段，已被河水帶走", blessing: "章節祝福（整頁）", ops: zhOpsText, plus: "＋", keepsakes: "信物", tale: "本書的亡魂", ferry: "擺渡人所知道的", twist: "特色規則", key: "關鍵記憶",
    far: "彼岸",
    bookLore: "古老的墓文告誡亡者：莫飲忘川之水，當尋記憶之泉。這本書，就是那道泉水。",
    endLore: "在彼岸，守岸人掀起面紗，遞上那一杯。亡魂記得什麼，決定了它如何飲下。", sign: ["擺渡人", "燈籠", "日期"], read: "逐頁朗讀憶念之書。", band: id => ZH_BANDS[id] || CARDS.find(c => c.id === id).band,
    outcomes: ["已銘刻於書中", "已遺忘", "未曾說出"] },
};

const CSS = `
.paper { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 40%, #f6efe0, #e6d9bf); color: ${C.ink}; }
.ghost { position: absolute; inset: 0; }
.ghost img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; mix-blend-mode: normal; }
.gilt { position: absolute; inset: ${BLEED + 9}mm; border: .5mm solid #8a6a3e; }
.gilt::after { content: ""; position: absolute; inset: 1.4mm; border: .2mm solid #8a6a3e; }
.body { position: absolute; left: ${BLEED + 18}mm; right: ${BLEED + 18}mm; top: ${BLEED + 20}mm; bottom: ${BLEED + 18}mm; display: flex; flex-direction: column; }
.eyebrow { font-family: var(--f-mono); font-size: 9pt; letter-spacing: .3em; text-transform: uppercase; color: #9b1f2f; text-align: center; }
h1, h2 { font-family: var(--f-display); font-weight: 400; color: ${C.ink}; text-align: center; margin: 2mm 0 4mm; }
h1 { font-size: 30pt; line-height: 1.1; } h2 { font-size: 20pt; }
p { font-family: var(--f-serif); font-size: 11pt; line-height: 1.55; margin: 0 0 3.5mm; }
[lang="zh-Hant-TW"] p { font-size: 10.5pt; line-height: 1.8; }
.lore { font-family: var(--f-hand); font-style: italic; color: #5c4a3a; text-align: center; }
.drop::first-letter { float: left; font-family: var(--f-display); font-size: 38pt; line-height: .9; color: #9b1f2f; margin: 1mm 2mm 0 0; }
.cameo { position: relative; width: 92mm; height: 122mm; margin: 6mm auto; border-radius: 50%; overflow: hidden; border: 1.2mm solid #f4ecd8; box-shadow: 0 0 0 .5mm #8a6a3e, 0 0 0 2.2mm #f4ecd8, 0 0 0 2.6mm #8a6a3e; }
.name { font-family: var(--f-hand); font-style: italic; font-size: 18pt; text-align: center; color: #3c2f22; }
.wells { display: grid; grid-template-columns: ${WELL_W}mm ${WELL_W}mm; gap: 5mm ${GAP}mm; justify-content: center; margin-top: 3mm; }
.wl .lead { font-family: var(--f-hand); font-style: italic; font-size: 10pt; color: #3c2f22; height: 6mm; }
.well { position: relative; width: ${WELL_W}mm; height: ${WELL_H}mm; border: .3mm dashed #8a6a3e; border-radius: 3mm; background: rgba(244,236,216,.55);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2mm; color: #8a6a3e; text-align: center; padding: 6mm; }
.well .ic { width: 10mm; height: 10mm; }
.well b { font-family: var(--f-mono); font-weight: 400; font-size: 9pt; letter-spacing: .3em; text-transform: uppercase; }
.well i { font-family: var(--f-hand); font-size: 10.5pt; color: #9a8466; }
.corner { position: absolute; width: 9mm; height: 9mm; background: linear-gradient(135deg, #8a6a3e 50%, transparent 50%); opacity: .85; }
.foot { margin-top: auto; display: flex; justify-content: space-between; align-items: center; font-family: var(--f-mono); font-size: 8pt; color: #8a6a3e; letter-spacing: .1em; }
.pairs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5mm; margin-top: 4mm; font-size: 10.5pt; line-height: 1.25; color: #3c2f22; }
.pairs > div { display: grid; grid-template-columns: 5.5mm 1fr; align-items: start; }
.pairs .box { grid-row: span 2; margin-top: .4mm; }
.pairs b { font-family: var(--f-mono); font-weight: 400; font-size: 8.5pt; letter-spacing: .12em; text-transform: uppercase; color: #8a6a3e; }
.box { display: inline-block; width: 4mm; height: 4mm; border: .3mm solid #8a6a3e; vertical-align: -.6mm; margin-right: 1.5mm; }
.rules p { font-size: 10pt; }
.epi { margin: -1mm 10mm 5mm; font-size: 12pt; }
.tale p { font-size: 12.5pt; line-height: 1.6; text-align: justify; hyphens: auto; margin-bottom: 4mm; }
[lang="zh-Hant-TW"] .tale p { font-size: 12pt; line-height: 1.9; text-indent: 2em; }
[lang="zh-Hant-TW"] .tale p.drop { text-indent: 0; }
.ferry { font-family: var(--f-hand); font-style: italic; font-size: 13pt; line-height: 1.6; color: #3c2f22; }
[lang="zh-Hant-TW"] .ferry { font-style: normal; font-size: 12.5pt; line-height: 1.85; }
.rule { font-size: 10.5pt; margin-bottom: 2mm; }
.plate { position: relative; flex: 1 1 auto; min-height: 30mm; margin: 3mm 6mm 4mm; border: .5mm solid #8a6a3e; outline: .2mm solid #8a6a3e; outline-offset: 1.2mm; box-shadow: 0 .6mm 2mm rgba(60,40,20,.35); overflow: hidden; }

h3 { font-family: var(--f-display); font-weight: 400; font-size: 14pt; text-align: center; margin: 1mm 0 3mm; color: #3c2f22; } .rules b { color: #6b1520; font-weight: 600; }
.note { border: .3mm solid #c9b48a; border-radius: 2mm; padding: 4mm 5mm; background: rgba(244,236,216,.6); }
.sign { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 6mm; margin-top: 8mm; font-family: var(--f-mono); font-size: 9pt; letter-spacing: .12em; text-transform: uppercase; color: #8a6a3e; }
.sign span { border-top: .3mm solid #8a6a3e; padding-top: 1.5mm; }
.dark { position: absolute; inset: 0; background: ${C.ink}; color: ${C.bone}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6mm; }
.dark .ic { width: 22mm; height: 22mm; }
.dark .t { font-family: "IM Fell English SC", Georgia, serif; font-size: 16pt; letter-spacing: .2em; }
.dark small { font-family: var(--f-mono); font-size: 9pt; letter-spacing: .3em; color: ${C.mist}; }
svg.die { position: absolute; inset: 0; width: 100%; height: 100%; }
`;

const page = (inner, ghost = null, pos = "50% 40%") => `<div class="paper">${ghost && ghostArt(ghost) ? `<div class="ghost"><img src="${ghostArt(ghost)}" style="object-position:${pos}" alt=""></div>` : ""}<div class="gilt"></div><div class="body">${inner}</div></div>`;
const folio = (n, w, k) => `<div class="foot"><span>${esc(w.soul(k).name)}</span><span>${n}</span></div>`;

// Split a frame sentence into its four lead-ins, each ending where its slot begins.
function leads(frame) {
  const out = [];
  let rest = frame;
  for (const m of frame.matchAll(/\{(\w+)\}/g)) {
    const [pre] = rest.split(m[0]);
    out.push([m[1], pre.replace(/^[\s.,。，、]+/, "").trim() + "…"]);
    rest = rest.slice(pre.length + m[0].length);
  }
  return out;
}

function soulBook(lang, k) {
  const w = W[lang], s = w.soul(k), st = STORIES[k][lang], bookParas = paras(bookPart(w.book, 0));
  const pages = [];
  pages.push(page(`<div class="eyebrow">Netherbloom${lang === "zh" ? " · 《彼岸花渡》" : ""}</div><h1>${w.title}</h1>
    <div class="cameo">${artImg(`soul-${ART[k]}`, "50% 10%")}</div><div class="name">${esc(s.name)}</div>
    <p class="lore" style="margin-top:auto">${esc(w.bookLore)}</p>`, PAINT[k][2]));
  // 2 · the Soul's tale, told in full
  pages.push(page(`<div class="eyebrow">${w.tale}</div><h2>${esc(s.name)}</h2><p class="lore epi">${esc(st.epigraph)}</p>
    <div class="tale">${st.tale.map((t, i) => `<p${i ? "" : ' class="drop"'}>${esc(t)}</p>`).join("")}</div>
    <div class="plate">${artImg(PAINT[k][1], "50% 35%")}</div>${folio(2, w, k)}`, `soul-${ART[k]}`, "50% 15%"));
  // 3 · what the Ferrymen know (the twist, as story), the Key Memory, and how to keep the Book
  pages.push(page(`<div class="eyebrow">${w.title}</div><h2>${w.ferry}</h2>
    <p class="ferry">${esc(st.ferry)}</p>
    <p class="rule"><b>${w.twist}:</b> ${esc(s.twist)}</p>
    ${KEY[k] ? `<p class="rule"><b>${w.key}:</b> <i>${esc(w.band(KEY[k]))}</i></p>` : ""}
    <div class="plate">${artImg(PAINT[k][2], "50% 40%")}</div>
    <h3>${w.keeping}</h3><div class="rules">${bookParas.map(p => `<p>${p}</p>`).join("")}</div>
    <div class="note"><p style="margin:0">${w.tuck}</p></div>${folio(3, w, k)}`, PAINT[k][0], "50% 50%"));
  w.frames.forEach(([title, frame], r) => {
    const wells = leads(frame).map(([slot, lead]) => `<div class="wl"><div class="lead">${esc(lead)}</div><div class="well">
      <span class="corner" style="left:0;top:0"></span><span class="corner" style="right:0;top:0;transform:rotate(90deg)"></span>
      <span class="corner" style="left:0;bottom:0;transform:rotate(-90deg)"></span><span class="corner" style="right:0;bottom:0;transform:rotate(180deg)"></span>
      ${icon(SLOT_ICON[slot], "#8a6a3e")}<b>${w.slot(slot)}</b><i>${w.taken}</i></div></div>`).join("");
    // the page rewards: one box for each pair of neighbouring slots, ticked when the pair is filled
    const pairs = PAIR_SLOTS.map(([a, b], i) => `<div><span class="box"></span><b>${w.slot(a)}${w.plus}${w.slot(b)}</b><span>${esc(w.ops(PAIR_REWARDS[r][i]))}</span></div>`).join("");
    pages.push(page(`<div class="eyebrow">${w.reach(r)}</div><h2>${esc(title)}</h2><div class="wells">${wells}</div>
      <div class="pairs">${pairs}</div>
      <div class="foot" style="margin-top:4mm"><span><span class="box"></span>${w.blessing}</span><span>${w.keepsakes} <span class="box"></span><span class="box"></span><span class="box"></span></span><span>${4 + r}</span></div>`, PAINT[k][r]));
  });
  const end = paras(bookPart(w.book, 1));
  pages.push(page(`<div class="eyebrow">${w.far}</div><h2>${w.far}</h2><p class="lore">${esc(w.endLore)}</p>
    ${KEY[k] ? `<div class="note">${end.slice(1, 4).map((p, i) => `<p style="margin:1.5mm 0"><span class="box"></span>${p}</p>`).join("")}</div>` : ""}
    <p style="margin-top:6mm">${end[end.length - 1]}</p>
    <div class="sign">${w.sign.map(t => `<span>${t}</span>`).join("")}</div>${folio(7, w, k)}`, PAINT[k][2], "50% 60%"));
  pages.push(`<div class="dark">${icon("nb-bloom", C.crimson)}<div class="t">NETHERBLOOM</div>${lang === "zh" ? `<div style="font-family:'Noto Serif TC',serif;letter-spacing:.3em">《彼岸花渡》</div>` : ""}<small>RALPH LAUXIE</small></div>`);
  return pages.map((html, i) => ({ name: `book-${k}-${String(i + 1).padStart(2, "0")}`, html }));
}

export async function build(lang, dir, { png }) {
  for (const k of ORDER)
    await render(join(dir, `book-of-remembrance-${k}`), doc({ lang, title: `${W[lang].title} · ${W[lang].soul(k).name}`, w: PW, h: PH, css: CSS, pages: soulBook(lang, k) }), { w: PW, h: PH, png });
}
