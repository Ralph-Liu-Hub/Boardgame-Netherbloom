// Netherbloom V5: a manual table. Nothing here plays the game: like a physical table (or Screentop.gg),
// players move every card and token by hand. The optional hint panel only shows the next step of the rules.
import { CARDS, OBS, ACC, OBL, opText } from "./cards.js";
import { ZH_CARD_NAMES, ZH_BANDS, zhOpText } from "./zh.js";
import { STORY, PULL } from "./table-story.js";
import { STORY_EN } from "./table-story-en.js";
import * as D from "./table-data.js";
import * as net from "./net.js";
import { createVoice } from "./voice.js";
import { RULES_HTML, RULES_HTML_EN, AID_HTML, AID_HTML_EN } from "./rules-v5.js";
import { STEPS, PHASES } from "./table-hints.js";

// ---------------------------------------------------------------- language
let LANG = (() => { try { return localStorage.getItem("nb-lang") || "zh"; } catch { return "zh"; } })();
const tr = (zh, en) => (LANG === "en" && en ? en : zh);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const icon = (id, cls = "ic") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const $ = (sel, el = document) => el.querySelector(sel);

// ---------------------------------------------------------------- memory cards (V5: 32 core, Unremember ×2, Lightless Crossing)
const V5_TEXT = {   // effects that changed after V3.2
  vigil: ["點亮 1 段記憶，不必支付光", "Light 1 memory for free"],
  cross: ["亡魂立即前進一格，即使該格未照亮，或兩岸都有怨念（有黑水的格子不行）。不得光；進入未照亮的格子時承受 1 道裂痕", "The soul steps forward now, even into an unlit space or between two Shades (never into Black Water). No Light; an unlit space costs a Fracture"],
};
const MEM = {};
function opLine(op, lang) {
  if (V5_TEXT[op[0]]) return V5_TEXT[op[0]][lang === "en" ? 1 : 0];
  return lang === "en" ? opText(op) : zhOpText(op);
}
const opsLine = (ops, lang) => ops.map(o => opLine(o, lang)).join(lang === "en" ? ". " : "。") + (lang === "en" ? "." : "。");
for (const c of CARDS) {
  if (c.id === "C27") continue;
  MEM[c.id] = c;
}
MEM.C33 = { id: "C33", name: "Lightless Crossing", tag: OBL, eff: [["cross"]], res: [["light", 1]], slot: null, band: "", key: false };
const zhName = c => (c.id === "C33" ? "無光之渡" : ZH_CARD_NAMES[c.name] || c.name);
// the storybook in the current language (the English one has the same shape)
const story = s => (LANG === "en" ? STORY_EN : STORY)[s];
// a Soul's special rule as the V5 rulebook words it
const TRAIT_ZH = { garland: "散花：亡魂離開一格時，那一格只要有 1 朵花，就可以留成光牆；只有一朵花的光牆只擋 1 點霧勢。" };
const soulTrait = s => (LANG === "en" ? STORY_EN[s].trait : TRAIT_ZH[s] || STORY[s].trait.replace(/（同 V4\.0[^）]*）/, ""));
const soulName = s => (LANG === "en" ? D.SOUL_EN[s] : STORY[s]?.name) || "";
const PACK = { open: "E", child: "L", garland: "G-", king: "K", bride: "B" };
function deckIds(soul) {
  const core = Object.keys(MEM).filter(id => id[0] === "C");
  const own = Object.keys(MEM).filter(id => id.startsWith(PACK[soul]) && (soul !== "garland" || id.startsWith("G-")));
  return [...core, ...own];
}

// ---------------------------------------------------------------- the paintings
const ART = name => `/assets/art/${name}.webp`;
const SOUL_PAINT = {
  open: ["nameless-road", "nameless-mourners", "nameless-lethe"], child: ["child-road", "child-fields", "child-lethe"],
  garland: ["garland-brook", "garland-wade", "garland-lethe"], king: ["king-field", "king-barge", "king-lake"],
  bride: ["bride-wedding", "bride-stair", "bride-shore"],
};
const TAG_ART = ["card-obsession", "card-acceptance", "card-oblivion"];
// a Memory card's painting: core cards by thread; a soul's own cards use that soul's Book paintings
// (Oblivion cards keep the thread painting, the Key Memory gets the last chapter), as on the printed cards
function memArt(card) {
  const soul = Object.keys(PACK).find(k => card.id.startsWith(PACK[k]) && (k !== "garland" || card.id.startsWith("G-")));
  if (!soul || card.id[0] === "C" || card.tag === 2) return TAG_ART[card.tag] || TAG_ART[1];
  const pp = SOUL_PAINT[soul];
  return card.key ? pp[2] : card.tag === 0 ? pp[0] : pp[1];
}
const MANTLE_ART = { weaver: "card-mantle-weaver", warden: "card-mantle-warden", bringer: "card-mantle-bringer", breaker: "card-mantle-breaker", reaper: "card-oblivion" };
const BANK_ART = { fertile: "card-bank-fertile", stony: "card-bank-stony", spring: "card-bank-memory", grave: "card-bank-grave" };
// the painted band at the top of a face-up card
function bandArt(it) {
  const [type, a] = it.ck.split(":");
  if (type === "mem") return memArt(MEM[a]);
  if (type === "mist") return `card-mist-${(it.deck ?? 0) + 1}`;
  if (type === "harsh") return "card-harsh";
  if (type === "mantle") return MANTLE_ART[a];
  if (type === "ghost") return "card-ghost";
  return null;
}

// ---------------------------------------------------------------- random
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------- layout (world coordinates)
const CW = 110, CH = 152;                 // card size: large enough to read when a board is zoomed in
const TK = 50;                            // token size
const SW = CW + 8, SH = CH + 8;           // a card slot or pile
const PG = SW + 14;                       // pile pitch: the distance from one pile to the next
// The shared table, seen from above. Every player's screen shows the same table (positions are shared online):
//   top:    the Soul, fate and commissions (left), the Book (right)
//   middle: the Loom, Ledger and supply (left), the River (centre), the Play area and the Box (right)
//   right:  the Play area, the Box and the set-up board (where the components wait to be set out at the start)
//   edges:  each player's front, as at a real table (Tabletopia-like): seat 1 at the bottom, then left, top and right.
//           A front shows what that player has in front of them: their hand as card backs, commission (face up only to its
//           owner), Mantle, Push Through and lasting cards. Each player's hand is in a column at the right of their screen.
// The table takes the shape its seats need (the same for every player in that game).
// The River is a square board: three rows of five spaces that wind down the board with two turns
// (0–4 left to right, 5–9 right to left, 10–14 left to right).
let WORLD, BOUNDS, FITB, FATE, MISTA, BOOK, LOOM, LEDGER, SUPPLY, RIVER, PLAY, BOXA, SETUPA, MATS;
const SEAT_OF = { 1: [0], 2: [0, 2], 3: [0, 1, 3], 4: [0, 1, 2, 3] };   // 0 bottom, 1 left, 2 top, 3 right
function layoutWorld(players, me = 0) {
  FATE = { x: 40, y: 40, w: 1000, h: 440 }; MISTA = { x: 40, y: 500, w: 1000, h: 280 }; BOOK = { x: 1080, y: 40, w: 1920, h: 740 };
  LOOM = { x: 40, y: 820, w: 1000, h: 400 }; LEDGER = { x: 40, y: 1240, w: 1000, h: 400 }; SUPPLY = { x: 40, y: 1660, w: 1000, h: 480 };
  RIVER = { x: 1080, y: 820, w: 1200, h: 1320, m: 120, colW: 194, rowH: 425, bank: 110, lane: 120 };
  PLAY = { x: 2320, y: 820, w: 680, h: 500 }; BOXA = { x: 2320, y: 1340, w: 680, h: 400 }; SETUPA = { x: 2320, y: 1760, w: 680, h: 380 };
  WORLD = { w: 3040, h: 2500 };
  BOUNDS = { x: 20, y: 20, w: 3000, h: 2140 };   // the table's frame: the boards only
  FITB = { x: 20, y: 20, w: 3000, h: 2470 };     // what "Fit" fills the window with: the boards and my own front below them
  // Fronts are placed on each screen, never saved: mine below the boards, inside the view; the others beyond its
  // edges (left, top, right, in seat order), seen when a player zooms out.
  const HW = 1260, HH = 260, VW = 320, VH = 1180;
  const spot = { bottom: { x: 20 + (3000 - HW) / 2, y: 2210, w: HW, h: HH, v: false }, top: { x: 20 + (3000 - HW) / 2, y: -320, w: HW, h: HH, v: false },
    left: { x: -380, y: 20 + (2140 - VH) / 2, w: VW, h: VH, v: true }, right: { x: 3100, y: 20 + (2140 - VH) / 2, w: VW, h: VH, v: true } };
  const order = { 1: ["bottom"], 2: ["bottom", "top"], 3: ["bottom", "left", "right"], 4: ["bottom", "left", "top", "right"] }[players] || ["bottom"];
  MATS = Array.from({ length: players }, (_, p) => spot[order[(p - me + players) % players]]);
}
layoutWorld(1);
// ------------------------------------------------------------------ stretching the table to fill any window
// Positions are shared by every player, so the table itself has one shape. On each screen the whole table stretches
// to the window's shape: every board grows in proportion and what is on it spreads out with it, while cards, tiles,
// tokens and text keep their size. Each player's front at the edge moves as one piece and keeps its size.
const STR = { kx: 1, ky: 1 };
const MX0 = 20, MY0 = 20, MX1 = 3020, MY1 = 2180, SIDEY = 1090, MIDX = 1520;
const sX = v => MX0 + (v - MX0) * STR.kx, sY = v => MY0 + (v - MY0) * STR.ky;
function C2D(x, y) {
  if (y >= MY1) return { x: x + sX(MIDX) - MIDX, y: y + sY(MY1) - MY1 };   // the front below the boards
  if (y < MY0) return { x: x + sX(MIDX) - MIDX, y };                         // the front above
  if (x < MX0) return { x, y: y + sY(SIDEY) - SIDEY };                        // the fronts at the sides
  if (x > MX1) return { x: x + sX(MX1) - MX1, y: y + sY(SIDEY) - SIDEY };
  return { x: sX(x), y: sY(y) };
}
// back from the screen to the table: whichever piece of the map gives back the same point (else the nearest one)
function D2C(x, y) {
  const c = [{ x: (x - MX0) / STR.kx + MX0, y: (y - MY0) / STR.ky + MY0 },
    { x: x - sX(MIDX) + MIDX, y: y - sY(MY1) + MY1 }, { x: x - sX(MIDX) + MIDX, y },
    { x, y: y - sY(SIDEY) + SIDEY }, { x: x - sX(MX1) + MX1, y: y - sY(SIDEY) + SIDEY }];
  let best = c[0], bd = Infinity;
  for (const q of c) { const d = C2D(q.x, q.y), e = Math.abs(d.x - x) + Math.abs(d.y - y); if (e < bd) { bd = e; best = q; } }
  return best;
}
// spread what is drawn inside a board with it: each thing's centre moves with the stretch, its size stays
function stretchInside(board) {
  for (const el of board.children) {
    if (el.tagName === "svg" || el.tagName === "BUTTON" || el.classList.contains("btitle")) continue;
    const st = el.style;
    if (getComputedStyle(el).position !== "absolute") continue;
    if (el.dataset.l0 === undefined) {   // placed inline or by the stylesheet: start from where it is now
      el.dataset.l0 = st.right && st.left ? st.left : st.right ? "" : el.offsetLeft + "px"; el.dataset.t0 = el.offsetTop + "px";
      el.dataset.w0 = el.classList.contains("groove") ? st.width : "";
    }
    const ow = el.offsetWidth, oh = el.offsetHeight;
    if (el.dataset.w0) st.width = parseFloat(el.dataset.w0) * STR.kx + "px";
    else if (el.dataset.l0) st.left = (parseFloat(el.dataset.l0) + ow / 2) * STR.kx - ow / 2 + "px";
    if (el.dataset.w0 && el.dataset.l0) st.left = parseFloat(el.dataset.l0) * STR.kx + "px";
    if (el.dataset.t0) st.top = (parseFloat(el.dataset.t0) + oh / 2) * STR.ky - oh / 2 + "px";
  }
}
// place the boards for the current stretch (the fronts keep their size)
function placeBoards() {
  document.querySelectorAll("#tt-boards > .board").forEach(b => {
    if (b.dataset.cx === undefined) Object.assign(b.dataset, { cx: parseFloat(b.style.left), cy: parseFloat(b.style.top), cw: parseFloat(b.style.width), ch: parseFloat(b.style.height) });
    const q = C2D(+b.dataset.cx, +b.dataset.cy), mat = b.classList.contains("mat");
    b.style.left = q.x + "px"; b.style.top = q.y + "px";
    b.style.width = (mat ? +b.dataset.cw : +b.dataset.cw * STR.kx) + "px"; b.style.height = (mat ? +b.dataset.ch : +b.dataset.ch * STR.ky) + "px";
    if (!mat) stretchInside(b);
  });
  const f = $(".felt");
  if (f) f.style.cssText = `left:${BOUNDS.x}px;top:${BOUNDS.y}px;width:${BOUNDS.w * STR.kx}px;height:${BOUNDS.h * STR.ky}px`;
}
const tAt = (x, y, w, h, rot) => { const q = C2D(x, y); return `translate(${q.x - w / 2}px,${q.y - h / 2}px)${rot !== undefined ? ` rotate(${rot}deg)` : ""}`; };
// the slots of a player's front (centres, world coordinates)
function matSlots(p) {
  const m = MATS[p];
  if (!m) return null;
  if (!m.v) {
    const y = m.y + 60 + SH / 2, x0 = m.x + 330;
    return { fan: { x: m.x + 20, y: m.y + 50, w: 290, h: 190 }, comm: { x: x0 + SW / 2, y }, mantle: { x: x0 + PG + SW / 2, y },
      push: { x: x0 + 2 * PG + 40, y: m.y + 98 }, oar: { x: x0 + 2 * PG + 40, y: m.y + 192 }, lasting: [0, 1, 2].map(i => ({ x: x0 + 2 * PG + 100 + i * PG + SW / 2, y })) };
  }
  const x0 = m.x + 20;
  return { fan: { x: m.x + 16, y: m.y + 50, w: m.w - 32, h: 170 }, comm: { x: x0 + SW / 2, y: m.y + 240 + SH / 2 }, mantle: { x: x0 + PG + SW / 2, y: m.y + 240 + SH / 2 },
    push: { x: x0 + 40, y: m.y + 450 }, oar: { x: x0 + PG + 40, y: m.y + 450 }, lasting: [0, 1, 2, 3].map(i => ({ x: x0 + (i % 2) * PG + SW / 2, y: m.y + 530 + Math.floor(i / 2) * (SH + 30) + SH / 2 })) };
}
// where each item of a player's area lies on their front
function areaPlaces(p) {
  const sl = matSlots(p), out = {};
  if (!sl) return out;
  const items = (S.areas[p] || []).map(id => S.items[id]);
  const comm = items.find(it => it.ck?.startsWith("comm:")), mantle = items.find(it => it.ck?.startsWith("mantle:")), push = items.find(it => it.tk === "push"), oar = items.find(it => it.tk === "oar");
  if (comm) out[comm.id] = sl.comm;
  if (mantle) out[mantle.id] = sl.mantle;
  if (push) out[push.id] = sl.push;
  if (oar) out[oar.id] = sl.oar;
  items.filter(it => it !== comm && it !== mantle && it !== push && it !== oar).forEach((it, i) => {
    const q = sl.lasting[Math.min(i, sl.lasting.length - 1)];
    out[it.id] = { x: q.x + Math.max(0, i - 3) * 14, y: q.y + Math.max(0, i - 3) * 14 };
  });
  return out;
}
const matAt = pt => MATS.findIndex(m => m && pt.x >= m.x && pt.x <= m.x + m.w && pt.y >= m.y && pt.y <= m.y + m.h);
// where a space sits on the square board, and which way the river flows through it
function spaceGeo(sp) {
  const row = Math.floor(sp / 5), i = sp % 5;
  const east = row % 2 === 0;
  const col = east ? i : 4 - i;
  const laneW = RIVER.colW - 40;
  const x = RIVER.x + RIVER.m + col * RIVER.colW;
  const top = RIVER.y + 50 + row * RIVER.rowH;
  const laneY = top + RIVER.bank + 10;
  const bx = x + (laneW - RIVER.bank) / 2;
  const north = { x: bx, y: top }, south = { x: bx, y: laneY + RIVER.lane + 10 };
  // facing downstream: flowing east, the left bank is the north one; flowing west, it is the south one
  return { row, col, east, x, top, laneY, laneW, left: east ? north : south, right: east ? south : north };
}

// ---------------------------------------------------------------- state
let S = null;            // the shared table
let ME = 0;              // my seat
let mode = "local";      // local | host | guest
let link = null;         // net handle
// Watching (an admin): a seat-less view of an online table. Nothing can be moved; the view can be any player's.
// watchHost: this screen hosts the table without playing. It stands in for a seat only while that seat is empty.
let WATCH = false, watchHost = false, liveCode = null, liveTimer = 0;
let voice = null, voiceList = [];   // in-game voice (voice.js) and the host's list of who is in it
const watchToast = () => toast(tr("觀戰中：不能移動任何東西。", "Watching: you cannot move anything."));
let hist = [], fut = [];
const LS = "nb-table-v5g";   // the table layout changed (larger components, set-up strip): older saved tables do not fit it
const saveLocal = () => { if (mode !== "guest") try { localStorage.setItem(LS, JSON.stringify(S)); } catch { /* full */ } };

const uid = (() => { let n = 0; return p => `${p}${(++n).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`; })();

function blankState(opts) {
  return {
    v: 1, rev: 0, soul: opts.soul, level: opts.level, players: opts.players, names: opts.names,
    items: {}, stacks: {}, hands: Array.from({ length: opts.players }, () => []), where: {}, z: 10,
    // each player's own area: commission, Mantle, Push Through token and lasting cards (shown only on their screen)
    areas: Array.from({ length: opts.players }, () => []),
    chapter: 0, hint: 0, log: [],
    // counters are slider tracks: one marker pushed along a groove (Light, Fractures, knots and scars)
    tracks: { light: 0, crack: 0, forgot: 0, knot0: 0, knot1: 0, knot2: 0, scar0: 0, scar1: 0, scar2: 0 },
  };
}
function addItem(kind, props, place) {
  const id = uid(kind[0]);
  S.items[id] = { id, kind, x: 0, y: 0, z: ++S.z, rot: 0, face: 1, ...props };
  if (place?.stack) { S.stacks[place.stack].items.push(id); S.where[id] = "s:" + place.stack; }
  else if (place?.hand !== undefined) { S.hands[place.hand].push(id); S.where[id] = "h:" + place.hand; }
  else if (place?.area !== undefined) { S.areas[place.area].push(id); S.where[id] = "a:" + place.area; }
  else { const it = S.items[id]; it.x = place?.x ?? 0; it.y = place?.y ?? 0; S.where[id] = "t"; }
  return id;
}
function addStack(id, props) { S.stacks[id] = { id, items: [], faceUp: false, ...props }; return id; }

// ---------------------------------------------------------------- setup: sort the components onto the table
function newTable(opts) {
  S = blankState(opts);
  layoutWorld(opts.players, 0);
  buildSnaps(opts.players);
  const soul = opts.soul;
  // Like opening the box: every component is sorted into its own labelled pile or tray, in order and unshuffled.
  // The players set the game up themselves (the hints walk them through it).
  const fx = i => FATE.x + 20 + i * PG, mx = i => MISTA.x + 20 + i * PG, sx = i => SETUPA.x + 20 + i * PG, tx = i => SETUPA.x + 20 + i * 112;
  addStack("deck", { x: LEDGER.x + 20, y: LEDGER.y + 56, label: ["記憶牌庫", "Memory deck"], accepts: "card" });
  addStack("discard", { x: LEDGER.x + 20 + PG, y: LEDGER.y + 56, label: ["棄牌堆", "Discard"], accepts: "card", faceUp: true });
  addStack("forgot", { x: LEDGER.x + 20 + 2 * PG, y: LEDGER.y + 56, label: ["遺忘堆", "Forgotten"], accepts: "card", faceUp: true, counter: "forgot" });
  addStack("box", { x: BOXA.x + 20, y: BOXA.y + 96, w: BOXA.w - 40, h: BOXA.h - 116, label: ["盒中（移出遊戲）", "Box (out of game)"], accepts: "any", faceUp: true, big: true });
  for (let r = 0; r < 3; r++) addStack("mist" + r, { x: mx(r), y: MISTA.y + 60, label: [D.DECK_NAMES[r].zh, D.DECK_NAMES[r].en], accepts: "card", showBack: true });
  addStack("mistdis", { x: mx(4), y: MISTA.y + 60, label: ["迷霧棄牌", "Mist discard"], accepts: "card", faceUp: true });
  addStack("harsh", { x: mx(5), y: MISTA.y + 60, label: ["凶霧", "Harsh Mist"], accepts: "card", showBack: true });
  addStack("spare", { x: mx(6), y: MISTA.y + 60, label: ["備用板塊", "Spare tiles"], accepts: "tile", faceUp: true, small: true });
  for (let ch = 0; ch < 3; ch++) for (let k = 0; k < 2; k++)
    addStack(`fate${ch}${k}`, { x: fx(ch * 2 + k), y: FATE.y + 270, label: [`第${"一二三"[ch]}章・${k ? "書上" : "河流"}`, `Ch ${ch + 1} · ${k ? "Book" : "River"}`], accepts: "card" });
  addStack("comm", { x: fx(3), y: FATE.y + 60, label: ["託付卡", "Commissions"], accepts: "card" });
  addStack("ending", { x: fx(4), y: FATE.y + 60, label: ["結局牌", "Endings"], accepts: "card" });
  // the set-up strip
  addStack("mine", { x: sx(0), y: SETUPA.y + 56, label: ["亡魂專屬記憶", "The soul's memories"], accepts: "card", faceUp: true });
  D.TILE_POOLS.forEach((_, r) => addStack(`pool${r}`, { x: tx(r), y: SETUPA.y + 262, label: [`第${"一二三"[r]}河段板塊池`, `Reach ${r + 1} tile pool`], accepts: "tile", small: true, pool: r }));
  addStack("graves", { x: tx(3), y: SETUPA.y + 262, label: ["墳墓", "Graves"], accepts: "tile", faceUp: true, small: true });
  addStack("mantles", { x: sx(1), y: SETUPA.y + 56, label: ["稱號牌", "Mantle cards"], accepts: "card", faceUp: true });
  if (opts.players === 1) addStack("ghost", { x: sx(2), y: SETUPA.y + 56, label: ["幽靈牌庫", "Ghost deck"], accepts: "card", showBack: true });
  // the supply trays
  const binX = i => SUPPLY.x + 20 + (i % 8) * 120, binY = i => SUPPLY.y + 264 + Math.floor(i / 8) * 116;
  const bins = [["root", ["根／花", "Root / Bloom"], 24], ["shade", ["怨念", "Shade"], 8], ["bw", ["黑水", "Black Water"], 7],
    ["fog", ["霧標記", "Fog marker"], 2], ["soul", ["亡魂", "Soul"], 1], ["echo", ["迴響", "Echo"], 1], ["push", ["破浪", "Push Through"], 4],
    ["oar", ["船槳", "Oar"], 1], ["hold", ["堅守", "Hold Fast"], 1], ["shield", ["護盾", "Shield"], 1], ["resign", ["認命", "Resignation"], 1]];
  bins.forEach(([tk, label, n], i) => {
    addStack("bin_" + tk, { x: binX(i), y: binY(i), label, accepts: "tok:" + tk, faceUp: true, bin: true });
    for (let j = 0; j < n; j++) addItem("tok", { tk, face: tk === "root" ? 0 : 1 }, { stack: "bin_" + tk });
  });
  // cards, in order (shuffling is the players' job)
  deckIds(soul).filter(id => id[0] === "C").forEach(cid => addItem("card", { ck: "mem:" + cid, face: 0 }, { stack: "deck" }));
  deckIds(soul).filter(id => id[0] !== "C").forEach(cid => addItem("card", { ck: "mem:" + cid, face: 1 }, { stack: "mine" }));
  for (let r = 0; r < 3; r++) for (const [k, n] of D.MIST_DECKS[r]) for (let i = 0; i < n; i++) addItem("card", { ck: "mist:" + k, face: 0, deck: r }, { stack: "mist" + r });
  D.HARSH_CARDS.forEach(h => addItem("card", { ck: "harsh:" + h.key, face: 0 }, { stack: "harsh" }));
  STORY[soul].chapters.forEach((ch, ci) => ch.fates.forEach((f, fi) => addItem("card", { ck: `fate:${soul}:${ci}:${fi}`, face: 0 }, { stack: `fate${ci}${f.river ? 0 : 1}` })));
  STORY[soul].commissions.forEach((_, i) => addItem("card", { ck: `comm:${soul}:${i}`, face: 0 }, { stack: "comm" }));
  if (soul !== "open") ["0", "1", "2", "mix", "hidden"].forEach(k => addItem("card", { ck: `end:${soul}:${k}`, face: 0 }, { stack: "ending" }));
  if (opts.players === 1) D.GHOST.forEach((_, i) => addItem("card", { ck: "ghost:" + i, face: 0 }, { stack: "ghost" }));
  D.MANTLES.forEach(m => addItem("card", { ck: "mantle:" + m.key, face: 1 }, { stack: "mantles" }));
  addItem("card", { ck: "soul:" + soul, face: 1 }, { x: fx(0) + SW / 2, y: FATE.y + 60 + SH / 2 });
  // tiles: each Reach's pool, the Graves, the spares
  D.TILE_POOLS.forEach((p, r) => Object.entries(p.pool).forEach(([k, n]) => { for (let i = 0; i < n; i++) addItem("tile", { tk: k, face: 0 }, { stack: `pool${r}` }); }));
  for (let i = 0; i < 3; i++) addItem("tile", { tk: "grave", face: 1 }, { stack: "graves" });
  Object.entries(D.SPARE_TILES).forEach(([k, n]) => { for (let i = 0; i < n; i++) addItem("tile", { tk: k, face: 1 }, { stack: "spare" }); });
  S.log.push({ t: Date.now(), who: -1, m: tr("新的一局：元件都已分類放好，請依提示準備遊戲", "New game: the components are sorted; set the game up with the hints") });
}

// Set-up help that a person would do by hand in a few seconds, kept to exactly what the rulebook says.
// A Reach's tiles: its Graves (already moved onto its pool) and enough tiles drawn at random from the pool to fill its empty
// banks, shuffled together and laid face down; the tiles not drawn go back to the box unseen.
function fillReach(r) {
  const st = S.stacks[`pool${r}`], spaces = D.TILE_POOLS[r].spaces;
  const empty = spaces.flatMap(sp => [`bank${sp}L`, `bank${sp}R`]).filter(id => !Object.values(S.items).some(it => S.where[it.id] === "t" && it.kind === "tile" && Math.hypot(it.x - snapPos(id).x, it.y - snapPos(id).y) < 10));
  const graves = st.items.filter(id => S.items[id].tk === "grave"), others = shuffle(st.items.filter(id => S.items[id].tk !== "grave"));
  const need = empty.length - graves.length;
  if (need < 0) return toast(tr("墳墓比空的河岸還多。", "More Graves than empty banks."));
  const chosen = shuffle([...graves, ...others.slice(0, need)]);
  commit(tr(`${who()} 準備了第${"一二三"[r]}河段的河岸板塊（${chosen.length} 塊，墳墓 ${graves.length}）`, `${who()} laid out Reach ${r + 1}'s bank tiles (${chosen.length}, ${graves.length} Graves)`), () => {
    chosen.forEach((id, i) => { const pt = snapPos(empty[i]); toTable(id, pt.x, pt.y); S.items[id].face = 0; });
    others.slice(need).forEach(id => { S.items[id].face = 0; toStack(id, "box"); });
  });
}

// ---------------------------------------------------------------- snap points (built with the boards)
// the Loom's knot track: 0-10 (10 is the solo threshold without Scars, the most any mode needs)
const KNOTS = 10, KX0 = 146, KP = 44, KW = 42;
// the Ledger's forgotten track: 0-14 (the Gentle Faded limit is 14), beside the Light and Fracture tracks
const FORGOT_MAX = 14, FX0 = 420, FP = 38, FW = 36, FY = 262;
const loomStart = players => D.thresholds(0, players)[0];   // where the Scar marker starts: 7 (2-4 players) or 10 (solo)
let SNAPS = [];
const snapById = {};
function snapPos(id) { const s = snapById[id]; return s ? { x: s.x + s.w / 2, y: s.y + s.h / 2 } : null; }
function snap(id, x, y, w, h, accept, label) { const s = { id, x, y, w, h, accept, label }; SNAPS.push(s); snapById[id] = s; return s; }

function buildSnaps(players) {
  SNAPS = [];
  for (const k in snapById) delete snapById[k];
  const R = RIVER;
  for (let sp = 0; sp <= 14; sp++) {
    const g = spaceGeo(sp);
    if (sp >= 1 && sp <= 13) {
      snap(`bank${sp}L`, g.left.x, g.left.y, R.bank, R.bank, ["tile", "tok"]);
      snap(`bank${sp}R`, g.right.x, g.right.y, R.bank, R.bank, ["tile", "tok"]);
    }
    const third = g.laneW / 3;   // three spots in each space of the river: left, centre (the soul), right
    snap(`laneL${sp}`, g.x, g.laneY + 2, third, R.lane - 4, ["tok"]);
    snap(`soul${sp}`, g.x + third, g.laneY + 2, third, R.lane - 4, ["tok"]);
    snap(`water${sp}`, g.x + 2 * third, g.laneY + 2, third, R.lane - 4, ["tok"]);
  }
  // mist front
  snap("mistfront", MISTA.x + 20 + 3 * PG, MISTA.y + 60, SW, SH, ["card"]);
  // loom
  for (let t = 0; t < 3; t++) {
    const y = LOOM.y + 60 + t * 88;
    for (let k = 0; k <= KNOTS; k++) snap(`knot${t}_${k}`, LOOM.x + KX0 + k * KP, y, KW, 40, []);
    // the Scar marker sits on the knot cell that is the threshold: start, start-1, start-2 for 0, 1, 2 Scars
    for (let k = 0; k <= 2; k++) snap(`scar${t}_${k}`, LOOM.x + KX0 + (loomStart(players) - k) * KP, y, KW, 40, []);
    snap(`echo${t}`, LOOM.x + 90, y - 4, 50, 48, ["tok"]);
  }
  snap("echoS", LOOM.x + 16, LOOM.y + 320, 56, 56, ["tok"]);
  // ledger
  for (let k = 0; k <= 12; k++) snap(`light${k}`, LEDGER.x + 420 + k * 44, LEDGER.y + 62, 42, 42, []);
  for (let k = 0; k <= 5; k++) snap(`crack${k}`, LEDGER.x + 420 + k * 56, LEDGER.y + 160, 50, 50, []);
  for (let k = 0; k < 7; k++) snap(`bwsup${k}`, LEDGER.x + 20 + k * 56, LEDGER.y + 262, 54, 54, ["tok"]);
  for (let k = 0; k <= FORGOT_MAX; k++) snap(`forgot${k}`, LEDGER.x + FX0 + k * FP, LEDGER.y + FY, FW, FW, []);
  // mantle row, fate slots
  // the Mantle row sits along the top of the supply panel
  D.MANTLES.forEach((_, i) => snap(`mantle${i}`, SUPPLY.x + 20 + i * PG, SUPPLY.y + 56, SW, SH, ["card"]));
  for (let k = 0; k < 2; k++) snap(`fateslot${k}`, FATE.x + 20 + (k + 1) * PG, FATE.y + 60, SW, SH, ["card"]);
  // book nodes
  for (let ch = 0; ch < 3; ch++) for (const n of bookLayout(S.soul, ch)) {
    if (n.k === "m" || n.k === "g") snap(`node${ch}_${n.id}`, n.x, n.y, CW + 8, CH + 8, ["card"]);
    if (n.k === "x") snap(`node${ch}_${n.id}`, n.x, n.y, CW + 8, CH + 8, ["card"]);
    if (n.k === "f") snap(`node${ch}_${n.id}`, n.x, n.y, CW + 8, CH + 8, ["card"]);
  }
}

// ---------------------------------------------------------------- the book: route graph layout
const layoutCache = {};
function bookLayout(soul, ch) {
  const key = soul + ch + LANG + "@" + BOOK.x + "," + BOOK.y;
  if (layoutCache[key]) return layoutCache[key];
  const page = story(soul).chapters[ch];
  const byId = Object.fromEntries(page.nodes.map(n => [n.id, n]));
  const nexts = n => (Array.isArray(n.next) ? n.next : n.next ? Object.values(n.next) : []);
  const depth = {};
  const roots = Object.keys(page.starts || {}).length ? [...new Set(Object.values(page.starts))] : [page.nodes[0].id];
  const visit = (id, d) => { if (depth[id] !== undefined && depth[id] >= d) return; depth[id] = d; for (const m of nexts(byId[id])) visit(m, d + 1); };
  roots.forEach(r => visit(r, 0));
  const cols = {};
  for (const n of page.nodes) (cols[depth[n.id] ?? 0] ||= []).push(n);
  const ncol = Math.max(...Object.keys(cols).map(Number)) + 1;
  const px = BOOK.x, py = BOOK.y;   // one open page at a time: every chapter uses the same spot
  const colW = Math.min(250, (BOOK.w - 320) / ncol);   // the route spreads across the whole page
  const out = [];
  for (const [d, list] of Object.entries(cols)) {
    const rowH = (BOOK.h - 100) / list.length;
    list.forEach((n, i) => out.push({ ...n, x: px + 230 + d * colW, y: py + 70 + i * rowH + (rowH - CH - 8) / 2 }));
  }
  layoutCache[key] = out;
  return out;
}

// ---------------------------------------------------------------- card faces
function cardInfo(ck) {
  const [type, a, b, c] = ck.split(":");
  if (type === "mem") {
    const card = MEM[a];
    const th = D.THREADS[card.tag];
    const name = LANG === "en" ? card.name : zhName(card);
    const band = LANG === "en" ? card.band : ZH_BANDS[card.id] || card.band;
    const slot = card.slot ? D.SLOT_NAMES[card.slot] : null;
    return { cls: `mem th${card.tag}${card.key ? " key" : ""}`, back: "back-memory", html: `
      <div class="c-top">${icon(th.icon)}<b>${esc(name)}</b>${card.key ? `<i class="keymark">${tr("關鍵", "Key")}</i>` : ""}</div>
      ${slot ? `<div class="c-slot">${icon(slot.icon)}${tr(slot.zh, slot.en)}</div>` : ""}
      ${band ? `<div class="c-band">「${esc(band)}」</div>` : ""}
      <div class="c-eff">${esc(opsLine(card.eff, LANG))}</div>
      <div class="c-res"><span>${tr("共鳴", "Resonance")}${card.rr ? tr("（改為）", " (instead)") : ""}</span>${esc(opsLine(card.res, LANG))}</div>`,
      title: name };
  }
  if (type === "mist" || type === "harsh") {
    const m = type === "mist" ? D.MIST_CARDS[a] : D.HARSH_CARDS.find(h => h.key === a);
    const th = m.th === null ? null : D.THREADS[m.th];
    const backHtml = `<div class="mback">${th ? icon(th.icon) : "◇"}<b>${m.fog}</b><small>${tr("霧勢", "fog")}</small></div>`;
    return { cls: `mist${type === "harsh" ? " harsh" : ""} th${m.th ?? 3}`, back: "back-mist", backHtml, html: `
      <div class="c-top">${th ? icon(th.icon) : ""}<b>${esc(tr(m.zh, m.en))}</b></div>
      <div class="c-fog">${tr("霧勢", "Fog")} <b>${m.fog}</b>${type === "harsh" ? `<i>${tr("凶霧", "Harsh")}</i>` : ""}</div>
      <div class="c-eff">${esc(tr(m.tz, m.te))}</div>`, title: tr(m.zh, m.en) };
  }
  if (type === "fate") {
    const f = story(a).chapters[+b].fates[+c];
    const th = D.THREADS[f.thread];
    return { cls: `fate th${f.thread}`, html: `
      <div class="c-top">${icon(th.icon)}<b>${esc(f.name)}</b></div>
      <div class="c-band">${esc(f.event)}</div>
      <div class="c-eff">${f.effects.map(esc).join("<br>")}</div>
      <div class="c-res"><span>${tr("分岔指向", "Points to")}</span>${tr(th.zh, th.en)}</div>`,
      backHtml: `<div class="fback"><small>${f.river ? tr("河流條件", "River") : tr("書上條件", "Book")}・${tr("第" + "一二三"[+b] + "章", "Ch " + (+b + 1))}</small>
        <div class="c-cond">${esc(f.cond)}</div><div class="c-omen">${esc(f.omen)}</div></div>`, title: f.name };
  }
  if (type === "comm") {
    const k = story(a).commissions[+b];
    return { cls: "comm", html: `<div class="c-top"><b>${tr("託付", "Commission")}</b></div><div class="c-band">${esc(k.text)}</div><div class="c-eff">${esc(k.cond)}</div>`,
      backHtml: `<div class="gback">${tr("託付", "Commission")}</div>`, title: tr("託付卡", "Commission") };
  }
  if (type === "end") {
    const s = story(a);
    const e = b === "hidden" ? s.hidden : s.endings[b];
    const label = b === "hidden" ? tr("隱藏結局", "Hidden ending") : b === "mix" ? tr("交織", "Interwoven") : tr(D.THREADS[+b].zh, D.THREADS[+b].en);
    return { cls: "ending", html: `<div class="c-top"><b>${esc(e.title)}</b></div><div class="c-slot">${label}</div><div class="c-band small">${esc(e.text)}</div>`,
      backHtml: `<div class="gback">${tr("結局", "Ending")}${b === "hidden" ? `<div class="c-cond">${s.hidden.conds.map(esc).join("<br>")}</div>` : `<small>${label}</small>`}</div>`, title: e.title };
  }
  if (type === "soul") {
    const s = story(a);
    return { cls: "soulc", art: D.SOUL_ART[a], html: `<div class="c-top"><b>${esc(soulName(a))}</b></div><div class="c-eff">${esc(soulTrait(a))}</div>${s.keymem ? `<div class="c-res"><span>${tr("關鍵記憶", "Key memory")}</span>${esc(s.keymem)}</div>` : ""}`, back: "back-soul", title: soulName(a) };
  }
  if (type === "mantle") {
    const m = D.MANTLES.find(x => x.key === a), th = D.THREADS[m.th];
    return { cls: `mantle th${m.th}`, html: `<div class="c-top">${icon(th.icon)}<b>${esc(tr(m.zh, m.en))}</b></div><div class="c-slot">${tr("稱號", "Mantle")}</div><div class="c-eff">${esc(tr(m.tz, m.te))}</div>`,
      backHtml: `<div class="gback">${tr("已使用", "Spent")}</div>`, title: tr(m.zh, m.en) };
  }
  if (type === "ghost") {
    const g = D.GHOST[+a], th = D.THREADS[g.th];
    return { cls: `ghost th${g.th}`, html: `<div class="c-top">${icon(th.icon)}<b>${tr("幽靈", "Ghost")}</b></div><div class="c-eff">${esc(tr(g.zh, g.en))}</div>`, back: "back-ghost", title: tr("幽靈牌", "Ghost") };
  }
  return { cls: "", html: esc(ck), title: ck };
}

const TOKENS = {
  root: f => ({ cls: f ? "tk bloom" : "tk root", ic: f ? "nb-bloom" : "nb-root", t: f ? tr("花", "Bloom") : tr("根", "Root") }),
  shade: () => ({ cls: "tk shade", ic: "nb-grievance", t: tr("怨念", "Shade") }),
  fog: () => ({ cls: "tk fogm", ic: "nb-fog", t: tr("霧", "Fog") }),
  crack: () => ({ cls: "tk crack", ic: "nb-fracture", t: tr("裂痕", "Fracture") }),
  bw: () => ({ cls: "tk bw", ic: "nb-blackwater", t: tr("黑水", "Black Water") }),
  soul: () => ({ cls: "tk soulp", ic: "nb-soul", t: tr("亡魂", "Soul") }),
  light: () => ({ cls: "tk lightm", ic: "nb-rays", t: tr("光", "Light") }),
  echo: () => ({ cls: "tk echom", ic: "nb-echo", t: tr("迴響", "Echo") }),
  hold: () => ({ cls: "tk misc", ic: "nb-tok-hold", t: tr("堅守", "Hold Fast") }),
  shield: () => ({ cls: "tk misc", ic: "nb-tok-shield", t: tr("護盾", "Shield") }),
  resign: () => ({ cls: "tk misc", ic: "nb-tok-resign", t: tr("認命", "Resignation") }),
  oar: () => ({ cls: "tk oar", ic: "nb-tok-oar", t: tr("船槳", "Oar") }),
  push: f => ({ cls: f ? "tk push" : "tk push used", ic: "nb-tok-push", t: f ? tr("破浪", "Push Through") : tr("破浪（已用）", "Push Through (used)") }),
};
for (let t = 0; t < 3; t++) {
  TOKENS["knot" + t] = () => ({ cls: `tk knotm th${t}`, ic: "nb-knot", t: tr(`結（${D.THREADS[t].zh}）`, `Knot (${D.THREADS[t].en})`) });
  TOKENS["scar" + t] = () => ({ cls: `tk scarm th${t}`, ic: "nb-fracture", t: tr(`傷疤（${D.THREADS[t].zh}）`, `Scar (${D.THREADS[t].en})`) });
}
function itemHtml(it, hidden) {
  if (it.kind === "card") {
    const info = cardInfo(it.ck);
    if (!it.face || hidden) {
      const art = info.back ? `style="background-image:url(/assets/art/${info.back}.webp)"` : "";
      return { cls: `card back ${info.cls}`, html: `<div class="cback" ${art}>${info.backHtml || ""}</div>`, title: tr("牌背", "Back") };
    }
    const art = info.art ? `<div class="c-art" style="background-image:url(/assets/art/${info.art}.webp)"></div>` : "";
    const band = !info.art && bandArt(it);
    return { cls: `card ${info.cls}${band ? " withart" : ""}`, html: (band ? `<div class="c-bandart" style="background-image:url(${ART(band)})"></div>` : "") + art + info.html, title: info.title };
  }
  if (it.kind === "tile") {
    const k = D.TILE_KINDS[it.tk];
    if (!it.face) return { cls: "tile fogside", html: `${icon("nb-fog")}`, title: tr("霧面板塊", "Fog-side tile") };
    const paint = BANK_ART[it.tk] ? ` style="background-image:linear-gradient(rgba(14,12,10,.38),rgba(14,12,10,.72)),url(${ART(BANK_ART[it.tk])})"` : "";
    return { cls: `tile t-${it.tk}${paint ? " painted" : ""}`, html: `<div class="tpaint"${paint}></div>${icon(k.icon)}<b>${esc(tr(k.zh, k.en))}</b><small>${esc(tr(k.tz, k.te))}</small>`, title: tr(k.zh, k.en) };
  }
  const t = TOKENS[it.tk](it.face);
  return { cls: t.cls, html: icon(t.ic), title: t.t };
}

// ---------------------------------------------------------------- DOM
let elWorld, elTable, elHand, elHint, elMenu, elSeats;
const els = {};          // item id -> element
const stackEls = {};
let view = { x: 0, y: 0, s: 0.6, r: 0 };

function boardsHtml() {
  const R = RIVER, soul = S.soul;
  const lv = D.LEVELS[S.level];
  let h = "";
  // river: a square board, three rows of five spaces joined by two turns
  h += `<div class="board river" data-region="river" style="left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px">${zoomBtn("river")}`;
  let water = "";
  for (let row = 0; row < 3; row++) {
    const g0 = spaceGeo(row * 5), y = (g0.laneY - R.y + R.lane / 2) * STR.ky;
    const x0 = (R.m + g0.laneW / 2) * STR.kx - g0.laneW / 2 - 6, x1 = (R.m + 4 * R.colW + g0.laneW / 2) * STR.kx + g0.laneW / 2 + 6;
    water += `<path d="M${x0},${y} H${x1}"/>`;
    if (row < 2) {   // the turn: down the right side after row 0, down the left side after row 1
      const y2 = (spaceGeo((row + 1) * 5).laneY - R.y + R.lane / 2) * STR.ky;
      const xe = row === 0 ? x1 : x0;
      const bulge = row === 0 ? 40 : -30;
      water += `<path d="M${xe},${y} C${xe + bulge},${y} ${xe + bulge},${y2} ${xe},${y2}"/>`;
    }
  }
  h += `<svg class="riverwater" width="${R.w * STR.kx}" height="${R.h * STR.ky}"><g class="wbase">${water}</g><g class="wsheen">${water}</g></svg>`;
  for (let sp = 0; sp <= 14; sp++) {
    const g = spaceGeo(sp);
    const reach = sp <= 4 ? 0 : sp <= 8 ? 1 : 2;
    const lx = g.x - R.x, ly = g.laneY - R.y;
    h += `<div class="lane reach${reach}${sp === 0 || sp === 14 ? " shore" : ""}" style="left:${lx}px;top:${ly}px;width:${g.laneW}px;height:${R.lane}px">
      <span class="spn">${sp === 0 ? tr("此岸 0", "Near 0") : sp === 14 ? tr("彼岸 14", "Far 14") : sp}</span><span class="flow">${g.east ? "→" : "←"}</span>
      ${sp === 5 ? `<span class="hintmark">${tr("故事應該寫到第二章", "Story: ch. 2")}</span>` : ""}
      ${sp === 9 ? `<span class="hintmark">${tr("故事應該寫到第三章", "Story: ch. 3")}</span>` : ""}
      ${sp === 13 ? `<span class="gate">${tr("彼岸的門", "Gate")}</span>` : ""}</div>`;
    if (sp >= 1 && sp <= 13) for (const side of ["left", "right"]) {
      const b = g[side];
      h += `<div class="bankslot" style="left:${b.x - R.x}px;top:${b.y - R.y}px;width:${R.bank}px;height:${R.bank}px"><i>${side === "left" ? tr("左", "L") : tr("右", "R")}</i></div>`;
    }
  }
  h += [[1, 0], [5, 1], [10, 2]].map(([sp, r]) => { const g = spaceGeo(sp); return `<div class="reachname" style="left:${g.x - R.x}px;top:${g.top - R.y - 30}px">${tr(`第${"一二三"[r]}河段・${D.REACHES[r].zh}`, `Reach ${r + 1} · ${D.REACHES[r].en}`)}${r === 1 ? tr("（第 5–8 格）", " (5–8)") : r === 2 ? tr("（第 9–13 格）", " (9–13)") : ""}</div>`; }).join("");
  h += `</div>`;
  // mist area
  h += `<div class="board mista" data-region="mist" style="left:${MISTA.x}px;top:${MISTA.y}px;width:${MISTA.w}px;height:${MISTA.h}px">${zoomBtn("mist")}
    <div class="btitle">${tr("迷霧", "Mist")}</div><div class="slotlab" style="left:${20 + 3 * PG - 4}px;top:41px;width:${SW + 8}px">${tr("前方的霧（面朝上）", "Mist ahead (face up)")}</div><div class="slotbox" style="left:${20 + 3 * PG}px;top:60px;width:${SW}px;height:${SH}px"></div></div>`;
  // loom
  const th = D.thresholds(S.level, S.players);
  h += `<div class="board loom" data-region="loom" style="left:${LOOM.x}px;top:${LOOM.y}px;width:${LOOM.w}px;height:${LOOM.h}px">${zoomBtn("loom")}
    <div class="btitle">${tr("命運織機", "Loom of the Fates")}</div>
    <div class="lab" style="left:92px;top:36px">${tr("迴響", "Echo")}</div><div class="lab" style="left:146px;top:36px">${tr("結", "Knots")}</div>
    <div class="lab" style="left:${KX0 + KNOTS * KP + KW + 18}px;top:36px">${tr("反噬（第一／二／三級）", "Backlash (I / II / III)")}</div>`;
  for (let t = 0; t < 3; t++) {
    const y = 60 + t * 88;
    h += `<div class="thread th${t}" style="top:${y}px">${icon(D.THREADS[t].icon)}${tr(D.THREADS[t].zh, D.THREADS[t].en)}</div>`;
    h += `<div class="echoslot th${t}" style="left:90px;top:${y - 4}px" title="${tr("迴響停在這條絲線時，把迴響標記放在這裡", "Put the Echo token here when the Echo is on this thread")}">${tr("迴響", "Echo")}</div>`;
    h += `<div class="groove" style="left:${KX0}px;top:${y + 17}px;width:${KNOTS * KP + KW}px"></div>`;
    // Both sets of threshold cells are printed, as on the board, each in its own colour and with its Scar count:
    // 7 / 6 / 5 for 2-4 players (pale red), 10 / 9 / 8 solo (pale teal). The Scar marker stands on one of them.
    for (const [grp, start, label] of [["multi", 7, tr("2–4 人", "2–4 players")], ["solo", 10, tr("單人", "Solo")]])
      h += `<div class="scargrp ${grp}" style="left:${KX0 + (start - 2) * KP}px;top:${y - 15}px;width:${2 * KP + KW}px">${label}</div>`;
    for (let k = 0; k <= KNOTS; k++) {
      const multi = k >= 5 && k <= 7, solos = k >= 8, sc = multi ? 7 - k : solos ? 10 - k : -1;
      h += `<div class="cell tcell${sc >= 0 ? ` scarcell ${solos ? "solo" : "multi"}` : ""}" data-track="knot${t}" data-val="${k}" style="left:${KX0 + k * KP}px;top:${y}px;width:${KW}px"${sc >= 0 ? ` title="${tr(`${solos ? "單人" : "2–4 人"}・${sc} 道傷疤：門檻 ${k}，打滿時第${"一二三"[sc]}級反噬`, `${solos ? "Solo" : "2–4 players"} · ${sc} Scar${sc === 1 ? "" : "s"}: threshold ${k}, Backlash level ${"I II III".split(" ")[sc]}`)}"` : ""}>${sc >= 0 ? `<em class="sc">${tr(`傷疤${sc}`, `Scar ${sc}`)}</em>` : ""}${k}</div>`;
    }
    h += `<div class="blash" style="left:${KX0 + KNOTS * KP + KW + 18}px;top:${y - 4}px">${D.BACKLASH[t].map((s, i) => `<div><b>${"ⅠⅡⅢ"[i]}</b>${esc(tr(s, D.BACKLASH_EN[t][i]))}</div>`).join("")}</div>`;
  }
  h += `<div class="echoslot silent" style="left:16px;top:320px">${tr("沉默", "Silent")}</div>
    <div class="note" style="left:96px;top:336px">${tr(`傷疤標記放在有顏色的格子：<b class="k-multi">紅色</b> 2–4 人（7／6／5）、<b class="k-solo">藍綠色</b> 單人（10／9／8）。這局從 ${th[0]} 開始，每道傷疤往左一格；結標記追上傷疤標記就打滿。霧痕：同絲線反噬升一級。`, `The Scar marker goes on a coloured cell: <b class="k-multi">red</b> 2–4 players (7 / 6 / 5), <b class="k-solo">teal</b> solo (10 / 9 / 8). This game it starts on ${th[0]} and moves one cell left for each Scar; a thread is full when its knot marker reaches the Scar marker. Mist scars raise that thread's Backlash one level.`)}</div></div>`;
  // book: one open page; tabs flip through the chapters
  h += `<div class="board bookp" data-region="book" id="tt-book" style="left:${BOOK.x}px;top:${BOOK.y}px;width:${BOOK.w}px;height:${BOOK.h}px"></div>`;
  // ledger
  h += `<div class="board ledger" data-region="ledger" style="left:${LEDGER.x}px;top:${LEDGER.y}px;width:${LEDGER.w}px;height:${LEDGER.h}px">${zoomBtn("ledger")}
    <div class="btitle">${tr("渡帳", "Ledger")}</div>
    <div class="lab" style="left:420px;top:38px">${icon("nb-rays")} ${tr("光（推動或點選格子）", "Light (push the marker or click a cell)")}</div>
    <div class="groove" style="left:420px;top:80px;width:${12 * 44 + 42}px"></div>`;
  for (let k = 0; k <= 12; k++) h += `<div class="cell round tcell" data-track="light" data-val="${k}" style="left:${420 + k * 44}px;top:62px;width:42px;height:42px">${k}</div>`;
  h += `<div class="lab" style="left:420px;top:136px">${tr(`裂痕（${lv.fractures} 道破碎）`, `Fractures (${lv.fractures} = Shattered)`)}</div>
    <div class="groove" style="left:420px;top:182px;width:${lv.fractures * 56 + 50}px"></div>`;
  for (let k = 0; k <= lv.fractures; k++) h += `<div class="cell round tcell crack${k === lv.fractures ? " lim" : ""}" data-track="crack" data-val="${k}" style="left:${420 + k * 56}px;top:160px;width:50px;height:50px">${k === lv.fractures ? tr("碎", "✕") : k}</div>`;
  h += `<div class="lab" style="left:20px;top:238px">${tr(`黑水供應：放 ${lv.bw} 個（其餘放回盒中）`, `Black Water supply: put ${lv.bw} here (the rest go in the Box)`)}</div>`;
  for (let k = 0; k < lv.bw; k++) h += `<div class="cell round" style="left:${20 + k * 56}px;top:262px;width:54px;height:54px"></div>`;
  // the forgotten track: the players move its marker as cards are forgotten (like Light and Fractures)
  h += `<div class="lab" style="left:${FX0}px;top:238px">${tr(`遺忘（推動標記或點選格子；${lv.dissolve} 張消散）`, `Forgotten (push the marker or click a cell; Faded at ${lv.dissolve})`)}</div>
    <div class="groove" style="left:${FX0}px;top:${FY + FW / 2 - 1}px;width:${FORGOT_MAX * FP + FW}px"></div>`;
  for (let k = 0; k <= FORGOT_MAX; k++) {
    const tag = k === lv.dissolve ? "lim" : k === 6 || k === 9 ? "drift" : [3, 5, 7].includes(k) ? "pull" : "";
    h += `<div class="cell fcell tcell ${tag}${k > lv.dissolve ? " past" : ""}" data-track="forgot" data-val="${k}" style="left:${FX0 + k * FP}px;top:${FY}px;width:${FW}px;height:${FW}px">${k === lv.dissolve ? tr("散", "✕") : k}</div>`;
  }
  h += `<div class="note fkey" style="left:${FX0}px;top:${FY + FW + 8}px;right:16px">${tr(`<b class="k-drift">6</b> 輕如灰燼、<b class="k-drift">9</b> 漂離；<b class="k-pull">${PULL.join("／")}</b> 第一／二／三章的忘川的拉力；<b class="k-lim">${lv.dissolve}</b> 消散。`, `<b class="k-drift">6</b> Light as Ash, <b class="k-drift">9</b> Adrift; <b class="k-pull">${PULL.join(" / ")}</b> the Pull of Lethe in chapters 1 / 2 / 3; <b class="k-lim">${lv.dissolve}</b> Faded.`)}</div></div>`;
  // fate area
  h += `<div class="board fatea" data-region="fate" style="left:${FATE.x}px;top:${FATE.y}px;width:${FATE.w}px;height:${FATE.h}px">${zoomBtn("fate")}
    <div class="btitle">${tr("亡魂・命運之霧・託付", "Soul · Fate · Commissions")}</div>
    ${[0, 1].map(k => `<div class="slotbox" style="left:${20 + (k + 1) * PG}px;top:60px;width:${SW}px;height:${SH}px">${tr(`本章的命運之霧 ${k + 1}（條件面朝上）`, `This chapter's fate ${k + 1} (condition up)`)}</div>`).join("")}
    <div class="slotbox soulslot" style="left:20px;top:60px;width:${SW}px;height:${SH}px">${tr("亡魂牌", "Soul card")}</div></div>`;
  // supply
  h += `<div class="board supply" data-region="supply" style="left:${SUPPLY.x}px;top:${SUPPLY.y}px;width:${SUPPLY.w}px;height:${SUPPLY.h}px">${zoomBtn("supply")}<div class="btitle">${tr("稱號列與供應區", "Mantles and supply")}</div>
    ${D.MANTLES.map((_, i) => `<div class="slotbox" style="left:${20 + i * PG}px;top:56px;width:${SW}px;height:${SH}px">${tr("稱號", "Mantle")}</div>`).join("")}
    <div class="lab" style="left:740px;top:60px;white-space:normal;width:240px">${tr("供應區在下方：拖曳拿取，拖回放回。", "The supply is below: drag to take, drag back to return.")}</div></div>`;
  // the set-up strip
  h += `<div class="board setupa" data-region="setup" style="left:${SETUPA.x}px;top:${SETUPA.y}px;width:${SETUPA.w}px;height:${SETUPA.h}px">${zoomBtn("setup")}<div class="btitle">${tr("準備區", "Set-up")}</div>
    <div class="note setupnote">${tr("開局時用。打開「下一步提示」一步步帶你準備，或按「自動準備」。", "For the start of a game. Turn on the hints to be walked through it, or press Auto Setup.")}</div></div>`;
  // each player's front at the edge of the table
  MATS.forEach((m, p) => {
    if (!m) return;
    const sl = matSlots(p), rel = q => ({ l: q.x - m.x, t: q.y - m.y });
    const box = (q, w, h, label, cls = "") => `<div class="slotbox ${cls}" style="left:${rel(q).l - w / 2}px;top:${rel(q).t - h / 2}px;width:${w}px;height:${h}px">${label}</div>`;
    h += `<div class="board mat${m.v ? " vert" : ""}" data-region="mat${p}" style="left:${m.x}px;top:${m.y}px;width:${m.w}px;height:${m.h}px">${zoomBtn(`mat${p}`)}
      <div class="btitle">${esc(S.names[p] || tr(`擺渡人 ${p + 1}`, `Ferryman ${p + 1}`))}<span class="matseat">${p === 0 ? tr("（起始玩家）", "(first player)") : ""}</span></div>
      <div class="matfan" data-fan="${p}" style="left:${sl.fan.x - m.x}px;top:${sl.fan.y - m.y}px;width:${sl.fan.w}px;height:${sl.fan.h}px"></div>
      ${box(sl.comm, SW, SH, tr("託付", "Commission"))}${box(sl.mantle, SW, SH, tr("稱號", "Mantle"))}${box(sl.push, 66, 66, tr("破浪", "Push"), "round")}${box(sl.oar, 66, 66, tr("船槳", "Oar"), "round")}
      ${sl.lasting.map((q, i) => box(q, SW, SH, i ? "" : tr("持續中的牌", "Lasting cards"), "lastslot")).join("")}</div>`;
  });
  // play area in front of the River (cards being played)
  h += `<div class="board playarea" data-region="play" style="left:${PLAY.x}px;top:${PLAY.y}px;width:${PLAY.w}px;height:${PLAY.h}px">${zoomBtn("play")}<div class="btitle">${tr("出牌區", "Play area")}</div>
    <div class="note playnote">${tr("你打出的牌先放在這裡，讓大家看清楚再執行效果。執行完：銘刻的牌放上書頁；沒銘刻的執念、釋懷牌放入棄牌堆，忘卻牌放入遺忘堆。翻開的命運之霧、託付卡也可以先放在這裡朗讀。",
      "Put the card you play here so everyone can read it before you carry it out. Then: an inscribed card goes onto the page; otherwise Obsession and Acceptance cards go to the discard pile and Oblivion cards to the forgotten pile. Revealed fate cards and commissions can sit here while they are read aloud.")}</div></div>`;
  h += `<div class="board boxa" data-region="box" style="left:${BOXA.x}px;top:${BOXA.y}px;width:${BOXA.w}px;height:${BOXA.h}px">${zoomBtn("box")}<div class="btitle">${tr("盒中（移出遊戲）", "The Box (out of the game)")}</div>
    <div class="note" style="left:16px;right:16px;top:40px">${tr("移出遊戲的牌、板塊與指示物都拖到這裡。右鍵「查看與搜尋」可以拿回來。", "Drag anything removed from the game here. Right-click, “Look through”, to take something back.")}</div></div>`;
  return h;
}

function bookPageHtml(ch) {
  const page = story(S.soul).chapters[ch];
  const px = BOOK.x;
  const nodes = bookLayout(S.soul, ch);
  const pos = Object.fromEntries(nodes.map(n => [n.id, n]));
  const entry = typeof page.entry === "string" ? esc(page.entry) : Object.entries(page.entry).map(([t, s]) => `<b class="th${t}">${tr(D.THREADS[t].zh, D.THREADS[t].en)}</b> ${esc(s)}`).join("<br>");
  let lines = "";
  const ctr = n => [(n.x - px + 40) * STR.kx, (n.y - BOOK.y + 54) * STR.ky];   // a node's centre, spread with the stretch
  for (const n of nodes) {
    const nx = Array.isArray(n.next) ? n.next.map(id => [id, null]) : n.next ? Object.entries(n.next).map(([t, id]) => [id, +t]) : [];
    for (const [id, t] of nx) {
      if (!pos[id]) continue;
      const [x1, y1] = ctr(n), [x2, y2] = ctr(pos[id]);
      lines += `<path d="M${x1 + 30},${y1} C${(x1 + x2) / 2 + 10},${y1} ${(x1 + x2) / 2 - 10},${y2} ${x2 - 32},${y2}" class="ar${t === null ? "" : " th" + t}" marker-end="url(#arr)"/>`;
    }
  }
  const cells = nodes.map(n => {
    const l = n.x - px, t = n.y - BOOK.y;
    if (n.k === "m" || n.k === "g") {
      const sl = D.SLOT_NAMES[n.slot];
      return `<div class="node mem${n.k === "g" ? " gate" : ""}" style="left:${l}px;top:${t}px" title="${esc(n.text)}">
        <div class="nslot">${icon(sl.icon)}${tr(sl.zh, sl.en)}${n.k === "g" ? `<i>${tr("關口", "Gate")}</i>` : ""}</div><div class="ntext">${esc(n.text)}</div></div>`;
    }
    if (n.k === "x") return `<div class="node mistn" style="left:${l}px;top:${t}px" title="${esc(n.text)}"><div class="ntext">⬡ ${esc(n.text)}</div></div>`;
    if (n.k === "p") return `<div class="node fork" style="left:${l + 6}px;top:${t + 20}px" title="${esc(n.text)}"><span>◇</span><div class="ntext">${esc(n.text)}</div></div>`;
    if (n.k === "f") return `<div class="node turn" style="left:${l}px;top:${t}px"><span>◆</span><div class="ntext">${tr("轉折", "Turning point")}<br>${tr("忘川的拉力", "Pull")} ${PULL[ch]}</div></div>`;
    return `<div class="node exitn" style="left:${l}px;top:${t + 10}px" title="${esc(n.text)}"><div class="ntext">⬭ ${esc(n.text)}</div></div>`;
  }).join("");
  const tabs = story(S.soul).chapters.map((c, i) => `<button class="booktab${i === ch ? " on" : ""}" data-view="${i}">${S.chapter === i ? "★ " : ""}${tr(`第${"一二三"[i]}章`, `Chapter ${i + 1}`)}・${esc(c.title)}</button>`).join("");
  const here = S.chapter === ch
    ? `<span class="curnote">★ ${tr("目前的章節", "The chapter in play")}</span>`
    : `<button class="chbtn" data-ch="${ch}">${tr("把這章設為目前的章節（翻頁）", "Make this the chapter in play (turn the page)")}</button>`;
  return `${zoomBtn("book")}<div class="btitle">${tr("憶念之書", "Book of Remembrance")} <span class="booktabs">${tabs}</span> ${here}</div>
    ${S.chapter !== ch ? `<div class="browse">${tr("你正在翻閱其他章節；放在這頁的牌只會在這頁顯示。", "You are browsing another chapter; cards placed here only show on this page.")}</div>` : ""}
    <div class="entry">${entry}</div>
    <svg class="arrows" width="${BOOK.w * STR.kx}" height="${BOOK.h * STR.ky}"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#9a948c"/></marker></defs>${lines}</svg>
    ${cells}`;
}

let bookView = 0, lastChapter = 0;
function renderBook() {
  const el = $("#tt-book");
  if (!el) return;
  if (S.chapter !== lastChapter) { lastChapter = S.chapter; bookView = S.chapter; }
  const sig = `${bookView}|${S.chapter}|${LANG}|${STR.kx}|${STR.ky}`;
  if (el._sig === sig) return;
  el._sig = sig;
  el.innerHTML = bookPageHtml(bookView);
  stretchInside(el);
  el.style.backgroundImage = `linear-gradient(90deg,rgba(60,52,40,.1) 0,rgba(60,52,40,.5) 200px,rgba(52,46,36,.62) 300px),url(${ART((SOUL_PAINT[S.soul] || SOUL_PAINT.open)[bookView])})`;
  markZoom();
  el.classList.toggle("current", bookView === S.chapter);
  el.querySelectorAll(".booktab").forEach(b => b.onclick = () => { bookView = +b.dataset.view; render(); });
  el.querySelectorAll(".chbtn").forEach(b => b.onclick = () => commit(tr(`${who()} 把第${"一二三"[+b.dataset.ch]}章設為目前的章節`, `${who()} turned to chapter ${+b.dataset.ch + 1}`), () => { S.chapter = +b.dataset.ch; }));
}

// every board has a magnifier in its top-right corner: click it to fill the window with that board
function zoomTo(region) {
  const el = document.querySelector(`.board[data-region="${region}"]`);
  if (!el) return;
  let x = parseFloat(el.style.left), y = parseFloat(el.style.top), w = parseFloat(el.style.width), h = parseFloat(el.style.height);
  if (/rotate\((-?90)deg\)/.test(el.style.transform)) { x += (w - h) / 2; y += (h - w) / 2; [w, h] = [h, w]; }
  const r = $("#tt-view").getBoundingClientRect();
  view.r = 0;
  view.s = Math.min(2.6, Math.min(r.width / w, r.height / h) * 0.94);
  view.x = r.width / 2 - (x + w / 2) * view.s; view.y = r.height / 2 - (y + h / 2) * view.s;
  applyView();
  zoomed = region; markZoom();
}
let zoomed = null;
const zoomBtn = region => `<button class="zoombtn${zoomed === region ? " on" : ""}" data-zoom="${region}" title="${zoomed === region ? tr("回到全桌", "Back to the whole table") : tr("放大這一區", "Zoom to this section")}">${zoomed === region ? "✕" : "⌕"}</button>`;
function markZoom() {
  document.querySelectorAll(".zoombtn").forEach(b => {
    const on = b.dataset.zoom === zoomed;
    b.classList.toggle("on", on); b.textContent = on ? "✕" : "⌕";
    b.title = on ? tr("回到全桌", "Back to the whole table") : tr("放大這一區", "Zoom to this section");
  });
}

function buildTable() {
  const app = $("#app");
  app.innerHTML = `
    <div class="tt-bar">
      <span class="brand">${icon("nb-bloom")}${tr("彼岸花渡・桌面", "Netherbloom · Table")}</span>
      <span class="muted">${esc(soulName(S.soul))}・${tr(D.LEVELS[S.level].zh, D.LEVELS[S.level].en)}・${S.players}${tr(" 人", "p")}</span>
      <span id="tt-code" class="muted"></span>
      <span id="tt-watch" class="watchbadge hidden"></span>
      <button id="tt-switch" class="hidden" title="${tr("看其他正在進行的線上桌", "Watch another live table")}">${tr("切換牌桌", "Switch table")}</button>
      <span class="sp"></span>
      <span id="tt-vchips" class="vchips"></span>
      <button id="tt-mic" class="hidden" title="${tr("開或關你的麥克風（同桌的人都聽得到）", "Switch your microphone on or off (everyone at the table hears you)")}"></button>
      <button id="tt-sound" class="hidden" title="${tr("聽或不聽其他人的聲音", "Hear the others, or not")}"></button>
      <div id="tt-seats" class="seats"></div>
      <label class="switch"><input type="checkbox" id="tt-hints"> <span>${tr("下一步提示", "Next-step hints")}</span></label>
      <button id="tt-auto" title="${tr("照規則書的準備步驟自動擺好牌桌（有動畫）", "Set the table up by the rulebook's steps, animated")}">${tr("自動準備", "Auto Setup")}</button>
      <button id="tt-undo" title="Ctrl+Z">${tr("復原", "Undo")}</button>
      <button id="tt-redo" title="Ctrl+Y">${tr("重做", "Redo")}</button>
      <button id="tt-fit">${tr("全桌", "Fit")}</button>
      <button id="tt-rules">${tr("規則書", "Rulebook")}</button>
      <button id="tt-aid">${tr("玩家輔助卡", "Player Aid")}</button>
      <button id="tt-log">${tr("紀錄", "Log")}</button>
      <button id="tt-menu">${tr("選單", "Menu")}</button>
      <span class="tt-sep"></span>
      <a href="/admin" id="tt-dash" class="${isAdmin ? "" : "hidden"}"><button type="button" tabindex="-1">${tr("後台", "Dashboard")}</button></a>
      <button id="tt-lang">${LANG === "zh" ? "English" : "中文"}</button>
      <a href="/api/logout"><button type="button" tabindex="-1">${tr("登出", "Sign out")}</button></a>
    </div>
    <div class="tt-view" id="tt-view"><div class="tt-world" id="tt-world" style="width:${WORLD.w}px;height:${WORLD.h}px">
      <div class="felt" style="left:${BOUNDS.x}px;top:${BOUNDS.y}px;width:${BOUNDS.w}px;height:${BOUNDS.h}px"></div><div id="tt-boards"></div><div id="tt-items"></div></div></div>
    <div class="tt-hand" id="tt-hand">
      <section class="my-hand" id="tt-myhand"><div class="hand-title"></div><div class="hand-cards"></div></section>
    </div>
    <aside class="tt-hint hidden" id="tt-hint"></aside>
    <aside class="tt-drawer hidden" id="tt-drawer"></aside>
    <div class="tt-menu hidden" id="tt-ctx"></div>
    <div class="tt-cover hidden" id="tt-cover"></div>
    <div class="tt-modal hidden" id="tt-modal"></div>`;
  document.body.classList.add("on-table");
  elWorld = $("#tt-world"); elTable = $("#tt-items"); elHand = $("#tt-hand"); elHint = $("#tt-hint"); elMenu = $("#tt-ctx"); elSeats = $("#tt-seats");
  for (const k in els) delete els[k];
  for (const k in stackEls) delete stackEls[k];
  document.body.classList.toggle("solo-hand", S.players === 1);
  layoutWorld(S.players, ME);
  buildSnaps(S.players);
  $("#tt-world").style.width = WORLD.w + "px"; $("#tt-world").style.height = WORLD.h + "px";
  bookView = lastChapter = S.chapter;
  $("#tt-boards").innerHTML = boardsHtml();
  placeBoards();
  bindTable();
  if (mode !== "local") announceVoice();
  let hintsOn = false;
  try { hintsOn = localStorage.getItem("nb-hints") === "1"; } catch { /* */ }
  $("#tt-hints").checked = hintsOn;
  setHints(hintsOn, false);
  render();
}
// the hints are a narrow column docked on the right of the screen; the table and the hand make room for it
function setHints(on, save = true) {
  if (save) try { localStorage.setItem("nb-hints", on ? "1" : "0"); } catch { /* */ }
  $("#app").classList.toggle("hints-on", on);
  elHint.classList.toggle("hidden", !on);
  fit();
  renderHint();
  focusRegions();
}

// ---------------------------------------------------------------- render
function render() {
  if (!S) return;
  // items on the table
  const seen = new Set();
  for (const id in S.items) {
    if (S.where[id] !== "t") continue;
    const it = S.items[id];
    seen.add(id);
    let el = els[id];
    if (!el) { el = document.createElement("div"); elTable.appendChild(el); els[id] = el; }
    if (el.dataset.id !== id) { el.dataset.id = id; delete el.dataset.aid; el._sig = ""; }   // it may have just left a front
    const hidden = false;
    const sig = `${it.ck || it.tk}|${it.face}|${LANG}`;
    if (el._sig !== sig) {
      const r = itemHtml(it, hidden);
      el.className = "piece " + r.cls; el.innerHTML = r.html; el.title = r.title; el._sig = sig;
    }
    el.style.display = it.pg !== undefined && it.pg !== bookView ? "none" : "";
    const w = it.kind === "card" ? CW : it.kind === "tile" ? RIVER.bank - 6 : TK;
    const hgt = it.kind === "card" ? CH : it.kind === "tile" ? RIVER.bank - 6 : TK;
    el.style.width = w + "px"; el.style.height = hgt + "px";
    el.style.transform = tAt(it.x, it.y, w, hgt, it.rot);
    el.style.zIndex = it.kind === "tile" ? 2 + (it.z % 1000) : it.kind === "card" ? 1000 + it.z : 3000 + it.z;
    el.classList.toggle("unlit", it.kind === "card" && it.rot === 90);
    // a card in the Play area shows who played it
    const inPlay = it.by !== undefined && it.x > PLAY.x && it.x < PLAY.x + PLAY.w && it.y > PLAY.y && it.y < PLAY.y + PLAY.h;
    el.dataset.by = inPlay ? (S.names[it.by] || "") : "";
  }
  S.areas ||= S.hands.map(() => []);
  S.areas.forEach((_, q) => {
    const places = areaPlaces(q);
    for (const id of S.areas[q]) {
      const it = S.items[id], pos = places[id];
      if (!it || !pos) continue;
      seen.add(id);
      let el = els[id];
      if (!el) { el = document.createElement("div"); elTable.appendChild(el); els[id] = el; }
      delete el.dataset.id; el.dataset.aid = id;
      // a commission shows its face only to its owner (and to everyone once it is revealed)
      const hidden = it.ck?.startsWith("comm:") && q !== ME && !it.face;
      const sig = `${it.ck || it.tk}|${it.face}|${hidden}|${q === ME}|${LANG}`;
      if (el._sig !== sig) {
        const r = itemHtml(hidden ? { ...it, face: 0 } : it.ck?.startsWith("comm:") ? { ...it, face: 1 } : it);
        el.className = `piece inmat ${r.cls}${q === ME ? "" : " locked"}`; el.innerHTML = r.html + (it.ck?.startsWith("comm:") && q === ME && !it.face ? `<i class="alabel">${tr("面朝下", "face down")}</i>` : "");
        el.title = q === ME ? r.title : hidden ? tr(`${S.names[q]} 的託付`, `${S.names[q]}'s commission`) : r.title; el._sig = sig;
      }
      const w = it.kind === "card" ? CW : TK, hgt = it.kind === "card" ? CH : TK;
      el.style.width = w + "px"; el.style.height = hgt + "px"; el.style.display = "";
      if (drag?.id !== id) el.style.transform = tAt(pos.x, pos.y, w, hgt);
      el.style.zIndex = 1500;
    }
  });
  document.querySelectorAll("[data-fan]").forEach(f => {
    const q = +f.dataset.fan, n = S.hands[q]?.length || 0;
    const sig = `${n}|${LANG}`;
    if (f._sig === sig) return;
    f._sig = sig;
    f.innerHTML = `<div class="fanlab">${tr(`手牌 ${n} 張`, `${n} cards in hand`)}</div>` + Array.from({ length: n }, (_, i) => `<div class="fanback" style="left:${20 + i * Math.min(38, 200 / Math.max(1, n))}px;transform:rotate(${(i - (n - 1) / 2) * 5}deg)"></div>`).join("");
  });
  for (const id in els) if (!seen.has(id)) { els[id].remove(); delete els[id]; }
  // stacks
  for (const sid in S.stacks) {
    const st = S.stacks[sid];
    let el = stackEls[sid];
    if (!el) {
      el = document.createElement("div"); el.className = "stack" + (st.small ? " small" : "") + (st.bin ? " bin" : "");
      el.dataset.stack = sid; elTable.appendChild(el); stackEls[sid] = el;
    }
    const top = st.items[st.items.length - 1];
    const it = top ? S.items[top] : null;
    const tokenBin = st.accepts.startsWith("tok");
    const w = st.big ? st.w * STR.kx : st.w || (tokenBin ? 92 : st.small ? 86 : CW + 8), h = st.big ? st.h * STR.ky : st.h || (tokenBin ? 92 : st.small ? 86 : CH + 8);
    const sc0 = C2D(st.x + (st.big ? st.w : w) / 2, st.y + (st.big ? st.h : h) / 2), sp = { x: sc0.x - w / 2, y: sc0.y - h / 2 };
    el.style.left = sp.x + "px"; el.style.top = sp.y + "px"; el.style.width = w + "px"; el.style.height = h + "px";
    const sig = `${top}|${it?.face}|${st.faceUp}|${st.items.length}|${LANG}`;
    if (el._sig !== sig) {
      let inner = "";
      if (it) {
        const r = itemHtml(it.kind === "card" ? { ...it, face: st.faceUp ? 1 : 0 } : { ...it, face: it.tk === "root" ? 0 : it.face });
        if (st.big) {   // the Box: the last thing put in, at its own size, in the middle
          const iw = it.kind === "card" ? CW : it.kind === "tile" ? RIVER.bank - 6 : TK, ih = it.kind === "card" ? CH : iw;
          inner = `<div class="piece ${r.cls}" style="position:absolute;left:${(w - iw) / 2}px;top:${(h - ih) / 2}px;width:${iw}px;height:${ih}px">${r.html}</div>`;
        } else inner = `<div class="piece ${r.cls}" style="position:absolute;left:4px;top:4px;width:${w - 8}px;height:${h - 8}px">${r.html}</div>`;
      }
      el.innerHTML = `${inner}<div class="slabel">${esc(tr(...st.label))}</div><div class="scount">${st.items.length}</div>`;
      el._sig = sig;
    }
  }
  renderTracks();
  // hand
  renderHand();
  // seats & counts
  // seats: the public part of each player's area (hand size, Mantle, whether Push Through is spent) is shown to all
  S.areas ||= S.hands.map(() => []);
  elSeats.innerHTML = S.names.map((n, i) => {
    const area = S.areas[i].map(id => S.items[id]);
    const mantles = area.filter(it => it.ck?.startsWith("mantle:")).map(it => cardInfo(it.ck).title);
    const push = area.find(it => it.tk === "push");
    const pushTxt = push ? (push.face ? tr("破浪可用", "Push Through ready") : tr("破浪已用", "Push Through spent")) : tr("破浪不在區域內", "Push Through not in the area");
    const tip = [`${tr("手牌", "Hand")} ${S.hands[i].length}`, ...mantles.map(m => tr("稱號：", "Mantle: ") + m), pushTxt].join(" · ");
    const off = mode !== "local" && S.online && !S.online[i];
    return `<button class="seat${i === ME ? " me" : ""}${off ? " offline" : ""}" data-seat="${i}" title="${esc(off ? tr("（不在線上）", "(not here) ") + tip : tip)}">${esc(n || tr(`擺渡人 ${i + 1}`, `Ferryman ${i + 1}`))} <b>${S.hands[i].length}</b>${mantles.map(m => `<i class="mbadge">${esc(m)}</i>`).join("")}${push && !push.face ? `<i class="pushused" title="${esc(pushTxt)}">${icon("nb-tok-push")}</i>` : ""}</button>`;
  }).join("");
  renderBook();
  renderHint();
  renderOnline();
}
// the watching badge, the voice buttons and who is talking (re-drawn whenever voice changes, too)
function renderOnline() {
  if (!onTable()) return;
  const online = mode !== "local";
  const wb = $("#tt-watch");
  wb.classList.toggle("hidden", !WATCH && !(watchHost && !WATCH));
  wb.textContent = WATCH ? tr(`觀戰中・從 ${S.names[ME] || ""} 的視角`, `Watching · from ${S.names[ME] || ""}'s side`) : tr(`代打 ${S.names[ME] || ""}`, `Playing for ${S.names[ME] || ""}`);
  $("#tt-switch").classList.toggle("hidden", !(WATCH && mode === "guest" && isAdmin));
  $("#tt-auto").disabled = WATCH || autoRunning; $("#tt-undo").disabled = $("#tt-redo").disabled = WATCH;
  const mb = $("#tt-mic"), sb = $("#tt-sound"), live = online && !!voice?.joined;
  mb.classList.toggle("hidden", !live); sb.classList.toggle("hidden", !live);
  mb.classList.toggle("on", !!voice?.micOn);
  mb.textContent = voice?.micOn ? tr("🎙 麥克風開", "🎙 Mic on") : tr("🎙 麥克風關", "🎙 Mic off");
  sb.classList.toggle("off", voice ? !voice.hearing : false);
  sb.textContent = voice && !voice.hearing ? tr("🔇 聲音關", "🔇 Sound off") : tr("🔊 聲音開", "🔊 Sound on");
  const members = voice ? voice.members() : [];
  document.querySelectorAll("#tt-seats [data-seat]").forEach(b => {
    const m = members.find(x => x.seat === +b.dataset.seat);
    b.classList.toggle("micon", !!m?.mic); b.classList.toggle("talking", !!m?.mic && voice.speaking(m.id));
  });
  // the people at the table without a seat (watchers), with their microphones
  $("#tt-vchips").innerHTML = members.filter(m => m.seat < 0).map(m => `<span class="vchip${m.mic && voice.speaking(m.id) ? " talking" : ""}" title="${esc(tr("觀戰者", "Watcher"))}">👁 ${esc(m.name)} ${m.mic ? "🎙" : "🔇"}</span>`).join("");
}

// ---------------------------------------------------------------- slider tracks
const TRACK_ICON = { light: ["nb-rays", "lightm"], crack: ["nb-fracture", "crack"], forgot: ["nb-oblivion", "forgotm"] };
const trackMax = id => (id === "light" ? 12 : id === "crack" ? D.LEVELS[S.level].fractures : id === "forgot" ? FORGOT_MAX : id.startsWith("scar") ? 2 : KNOTS);
const trackSnap = (id, v) => snapById[id.startsWith("knot") || id.startsWith("scar") ? `${id}_${v}` : `${id}${v}`];
const trackName = id => (id === "light" ? tr("光", "Light") : id === "crack" ? tr("裂痕", "Fractures") : id === "forgot" ? tr("遺忘", "Forgotten")
  : `${tr(id.startsWith("knot") ? "結" : "傷疤", id.startsWith("knot") ? "Knots" : "Scars")}（${tr(D.THREADS[+id.slice(-1)].zh, D.THREADS[+id.slice(-1)].en)}）`);
const markerEls = {};
function renderTracks() {
  S.tracks ||= { light: 0, crack: 0, knot0: 0, knot1: 0, knot2: 0, scar0: 0, scar1: 0, scar2: 0 };
  S.tracks.forgot ??= 0;   // tables saved before the forgotten track existed
  for (const id in S.tracks) {
    let el = markerEls[id];
    if (!el || !el.isConnected) {
      el = document.createElement("div");
      const [ic, cls] = TRACK_ICON[id] || (id.startsWith("knot") ? ["nb-knot", `knotm th${id.slice(-1)}`] : ["nb-fracture", `scarm th${id.slice(-1)}`]);
      el.className = `piece tk tmarker ${cls}`; el.dataset.track = id; el.innerHTML = icon(ic);
      elTable.appendChild(el); markerEls[id] = el;
    }
    if (drag?.track === id) continue;
    const sn = trackSnap(id, Math.min(S.tracks[id], trackMax(id)));
    if (!sn) continue;
    const sz = id.startsWith("scar") ? 40 : id === "forgot" ? 34 : TK;   // the Scar and forgotten markers fit inside their cells
    el.title = id.startsWith("scar") ? tr(`${trackName(id)}：${S.tracks[id]} 道（門檻 ${D.thresholds(S.level, S.players)[S.tracks[id]]}）`, `${trackName(id)}: ${S.tracks[id]} (threshold ${D.thresholds(S.level, S.players)[S.tracks[id]]})`) : `${trackName(id)}：${S.tracks[id]}`;
    el.style.width = el.style.height = sz + "px";
    el.style.transform = tAt(sn.x + sn.w / 2, sn.y + sn.h / 2, sz, sz);
    el.style.zIndex = 8000;
  }
}
function setTrack(id, v) {
  v = Math.max(0, Math.min(trackMax(id), v));
  if (S.tracks[id] === v) return render();
  const old = S.tracks[id];
  commit(tr(`${who()}：${trackName(id)} ${old} → ${v}`, `${who()}: ${trackName(id)} ${old} → ${v}`), () => { S.tracks[id] = v; });
}
function nearestTrackValue(id, pt) {
  let best = 0, bd = 1e9;
  for (let v = 0; v <= trackMax(id); v++) {
    const sn = trackSnap(id, v);
    if (!sn) continue;
    const d = Math.hypot(pt.x - (sn.x + sn.w / 2), pt.y - (sn.y + sn.h / 2));
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

// my column: dotted slots show what goes where. Cards are shown a little larger than on the table (HCW x HCH).
const HCW = Math.round(CW * 1.05), HCH = Math.round(CH * 1.05);
function renderHand() {
  const phone = window.innerWidth <= 760;
  const cardHtml = (it, attr) => {
    const r = itemHtml({ ...it, face: 1 });
    return `<div class="piece hcard ${r.cls}" ${attr}="${it.id}" title="${esc(r.title)}" style="width:${HCW}px;height:${HCH}px">${r.html}</div>`;
  };
  // my hand: three dotted card slots, one under the other; more than three cards overlap so every top line shows
  const list = S.hands[ME] || [];
  elHand.querySelector(".my-hand .hand-title").innerHTML = WATCH ? `${tr(`${esc(S.names[ME] || "")} 的手牌`, `${esc(S.names[ME] || "")}'s hand`)} · ${list.length}<small>${tr("觀戰中：點上方的座位換成別人的視角。", "Watching: press a seat above to see from another player's side.")}</small>` : `${tr("我的手牌", "My hand")} · ${list.length}<small>${tr("拖到桌上打出；拖回這裡收回。右鍵看更多動作。", "Drag to the table to play; drag back to keep. Right-click for more.")}</small>`;
  const box = elHand.querySelector(".hand-cards");
  if (phone) {
    box.innerHTML = list.map(id => cardHtml(S.items[id], "data-hid")).join("") || `<div class="muted empty">${tr("（沒有手牌）", "(no cards)")}</div>`;
    return;
  }
  const gap = 8, H = 3 * HCH + 2 * gap, cols = list.length > 3 ? 2 : 1;
  const perCol = Math.ceil(list.length / cols) || 1;
  const step = perCol <= 3 ? HCH + gap : (H - HCH) / (perCol - 1);
  box.innerHTML = `<div class="hslots" style="height:${H}px;width:${cols * HCW + (cols - 1) * gap}px">
      ${[0, 1, 2].flatMap(i => Array.from({ length: cols }, (_, c) => `<div class="hslot" style="left:${c * (HCW + gap)}px;top:${i * (HCH + gap)}px;width:${HCW}px;height:${HCH}px"><span class="slab">${tr("手牌", "Card")}</span></div>`)).join("")}
      ${list.map((id, i) => { const c = Math.floor(i / perCol), r = i % perCol;
        return `<div class="hpos" data-col="${c}" style="left:${c * (HCW + gap)}px;top:${Math.round(r * step)}px;z-index:${10 + i}">${cardHtml(S.items[id], "data-hid")}</div>`; }).join("")}
    </div>`;
}

// ---------------------------------------------------------------- changes
function commit(msg, fn) {
  if (WATCH) return watchToast();
  hist.push(JSON.stringify(S));
  if (hist.length > 80) hist.shift();
  fut = [];
  fn();
  S.rev++;
  if (msg) { S.log.push({ t: Date.now(), who: ME, m: msg }); if (S.log.length > 120) S.log.shift(); }
  changed();
}
function changed() { saveLocal(); render(); sync(); }
function undo() { if (WATCH || !hist.length) return; fut.push(JSON.stringify(S)); S = JSON.parse(hist.pop()); S.rev = Date.now(); changed(); toast(tr("已復原", "Undone")); }
function redo() { if (WATCH || !fut.length) return; hist.push(JSON.stringify(S)); S = JSON.parse(fut.pop()); S.rev = Date.now(); changed(); }

function detach(id) {
  delete S.items[id].pg;
  const w = S.where[id];
  if (!w) return;
  if (w.startsWith("s:")) { const st = S.stacks[w.slice(2)]; st.items = st.items.filter(x => x !== id); }
  if (w.startsWith("h:")) { const h = S.hands[+w.slice(2)]; S.hands[+w.slice(2)] = h.filter(x => x !== id); }
  if (w.startsWith("a:")) { const a = S.areas[+w.slice(2)]; S.areas[+w.slice(2)] = a.filter(x => x !== id); }
  S.where[id] = null;
}
function toTable(id, x, y) { detach(id); const it = S.items[id]; it.x = x; it.y = y; it.z = ++S.z; S.where[id] = "t"; }
function toStack(id, sid, bottom = false) {
  detach(id);
  const st = S.stacks[sid], it = S.items[id];
  if (st.bin && it.tk === "root") it.face = 0;   // a Bloom put back in the supply is just a Root token again
  it.rot = 0;
  bottom ? st.items.unshift(id) : st.items.push(id); S.where[id] = "s:" + sid;
}
function toHand(id, seat) { detach(id); S.hands[seat].push(id); S.where[id] = "h:" + seat; const it = S.items[id]; it.rot = 0; }
// into a player's own area: a commission lies face down there until it is revealed
function toArea(id, seat) {
  const it = S.items[id], from = S.where[id];
  detach(id); S.areas[seat].push(id); S.where[id] = "a:" + seat; it.rot = 0;
  if (it.ck?.startsWith("comm:") && from !== "t") it.face = 0;
}
const nameOf = id => { const it = S.items[id]; return it.kind === "card" ? (it.face ? cardInfo(it.ck).title : tr("一張牌", "a card")) : itemHtml(it).title; };
const who = () => S.names[ME] || tr(`擺渡人 ${ME + 1}`, `Ferryman ${ME + 1}`);

// ---------------------------------------------------------------- interaction
let drag = null;
// the world is drawn turned by view.r around its centre, so a seat on any side can sit at the bottom of the screen
const viewMatrix = () => new DOMMatrix().translate(view.x, view.y).scale(view.s).translate(WORLD.w / 2, WORLD.h / 2).rotate(view.r).translate(-WORLD.w / 2, -WORLD.h / 2);
function worldPt(e) {
  const r = $("#tt-view").getBoundingClientRect();
  const q = viewMatrix().inverse().transformPoint(new DOMPoint(e.clientX - r.left, e.clientY - r.top));
  return D2C(q.x, q.y);
}
function applyView() { elWorld.style.transform = viewMatrix().toString(); }
// a new stretch: draw the boards again for it, then everything on them
function applyStretch() {
  $("#tt-boards").innerHTML = boardsHtml();
  placeBoards();
  if (S) render();
}
// The right-hand column (my area and hand) takes whatever width the board does not need, so the board always fills
// the space between the top bar and the bottom of the window (or the hint strip). At least three cards across.
function sizeColumn() { /* the column has a fixed width in the stylesheet: one card plus the menu beside it */ }
function fit() {
  sizeColumn();
  const r = $("#tt-view").getBoundingClientRect();
  view.r = 0;   // everyone sees the same fixed table
  // the boards stretch to fill the window: the scale that fits them, then the gaps take the rest
  const pad = 0.985, sc = Math.min(r.width / FITB.w, r.height / FITB.h) * pad;
  const ex = Math.max(0, r.width * pad / sc - FITB.w), ey = Math.max(0, r.height * pad / sc - FITB.h);
  const kx = Math.round((1 + ex / (MX1 - MX0)) * 1000) / 1000, ky = Math.round((1 + ey / (MY1 - MY0)) * 1000) / 1000;
  if (kx !== STR.kx || ky !== STR.ky) { STR.kx = kx; STR.ky = ky; applyStretch(); }
  const W = FITB.w + ex, H = FITB.h + ey;
  view.s = sc;
  view.x = r.width / 2 - (FITB.x + W / 2) * view.s; view.y = r.height / 2 - (FITB.y + H / 2) * view.s;
  applyView();
  zoomed = null; markZoom();
}

function bindTable() {
  const v = $("#tt-view");
  v.addEventListener("wheel", e => {
    e.preventDefault();
    const r = v.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const k = Math.exp(-e.deltaY * 0.0015);
    const ns = Math.min(2.5, Math.max(0.06, view.s * k));
    view.x = mx - (mx - view.x) * ns / view.s; view.y = my - (my - view.y) * ns / view.s; view.s = ns;
    applyView();
  }, { passive: false });
  v.addEventListener("pointerdown", onDown);
  v.addEventListener("click", e => { const z = e.target.closest(".zoombtn"); if (z) { e.stopPropagation(); zoomed === z.dataset.zoom ? fit() : zoomTo(z.dataset.zoom); } });
  if (!bindTable.once) {   // the window outlives every table: listen to it only once
    bindTable.once = true;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }
  v.addEventListener("dblclick", e => {
    const a = e.target.closest(".piece[data-aid]");
    if (a) return flipInArea(a.dataset.aid);
    const p = e.target.closest(".piece[data-id]");
    if (p) flip(p.dataset.id);
    const s = e.target.closest(".stack");
    if (s && !p) drawToHand(s.dataset.stack);
  });
  v.addEventListener("contextmenu", e => { e.preventDefault(); openMenu(e); });
  elHand.addEventListener("pointerdown", e => {
    if (WATCH) return;
    const c = e.target.closest("[data-hid],[data-aid]");
    if (!c || e.button !== 0) return;
    e.preventDefault();
    drag = c.dataset.hid ? { pending: true, id: c.dataset.hid, from: "hand", sx: e.clientX, sy: e.clientY }
      : { pending: true, id: c.dataset.aid, from: "area", sx: e.clientX, sy: e.clientY };
  });
  // double-click a token in my area to flip it (Push Through: ready / spent)
  elHand.addEventListener("dblclick", e => { const c = e.target.closest("[data-aid]"); if (c) flipInArea(c.dataset.aid); });
  elHand.addEventListener("contextmenu", e => { e.preventDefault(); openMenu(e); });
  $("#tt-undo").onclick = undo; $("#tt-redo").onclick = redo; $("#tt-fit").onclick = fit;
  $("#tt-rules").onclick = () => openDrawer("rules");
  $("#tt-aid").onclick = () => openDrawer("aid");
  $("#tt-log").onclick = () => openDrawer("log");
  $("#tt-menu").onclick = () => {
    if (mode !== "local" && !WATCH && !confirm(tr("離開這張線上桌？其他人會和你斷線。", "Leave this online table? The others lose their link to you."))) return;
    showMenuScreen();
  };
  $("#tt-hints").onchange = e => setHints(e.target.checked);
  $("#tt-lang").onclick = toggleLang;
  $("#tt-auto").onclick = autoSetup;
  $("#tt-mic").onclick = toggleMic;
  $("#tt-sound").onclick = () => { if (voice) { voice.setHearing(!voice.hearing); renderOnline(); } };
  $("#tt-switch").onclick = liveTablesModal;
  elSeats.onclick = e => {
    const b = e.target.closest("[data-seat]");
    if (!b) return;
    const n = +b.dataset.seat;
    if (mode === "local") return switchSeat(n);
    if (watchHost && !WATCH && n === ME) {   // stop standing in for this seat
      WATCH = true; buildTable(); toast(tr("回到觀戰。", "Back to watching.")); return;
    }
    if (!WATCH) return;
    if (watchHost && S.online && !S.online[n] && confirm(tr(`${S.names[n]} 不在線上。要代為進行這個座位嗎？對方回來時會自動交還。`, `${S.names[n]} is not here. Play this seat for them? It goes back to them when they return.`))) {
      WATCH = false; ME = n; buildTable(); toast(tr(`你正在代打 ${S.names[n]}。再按一次自己的座位就回到觀戰。`, `You are playing for ${S.names[n]}. Press your seat again to go back to watching.`)); return;
    }
    ME = n; buildTable();   // watch from that player's side
  };
  window.onkeydown = e => {
    if (!onTable() || e.target.closest("input,textarea,select")) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    else if (hover && e.key.toLowerCase() === "f") flip(hover);
    else if (hover && e.key.toLowerCase() === "r") rotate(hover);
    else if (e.key === "Escape") closeMenus();
  };
  v.addEventListener("pointerover", e => { const p = e.target.closest(".piece[data-id]"); hover = p ? p.dataset.id : null; });
}
let hover = null;
const onTable = () => !!document.getElementById("tt-world");

// two fingers on a touch screen pinch the view
const touches = new Map();
function pinchStart() {
  const [a, b] = [...touches.values()];
  drag = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: view.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, vx: view.x, vy: view.y };
}
function onDown(e) {
  if (e.pointerType === "touch") {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2 && (!drag || drag.pan || drag.pending)) { pinchStart(); return; }
  }
  if (e.button !== 0) return;
  closeMenus();
  if (WATCH) {   // a watcher can only look around
    if (e.target.closest("button")) return;
    drag = { pan: true, sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
    return;
  }
  const mk = e.target.closest(".tmarker");
  if (mk) { e.preventDefault(); drag = { track: mk.dataset.track, el: mk }; mk.classList.add("dragging"); return; }
  const tc = e.target.closest(".tcell");
  if (tc) { setTrack(tc.dataset.track, +tc.dataset.val); return; }
  const a = e.target.closest(".piece[data-aid]");
  if (a) {   // an item on a front: only its owner moves it
    if (S.where[a.dataset.aid] !== "a:" + ME) return toast(tr("這是其他玩家面前的東西。", "That is in front of another player."));
    e.preventDefault();
    drag = { pending: true, id: a.dataset.aid, from: "area", sx: e.clientX, sy: e.clientY };
    return;
  }
  const p = e.target.closest(".piece[data-id]");
  if (p) return startDrag(e, p.dataset.id, "table");
  const s = e.target.closest(".stack");
  if (s) {
    const st = S.stacks[s.dataset.stack];
    if (e.shiftKey) { const pt = worldPt(e); drag = { stackMove: st.id, wx: pt.x, wy: pt.y, ox: st.x, oy: st.y, snapshot: JSON.stringify(S) }; return; }
    const top = st.items[st.items.length - 1];
    if (!top) return;
    // the card leaves the pile only once the pointer moves: a click or double-click leaves the pile as it is
    e.preventDefault();
    drag = { pending: true, id: top, from: "stack:" + st.id, sx: e.clientX, sy: e.clientY };
    return;
  }
  if (e.target.closest("button")) return;
  drag = { pan: true, sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
}
function startDrag(e, id, from) {
  e.preventDefault();
  const snapshot = JSON.stringify(S);
  const it = S.items[id];
  const pt = worldPt(e);
  if (from !== "table") {
    // lift it out of the stack or hand onto the table under the pointer
    const st = from.startsWith("stack:") ? S.stacks[from.slice(6)] : null;
    if (it.kind === "card") it.face = from === "hand" ? 1 : from === "area" ? it.face : st && st.faceUp ? 1 : 0;
    if (it.kind === "tile" && st) it.face = st.faceUp ? 1 : 0;
    toTable(id, pt.x, pt.y);
    render();
  }
  it.z = ++S.z;
  drag = { id, from, snapshot, dx: pt.x - it.x, dy: pt.y - it.y, moved: false, sx: e.clientX, sy: e.clientY };
  els[id]?.classList.add("dragging");
}
function onMove(e) {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!drag) return;
  if (drag.pinch) {
    if (touches.size < 2) return;
    const [a, b] = [...touches.values()];
    const r = $("#tt-view").getBoundingClientRect();
    const ns = Math.min(2.6, Math.max(0.06, drag.s0 * Math.hypot(a.x - b.x, a.y - b.y) / drag.d0));
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    // keep the point under the fingers' first midpoint under their current midpoint
    view.x = mx - r.left - (drag.mx - r.left - drag.vx) * ns / drag.s0;
    view.y = my - r.top - (drag.my - r.top - drag.vy) * ns / drag.s0;
    view.s = ns;
    applyView();
    return;
  }
  if (drag.pending) {
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) <= 3) return;
    const { id, from, sx, sy } = drag;
    drag = null;
    startDrag({ clientX: sx, clientY: sy, preventDefault() {} }, id, from);
    drag.moved = true;
  }
  if (drag.track) {
    const v = nearestTrackValue(drag.track, worldPt(e)), sn = trackSnap(drag.track, v);
    drag.val = v;
    drag.el.style.transform = tAt(sn.x + sn.w / 2, sn.y + sn.h / 2, TK, TK);
    return;
  }
  if (drag.pan) { view.x = drag.ox + e.clientX - drag.sx; view.y = drag.oy + e.clientY - drag.sy; applyView(); return; }
  if (drag.stackMove) {
    const st = S.stacks[drag.stackMove];
    const pt = worldPt(e);
    st.x = drag.ox + pt.x - drag.wx; st.y = drag.oy + pt.y - drag.wy;
    const el0 = stackEls[st.id], sw = el0.offsetWidth, sh = el0.offsetHeight, sc0 = C2D(st.x + sw / 2, st.y + sh / 2), sp = { x: sc0.x - sw / 2, y: sc0.y - sh / 2 }; stackEls[st.id].style.left = sp.x + "px"; stackEls[st.id].style.top = sp.y + "px"; return;
  }
  const pt = worldPt(e);
  const it = S.items[drag.id];
  if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 3) drag.moved = true;
  it.x = pt.x - drag.dx; it.y = pt.y - drag.dy;
  const el = els[drag.id];
  if (el) {
    const w = parseFloat(el.style.width), h = parseFloat(el.style.height);
    el.style.transform = tAt(it.x, it.y, w, h, it.rot);
    el.style.zIndex = 9000;
  }
  sendMove(drag, it);
  const over = dockPart(e);
  elHand.querySelector(".my-hand").classList.toggle("drop", over === "hand" && it.kind === "card");
  const mo = over ? -1 : matAt({ x: it.x, y: it.y });
  document.querySelectorAll(".board.mat").forEach(b => b.classList.toggle("dropmat", b.dataset.region === "mat" + mo));
}
// is the pointer over my area or my hand (the dock at the bottom of the screen)?
function dockPart(e) {
  const r = $("#tt-myhand").getBoundingClientRect();
  return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom ? "hand" : null;
}

function onUp(e) {
  touches.delete(e.pointerId);
  if (drag?.pinch) { if (touches.size < 2) drag = null; return; }
  if (!drag) return;
  const d = drag; drag = null;
  elHand.querySelectorAll(".drop").forEach(x => x.classList.remove("drop"));
  document.querySelectorAll(".dropmat").forEach(x => x.classList.remove("dropmat"));
  if (d.pending) return;   // a click on a pile or a hand card moves nothing
  if (d.track) { d.el.classList.remove("dragging"); if (d.val !== undefined) setTrack(d.track, d.val); else render(); return; }
  if (d.pan) return;
  if (d.stackMove) { hist.push(d.snapshot); fut = []; S.rev++; changed(); return; }
  const it = S.items[d.id];
  els[d.id]?.classList.remove("dragging");
  if (mode !== "local") netSend({ t: "mvend", id: d.id });
  if (!d.moved && d.from === "table") return render();
  hist.push(d.snapshot); if (hist.length > 80) hist.shift(); fut = [];
  let msg = "";
  const part = dockPart(e), mat = part ? -1 : matAt({ x: it.x, y: it.y });
  if (mat >= 0 || (part === "hand" && it.kind !== "card")) {
    const q = mat >= 0 ? mat : ME;
    toArea(d.id, q);
    msg = d.from === "area" && q === ME ? "" : tr(`${who()} 把 ${nameOf(d.id)} 放到${q === ME ? "自己" : ` ${S.names[q]} `}面前`, `${who()} put ${nameOf(d.id)} in front of ${q === ME ? "themselves" : S.names[q]}`);
  } else if (part === "hand") {
    toHand(d.id, ME);
    msg = d.from === "hand" ? "" : tr(`${who()} 拿了 ${nameOf(d.id)} 到手牌`, `${who()} took ${nameOf(d.id)} into hand`);
    if (d.from.startsWith("stack:") && !S.stacks[d.from.slice(6)].faceUp) msg = tr(`${who()} 從${tr(...S.stacks[d.from.slice(6)].label)}抽了 1 張`, `${who()} drew a card from ${tr(...S.stacks[d.from.slice(6)].label)}`);
  } else {
    const pt = { x: it.x, y: it.y };
    const sid = stackAt(pt, it);
    if (sid) {
      toStack(d.id, sid, e.altKey);
      msg = tr(`${who()} 把 ${nameOf(d.id)} 放到${tr(...S.stacks[sid].label)}`, `${who()} put ${nameOf(d.id)} on ${tr(...S.stacks[sid].label)}`);
    } else {
      const sn = snapAt(pt, it);
      if (sn) { it.x = sn.x + sn.w / 2; it.y = sn.y + sn.h / 2; }
      if (sn && sn.id.startsWith("node")) it.pg = bookView; else delete it.pg;
      if (d.from === "hand") msg = tr(`${who()} 打出 ${nameOf(d.id)}`, `${who()} played ${nameOf(d.id)}`);
      else if (d.from === "area") msg = tr(`${who()} 從自己的區域拿出 ${nameOf(d.id)}`, `${who()} took ${nameOf(d.id)} from their area`);
      else if (d.from.startsWith("stack:")) msg = tr(`${who()} 從${tr(...S.stacks[d.from.slice(6)].label)}拿出 ${nameOf(d.id)}`, `${who()} took ${nameOf(d.id)} from ${tr(...S.stacks[d.from.slice(6)].label)}`);
    }
  }
  S.rev++;
  if (msg) { S.log.push({ t: Date.now(), who: ME, m: msg }); if (S.log.length > 120) S.log.shift(); }
  changed();
}
function stackAt(pt, it) {
  for (const sid in S.stacks) {
    const st = S.stacks[sid];
    const tokenBin = st.accepts.startsWith("tok");
    const w = st.w || (tokenBin ? 92 : st.small ? 86 : CW + 8), h = st.h || (tokenBin ? 92 : st.small ? 86 : CH + 8);
    if (pt.x < st.x || pt.x > st.x + w || pt.y < st.y || pt.y > st.y + h) continue;
    if (st.accepts === "any") return sid;
    if (st.accepts === "card" && it.kind === "card") return sid;
    if (st.accepts === "tile" && it.kind === "tile") return sid;
    if (st.accepts === "tok:" + it.tk) return sid;
  }
  return null;
}
function snapAt(pt, it) {
  let best = null, bd = 1e9;
  for (const s of SNAPS) {
    if (!s.accept.includes(it.kind) || !s.w) continue;
    if (s.id.startsWith("node") && !s.id.startsWith(`node${bookView}_`)) continue;
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    const d = Math.hypot(pt.x - cx, pt.y - cy);
    const lim = Math.max(s.w, s.h) * 0.7;
    if (d < lim && d < bd) { bd = d; best = s; }
  }
  return best;
}

function flip(id) {
  const it = S.items[id];
  if (!it || S.where[id] !== "t") return;
  if (it.kind === "tok" && !["root", "push"].includes(it.tk)) return;
  commit(tr(`${who()} 翻轉了 ${nameOf(id)}`, `${who()} flipped ${nameOf(id)}`), () => { it.face = it.face ? 0 : 1; });
}
function flipInArea(id) {
  const it = S.items[id];
  if (!it || S.where[id] !== "a:" + ME) return;
  if (it.kind === "tok" && it.tk !== "push") return;
  commit(it.tk === "push" ? tr(`${who()} 的破浪標記${it.face ? "用掉了" : "翻回可用"}`, `${who()} turned their Push Through ${it.face ? "to spent" : "back to ready"}`)
    : tr(`${who()} 翻轉了自己區域的 1 張牌`, `${who()} flipped a card in their area`), () => { it.face = it.face ? 0 : 1; });
}
function rotate(id) {
  const it = S.items[id];
  if (!it || S.where[id] !== "t") return;
  commit(it.kind === "card" ? (it.rot ? tr(`${who()} 把 ${nameOf(id)} 轉正（點亮／使用完畢）`, `${who()} turned ${nameOf(id)} upright`) : tr(`${who()} 把 ${nameOf(id)} 橫放`, `${who()} turned ${nameOf(id)} sideways`)) : "",
    () => { it.rot = it.rot ? 0 : 90; });
}
function drawToHand(sid, seat = ME) {
  const st = S.stacks[sid];
  if (!st.items.length || !st.accepts.match(/card|any/)) return;
  const top = st.items[st.items.length - 1];
  if (S.items[top].kind !== "card") return;
  commit(tr(`${S.names[seat] || ""} 從${tr(...st.label)}抽了 1 張`, `${S.names[seat] || ""} drew from ${tr(...st.label)}`), () => toHand(top, seat));
}

// ---------------------------------------------------------------- context menu
function openMenu(e) {
  closeMenus();
  if (WATCH) {   // a watcher may still look closer at an open card
    const p = e.target.closest(".piece[data-id],[data-hid]"), it = p && S.items[p.dataset.id || p.dataset.hid];
    if (it && it.kind !== "tok" && (it.face || p.dataset.hid)) lookCloser(it, !!p.dataset.hid);
    return;
  }
  const opts = [];
  const p = e.target.closest(".piece[data-id]");
  const hc = e.target.closest("[data-hid]");
  const ac = e.target.closest("[data-aid]");
  const s = e.target.closest(".stack");
  if (hc) {
    const id = hc.dataset.hid;
    opts.push([tr("正面打出（放到出牌區）", "Play face up (to the Play area)"), () => { S.items[id].face = 1; commit(tr(`${who()} 正面打出 ${nameOf(id)}`, `${who()} played ${nameOf(id)} face up`), () => { const pt = playSpot(); toTable(id, pt.x, pt.y); S.items[id].face = 1; S.items[id].by = ME; }); }]);
    opts.push([tr("背面打出（放到出牌區）", "Play face down (to the Play area)"), () => commit(tr(`${who()} 背面打出 1 張牌`, `${who()} played a card face down`), () => { const pt = playSpot(); toTable(id, pt.x, pt.y); S.items[id].face = 0; S.items[id].by = ME; })]);
    for (let q = 0; q < S.players; q++) if (q !== ME) opts.push([tr(`交給 ${S.names[q]}（換牌）`, `Give to ${S.names[q]} (swap)`), () => commit(tr(`${who()} 交給 ${S.names[q]} 1 張牌`, `${who()} gave ${S.names[q]} a card`), () => toHand(id, q))]);
    opts.push([tr("放到記憶牌庫底", "Put on the bottom of the deck"), () => commit(tr(`${who()} 把 1 張牌放到牌庫底`, `${who()} put a card on the bottom of the deck`), () => toStack(id, "deck", true))]);
    opts.push([tr("放到我的區域", "Put in my area"), () => commit(tr(`${who()} 把 1 張牌放到自己的區域`, `${who()} put a card in their area`), () => toArea(id, ME))]);
    opts.push([tr("放大檢視", "Look closer"), () => lookCloser(S.items[id], true)]);
  } else if (ac && S.where[ac.dataset.aid] !== "a:" + ME) {
    const id = ac.dataset.aid, it = S.items[id];
    if (it.kind === "card" && !(it.ck?.startsWith("comm:") && !it.face)) opts.push([tr("放大檢視", "Look closer"), () => lookCloser(it)]);
    else opts.push([tr("這是其他玩家面前的東西", "In front of another player"), null]);
  } else if (ac) {
    const id = ac.dataset.aid, it = S.items[id];
    if (it.kind === "card" || it.tk === "push") opts.push([it.tk === "push" ? (it.face ? tr("用掉破浪（翻面）", "Spend Push Through (flip)") : tr("破浪翻回可用", "Push Through ready again")) : tr("翻面", "Flip"), () => flipInArea(id)]);
    opts.push([it.ck?.startsWith("comm:") ? tr("翻開放到桌上（翻開託付）", "Reveal it on the table") : tr("放到桌上", "Place on the table"), () => commit(tr(`${who()} 從自己的區域拿出 ${nameOf(id)}`, `${who()} took ${nameOf(id)} from their area`), () => {
      const pt = centerView(); toTable(id, pt.x, pt.y); if (it.ck?.startsWith("comm:")) it.face = 1; })]);
    if (it.kind === "card") opts.push([tr("放進我的手牌", "Take into my hand"), () => commit(tr(`${who()} 把 1 張牌從自己的區域拿回手牌`, `${who()} took a card from their area into hand`), () => toHand(id, ME))]);
    if (it.kind === "card") opts.push([tr("放大檢視", "Look closer"), () => lookCloser(it, true)]);
    opts.push([tr("放回盒中（移出遊戲）", "Return to the box"), () => commit(tr(`${who()} 把 ${nameOf(id)} 移出遊戲`, `${who()} removed ${nameOf(id)}`), () => toStack(id, "box"))]);
  } else if (p) {
    const id = p.dataset.id, it = S.items[id];
    if (it.kind !== "tok" || ["root", "push"].includes(it.tk)) opts.push([tr("翻面（F）", "Flip (F)"), () => flip(id)]);
    if (it.kind === "card") {
      opts.push([it.rot ? tr("轉正（R）", "Turn upright (R)") : tr("橫放（R）", "Turn sideways (R)"), () => rotate(id)]);
      if (!it.face) opts.push([tr("偷看（只有你看到）", "Peek (only you)"), () => peek(id)]);
      opts.push([tr("放進我的手牌", "Take into my hand"), () => commit(tr(`${who()} 拿了 1 張牌到手牌`, `${who()} took a card`), () => toHand(id, ME))]);
    }
    if (it.face && it.kind !== "tok") opts.push([tr("放大檢視", "Look closer"), () => lookCloser(it)]);
    opts.push([tr("放回盒中（移出遊戲）", "Return to the box"), () => commit(tr(`${who()} 把 ${nameOf(id)} 移出遊戲`, `${who()} removed ${nameOf(id)}`), () => toStack(id, "box"))]);
  } else if (s) {
    const sid = s.dataset.stack, st = S.stacks[sid];
    const cards = st.accepts === "card" || st.accepts === "any";
    const topIt = S.items[st.items[st.items.length - 1]];
    if (topIt && topIt.kind !== "tok" && (topIt.kind === "card" ? st.faceUp : topIt.face)) opts.push([tr("放大檢視頂牌", "Look closer at the top card"), () => lookCloser(topIt, topIt.kind === "card")]);
    if (cards && st.items.length) {
      opts.push([tr("抽 1 張到手牌", "Draw 1 into my hand"), () => drawToHand(sid)]);
      opts.push([tr("翻開頂牌放到桌上", "Turn the top card onto the table"), () => commit(tr(`${who()} 翻開${tr(...st.label)}的頂牌`, `${who()} turned the top of ${tr(...st.label)}`), () => {
        const top = st.items[st.items.length - 1];
        // a Mist card goes to the "Mist ahead" slot; anything else to the middle of the view, clear of other piles
        const pt = /^mist\d$/.test(sid) ? snapPos("mistfront") : playSpot();
        toTable(top, pt.x, pt.y); S.items[top].face = 1;
      })]);
      opts.push([tr("每人發 1 張", "Deal 1 to each player"), () => commit(tr(`${who()} 從${tr(...st.label)}每人發 1 張`, `${who()} dealt 1 card each`), () => { for (let q = 0; q < S.players; q++) { const top = st.items[st.items.length - 1]; if (top) toHand(top, q); } })]);
      if (sid === "comm") opts.push([tr("每人發 1 張到各自的區域（面朝下）", "Deal 1 face down to each player's area"), () => commit(tr(`${who()} 發給每人 1 張託付`, `${who()} dealt a commission to each player`), () => { for (let q = 0; q < S.players; q++) { const top = st.items[st.items.length - 1]; if (top) toArea(top, q); } })]);
    }
    if (st.pool !== undefined && st.items.length) opts.push([tr(`補滿第${"一二三"[st.pool]}河段的河岸（霧面朝上）`, `Fill Reach ${st.pool + 1}'s banks (fog side up)`), () => fillReach(st.pool)]);
    if (sid === "bin_push" && st.items.length >= S.players) opts.push([tr("每人 1 個到各自的區域", "One to each player's area"), () => commit(tr(`${who()} 發給每人 1 個破浪標記`, `${who()} gave everyone a Push Through token`), () => { for (let q = 0; q < S.players; q++) toArea(st.items[st.items.length - 1], q); })]);
    if (st.items.length > 1) opts.push([tr("洗牌", "Shuffle"), () => { commit(tr(`${who()} 洗了${tr(...st.label)}`, `${who()} shuffled ${tr(...st.label)}`), () => shuffle(st.items)); shuffleAnim(sid); }]);
    if (st.items.length) opts.push([tr("整疊放到…", "Put the whole pile on…"), () => movePile(sid)]);
    if (st.items.length) opts.push([tr("查看與搜尋", "Look through / search"), () => searchStack(sid)]);
    if (cards) opts.push([st.faceUp ? tr("整疊翻成面朝下", "Turn the pile face down") : tr("整疊翻成面朝上", "Turn the pile face up"), () => commit("", () => { st.faceUp = !st.faceUp; })]);
    opts.push([tr("移動整疊：按住 Shift 拖曳", "Move the pile: Shift + drag"), null]);
  } else {
    opts.push([tr("全桌檢視", "Fit the table"), fit]);
  }
  elMenu.innerHTML = opts.map(([t, f], i) => `<button data-i="${i}"${f ? "" : " disabled"}>${esc(t)}</button>`).join("");
  elMenu.classList.remove("hidden");
  const anchor = (hc || ac || p || s)?.getBoundingClientRect();
  const mw = elMenu.offsetWidth, mh = elMenu.offsetHeight;
  const leftSide = hc?.closest('.hpos[data-col="1"]');   // a card in the hand's right-hand column: the menu opens on its left
  let x = anchor ? (leftSide ? anchor.left - mw : anchor.right) : e.clientX, y = anchor ? anchor.top : e.clientY;
  // keep it on the screen: if it would run off the right edge, open it leftwards from the same corner
  if (x + mw > window.innerWidth - 4) x = Math.max(4, (anchor ? anchor.right : x) - mw);
  if (x < 4) x = 4;
  if (y + mh > window.innerHeight - 4) y = Math.max(4, window.innerHeight - 4 - mh);
  elMenu.style.left = x + "px"; elMenu.style.top = Math.max(4, y) + "px";
  elMenu.onclick = ev => { const b = ev.target.closest("[data-i]"); if (!b) return; closeMenus(); opts[+b.dataset.i][1]?.(); };
}
const closeMenus = () => elMenu?.classList.add("hidden");
document.addEventListener("pointerdown", e => { if (elMenu && !elMenu.classList.contains("hidden") && !e.target.closest("#tt-ctx")) closeMenus(); }, true);
const centerView = () => { const r = $("#tt-view").getBoundingClientRect(); return worldPt({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }); };

const closeModal = () => $("#tt-modal")?.classList.add("hidden");
function modal(html, onClick) {
  const m = $("#tt-modal");
  m.innerHTML = `<div class="mbox"><button class="mclose">✕</button>${html}</div>`;
  m.classList.remove("hidden");
  m.onclick = e => { if (e.target === m || e.target.closest(".mclose")) { m.classList.add("hidden"); return; } onClick?.(e, () => m.classList.add("hidden")); };
}
function peek(id) {
  const r = itemHtml({ ...S.items[id], face: 1 });
  modal(`<h3>${tr("偷看（其他人看不到）", "Peek (others cannot see)")}</h3><div class="piece big ${r.cls}">${r.html}</div>`);
}
// a card (or a face-up tile) at a size that is easy to read; faceUp: show its face even if it lies face down (my own)
function lookCloser(it, faceUp = false) {
  const r = itemHtml(faceUp ? { ...it, face: 1 } : it);
  modal(`<div class="piece big ${r.cls}">${r.html}</div>`);
}
function searchStack(sid) {
  const st = S.stacks[sid];
  const seeFaces = st.faceUp || st.bin || st.accepts !== "card";
  const list = [...st.items].reverse();
  modal(`<h3>${esc(tr(...st.label))}（${st.items.length}）</h3>
    <p class="muted">${seeFaces ? tr("點一張：拿到手牌（牌）或放到桌上。頂端在最左邊。", "Click one to take it (cards go to your hand). The top is on the left.") : tr("這疊面朝下：搜尋會看到牌面。只在規則允許時使用（例如收割者）。", "This pile is face down: searching shows the faces. Use it only when a rule lets you (e.g. the Reaper).")}</p>
    <div class="slist">${list.map(id => { const it = S.items[id]; const r = itemHtml({ ...it, face: 1 }); return `<div class="piece ${r.cls}" data-pick="${id}" style="width:${CW * 1.2}px;height:${(it.kind === "card" ? CH : CW) * 1.2}px">${r.html}</div>`; }).join("")}</div>`,
  (e, close) => {
    const c = e.target.closest("[data-pick]");
    if (!c) return;
    const id = c.dataset.pick, it = S.items[id];
    close();
    commit(tr(`${who()} 從${tr(...st.label)}拿出 ${it.kind === "card" ? tr("1 張牌", "a card") : nameOf(id)}`, `${who()} took ${nameOf(id)} from ${tr(...st.label)}`), () => {
      if (it.kind === "card") toHand(id, ME);
      else { const pt = { x: st.x + 140, y: st.y + 40 }; toTable(id, pt.x, pt.y); it.face = it.tk === "root" ? 0 : 1; }
    });
  });
}

let autoRunning = false;
async function autoSetup() {
  if (WATCH) return watchToast();
  if (autoRunning) return;
  const fresh = S.stacks.mine?.items.length && !Object.values(S.items).some(it => it.kind === "tile" && S.where[it.id] === "t");
  if (!fresh) return toast(tr("自動準備只能用在還沒準備的新牌桌。", "Auto Setup works only on a table that has not been set up."));
  autoRunning = true; $("#tt-auto").disabled = true;
  const lv = D.LEVELS[S.level], st = D.SETUP_TABLE[S.players];
  const top = sid => S.stacks[sid].items[S.stacks[sid].items.length - 1];
  const place = (id, snapId, face) => { const q = snapPos(snapId); toTable(id, q.x, q.y); if (face !== undefined) S.items[id].face = face; };
  const step = async (msg, fn, shuffled = []) => {
    const old = JSON.parse(JSON.stringify(S));
    commit(tr(`自動準備：${msg[0]}`, `Auto Setup: ${msg[1]}`), fn);
    animateChanges(old);
    shuffled.forEach(shuffleAnim);
    await new Promise(r => setTimeout(r, 750));
  };
  try {
    await step(["亡魂專屬記憶放進記憶牌庫", "the soul's memories into the deck"], () => { for (const id of [...S.stacks.mine.items]) { S.items[id].face = 0; toStack(id, "deck"); } });
    await step(["洗記憶牌庫", "shuffle the memory deck"], () => shuffle(S.stacks.deck.items), ["deck"]);
    await step(["洗凶霧", "shuffle the Harsh Mist"], () => shuffle(S.stacks.harsh.items), ["harsh"]);
    await step(["每副迷霧加入 2 張凶霧", "2 Harsh Mist into each Mist deck"], () => { for (let r = 0; r < 3; r++) for (let i = 0; i < D.HARSH_PER_DECK; i++) { const h = top("harsh"); S.items[h].deck = r; toStack(h, "mist" + r); } });
    await step(["洗三副迷霧", "shuffle the three Mist decks"], () => [0, 1, 2].forEach(r => shuffle(S.stacks["mist" + r].items)), ["mist0", "mist1", "mist2"]);
    await step(["其餘凶霧放回盒中", "the other Harsh Mist into the Box"], () => { for (const id of [...S.stacks.harsh.items]) toStack(id, "box"); });
    await step(["墳墓放上板塊池", "the Graves onto the tile pools"], () => {
      toStack(top("graves"), "pool1");
      for (let i = 0; i < st.graves; i++) toStack(top("graves"), "pool2");
      for (const id of [...S.stacks.graves.items]) toStack(id, "box");
    });
    for (let r = 0; r < 3; r++) {
      const pool = S.stacks[`pool${r}`], spaces = D.TILE_POOLS[r].spaces;
      const banks = spaces.flatMap(sp => [`bank${sp}L`, `bank${sp}R`]);
      const graves = pool.items.filter(id => S.items[id].tk === "grave"), others = shuffle(pool.items.filter(id => S.items[id].tk !== "grave"));
      const chosen = shuffle([...graves, ...others.slice(0, banks.length - graves.length)]);
      await step([`擺第${"一二三"[r]}河段的河岸板塊`, `lay Reach ${r + 1}'s bank tiles`], () => {
        chosen.forEach((id, i) => place(id, banks[i], 0));
        others.slice(banks.length - graves.length).forEach(id => { S.items[id].face = 0; toStack(id, "box"); });
      });
    }
    await step(["最初的花與亡魂", "the first flowers and the soul"], () => {
      place(top("bin_root"), "bank1L", 1); place(top("bin_root"), "bank1R", 1);
      place(top("bin_soul"), "soul0");
    });
    await step(["迴響、光、黑水", "the Echo, Light and Black Water"], () => {
      place(top("bin_echo"), "echoS");
      S.tracks.light = D.START_LIGHT[S.soul] || 0;
      if (lv.knots) for (let t = 0; t < 3; t++) S.tracks["knot" + t] = lv.knots;
      for (let k = 0; k < lv.bw; k++) place(top("bin_bw"), `bwsup${k}`);
      for (const id of [...S.stacks.bin_bw.items]) toStack(id, "box");
    });
    await step(["排好稱號列", "lay out the Mantle row"], () => { for (let i = 0; i < D.MANTLES.length; i++) place(top("mantles"), `mantle${i}`, 1); });
    await step(["洗第一章的命運之霧", "shuffle chapter 1's fates"], () => { shuffle(S.stacks.fate00.items); shuffle(S.stacks.fate01.items); }, ["fate00", "fate01"]);
    await step(["抽出第一章的兩張命運之霧（條件面朝上）", "draw chapter 1's two fates (condition up)"], () => { place(top("fate00"), "fateslot0", 0); place(top("fate01"), "fateslot1", 0); });
    await step(["洗託付卡", "shuffle the commissions"], () => shuffle(S.stacks.comm.items), ["comm"]);
    await step(["每人一張託付", "a commission to each player"], () => { for (let q = 0; q < S.players; q++) toArea(top("comm"), q); });
    await step(["每人一個破浪標記", "a Push Through token to each player"], () => { for (let q = 0; q < S.players; q++) toArea(top("bin_push"), q); });
    const hand = S.players === 1 ? 6 : S.players === 2 ? 4 : 3;
    for (let c = 0; c < hand; c++) await step([`發手牌（第 ${c + 1} 輪）`, `deal the hands (round ${c + 1})`], () => { for (let q = 0; q < S.players; q++) toHand(top("deck"), q); });
    await step(["船槳給起始玩家", "the Oar to the first player"], () => { const o = top("bin_oar"); toArea(o, 0); });
    if (S.stacks.ghost) await step(["洗幽靈牌庫", "shuffle the Ghost deck"], () => shuffle(S.stacks.ghost.items), ["ghost"]);
    await step(["翻開前方的霧", "turn the first Mist"], () => { place(top("mist0"), "mistfront", 1); S.hint = STEPS.findIndex(x => x.phase === "turn"); });
    toast(tr("準備完成：起始玩家開始第一個回合。", "Set-up done: the first player begins."));
  } finally {
    autoRunning = false; const b = $("#tt-auto"); if (b) b.disabled = false;
  }
}
// the next free spot in the Play area
function playSpot() {
  const cols = 4, spots = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < cols; c++) spots.push({ x: PLAY.x + 30 + c * (CW + 40) + CW / 2, y: PLAY.y + 160 + r * 40 + CH / 2 });
  const taken = q => Object.values(S.items).some(it => S.where[it.id] === "t" && Math.hypot(it.x - q.x, it.y - q.y) < 30);
  return spots.find(q => !taken(q)) || spots[0];
}
// shuffling: the pile riffles for a moment (everyone sees it)
function shuffleAnim(sid) {
  const el = stackEls[sid];
  if (!el) return;
  el.classList.remove("shuffling"); void el.offsetWidth; el.classList.add("shuffling");
  setTimeout(() => el.classList.remove("shuffling"), 900);
}
// the whole pile onto another pile (the soul's memories into the deck, the left-over Harsh Mist into the Box…)
function movePile(sid) {
  const st = S.stacks[sid];
  const kinds = new Set(st.items.map(id => S.items[id].kind));
  const fits = t => t.id !== sid && !t.bin && (t.accepts === "any" || (kinds.size === 1 && t.accepts === [...kinds][0]));
  const targets = Object.values(S.stacks).filter(fits);
  modal(`<h3>${tr(`把「${tr(...st.label)}」整疊（${st.items.length}）放到：`, `Put all of “${tr(...st.label)}” (${st.items.length}) on:`)}</h3>
    <div class="pilelist">${targets.map(t => `<button data-to="${t.id}">${esc(tr(...t.label))}（${t.items.length}）</button>`).join("")}</div>`, (e, close) => {
    const b = e.target.closest("[data-to]");
    if (!b) return;
    close();
    const to = S.stacks[b.dataset.to];
    commit(tr(`${who()} 把${tr(...st.label)}整疊放到${tr(...to.label)}`, `${who()} put all of ${tr(...st.label)} on ${tr(...to.label)}`), () => {
      for (const id of [...st.items]) { if (S.items[id].kind === "card" && !to.faceUp) S.items[id].face = 0; toStack(id, to.id); }
    });
  });
}

// ---------------------------------------------------------------- hints
function renderHint() {
  if (!elHint || elHint.classList.contains("hidden")) return;
  const i = Math.max(0, Math.min(STEPS.length - 1, S.hint || 0));
  const step = STEPS[i];
  const ctx = { players: S.players, level: D.LEVELS[S.level], soul: S.soul, ch: S.chapter, light: D.START_LIGHT[S.soul], pull: PULL[S.chapter],
    th: D.thresholds(S.level, S.players), hand: S.players === 1 ? 6 : S.players === 2 ? 4 : 3, need: D.SETUP_TABLE[S.players].need, graves: D.SETUP_TABLE[S.players].graves };
  const body = typeof step.body === "function" ? step.body(ctx, LANG) : step.body;
  elHint.innerHTML = `
    <div class="hh">${tr("下一步提示", "Next step")}<button class="hclose" title="${tr("關閉", "Close")}">✕</button></div>
    <div class="phases">${PHASES.map(p => `<button data-jump="${STEPS.findIndex(s => s.phase === p.key)}" class="${step.phase === p.key ? "on" : ""}">${tr(p.zh, p.en)}</button>`).join("")}</div>
    <div class="hstep"><small>${tr(PHASES.find(p => p.key === step.phase).zh, PHASES.find(p => p.key === step.phase).en)} · ${i + 1}/${STEPS.length}</small>
      <h4>${esc(tr(step.zh, step.en))}</h4><div class="hbody">${body}</div></div>
    <div class="hnav"><button data-step="-1">◀ ${tr("上一步", "Back")}</button><button data-step="1">${tr("下一步", "Next")} ▶</button></div>
    ${step.loop !== undefined ? `<button class="hloop" data-jump="${step.loop}">${tr("下一位玩家的回合", "Next player's turn")} ↺</button>` : ""}
    <p class="muted small">${tr("提示只顯示規則的下一步，不會替你移動任何東西。所有人共用同一個步驟。", "Hints only show the next step of the rules; they never move anything for you. Everyone shares the same step.")}</p>`;
  elHint.querySelector(".hclose").onclick = () => { $("#tt-hints").checked = false; setHints(false); };
  elHint.onclick = e => {
    const b = e.target.closest("[data-step],[data-jump]");
    if (!b) return;
    const n = b.dataset.jump !== undefined ? +b.dataset.jump : Math.max(0, Math.min(STEPS.length - 1, (S.hint || 0) + +b.dataset.step));
    S.hint = n; S.rev++; saveLocal(); sync(); renderHint(); focusRegions();
  };
  focusRegions();
}
function focusRegions() {
  document.querySelectorAll(".board.focus").forEach(e => e.classList.remove("focus"));
  if (!elHint || elHint.classList.contains("hidden")) return;
  const step = STEPS[S.hint || 0];
  for (const r of step.focus || []) document.querySelectorAll(`[data-region="${r}"]`).forEach(e => e.classList.add("focus"));
}

// ---------------------------------------------------------------- drawers: rules and log
function openDrawer(kind) {
  const d = $("#tt-drawer");
  if (!d.classList.contains("hidden") && d.dataset.kind === kind) { d.classList.add("hidden"); return; }
  d.dataset.kind = kind;
  if (kind === "rules") {
    d.innerHTML = `<div class="hh">${tr("規則書 V5", "Rulebook V5")}<input id="rq" placeholder="${tr("搜尋…（Enter 下一個）", "Search… (Enter: next)")}"><span id="rqc" class="rqc"></span><button id="rqprev" title="${tr("上一個（Shift+Enter）", "Previous (Shift+Enter)")}">‹</button><button id="rqnext" title="${tr("下一個（Enter）", "Next (Enter)")}">›</button><button class="hclose">✕</button></div><div class="rules">${LANG === "en" ? RULES_HTML_EN : RULES_HTML}</div>
      <button class="totop" title="${tr("回到目錄", "Back to the contents")}">▲ ${tr("回到頂端", "Top")}</button>`;
    d.querySelector(".totop").onclick = () => { d.scrollTop = 0; };
    // the rulebook's own links (its table of contents) scroll the drawer only, never the page behind it
    d.querySelector(".rules").onclick = e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      const t = d.querySelector(`[id="${CSS.escape(decodeURIComponent(a.getAttribute("href").slice(1)))}"]`);
      if (t) d.scrollTop += t.getBoundingClientRect().top - d.getBoundingClientRect().top - 48;
    };
    // search: every match highlighted, "3 / 12", previous and next (Enter, Shift+Enter)
    const box = d.querySelector(".rules");
    let hits = [], at = -1, timer = 0;
    const clear = () => {
      box.querySelectorAll("mark.rqm").forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
      box.normalize(); hits = []; at = -1;
    };
    const show = i => {
      if (!hits.length) { $("#rqc").textContent = $("#rq").value.trim() ? "0 / 0" : ""; return; }
      at = (i + hits.length) % hits.length;
      hits.forEach((m, j) => m.classList.toggle("cur", j === at));
      const m = hits[at];
      d.scrollTop += m.getBoundingClientRect().top - d.getBoundingClientRect().top - d.clientHeight / 3;
      $("#rqc").textContent = `${at + 1} / ${hits.length}`;
    };
    const find = () => {
      clear();
      const q = $("#rq").value.trim().toLowerCase();
      if (q) {
        const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        const nodes = [];
        for (let n; (n = walker.nextNode());) if (n.nodeValue.toLowerCase().includes(q) && !n.parentElement.closest("svg")) nodes.push(n);
        for (const n of nodes) {
          const text = n.nodeValue, low = text.toLowerCase(), frag = document.createDocumentFragment();
          let i = 0, j;
          while ((j = low.indexOf(q, i)) >= 0) {
            if (j > i) frag.appendChild(document.createTextNode(text.slice(i, j)));
            const m = document.createElement("mark"); m.className = "rqm"; m.textContent = text.slice(j, j + q.length);
            frag.appendChild(m); hits.push(m); i = j + q.length;
          }
          if (i < text.length) frag.appendChild(document.createTextNode(text.slice(i)));
          n.replaceWith(frag);
        }
      }
      show(0);
    };
    $("#rq").oninput = () => { clearTimeout(timer); timer = setTimeout(() => { timer = 0; find(); }, 150); };
    $("#rq").onkeydown = e => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (timer) { clearTimeout(timer); timer = 0; find(); if (!e.shiftKey) return; }
      show(at + (e.shiftKey ? -1 : 1));
    };
    $("#rqprev").onclick = () => show(at - 1);
    $("#rqnext").onclick = () => show(at + 1);
  } else if (kind === "aid") {
    d.innerHTML = `<div class="hh">${tr("玩家輔助卡 V5", "Player Aid V5")}<button class="hclose">✕</button></div><div class="rules aid">${LANG === "en" ? AID_HTML_EN : AID_HTML}</div>`;
  } else {
    d.innerHTML = `<div class="hh">${tr("紀錄", "Log")}<button class="hclose">✕</button></div><ol class="log">${[...S.log].reverse().map(l => `<li><small>${new Date(l.t).toLocaleTimeString()}</small> ${esc(l.m)}</li>`).join("")}</ol>`;
  }
  d.querySelector(".hclose").onclick = () => d.classList.add("hidden");
  d.classList.remove("hidden");
}

// ---------------------------------------------------------------- seats (local play passes one screen)
function switchSeat(n) {
  if (n === ME) return;
  const c = $("#tt-cover");
  c.innerHTML = `<div class="mbox"><h3>${tr(`請把裝置交給 ${esc(S.names[n])}`, `Pass the device to ${esc(S.names[n])}`)}</h3>
    <p>${tr("手牌會在按下按鈕後顯示。", "Their hand appears when they press the button.")}</p><button id="seatok">${tr(`我是 ${esc(S.names[n])}`, `I am ${esc(S.names[n])}`)}</button></div>`;
  c.classList.remove("hidden");
  $("#seatok").onclick = () => { ME = n; c.classList.add("hidden"); buildTable(); };
}

// ---------------------------------------------------------------- online
// ---------------------------------------------------------------- seeing the others move things
// While someone drags a piece, everyone else sees it travel (a "mv" message about 20 times a second). When a new state
// arrives, every piece that changed place glides from where it was to where it went, so a draw, a deal, a discard or a
// card turned up is seen, not just a picture that changes. Cards from or to a hand or area travel face down.
function netSend(msg) {
  if (mode === "host") link?.broadcast(msg);
  if (mode === "guest") link?.send(msg);
}
function sendMove(d, it) {
  if (mode === "local") return;
  const now = performance.now();
  if (now - (d.sentAt || 0) < 50) return;
  d.sentAt = now;
  const hidden = d.from === "hand" || d.from === "area" || (it.kind === "card" && !it.face);
  netSend({ t: "mv", id: d.id, x: Math.round(it.x), y: Math.round(it.y), face: hidden ? 0 : it.face, who: ME });
}
const ghosts = {};
function pieceSize(it) { return it.kind === "card" ? [CW, CH] : it.kind === "tile" ? [RIVER.bank - 6, RIVER.bank - 6] : [TK, TK]; }
function ghostEl(id, it, face) {
  let g = ghosts[id];
  if (!g) {
    g = document.createElement("div");
    const r = itemHtml({ ...it, face });
    g.className = `piece ghost ${r.cls}`; g.innerHTML = r.html;
    const [w, h] = pieceSize(it); g.style.width = w + "px"; g.style.height = h + "px"; g.style.zIndex = 9500;
    elTable.appendChild(g); ghosts[id] = g;
  }
  return g;
}
function dropGhost(id) { ghosts[id]?.remove(); delete ghosts[id]; }
function remoteMove(msg) {
  const it = S?.items[msg.id];
  if (!it || drag?.id === msg.id) return;
  if (msg.t === "mvend") { setTimeout(() => dropGhost(msg.id), 600); return; }
  const [w, h] = pieceSize(it);
  const tf = tAt(msg.x, msg.y, w, h, it.rot || 0);
  const el = S.where[msg.id] === "t" ? els[msg.id] : null;
  if (el) { el.classList.add("remote-moving"); el.style.transform = tf; el.style.zIndex = 9500; clearTimeout(el._rm); el._rm = setTimeout(() => el.classList.remove("remote-moving"), 700); return; }
  const g = ghostEl(msg.id, it, msg.face);
  g.style.transform = tf;
}
// where a piece is, as a point on the table (piles, hands and areas included)
function placeOf(st, id) {
  const w = st.where[id];
  if (!w) return null;
  if (w === "t") return { x: st.items[id].x, y: st.items[id].y };
  if (w.startsWith("s:")) {
    const k = S.stacks[w.slice(2)];
    if (!k) return null;
    const tb = k.accepts.startsWith("tok");
    return { x: k.x + (k.w || (tb ? 92 : k.small ? 86 : CW + 8)) / 2, y: k.y + (k.h || (tb ? 92 : k.small ? 86 : CH + 8)) / 2 };
  }
  const seat = +w.slice(2);
  if (w.startsWith("a:") && MATS[seat]) { const m = MATS[seat]; return { x: m.x + m.w / 2, y: m.y + m.h / 2 }; }
  if (w.startsWith("h:") && seat !== ME && MATS[seat]) { const f = matSlots(seat).fan; return { x: f.x + f.w / 2, y: f.y + f.h / 2 }; }
  const target = seat === ME ? $("#tt-myhand") : document.querySelector(`#tt-seats [data-seat="${seat}"]`);
  if (!target) return null;
  const r = target.getBoundingClientRect();
  return worldPt({ clientX: r.left + r.width / 2, clientY: r.top + Math.min(r.height / 2, 60) });
}
function animateChanges(old) {
  if (!old || !elTable) return;
  for (const sid in S.stacks) {
    const a = old.stacks?.[sid]?.items, b = S.stacks[sid].items;
    if (a && a.length === b.length && a.length > 1 && a.join() !== b.join() && [...a].sort().join() === [...b].sort().join()) shuffleAnim(sid);
  }
  let n = 0;
  for (const id in S.items) {
    const was = old.where?.[id], now = S.where[id];
    if (!was || !now) continue;
    const moved = was !== now || (now === "t" && (old.items[id].x !== S.items[id].x || old.items[id].y !== S.items[id].y));
    if (!moved || drag?.id === id) continue;
    if (ghosts[id]) { dropGhost(id); continue; }   // we already watched it travel
    if (++n > 40) break;                            // a big undo or a deal of many: do not animate everything
    const from = placeOf(old, id), to = placeOf(S, id);
    if (!from || !to) continue;
    const it = S.items[id], [w, h] = pieceSize(it);
    const tf = p => tAt(p.x, p.y, w, h, it.rot || 0);
    if (now === "t" && els[id]) {
      const el = els[id], final = el.style.transform;
      el.style.transition = "none"; el.style.transform = tf(from); void el.offsetWidth;
      el.style.transition = "transform .45s ease"; el.style.transform = final;
      setTimeout(() => { el.style.transition = ""; }, 500);
    } else {
      const hidden = it.kind === "card" && (/^[ha]:/.test(was) || /^[ha]:/.test(now) || !it.face);
      const g = ghostEl(id + "~", it, hidden ? 0 : it.face);
      g.style.transition = "none"; g.style.transform = tf(from); void g.offsetWidth;
      g.style.transition = "transform .45s ease, opacity .45s"; g.style.transform = tf(to); g.style.opacity = ".35";
      setTimeout(() => dropGhost(id + "~"), 500);
    }
  }
}

function sync() {
  if (mode === "host") { link?.broadcast({ t: "state", S }); liveReport(); }
  if (WATCH && mode === "guest") return;
  if (mode === "guest") link?.send({ t: "state", S });
}
function startHost(code) {
  mode = "host";
  const seats = {};    // connection id -> seat
  const byClient = {}; // browser id -> seat, so a player who drops and comes back gets the same seat
  const watchers = {}; // connection id -> watcher's name (admins with a pass the server vouched for)
  const voicePeer = {}; // connection id -> that browser's peer id, while it is in voice
  liveCode = code; voiceList = [];
  S.since ||= new Date().toISOString();
  const markOnline = () => { S.online = S.names.map((_, q) => (q === 0 && !watchHost) || Object.values(seats).includes(q)); };
  markOnline();
  hostSide = { seats, watchers, voicePeer, markOnline };
  voice = createVoice({ myId: () => link?.id(), onChange: renderOnline });
  clearInterval(liveTimer); liveTimer = setInterval(() => liveReport(true), 45000);
  link = net.host(code, {
    open: () => { $("#tt-code") && ($("#tt-code").textContent = tr(`房間代碼 ${code}`, `Table code ${code}`)); },
    call: c => voice?.incoming(c),
    message: (cid, msg) => {
      if (msg.t === "hello" && msg.watch) {   // an admin asks to watch: the server says whether the pass is real
        fetch(`/api/live?verify=${encodeURIComponent(msg.watch)}&code=${code}`, { cache: "no-store" }).then(r => r.ok ? r.json() : { ok: false }).catch(() => ({ ok: false })).then(v => {
          if (!v.ok) { link.send(cid, { t: "nowatch" }); return; }
          watchers[cid] = String(msg.name || tr("管理員", "Admin")).slice(0, 18);
          link.send(cid, { t: "welcome", seat: -1, watch: true, S });
          link.send(cid, { t: "voices", list: voiceList });
          S.log.push({ t: Date.now(), who: -1, m: tr(`${watchers[cid]} 開始觀戰`, `${watchers[cid]} is watching`) });
          changed();
        });
        return;
      }
      if (msg.t === "voice") { setVoiceMember(cid, msg); return; }
      if (msg.t === "hello") {
        const taken = new Set(Object.values(seats)), first = watchHost ? 0 : 1;
        let seat = byClient[msg.cid];
        if (seat === undefined || taken.has(seat)) {
          seat = undefined;
          for (let q = first; q < S.players; q++) if (!taken.has(q) && !Object.values(byClient).includes(q)) { seat = q; break; }
          if (seat === undefined) for (let q = first; q < S.players; q++) if (!taken.has(q)) { seat = q; break; }
        }
        if (seat === undefined) { link.send(cid, { t: "full" }); return; }
        seats[cid] = seat;
        if (msg.cid) byClient[msg.cid] = seat;
        if (msg.name) S.names[seat] = String(msg.name).slice(0, 18);
        markOnline();
        link.send(cid, { t: "welcome", seat, S });
        link.send(cid, { t: "voices", list: voiceList });
        S.log.push({ t: Date.now(), who: seat, m: tr(`${S.names[seat]} 加入了`, `${S.names[seat]} joined`) });
        if (watchHost && !WATCH && seat === ME) { WATCH = true; buildTable(); toast(tr(`${S.names[seat]} 回來了，你回到觀戰。`, `${S.names[seat]} is back; you are watching again.`)); }
        changed(); liveReport(true);
      } else if (msg.t === "state" && msg.S && seats[cid] !== undefined && msg.S.rev >= S.rev) {
        msg.S.online = S.online; msg.S.since = S.since;
        const old = S;
        S = msg.S; remoteChange(); saveLocal(); render(); animateChanges(old); link.broadcast({ t: "state", S }, cid);
      } else if ((msg.t === "mv" || msg.t === "mvend") && seats[cid] !== undefined) {
        remoteMove(msg); link.broadcast(msg, cid);
      }
    },
    leave: cid => {
      const wasSeat = seats[cid] !== undefined, wasWatcher = watchers[cid];
      delete seats[cid]; delete watchers[cid];
      if (voicePeer[cid]) setVoiceMember(cid, { on: false, id: voicePeer[cid] });
      if (wasSeat) { markOnline(); changed(); }
      if (wasSeat || wasWatcher) liveReport(true);
    },
    error: e => toast(tr("連線錯誤：", "Connection error: ") + (e?.type || "")),
  });
}
// Undo steps back through this screen's own history. Once someone else has changed the table, that history no
// longer matches it, and undoing would wipe out their move, so it is cleared.
function remoteChange() { hist = []; fut = []; }
let hostSide = null;
// the host's list of who is in voice: one entry per browser, passed to everyone
function setVoiceMember(cid, msg) {
  if (mode !== "host") return;
  const id = String(msg.id || "");
  voiceList = voiceList.filter(m => m.id !== id);
  if (cid !== null && hostSide) { if (msg.on) hostSide.voicePeer[cid] = id; else delete hostSide.voicePeer[cid]; }
  if (msg.on && id) voiceList.push({ id, name: String(msg.name || "").slice(0, 18), seat: Number.isInteger(msg.seat) ? msg.seat : -1, mic: !!msg.mic });
  link?.broadcast({ t: "voices", list: voiceList });
  voice?.update(voiceList, link?.peer());
  liveReport(true);
}
// tell the host that I am at the table, from which seat, and whether my microphone is on; the host tells everyone
function announceVoice() {
  if (!link || !voice?.joined) return;
  const msg = { t: "voice", id: link.id(), on: true, mic: voice.micOn, seat: WATCH ? -1 : ME,
    name: WATCH ? (myWatchName || tr("觀戰者", "Watcher")) : S.names[ME] };
  mode === "host" ? setVoiceMember(null, msg) : link.send(msg);
}
// everyone at an online table is in voice from the start (listening); the microphone is each person's own switch
function joinVoice() { if (!voice || mode === "local") return; voice.join(); announceVoice(); renderOnline(); }
async function toggleMic() {
  if (!voice || mode === "local") return;
  if (voice.micOn) voice.micStop();
  else if (!(await voice.micStart())) { toast(tr("無法使用麥克風：請允許這個網站使用麥克風。", "The microphone is not available: allow this site to use it.")); return; }
  announceVoice(); renderOnline();
}
let myWatchName = "";
// the host tells the server its table is live (the dashboard lists it), at most every few seconds
let lastLive = 0, liveLater = 0;
function liveReport(force = false) {
  if (mode !== "host" || !liveCode || !S) return;
  const now = Date.now();
  clearTimeout(liveLater);
  if (!force && now - lastLive < 8000) { liveLater = setTimeout(() => liveReport(true), 8000 - (now - lastLive)); return; }
  lastLive = now;
  const forgotten = S.stacks?.forgot?.items.length || 0;
  const body = { code: liveCode, since: S.since, soul: S.soul, level: S.level, players: S.players, names: S.names, online: S.online || [],
    watchers: hostSide ? Object.keys(hostSide.watchers).length : 0, watchHost, chapter: S.chapter || 0, light: S.tracks?.light || 0,
    forgotten, cracks: S.tracks?.crack || 0, voice: voiceList.filter(m => m.mic).length };
  fetch("/api/live", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}
function liveEnd() {
  clearInterval(liveTimer); liveTimer = 0; clearTimeout(liveLater);
  if (mode === "host" && liveCode) fetch(`/api/live?code=${liveCode}`, { method: "DELETE", keepalive: true }).catch(() => {});
  liveCode = null;
}
window.addEventListener("pagehide", () => liveEnd());
// watching: ask the server for a pass to this table, then join it without a seat
async function startWatch(code) {
  code = String(code || "").toUpperCase();
  let pass = null;
  try { const r = await fetch(`/api/live?token=${code}`, { cache: "no-store" }); const j = r.ok ? await r.json() : null; pass = j?.pass; } catch { /* offline */ }
  if (!pass) { toast(tr("無法取得觀戰資格（需要管理員帳號）。", "Could not get a pass to watch (an admin account is needed).")); return; }
  if (link) leaveOnline();
  myWatchName = tr("管理員", "Admin");
  try { const me = await (await fetch("/api/me", { cache: "no-store" })).json(); if (me?.user) myWatchName = String(me.user).slice(0, 18); } catch { /* */ }
  startGuest(code, myWatchName, pass);
  toast(tr("連線中…", "Connecting…"));
}
// leave the online table this screen is at (voice, the link, the live entry)
function leaveOnline() {
  voice?.stop(); voice = null; voiceList = [];
  liveEnd();
  try { link?.close(); } catch { /* */ }
  link = null; mode = "local"; WATCH = false; watchHost = false; hostSide = null;
}
// the live tables (admins): watch one, from the menu or while watching another
async function liveTablesModal() {
  let j = null;
  try { const r = await fetch("/api/live", { cache: "no-store" }); j = await r.json(); } catch { /* */ }
  const rows = (j?.live || []).filter(t => t.code !== (WATCH ? watchingCode : ""));
  modal(`<h3>${tr("正在進行的線上桌", "Live tables")}</h3>
    ${!j?.ok ? `<p class="muted">${esc(j?.error || tr("無法讀取。", "Could not be read."))}</p>` : !rows.length ? `<p class="muted">${tr("現在沒有其他正在進行的線上桌。", "No other table is being played right now.")}</p>` : ""}
    <div class="livelist">${rows.map(t => `<div class="liverow"><b>${esc(t.code)}</b> <span>${esc(soulName(t.soul))}・${tr(D.LEVELS[t.level]?.zh || "", D.LEVELS[t.level]?.en || "")}・${t.players}${tr(" 人", "p")}</span>
      <small>${t.names.map((n, i) => `${esc(n)}${t.online[i] ? "" : tr("（離線）", " (away)")}`).join("、")}・${tr(`第${"一二三"[t.chapter] || "一"}章`, `ch. ${t.chapter + 1}`)}${t.watchers ? tr(`・觀戰 ${t.watchers}`, ` · ${t.watchers} watching`) : ""}${t.voice ? tr(`・開麥 ${t.voice}`, ` · ${t.voice} mic on`) : ""}</small>
      <button class="primary" data-watch="${esc(t.code)}">${tr("觀戰", "Watch")}</button></div>`).join("")}</div>`);
  document.querySelectorAll("[data-watch]").forEach(b => b.onclick = () => { closeModal(); startWatch(b.dataset.watch); });
}
let watchingCode = "";
function startGuest(code, name, pass = null) {
  mode = "guest";
  let seated = false;
  watchingCode = pass ? code : "";
  voice = createVoice({ myId: () => link?.id(), onChange: renderOnline }); voiceList = [];
  link = net.join(code, {
    open: () => link.send(pass ? { t: "hello", name, watch: pass } : { t: "hello", name, cid: net.clientId() }),
    call: c => voice?.incoming(c),
    message: msg => {
      if (msg.t === "voices") { voiceList = msg.list || []; voice?.update(voiceList, link?.peer()); return; }
      if (msg.t === "nowatch") { toast(tr("主持人無法確認你的觀戰資格。", "The host could not confirm your pass to watch.")); return; }
      if (msg.t === "welcome") { const first = !seated; seated = true; WATCH = !!msg.watch; ME = msg.watch ? 0 : msg.seat; S = msg.S; hist = []; fut = [];
        const go = () => { buildTable(); $("#tt-code").textContent = WATCH ? tr(`牌桌 ${code}`, `Table ${code}`) : tr(`房間 ${code}`, `Table ${code}`); };
        const arrive = () => { go(); if (first) joinVoice(); };
        first ? enterGame(arrive) : arrive(); }
      else if (msg.t === "state" && seated && msg.S && msg.S.rev >= S.rev) { const old = S; S = msg.S; remoteChange(); if (onTable()) { render(); animateChanges(old); } }
      else if ((msg.t === "mv" || msg.t === "mvend") && seated && onTable()) remoteMove(msg);
      else if (msg.t === "full") toast(tr("這張桌子已經坐滿了。", "That table is full."));
    },
    close: () => toast(tr("與主持人的連線中斷了。", "Lost the host.")),
    error: e => toast(tr("連線錯誤：", "Connection error: ") + (e?.type || "")),
  });
}

// ---------------------------------------------------------------- entering a game
// A veil falls over the screen while the table is laid out, a spider lily opens on it, and the veil lifts onto the
// table. It never blocks the pointer, and it is brief for anyone who prefers reduced motion.
function enterGame(build) {
  document.querySelector(".nb-loading")?.remove();
  const quick = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const v = document.createElement("div");
  v.className = "nb-loading";
  const petals = Array.from({ length: 6 }, (_, i) => `<g transform="rotate(${i * 60} 60 60)"><path class="pt" style="--d:${i * 0.07}s" d="M60 60 C52 44 50 26 60 10 C70 26 68 44 60 60 Z"/></g>`).join("");
  const stamens = Array.from({ length: 6 }, (_, i) => { const a = (i * 60 + 30) * Math.PI / 180;
    return `<path class="st" style="--d:${0.45 + i * 0.05}s" d="M60 60 Q${(60 + 30 * Math.cos(a - 0.3)).toFixed(1)} ${(60 + 30 * Math.sin(a - 0.3)).toFixed(1)} ${(60 + 50 * Math.cos(a)).toFixed(1)} ${(60 + 50 * Math.sin(a)).toFixed(1)}"/>`; }).join("");
  v.innerHTML = `<div class="nb-lily"><svg viewBox="0 0 120 120" aria-hidden="true">${petals}${stamens}<circle class="core" cx="60" cy="60" r="5"/></svg>
    <p>${tr("擺渡人點起燈，走向河岸……", "The Ferrymen light their lamps and walk down to the river…")}</p></div>`;
  document.body.appendChild(v);
  build();
  setTimeout(() => v.classList.add("out"), quick ? 150 : 1100);
  setTimeout(() => v.remove(), quick ? 450 : 1700);
}

// ---------------------------------------------------------------- lobby
// "Choosing a Soul and a difficulty" (rulebook section 3), to help the players pick: the difficulties, the set-up by
// player count, and each Soul's special rule
function chooseTables() {
  const L = D.LEVELS, MARK = ["◆◇◇", "◆◆◇", "◆◆◆"];
  const row = (h, cells) => `<tr><th>${h}</th>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
  return `<section class="choose"><h2>${tr("選擇亡魂與難度", "Choosing a Soul and a difficulty")}</h2>
    <table><thead><tr><th>${tr("難度", "Difficulty")}</th>${L.map((l, i) => `<th>${MARK[i]} ${tr(l.zh, l.en)}</th>`).join("")}</tr></thead><tbody>
      ${row(tr("霧推進時霧勢", "Fog when the Mist advances"), L.map(l => "+" + l.fog))}
      ${row(tr("被迷霧籠罩時", "When the Mist engulfs the soul"), L.map(l => l.crack ? tr("留霧痕，並承受 1 道裂痕", "Mist scar, and 1 Fracture") : tr("只留霧痕", "Mist scar only")))}
      ${row(tr("起始結", "Starting knots"), L.map(l => l.knots ? tr(`每條絲線 ${l.knots} 結`, `${l.knots} on each thread`) : "0"))}
      ${row(tr("消散門檻", "Faded at"), L.map(l => tr(`遺忘 ${l.dissolve} 張`, `${l.dissolve} forgotten`)))}
      ${row(tr("破碎門檻", "Shattered at"), L.map(l => tr(`${l.fractures} 道裂痕`, `${l.fractures} Fractures`)))}
      ${row(tr("黑水", "Black Water"), L.map(l => tr(`${l.bw} 個`, String(l.bw))))}
    </tbody></table>
    <p class="muted small">${tr("三種難度相同：織機門檻 2–4 人 7 結、單人 10 結；每副迷霧加 2 張凶霧。新手的第一局：建議以溫和難度遊玩最後火光的孩子。",
      "The same at every difficulty: the Loom threshold is 7 knots with 2–4 players, 10 solo; each Mist deck gets 2 harsh Mist cards. A first game for new players: we suggest the Child of the Last Flame at Gentle.")}</p>
    <table><thead><tr><th>${tr("設定表", "Set-up")}</th>${[1, 2, 3, 4].map(n => `<th>${tr(`${n} 人`, `${n}p`)}</th>`).join("")}</tr></thead><tbody>
      ${row(tr("第三河段的墳墓", "Graves in Reach 3"), [2, 1, 2, 2])}
      ${row(tr("要完成的託付", "Commissions to fulfil"), [1, 2, 2, 3])}
      ${row(tr("每人手牌", "Hand size"), [6, 4, 3, 3])}
    </tbody></table>
    <table class="souls"><thead><tr><th>${tr("亡魂", "Soul")}</th><th>${tr("特色規則", "Special rule")}</th></tr></thead><tbody>
      ${D.SOUL_ORDER.map(k => `<tr><th>${esc(soulName(k))}</th><td>${esc(soulTrait(k))}</td></tr>`).join("")}
    </tbody></table></section>`;
}
function showMenuScreen() {
  document.body.classList.remove("on-table");
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(LS) || "null"); } catch { /* */ }
  if (link) leaveOnline();
  const app = $("#app");
  app.innerHTML = `<div class="lobby">
    <h1>${icon("nb-bloom")} ${tr("彼岸花渡", "Netherbloom")} <small>V5 · ${tr("手動桌面", "manual table")}</small></h1>
    <p class="muted">${tr("這是一張虛擬的實體桌面：所有的牌、板塊與指示物都由你們親手移動，程式不會替你們執行任何規則。需要時打開「下一步提示」，它會告訴你們規則的下一步。", "A virtual physical table: you move every card, tile and token yourselves; the page never carries out a rule. Turn on “Next-step hints” to be shown the next step of the rules.")}</p>
    ${saved?.soul ? `<div class="card-row"><button id="lb-resume" class="primary">${tr("繼續遊戲", "Continue the game")}</button><button id="lb-end">${tr("結束遊戲", "End the game")}</button><span class="muted">${esc(saved.soul ? soulName(saved.soul) : "")}・${saved.players}${tr(" 人", "p")}</span></div>` : ""}
    <fieldset><legend>${tr("新的一局", "New game")}</legend>
      <label>${tr("亡魂", "Soul")} <select id="lb-soul">${D.SOUL_ORDER.map(s => `<option value="${s}">${esc(soulName(s))}</option>`).join("")}</select></label>
      <label>${tr("難度", "Difficulty")} <select id="lb-level">${D.LEVELS.map((l, i) => `<option value="${i}"${i === 0 ? " selected" : ""}>${tr(l.zh, l.en)}</option>`).join("")}</select></label>
      <label>${tr("人數", "Players")} <select id="lb-players">${[1, 2, 3, 4].map(n => `<option${n === 2 ? " selected" : ""}>${n}</option>`).join("")}</select></label>
      <div id="lb-names"></div>
      ${isAdmin ? `<label class="adminopt"><input type="checkbox" id="lb-watchhost"> ${tr("主持但不參與（管理員）：開線上桌後只觀戰；某個座位沒人時可以代打", "Host without playing (admin): watch the online table; play a seat only while it is empty")}</label>` : ""}
      <div class="card-row"><button id="lb-local" class="primary">${tr("在這台裝置開桌", "Open the table here")}</button>
      <button id="lb-host">${tr("開線上桌（其他人用代碼加入）", "Host online (others join with a code)")}</button></div>
    </fieldset>
    ${isAdmin ? `<fieldset><legend>${tr("觀戰（管理員）", "Watch (admin)")}</legend><button id="lb-live">${tr("查看正在進行的線上桌", "See the live tables")}</button><span class="muted small">${tr("也可以從後台觀戰。", "You can also watch from the Dashboard.")}</span></fieldset>` : ""}
    <fieldset><legend>${tr("加入線上桌", "Join an online table")}</legend>
      <label>${tr("代碼", "Code")} <input id="lb-code" maxlength="5" size="6"></label>
      <label>${tr("你的名字", "Your name")} <input id="lb-myname" maxlength="18" size="12"></label>
      <button id="lb-join">${tr("加入", "Join")}</button></fieldset>
    ${chooseTables()}
    <aside class="tt-drawer lobby-drawer hidden" id="tt-drawer"></aside>
    <div class="tt-modal hidden" id="tt-modal"></div>
    <p class="muted small">${tr("開桌時，元件會依規則書的準備步驟分好：牌庫洗好、河岸板塊面朝下隨機擺好、各種指示物放在供應區。發牌、放最初的花、翻開前方的霧等，都由你們自己動手（提示會一步一步帶你們）。", "When the table opens, the components are sorted as the rulebook's set-up says: decks shuffled, bank tiles placed face down at random, tokens in the supply. Dealing, the first flowers and the first Mist are yours to do (the hints walk you through it).")}</p>
  </div>`;
  const names = () => {
    const n = +$("#lb-players").value;
    $("#lb-names").innerHTML = Array.from({ length: n }, (_, i) => `<label>${tr(`擺渡人 ${i + 1}`, `Ferryman ${i + 1}`)} <input data-name="${i}" maxlength="18" size="10" value="${tr(`擺渡人 ${i + 1}`, `Ferryman ${i + 1}`)}"></label>`).join("");
  };
  $("#lb-players").onchange = names; names();
  const opts = () => ({ soul: $("#lb-soul").value, level: +$("#lb-level").value, players: +$("#lb-players").value,
    names: [...document.querySelectorAll("[data-name]")].map(i => i.value.trim() || i.defaultValue) });
  if ($("#lb-resume")) $("#lb-resume").onclick = () => enterGame(() => { S = saved; ME = 0; mode = "local"; hist = []; fut = []; buildTable(); });
  // end the saved game for good (it cannot be continued afterwards)
  if ($("#lb-end")) $("#lb-end").onclick = () => {
    if (!confirm(tr("結束這一局？存檔會被刪除，之後無法再繼續。", "End this game? Its save is deleted and it cannot be continued."))) return;
    try { localStorage.removeItem(LS); } catch { /* */ }
    S = null; hist = []; fut = [];
    showMenuScreen(); toast(tr("這一局已結束。", "The game has ended."));
  };
  $("#lb-local").onclick = () => enterGame(() => { newTable(opts()); ME = 0; mode = "local"; hist = []; fut = []; buildTable(); saveLocal(); track("start"); });
  $("#lb-host").onclick = () => {
    const o = opts();
    if (o.players < 2) { toast(tr("線上桌需要 2–4 人。", "Online tables need 2–4 players.")); return; }
    const wh = isAdmin && !!$("#lb-watchhost")?.checked;
    if (wh) myWatchName = tr("主持人", "Host");
    enterGame(() => { newTable(o); ME = 0; hist = []; fut = []; watchHost = wh; WATCH = wh; const code = net.newCode(); startHost(code); buildTable(); saveLocal(); joinVoice(); liveReport(true); track("start"); });
  };
  if ($("#lb-live")) $("#lb-live").onclick = liveTablesModal;
  $("#lb-join").onclick = () => {
    const code = $("#lb-code").value.trim().toUpperCase();
    if (code.length !== 5) { toast(tr("請輸入 5 個字母的代碼。", "Enter the 5-letter code.")); return; }
    startGuest(code, $("#lb-myname").value.trim());
    toast(tr("連線中…", "Connecting…"));
  };
}

// ---------------------------------------------------------------- play log (who opened which table; nothing about the game itself)
function track(ev) {
  if (!S) return;
  S.sid ||= uid("g");
  const body = JSON.stringify({ sid: S.sid, ev, mode, players: S.players, soul: S.soul, lantern: S.level + 1, names: S.names, table: "v5" });
  fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}

// ---------------------------------------------------------------- misc
function toast(m) {
  const t = $("#toasts");
  if (!t) return;
  const d = document.createElement("div"); d.className = "toast"; d.textContent = m; t.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}
let isAdmin = false;
function toggleLang() {
  LANG = LANG === "zh" ? "en" : "zh";
  try { localStorage.setItem("nb-lang", LANG); } catch { /* */ }
  const lb = $("#btn-lang");
  if (lb) lb.textContent = LANG === "zh" ? "English" : "中文";
  labelTopbar();
  S && onTable() ? buildTable() : showMenuScreen();
}
function labelTopbar() {
  if ($("#btn-rules")) $("#btn-rules").textContent = tr("規則書", "Rulebook");
  if ($("#btn-aid")) $("#btn-aid").textContent = tr("玩家輔助卡", "Player Aid");
}
async function boot() {
  try {
    const svg = await (await fetch("/assets/symbols.svg")).text();
    const rays = `<symbol id="nb-rays" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.4" fill="currentColor"/><g stroke="currentColor" stroke-width="1.9" stroke-linecap="round">${
      Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, r1 = i % 2 ? 7 : 6.6, r2 = i % 2 ? 9.6 : 11.4;
        return `<line x1="${(12 + r1 * Math.cos(a)).toFixed(2)}" y1="${(12 + r1 * Math.sin(a)).toFixed(2)}" x2="${(12 + r2 * Math.cos(a)).toFixed(2)}" y2="${(12 + r2 * Math.sin(a)).toFixed(2)}"/>`; }).join("")}</g></symbol>`;
    const holder = document.createElement("div"); holder.style.display = "none"; holder.innerHTML = svg.replace("</svg>", rays + "</svg>"); document.body.prepend(holder);
  } catch { /* icons are optional */ }
  const lb = $("#btn-lang");
  if (lb) {
    lb.textContent = LANG === "zh" ? "English" : "中文";
    lb.onclick = toggleLang;
  }
  labelTopbar();
  if ($("#btn-rules")) $("#btn-rules").onclick = () => openDrawer("rules");
  if ($("#btn-aid")) $("#btn-aid").onclick = () => openDrawer("aid");
  window.addEventListener("resize", () => { if (S && onTable()) fit(); });
  const watchParam = new URLSearchParams(location.search).get("watch");
  if (watchParam) history.replaceState(null, "", location.pathname);
  fetch("/api/me", { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).then(me => {
    if (me?.admin) { isAdmin = true; $("#btn-dash")?.classList.remove("hidden"); $("#tt-dash")?.classList.remove("hidden"); if (!onTable()) showMenuScreen(); }
    if (watchParam) startWatch(watchParam);
  }).catch(() => {});
  showMenuScreen();
}
boot();

export const _test = { newTable: o => { newTable(o); return S; }, deckIds, cardInfo: ck => cardInfo(ck), bookLayout, buildSnaps };
