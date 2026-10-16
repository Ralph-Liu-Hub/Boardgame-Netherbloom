// PARKED with the story cards (see compendium.mjs); built by parked.mjs, not by build.mjs.
// The two paper extras from the Soul Roster v3, for keeping a record and never for progress:
//   book-of-crossings.pdf  one A5 sheet, printed one side and glued at the top into a tear-off pad (50 sheets),
//                          to copy out a finished story: the soul, its three Book pages, the Keepsakes found and the ending.
//   ending-gallery.pdf     one A4 sheet, printed one side: tick off every ending you have seen.
import { join } from "node:path";
import { BLEED, C, doc, render, esc } from "./lib.mjs";
import { SOULS, BOOK_FRAMES, SLOTS } from "../../web/public/assets/cards.js";
import { ZH_SOULS, ZH_BOOK_FRAMES, ZH_SLOTS } from "../../web/public/assets/zh.js";
import { COMP, W as CW } from "./compendium.mjs";

const SOUL_KEYS = ["king", "garland", "bride", "child"];
const W = {
  en: { pad: "Book of Crossings", padSub: "A record of one crossing. Copy out the finished story; nothing here carries into another game.",
    soul: "The soul", name: "Its name, if you gave one", date: "Date", ferry: "Ferrymen", lantern: "Lantern", frames: BOOK_FRAMES, slot: s => s,
    keep: "Keepsakes found", ending: "The ending", forgotten: "Memories forgotten", epitaph: "Last words for the soul",
    nameless: "Nameless: Life · Wound · Last Wish", gallery: "Ending Gallery", gallerySub: "Tick each ending the first time you reach it. The gallery is a keepsake, not a goal: every Soul can be played again, any time.",
    hidden: "Hidden", lives: "Lives crossed", wishes: "Last Wishes", soulName: k => SOULS[k].name },
  zh: { pad: "渡河之書", padSub: "一次渡河的紀錄。抄下完成的故事；這裡的任何內容都不會延續到另一局遊戲。",
    soul: "亡魂", name: "它的名字（若你們為它取了名字）", date: "日期", ferry: "擺渡人", lantern: "燈籠等級", frames: ZH_BOOK_FRAMES, slot: s => ZH_SLOTS[s],
    keep: "找到的信物", ending: "結局", forgotten: "遺忘的記憶數", epitaph: "給亡魂的最後一句話",
    nameless: "無名亡魂：生平・創傷・遺願", gallery: "結局圖鑑", gallerySub: "第一次達成某個結局時，在它旁邊打勾。圖鑑只是紀念，不是目標：每位亡魂都能隨時再玩。",
    hidden: "隱藏", lives: "已渡河的生平", wishes: "遺願", soulName: k => ZH_SOULS[k].name },
};

const CSS = `
.paper { position: absolute; inset: 0; background: #f4ecd8; color: ${C.ink}; }
.gilt { position: absolute; inset: ${BLEED + 6}mm; border: .4mm solid #8a6a3e; }
.gilt::after { content: ""; position: absolute; inset: 1.1mm; border: .15mm solid #8a6a3e; }
.body { position: absolute; left: ${BLEED + 12}mm; right: ${BLEED + 12}mm; top: ${BLEED + 12}mm; bottom: ${BLEED + 11}mm; display: flex; flex-direction: column; gap: 2.4mm; }
h1 { font-family: var(--f-display); font-weight: 400; text-align: center; font-size: 19pt; margin: 0; }
.sub { font-family: var(--f-hand); font-style: italic; text-align: center; font-size: 8.4pt; color: #5c4a3a; margin: 0 0 1mm; }
[lang="zh-Hant-TW"] .sub { font-style: normal; }
.row { display: flex; gap: 4mm; }
.f { flex: 1; font-family: var(--f-mono); font-size: 5.6pt; letter-spacing: .14em; text-transform: uppercase; color: #7a6450; border-bottom: .25mm solid #8a6a3e; padding-top: 5mm; }
[lang="zh-Hant-TW"] .f { font-family: var(--f-body); font-size: 7pt; letter-spacing: .05em; }
.fr h3 { font-family: var(--f-display); font-weight: 400; font-size: 9.5pt; color: #9b1f2f; margin: 1mm 0 .5mm; }
.fr p { font-family: var(--f-serif); font-size: 8.6pt; line-height: 2.25; margin: 0; }
[lang="zh-Hant-TW"] .fr p { font-size: 8.4pt; line-height: 2.3; }
.blank { display: inline-block; min-width: 30mm; border-bottom: .25mm solid #8a6a3e; position: relative; height: 4mm; vertical-align: -1mm; }
.blank i { position: absolute; left: 0; bottom: -2.6mm; font-family: var(--f-mono); font-style: normal; font-size: 4.4pt; letter-spacing: .12em; text-transform: uppercase; color: #9a8a76; }
[lang="zh-Hant-TW"] .blank i { font-family: var(--f-body); font-size: 5pt; }
.lines { flex: 1; background: repeating-linear-gradient(180deg, transparent 0 6.6mm, #b9a689 6.6mm 6.85mm); min-height: 14mm; }
/* gallery */
.g { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; }
.gs h3 { font-family: var(--f-display); font-weight: 400; font-size: 11pt; margin: 0 0 1.2mm; color: ${C.ink}; border-bottom: .25mm solid #8a6a3e; padding-bottom: .8mm; }
.tick { display: flex; gap: 2mm; align-items: baseline; font-family: var(--f-serif); font-size: 8.6pt; line-height: 1.55; }
.tick::before { content: ""; flex: none; width: 3mm; height: 3mm; border: .3mm solid #8a6a3e; border-radius: .5mm; transform: translateY(.4mm); }
.tick b { font-family: var(--f-mono); font-weight: 500; font-size: 6.4pt; color: #9b1f2f; min-width: 9mm; }
.wish { display: grid; grid-template-columns: 1fr repeat(3, 15mm); align-items: center; font-family: var(--f-serif); font-size: 8.6pt; line-height: 1.7; border-bottom: .15mm dotted #b9a689; }
.wish .bx { justify-self: center; width: 3mm; height: 3mm; border: .3mm solid #8a6a3e; border-radius: .5mm; }
.wish .na { justify-self: center; color: #b9a689; }
.wish.hd { font-family: var(--f-mono); font-size: 5pt; letter-spacing: .08em; text-transform: uppercase; color: #7a6450; line-height: 1.2; text-align: center; }
[lang="zh-Hant-TW"] .wish.hd { font-family: var(--f-body); font-size: 6.4pt; }
.big .tick { font-size: 11pt; line-height: 1.9; } .big .tick b { font-size: 7.4pt; }
.big .gs h3 { font-size: 13.5pt; margin-bottom: 2mm; }
.big .wish { font-size: 10.5pt; line-height: 2.1; grid-template-columns: 1fr repeat(3, 19mm); }
.big .wish.hd { font-size: 5.6pt; line-height: 1.3; }
[lang="zh-Hant-TW"] .big .wish.hd { font-size: 7pt; }
.lifes { display: grid; grid-template-columns: 1fr 1fr; gap: 0 6mm; }
`;

const fill = (L, s) => esc(s).replace(/\{(\w+)\}/g, (_, k) => `<span class="blank"><i>${esc(L.slot(k))}</i></span>`);

function pad(lang) {
  const L = W[lang];
  return `<div class="paper"></div><div class="gilt"></div><div class="body">
    <h1>${L.pad}</h1><div class="sub">${L.padSub}</div>
    <div class="row"><div class="f" style="flex:2">${L.soul}</div><div class="f" style="flex:2">${L.name}</div></div>
    <div class="row"><div class="f">${L.date}</div><div class="f" style="flex:2">${L.ferry}</div><div class="f" style="flex:.6">${L.lantern}</div></div>
    <div class="row"><div class="f">${L.nameless}</div></div>
    ${L.frames.map(([t, s]) => `<div class="fr"><h3>${esc(t)}</h3><p>${fill(L, s)}</p></div>`).join("")}
    <div class="row"><div class="f">${L.keep}</div></div>
    <div class="row"><div class="f" style="flex:2.2">${L.ending}</div><div class="f">${L.forgotten}</div></div>
    <div class="f" style="border:0">${L.epitaph}</div><div class="lines"></div>
  </div>`;
}

function gallery(lang) {
  const L = W[lang], CL = CW[lang];
  const souls = SOUL_KEYS.map(k => `<div class="gs"><h3>${esc(L.soulName(k))}</h3>${COMP.souls[k][lang].endings.map(e =>
    `<div class="tick"><b>${e.code === "H" ? L.hidden : e.code}</b><span>${esc(e.title)}</span></div>`).join("")}</div>`).join("");
  const wishes = `<div class="wish hd"><span></span>${CL.wishEnd.map(x => `<span>${x}</span>`).join("")}</div>` +
    COMP.wishes.map(w => `<div class="wish"><span>${esc(w.name[lang])}</span>${w.endings.map(e => e ? `<span class="bx"></span>` : `<span class="na">—</span>`).join("")}</div>`).join("");
  const lives = COMP.lives.map(l => `<div class="tick"><span>${esc(l.name[lang])}</span></div>`).join("");
  return `<div class="paper"></div><div class="gilt"></div><div class="body big" style="gap:7mm">
    <h1 style="font-size:26pt">${L.gallery}</h1><div class="sub" style="font-size:9.6pt">${L.gallerySub}</div>
    <div class="g">${souls}</div>
    <div class="g"><div class="gs"><h3>${CL.nameless} · ${L.wishes}</h3>${wishes}</div><div class="gs"><h3>${CL.nameless} · ${L.lives}</h3><div class="lifes">${lives}</div></div></div>
  </div>`;
}

export async function build(lang, dir, { png }) {
  let w = 148 + 2 * BLEED, h = 210 + 2 * BLEED;
  await render(join(dir, "book-of-crossings"), doc({ lang, title: W[lang].pad, w, h, css: CSS, pages: [{ name: "book-of-crossings", html: pad(lang) }] }), { w, h, png });
  w = 210 + 2 * BLEED; h = 297 + 2 * BLEED;
  await render(join(dir, "ending-gallery"), doc({ lang, title: W[lang].gallery, w, h, css: CSS, pages: [{ name: "ending-gallery", html: gallery(lang) }] }), { w, h, png });
}
