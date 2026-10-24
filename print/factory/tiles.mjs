// The bank tiles: one die-cut sheet (A4 landscape, 3 mm bleed) of twenty 40 mm square tiles, 6 / 8 / 6 for Reaches I / II / III.
// Each sits in a 42 mm well on the river board, fog side up, and is turned over when a Root is placed on it.
// Pages: 1 fronts (painting, name and what happens), 2 backs (mirrored left-to-right for duplex: the fog and the Reach's
// numeral), 3 die line (cut squares only, magenta, for the factory's cutting die). All text is at least 3.7 mm (10.5 pt).
import { join } from "node:path";
import { BLEED, C, doc, render, art, esc } from "./lib.mjs";
import { TILES } from "../../web/public/assets/cards.js";
import { T } from "../../web/public/assets/cardface.js";

const SW = 297, SH = 210;
export const TILE = 40;
const PITCH = 46, COLS = 5, CUT_BLEED = 2, FS = 3.8;
const X0 = (SW - (COLS - 1) * PITCH - TILE) / 2, Y0 = (SH - 3 * PITCH - TILE) / 2;
const ART = ["card-bank-fertile", "card-bank-stony", "card-bank-memory", "card-bank-grave"];
const ICON = ["nb-fertile", "nb-stony", "nb-memorysite", "nb-grave"], ICOL = ["#c9c1b2", C.mist, C.bone, C.cyan];
const NUM = ["I", "II", "III"];

// The words are the card template's (cardface.js T), so the tiles say exactly what the web table and the rules say.
const W = {
  en: { ...T.en, font: "IM Fell English, Georgia, serif", disp: "IM Fell English SC, Georgia, serif" },
  zh: { ...T.zh, font: "Noto Serif TC, serif", disp: "Noto Serif TC, serif" },
};

// Every tile in sheet order: [type, reach, x, y].
function layout() {
  const out = [];
  TILES.forEach(([, list], r) => list.forEach(t => out.push([t, r])));
  return out.map(([t, r], i) => [t, r, X0 + (i % COLS) * PITCH, Y0 + Math.floor(i / COLS) * PITCH]);
}

const html = (x, y, w, h, inner) => `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="${inner[0]}">${inner[1]}</div></foreignObject>`;

function front(L, t, r, x, y, id) {
  const R = CUT_BLEED, a = art(ART[t]);
  return `<g><clipPath id="tc${id}"><rect x="${x - R}" y="${y - R}" width="${TILE + 2 * R}" height="${TILE + 2 * R}"/></clipPath>
    <g clip-path="url(#tc${id})"><rect x="${x - R}" y="${y - R}" width="${TILE + 2 * R}" height="${TILE + 2 * R}" fill="${C.ink2}"/>
    ${a ? `<image href="${a}" x="${x - R}" y="${y - R}" width="${TILE + 2 * R}" height="${TILE + 2 * R}" preserveAspectRatio="xMidYMid slice"/>` : ""}
    <rect x="${x - R}" y="${y - R}" width="${TILE + 2 * R}" height="${TILE + 2 * R}" fill="url(#tl-shade)"/></g>
    <rect x="${x + 1.2}" y="${y + 1.2}" width="${TILE - 2.4}" height="${TILE - 2.4}" rx="1.6" fill="none" stroke="${C.gilt}" stroke-width=".35"/>
    <use href="#${ICON[t]}" x="${x + 2.6}" y="${y + 2.4}" width="7" height="7" style="color:${ICOL[t]}"/>
    ${html(x + 10.8, y + 2.6, TILE - 18.6, 9, [`font-family:${L.disp};font-size:4.8px;line-height:1.1;font-weight:600;color:${C.paper};text-shadow:0 .3px 1px #000`, esc(L.tile(t))])}
    ${html(x + 2.4, y + 11, TILE - 4.8, TILE - 13.4, [`height:100%;display:flex;flex-direction:column;justify-content:flex-end;font-family:${L.font};font-size:${FS}px;line-height:1.16;color:${C.paper};text-align:center;text-shadow:0 .3px 1px #000,0 0 2px #000`, esc(L.tileText[t])])}
    <text x="${x + TILE - 2.4}" y="${y + 6.6}" text-anchor="end" font-family="IM Fell English SC, serif" font-size="4.2" fill="${C.bone}" opacity=".85">${NUM[r]}</text></g>`;
}

function back(L, r, x, y, id) {
  const R = CUT_BLEED, a = art("card-fog");
  return `<g><clipPath id="tb${id}"><rect x="${x - R}" y="${y - R}" width="${TILE + 2 * R}" height="${TILE + 2 * R}"/></clipPath>
    <g clip-path="url(#tb${id})"><rect x="${x - R}" y="${y - R}" width="${TILE + 2 * R}" height="${TILE + 2 * R}" fill="#1e2a30"/>
    ${a ? `<image href="${a}" x="${x - R}" y="${y - R}" width="${TILE + 2 * R}" height="${TILE + 2 * R}" preserveAspectRatio="xMidYMid slice"/>` : ""}</g>
    <rect x="${x + 1.2}" y="${y + 1.2}" width="${TILE - 2.4}" height="${TILE - 2.4}" rx="1.6" fill="none" stroke="rgba(143,214,225,.55)" stroke-width=".35"/>
    <text x="${x + TILE / 2}" y="${y + 21}" text-anchor="middle" font-family="IM Fell English SC, serif" font-size="13" fill="${C.bone}" style="paint-order:stroke" stroke="#000" stroke-opacity=".5" stroke-width="1">${NUM[r]}</text>
    ${html(x + 2, y + 25, TILE - 4, 12, [`font-family:${L.disp};font-size:${FS}px;line-height:1.15;color:${C.paper};text-align:center;text-shadow:0 0 2px #000`, `${esc(L.fog)} · ${esc(L.reachName(r))}`])}</g>`;
}

const SHADE = `<linearGradient id="tl-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e0c11" stop-opacity=".75"/><stop offset=".22" stop-color="#0e0c11" stop-opacity=".05"/><stop offset=".35" stop-color="#0e0c11" stop-opacity=".3"/><stop offset=".6" stop-color="#0e0c11" stop-opacity=".85"/><stop offset="1" stop-color="#0e0c11" stop-opacity=".95"/></linearGradient>`;

function sheet(lang, side) {
  const L = W[lang], B = BLEED;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-B} ${-B} ${SW + 2 * B} ${SH + 2 * B}" width="${SW + 2 * B}mm" height="${SH + 2 * B}mm">
    <defs>${SHADE}</defs>`;
  o += side === "die"
    ? `<rect x="${-B}" y="${-B}" width="${SW + 2 * B}" height="${SH + 2 * B}" fill="#fff"/><rect x="0" y="0" width="${SW}" height="${SH}" fill="none" stroke="#00a0e0" stroke-width=".3" stroke-dasharray="2 1"/>`
    : `<rect x="${-B}" y="${-B}" width="${SW + 2 * B}" height="${SH + 2 * B}" fill="${C.ink}"/>`;
  layout().forEach(([t, r, x0, y], i) => {
    const x = side === "back" ? SW - x0 - TILE : x0;   // mirrored so each back sits behind its front
    if (side === "front") o += front(L, t, r, x, y, i);
    else if (side === "back") o += back(L, r, x, y, i);
    else o += `<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" rx="1.5" fill="none" stroke="#ec008c" stroke-width=".25"/>`;
  });
  if (side === "die") o += `<text x="4" y="${SH - 4}" font-family="IBM Plex Mono, monospace" font-size="3" fill="#ec008c">DIE LINE · cut squares · ${TILE} × ${TILE} mm, 1.5 mm corners · trim (blue) 297 × 210 mm · art bleeds ${CUT_BLEED} mm past every cut</text>`;
  return o + "</svg>";
}

export const TILE_COUNT = TILES.reduce((n, t) => n + t[1].length, 0);

// One tile per page, trimmed to 40 mm, for the digital table (Screentop) and the web: 20 fronts, then a fog back per Reach.
function singles(lang) {
  const L = W[lang], names = ["fertile", "stony", "memory", "grave"], one = (inner, x, y) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${TILE} ${TILE}" width="${TILE}mm" height="${TILE}mm">
    <defs>${SHADE}</defs>${inner}</svg>`;
  const pages = layout().map(([t, r], i) => ({ name: `tile-${r + 1}-${String(i + 1).padStart(2, "0")}-${names[t]}`, html: one(front(L, t, r, 0, 0, i), 0, 0) }));
  return pages.concat([0, 1, 2].map(r => ({ name: `tile-back-${r + 1}`, html: one(back(L, r, 0, 0, `b${r}`), 0, 0) })));
}

export async function build(lang, dir, { png }) {
  const w = SW + 2 * BLEED, h = SH + 2 * BLEED, css = ".pg > svg { display: block; width: 100%; height: 100%; }";
  const pages = ["front", "back", "die"].map(s => ({ name: `bank-tiles-${s}`, html: sheet(lang, s) }));
  await render(join(dir, "bank-tiles"), doc({ lang, title: "Bank tiles", w, h, css, pages }), { w, h, png });
  await render(join(dir, "bank-tile-singles"), doc({ lang, title: "Bank tiles, one per page", w: TILE, h: TILE, css, pages: singles(lang) }), { w: TILE, h: TILE, png });
}
