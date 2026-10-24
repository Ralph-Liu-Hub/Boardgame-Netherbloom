// Pictures for the Rulebook: each rules section that is easier seen than read gets one, in both languages. They are drawn
// from the game's own pieces (the nb-* icons and the printed card faces of cardface.js) on a dark plate, so they read the
// same in the web game's Rulebook (dark) and in the printed booklet (paper).
// The sections hold placeholders, <div class="rfig" data-fig="network"></div>; fillFigures(html, lang, env) replaces them.
//   env.artImg(name, pos) draws a painting filling its positioned parent; env.cardsCSS (optional) is ignored here.
import { CARDS, MIST, HARSH, GHOST, MANTLES, SOULS, BOOK_FRAMES } from "./cards.js";
import { ZH_BOOK_FRAMES } from "./zh.js";
import { T as WORDS, cardKit, mistDeck, mistId, harshId, ghostId } from "./cardface.js";

const K = { plate: "#0e0c11", slot: "#17141b", bone: "#E6D3A3", crimson: "#D7263D", cyan: "#8FD6E1", mist: "#9A948C", paper: "#F2E8D5", gilt: "#8a6d48", water: "#10232a" };
export const fig = id => `<div class="rfig" data-fig="${id}"></div>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const use = (id, x, y, s, col, op = 1) => `<use href="#${id}" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" style="color:${col}" opacity="${op}"/>`;
const label = (x, y, text, { col = K.paper, size = 13, anchor = "middle", cls = "rf-t" } = {}) =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}" fill="${col}" font-size="${size}">${esc(text)}</text>`;
const figure = (inner, caption, cls = "") => `<figure class="rfig-in ${cls}">${inner}${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;

// ---------------------------------------------------------------- a stretch of river, seen from above
// Spaces from..to; each has a left bank (above), the water (its number), a right bank (below). Banks are keyed "3L", "3R".
// tok: { "3L": "root" | "bloom" }, griev: ["4L"], fog: ["5L"], flood: [4], target: ["2R"], no: ["5R"], lit: [1], soul: 2.
function river({ from = 0, to = 5, soul = 0, tok = {}, griev = [], fog = [], flood = [], target = [], no = [], lit = [], arrow = null, notes = [], light = [], w = 76 }) {
  const n = to - from + 1, W = 24 + n * w, H = 236, X = sp => 12 + (sp - from + .5) * w;
  const top = 18, bot = 156, sh = 62, sw = 46, RY = 118;
  let s = `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="${K.plate}"/>
    <rect x="6" y="${RY - 26}" width="${W - 12}" height="52" fill="${K.water}"/>
    <rect x="6" y="${RY - 26}" width="${W - 12}" height="52" fill="url(#rfwater)" opacity=".7"/>`;
  for (let sp = from; sp <= to; sp++) {
    const x = X(sp);
    if (lit.includes(sp)) s += `<ellipse cx="${x}" cy="${RY}" rx="${w * .46}" ry="96" fill="url(#rflit)"/>`;
    if (flood.includes(sp)) s += `<rect x="${x - w / 2 + 3}" y="${RY - 26}" width="${w - 6}" height="52" fill="#050608" opacity=".85"/>${use("nb-blackwater", x, RY + 15, 18, K.mist)}`;
    if (sp > 0) for (const b of ["L", "R"]) {
      const y = b === "L" ? top : bot, k = `${sp}${b}`, cx = x, cy = y + sh / 2;
      const isT = target.includes(k), isNo = no.includes(k);
      s += `<rect x="${x - sw / 2}" y="${y}" width="${sw}" height="${sh}" rx="5" fill="${fog.includes(k) ? "#22202a" : K.slot}" stroke="${isT ? K.cyan : K.gilt}" stroke-width="${isT ? 2.2 : 1}" ${isT ? 'stroke-dasharray="5 3"' : ""}/>`;
      if (isT) s += `<rect x="${x - sw / 2 - 4}" y="${y - 4}" width="${sw + 8}" height="${sh + 8}" rx="8" fill="none" stroke="${K.cyan}" stroke-opacity=".25" stroke-width="5"/>`;
      if (fog.includes(k)) s += use("nb-fog", cx, cy, 22, K.mist, .55);
      if (tok[k]) s += `<circle cx="${cx}" cy="${cy}" r="17" fill="#1d1a22" stroke="${tok[k] === "bloom" ? K.crimson : K.bone}" stroke-width="1.4"/>${use(tok[k] === "bloom" ? "nb-bloom" : "nb-root", cx, cy, 24, tok[k] === "bloom" ? K.crimson : K.bone)}`;
      if (griev.includes(k)) s += use("nb-grievance", cx, cy, 30, K.cyan);
      if (isNo) s += `<path d="M${cx - 10} ${cy - 10} L${cx + 10} ${cy + 10} M${cx + 10} ${cy - 10} L${cx - 10} ${cy + 10}" stroke="${K.crimson}" stroke-width="3" stroke-linecap="round"/>`;
    }
    s += sp === soul
      ? `<circle cx="${x}" cy="${RY}" r="17" fill="${K.paper}" stroke="${K.bone}" stroke-width="2"/>${use("nb-soul", x, RY, 22, K.plate)}`
      : `<circle cx="${x}" cy="${RY}" r="12" fill="none" stroke="${K.bone}" stroke-opacity=".45"/>${label(x, RY + 4.5, sp, { col: K.bone, size: 12, cls: "rf-n" })}`;
    if (light.includes(sp)) s += `${use("nb-light", x + 22, RY - 16, 18, K.bone)}${label(x + 22, RY - 28, "+1", { col: K.bone, size: 11 })}`;
  }
  if (arrow) {
    const [a, b] = arrow, xa = X(a) + 20, xb = X(b) - 20;
    s += `<path d="M${xa} ${RY} C${(xa + xb) / 2} ${RY - 34}, ${(xa + xb) / 2} ${RY - 34}, ${xb} ${RY - 4}" fill="none" stroke="${K.bone}" stroke-width="2" marker-end="url(#rfarrow)"/>`;
  }
  for (const [sp, b, text, col] of notes) s += label(X(sp), b === "L" ? top - 5 : bot + sh + 15, text, { col: col || K.mist, size: 11.5 });
  return `<svg class="rf-svg" viewBox="0 0 ${W} ${H}" role="img">${DEFS}${s}</svg>`;
}
const DEFS = `<defs><marker id="rfarrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${K.bone}"/></marker>
  <radialGradient id="rflit" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${K.crimson}" stop-opacity=".32"/><stop offset="1" stop-color="${K.crimson}" stop-opacity="0"/></radialGradient>
  <linearGradient id="rfwater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d5a62" stop-opacity=".6"/><stop offset=".5" stop-color="#16343b" stop-opacity="0"/><stop offset="1" stop-color="#2d5a62" stop-opacity=".6"/></linearGradient></defs>`;
// Panels side by side, each with its own short heading.
const panels = list => `<div class="rf-panels">${list.map(([title, svg, note]) => `<div class="rf-panel"><b>${title}</b>${svg}${note ? `<span>${note}</span>` : ""}</div>`).join("")}</div>`;
// A row of printed cards.
const cardRow = (faces, cls = "") => `<div class="rf-cards ${cls}">${faces.map(([html, cap]) => `<div class="rf-card"><div class="nbface">${html}</div>${cap ? `<span>${cap}</span>` : ""}</div>`).join("")}</div>`;

// ---------------------------------------------------------------- the pictures
const FIGS = {
  network: (t, L) => figure(river({ from: 0, to: 6, soul: 1, tok: { "1L": "bloom", "1R": "bloom", "2L": "root", "3L": "root" }, fog: ["2R", "3R", "4L", "4R", "5L", "5R", "6L", "6R"], target: ["2R", "3R", "4L"], no: ["5L", "6R"], lit: [1] }),
    t("The soul is on space 1, which its Blooms Light. The glowing banks are the only places a new Root may go: the lower banks of spaces 2 and 3 face a Root across the water, and the upper bank of space 4 follows the Root on space 3 along the same bank. The crossed-out banks touch nothing, so no Root can grow there.",
      "亡魂在第1格，那裡的花照亮了這一格。發光的河岸是新的根唯一能放的地方：第2格與第3格下方的河岸隔水對著一個根，第4格上方的河岸沿著同一側接在第3格的根之後。打叉的河岸什麼都沒有碰到，根無法生長在那裡。")),

  tiles: (t, L, kit) => figure(cardRow([0, 1, 2, 3].map(k => [kit.tileFace(L, k, 0), ""]).concat([[kit.tileBack(L, 0), t("The fog side", "霧面")]]), "five"),
    t("The four kinds of bank tile, and the fog side they are placed with. When a Root is placed on a fog tile, flip the tile face up.", "四種河岸板塊，以及擺放時朝上的霧面。在霧面朝上的河岸板塊上放置根時，將這塊板塊翻到正面。")),

  card: (t, L, kit) => {
    const cid = CARDS.findIndex(c => c.id === "C14"), n = (k, top, left) => `<span class="rf-num" style="top:${top}%;left:${left}%">${k}</span>`;
    const parts = t(["Its thread (the icon), its name and ID", "What it does when played face up", "Its Resonance: what it also does when it matches the Echo", "The painting", "The memory it carries, and which line of the Book it fills (Place, Person, Deed or Feeling)"],
      ["絲線（圖示）、牌名與編號", "正面打出時的效果", "共鳴：與迴響相符時額外執行的效果", "插畫", "它承載的記憶，以及它填入憶念之書的哪一格（地點、人物、事蹟或感受）"]);
    return figure(`<div class="rf-anat"><div class="rf-card big"><div class="nbface">${kit.memoryCard(L, cid)}</div>${n(1, 6, -9)}${n(2, 13.5, -9)}${n(3, 20, -9)}${n(4, 48, -9)}${n(5, 82, -9)}</div>
      <ol class="rf-legend">${parts.map(p => `<li>${p}</li>`).join("")}</ol></div>`,
      t("A Memory card. Oblivion cards have no Book slot: after use they go on the forgotten pile.", "一張記憶牌。忘卻牌沒有憶念之書的欄位：使用後放入遺忘堆。"));
  },

  echo: (t, L, kit) => {
    const acc = CARDS.findIndex(c => c.id === "C17"), obs = CARDS.findIndex(c => c.id === "C01");
    const loom = `<svg class="rf-svg rf-loom-s" viewBox="0 0 250 150" role="img"><rect width="250" height="150" rx="10" fill="${K.plate}"/>
      ${[["nb-obsession", K.crimson], ["nb-acceptance", K.bone], ["nb-oblivion", K.cyan]].map(([id, col], r) => `<line x1="40" y1="${32 + r * 43}" x2="230" y2="${32 + r * 43}" stroke="${col}" stroke-opacity=".5" stroke-width="2"/>${use(id, 22, 32 + r * 43, 24, col)}`).join("")}
      <circle cx="150" cy="75" r="15" fill="#1d1a22" stroke="${K.cyan}" stroke-width="2"/>${use("nb-echo", 150, 75, 20, K.cyan)}
      ${label(150, 140, t("The Echo sits on Acceptance", "迴響停在釋懷"), { col: K.cyan, size: 12 })}</svg>`;
    return figure(`<div class="rf-echo">${loom}${cardRow([[kit.memoryCard(L, acc), `<b class="yes">${t("Played as your Answer: Resonates", "作為回應打出：共鳴")}</b>`], [kit.memoryCard(L, obs), `<b class="no">${t("Another thread: no Resonance", "其他絲線：不會共鳴")}</b>`]])}</div>`,
      t("The last card played face up was an Acceptance card, so the Echo is on Acceptance. If your Answer is an Acceptance card, it Resonates: you also do its Resonance, and it may be inscribed in the Book.",
        "最後一張正面打出的牌是釋懷牌，所以迴響停在釋懷。若你的回應也是釋懷牌，它便會共鳴：你另外執行它的共鳴效果，而且可以把它銘刻進憶念之書。"));
  },

  loom: t => {
    const rows = [["nb-obsession", K.crimson, t("Obsession", "執念"), 2, t("Full: Grasping, a Shade on the soul's space", "打滿：攫取，在亡魂所在格放置怨念")],
      ["nb-acceptance", K.bone, t("Acceptance", "釋懷"), 4, t("Full: Resignation, the soul does not move next Soul Step", "打滿：認命，下一次亡魂步驟不移動")],
      ["nb-oblivion", K.cyan, t("Oblivion", "忘卻"), 1, t("Full: the Tide Rises, Black Water on the next space", "打滿：漲潮，在下一格放置黑水")]];
    const svg = `<svg class="rf-svg" viewBox="0 0 620 190" role="img"><rect width="620" height="190" rx="10" fill="${K.plate}"/>
      ${rows.map(([id, col, name, n, back], r) => { const y = 38 + r * 56;
        return `${use(id, 28, y, 26, col)}${label(50, y + 5, name, { col, size: 14, anchor: "start" })}<line x1="150" y1="${y}" x2="370" y2="${y}" stroke="${col}" stroke-opacity=".45" stroke-width="2"/>
          ${[0, 1, 2, 3, 4].map(k => `<circle cx="${170 + k * 46}" cy="${y}" r="15" fill="#1d1a22" stroke="${col}" stroke-opacity="${k < 4 ? .8 : .45}" ${k === 4 ? 'stroke-dasharray="4 3"' : ""}/>${k < n ? use("nb-knot", 170 + k * 46, y, 22, col) : ""}`).join("")}
          ${(([head, rest]) => label(398, y - 3, head, { col: n === 4 ? col : K.mist, size: 12.5, anchor: "start" }) + label(398, y + 14, rest, { col: n === 4 ? col : K.mist, size: 11.5, anchor: "start" }))(back.split(/, |，(.*)/s).filter(Boolean))}`; }).join("")}
      ${label(354, 182, t("5th knot: solo and 4 players only", "第5個結：僅限單人與4人"), { col: K.mist, size: 11 })}</svg>`;
    return figure(svg, t("Each card played face up or Burned ties a knot on its thread. With 2–3 players a thread holds 4 knots: here the Acceptance thread is full, so it snaps, its Backlash happens, and it is emptied.",
      "每張正面打出或焚燒的牌，都在其絲線上打一個結。2–3人遊戲時每條絲線可容納4個結：圖中的釋懷絲線已經打滿，於是斷裂、引發反噬，然後清空。"));
  },

  soulstep: t => figure(panels([
    [t("The next space is Lit", "下一格已被照亮"), river({ from: 1, to: 4, soul: 2, tok: { "2L": "bloom", "3L": "bloom", "3R": "root" }, fog: ["4L", "4R"], lit: [2, 3], arrow: [2, 3], notes: [[2, "L", t("+1 Light", "+1點光"), K.bone]], w: 70 }),
      t("The soul moves. Gain 1 Light for each Bloom on the space it moved off, then clear that space.", "亡魂移動。它離開的那一格上每有1朵花，獲得1點光，然後清空那一格。")],
    [t("The next space is not Lit", "下一格未照亮"), river({ from: 1, to: 4, soul: 2, tok: { "2L": "root", "3L": "root" }, fog: ["3R", "4L", "4R"], w: 70 }),
      t("The soul Lingers (stays put). If its own space is not Lit, forget the top card of the deck; if it is Lit, nothing else happens.", "亡魂徘徊（留在原格）。若它所在格未照亮，遺忘牌庫頂的1張牌；若已照亮，不發生其他事。")],
  ]), ""),

  threats: t => figure(panels([
    [t("Removing a Shade", "移除怨念"), river({ from: 2, to: 5, soul: 2, tok: { "3L": "bloom", "5L": "bloom", "2L": "bloom" }, griev: ["4L"], fog: ["3R", "4R", "5R"], lit: [2, 3, 5], w: 66 }),
      t("A Bloom on the same bank directly before and after a Shade: in Cleanup, return the Shade to the supply.", "怨念同一側河岸的正前一格與正後一格都有花：整理時把該怨念放回供應區。")],
    [t("Removing Black Water", "移除黑水"), river({ from: 2, to: 5, soul: 2, tok: { "2L": "bloom", "4L": "root", "4R": "root" }, flood: [4], fog: ["3L", "3R", "5L", "5R"], w: 66 }),
      t("Black Water on a space with a Root or Bloom on both banks: in Cleanup, remove the Black Water from the game.", "有黑水的格子兩岸都有根或花：整理時把該黑水移出遊戲。")],
    [t("Shades on both banks", "兩岸都有怨念"), river({ from: 2, to: 5, soul: 2, tok: { "2L": "bloom" }, griev: ["3L", "3R"], fog: ["4L", "4R", "5L", "5R"], w: 66 }),
      t("Shades on both banks of the next space: the soul cannot move there unless a player uses an action to Push Through.", "下一格兩岸都有怨念：除非有玩家花1個行動奮力駛過，否則亡魂無法移動到該格。")],
  ]), ""),

  book: (t, L) => {
    const frame = (L === WORDS.zh ? ZH_BOOK_FRAMES : BOOK_FRAMES)[0];
    const filled = { Place: t("the gate I swore never to leave", "我發誓永不離開的那道門"), Person: t("my mother, humming at the loom", "在織布機旁哼著歌的母親") };
    const gone = t("…but this, the river has taken", "……但這一段，已被河水帶走");
    const text = esc(frame[1]).replace(/\{(Place|Person|Deed|Feeling)\}/g, (_, k) => filled[k] ? `<span class="rf-slot full">${esc(filled[k])}</span>` : `<span class="rf-slot">${gone}</span>`);
    return figure(`<div class="rf-book"><div class="rf-bk-h">${esc(frame[0])}</div><p>${text}</p></div>`,
      t("Page I of a Book of Remembrance, half written: two memories inscribed, two slots still empty. If the crossing ended now, the empty ones would read as the river taking them.",
        "憶念之書的第一頁，寫了一半：兩段記憶已經銘刻，兩格仍是空的。若渡河此刻結束，空白的格子會讀作被河水帶走。"));
  },

  mantles: (t, L, kit) => figure(cardRow(Object.keys(MANTLES).map(m => [kit.mantleFace(L, m), ""]), "four"), t("The four Mantle cards.", "四張稱號牌。")),
  souls: (t, L, kit) => figure(cardRow(Object.keys(SOULS).map(k => [kit.soulFace(L, k), ""]), "five"), t("The five Soul cards.", "五張亡魂牌。")),
  mist: (t, L, kit) => {
    const pick = (r, name) => { const i = mistDeck(r).findIndex(m => m[0] === name); return kit.mistFace(L, mistDeck(r)[i], mistId(r, i), r, false); };
    const h = HARSH.findIndex(m => m[0] === "Flood Surge");
    return figure(cardRow([[pick(0, "Rising Water"), t("Reach I", "第一河段")], [pick(1, "Echo Severed"), t("Reach II", "第二河段")], [pick(2, "Twin Shades"), t("Reach III", "第三河段")], [kit.mistFace(L, HARSH[h], harshId(h), 0, true), t("Harsh Mist", "凶霧")]], "four"),
      t("Mist cards from each Reach, and a Harsh Mist card. Positions count from the soul's space.", "各河段的迷霧牌，以及一張凶霧牌。位置都從亡魂所在的格子算起。"));
  },
  solo: (t, L, kit) => figure(cardRow([0, 5, 9].map(i => [kit.ghostFace(L, GHOST[i][0], GHOST[i][1], ghostId(i)), ""]), "three"),
    t("Ghost cards: one of each thread.", "幽靈牌：每條絲線各一張。")),
};

// Replace every placeholder in html with its picture. env.artImg(name, pos) draws a painting (web WebP or print master).
export function fillFigures(html, lang, env) {
  const L = WORDS[lang === "zh" ? "zh" : "en"], t = (en, zh) => (lang === "zh" ? zh : en), kit = cardKit(env.artImg);
  return html.replace(/<div class="rfig" data-fig="([a-z]+)"><\/div>/g, (m, id) => (FIGS[id] ? `<div class="rfig" data-fig="${id}">${FIGS[id](t, L, kit)}</div>` : m));
}
export const FIG_IDS = Object.keys(FIGS);

export const RULEFIG_CSS = `
.rfig { margin: 12px 0 16px; }
.rfig-in { margin: 0; display: grid; gap: 8px; }
.rfig-in figcaption { font-size: .86em; line-height: 1.45; opacity: .85; }
.rf-svg { display: block; width: 100%; height: auto; }
.rf-svg .rf-t, .rf-svg .rf-n { font-family: "Alegreya Sans", "Noto Serif TC", sans-serif; }
.rf-svg .rf-n { font-family: "IBM Plex Mono", monospace; }
.rf-panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; }
.rf-panel { display: grid; gap: 5px; align-content: start; }
.rf-panel > b { font-weight: 500; }
.rf-panel > span { font-size: .84em; line-height: 1.4; opacity: .85; }
.rf-cards { display: grid; gap: 10px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.rf-cards.five { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.rf-cards.three { grid-template-columns: repeat(3, minmax(0, 150px)); }
.rf-card { position: relative; display: grid; gap: 5px; align-content: start; text-align: center; font-size: .82em; }
.rf-card .nbface { width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,.4); }
.rf-card .yes { font-weight: 600; } .rf-card .no { opacity: .7; font-weight: 400; }
.rf-anat { display: grid; grid-template-columns: minmax(0, 220px) 1fr; gap: 16px; align-items: center; padding-left: 24px; }
.rf-num { position: absolute; z-index: 2; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%; background: #D7263D; color: #fff;
  font: 600 12px/20px "IBM Plex Mono", monospace; text-align: center; box-shadow: 0 0 0 2px #0e0c11; }
.rf-legend { margin: 0; padding-left: 22px; display: grid; gap: 6px; }
.rf-echo { display: grid; grid-template-columns: minmax(0, 250px) minmax(0, 1fr); gap: 14px; align-items: center; }
.rf-echo .rf-cards { grid-template-columns: repeat(2, minmax(0, 170px)); }
.rf-book { background: #241f1a; color: #E6D3A3; border: 1px solid #5a4c3a; border-radius: 4px; padding: 14px 16px; font-family: "IM Fell English", "LXGW WenKai TC", Georgia, serif; }
.rf-bk-h { font-family: "IM Fell English SC", "Noto Serif TC", serif; font-size: 1.1em; margin-bottom: 6px; }
.rf-book p { margin: 0; line-height: 1.9; }
.rf-slot { border: 1px dashed #5a4c3a; border-radius: 3px; padding: 1px 6px; color: #8d7d66; font-style: italic; }
.rf-slot.full { border-style: solid; background: #E6D3A3; color: #0e0c11; }
@media (max-width: 640px) { .rf-cards, .rf-cards.five { grid-template-columns: repeat(3, minmax(0, 1fr)); } .rf-anat, .rf-echo { grid-template-columns: 1fr; } .rf-anat .rf-card.big { max-width: 220px; } }
`;
