// Dimension drawings for the print specification document: one PNG per component, English and Traditional Chinese.
// Every measure comes from the factory build (board, Loom, tokens, tiles, box), so the drawings match the files.
//   node print/specs/drawings.mjs   → docs/print-specs/<en|zh-TW>/NN-name.png   (needs PLAYWRIGHT_CORE, CHROMIUM_PATH)
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../factory/lib.mjs";
import { PW as RPW, PH as RPH, GEO } from "../factory/board.mjs";
import { LOOM } from "../factory/loom.mjs";
import { BIG, SMALL, CUT_BLEED, CANVAS } from "../factory/tokens.mjs";
import { TILE } from "../factory/tiles.mjs";
import { LID, BASE, TURN } from "../factory/box.mjs";

const B = 3, SAFE = 3, WIDTH = 1600;   // bleed, safe margin (mm); every drawing is 1600 px wide
let K = 4;   // px per mm, set per drawing so it fits WIDTH; text is sized in px so it reads the same in every drawing
const FS = 6.5;   // px of text per unit of the size option
const L = {
  en: { trim: "trim (cut)", bleed: "bleed 3 mm", safe: "safe area: keep text 3 mm inside", art: "art runs 2 mm past the cut", canvas: "JPG canvas",
    card: "Card (every deck)", tile: "Bank tile", token: "Tokens", river: "River board: 3 panels side by side", panel: "panel", mist: "Mist deck well (deck lies sideways)",
    well: "bank tile well", strip: "strip along the left bank", loom: "Loom of the Fates", knot: "knot well Ø22 (18 mm knot)", pitch: "pitch 23", ledger: "The Ledger",
    track: "forgotten track: 63 × 88 card wells, 11 mm steps", book: "Rulebook page / Book of Remembrance page", aid: "Player Aid card (A5)",
    lid: "Box lid wrap (flat)", turn: "turn-in 15", fold: "fold", fit: "Everything lies flat in the box base (inside ≈ 291 × 291 mm)", inside: "inside of the base",
    boards: ["River panel 266 × 244", "Loom / Ledger 285 × 210", "Rulebook / Book 210 × 280"], small: "small", big: "large", wells: "wells" },
  zh: { trim: "裁切線", bleed: "出血 3 mm", safe: "安全區：文字距裁切線至少 3 mm", art: "圖像超出裁切線 2 mm", canvas: "JPG 畫布",
    card: "卡牌（所有牌組）", tile: "河岸板塊", token: "標記與指示物", river: "河流圖板：3 塊並排", panel: "單塊", mist: "迷霧牌槽（牌庫橫放）",
    well: "河岸板塊方槽", strip: "沿左岸的長條區", loom: "命運織機", knot: "結槽 Ø22（放 18 mm 的結）", pitch: "間距 23", ledger: "渡帳",
    track: "遺忘軌：63 × 88 牌槽，每格錯開 11 mm", book: "規則書內頁／憶念之書內頁", aid: "玩家輔助卡（A5）",
    lid: "盒蓋裱紙（攤平）", turn: "內折 15", fold: "折線", fit: "所有配件都能平放進盒底（內徑約 291 × 291 mm）", inside: "盒底內徑",
    boards: ["河流圖板 266 × 244", "織機／渡帳 285 × 210", "規則書／憶念之書 210 × 280"], small: "小", big: "大", wells: "牌槽" },
};

const FONT = `font-family="Alegreya Sans, Noto Sans TC, Noto Serif TC, sans-serif"`;
const t = (x, y, s, o = {}) => `<text x="${x * K}" y="${y * K}" ${FONT} font-size="${(o.size || 3.2) * FS}" fill="${o.fill || "#222"}" text-anchor="${o.anchor || "middle"}"${o.rot ? ` transform="rotate(${o.rot} ${x * K} ${y * K})"` : ""}>${s}</text>`;
const r = (x, y, w, h, o = {}) => `<rect x="${x * K}" y="${y * K}" width="${w * K}" height="${h * K}" rx="${(o.rx || 0) * K}" fill="${o.fill || "none"}" stroke="${o.stroke || "#222"}" stroke-width="${o.sw || 2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
const c = (x, y, d, o = {}) => `<circle cx="${x * K}" cy="${y * K}" r="${d / 2 * K}" fill="${o.fill || "none"}" stroke="${o.stroke || "#222"}" stroke-width="${o.sw || 2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
const ln = (x1, y1, x2, y2, o = {}) => `<line x1="${x1 * K}" y1="${y1 * K}" x2="${x2 * K}" y2="${y2 * K}" stroke="${o.stroke || "#555"}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
// a dimension line with arrow heads and its measure
const dimH = (x1, x2, y, s) => `${ln(x1, y, x2, y, { stroke: "#1f6f8b" })}<path d="M${x1 * K} ${y * K} l10 -5 v10 z M${x2 * K} ${y * K} l-10 -5 v10 z" fill="#1f6f8b"/>${ln(x1, y - 3, x1, y + 3, { stroke: "#1f6f8b" })}${ln(x2, y - 3, x2, y + 3, { stroke: "#1f6f8b" })}${t((x1 + x2) / 2, y - 6 / K, s, { fill: "#1f6f8b" })}`;
const dimV = (y1, y2, x, s) => `${ln(x, y1, x, y2, { stroke: "#1f6f8b" })}<path d="M${x * K} ${y1 * K} l-5 10 h10 z M${x * K} ${y2 * K} l-5 -10 h10 z" fill="#1f6f8b"/>${ln(x - 3, y1, x + 3, y1, { stroke: "#1f6f8b" })}${ln(x - 3, y2, x + 3, y2, { stroke: "#1f6f8b" })}${t(x - 6 / K, (y1 + y2) / 2, s, { fill: "#1f6f8b", rot: -90 })}`;
const BLEED_O = { stroke: "#d6247f", dash: "10 6" }, SAFE_O = { stroke: "#1fa0c8", dash: "4 6", sw: 1.5 };
const legend = (x, y, l) => `${ln(x, y, x + 8, y, { stroke: "#222", sw: 2 })}${t(x + 10, y + 1, l.trim, { anchor: "start", size: 2.8 })}
  ${ln(x, y + 5, x + 8, y + 5, BLEED_O)}${t(x + 10, y + 6, l.bleed, { anchor: "start", size: 2.8 })}
  ${ln(x, y + 10, x + 8, y + 10, SAFE_O)}${t(x + 10, y + 11, l.safe, { anchor: "start", size: 2.8 })}`;

// a trimmed sheet with its bleed and safe area, dimensioned
function sheet(ox, oy, w, h, opts = {}) {
  return `${r(ox - B, oy - B, w + 2 * B, h + 2 * B, BLEED_O)}${r(ox, oy, w, h, { rx: opts.rx || 0, fill: opts.fill || "#f7f2e8" })}${opts.noSafe ? "" : r(ox + SAFE, oy + SAFE, w - 2 * SAFE, h - 2 * SAFE, SAFE_O)}
    ${dimH(ox, ox + w, oy - B - 6, `${w} mm`)}${dimV(oy, oy + h, ox - B - 6, `${h} mm`)}
    ${dimH(ox - B, ox + w + B, oy + h + B + 7, `${w + 2 * B} mm`)}`;
}

const D = {
  card: l => ({ w: 140, h: 140, s: `${sheet(30, 24, 63, 88, { rx: 3 })}${legend(100, 40, l)}${t(112, 64, "63 × 88 mm", { size: 3.6 })}${t(112, 70, "+ 3 mm → 69 × 94 mm", { size: 3 })}` }),
  tile: l => ({ w: 150, h: 85, s: `${c(0, 0, 0, { stroke: "none" })}
    ${r(28, 28, TILE + 4, TILE + 4, BLEED_O)}${r(30, 30, TILE, TILE, { rx: 1.5, fill: "#f7f2e8" })}${dimH(30, 30 + TILE, 22, `${TILE} mm`)}${dimV(30, 30 + TILE, 22, `${TILE} mm`)}
    ${t(105, 40, "R 1.5 mm", { size: 3 })}${t(105, 47, l.art, { size: 3 })}${t(105, 54, `20 × (6 / 8 / 6)`, { size: 3 })}` }),
  token: l => ({ w: 150, h: 85, s: `
    ${r(14, 26, CANVAS(BIG), CANVAS(BIG), { stroke: "#999", dash: "3 4", sw: 1 })}${c(14 + CANVAS(BIG) / 2, 26 + CANVAS(BIG) / 2, BIG + 2 * CUT_BLEED, BLEED_O)}${c(14 + CANVAS(BIG) / 2, 26 + CANVAS(BIG) / 2, BIG, { fill: "#f7f2e8" })}
    ${dimH(14 + CANVAS(BIG) / 2 - BIG / 2, 14 + CANVAS(BIG) / 2 + BIG / 2, 21, `Ø${BIG} mm`)}${t(14 + CANVAS(BIG) / 2, 26 + CANVAS(BIG) + 6, `${l.canvas} ${CANVAS(BIG)} × ${CANVAS(BIG)}`, { size: 2.8 })}
    ${r(70, 29, CANVAS(SMALL), CANVAS(SMALL), { stroke: "#999", dash: "3 4", sw: 1 })}${c(70 + CANVAS(SMALL) / 2, 29 + CANVAS(SMALL) / 2, SMALL + 2 * CUT_BLEED, BLEED_O)}${c(70 + CANVAS(SMALL) / 2, 29 + CANVAS(SMALL) / 2, SMALL, { fill: "#f7f2e8" })}
    ${dimH(70 + CANVAS(SMALL) / 2 - SMALL / 2, 70 + CANVAS(SMALL) / 2 + SMALL / 2, 24, `Ø${SMALL} mm`)}${t(70 + CANVAS(SMALL) / 2, 29 + CANVAS(SMALL) + 9, `${l.canvas} ${CANVAS(SMALL)} × ${CANVAS(SMALL)}`, { size: 2.8 })}
    ${t(125, 40, l.art, { size: 2.8 })}${t(125, 46, "25 mm × 9 · 18 mm × 69", { size: 2.8 })}` }),
  river: l => {
    const ox = 20, oy = 26, wells = [];
    for (let sp = 1; sp <= 11; sp++) for (const y of [GEO.TOP, GEO.BOT]) wells.push(r(ox + GEO.spaceX(sp) - 21, oy + y, 42, 42, { stroke: "#7a6a52", sw: 1.2 }));
    const mist = [0, 1, 2].map(i => r(ox + GEO.mistX(i), oy + GEO.MY, GEO.MW, GEO.MH, { stroke: "#7a6a52", sw: 1.4, fill: "#ece4d4" })).join("");
    return { w: 3 * RPW + 40, h: RPH + 70, s: `${[0, 1, 2].map(i => r(ox + i * RPW, oy, RPW, RPH, { fill: "#f7f2e8" })).join("")}
      ${mist}${wells.join("")}${dimH(ox, ox + RPW, oy - 6, `${l.panel} ${RPW} mm`)}${dimH(ox, ox + 3 * RPW, oy + RPH + 10, `${3 * RPW} mm`)}${dimV(oy, oy + RPH, ox - 6, `${RPH} mm`)}
      ${t(ox + GEO.mistX(1) + GEO.MW + 4, oy + GEO.MY + 20, `${l.mist} ${GEO.MW} × ${GEO.MH} mm`, { size: 3.4, anchor: "start" })}
      ${t(ox + RPW * 1.5, oy + RPH / 2 + 18, `${l.well} 42 × 42 mm`, { size: 3.4 })}` };
  },
  loom: l => {
    const ox = 22, oy = 26, kx = k => 82 + k * 23;
    return { w: LOOM.w + 44, h: LOOM.h + 50, s: `${t((LOOM.w + 44) / 2, 9, `${l.loom} · ${l.ledger}`, { size: 5 })}${sheet(ox, oy, LOOM.w, LOOM.h, { rx: 3 })}
      ${[0, 1, 2].map(row => [0, 1, 2, 3, 4].map(k => c(ox + kx(k), oy + 54 + row * 50, LOOM.circle, { stroke: "#7a6a52", sw: 1.4 })).join("")).join("")}
      ${dimH(ox + kx(0), ox + kx(1), oy + 54 - 16, l.pitch)}${t(ox + kx(2), oy + 54 + 18, l.knot, { size: 3.2 })}
      ${t(ox + LOOM.w / 2, oy + LOOM.h - 12, `${LOOM.w} × ${LOOM.h} mm · ${l.ledger}: ${l.track}`, { size: 3.2 })}` };
  },
  page: l => ({ w: 430, h: 330, s: `${t(215, 9, `${l.book} · ${l.aid}`, { size: 4.5 })}${sheet(24, 30, 210, 280)}${t(129, 170, "210 × 280 mm", { size: 6 })}
    ${sheet(262, 30, 148, 210)}${t(336, 135, "A5 · 148 × 210 mm", { size: 5 })}` }),
  box: l => {
    const ox = 30, oy = 26, F = LID.L + 2 * LID.D + 2 * TURN;
    const fold = [TURN, TURN + LID.D, TURN + LID.D + LID.L].map(v => `${ln(ox + v, oy, ox + v, oy + F, { stroke: "#1fa0c8", dash: "8 6" })}${ln(ox, oy + v, ox + F, oy + v, { stroke: "#1fa0c8", dash: "8 6" })}`).join("");
    return { w: F + 60, h: F + 52, s: `${r(ox, oy, F, F, { fill: "#f7f2e8" })}${fold}
      ${dimH(ox, ox + F, oy - 6, `${F} mm`)}${dimV(oy + TURN + LID.D, oy + TURN + LID.D + LID.L, ox - 6, `${LID.L} mm`)}${dimV(oy + TURN, oy + TURN + LID.D, ox - 6, `${LID.D}`)}
      ${t(ox + F / 2, oy + F / 2, `${LID.L} × ${LID.L} × ${LID.D} mm`, { size: 6 })}${t(ox + F / 2, oy + F / 2 + 9, `${BASE.L} × ${BASE.L} × ${BASE.D} mm (base)`, { size: 4.5 })}
      ${t(ox + TURN / 2 + 1, oy + F / 2, l.turn, { size: 3.2, rot: -90 })}` };
  },
  fit: l => {
    const ox = 20, oy = 26, IN = 291;
    return { w: IN + 40, h: IN + 50, s: `${r(ox, oy, IN, IN, { fill: "#f7f2e8", sw: 3 })}${t(ox + IN / 2, oy + IN - 4, `${l.inside} ≈ ${IN} × ${IN} mm`, { size: 3.4 })}
      ${r(ox + 3, oy + 3, RPW, RPH, { stroke: "#7a6a52", sw: 2, dash: "12 6" })}${t(ox + 3 + RPW / 2, oy + 14, l.boards[0], { size: 4, fill: "#7a6a52" })}
      ${r(ox + 3, oy + 40, 285, 210, { stroke: "#1f6f8b", sw: 2, dash: "4 4" })}${t(ox + 3 + 285 / 2, oy + 40 + 105, l.boards[1], { size: 4, fill: "#1f6f8b" })}
      ${r(ox + 40, oy + 5, 210, 280, { stroke: "#d6247f", sw: 2, dash: "16 6" })}${t(ox + 40 + 105, oy + 270, l.boards[2], { size: 4, fill: "#d6247f" })}` };
  },
};

const ORDER = [["01-card", "card"], ["02-bank-tile", "tile"], ["03-tokens", "token"], ["04-river-board", "river"], ["05-loom-ledger", "loom"], ["06-pages", "page"], ["07-box-lid", "box"], ["08-box-fit", "fit"]];
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();
for (const [lang, dir] of [["en", "en"], ["zh", "zh-TW"]]) {
  const out = join(ROOT, "docs/print-specs", dir);
  mkdirSync(out, { recursive: true });
  for (const [file, key] of ORDER) {
    K = 4; const { w } = D[key](L[lang]); K = WIDTH / w;
    const { h, s } = D[key](L[lang]);
    await page.setViewportSize({ width: Math.ceil(w * K), height: Math.ceil(h * K) });
    await page.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500&family=Noto+Sans+TC:wght@400&display=block"></head><body style="margin:0;background:#fff"><svg xmlns="http://www.w3.org/2000/svg" width="${w * K}" height="${h * K}">${s}</svg></body></html>`, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(out, `${file}.png`), clip: { x: 0, y: 0, width: Math.ceil(w * K), height: Math.ceil(h * K) } });
  }
}
await browser.close();
console.log("drawings written to docs/print-specs");
