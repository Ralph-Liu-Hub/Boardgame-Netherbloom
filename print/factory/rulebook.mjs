// The rulebook as a printed A4 booklet (210 x 297 mm, 3 mm bleed), text from the in-game Rulebook (rules.js / rules_zh.js),
// padded with Notes pages to a multiple of 4 for saddle stitching. Plus an A5 Player Aid sheet (print one per player).
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BLEED, C, FONTS, FACE, SYMBOLS, artImg, render } from "./lib.mjs";
import { setupSpread, SPREAD_CSS } from "./setup.mjs";
import { fillFigures, RULEFIG_CSS } from "../../web/public/assets/rulefigs.js";
import { webCardCSS } from "../../web/public/assets/cardface.js";
import { RULEBOOK, playerAid } from "../../web/public/assets/rules.js";
import { RULEBOOK_ZH, playerAidZh } from "../../web/public/assets/rules_zh.js";

const W = {
  en: { book: RULEBOOK, aid: playerAid, title: "Rulebook", aidTitle: "Player Aid", notes: "Notes", players: "1–4 players · 45–60 min · 14+",
    setupRef: ["The picture shows the table set up", "The picture on pages 2 and 3 shows the table set up"] },
  zh: { book: RULEBOOK_ZH, aid: playerAidZh, title: "規則書", aidTitle: "玩家輔助卡", notes: "筆記", players: "1–4人 · 45–60分鐘 · 14歲以上",
    setupRef: ["下圖是以", "第2–3頁的圖是以"] },
};
const PW = 210 + 2 * BLEED, PH = 297 + 2 * BLEED;
const M = BLEED + 18;   // text margin from the bleed edge

const CSS = (lang, w, h, m) => `
@page { size: ${w}mm ${h}mm; margin: ${m}mm ${m}mm ${m + 4}mm;
  @bottom-center { content: counter(page); font-family: "IBM Plex Mono", monospace; font-size: 7pt; color: #8a6a3e; } }
@page :first { margin: 0; @bottom-center { content: none; } }
html { background: #efe5cf; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${FACE[lang].serif}; color: ${C.ink}; font-size: ${lang === "zh" ? 10 : 10.5}pt; line-height: ${lang === "zh" ? 1.75 : 1.5}; }
.ri { width: 1.15em; height: 1.15em; vertical-align: -.22em; margin-right: .25em; }
.cover { position: relative; width: ${w}mm; height: ${h}mm; overflow: hidden; break-after: page; background: ${C.ink}; }
.cover .ai { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 30% 50%; }
.cover::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(7,6,10,.82) 0%, rgba(7,6,10,0) 34%, rgba(7,6,10,0) 70%, rgba(7,6,10,.85) 100%); }
.cover .t { position: absolute; z-index: 1; left: 0; right: 0; top: 20mm; text-align: center; color: ${C.paper}; }
.cover .t b { display: block; font-family: ${lang === "zh" ? `"Noto Serif TC", serif` : `"IM Fell English SC", Georgia, serif`}; font-weight: ${lang === "zh" ? 600 : 400}; font-size: ${lang === "zh" ? 40 : 48}pt; line-height: 1.05; text-shadow: 0 0 8mm rgba(215,38,61,.55); }
.cover .t span { display: block; font-family: "IM Fell English SC", Georgia, serif; font-size: 12pt; letter-spacing: .4em; color: ${C.bone}; margin-top: 3mm; }
.cover .t i { display: block; font-style: normal; font-family: ${FACE[lang].display}; font-size: 20pt; letter-spacing: .3em; margin-top: 8mm; color: ${C.bone}; }
.cover .f { position: absolute; z-index: 1; bottom: 14mm; left: 0; right: 0; text-align: center; font-family: "Alegreya Sans", "Noto Serif TC", sans-serif; font-size: 8pt; letter-spacing: .3em; text-transform: uppercase; color: #b9b1a4; }
h2 { font-family: ${FACE[lang].display}; font-weight: ${lang === "zh" ? 600 : 400}; font-size: 17pt; color: ${C.ink}; margin: 8mm 0 2mm; padding-bottom: 1.5mm; border-bottom: .4mm solid #8a6a3e; break-after: avoid; }
h3, h4 { font-family: ${FACE[lang].display}; font-weight: 600; font-size: 12pt; color: #6b1520; margin: 4mm 0 1mm; break-after: avoid; }
p { margin: 0 0 2.4mm; orphans: 3; widows: 3; }
p.lore { font-family: ${FACE[lang].hand}; font-style: italic; color: #5c4a3a; text-align: center; margin: 1mm 8mm 3mm; }
b { color: #3a1a12; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; } li { margin-bottom: 1mm; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: .88em; break-inside: auto; }
th, td { border: .25mm solid #c9b48a; padding: 1.2mm 2mm; text-align: left; vertical-align: top; } th { background: #e2d3b2; }
tr { break-inside: avoid; }
.rsuggest { border: .3mm solid #c9b48a; border-radius: 2mm; padding: 3mm 4mm; background: rgba(255,250,238,.6); }
.rlose { border: .5mm solid #b3243a; background: rgba(215,38,61,.06); margin: 0 0 3mm; }
.rlose p { margin: .5mm 0; } .rlose ul { margin: 1mm 0; }
.kw { color: #2f7f8e; font-variant: small-caps; font-weight: 600; letter-spacing: .02em; }
.kw::before { content: "◆"; font-size: .55em; vertical-align: .25em; margin-right: .2em; }
[lang="zh-Hant-TW"] .kw { font-variant: normal; letter-spacing: 0; }
.rterms td:first-child { width: 38%; }
.rkey { font-family: "IBM Plex Mono", monospace; font-size: .75em; letter-spacing: .1em; }
.c-obs { color: #a32a30; } .c-acc { color: #8a6a3e; } .c-obl { color: #2f7f8e; }
.aidgrid, .aidicons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5mm; break-inside: avoid; margin-bottom: 2mm; }
.aidgrid div { border: .25mm solid #c9b48a; border-radius: 1.5mm; padding: 1.2mm 1.6mm; } .aidgrid span, ol.steps li span { display: block; font-size: .85em; color: #6b5a44; }
.aid h3 { margin-top: 2.5mm; }
.notes { break-before: page; height: ${h - 2 * m - 20}mm; background: repeating-linear-gradient(180deg, transparent 0 9mm, #c9b48a 9mm 9.25mm); }
.notes h2 { background: #efe5cf; }
`;

const flowDoc = (lang, title, css, body) => `<!doctype html><html lang="${lang === "zh" ? "zh-Hant-TW" : "en"}"><head><meta charset="utf-8"><title>${title}</title>${FONTS}<style>${css}</style></head>
<body><div style="display:none">${SYMBOLS}</div>${body}</body></html>`;

// Recolour the web game's light-on-dark icon colours for paper.
const forPaper = html => html.replace(/#E6D3A3/gi, "#8a6a3e").replace(/#8FD6E1/gi, "#2f7f8e").replace(/#9A948C/gi, "#6b655d").replace(/#EFE7D6/gi, "#5c4a3a").replace(/var\(--cyan\)/g, "#2f7f8e");

// The pictures keep their dark plates on paper; a figure is not split across pages.
const FIG_PRINT = `.rfig { break-inside: avoid; margin: 3mm 0 4mm; } .rfig-in figcaption, .rf-panel > span { color: #5c4a3a; font-size: 8.6pt; }
.nbface img.ai { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.rf-card .nbface { box-shadow: none; } .rf-cards { gap: 2.5mm; } .rf-panels { gap: 3mm; }`;

const pageCount = file => (readFileSync(file).toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;

export async function build(lang, dir, { png }) {
  const w = W[lang];
  const cover = `<section class="cover">${artImg("cover-f", "30% 50%")}<div class="t"><b>${lang === "zh" ? "《彼岸花渡》" : "Netherbloom"}</b><span>${lang === "zh" ? "NETHERBLOOM · " : ""}RALPH LAUXIE</span><i>${w.title}</i></div><div class="f">${w.players}</div></section>`;
  // The setup picture is the two-page spread on pages 2-3 (facing pages, right after the cover); the text points to it.
  const sections = w.book.map(s => `<h2>${s.title}</h2>${s.body}`).join("\n").replace(/<div class="setupfig"[^>]*><\/div>/, "")
    .replace(w.setupRef[0], w.setupRef[1]);
  const aid = `<h2 style="break-before:page">${w.aidTitle}</h2>${w.aid(null)}`;
  const css = CSS(lang, PW, PH, M) + SPREAD_CSS(lang) + webCardCSS() + RULEFIG_CSS + FIG_PRINT;
  const file = join(dir, "rulebook");
  let notes = 0;
  for (let pass = 0; pass < 4; pass++) {
    const pad = Array.from({ length: notes }, () => `<div class="notes"><h2>${w.notes}</h2></div>`).join("");
    await render(file, flowDoc(lang, w.title, css, cover + setupSpread(lang) + fillFigures(forPaper(sections + aid), lang, { artImg }) + pad), { w: PW, h: PH, png });
    const n = pageCount(file + ".pdf");
    notes += (4 - (n % 4)) % 4;
    if (n % 4 === 0) { console.log(`  rulebook: ${n} pages`); break; }
  }
  // the Player Aid on its own, A5 with bleed
  const aw = 148 + 2 * BLEED, ah = 210 + 2 * BLEED;
  await render(join(dir, "player-aid"), flowDoc(lang, w.aidTitle, CSS(lang, aw, ah, BLEED + 9).replace("@page :first { margin: 0; @bottom-center { content: none; } }", "") + "body { font-size: 10.5pt; } h2 { margin-top: 0; }",
    forPaper(`<h2>${w.aidTitle}</h2>${w.aid(null)}`)), { w: aw, h: ah, png });
}
