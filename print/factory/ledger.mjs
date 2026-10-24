// The Ledger: one cardboard board (A4 landscape, 297 x 210 mm, 3 mm bleed), printed one side and mounted. It holds the three
// ways to lose, so they are on the table and not only in the Rulebook: the forgotten pile laid out over a numbered track
// (Light as Ash, Adrift and each Lantern's Faded limit marked), three Fracture wells (the third is Shattered) and the
// Black Water supply well (empty when one must be placed is Deluge). Pages: 1 the board, 2 the trim line (not printed).
import { join } from "node:path";
import { BLEED, C, doc, render, artImg, esc } from "./lib.mjs";
import { LANTERN, LANTERN_NAMES, lanternIcon } from "../../web/public/assets/cards.js";
import { ZH_LANTERNS } from "../../web/public/assets/zh.js";

const BW = 297, BH = 210;
const SLOTS = Math.max(...Object.values(LANTERN).map(l => l[1])) + 1;   // the longest Faded limit (Gentle), +1 for the Child
const COL0 = 16, STEP = 11, CARD_W = 63, CARD_H = 88, TRACK_Y = 54;
const colX = k => COL0 + (k - 1) * STEP;                            // left edge of forgotten card k
// Lantern levels by their Faded limit, e.g. { 9: ["4"], 10: ["3"], ... }
const limits = () => {
  const at = {};
  Object.entries(LANTERN).forEach(([l, [, lim]]) => { (at[lim] ||= []).push(l); });
  return at;
};

const W = {
  en: {
    title: "The Ledger", sub: "The three ways the crossing is lost",
    forgotten: "Forgotten pile", ash: "Light as Ash", adrift: "Adrift", lose: "you lose",
    trackNote: k => `Forget a card: lay it here face up on the next number, overlapping the card before it. The number above the newest card is how many cards are forgotten. If a card leaves the pile, slide the later cards back. At 6 the soul is Light as Ash and at 9 Adrift (it may step further, section 4). When the pile reaches your Lantern's ✕ (${k}; the Child of the Last Flame may forget one more), you lose (Faded).`,
    fractures: "Fractures", shattered: "Shattered · you lose",
    fracNote: "Each Fracture the soul takes goes on the next well. A Fracture that is mended comes off the highest well.",
    water: "Black Water supply",
    waterNote: lan => `Put only your Lantern's Black Water tokens here: ${lan}. Black Water removed from the river goes back in the box, never here. If you must place Black Water and this well is empty, you lose (Deluge).`,
    names: LANTERN_NAMES,
    die: "TRIM LINE · The Ledger · 297 × 210 mm · mount on 2 mm greyboard",
  },
  zh: {
    title: "渡帳", sub: "這趟擺渡會失敗的三種方式",
    forgotten: "遺忘堆", ash: "輕如灰燼", adrift: "漂離", lose: "落敗",
    trackNote: k => `遺忘一張牌時：將它面朝上放在下一個數字上，壓住前一張牌的一部分。最新那張牌上方的數字，就是已遺忘的牌數。若有牌離開遺忘堆，將後面的牌往前移。滿6張時亡魂輕如灰燼，滿9張時漂離（可能多走一步，見第4節）。牌數達到你們燈籠的✕（${k}；最後火光的孩子可多遺忘1張）時，你們落敗（消散）。`,
    fractures: "裂痕", shattered: "破碎 · 落敗",
    fracNote: "亡魂每受到一道裂痕，就放在下一個圓圈上。修補裂痕時，從最高的圓圈取下。",
    water: "黑水供應區",
    waterNote: lan => `這裡只放你們燈籠的黑水標記：${lan}。從河中移除的黑水放回盒中，絕不放回這裡。若必須放置黑水而此處已空，你們落敗（滅頂）。`,
    names: ZH_LANTERNS,
    die: "裁切線 · 渡帳 · 297 × 210 mm · 裱於 2 mm 灰紙板",
  },
};

function board(lang) {
  const L = W[lang], B = BLEED, at = limits();
  let svg = `<svg class="lsvg" xmlns="http://www.w3.org/2000/svg" viewBox="${-B} ${-B} ${BW + 2 * B} ${BH + 2 * B}">
    <defs><radialGradient id="lg-well"><stop offset="0" stop-color="#E6D3A3" stop-opacity=".10"/><stop offset="1" stop-color="#E6D3A3" stop-opacity="0"/></radialGradient></defs>
    <rect x="7" y="7" width="${BW - 14}" height="${BH - 14}" rx="4" fill="none" stroke="${C.gilt}" stroke-width=".5"/>
    <rect x="8.4" y="8.4" width="${BW - 16.8}" height="${BH - 16.8}" rx="3" fill="none" stroke="${C.gilt}" stroke-width=".2" opacity=".6"/>`;
  // the forgotten track: one column per card, the last card's full outline at the end
  const end = colX(SLOTS) + CARD_W;
  svg += `<rect x="${COL0}" y="${TRACK_Y}" width="${end - COL0}" height="${CARD_H}" rx="3" fill="${C.ink2}" fill-opacity=".7" stroke="${C.gilt}" stroke-width=".5"/>`;
  for (let k = 1; k <= SLOTS; k++) {
    const x = colX(k), cx = x + STEP / 2, mark = k === 6 || k === 9, lose = at[k];
    if (k > 1) svg += `<line x1="${x}" y1="${TRACK_Y + 2}" x2="${x}" y2="${TRACK_Y + CARD_H - 2}" stroke="${lose ? C.crimson : C.gilt}" stroke-width="${lose ? .5 : .25}" stroke-dasharray="1.4 1.2" opacity=".8"/>`;
    svg += `<text x="${cx}" y="${TRACK_Y - 11}" text-anchor="middle" class="num" fill="${lose ? C.crimson : mark ? C.cyan : C.bone}">${k}</text>`;
    if (lose) svg += `<text x="${cx}" y="${TRACK_Y - 5.6}" text-anchor="middle" class="x">✕</text>
      <text x="${cx}" y="${TRACK_Y - 1.8}" text-anchor="middle" class="dia">${lose.map(lanternIcon).join(" ")}</text>`;
  }
  svg += `<rect x="${colX(SLOTS)}" y="${TRACK_Y}" width="${CARD_W}" height="${CARD_H}" rx="3" fill="none" stroke="${C.gilt}" stroke-width=".35" stroke-dasharray="2 1.2"/>
    <use href="#nb-fog" x="${colX(SLOTS) + CARD_W / 2 - 9}" y="${TRACK_Y + CARD_H / 2 - 9}" width="18" height="18" style="color:${C.mist}" opacity=".35"/>`;
  // Fracture wells
  const FY = 168;
  for (let i = 0; i < 3; i++) {
    const x = 32 + i * 27, last = i === 2;
    svg += `<circle cx="${x}" cy="${FY}" r="11" fill="${C.ink2}" stroke="${C.crimson}" stroke-width="${last ? .9 : .5}" ${last ? "" : 'stroke-dasharray="1.6 1"'}/>
      <circle cx="${x}" cy="${FY}" r="9.8" fill="url(#lg-well)"/>
      <use href="#nb-fracture" x="${x - 4.5}" y="${FY - 4.5}" width="9" height="9" style="color:${C.crimson}" opacity=".25"/>
      <text x="${x}" y="${FY - 13}" text-anchor="middle" class="num" fill="${last ? C.crimson : C.bone}">${i + 1}</text>`;
  }
  // Black Water supply well: room for six tokens
  svg += `<rect x="112" y="151" width="72" height="38" rx="3" fill="${C.ink2}" fill-opacity=".8" stroke="${C.mist}" stroke-width=".5"/>`;
  for (let i = 0; i < 6; i++) {
    const x = 125 + (i % 3) * 23, y = 160.5 + Math.floor(i / 3) * 19;
    svg += `<circle cx="${x}" cy="${y}" r="9.3" fill="none" stroke="${C.mist}" stroke-width=".25" stroke-dasharray="1 1" opacity=".7"/>
      <use href="#nb-blackwater" x="${x - 4}" y="${y - 4}" width="8" height="8" style="color:${C.mist}" opacity=".3"/>`;
  }
  svg += "</svg>";
  const lanKey = Object.entries(LANTERN).map(([l, [, lim]]) => `${lanternIcon(l)} ${L.names[l]} ${lim}`).join(lang === "zh" ? "、" : ", ");
  const lan = Object.entries(LANTERN).map(([l, [bw]]) => `${L.names[l]} ${bw}`).join(lang === "zh" ? "、" : ", ");
  return `<div class="bg">${artImg("tex-water")}</div><div class="shade"></div>${svg}
    <div class="ttl"><b>${esc(L.title)}</b><span>${esc(L.sub)}</span></div>
    <div class="cap" style="left:${COL0}mm;top:${TRACK_Y - 24}mm">${esc(L.forgotten)}</div>
    <div class="mk" style="left:${colX(6) + STEP / 2 - 15}mm;top:${TRACK_Y - 19}mm">${esc(L.ash)} ▼</div>
    <div class="mk" style="left:${colX(9) + STEP / 2 - 15}mm;top:${TRACK_Y - 19}mm">${esc(L.adrift)} ▼</div>
    <div class="note" style="left:${colX(SLOTS) + CARD_W + 4}mm;top:${TRACK_Y}mm;width:${BW - 14 - (colX(SLOTS) + CARD_W + 4)}mm">${esc(L.trackNote(lanKey))}</div>
    <div class="cap" style="left:21mm;top:145mm">${esc(L.fractures)}</div>
    <div class="shat" style="left:${32 + 54 - 17}mm;top:180.5mm">${esc(L.shattered)}</div>
    <div class="note" style="left:21mm;top:186.5mm;width:88mm">${esc(L.fracNote)}</div>
    <div class="cap" style="left:112mm;top:145mm">${esc(L.water)}</div>
    <div class="note big" style="left:190mm;top:151mm;width:${BW - 14 - 190}mm">${esc(L.waterNote(lan))}</div>`;
}

const die = lang => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-BLEED} ${-BLEED} ${BW + 2 * BLEED} ${BH + 2 * BLEED}" style="width:100%;height:100%;display:block">
  <rect x="${-BLEED}" y="${-BLEED}" width="${BW + 2 * BLEED}" height="${BH + 2 * BLEED}" fill="#fff"/>
  <rect x="0" y="0" width="${BW}" height="${BH}" rx="3" fill="none" stroke="#ec008c" stroke-width=".3"/>
  <text x="6" y="${BH - 6}" font-family="IBM Plex Mono, Noto Serif TC, monospace" font-size="3.4" fill="#ec008c">${W[lang].die}</text></svg>`;

const P = v => `${v + BLEED}mm`;
const CSS = `
.pg { background: ${C.ink}; color: ${C.paper}; }
.bg { position: absolute; inset: 0; opacity: .28; } .bg .ai { width: 100%; height: 100%; object-fit: cover; }
.shade { position: absolute; inset: 0; background: radial-gradient(ellipse at 40% 50%, rgba(14,12,17,.2), rgba(14,12,17,.88)); }
.lsvg { position: absolute; inset: 0; width: 100%; height: 100%; }
.lsvg .num { font-family: var(--f-mono); font-size: 4.2px; }
.lsvg .x { font-family: var(--f-mono); font-size: 4px; fill: ${C.crimson}; }
.lsvg .dia { font-size: 3.4px; fill: ${C.crimson}; letter-spacing: -.1px; }
.ttl { position: absolute; left: ${P(14)}; top: ${P(12)}; right: ${P(14)}; display: flex; align-items: baseline; gap: 6mm; }
.ttl b { font-family: var(--f-display); font-weight: 400; font-size: 22pt; color: ${C.bone}; }
[lang="zh-Hant-TW"] .ttl b { font-weight: 600; }
.ttl span { font-family: var(--f-hand); font-style: italic; font-size: 11pt; color: #cfc4b0; }
[lang="zh-Hant-TW"] .ttl span { font-style: normal; }
.cap, .mk, .shat, .note { position: absolute; margin-left: ${BLEED}mm; margin-top: ${BLEED}mm; }
.cap { font-family: var(--f-mono); font-size: 10.5pt; letter-spacing: .06em; text-transform: uppercase; color: ${C.bone}; }
[lang="zh-Hant-TW"] .cap { font-family: var(--f-body); font-size: 11pt; letter-spacing: .1em; }
.mk { width: 30mm; text-align: center; font-family: var(--f-mono); font-size: 10pt; color: ${C.cyan}; white-space: nowrap; }
[lang="zh-Hant-TW"] .mk { font-family: var(--f-body); font-size: 10.5pt; }
.shat { width: 34mm; text-align: center; font-family: var(--f-mono); font-size: 10pt; color: ${C.crimson}; }
[lang="zh-Hant-TW"] .shat { font-family: var(--f-body); font-size: 10.5pt; }
.note { font-size: 10.5pt; line-height: 1.25; color: #d8ccb8; }
.note.big { font-size: 10.5pt; }
`;

export async function build(lang, dir, { png }) {
  const w = BW + 2 * BLEED, h = BH + 2 * BLEED;
  const pages = [{ name: "the-ledger", html: board(lang) }, { name: "the-ledger-trim", html: die(lang) }];
  await render(join(dir, "the-ledger"), doc({ lang, title: W[lang].title, w, h, css: CSS, pages }), { w, h, png });
}
