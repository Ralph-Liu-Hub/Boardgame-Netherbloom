// The Soul standees: one die-cut sheet (A4 portrait, 3 mm bleed, printed one side) of five fold-up triangle standees, one per
// Soul. Each is a single strip, top to bottom: glue tab, base, back face (upside down), front face. Fold on the three
// lines, glue the tab inside the front face, and it stands as a little tent: the Soul's portrait on both sides, a 32 x 22 mm
// base that fits a river space, 50 mm tall. Below the strips, how to make one. Pages: 1 print, 2 die line (cut in magenta, fold in cyan).
// All text is at least 3.7 mm (10.5 pt).
import { join } from "node:path";
import { BLEED, C, doc, render, art, esc } from "./lib.mjs";
import { SOULS } from "../../web/public/assets/cards.js";
import { ZH_SOULS } from "../../web/public/assets/zh.js";
import { SOUL_ART } from "../../web/public/assets/cardface.js";

const SW = 210, SH = 297;
export const SD = { w: 32, face: 52, base: 22, tab: 10 };
const { w: SWD, face: FH, base: BH, tab: TH } = SD;
const LEN = TH + BH + 2 * FH, PITCH = 40, R = 1.5, FS = 3.8;
const KEYS = Object.keys(SOULS);
const X0 = (SW - (KEYS.length - 1) * PITCH - SWD) / 2, Y0 = 16;
// fold lines, measured down the strip: tab | base | back face | front face
const F1 = TH, F2 = TH + BH, F3 = TH + BH + FH;

const W = {
  en: { name: k => SOULS[k].name, kick: "Soul", glue: "Glue", base: "Base", font: "IM Fell English, Georgia, serif", disp: "IM Fell English SC, Georgia, serif",
    title: "Soul standees: cut, fold, glue",
    steps: ["Cut out each strip along its outer edge.", "Fold all three lines the same way, picture side out.",
      "Glue the tab inside the bottom of the front face: the strip closes into a triangle.", "Stand the soul you are guiding on the near shore, space 0; it moves along the river from there."],
    labels: ["front", "back", "base", "tab"] },
  zh: { name: k => ZH_SOULS[k].name, kick: "亡魂", glue: "黏貼處", base: "底座", font: "Noto Serif TC, serif", disp: "Noto Serif TC, serif",
    title: "亡魂立牌：剪下、摺起、黏合",
    steps: ["沿外框剪下每一條立牌。", "將3條摺線全部往同一方向摺，圖面朝外。",
      "將黏貼處黏在正面底部的內側，使立牌圍成三角形。", "將本局引渡的亡魂立牌放置到此岸（第0格），之後它會沿著河流前進。"],
    labels: ["正面", "背面", "底座", "黏貼處"] },
};

const html = (x, y, w, h, style, inner) => `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="${style}">${inner}</div></foreignObject>`;

// One face: the portrait, a shade, the frame and the name. Drawn upright at (x, y); the back face is the same, turned over.
function face(L, k, x, y, id) {
  const a = art(`soul-${SOUL_ART[k]}`);
  return `<clipPath id="sf${id}"><rect x="${x - R}" y="${y}" width="${SWD + 2 * R}" height="${FH}"/></clipPath>
    <g clip-path="url(#sf${id})"><rect x="${x - R}" y="${y}" width="${SWD + 2 * R}" height="${FH}" fill="${C.ink2}"/>
    ${a ? `<image href="${a}" x="${x - R}" y="${y}" width="${SWD + 2 * R}" height="${FH}" preserveAspectRatio="xMidYMin slice"/>` : ""}
    <rect x="${x - R}" y="${y}" width="${SWD + 2 * R}" height="${FH}" fill="url(#sd-shade)"/></g>
    <rect x="${x + 1.2}" y="${y + 1.2}" width="${SWD - 2.4}" height="${FH - 2.4}" rx="1.4" fill="none" stroke="${C.gilt}" stroke-width=".35"/>
    ${html(x + 2, y + FH - 17, SWD - 4, 15, `height:100%;display:flex;flex-direction:column;justify-content:flex-end;text-align:center;color:${C.paper};text-shadow:0 .3px 1px #000,0 0 2px #000`,
      `<span style="font-family:IBM Plex Mono,monospace;font-size:2.6px;letter-spacing:.12em;text-transform:uppercase;color:${C.cyan}">${esc(L.kick)}</span><span style="font-family:${L.disp};font-size:${FS + .4}px;line-height:1.08">${esc(L.name(k))}</span>`)}`;
}

function strip(L, k, x, y, i) {
  const base = `<rect x="${x - R}" y="${y - R}" width="${SWD + 2 * R}" height="${F2 + R}" fill="${C.ink}"/>
    <rect x="${x + 1}" y="${y + F1 + 1}" width="${SWD - 2}" height="${BH - 2}" rx="1.2" fill="none" stroke="${C.ash}" stroke-width=".3"/>
    ${html(x, y + F1 + 2, SWD, BH - 4, `height:100%;display:flex;flex-direction:column;justify-content:center;text-align:center;font-family:${L.font};font-size:${FS}px;line-height:1.15;color:${C.bone}`, `${esc(L.base)}<br><span style="color:${C.mist}">${esc(L.name(k))}</span>`)}
    <rect x="${x + 1}" y="${y + 1}" width="${SWD - 2}" height="${TH - 2}" rx="1.2" fill="none" stroke="${C.ash}" stroke-width=".3" stroke-dasharray="1 .8"/>
    ${html(x, y + 1.6, SWD, TH - 3, `height:100%;display:flex;align-items:center;justify-content:center;font-family:${L.font};font-size:${FS}px;line-height:1.3;color:${C.mist}`, esc(L.glue))}`;
  return `<g>${base}
    <g transform="rotate(180 ${x + SWD / 2} ${y + F2 + FH / 2})">${face(L, k, x, y + F2, `b${i}`)}</g>
    ${face(L, k, x, y + F3, `f${i}`)}
    <rect x="${x - R}" y="${y + LEN}" width="${SWD + 2 * R}" height="${R}" fill="${C.ink2}"/></g>`;
}

// Fold marks: short ticks just outside the cut, so a home printer shows where to fold without a line across the picture.
const ticks = (x, y) => [F1, F2, F3].map(f => `<path d="M${x - 5} ${y + f}h3.2M${x + SWD + 1.8} ${y + f}h3.2" stroke="${C.mist}" stroke-width=".3"/>`).join("");

// How to make one: the strip, side on, folding into its triangle.
function howto(L, y) {
  const lx = 22, ly = y + 16, cx = 48, cy = y + 66;
  const tri = `<path d="M${cx} ${cy - 40} L${cx - 11} ${cy} L${cx + 11} ${cy} Z" fill="rgba(230,211,163,.08)" stroke="${C.bone}" stroke-width=".5"/>
    <path d="M${cx - 11} ${cy} l3 -9" stroke="${C.crimson}" stroke-width="1.2"/>`;
  const lab = (x, y2, t, a = "start") => `<text x="${x}" y="${y2}" text-anchor="${a}" font-family="${L.font}" font-size="${FS}" fill="${C.paper}">${esc(t)}</text>`;
  const [fr, bk, bs, tb] = L.labels;
  return `<rect x="10" y="${y}" width="${SW - 20}" height="80" rx="2" fill="${C.ink2}" stroke="${C.ash}" stroke-width=".3"/>
    ${html(lx - 6, ly - 12, SW - 2 * lx, 10, `font-family:${L.disp};font-size:5.2px;color:${C.bone}`, esc(L.title))}
    ${tri}${lab(cx - 15, cy - 18, fr, "end")}${lab(cx + 15, cy - 18, bk)}${lab(cx, cy + 6.5, bs, "middle")}${lab(cx - 17, cy - 5, tb, "end")}
    ${html(84, ly, SW - 84 - 18, 64, `font-family:${L.font};font-size:${FS}px;line-height:1.4;color:${C.paper}`,
      `<ol style="margin:0;padding-left:5.2px">${L.steps.map(s => `<li style="margin-bottom:2.2px">${esc(s)}</li>`).join("")}</ol>`)}`;
}

function sheet(lang, side) {
  const L = W[lang], B = BLEED;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-B} ${-B} ${SW + 2 * B} ${SH + 2 * B}" width="${SW + 2 * B}mm" height="${SH + 2 * B}mm">
    <defs><linearGradient id="sd-shade" x1="0" y1="0" x2="0" y2="1"><stop offset=".5" stop-color="#0e0c11" stop-opacity="0"/><stop offset=".78" stop-color="#0e0c11" stop-opacity=".8"/><stop offset="1" stop-color="#0e0c11" stop-opacity=".95"/></linearGradient></defs>`;
  if (side === "die") {
    o += `<rect x="${-B}" y="${-B}" width="${SW + 2 * B}" height="${SH + 2 * B}" fill="#fff"/><rect x="0" y="0" width="${SW}" height="${SH}" fill="none" stroke="#00a0e0" stroke-width=".3" stroke-dasharray="2 1"/>`;
    KEYS.forEach((_, i) => {
      const x = X0 + i * PITCH;
      o += `<rect x="${x}" y="${Y0}" width="${SWD}" height="${LEN}" fill="none" stroke="#ec008c" stroke-width=".25"/>`
        + [F1, F2, F3].map(f => `<path d="M${x} ${Y0 + f}h${SWD}" stroke="#00a0e0" stroke-width=".25" stroke-dasharray="1.5 1"/>`).join("");
    });
    o += `<text x="4" y="${SH - 4}" font-family="IBM Plex Mono, monospace" font-size="3" fill="#ec008c">DIE LINE · cut (magenta) ${SWD} × ${LEN} mm strips · score and fold (cyan, dashed) at ${F1}, ${F2}, ${F3} mm · trim (blue) 210 × 297 mm</text>`;
    return o + "</svg>";
  }
  o += `<rect x="${-B}" y="${-B}" width="${SW + 2 * B}" height="${SH + 2 * B}" fill="${C.ink}"/>`;
  KEYS.forEach((k, i) => { const x = X0 + i * PITCH; o += strip(L, k, x, Y0, i) + ticks(x, Y0); });
  return o + howto(L, Y0 + LEN + 10) + "</svg>";
}

export async function build(lang, dir, { png }) {
  const w = SW + 2 * BLEED, h = SH + 2 * BLEED;
  const pages = ["print", "die"].map(s => ({ name: `soul-standees-${s}`, html: sheet(lang, s) }));
  await render(join(dir, "soul-standees"), doc({ lang, title: "Soul standees", w, h, css: ".pg > svg { display: block; width: 100%; height: 100%; }", pages }), { w, h, png });
}
