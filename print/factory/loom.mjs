// The Loom of the Fates: one cardboard board (A4 landscape, 297 x 210 mm, 3 mm bleed), printed one side and mounted.
// Three threads, each with five knot circles for the 18 mm knot discs from the punchboard: a thread snaps at its 4th knot
// with 2-3 players and at its 5th in solo play or with 4 (the Lantern does not change it), so five circles serve every game.
// Each thread also has a ring for the Echo token (it sits on the thread of the last card played face up or Burned)
// and its Backlash, printed beside it. Pages: 1 the board, 2 the trim line (not printed).
import { join } from "node:path";
import { BLEED, C, TAG_ICON, doc, render, artImg, esc } from "./lib.mjs";

const BW = 297, BH = 210;
export const LOOM = { w: BW, h: BH, knots: 5, circle: 22 };   // circle: knot well diameter in mm (discs are 18 mm)
const COL = [C.crimson, C.bone, C.cyan];

const W = {
  en: {
    title: "The Loom of the Fates", sub: "Every card played face up or Burned ties a knot on its thread",
    threads: [
      ["Obsession", "Clinging, grudges, what the soul cannot let go.", "Grasping", "The soul clutches its grudges: a Grievance appears beside it."],
      ["Acceptance", "Tenderness, forgiveness, peace.", "Resignation", "Put the Resignation token beside the soul: at the next Soul Step it Lingers, forgetting a card, and the token is removed."],
      ["Oblivion", "What has been let go.", "The Tide Rises", "Too much has been let go: Black Water floods the space ahead."],
    ],
    snap4: "2–3 players: snaps here", snap5: "Solo or 4 players: snaps here", echo: "Echo", backlash: "Backlash",
    foot: "When a thread fills, it snaps: resolve its Backlash, then take its knots off. The Loom clears when the soul enters a new Reach; the Echo token stays where it is.",
    die: "TRIM LINE · Loom of the Fates · 297 × 210 mm · mount on 2 mm greyboard",
  },
  zh: {
    title: "命運織機", sub: "每張正面打出或焚燒的牌，都會在其絲線上打一個結",
    threads: [
      ["執念", "緊抓、積怨，亡魂放不下的一切。", "攫取", "亡魂緊抓著積怨不放：身旁出現一個怨念。"],
      ["釋懷", "溫柔、原諒、平靜。", "認命", "將認命標記放在亡魂旁：下一次亡魂步驟時，它坐下並徘徊，遺忘1張牌，然後移除標記。"],
      ["忘卻", "已經放下的一切。", "漲潮", "放下的已經太多：黑水淹沒前方的格子。"],
    ],
    snap4: "2–3人：在此斷裂", snap5: "單人或4人：在此斷裂", echo: "迴響", backlash: "反噬",
    foot: "絲線打滿時便會斷裂：結算其反噬，然後取下該絲線上的結。每當亡魂進入新的河段，織機便會清空；迴響標記留在原處。",
    die: "裁切線 · 命運織機 · 297 × 210 mm · 裱於 2 mm 灰紙板",
  },
};

const ROW0 = 52, ROWH = 50, KX = k => 96 + k * 26, ECHO_X = 232, BOX_X = 248;

function board(lang) {
  const L = W[lang], B = BLEED;
  let svg = `<svg class="lsvg" xmlns="http://www.w3.org/2000/svg" viewBox="${-B} ${-B} ${BW + 2 * B} ${BH + 2 * B}">
    <defs><radialGradient id="lg-well"><stop offset="0" stop-color="#E6D3A3" stop-opacity=".10"/><stop offset="1" stop-color="#E6D3A3" stop-opacity="0"/></radialGradient></defs>
    <rect x="${7}" y="${7}" width="${BW - 14}" height="${BH - 14}" rx="4" fill="none" stroke="${C.gilt}" stroke-width=".5"/>
    <rect x="${8.4}" y="${8.4}" width="${BW - 16.8}" height="${BH - 16.8}" rx="3" fill="none" stroke="${C.gilt}" stroke-width=".2" opacity=".6"/>`;
  L.threads.forEach((_, t) => {
    const y = ROW0 + t * ROWH, col = COL[t];
    // the thread itself, running through the knot wells to the Echo ring
    svg += `<path d="M ${KX(0) - 18} ${y} C ${KX(1)} ${y - 2.5}, ${KX(3)} ${y + 2.5}, ${ECHO_X} ${y}" fill="none" stroke="${col}" stroke-width=".9" opacity=".75"/>`;
    for (let k = 0; k < LOOM.knots; k++) {
      const x = KX(k), r = LOOM.circle / 2, snap = (k === 3) || (k === 4);
      svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.ink2}" stroke="${col}" stroke-width="${snap ? .8 : .5}" ${k === 4 ? 'stroke-dasharray="1.6 1"' : ""}/>
        <circle cx="${x}" cy="${y}" r="${r - 1.2}" fill="url(#lg-well)"/>
        <use href="#nb-knot" x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" style="color:${col}" opacity=".22"/>
        <text x="${x}" y="${y - r - 1.6}" text-anchor="middle" class="kn">${k + 1}</text>`;
    }
    svg += `<circle cx="${ECHO_X}" cy="${y}" r="10.5" fill="none" stroke="${C.cyan}" stroke-width=".5" stroke-dasharray="1.2 1.2"/>
      <use href="#nb-echo" x="${ECHO_X - 4}" y="${y - 4}" width="8" height="8" style="color:${C.cyan}" opacity=".35"/>`;
  });
  svg += "</svg>";
  const rows = L.threads.map(([name, gist, bl, blText], t) => {
    const y = ROW0 + t * ROWH, col = COL[t];
    return `<div class="th" style="top:${y - 15}mm"><svg class="ti" style="color:${col}"><use href="#${TAG_ICON[t]}"/></svg><b style="color:${col}">${esc(name)}</b><span>${esc(gist)}</span></div>
      <div class="snap" style="left:${KX(3) - 13}mm;top:${y + 12.5}mm">${esc(L.snap4)}</div>
      <div class="snap" style="left:${KX(4) - 13}mm;top:${y + 12.5}mm">${esc(L.snap5)}</div>
      <div class="echo" style="left:${ECHO_X - 12}mm;top:${y + 12}mm">${L.echo}</div>
      <div class="bl" style="top:${y - 17}mm;border-color:${col}"><i>${L.backlash}</i><b style="color:${col}">${esc(bl)}</b><span>${esc(blText)}</span></div>`;
  }).join("");
  return `<div class="bg">${artImg("tex-water")}</div><div class="shade"></div>${svg}
    <div class="ttl"><b>${L.title}</b><span>${esc(L.sub)}</span></div>${rows}<div class="foot">${esc(L.foot)}</div>`;
}

const die = lang => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-BLEED} ${-BLEED} ${BW + 2 * BLEED} ${BH + 2 * BLEED}" style="width:100%;height:100%;display:block">
  <rect x="${-BLEED}" y="${-BLEED}" width="${BW + 2 * BLEED}" height="${BH + 2 * BLEED}" fill="#fff"/>
  <rect x="0" y="0" width="${BW}" height="${BH}" rx="3" fill="none" stroke="#ec008c" stroke-width=".3"/>
  <text x="6" y="${BH - 6}" font-family="IBM Plex Mono, Noto Serif TC, monospace" font-size="3.4" fill="#ec008c">${W[lang].die}</text></svg>`;

const CSS = `
.pg { background: ${C.ink}; color: ${C.paper}; }
.bg { position: absolute; inset: 0; opacity: .32; } .bg .ai { width: 100%; height: 100%; object-fit: cover; }
.shade { position: absolute; inset: 0; background: radial-gradient(ellipse at 40% 50%, rgba(14,12,17,.15), rgba(14,12,17,.85)); }
.lsvg { position: absolute; inset: 0; width: 100%; height: 100%; }
.lsvg .kn { font-family: var(--f-mono); font-size: 2.6px; fill: ${C.mist}; }
.ttl { position: absolute; left: ${BLEED + 14}mm; top: ${BLEED + 12}mm; right: ${BLEED + 14}mm; display: flex; align-items: baseline; gap: 6mm; }
.ttl b { font-family: var(--f-display); font-weight: 400; font-size: 22pt; color: ${C.bone}; }
[lang="zh-Hant-TW"] .ttl b { font-weight: 600; }
.ttl span { font-family: var(--f-hand); font-style: italic; font-size: 10pt; color: #cfc4b0; }
[lang="zh-Hant-TW"] .ttl span { font-style: normal; }
.th { position: absolute; margin-top: ${BLEED}mm; left: ${BLEED + 14}mm; width: 58mm; display: grid; grid-template-columns: 11mm 1fr; column-gap: 2.5mm; align-items: center; }
.th .ti { width: 11mm; height: 11mm; grid-row: span 2; }
.th b { font-family: var(--f-display); font-weight: 400; font-size: 15pt; line-height: 1.1; }
[lang="zh-Hant-TW"] .th b { font-weight: 600; }
.th span { font-size: 8pt; line-height: 1.3; color: #cfc4b0; }
.snap { position: absolute; width: 26mm; margin-left: ${BLEED}mm; margin-top: ${BLEED}mm; text-align: center; font-family: var(--f-mono); font-size: 5.6pt; line-height: 1.25; letter-spacing: .04em; color: ${C.bone}; }
[lang="zh-Hant-TW"] .snap { font-family: var(--f-body); font-size: 6.6pt; }
.echo { position: absolute; width: 24mm; margin-left: ${BLEED}mm; margin-top: ${BLEED}mm; text-align: center; font-family: var(--f-mono); font-size: 5.6pt; letter-spacing: .2em; text-transform: uppercase; color: ${C.cyan}; }
[lang="zh-Hant-TW"] .echo { font-family: var(--f-body); font-size: 6.8pt; letter-spacing: .1em; }
.bl { position: absolute; margin-top: ${BLEED}mm; left: ${BLEED + BOX_X}mm; width: ${BW - BOX_X - 12}mm; height: 34mm; box-sizing: border-box; border: .3mm solid; border-radius: 2mm; padding: 2mm 2.4mm; background: rgba(14,12,17,.7); display: flex; flex-direction: column; gap: .6mm; }
.bl i { font-style: normal; font-family: var(--f-mono); font-size: 5.2pt; letter-spacing: .2em; text-transform: uppercase; color: ${C.mist}; }
[lang="zh-Hant-TW"] .bl i { font-family: var(--f-body); font-size: 6.4pt; }
.bl b { font-family: var(--f-display); font-weight: 400; font-size: 11pt; line-height: 1.1; }
[lang="zh-Hant-TW"] .bl b { font-weight: 600; }
.bl span { font-size: 7.2pt; line-height: 1.3; color: ${C.paper}; }
.foot { position: absolute; left: ${BLEED + 14}mm; right: ${BLEED + 14}mm; bottom: ${BLEED + 12}mm; text-align: center; font-size: 8pt; line-height: 1.35; color: #cfc4b0; border-top: .2mm solid rgba(138,109,72,.6); padding-top: 2mm; }
`;

export async function build(lang, dir, { png }) {
  const w = BW + 2 * BLEED, h = BH + 2 * BLEED;
  const pages = [{ name: "loom-of-the-fates", html: board(lang) }, { name: "loom-of-the-fates-trim", html: die(lang) }];
  await render(join(dir, "loom-of-the-fates"), doc({ lang, title: W[lang].title, w, h, css: CSS, pages }), { w, h, png });
}
