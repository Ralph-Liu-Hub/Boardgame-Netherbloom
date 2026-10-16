// One Book of Remembrance per Soul: an 8-page A4 saddle-stitched booklet (210 x 297 mm, 3 mm bleed).
//   1 cover · 2 keeping the Book · 3 the Soul's tale · 4-6 one page per Reach, four 63 x 88 mm card wells each · 7 the Far Shore · 8 back
// The wells hold inscribed cards by four die-cut photo-corner slits; the last page of each PDF is the slit die line for pages 4-6.
// Text comes from the rulebook (web/public/assets/rules.js, rules_zh.js) and the card data.
import { join } from "node:path";
import { BLEED, C, doc, artImg, ghostArt, render, icon, esc, SLOT_ICON } from "./lib.mjs";
import { RULEBOOK } from "../../web/public/assets/rules.js";
import { RULEBOOK_ZH } from "../../web/public/assets/rules_zh.js";
import { SOULS, BOOK_FRAMES, CARDS, REACH_NAMES } from "../../web/public/assets/cards.js";
import { ZH_SOULS, ZH_BOOK_FRAMES, ZH_SLOTS, ZH_REACHES, ZH_BANDS } from "../../web/public/assets/zh.js";

const PW = 210 + 2 * BLEED, PH = 297 + 2 * BLEED;
const WELL_W = 66, WELL_H = 91, GAP = 14;
const ORDER = ["child", "garland", "king", "bride", "open"];
const ART = { open: "nameless", child: "child", garland: "garland", king: "king", bride: "bride" };
const PAINT = { open: ["nameless-road", "nameless-mourners", "nameless-lethe"], child: ["child-road", "child-fields", "child-lethe"],
  garland: ["garland-brook", "garland-wade", "garland-lethe"], king: ["king-field", "king-barge", "king-lake"], bride: ["bride-wedding", "bride-stair", "bride-shore"] };
const KEY = { child: "L04", garland: "G-04", king: "K04", bride: "B04" };

const strip = h => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const section = (book, id) => book.find(s => s.id === id).body;
// The tale is the first paragraph after each Soul's heading in the rulebook's Souls section, in the order above.
const tales = book => [...section(book, "souls").matchAll(/<h4>[^<]*<\/h4>\s*<p>([\s\S]*?)<\/p>/g)].map(m => strip(m[1]));
const paras = (book, id) => [...section(book, id).matchAll(/<(p|li)>([\s\S]*?)<\/\1>/g)].map(m => m[2]);
const loreOf = (book, id) => strip((section(book, id).match(/<p class="lore">([\s\S]*?)<\/p>/) || [, ""])[1]);

const W = {
  en: { book: RULEBOOK, title: "Book of Remembrance", soul: k => SOULS[k], frames: BOOK_FRAMES, slot: s => s, reach: r => `Reach ${["I", "II", "III"][r]} · ${REACH_NAMES[r]}`,
    keeping: "Keeping the Book", tuck: "Tuck an inscribed card into the well for its slot: slide its four corners under the slits. Slide it out again to reuse the card next game.",
    taken: "…but this, the river has taken", blessing: "Chapter Blessing", keepsakes: "Keepsakes", tale: "The soul of this Book", twist: "Twist", key: "Key Memory",
    far: "The Far Shore", sign: ["Ferrymen", "Lantern", "Date"], read: "Read the Book aloud, page by page.", band: id => CARDS.find(c => c.id === id).band,
    outcomes: ["Inscribed in the Book", "Forgotten", "Never written"] },
  zh: { book: RULEBOOK_ZH, title: "憶念之書", soul: k => ZH_SOULS[k], frames: ZH_BOOK_FRAMES, slot: s => ZH_SLOTS[s], reach: r => `第${["一", "二", "三"][r]}河段 · ${ZH_REACHES[r]}`,
    keeping: "保管這本書", tuck: "將銘刻的牌插入其欄位的牌槽：把四個角塞進切口下方。下一局要再用這張牌時，將它滑出即可。",
    taken: "……但這一段，已被河水帶走", blessing: "章節祝福", keepsakes: "信物", tale: "本書的亡魂", twist: "特色規則", key: "關鍵記憶",
    far: "彼岸", sign: ["擺渡人", "燈籠", "日期"], read: "逐頁朗讀憶念之書。", band: id => ZH_BANDS[id] || CARDS.find(c => c.id === id).band,
    outcomes: ["已銘刻於書中", "已遺忘", "未曾說出"] },
};

const CSS = `
.paper { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 40%, #f6efe0, #e6d9bf); color: ${C.ink}; }
.ghost { position: absolute; inset: 0; }
.ghost img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; mix-blend-mode: normal; }
.gilt { position: absolute; inset: ${BLEED + 9}mm; border: .5mm solid #8a6a3e; }
.gilt::after { content: ""; position: absolute; inset: 1.4mm; border: .2mm solid #8a6a3e; }
.body { position: absolute; left: ${BLEED + 18}mm; right: ${BLEED + 18}mm; top: ${BLEED + 20}mm; bottom: ${BLEED + 18}mm; display: flex; flex-direction: column; }
.eyebrow { font-family: var(--f-mono); font-size: 7pt; letter-spacing: .3em; text-transform: uppercase; color: #9b1f2f; text-align: center; }
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
.well b { font-family: var(--f-mono); font-weight: 400; font-size: 7pt; letter-spacing: .3em; text-transform: uppercase; }
.well i { font-family: var(--f-hand); font-size: 9pt; color: #9a8466; }
.corner { position: absolute; width: 9mm; height: 9mm; background: linear-gradient(135deg, #8a6a3e 50%, transparent 50%); opacity: .85; }
.foot { margin-top: auto; display: flex; justify-content: space-between; align-items: center; font-family: var(--f-mono); font-size: 7pt; color: #8a6a3e; letter-spacing: .15em; }
.box { display: inline-block; width: 4mm; height: 4mm; border: .3mm solid #8a6a3e; vertical-align: -.6mm; margin-right: 1.5mm; }
.rules p { font-size: 10pt; } .rules b { color: #6b1520; font-weight: 600; }
.note { border: .3mm solid #c9b48a; border-radius: 2mm; padding: 4mm 5mm; background: rgba(244,236,216,.6); }
.sign { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 6mm; margin-top: 8mm; font-family: var(--f-mono); font-size: 7pt; letter-spacing: .2em; text-transform: uppercase; color: #8a6a3e; }
.sign span { border-top: .3mm solid #8a6a3e; padding-top: 1.5mm; }
.slits { display: none; position: absolute; inset: -.3mm; width: ${WELL_W}mm; height: ${WELL_H}mm; }
.dieonly .paper { background: #fff; } .dieonly * { visibility: hidden; } .dieonly .slits { display: block; visibility: visible; }
.dieonly .slits * { visibility: visible; } .dieonly .ghost, .dieonly .gilt { display: none; }
.dark { position: absolute; inset: 0; background: ${C.ink}; color: ${C.bone}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6mm; }
.dark .ic { width: 22mm; height: 22mm; }
.dark .t { font-family: "IM Fell English SC", Georgia, serif; font-size: 16pt; letter-spacing: .2em; }
.dark small { font-family: var(--f-mono); font-size: 7pt; letter-spacing: .3em; color: ${C.mist}; }
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

// The photo-corner slits: an 11 mm diagonal across each corner of a well. Drawn in every well but shown only on the die-line page,
// which repeats a Reach page with everything else hidden, so the slits sit exactly where the wells print.
const SLITS = `<svg class="slits" viewBox="0 0 ${WELL_W} ${WELL_H}">${[[0, 11, 11, 0], [WELL_W - 11, 0, WELL_W, 11], [0, WELL_H - 11, 11, WELL_H], [WELL_W - 11, WELL_H, WELL_W, WELL_H - 11]]
  .map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#ec008c" stroke-width=".3"/>`).join("")}</svg>`;

function soulBook(lang, k) {
  const w = W[lang], s = w.soul(k), tale = tales(w.book)[ORDER.indexOf(k)], bookParas = paras(w.book, "book");
  const pages = [];
  pages.push(page(`<div class="eyebrow">Netherbloom${lang === "zh" ? " · 《彼岸花渡》" : ""}</div><h1>${w.title}</h1>
    <div class="cameo">${artImg(`soul-${ART[k]}`, "50% 10%")}</div><div class="name">${esc(s.name)}</div>
    <p class="lore" style="margin-top:auto">${esc(loreOf(w.book, "book"))}</p>`, PAINT[k][2]));
  pages.push(page(`<div class="eyebrow">${w.title}</div><h2>${w.keeping}</h2><div class="rules">${bookParas.map(p => `<p>${p}</p>`).join("")}</div>
    <div class="note"><p style="margin:0">${w.tuck}</p></div>${folio(2, w, k)}`));
  pages.push(page(`<div class="eyebrow">${w.tale}</div><h2>${esc(s.name)}</h2>
    <p class="drop">${esc(tale)}</p><p><b>${w.twist}:</b> ${esc(s.twist)}</p>
    ${KEY[k] ? `<p><b>${w.key}:</b> <i>${esc(w.band(KEY[k]))}</i></p>` : ""}<p class="lore">${esc(s.blurb)}</p>${folio(3, w, k)}`, `soul-${ART[k]}`, "50% 15%"));
  w.frames.forEach(([title, frame], r) => {
    const wells = leads(frame).map(([slot, lead]) => `<div class="wl"><div class="lead">${esc(lead)}</div><div class="well">
      <span class="corner" style="left:0;top:0"></span><span class="corner" style="right:0;top:0;transform:rotate(90deg)"></span>
      <span class="corner" style="left:0;bottom:0;transform:rotate(-90deg)"></span><span class="corner" style="right:0;bottom:0;transform:rotate(180deg)"></span>
      ${icon(SLOT_ICON[slot], "#8a6a3e")}<b>${w.slot(slot)}</b><i>${w.taken}</i>${SLITS}</div></div>`).join("");
    pages.push(page(`<div class="eyebrow">${w.reach(r)}</div><h2>${esc(title)}</h2><div class="wells">${wells}</div>
      <div class="foot" style="margin-top:6mm"><span><span class="box"></span>${w.blessing}</span><span>${w.keepsakes} <span class="box"></span><span class="box"></span><span class="box"></span></span><span>${4 + r}</span></div>`, PAINT[k][r]));
  });
  const end = paras(w.book, "endings");
  pages.push(page(`<div class="eyebrow">${w.far}</div><h2>${w.far}</h2><p class="lore">${esc(loreOf(w.book, "endings"))}</p>
    ${KEY[k] ? `<div class="note">${end.slice(1, 4).map((p, i) => `<p style="margin:1.5mm 0"><span class="box"></span>${p}</p>`).join("")}</div>` : ""}
    <p style="margin-top:6mm">${end[end.length - 1]}</p>
    <div class="sign">${w.sign.map(t => `<span>${t}</span>`).join("")}</div>${folio(7, w, k)}`, PAINT[k][2], "50% 60%"));
  pages.push(`<div class="dark">${icon("nb-bloom", C.crimson)}<div class="t">NETHERBLOOM</div>${lang === "zh" ? `<div style="font-family:'Noto Serif TC',serif;letter-spacing:.3em">《彼岸花渡》</div>` : ""}<small>RALPH LAUXIE</small></div>`);
  // die line: the Reach I page again with only the slits visible, plus the trim
  pages.push(`<div class="dieonly" style="position:absolute;inset:0">${pages[3]}</div><svg class="die" viewBox="0 0 ${PW} ${PH}">
    <rect x="${BLEED}" y="${BLEED}" width="210" height="297" fill="none" stroke="#00a0e0" stroke-width=".3" stroke-dasharray="2 1"/>
    <text x="${BLEED + 6}" y="${PH - BLEED - 6}" font-family="IBM Plex Mono, monospace" font-size="3" fill="#ec008c">DIE LINE · pages 4–6 · photo-corner slits (magenta), 11 mm diagonals at each corner of the four 66 × 91 mm wells · trim (blue)</text></svg>`);
  return pages.map((html, i) => ({ name: `book-${k}-${String(i + 1).padStart(2, "0")}${i === 8 ? "-dieline" : ""}`, html }));
}

export async function build(lang, dir, { png }) {
  for (const k of ORDER)
    await render(join(dir, `book-of-remembrance-${k}`), doc({ lang, title: `${W[lang].title} · ${W[lang].soul(k).name}`, w: PW, h: PH, css: CSS, pages: soulBook(lang, k) }), { w: PW, h: PH, png });
}
