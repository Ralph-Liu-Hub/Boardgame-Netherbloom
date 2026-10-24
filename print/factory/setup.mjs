// The rulebook's Setting up picture for print: one A3 landscape spread (420 x 297 mm) over two facing A4 pages, the whole
// table seen from above with every component in place, each numbered to match the setup steps (section 5) and labelled
// with what it is, how many there are and what to do with it. Counts come from the game data, so they always match.
import { BLEED, C, art, esc } from "./lib.mjs";
import { TILES, MIST, LANTERN, LANTERN_NAMES, GHOST, CORE_IDS, MANTLES } from "../../web/public/assets/cards.js";
import { ZH_LANTERNS, ZH_MIST } from "../../web/public/assets/zh.js";
import { TOKENS } from "./tokens.mjs";
import { LOOM } from "./loom.mjs";
import { PW as BPW, PH as BPH, GEO as G } from "./board.mjs";

const SW = 420, SH = 297, B = BLEED, GUT = SW / 2;
const tok = id => TOKENS.find(t => t[0] === id);
const harsh = Object.values(LANTERN).map(l => l[2]).join(" / "), bw = Object.values(LANTERN).map(l => l[0]).join(" / ");

const W = {
  en: {
    title: "Setting up", sub: "The table set for the Child of the Last Flame with three Ferrymen. The numbers match the steps in section 5.",
    lanterns: Object.values(LANTERN_NAMES).join(" / "),
    l: {
      1: ["River board", `Three panels, joined edge to edge: Reach I on the left (the near shore, space 0) to Reach III on the right (the Far Shore, space 12).`],
      2: ["Bank tiles", `${TILES.map(t => t[1].length).join(" / ")} tiles for Reaches I / II / III. Shuffle each Reach's tiles apart and lay them fog side up in the square wells of spaces 2–4, 5–8 and 9–11.`],
      3: ["First Blooms and the soul", "A Bloom on both banks of space 1, so the first step is Lit. The chosen Soul\u2019s standee starts on the near shore, space 0."],
      4: ["Soul card and Lantern", "The chosen Soul card, face up. Fractures go on the Ledger: the third shatters the soul. The Child starts with 3 Light, the Bride with 1. The Lantern is the difficulty you choose (section 10); it has no piece."],
      5: ["Memory deck", `${CORE_IDS.length} core cards and the Soul's own 8 (the 8 Echo cards for the Open Crossing), shuffled, face down. Discard pile face up; the forgotten pile goes on the Ledger.`],
      6: ["Mist decks", `One per Reach, face down in the Mist well where that Reach begins: its ${MIST[0].length} Mist cards, Rising Water and Shade Drawn Near, and harsh Mist cards by Lantern (${harsh}).`],
      7: ["Loom of the Fates", `The Loom board, knot discs beside it. Each knot goes on its thread's next circle: a thread snaps at 4 knots with 2–3 players, at 5 in solo or with 4. The Echo token waits beside the board.`],
      8: ["Mantles", `The ${Object.keys(MANTLES).length} Mantle cards, face up, where everyone can reach them.`],
      9: ["Book of Remembrance", "The chosen Soul's Book, open at Chapter I. Inscribed cards go in its wells, held by the photo corners."],
      10: ["Ledger and supply", `The Ledger beside the Loom; every token within reach. Black Water: put only the Lantern's number (${bw} for ${Object.values(LANTERN_NAMES).join(" / ")}) in the Ledger's Black Water well and the rest back in the box.`],
      11: ["Ferrymen", `Deal 3 cards each (4 in solo play). Each player takes a Push Through token face up and a Player Aid. The first player takes the Oar. Solo: the ${GHOST.length} Ghost cards are the Ghost's deck.`],
    },
    cap: { deck: "Deck", discard: "Discard", forgotten: "Forgotten", hand: "Hand", push: "Push Through", oar: "Oar", aid: "Player Aid", ghost: "Solo: Ghost deck",
      reach: r => `Reach ${["I", "II", "III"][r]}`, near: "Near Shore", far: "Far Shore", fracture: "Fractures", light: "3 Light" },
    supply: { "nb-root": "Root / Bloom", "nb-grievance": "Shade", "nb-blackwater": "Black Water", "nb-light": "Light", "nb-fracture": "Fracture", "nb-knot": "Knot",
      "nb-tok-hold": "Hold Fast", "nb-tok-shield": "Shield", "nb-tok-resign": "Resignation", "nb-echo": "Echo" },
  },
  zh: {
    title: "遊戲準備", sub: "以「最後火光的孩子」與三位擺渡人擺好的桌面。圖中編號與第5節的步驟相對應。",
    l: {
      1: ["河流圖板", "三塊圖板邊對邊拼接：第一河段在左（此岸，第0格），第三河段在右（彼岸，第12格）。"],
      2: ["河岸板塊", `第一／二／三河段各${TILES.map(t => t[1].length).join("／")}塊。將各河段的板塊分開洗混，霧面朝上放置到第2–4、5–8、9–11格的方槽中。`],
      3: ["最初的花與亡魂", "在第1格的兩個河岸各放置1朵花，讓第一步就是照亮的。將所選亡魂的立牌放置到此岸（第0格）。"],
      4: ["亡魂牌與燈籠", "所選亡魂牌正面朝上。裂痕放在渡帳上：第三道裂痕會讓亡魂破碎。孩子起始擁有3點光，新娘起始擁有1點光。燈籠是你們選擇的難度（第10節），沒有配件。"],
      5: ["記憶牌庫", `${CORE_IDS.length}張基本記憶牌加上亡魂的8張專屬牌（無名渡河用8張迴響牌），洗勻後背面朝上。棄牌堆正面朝上；遺忘堆放在渡帳上。`],
      6: ["迷霧牌庫", `每個河段一副，面朝下放置到該河段起點的迷霧牌槽：該河段的${MIST[0].length}張迷霧牌、「${ZH_MIST["Rising Water"][0]}」與「${ZH_MIST["Shade Drawn Near"][0]}」，以及依燈籠加入的凶霧（${harsh}）。`],
      7: ["命運織機", "織機圖板，結圓片放在一旁。每個結放在其絲線的下一個圓圈上：2–3人時打滿4個結便斷裂，單人或4人時為5個。迴響標記放在圖板旁備用。"],
      8: ["稱號", `${Object.keys(MANTLES).length}張稱號牌正面朝上，放在每個人都拿得到的地方。`],
      9: ["憶念之書", "所選亡魂的那本書，翻開到第一章。銘刻的牌放進牌槽，用相角固定。"],
      10: ["渡帳與供應區", `渡帳放在織機旁；所有標記放在伸手可及處。黑水只取燈籠規定的數量（${Object.entries(LANTERN).map(([l, v]) => `${ZH_LANTERNS[l]}${v[0]}`).join("／")}）放進渡帳的黑水供應區，其餘放回盒中。`],
      11: ["擺渡人", `每人發3張牌（單人4張）。每人拿1個破浪標記（正面朝上）與1張玩家輔助卡。起始玩家拿起船槳。單人：${GHOST.length}張幽靈牌組成幽靈牌庫。`],
    },
    cap: { deck: "牌庫", discard: "棄牌堆", forgotten: "遺忘堆", hand: "手牌", push: "破浪", oar: "船槳", aid: "玩家輔助卡", ghost: "單人：幽靈牌庫",
      reach: r => `第${["一", "二", "三"][r]}河段`, near: "此岸", far: "彼岸", fracture: "裂痕", light: "3點光" },
    supply: { "nb-root": "根／花", "nb-grievance": "怨念", "nb-blackwater": "黑水", "nb-light": "光", "nb-fracture": "裂痕", "nb-knot": "結",
      "nb-tok-hold": "堅守", "nb-tok-shield": "護盾", "nb-tok-resign": "認命", "nb-echo": "迴響" },
  },
};

// ---------------------------------------------------------------- drawing helpers (mm, trim coordinates)
let clipN = 0;
const img = (name, x, y, w, h, extra = "") => { const u = art(name); return u ? `<image href="${u}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" ${extra}/>` : ""; };
const card = (name, x, y, w, h, rot = 0, stroke = C.gilt) => {
  const id = `sc${clipN++}`;
  return `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x - .5}" y="${y - .5}" width="${w + 1}" height="${h + 1}" rx="1.6" fill="${C.ink}" stroke="${stroke}" stroke-width=".35"/>
    <clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.3"/></clipPath>${img(name, x, y, w, h, `clip-path="url(#${id})"`)}</g>`;
};
const stack = (name, x, y, w, h, n = 3) => Array.from({ length: n }, (_, i) => card(name, x + i * .8, y - i * .8, w, h)).join("");
const slot = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.4" fill="rgba(14,12,17,.4)" stroke="${C.gilt}" stroke-dasharray="1.4 1" stroke-width=".35"/>`;
const use = (id, x, y, s, col, op = 1) => `<use href="#${id}" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" style="color:${col}" opacity="${op}"/>`;
const chip = (id, x, y, col, r = 4.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.ink2}" stroke="${C.gilt}" stroke-width=".35"/>${use(id, x, y, r * 1.3, col)}`;
const num = (n, x, y) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${C.crimson}" stroke="#f4ecd8" stroke-width=".4"/><text x="${x}" y="${y + 1.3}" text-anchor="middle" class="sn">${n}</text>`;
const cap = (x, y, t, a = "middle") => `<text x="${x}" y="${y}" text-anchor="${a}" class="sc">${esc(t)}</text>`;
const COLOR = { "nb-root": C.bone, "nb-grievance": C.cyan, "nb-blackwater": C.mist, "nb-light": C.bone, "nb-fracture": C.crimson, "nb-knot": C.bone,
  "nb-tok-hold": C.cyan, "nb-tok-shield": C.bone, "nb-tok-resign": C.bone, "nb-echo": C.cyan };

// Label boxes: [step, x, y, width] in trim mm; drawn as HTML so the text wraps.
const LABELS = { 6: [14, 34, 92], 5: [112, 78, 88], 4: [222, 78, 64], 9: [292, 82, 114], 1: [14, 188, 92], 3: [112, 188, 88], 2: [222, 188, 184],
  7: [104, 207, 96], 11: [104, 262, 96], 8: [222, 241, 84], 10: [316, 273, 90] };

function spread(lang) {
  const L = W[lang], c = L.cap;
  clipN = 0;
  let s = "";
  // the table
  s += `<rect x="${-B}" y="${-B}" width="${SW + 2 * B}" height="${SH + 2 * B}" fill="url(#ss-wood)"/>`;
  // 5 Memory deck, discard, forgotten (6, the Mist decks, sit in their wells on the river board)
  s += stack("back-memory", 114, 36, 25, 35) + slot(144, 34.5, 25, 35) + slot(174, 34.5, 25, 35) + use("nb-fog", 186.5, 52, 9, C.mist, .6);
  s += cap(126.5, 75, c.deck) + cap(156.5, 75, c.discard) + cap(186.5, 75, c.forgotten);
  // 4 Soul card, Fractures and the Child's 3 Light
  s += card("soul-child", 224, 30, 28, 39, 0, C.bone);
  [0, 1, 2].forEach(i => { s += `<circle cx="${260}" cy="${36 + i * 11}" r="4.2" fill="none" stroke="${C.crimson}" stroke-dasharray="1 1" stroke-width=".35"/>`; });
  s += cap(260, 72, c.fracture);
  [0, 1, 2].forEach(i => { s += chip("nb-light", 274 + (i % 2) * 6, 40 + i * 9, C.bone, 3.6); });
  s += cap(277, 72, c.light);
  // 9 the Book of Remembrance, open at Chapter I
  s += `<g transform="rotate(1.5 349 50)"><rect x="294" y="27" width="112" height="50" rx="1" fill="#efe5cf" stroke="#8a6a3e" stroke-width=".4"/>
    <line x1="350" y1="27" x2="350" y2="77" stroke="#c9b48a" stroke-width=".8"/>
    <clipPath id="ss-book"><rect x="298" y="31" width="48" height="42"/></clipPath>${img("child-road", 298, 31, 48, 42, 'clip-path="url(#ss-book)" opacity=".85"')}
    ${[0, 1].map(r => [0, 1].map(k => `<rect x="${356 + k * 24}" y="${31 + r * 22}" width="18" height="19" rx=".8" fill="none" stroke="#8a6a3e" stroke-dasharray="1 .8" stroke-width=".3"/>`).join("")).join("")}</g>`;
  // 1-3, 6 the river board, drawn to scale from its own geometry: three panels, each with its Mist deck in its well, square
  // bank wells holding fog-side tiles (Blooms on space 1), and the Soul standee on the near shore
  const BX = 14, BY = 97, BWd = 392, k = BWd / (3 * BPW), BHt = BPH * k, X = sp => BX + G.spaceX(sp) * k, RY = BY + G.RY * k, TS = G.SW * k;
  s += `<rect x="${BX - 1}" y="${BY - 1}" width="${BWd + 2}" height="${BHt + 2}" rx="1.5" fill="#0b0a0d"/>
    <clipPath id="ss-board"><rect x="${BX}" y="${BY}" width="${BWd}" height="${BHt}" rx="1"/></clipPath>
    <g clip-path="url(#ss-board)">${img("tex-bank", BX, BY, BWd, BHt, 'opacity=".9"')}<rect x="${BX}" y="${BY}" width="${BWd}" height="${BHt}" fill="#0f0d11" opacity=".3"/>
      ${img("tex-water", BX, RY - 16, BWd, 32)}<rect x="${BX}" y="${RY - 16}" width="${BWd}" height="32" fill="url(#ss-water)"/>
      <rect x="${X(11) + TS / 2 + 4}" y="${BY}" width="${BWd}" height="${BHt}" fill="#1a0b10" opacity=".8"/><rect x="${BX}" y="${BY}" width="${20 * k}" height="${BHt}" fill="#0a090c" opacity=".75"/></g>
    ${[1, 2].map(i => `<line x1="${BX + BWd * i / 3}" y1="${BY}" x2="${BX + BWd * i / 3}" y2="${BY + BHt}" stroke="#000" stroke-width=".6" opacity=".8"/>`).join("")}`;
  [0, 1, 2].forEach(r => {
    const mx = BX + G.mistX(r) * k, my = RY - G.MH * k / 2, mw = G.MW * k, mh = G.MH * k;
    s += `<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="1.4" fill="#0b0f12" fill-opacity=".8" stroke="#4f7d86" stroke-width=".35"/>` + stack("back-mist", mx + 3.6, my + 4.6, mw - 8.8, mh - 8.8);
  });
  for (let sp = 1; sp <= 11; sp++) for (const y0 of [G.TOP, G.BOT]) {
    const x = X(sp) - TS / 2, y = BY + y0 * k;
    s += `<rect x="${x}" y="${y}" width="${TS}" height="${TS}" rx="1.2" fill="#0b0a0d" fill-opacity=".7" stroke="${C.gilt}" stroke-width=".3"/>`;
    if (sp === 1) s += `<circle cx="${X(1)}" cy="${y + TS / 2}" r="6" fill="rgba(20,6,10,.9)" stroke="${C.bone}" stroke-width=".35"/>${use("nb-bloom", X(1), y + TS / 2, 9, C.crimson)}`;
    else { const id = `sw${sp}${y0}`; s += `<clipPath id="${id}"><rect x="${x + .5}" y="${y + .5}" width="${TS - 1}" height="${TS - 1}" rx="1"/></clipPath>${img("card-fog", x + .5, y + .5, TS - 1, TS - 1, `clip-path="url(#${id})" opacity=".85"`)}`; }
  }
  for (let sp = 1; sp <= 11; sp++) s += `<text x="${X(sp)}" y="${RY + 1.6}" text-anchor="middle" class="ssp">${sp}</text>`;
  s += `<path d="M${X(0) - 4.6} ${RY + 6} L${X(0)} ${RY + 8.4} L${X(0) + 4.6} ${RY + 6}" fill="none" stroke="#000" stroke-width=".8" opacity=".5"/>
    <clipPath id="ss-soul"><rect x="${X(0) - 4}" y="${RY - 8}" width="8" height="13" rx=".6"/></clipPath>${img("soul-child", X(0) - 4, RY - 8, 8, 13, 'clip-path="url(#ss-soul)"')}
    <rect x="${X(0) - 4}" y="${RY - 8}" width="8" height="13" rx=".6" fill="none" stroke="${C.bone}" stroke-width=".35"/>
    ${use("nb-light", X(12), RY, 9, C.bone)}${cap(X(0), BY + 8, c.near)}${cap(X(12), BY + 8, c.far)}
    ${[0, 1, 2].map(r => cap(BX + BWd * r / 3 + 4, BY - 2.5, c.reach(r), "start")).join("")}`;
  // 7 the Loom of the Fates board (scaled), a few knots, the Echo token beside it
  const k = 84 / LOOM.w, LX = 14, LY = 206, LW = LOOM.w * k, LH = LOOM.h * k;
  s += `<rect x="${LX}" y="${LY}" width="${LW}" height="${LH}" rx="1.2" fill="${C.ink}" stroke="${C.gilt}" stroke-width=".4"/>
    ${[C.crimson, C.bone, C.cyan].map((col, t) => { const y = LY + (52 + t * 50) * k; return `<line x1="${LX + 78 * k}" y1="${y}" x2="${LX + 232 * k}" y2="${y}" stroke="${col}" stroke-width=".35" opacity=".7"/>` +
      [0, 1, 2, 3, 4].map(n => `<circle cx="${LX + (96 + n * 26) * k}" cy="${y}" r="${11 * k}" fill="${C.ink2}" stroke="${col}" stroke-width=".3" ${n === 4 ? 'stroke-dasharray=".8 .5"' : ""}/>`).join("") +
      (t === 0 ? [0, 1].map(n => use("nb-knot", LX + (96 + n * 26) * k, y, 5.5, C.bone)).join("") : t === 2 ? use("nb-knot", LX + 96 * k, y, 5.5, C.bone) : "") +
      `<rect x="${LX + 248 * k}" y="${y - 17 * k}" width="${37 * k}" height="${34 * k}" rx=".6" fill="none" stroke="${col}" stroke-width=".25"/>`; }).join("")}
    ${chip("nb-echo", LX + LW - 6, LY + LH + 7, C.cyan, 4.2)}
    ${[0, 1, 2, 3, 4].map(n => chip("nb-knot", LX + 6 + n * 9.5, LY + LH + 7, C.bone, 3.8)).join("")}`;
  // 11 the Ferrymen: a hand, Push Through, the Oar, a Player Aid; the Ghost's deck in solo play
  s += [-10, 0, 10].map((r, i) => card("back-memory", 108 + i * 11, 232 + Math.abs(r) / 4, 15, 21, r)).join("") + cap(124, 258, c.hand);
  s += chip("nb-tok-push", 149, 240, C.crimson, 4.5) + cap(149, 249.5, c.push) + chip("nb-tok-oar", 160, 240, C.bone, 5.6) + cap(160, 249.5, c.oar);
  s += `<rect x="168" y="231" width="13" height="18.5" rx=".6" fill="#efe5cf" stroke="#8a6a3e" stroke-width=".3"/>${[0, 1, 2, 3, 4, 5].map(i => `<line x1="170" y1="${235 + i * 2.4}" x2="179" y2="${235 + i * 2.4}" stroke="#b9a689" stroke-width=".3"/>`).join("")}${cap(174.5, 254, c.aid)}`;
  s += stack("back-ghost", 185, 233, 12, 17, 2) + cap(191.5, 258, c.ghost);
  // 8 the four Mantles
  Object.keys(MANTLES).forEach((m, i) => { s += card(`card-mantle-${m}`, 224 + i * 21, 210, 18, 25); });
  // 10 the supply, with the counts in the box
  const sup = ["nb-root", "nb-grievance", "nb-blackwater", "nb-light", "nb-fracture", "nb-knot", "nb-tok-hold", "nb-tok-shield", "nb-tok-resign"];
  s += `<rect x="314" y="196" width="94" height="74" rx="2" fill="rgba(14,12,17,.5)" stroke="${C.gilt}" stroke-width=".3" stroke-opacity=".7"/>`;
  sup.forEach((id, i) => {
    const x = 328 + (i % 3) * 30, y = 207 + Math.floor(i / 3) * 21, t = tok(id);
    s += chip(id, x, y, id === "nb-root" ? C.bone : COLOR[id], 4.8) + (id === "nb-root" ? chip("nb-bloom", x + 6.5, y + 2.5, C.crimson, 3.4) : "");
    s += `<text x="${x}" y="${y + 9.6}" text-anchor="middle" class="sc">${esc(L.supply[id])}</text><text x="${x}" y="${y + 13.2}" text-anchor="middle" class="sq">× ${t[4]}</text>`;
  });
  // step numbers
  const N = { 6: [BX + G.mistX(0) * k + 1.5, RY - G.MH * k / 2 + 1.5], 5: [112, 32], 4: [222, 26], 9: [294, 24], 1: [BX + 1, BY + 2], 2: [X(3) + TS / 2 + 3, BY + 3], 3: [X(0) + 6, RY - 9], 7: [LX + 1, LY + 1], 11: [106, 230], 8: [222, 207], 10: [314, 196] };
  for (const [n, [x, y]] of Object.entries(N)) s += num(n, x, y);
  return s;
}

export const SPREAD_CSS = lang => `
@page spread { margin: 0; @bottom-center { content: none; } }
.spread { page: spread; position: relative; width: ${GUT + 2 * B}mm; height: ${SH + 2 * B}mm; overflow: hidden; break-after: page; background: ${C.ink}; }
.spread svg.ss { position: absolute; inset: 0; width: 100%; height: 100%; }
.ss .sc { font-family: ${lang === "zh" ? `"Noto Serif TC", serif` : `"IBM Plex Mono", monospace`}; font-size: ${lang === "zh" ? 2.5 : 2.1}px; letter-spacing: ${lang === "zh" ? .05 : .12}px; fill: #cfc4b0; text-transform: uppercase; }
.ss .sq { font-family: "IBM Plex Mono", monospace; font-size: 2.6px; fill: ${C.bone}; }
.ss .sn { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 3.6px; fill: #fff; }
.ss .ssp { font-family: "IBM Plex Mono", monospace; font-size: 3px; fill: ${C.paper}; opacity: .8; }
.spread .hd { position: absolute; top: ${B + 9}mm; left: ${B + 14}mm; width: 180mm; color: ${C.paper}; }
.spread .hd b { display: block; font-family: ${lang === "zh" ? `"Noto Serif TC", serif` : `"IM Fell English SC", Georgia, serif`}; font-weight: ${lang === "zh" ? 600 : 400}; font-size: 20pt; line-height: 1; color: ${C.bone}; }
.spread .hd span { display: block; margin-top: 1mm; font-family: ${lang === "zh" ? `"LXGW WenKai TC", serif` : `"IM Fell English", Georgia, serif`}; font-style: ${lang === "zh" ? "normal" : "italic"}; font-size: 8.5pt; color: #cfc4b0; }
.spread .lb { position: absolute; font-family: ${lang === "zh" ? `"Noto Serif TC", serif` : `"Alegreya Sans", sans-serif`}; font-size: ${lang === "zh" ? 7.4 : 7.8}pt; line-height: ${lang === "zh" ? 1.45 : 1.28}; color: #e3d8c3; }
.spread .lb b { color: ${C.bone}; font-weight: ${lang === "zh" ? 600 : 500}; margin-right: 1.2mm; }
.spread .lb i { font-style: normal; display: inline-block; min-width: 4.2mm; height: 4.2mm; line-height: 4.2mm; border-radius: 50%; background: ${C.crimson}; color: #fff; text-align: center; font-family: "IBM Plex Mono", monospace; font-size: 6.4pt; margin-right: 1.4mm; }
`;

// The two pages of the spread, each showing its half of the one drawing (the bleed of each page runs into the other half).
// Each page is its own SVG cut from the same drawing (a viewBox over its half), so nothing is wider than the page.
export function setupSpread(lang) {
  const L = W[lang], body = spread(lang);
  const svg = x0 => `<svg class="ss" xmlns="http://www.w3.org/2000/svg" viewBox="${x0 - B} ${-B} ${GUT + 2 * B} ${SH + 2 * B}" preserveAspectRatio="none">
    <defs><radialGradient id="ss-wood" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#3a281c"/><stop offset="1" stop-color="#120d0a"/></radialGradient>
      <linearGradient id="ss-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d5a62" stop-opacity=".45"/><stop offset=".5" stop-color="#16343b" stop-opacity="0"/><stop offset="1" stop-color="#2d5a62" stop-opacity=".45"/></linearGradient></defs>
    ${body}</svg>`;
  const labels = x0 => Object.entries(LABELS).filter(([, [x]]) => (x < GUT) === (x0 === 0)).map(([n, [x, y, w]]) => {
    const [name, text] = L.l[n];
    return `<div class="lb" style="left:${x - x0 + B}mm;top:${y + B}mm;width:${w}mm"><i>${n}</i><b>${esc(name)}</b>${esc(text)}</div>`;
  }).join("");
  return `<section class="spread">${svg(0)}<div class="hd"><b>${L.title}</b><span>${esc(L.sub)}</span></div>${labels(0)}</section>
    <section class="spread">${svg(GUT)}${labels(GUT)}</section>`;
}
