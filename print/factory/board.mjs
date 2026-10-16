// The river board: three A3 panels (420 x 297 mm, 3 mm bleed), one per Reach, joined edge to edge.
// Painted banks and still water seen from above; every bank of spaces 1-11 has a 66 x 91 mm well for a 63 x 88 mm bank card;
// each river space is a ring of ripples with a halo where the Soul token stands.
import { join } from "node:path";
import { BLEED, C, doc, art, render } from "./lib.mjs";
import { ZH_REACHES } from "../../web/public/assets/zh.js";
import { REACH_NAMES } from "../../web/public/assets/cards.js";

const PW = 420, PH = 297, SW = 66, SH = 91, PITCH = 74, RY = 148.5;
const BONE = C.bone, GILT = C.gilt, MIST = C.mist;
const RANGE = [[1, 4], [5, 8], [9, 11]], NUM = ["I", "II", "III"];
const f = x => (+x.toFixed(1)).toString();

const W = {
  en: { reach: r => `Reach ${NUM[r]} · ${REACH_NAMES[r]}`, left: "Left bank", right: "Right bank", open: "open bank · starts with a Bloom", fog: "bank card, fog side up",
    near: "The Near Shore · the soul wakes here", far: "The Far Shore", keeper: "the Keeper and the cup", joins: r => `joins Reach ${NUM[r]}`,
    foot: i => `NETHERBLOOM · RIVER BOARD · PANEL ${i + 1} OF 3 · A3 · 420 × 297 mm`, disp: "IM Fell English SC, Georgia, serif", serif: "IM Fell English, Georgia, serif" },
  zh: { reach: r => `第${["一", "二", "三"][r]}河段 · ${ZH_REACHES[r]}`, left: "左岸", right: "右岸", open: "開放河岸 · 開局即有一朵花", fog: "河岸牌，霧面朝上",
    near: "此岸 · 亡魂在此醒來", far: "彼岸", keeper: "守岸人與那杯河水", joins: r => `接第${["一", "二", "三"][r]}河段`,
    foot: i => `《彼岸花渡》 · 河流圖板 · 第${i + 1}／3塊 · A3 · 420 × 297 mm`, disp: "Noto Serif TC, serif", serif: "Noto Serif TC, serif" },
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
function ripple(x, y, num, seed, size = 10) {
  const r = rng(seed * 7 + 3);
  let o = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="25" ry="18" fill="url(#pd-halo)"/>`;
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
  return o + `<text x="${f(x)}" y="${f(y + size * .34)}" text-anchor="middle" font-family="IM Fell English, Georgia, serif" font-size="${size}" fill="${BONE}" stroke="#050407" stroke-opacity=".8" stroke-width=".8" stroke-linejoin="round" paint-order="stroke" filter="url(#pd-numglow)">${num}</text>`;
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
<radialGradient id="pd-vig" cx=".5" cy=".5" r=".7"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<mask id="pd-band" maskUnits="userSpaceOnUse" x="-10" y="0" width="440" height="297"><path d="M-20 120 C100 112 210 128 320 118 S420 121 440 120 L440 177 C320 184 210 168 100 180 S0 176 -20 177 Z" fill="#fff" filter="url(#pd-feather)"/></mask>
</defs>`;

// pieces: optional {"space,bank": "bloom" | "root" | "card"} drawn in the wells, for pictures of a game in play (the box back).
export function panel(ri, lang, pieces = {}) {
  const w = W[lang], [a, b] = RANGE[ri], spaces = Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const xFirst = (PW - (spaces.length - 1) * PITCH) / 2 + (ri === 2 ? -24 : 0);
  const B = BLEED, bank = art("tex-bank"), water = art("tex-water");
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-B} ${-B} ${PW + 2 * B} ${PH + 2 * B}" width="${PW + 2 * B}mm" height="${PH + 2 * B}mm">${DEFS}
    <rect x="${-B}" y="${-B}" width="${PW + 2 * B}" height="${PH + 2 * B}" fill="#0f0d11"/>
    ${bank ? `<image href="${bank}" x="${-ri * 84 - B}" y="${-B}" width="${((PH + 2 * B) * 1.98).toFixed(0)}" height="${PH + 2 * B}" preserveAspectRatio="none" opacity=".92"/>` : ""}
    <rect x="${-B}" y="${-B}" width="${PW + 2 * B}" height="${PH + 2 * B}" fill="#0f0d11" opacity=".28"/>`;
  const r = rng(ri * 7 + 3);
  let refl = "";
  for (let i = 0; i < 9; i++) refl += `<ellipse cx="${f(uni(r, 10, PW - 10))}" cy="${f(RY + (r() < .5 ? -1 : 1) * uni(r, 16, 24))}" rx="${f(uni(r, 3, 7))}" ry="${f(uni(r, 1, 2))}" fill="${C.crimson}" opacity="${uni(r, .14, .3).toFixed(2)}"/>`;
  o += `<g mask="url(#pd-band)"><rect x="${-B}" y="100" width="${PW + 2 * B}" height="100" fill="#071319"/>
    ${water ? `<image href="${water}" x="${-ri * 140}" y="98" width="${(208 * 1.98).toFixed(0)}" height="104" preserveAspectRatio="none" transform="scale(1.4 1)" opacity=".9"/>` : ""}
    <rect x="${-B}" y="100" width="${PW + 2 * B}" height="100" fill="url(#pd-edge)"/><rect x="${-B}" y="100" width="${PW + 2 * B}" height="100" fill="url(#pd-deep)"/>
    <g filter="url(#pd-soft)">${refl}</g></g>`;
  o += sketch(`M${-B} ${RY - 27} C100 ${RY - 35} 210 ${RY - 19} 320 ${RY - 29} S${PW} ${RY - 27} ${PW + B} ${RY - 28}`, BONE, { w: .35, op: .35, seed: ri + 1 });
  o += sketch(`M${-B} ${RY + 28} C100 ${RY + 31} 210 ${RY + 19} 320 ${RY + 33} S${PW} ${RY + 27} ${PW + B} ${RY + 28}`, BONE, { w: .35, op: .35, seed: ri + 4 });
  [[70, 150], [240, 180], [380, 120]].forEach(([cx, wd], k) => { o += `<ellipse cx="${cx - ri * 20}" cy="${RY + (k - 1) * 6}" rx="${wd / 2}" ry="9" fill="${MIST}" opacity=".2" filter="url(#pd-mist)"/>`; });
  o += `<text x="${PW / 2}" y="16" text-anchor="middle" font-family="${w.disp}" font-size="9" fill="${BONE}" style="paint-order:stroke" stroke="#0f0d11" stroke-width="1.6">${w.reach(ri)}</text>`;
  o += sketch(`M${PW / 2 - 46} 19.5 C${PW / 2 - 15} 18 ${PW / 2 + 15} 21 ${PW / 2 + 46} 19.5`, GILT, { w: .35, op: .9, seed: ri + 9 });
  if (ri === 0) {
    o += `<path d="M${-B} ${-B} H22 C30 80 14 200 26 ${PH + B} H${-B} Z" fill="#0a090c" opacity=".85"/>` + sketch(`M22 ${-B} C30 80 14 200 26 ${PH + B}`, BONE, { w: .4, op: .45, seed: 21 });
    o += `<text x="12" y="${PH - 20}" font-family="${w.disp}" font-size="6" fill="${MIST}" transform="rotate(-90 12 ${PH - 20})">${w.near}</text>`;
  }
  if (ri === 2) {
    o += `<path d="M${PW + B} ${-B} H${PW - 64} C${PW - 76} 80 ${PW - 56} 200 ${PW - 70} ${PH + B} H${PW + B} Z" fill="#1a0b10" opacity=".92"/>` + sketch(`M${PW - 64} ${-B} C${PW - 76} 80 ${PW - 56} 200 ${PW - 70} ${PH + B}`, "#d9a441", { w: .45, op: .6, seed: 22 });
    o += `<circle cx="${PW - 30}" cy="${RY + 40}" r="34" fill="url(#pd-red)"/><use href="#nb-bloom" x="${PW - 44}" y="${RY + 26}" width="28" height="28" style="color:${C.crimson}"/>`;
    o += ripple(PW - 30, RY, 12, 12, 9.5);
    o += `<text x="${PW - 30}" y="${RY - 40}" text-anchor="middle" font-family="${w.disp}" font-size="7.5" fill="${BONE}">${w.far}</text>`;
    o += `<text x="${PW - 30}" y="${RY - 32}" text-anchor="middle" font-family="${w.serif}" font-style="italic" font-size="4.6" fill="${MIST}">${w.keeper}</text>`;
  }
  if (ri > 0) o += `<text x="4" y="${RY + 40}" font-family="IBM Plex Mono, ${w.serif}" font-size="3.2" fill="${MIST}">◀ ${w.joins(ri - 1)}</text>`;
  if (ri < 2) o += `<text x="${PW - 4}" y="${RY + 40}" text-anchor="end" font-family="IBM Plex Mono, ${w.serif}" font-size="3.2" fill="${MIST}">${w.joins(ri + 1)} ▶</text>`;
  spaces.forEach((sp, j) => {
    const x = xFirst + j * PITCH;
    for (const [bk, y0, label] of [[0, 26, w.left], [1, RY + 34, w.right]]) {
      const piece = pieces[`${sp},${bk}`];
      o += `<rect x="${f(x - SW / 2)}" y="${f(y0)}" width="${SW}" height="${SH}" rx="4" fill="#0b0a0d" fill-opacity=".72" stroke="${GILT}" stroke-width=".7"/>`;
      o += `<rect x="${f(x - SW / 2 + 2.2)}" y="${f(y0 + 2.2)}" width="${SW - 4.4}" height="${SH - 4.4}" rx="2.6" fill="none" stroke="${GILT}" stroke-width=".25" stroke-dasharray="1.2 1.2" opacity=".8"/>`;
      for (const [cx, cy, rot] of [[x - SW / 2 + 5, y0 + 5, -45], [x + SW / 2 - 5, y0 + 5, 45], [x - SW / 2 + 5, y0 + SH - 5, -135], [x + SW / 2 - 5, y0 + SH - 5, 135]])
        o += `<use href="#nb-bloom" x="${f(cx - 2.6)}" y="${f(cy - 2.6)}" width="5.2" height="5.2" transform="rotate(${rot} ${f(cx)} ${f(cy)})" style="color:${GILT}"/>`;
      const mid = y0 + SH / 2, open = sp === 1;
      if (piece === "card") o += `<rect x="${f(x - 31.5)}" y="${f(y0 + 1.5)}" width="63" height="88" rx="3.5" fill="#1e2a30" stroke="#5f8d95" stroke-width=".6"/><use href="#nb-fog" x="${f(x - 12)}" y="${f(mid - 12)}" width="24" height="24" style="color:${C.cyan}" opacity=".75"/>`;
      else {
        o += `<use href="#${open ? "nb-bloom" : "nb-fog"}" x="${f(x - 9)}" y="${f(mid - 14)}" width="18" height="18" style="color:${open ? C.crimson : MIST}" opacity="${open ? 1 : .7}"/>`;
        o += `<text x="${f(x)}" y="${f(mid + 11)}" text-anchor="middle" font-family="${w.serif}" font-style="italic" font-size="4.4" fill="${MIST}">${open ? w.open : w.fog}</text>`;
      }
      if (piece === "bloom" || piece === "root") o += `<circle cx="${f(x)}" cy="${f(mid)}" r="16" fill="url(#pd-red)"/><use href="#nb-${piece}" x="${f(x - 11)}" y="${f(mid - 11)}" width="22" height="22" style="color:${piece === "bloom" ? C.crimson : BONE}"/>`;
      o += `<text x="${f(x)}" y="${f(y0 + SH - 7)}" text-anchor="middle" font-family="IBM Plex Mono, ${w.serif}" font-size="3.1" letter-spacing=".4" fill="${MIST}">${lang === "en" ? label.toUpperCase() : label} · ${sp}</text>`;
    }
    o += ripple(x, RY, sp, sp);
  });
  o += `<rect x="${-B}" y="${-B}" width="${PW + 2 * B}" height="${PH + 2 * B}" fill="url(#pd-vig)"/>`;
  o += `<text x="${PW - 6}" y="${PH - 5}" text-anchor="end" font-family="IBM Plex Mono, ${w.serif}" font-size="3" fill="${MIST}">${w.foot(ri)}</text>`;
  return o + "</svg>";
}

export async function build(lang, dir, { png }) {
  const w = PW + 2 * BLEED, h = PH + 2 * BLEED;
  const pages = [0, 1, 2].map(ri => ({ name: `river-panel-${ri + 1}`, html: panel(ri, lang) }));
  await render(join(dir, "river-board"), doc({ lang, title: "River board", w, h, css: ".pg > svg { display: block; width: 100%; height: 100%; }", pages }), { w, h, png });
}
