// The river board: three panels of 266 x 269 mm (3 mm bleed), one per Reach, joined edge to edge; they lie flat in the 296 mm
// box base. Painted banks and still water seen from above. Every bank of spaces 1-11 has a 42 mm square well for a 40 mm bank
// tile. Along the left bank runs a strip with each Reach's 66 x 91 mm Mist deck well and its name, so the river runs unbroken
// from the near shore to the Far Shore across the three joins: the water and bank paintings are mirrored on the middle panel so
// each join meets itself. Each river space is a ring of ripples with a halo where the soul token stands. All printed words are
// at least 3.7 mm (10.5 pt) high.
import { join } from "node:path";
import { BLEED, C, doc, art, render } from "./lib.mjs";
import { ZH_REACHES } from "../../web/public/assets/zh.js";
import { REACH_NAMES } from "../../web/public/assets/cards.js";

export const PW = 266, PH = 269, TILE = 40;
const SW = 42, MW = 66, MH = 91, MY = 6, TOP = MY + MH + 4, RY = TOP + SW + 4 + 31, BOT = RY + 35;
const BONE = C.bone, GILT = C.gilt, MIST = C.mist;
const RANGE = [[1, 4], [5, 8], [9, 11]], NUM = ["I", "II", "III"];
const f = x => (+x.toFixed(1)).toString();
const FS = 3.8;   // the smallest printed text, in mm (about 10.8 pt)
// A bank edge at height y, bowing by k: it leaves both joins level, so the edges of neighbouring panels meet.
const EDGE = (y, k) => `M${-BLEED - 20} ${y} H0 C40 ${y} 80 ${y - 6 * k} 133 ${y - 3 * k} S${PW - 40} ${y} ${PW} ${y} H${PW + BLEED + 20}`;
// the same lower edge, drawn back from the right
const EDGE_BACK = (y, k) => `H${PW} C${PW - 40} ${y} 186 ${y} 133 ${y - 3 * k} C80 ${y - 6 * k} 40 ${y} 0 ${y} H${-BLEED - 20}`;
// Where things sit on the three panels laid edge to edge (mm from the left of panel I): each panel spreads its spaces evenly
// over its width, after the near shore on panel I; the Far Shore takes the last space's place on panel III.
const NEAR = 30;
export const GEO = { SW, RY, TOP, BOT, NEAR, MW, MH, MY, mistX: r => r * PW + (r === 0 ? NEAR : 0) + 4,
  spaceX: sp => sp === 0 ? NEAR / 2 : sp <= 4 ? NEAR + (sp - .5) * (PW - NEAR) / 4 : sp <= 8 ? PW + (sp - 4.5) * PW / 4 : 2 * PW + (sp - 8.5) * PW / 4 };

const W = {
  en: { reach: r => `Reach ${NUM[r]} · ${REACH_NAMES[r]}`, left: "Left bank", right: "Right bank", open: "starts with a Bloom", fog: "bank tile, fog side up",
    mist: r => `Mist deck · Reach ${NUM[r]}`, mistNote: "face down; flip the top card at each end of turn",
    near: "Near Shore · the soul wakes here", far: "The Far Shore", keeper: "the Keeper and the cup", joins: r => `joins Reach ${NUM[r]}`,
    foot: i => `NETHERBLOOM · RIVER BOARD ${i + 1}/3 · ${PW} × ${PH} mm`, disp: "IM Fell English SC, Georgia, serif", serif: "IM Fell English, Georgia, serif" },
  zh: { reach: r => `第${["一", "二", "三"][r]}河段 · ${ZH_REACHES[r]}`, left: "左岸", right: "右岸", open: "開局即有一朵花", fog: "河岸板塊，霧面朝上",
    mist: r => `迷霧牌庫 · 第${["一", "二", "三"][r]}河段`, mistNote: "面朝下放置；每次回合結束時翻開最上面的1張",
    near: "此岸 · 亡魂在此醒來", far: "彼岸", keeper: "守岸人與那杯河水", joins: r => `接第${["一", "二", "三"][r]}河段`,
    foot: i => `《彼岸花渡》 · 河流圖板 ${i + 1}/3 · ${PW} × ${PH} mm`, disp: "Noto Serif TC, serif", serif: "Noto Serif TC, serif" },
};

// A small seeded random, so every build draws the same ripples.
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const uni = (r, a, b) => a + (b - a) * r();

function sketch(d, col, { w = 1, op = .5, n = 2, seed = 1 } = {}) {
  const r = rng(seed * 31 + 7);
  let s = "";
  for (let k = 0; k < n; k++) s += `<path d="${d}" transform="translate(${f(uni(r, -.8, .8))} ${f(uni(r, -.8, .8))})" fill="none" stroke="${col}" stroke-width="${f(w * (k ? .6 : 1))}" opacity="${(op * (k ? .55 : 1)).toFixed(2)}" stroke-linecap="round"/>`;
  return s;
}
function ring(cx, cy, rx, ry, r) {
  const ph1 = uni(r, 0, 6.3), ph2 = uni(r, 0, 6.3), a1 = uni(r, .02, .05), a2 = uni(r, .01, .03), pts = [];
  for (let i = 0; i < 49; i++) {
    const t = i / 48 * 2 * Math.PI, k = 1 + a1 * Math.sin(2 * t + ph1) + a2 * Math.sin(5 * t + ph2);
    pts.push(`${f(cx + rx * k * Math.cos(t))} ${f(cy + ry * k * Math.sin(t))}`);
  }
  return "M" + pts.join(" L") + " Z";
}
function ripple(x, y, num, seed, size = 10, k0 = .74) {
  const r = rng(seed * 7 + 3);
  let o = `<g transform="translate(${f(x)} ${f(y)}) scale(${k0}) translate(${f(-x)} ${f(-y)})"><ellipse cx="${f(x)}" cy="${f(y)}" rx="25" ry="18" fill="url(#pd-halo)"/>`;
  for (const side of [-1, 1]) {
    o += sketch(`M${f(x - 19)} ${f(y + side * 9)} C${f(x - 26)} ${f(y + side * 11)} ${f(x - 34)} ${f(y + side * 14)} ${f(x - 46)} ${f(y + side * 16)}`, BONE, { w: .3, op: .26, seed: seed + side + 50 });
    for (let j = 0; j < 3; j++) {
      const cx = x - 24 - j * 8, cy = y + side * (11.5 + j * 1.6);
      o += `<path d="M${f(cx - 2.6)} ${f(cy - side * 1.6)} Q${f(cx)} ${f(cy + side * .6)} ${f(cx + 2.6)} ${f(cy - side * 1.6)}" fill="none" stroke="${C.cyan}" stroke-width=".2" opacity="${(.3 - j * .08).toFixed(2)}"/>`;
    }
  }
  for (let k = 0; k < 5; k++) {
    const rr = 8.2 + k * 4, op = .58 - k * .1;
    const dash = [0, 1, 2].map(() => `${(uni(r, 6, 16) * (1 + k * .4)).toFixed(1)} ${(uni(r, .4, 1.4) * (1 + k * 1.1)).toFixed(1)}`).join(" ");
    const d = ring(x - k * 1.3, y, rr, rr * .74, r);
    o += `<path d="${d}" fill="none" stroke="${BONE}" stroke-width="${(.5 - k * .07).toFixed(2)}" stroke-dasharray="${dash}" stroke-dashoffset="${uni(r, 0, 20).toFixed(1)}" opacity="${op.toFixed(2)}" stroke-linecap="round"/>`;
    if (k < 3) o += `<path d="${d}" transform="translate(.5 .5)" fill="none" stroke="${C.cyan}" stroke-width=".22" stroke-dasharray="${dash}" opacity="${(op * .4).toFixed(2)}"/>`;
  }
  return o + `</g><text x="${f(x)}" y="${f(y + size * .34)}" text-anchor="middle" font-family="IM Fell English, Georgia, serif" font-size="${size}" fill="${BONE}" stroke="#050407" stroke-opacity=".8" stroke-width=".8" stroke-linejoin="round" paint-order="stroke" filter="url(#pd-numglow)">${num}</text>`;
}

const DEFS = `<defs>
<filter id="pd-feather" x="-5%" y="-40%" width="110%" height="180%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="pd-mist" x="-20%" y="-80%" width="140%" height="260%"><feTurbulence type="fractalNoise" baseFrequency=".02 .08" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="3"/></filter>
<linearGradient id="pd-deep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020306" stop-opacity="0"/><stop offset=".5" stop-color="#010204" stop-opacity=".5"/><stop offset="1" stop-color="#020306" stop-opacity="0"/></linearGradient>
<linearGradient id="pd-edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d5a62" stop-opacity=".55"/><stop offset=".3" stop-color="#16343b" stop-opacity=".15"/><stop offset=".7" stop-color="#16343b" stop-opacity=".15"/><stop offset="1" stop-color="#2d5a62" stop-opacity=".55"/></linearGradient>
<filter id="pd-soft" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="1.4"/></filter>
<radialGradient id="pd-halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F3E6C0" stop-opacity=".34"/><stop offset=".35" stop-color="#E6D3A3" stop-opacity=".16"/><stop offset=".7" stop-color="#8FD6E1" stop-opacity=".07"/><stop offset="1" stop-color="#8FD6E1" stop-opacity="0"/></radialGradient>
<filter id="pd-numglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="b"/><feFlood flood-color="#F3E6C0" flood-opacity=".55"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="pd-red" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#D7263D" stop-opacity=".45"/><stop offset="1" stop-color="#D7263D" stop-opacity="0"/></radialGradient>
<linearGradient id="pd-vig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".16" stop-color="#000" stop-opacity="0"/><stop offset=".84" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>
<mask id="pd-band" maskUnits="userSpaceOnUse" x="-10" y="0" width="${PW + 20}" height="${PH}"><path d="${EDGE(RY - 31, 1)} V${RY + 31} ${EDGE_BACK(RY + 31, -1)} Z" fill="#fff" filter="url(#pd-feather)"/></mask>
</defs>`;

// pieces: optional {"space,bank": "bloom" | "root" | "card"} drawn in the wells, for pictures of a game in play (the box back).
export function panel(ri, lang, pieces = {}) {
  const w = W[lang], [a, b] = RANGE[ri], spaces = Array.from({ length: b - a + 1 }, (_, i) => a + i);
  // left to right: (Reach I) the near shore, the spaces, (Reach III) the Far Shore. The middle panel's paintings are mirrored,
  // so the left join shows the same strip of painting on both sides, and so does the right one.
  const nearW = ri === 0 ? NEAR : 0, xs = spaces.map(sp => GEO.spaceX(sp) - ri * PW), x0 = xs[0], lastX = xs[xs.length - 1];
  const B = BLEED, bank = art("tex-bank"), water = art("tex-water"), mirror = ri === 1 ? ` transform="translate(${PW} 0) scale(-1 1)"` : "";
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-B} ${-B} ${PW + 2 * B} ${PH + 2 * B}" width="${PW + 2 * B}mm" height="${PH + 2 * B}mm">${DEFS}
    <rect x="${-B}" y="${-B}" width="${PW + 2 * B}" height="${PH + 2 * B}" fill="#0f0d11"/>
    ${bank ? `<g${mirror}><image href="${bank}" x="${-B}" y="${-B}" width="${((PH + 2 * B) * 1.98).toFixed(0)}" height="${PH + 2 * B}" preserveAspectRatio="none" opacity=".92"/></g>` : ""}
    <rect x="${-B}" y="${-B}" width="${PW + 2 * B}" height="${PH + 2 * B}" fill="#0f0d11" opacity=".3"/>`;
  const r = rng(ri * 7 + 3);
  let refl = "";
  for (let i = 0; i < 7; i++) refl += `<ellipse cx="${f(uni(r, 10, PW - 10))}" cy="${f(RY + (r() < .5 ? -1 : 1) * uni(r, 12, 20))}" rx="${f(uni(r, 3, 6))}" ry="${f(uni(r, 1, 2))}" fill="${C.crimson}" opacity="${uni(r, .14, .3).toFixed(2)}"/>`;
  o += `<g mask="url(#pd-band)"><rect x="${-B}" y="${RY - 40}" width="${PW + 2 * B}" height="80" fill="#071319"/>
    ${water ? `<g${mirror}><image href="${water}" x="${-B}" y="${RY - 40}" width="${(170 * 1.98).toFixed(0)}" height="80" preserveAspectRatio="none" transform="scale(1.4 1)" opacity=".9"/></g>` : ""}
    <rect x="${-B}" y="${RY - 40}" width="${PW + 2 * B}" height="80" fill="url(#pd-edge)"/><rect x="${-B}" y="${RY - 40}" width="${PW + 2 * B}" height="80" fill="url(#pd-deep)"/>
    <g filter="url(#pd-soft)">${refl}</g></g>`;
  // the bank edges, drawn alike on every panel so they run on across the joins
  o += sketch(EDGE(RY - 31, 1), BONE, { w: .35, op: .35, seed: 1 });
  o += sketch(EDGE(RY + 31, -1), BONE, { w: .35, op: .35, seed: 4 });
  [[60, 100], [148, 110], [222, 76]].forEach(([cx, wd], k) => { o += `<ellipse cx="${cx}" cy="${RY + (k - 1) * 5}" rx="${wd / 2}" ry="7" fill="${MIST}" opacity=".2" filter="url(#pd-mist)"/>`; });
  // the strip along the left bank: the Reach's Mist deck well, and the Reach's name beside it
  const titleX = (x0 - SW / 2 + lastX + SW / 2) / 2, mistX = GEO.mistX(ri) - ri * PW, my = MY;
  o += `<text x="${f(mistX + MW + 10)}" y="${f(my + MH / 2)}" font-family="${w.disp}" font-size="7" fill="${BONE}" style="paint-order:stroke" stroke="#0f0d11" stroke-width="1.6">${w.reach(ri)}</text>`;
  o += `<rect x="${f(mistX)}" y="${f(my)}" width="${MW}" height="${MH}" rx="4" fill="#0b0f12" fill-opacity=".78" stroke="#4f7d86" stroke-width=".7"/>
    <rect x="${f(mistX + 2.2)}" y="${f(my + 2.2)}" width="${MW - 4.4}" height="${MH - 4.4}" rx="2.6" fill="none" stroke="#4f7d86" stroke-width=".25" stroke-dasharray="1.2 1.2"/>
    <use href="#nb-fog" x="${f(mistX + MW / 2 - 11)}" y="${f(my + 22)}" width="22" height="22" style="color:${C.cyan}" opacity=".6"/>
    <foreignObject x="${f(mistX + 4)}" y="${f(my + 50)}" width="${MW - 8}" height="38"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${w.serif};font-size:${FS}px;line-height:1.2;color:${BONE};text-align:center"><b style="font-weight:600">${w.mist(ri)}</b><br/><span style="color:${MIST}">${w.mistNote}</span></div></foreignObject>`;
  if (ri === 0) {
    o += `<path d="M${-B} ${-B} H${nearW} C${nearW + 4} 60 ${nearW - 4} 120 ${nearW + 2} ${PH + B} H${-B} Z" fill="#0a090c" opacity=".85"/>` + sketch(`M${nearW} ${-B} C${nearW + 4} 60 ${nearW - 4} 120 ${nearW + 2} ${PH + B}`, BONE, { w: .4, op: .45, seed: 21 });
    o += ripple(nearW / 2 + .5, RY, 0, 30, 7, .5);
    o += `<text x="${f(nearW / 2 - 2)}" y="${PH - 12}" font-family="${w.disp}" font-size="${FS}" fill="${BONE}" transform="rotate(-90 ${f(nearW / 2 - 2)} ${PH - 12})">${w.near}</text>`;
  }
  if (ri === 2) {
    const fx = GEO.spaceX(12) - 2 * PW;
    o += `<path d="M${PW + B} ${-B} H${f(fx - 22)} C${f(fx - 28)} 60 ${f(fx - 18)} 120 ${f(fx - 24)} ${PH + B} H${PW + B} Z" fill="#1a0b10" opacity=".92"/>` + sketch(`M${f(fx - 22)} ${-B} C${f(fx - 28)} 60 ${f(fx - 18)} 120 ${f(fx - 24)} ${PH + B}`, "#d9a441", { w: .45, op: .6, seed: 22 });
    o += `<circle cx="${f(fx)}" cy="${RY + 30}" r="20" fill="url(#pd-red)"/><use href="#nb-bloom" x="${f(fx - 10)}" y="${RY + 20}" width="20" height="20" style="color:${C.crimson}"/>`;
    o += ripple(fx, RY, 12, 12, 8, .6);
    o += `<text x="${f(fx)}" y="${RY - 26}" text-anchor="middle" font-family="${w.disp}" font-size="5.2" fill="${BONE}">${w.far}</text>`;
    o += `<foreignObject x="${f(fx - 19)}" y="${RY - 23}" width="38" height="12"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${w.serif};font-style:italic;font-size:${FS}px;line-height:1.15;color:${MIST};text-align:center">${w.keeper}</div></foreignObject>`;
  }
  if (ri > 0) o += `<text x="2" y="${PH - 4}" font-family="IBM Plex Mono, ${w.serif}" font-size="${FS}" fill="${MIST}">◀ ${w.joins(ri - 1)}</text>`;
  if (ri < 2) o += `<text x="${PW - 2}" y="${PH - 4}" text-anchor="end" font-family="IBM Plex Mono, ${w.serif}" font-size="${FS}" fill="${MIST}">${w.joins(ri + 1)} ▶</text>`;
  spaces.forEach((sp, j) => {
    const x = xs[j];
    for (const [bk, y0, label] of [[0, TOP, w.left], [1, BOT, w.right]]) {
      const piece = pieces[`${sp},${bk}`];
      o += `<rect x="${f(x - SW / 2)}" y="${f(y0)}" width="${SW}" height="${SW}" rx="3" fill="#0b0a0d" fill-opacity=".72" stroke="${GILT}" stroke-width=".6"/>`;
      o += `<rect x="${f(x - SW / 2 + 1.6)}" y="${f(y0 + 1.6)}" width="${SW - 3.2}" height="${SW - 3.2}" rx="2" fill="none" stroke="${GILT}" stroke-width=".22" stroke-dasharray="1.1 1.1" opacity=".8"/>`;
      const mid = y0 + SW / 2, open = sp === 1;
      if (piece === "card") o += `<rect x="${f(x - TILE / 2)}" y="${f(y0 + 1)}" width="${TILE}" height="${TILE}" rx="2" fill="#1e2a30" stroke="#5f8d95" stroke-width=".6"/><use href="#nb-fog" x="${f(x - 9)}" y="${f(mid - 9)}" width="18" height="18" style="color:${C.cyan}" opacity=".75"/>`;
      else {
        o += `<use href="#${open ? "nb-bloom" : "nb-fog"}" x="${f(x - 7)}" y="${f(y0 + 4)}" width="14" height="14" style="color:${open ? C.crimson : MIST}" opacity="${open ? 1 : .7}"/>`;
        o += `<foreignObject x="${f(x - SW / 2 + 2)}" y="${f(y0 + 18.5)}" width="${SW - 4}" height="${SW - 20}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${w.serif};font-size:${FS}px;line-height:1.12;color:${MIST};text-align:center">${open ? w.open : w.fog}<br/><span style="color:${BONE}">${label} · ${sp}</span></div></foreignObject>`;
      }
      if (piece === "bloom" || piece === "root") o += `<circle cx="${f(x)}" cy="${f(mid)}" r="12" fill="url(#pd-red)"/><use href="#nb-${piece}" x="${f(x - 9)}" y="${f(mid - 9)}" width="18" height="18" style="color:${piece === "bloom" ? C.crimson : BONE}"/>`;
    }
    o += ripple(x, RY, sp, sp, 8);
  });
  o += `<rect x="${-B}" y="${-B}" width="${PW + 2 * B}" height="${PH + 2 * B}" fill="url(#pd-vig)"/>`;
  o += `<text x="${f(titleX)}" y="${PH - 4}" text-anchor="middle" font-family="IBM Plex Mono, ${w.serif}" font-size="3" fill="${MIST}" opacity=".8">${w.foot(ri)}</text>`;
  return o + "</svg>";
}

export async function build(lang, dir, { png }) {
  const w = PW + 2 * BLEED, h = PH + 2 * BLEED;
  const pages = [0, 1, 2].map(ri => ({ name: `river-panel-${ri + 1}`, html: panel(ri, lang) }));
  await render(join(dir, "river-board"), doc({ lang, title: "River board", w, h, css: ".pg > svg { display: block; width: 100%; height: 100%; }", pages }), { w, h, png });
}
