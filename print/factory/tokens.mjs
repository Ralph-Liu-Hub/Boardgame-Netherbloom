// One punchboard sheet (A4 landscape, 3 mm bleed): every token in the game as a die-cut disc, icons only, so both editions share it.
// Pages: 1 front, 2 back (mirrored left-to-right for duplex), 3 die line (cut circles only, magenta, for the factory's cutting die).
import { join } from "node:path";
import { BLEED, C, doc, render } from "./lib.mjs";

const SW = 297, SH = 210;
export const BIG = 25, SMALL = 18, CUT_BLEED = 1.5;   // disc diameters; art runs 1.5 mm past the cut
// [front icon, front colour, back icon, back colour, count, diameter]. Root and Bloom are one double-sided disc:
// a Bloom withers to a Root and a Root blooms by flipping it, and the river never holds more than 24 (two banks x 12 spaces).
export const TOKENS = [
  ["nb-tok-oar", C.bone, "nb-tok-oar", C.bone, 1, BIG],
  ["nb-tok-push", C.crimson, "nb-tok-push", C.mist, 4, BIG],     // back: spent this crossing
  ["nb-tok-hold", C.cyan, "nb-tok-hold", C.cyan, 1, BIG],
  ["nb-tok-shield", C.bone, "nb-tok-shield", C.bone, 1, BIG],
  ["nb-tok-resign", C.bone, "nb-tok-resign", C.bone, 1, BIG],
  ["nb-soul", "#EFE7D6", "nb-soul", C.cyan, 1, BIG],              // back: the Ghost, for solo play
  ["nb-root", C.bone, "nb-bloom", C.crimson, 24, SMALL],
  ["nb-grievance", C.cyan, "nb-grievance", C.cyan, 8, SMALL],
  ["nb-blackwater", C.mist, "nb-blackwater", C.mist, 6, SMALL],
  ["nb-fracture", C.crimson, "nb-fracture", C.crimson, 3, SMALL],
  ["nb-light", C.bone, "nb-light", C.bone, 12, SMALL],
  ["nb-knot", C.bone, "nb-knot", C.bone, 15, SMALL],
  ["nb-echo", C.cyan, "nb-echo", C.cyan, 1, SMALL],
];

// Lay the discs out in rows from the top-left of the safe area.
function layout() {
  const discs = [];
  let x = 14, y = 14;
  for (const big of [true, false]) {
    const d = big ? BIG : SMALL, pitch = d + 4;
    x = 14;
    for (const t of TOKENS.filter(t => (t[5] === BIG) === big))
      for (let i = 0; i < t[4]; i++) {
        if (x + d > SW - 12) { x = 14; y += pitch; }
        discs.push({ t, cx: x + d / 2, cy: y + d / 2, d });
        x += pitch;
      }
    y += pitch;
  }
  return discs;
}

const disc = (cx, cy, d, ic, col, spent = false) => {
  const r = d / 2, R = r + CUT_BLEED;
  return `<g><circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.ink2}"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 1.2}" fill="none" stroke="${C.gilt}" stroke-width=".4"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 1.9}" fill="url(#tk-glow)"/>
    <use href="#${ic}" x="${cx - r * .62}" y="${cy - r * .62}" width="${r * 1.24}" height="${r * 1.24}" style="color:${col}" opacity="${spent ? .45 : 1}"/></g>`;
};

function sheet(side) {
  const B = BLEED;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-B} ${-B} ${SW + 2 * B} ${SH + 2 * B}" width="${SW + 2 * B}mm" height="${SH + 2 * B}mm">
    <defs><radialGradient id="tk-glow"><stop offset="0" stop-color="#E6D3A3" stop-opacity=".10"/><stop offset="1" stop-color="#E6D3A3" stop-opacity="0"/></radialGradient></defs>`;
  if (side !== "die") o += `<rect x="${-B}" y="${-B}" width="${SW + 2 * B}" height="${SH + 2 * B}" fill="${C.ink}"/>`;
  else o += `<rect x="${-B}" y="${-B}" width="${SW + 2 * B}" height="${SH + 2 * B}" fill="#fff"/><rect x="0" y="0" width="${SW}" height="${SH}" fill="none" stroke="#00a0e0" stroke-width=".3" stroke-dasharray="2 1"/>`;
  for (const { t, cx, cy, d } of layout()) {
    const x = side === "back" ? SW - cx : cx;   // mirrored so each back sits behind its front
    if (side === "front") o += disc(x, cy, d, t[0], t[1]);
    else if (side === "back") o += disc(x, cy, d, t[2], t[3], t[0] === "nb-tok-push");
    else o += `<circle cx="${x}" cy="${cy}" r="${d / 2}" fill="none" stroke="#ec008c" stroke-width=".25"/>`;
  }
  if (side === "die") o += `<text x="4" y="${SH - 4}" font-family="IBM Plex Mono, monospace" font-size="3" fill="#ec008c">DIE LINE · cut circles · ${BIG} mm and ${SMALL} mm discs · trim (blue) 297 × 210 mm · art bleeds 1.5 mm past every cut</text>`;
  return o + "</svg>";
}

export async function build(lang, dir, { png }) {
  const w = SW + 2 * BLEED, h = SH + 2 * BLEED;
  const pages = ["front", "back", "die"].map(s => ({ name: `punchboard-${s}`, html: sheet(s) }));
  await render(join(dir, "punchboard"), doc({ lang, title: "Punchboard", w, h, css: ".pg > svg { display: block; width: 100%; height: 100%; }", pages }), { w, h, png });
}
