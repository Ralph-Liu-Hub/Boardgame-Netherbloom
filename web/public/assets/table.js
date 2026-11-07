// Netherbloom V5: a manual table. Nothing here plays the game: like a physical table (or Screentop.gg),
// players move every card and token by hand. The optional hint panel only shows the next step of the rules.
import { CARDS, OBS, ACC, OBL, opText } from "./cards.js";
import { ZH_CARD_NAMES, ZH_BANDS, zhOpText } from "./zh.js";
import { STORY, PULL } from "./table-story.js";
import * as D from "./table-data.js";
import * as net from "./net.js";
import { RULES_HTML } from "./rules-v5.js";
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
const PACK = { open: "E", child: "L", garland: "G-", king: "K", bride: "B" };
function deckIds(soul) {
  const core = Object.keys(MEM).filter(id => id[0] === "C");
  const own = Object.keys(MEM).filter(id => id.startsWith(PACK[soul]) && (soul !== "garland" || id.startsWith("G-")));
  return [...core, ...own];
}

// ---------------------------------------------------------------- random
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------- layout (world coordinates)
const CW = 88, CH = 122;                  // card size (large enough to read at the table)
const TK = 44;                            // token size
const SW = CW + 8, SH = CH + 8;           // a card slot or pile
// The River is a square board: three rows of five spaces that wind down the board with two turns
// (0–4 left to right, 5–9 right to left, 10–14 left to right).
// The table, seen from above. Four seats sit around it (bottom, left, top, right, clockwise, so the Oar passes left);
// the shared boards lie in the middle, within everyone's reach: the Book at the head of the table where all can read it,
// the River in the centre, the Loom and Ledger on one side of it, the Mist and the supply on the other.
const WORLD = { w: 2920, h: 2560 };
const RIVER = { x: 1310, y: 1000, w: 900, h: 960, colW: 152, rowH: 310, bank: 82, lane: 92 };
const BOOK = { x: 950, y: 300, w: 1640, h: 660 };
const FATE = { x: 310, y: 300, w: 600, h: 330 };
const MISTA = { x: 310, y: 650, w: 600, h: 340 };
const LOOM = { x: 310, y: 1000, w: 960, h: 340 };
const LEDGER = { x: 310, y: 1360, w: 960, h: 340 };
const SUPPLY = { x: 310, y: 1720, w: 960, h: 480 };
const PLAY = { x: 2250, y: 1000, w: 340, h: 1200 };
const MAT = { w: 760, h: 260 };
const SEATS = [   // where each seat's mat lies and which way it faces
  { cx: WORLD.w / 2, cy: WORLD.h - 20 - MAT.h / 2, rot: 0 },
  { cx: 20 + MAT.h / 2, cy: WORLD.h / 2, rot: 90 },
  { cx: WORLD.w / 2, cy: 20 + MAT.h / 2, rot: 180 },
  { cx: WORLD.w - 20 - MAT.h / 2, cy: WORLD.h / 2, rot: -90 },
];
const SEAT_OF = { 1: [0], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
const seatGeo = p => SEATS[SEAT_OF[S.players][p]];
// a rectangle on a player's mat (mat coordinates) -> the table, turned the way the mat faces
function matRect(p, x, y, w, h) {
  const g = seatGeo(p), r = g.rot * Math.PI / 180;
  const dx = x + w / 2 - MAT.w / 2, dy = y + h / 2 - MAT.h / 2;
  const cx = g.cx + dx * Math.cos(r) - dy * Math.sin(r), cy = g.cy + dx * Math.sin(r) + dy * Math.cos(r);
  const side = Math.abs(g.rot) === 90;
  const W = side ? h : w, H = side ? w : h;
  return [cx - W / 2, cy - H / 2, W, H];
}
// where a space sits on the square board, and which way the river flows through it
function spaceGeo(sp) {
  const row = Math.floor(sp / 5), i = sp % 5;
  const east = row % 2 === 0;
  const col = east ? i : 4 - i;
  const x = RIVER.x + 74 + col * RIVER.colW;
  const top = RIVER.y + 40 + row * RIVER.rowH;
  const laneY = top + RIVER.bank + 8;
  const north = { x: x + 8, y: top }, south = { x: x + 8, y: laneY + RIVER.lane + 8 };
  // facing downstream: flowing east, the left bank is the north one; flowing west, it is the south one
  return { row, col, east, x, top, laneY, left: east ? north : south, right: east ? south : north };
}

// ---------------------------------------------------------------- state
let S = null;            // the shared table
let ME = 0;              // my seat
let mode = "local";      // local | host | guest
let link = null;         // net handle
let hist = [], fut = [];
const LS = "nb-table-v5d";   // the table layout changed: older saved tables do not fit it
const saveLocal = () => { if (mode !== "guest") try { localStorage.setItem(LS, JSON.stringify(S)); } catch { /* full */ } };

const uid = (() => { let n = 0; return p => `${p}${(++n).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`; })();

function blankState(opts) {
  return {
    v: 1, rev: 0, soul: opts.soul, level: opts.level, players: opts.players, names: opts.names,
    items: {}, stacks: {}, hands: Array.from({ length: opts.players }, () => []), where: {}, z: 10,
    chapter: 0, hint: 0, log: [],
    // counters are slider tracks: one marker pushed along a groove (Light, Fractures, knots and scars)
    tracks: { light: 0, crack: 0, knot0: 0, knot1: 0, knot2: 0, scar0: 0, scar1: 0, scar2: 0 },
  };
}
function addItem(kind, props, place) {
  const id = uid(kind[0]);
  S.items[id] = { id, kind, x: 0, y: 0, z: ++S.z, rot: 0, face: 1, ...props };
  if (place?.stack) { S.stacks[place.stack].items.push(id); S.where[id] = "s:" + place.stack; }
  else if (place?.hand !== undefined) { S.hands[place.hand].push(id); S.where[id] = "h:" + place.hand; }
  else { const it = S.items[id]; it.x = place?.x ?? 0; it.y = place?.y ?? 0; S.where[id] = "t"; }
  return id;
}
function addStack(id, props) { S.stacks[id] = { id, items: [], faceUp: false, ...props }; return id; }

// ---------------------------------------------------------------- setup: sort the components onto the table
function newTable(opts) {
  S = blankState(opts);
  buildSnaps(opts.players);
  const soul = opts.soul, st = D.SETUP_TABLE[opts.players];
  // stacks
  addStack("deck", { x: LEDGER.x + 20, y: LEDGER.y + 50, label: ["記憶牌庫", "Memory deck"], accepts: "card" });
  addStack("discard", { x: LEDGER.x + 30 + SW, y: LEDGER.y + 50, label: ["棄牌堆", "Discard"], accepts: "card", faceUp: true });
  addStack("forgot", { x: LEDGER.x + 40 + 2 * SW, y: LEDGER.y + 50, label: ["遺忘堆", "Forgotten"], accepts: "card", faceUp: true, counter: "forgot" });
  addStack("box", { x: LEDGER.x + 20, y: LEDGER.y + 202, label: ["盒中（移出遊戲）", "Box (out of game)"], accepts: "any", faceUp: true });
  for (let r = 0; r < 3; r++) addStack("mist" + r, { x: MISTA.x + 20 + r * (SW + 10), y: MISTA.y + 60, label: [D.DECK_NAMES[r].zh, D.DECK_NAMES[r].en], accepts: "card", showBack: true });
  addStack("mistdis", { x: MISTA.x + 40 + 4 * (SW + 10), y: MISTA.y + 60, label: ["迷霧棄牌", "Mist discard"], accepts: "card", faceUp: true });
  addStack("spare", { x: MISTA.x + 20, y: MISTA.y + 200, label: ["備用板塊", "Spare tiles"], accepts: "tile", faceUp: true, small: true });
  for (let ch = 0; ch < 3; ch++) for (let k = 0; k < 2; k++)
    addStack(`fate${ch}${k}`, { x: FATE.x + 14 + (ch * 2 + k) * SW, y: FATE.y + 190, label: [`第${"一二三"[ch]}章・${k ? "書上" : "河流"}`, `Ch ${ch + 1} · ${k ? "Book" : "River"}`], accepts: "card" });
  addStack("comm", { x: FATE.x + 30 + 3 * SW, y: FATE.y + 44, label: ["託付卡", "Commissions"], accepts: "card" });
  addStack("ending", { x: FATE.x + 40 + 4 * SW, y: FATE.y + 44, label: ["結局牌", "Endings"], accepts: "card" });
  if (opts.players === 1) addStack("ghost", { x: MISTA.x + 140, y: MISTA.y + 200, label: ["幽靈牌庫", "Ghost deck"], accepts: "card", showBack: true });
  const binX = i => SUPPLY.x + 20 + (i % 8) * 116, binY = i => SUPPLY.y + 240 + Math.floor(i / 8) * 130;
  const bins = [["root", ["根／花", "Root / Bloom"], 24], ["shade", ["怨念", "Shade"], 8], ["fog", ["霧標記", "Fog marker"], 6],
    ["hold", ["堅守", "Hold Fast"], 1], ["shield", ["護盾", "Shield"], 1],
    ["resign", ["認命", "Resignation"], 1], ["oar", ["船槳", "Oar"], 1]];
  bins.forEach(([tk, label, n], i) => {
    addStack("bin_" + tk, { x: binX(i), y: binY(i), label, accepts: "tok:" + tk, faceUp: true, bin: true });
    for (let j = 0; j < n; j++) addItem("tok", { tk, face: tk === "root" ? 0 : 1 }, { stack: "bin_" + tk });
  });
  // memory deck
  shuffle(deckIds(soul)).forEach(cid => addItem("card", { ck: "mem:" + cid, face: 0 }, { stack: "deck" }));
  // mist decks (+2 harsh each)
  const harsh = shuffle(D.HARSH_CARDS.map(h => h.key));
  for (let r = 0; r < 3; r++) {
    const keys = [];
    for (const [k, n] of D.MIST_DECKS[r]) for (let i = 0; i < n; i++) keys.push("mist:" + k);
    for (let i = 0; i < D.HARSH_PER_DECK; i++) keys.push("harsh:" + harsh.pop());
    shuffle(keys).forEach(ck => addItem("card", { ck, face: 0 }, { stack: "mist" + r }));
  }
  harsh.forEach(k => addItem("card", { ck: "harsh:" + k, face: 1 }, { stack: "box" }));
  // fate mist: 2 per chapter and kind
  STORY[soul].chapters.forEach((ch, ci) => {
    ch.fates.forEach((f, fi) => addItem("card", { ck: `fate:${soul}:${ci}:${fi}`, face: 0 }, { stack: `fate${ci}${f.river ? 0 : 1}` }));
    for (let k = 0; k < 2; k++) shuffle(S.stacks[`fate${ci}${k}`].items);
  });
  shuffle(STORY[soul].commissions.map((_, i) => i)).forEach(i => addItem("card", { ck: `comm:${soul}:${i}`, face: 0 }, { stack: "comm" }));
  if (soul !== "open") ["0", "1", "2", "mix", "hidden"].forEach(k => addItem("card", { ck: `end:${soul}:${k}`, face: 0 }, { stack: "ending" }));
  if (opts.players === 1) shuffle(D.GHOST.map((_, i) => i)).forEach(i => addItem("card", { ck: "ghost:" + i, face: 0 }, { stack: "ghost" }));
  // soul card, mantles
  addItem("card", { ck: "soul:" + soul, face: 1 }, { x: FATE.x + 14 + SW / 2, y: FATE.y + 44 + SH / 2 });
  D.MANTLES.forEach((m, i) => addItem("card", { ck: "mantle:" + m.key, face: 1 }, snapPos(`mantle${i}`)));
  // tiles: each Reach draws from its pool, adds its graves, and fills its banks face down
  D.TILE_POOLS.forEach((p, r) => {
    const graves = p.graves ?? st.graves;
    const banks = p.spaces.length * 2;
    const pool = shuffle(Object.entries(p.pool).flatMap(([k, n]) => Array(n).fill(k)));
    const tiles = shuffle([...Array(graves).fill("grave"), ...pool.slice(0, banks - graves)]);
    pool.slice(banks - graves).forEach(k => addItem("tile", { tk: k, face: 0 }, { stack: "box" }));
    p.spaces.forEach((sp, i) => {
      addItem("tile", { tk: tiles[2 * i], face: 0 }, snapPos(`bank${sp}L`));
      addItem("tile", { tk: tiles[2 * i + 1], face: 0 }, snapPos(`bank${sp}R`));
    });
  });
  Object.entries(D.SPARE_TILES).forEach(([k, n]) => { for (let i = 0; i < n; i++) addItem("tile", { tk: k, face: 1 }, { stack: "spare" }); });
  // markers that start on a board
  addItem("tok", { tk: "soul" }, snapPos("soul0"));
  addItem("tok", { tk: "echo" }, snapPos("echoS"));
  for (let i = 0; i < D.LEVELS[opts.level].bw; i++) addItem("tok", { tk: "bw" }, snapPos(`bwsup${i}`));
  for (let p = 0; p < opts.players; p++) addItem("tok", { tk: "push", face: 1 }, snapPos(`mat${p}push`));
  S.log.push({ t: Date.now(), who: -1, m: tr("新的一局", "New game") });
}

// ---------------------------------------------------------------- snap points (built with the boards)
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
    snap(`soul${sp}`, g.x + 4, g.laneY + 2, 52, R.lane - 4, ["tok"]);
    snap(`water${sp}`, g.x + 60, g.laneY + 2, 52, R.lane - 4, ["tok"]);
  }
  // mist front
  snap("mistfront", MISTA.x + 30 + 3 * (SW + 10), MISTA.y + 60, SW, SH, ["card"]);
  // loom
  for (let t = 0; t < 3; t++) {
    const y = LOOM.y + 60 + t * 88;
    for (let k = 0; k <= 12; k++) snap(`knot${t}_${k}`, LOOM.x + 110 + k * 38, y, 36, 40, []);
    for (let k = 0; k <= 2; k++) snap(`scar${t}_${k}`, LOOM.x + 610 + k * 32, y, 30, 40, []);
    snap(`echo${t}`, LOOM.x + 84, y + 2, 32, 36, ["tok"]);
  }
  snap("echoS", LOOM.x + 20, LOOM.y + 300, 40, 32, ["tok"]);
  // ledger
  for (let k = 0; k <= 12; k++) snap(`light${k}`, LEDGER.x + 352 + k * 46, LEDGER.y + 56, 44, 44, []);
  for (let k = 0; k <= 5; k++) snap(`crack${k}`, LEDGER.x + 352 + k * 48, LEDGER.y + 156, 44, 44, []);
  for (let k = 0; k < 7; k++) snap(`bwsup${k}`, LEDGER.x + 352 + k * 48, LEDGER.y + 240, 44, 44, ["tok"]);
  // mantle row, fate slots
  // the Mantle row sits along the top of the supply panel
  D.MANTLES.forEach((_, i) => snap(`mantle${i}`, SUPPLY.x + 20 + i * (SW + 12), SUPPLY.y + 56, SW, SH, ["card"]));
  for (let k = 0; k < 2; k++) snap(`fateslot${k}`, FATE.x + 20 + (k + 1) * SW, FATE.y + 44, SW, SH, ["card"]);
  // book nodes
  for (let ch = 0; ch < 3; ch++) for (const n of bookLayout(S.soul, ch)) {
    if (n.k === "m" || n.k === "g") snap(`node${ch}_${n.id}`, n.x, n.y, CW + 8, CH + 8, ["card"]);
    if (n.k === "x") snap(`node${ch}_${n.id}`, n.x, n.y, CW + 8, CH + 8, ["card"]);
    if (n.k === "f") snap(`node${ch}_${n.id}`, n.x, n.y, CW + 8, CH + 8, ["card"]);
  }
  // player mats
  for (let p = 0; p < players; p++) {
    snap(`mat${p}comm`, ...matRect(p, 30, 60, CW + 8, CH + 8), ["card"]);
    snap(`mat${p}mantle`, ...matRect(p, 140, 60, CW + 8, CH + 8), ["card"]);
    snap(`mat${p}push`, ...matRect(p, 254, 96, 60, 60), ["tok"]);
    for (let k = 0; k < 4; k++) snap(`mat${p}keep${k}`, ...matRect(p, 340 + k * 102, 60, SW, SH), ["card"]);
  }
}

// ---------------------------------------------------------------- the book: route graph layout
const layoutCache = {};
function bookLayout(soul, ch) {
  const key = soul + ch;
  if (layoutCache[key]) return layoutCache[key];
  const page = STORY[soul].chapters[ch];
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
  const colW = Math.min(150, (BOOK.w - 260) / ncol);
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
    const f = STORY[a].chapters[+b].fates[+c];
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
    const k = STORY[a].commissions[+b];
    return { cls: "comm", html: `<div class="c-top"><b>${tr("託付", "Commission")}</b></div><div class="c-band">${esc(k.text)}</div><div class="c-eff">${esc(k.cond)}</div>`,
      backHtml: `<div class="gback">${tr("託付", "Commission")}</div>`, title: tr("託付卡", "Commission") };
  }
  if (type === "end") {
    const s = STORY[a];
    const e = b === "hidden" ? s.hidden : s.endings[b];
    const label = b === "hidden" ? tr("隱藏結局", "Hidden ending") : b === "mix" ? tr("交織", "Interwoven") : tr(D.THREADS[+b].zh, D.THREADS[+b].en);
    return { cls: "ending", html: `<div class="c-top"><b>${esc(e.title)}</b></div><div class="c-slot">${label}</div><div class="c-band small">${esc(e.text)}</div>`,
      backHtml: `<div class="gback">${tr("結局", "Ending")}${b === "hidden" ? `<div class="c-cond">${s.hidden.conds.map(esc).join("<br>")}</div>` : `<small>${label}</small>`}</div>`, title: e.title };
  }
  if (type === "soul") {
    const s = STORY[a];
    return { cls: "soulc", art: D.SOUL_ART[a], html: `<div class="c-top"><b>${esc(s.name)}</b></div><div class="c-eff">${esc(s.trait)}</div>${s.keymem ? `<div class="c-res"><span>${tr("關鍵記憶", "Key memory")}</span>${esc(s.keymem)}</div>` : ""}`, back: "back-soul", title: s.name };
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
    return { cls: `card ${info.cls}`, html: art + info.html, title: info.title };
  }
  if (it.kind === "tile") {
    const k = D.TILE_KINDS[it.tk];
    if (!it.face) return { cls: "tile fogside", html: `${icon("nb-fog")}`, title: tr("霧面板塊", "Fog-side tile") };
    return { cls: `tile t-${it.tk}`, html: `${icon(k.icon)}<b>${esc(tr(k.zh, k.en))}</b><small>${esc(tr(k.tz, k.te))}</small>`, title: tr(k.zh, k.en) };
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
    const g0 = spaceGeo(row * 5), y = g0.laneY - R.y + R.lane / 2;
    water += `<path d="M${74 - 20},${y} H${74 + 5 * R.colW - 22}"/>`;
    if (row < 2) {   // the turn: down the right side after row 0, down the left side after row 1
      const y2 = spaceGeo((row + 1) * 5).laneY - R.y + R.lane / 2;
      const xe = row === 0 ? 74 + 5 * R.colW - 22 : 54;
      const bulge = row === 0 ? 70 : -40;
      water += `<path d="M${xe},${y} C${xe + bulge},${y} ${xe + bulge},${y2} ${xe},${y2}"/>`;
    }
  }
  h += `<svg class="riverwater" width="${R.w}" height="${R.h}"><g>${water}</g></svg>`;
  for (let sp = 0; sp <= 14; sp++) {
    const g = spaceGeo(sp);
    const reach = sp <= 4 ? 0 : sp <= 8 ? 1 : 2;
    const lx = g.x - R.x, ly = g.laneY - R.y;
    h += `<div class="lane reach${reach}${sp === 0 || sp === 14 ? " shore" : ""}" style="left:${lx}px;top:${ly}px;width:${R.colW - 34}px;height:${R.lane}px">
      <span class="spn">${sp === 0 ? tr("此岸 0", "Near 0") : sp === 14 ? tr("彼岸 14", "Far 14") : sp}</span><span class="flow">${g.east ? "→" : "←"}</span>
      ${sp === 5 ? `<span class="hintmark">${tr("故事應該寫到第二章", "Story: ch. 2")}</span>` : ""}
      ${sp === 9 ? `<span class="hintmark">${tr("故事應該寫到第三章", "Story: ch. 3")}</span>` : ""}
      ${sp === 13 ? `<span class="gate">${tr("彼岸的門", "Gate")}</span>` : ""}</div>`;
    if (sp >= 1 && sp <= 13) for (const side of ["left", "right"]) {
      const b = g[side];
      h += `<div class="bankslot" style="left:${b.x - R.x}px;top:${b.y - R.y}px;width:${R.bank}px;height:${R.bank}px"><i>${side === "left" ? tr("左", "L") : tr("右", "R")}</i></div>`;
    }
  }
  h += [[1, 0], [5, 1], [10, 2]].map(([sp, r]) => { const g = spaceGeo(sp); return `<div class="reachname" style="left:${g.x - R.x}px;top:${g.top - R.y - 22}px">${tr(`第${"一二三"[r]}河段・${D.REACHES[r].zh}`, `Reach ${r + 1} · ${D.REACHES[r].en}`)}${r === 1 ? tr("（第 5–8 格）", " (5–8)") : r === 2 ? tr("（第 9–13 格）", " (9–13)") : ""}</div>`; }).join("");
  h += `</div>`;
  // mist area
  h += `<div class="board mista" data-region="mist" style="left:${MISTA.x}px;top:${MISTA.y}px;width:${MISTA.w}px;height:${MISTA.h}px">${zoomBtn("mist")}
    <div class="btitle">${tr("迷霧", "Mist")}</div><div class="slotbox" style="left:${30 + 3 * (SW + 10)}px;top:60px;width:${SW}px;height:${SH}px">${tr("前方的霧（面朝上）", "Mist ahead (face up)")}</div></div>`;
  // loom
  const th = D.thresholds(S.level, S.players);
  h += `<div class="board loom" data-region="loom" style="left:${LOOM.x}px;top:${LOOM.y}px;width:${LOOM.w}px;height:${LOOM.h}px">${zoomBtn("loom")}
    <div class="btitle">${tr("命運織機", "Loom of the Fates")}</div>
    <div class="lab" style="left:110px;top:36px">${tr("結", "Knots")}</div><div class="lab" style="left:610px;top:36px">${tr("傷疤", "Scars")}</div>
    <div class="lab" style="left:714px;top:36px">${tr("反噬（第一／二／三級）", "Backlash (I / II / III)")}</div>`;
  for (let t = 0; t < 3; t++) {
    const y = 60 + t * 88;
    h += `<div class="thread th${t}" style="top:${y}px">${icon(D.THREADS[t].icon)}${tr(D.THREADS[t].zh, D.THREADS[t].en)}</div>`;
    h += `<div class="groove" style="left:110px;top:${y + 17}px;width:${12 * 38 + 36}px"></div>`;
    for (let k = 0; k <= 12; k++) h += `<div class="cell tcell${th.includes(k) ? " lim" : ""}" data-track="knot${t}" data-val="${k}" style="left:${110 + k * 38}px;top:${y}px;width:36px">${k}${k === th[0] ? `<i>${th[0]}</i>` : ""}</div>`;
    h += `<div class="groove" style="left:610px;top:${y + 17}px;width:94px"></div>`;
    for (let k = 0; k <= 2; k++) h += `<div class="cell scar tcell" data-track="scar${t}" data-val="${k}" style="left:${610 + k * 32}px;top:${y}px;width:30px">${k}</div>`;
    h += `<div class="blash" style="top:${y - 4}px">${D.BACKLASH[t].map((s, i) => `<div><b>${"ⅠⅡⅢ"[i]}</b>${esc(s)}</div>`).join("")}</div>`;
  }
  h += `<div class="lab" style="left:20px;top:284px">${tr("沉默格", "Silent")}</div>
    <div class="note" style="left:120px;top:300px">${tr(`門檻 ${th[0]}／${th[1]}／${th[2]}（0／1／2 道傷疤）。霧痕：同絲線反噬升一級。`, `Threshold ${th.join(" / ")} (0 / 1 / 2 scars). Mist scars raise that thread's Backlash one level.`)}</div></div>`;
  // book: one open page; tabs flip through the chapters
  h += `<div class="board bookp" data-region="book" id="tt-book" style="left:${BOOK.x}px;top:${BOOK.y}px;width:${BOOK.w}px;height:${BOOK.h}px"></div>`;
  // ledger
  h += `<div class="board ledger" data-region="ledger" style="left:${LEDGER.x}px;top:${LEDGER.y}px;width:${LEDGER.w}px;height:${LEDGER.h}px">${zoomBtn("ledger")}
    <div class="btitle">${tr("渡帳", "Ledger")}</div>
    <div class="lab" style="left:352px;top:34px">${icon("nb-rays")} ${tr("光（推動或點選格子）", "Light (push the marker or click a cell)")}</div>
    <div class="groove" style="left:352px;top:76px;width:${12 * 46 + 44}px"></div>`;
  for (let k = 0; k <= 12; k++) h += `<div class="cell round tcell" data-track="light" data-val="${k}" style="left:${352 + k * 46}px;top:56px;width:44px;height:44px">${k}</div>`;
  h += `<div class="lab" style="left:352px;top:134px">${tr(`裂痕（${lv.fractures} 道破碎）`, `Fractures (${lv.fractures} = Shattered)`)}</div>
    <div class="groove" style="left:352px;top:176px;width:${lv.fractures * 48 + 44}px"></div>`;
  for (let k = 0; k <= lv.fractures; k++) h += `<div class="cell round tcell crack${k === lv.fractures ? " lim" : ""}" data-track="crack" data-val="${k}" style="left:${352 + k * 48}px;top:156px;width:44px;height:44px">${k === lv.fractures ? tr("碎", "✕") : k}</div>`;
  h += `<div class="lab" style="left:352px;top:218px">${tr(`黑水供應（${lv.bw} 個）`, `Black Water supply (${lv.bw})`)}</div>`;
  for (let k = 0; k < lv.bw; k++) h += `<div class="cell round" style="left:${352 + k * 48}px;top:240px;width:44px;height:44px"></div>`;
  h += `<div class="note" style="left:140px;top:300px;right:20px">${tr(`消散門檻：遺忘 ${lv.dissolve} 張。輕如灰燼 6、漂離 9。忘川的拉力：第一／二／三章 ${PULL.join("／")} 張。`, `Faded at ${lv.dissolve} forgotten. Light as Ash 6, Adrift 9. Pull of Lethe: ${PULL.join(" / ")}.`)}</div></div>`;
  // fate area
  h += `<div class="board fatea" data-region="fate" style="left:${FATE.x}px;top:${FATE.y}px;width:${FATE.w}px;height:${FATE.h}px">${zoomBtn("fate")}
    <div class="btitle">${tr("亡魂・命運之霧・託付", "Soul · Fate · Commissions")}</div>
    ${[0, 1].map(k => `<div class="slotbox" style="left:${20 + (k + 1) * SW}px;top:44px;width:${SW}px;height:${SH}px">${tr(`本章的命運之霧 ${k + 1}（條件面朝上）`, `This chapter's fate ${k + 1} (condition up)`)}</div>`).join("")}</div>`;
  // supply
  h += `<div class="board supply" data-region="supply" style="left:${SUPPLY.x}px;top:${SUPPLY.y}px;width:${SUPPLY.w}px;height:${SUPPLY.h}px">${zoomBtn("supply")}<div class="btitle">${tr("稱號列與供應區", "Mantles and supply")}</div>
    <div class="lab" style="left:20px;top:200px">${tr("供應區（拖曳拿取；拖回放回）", "Supply (drag to take, drag back to return)")}</div></div>`;
  // mats
  // play area in front of the River (cards being played, persistent cards)
  h += `<div class="board playarea" data-region="play" style="left:${PLAY.x}px;top:${PLAY.y}px;width:${PLAY.w}px;height:${PLAY.h}px">${zoomBtn("play")}<div class="btitle">${tr("出牌區", "Play area")}</div></div>`;
  for (let p = 0; p < S.players; p++) {
    const g = seatGeo(p);
    h += `<div class="board mat" data-region="mat${p}" style="left:${g.cx - MAT.w / 2}px;top:${g.cy - MAT.h / 2}px;width:${MAT.w}px;height:${MAT.h}px;transform:rotate(${g.rot}deg)">${zoomBtn(`mat${p}`)}
      <div class="btitle">${esc(S.names[p] || tr(`擺渡人 ${p + 1}`, `Ferryman ${p + 1}`))}</div>
      <div class="lab" style="left:30px;top:40px">${tr("託付（面朝下）", "Commission (face down)")}</div><div class="lab" style="left:140px;top:40px">${tr("稱號", "Mantle")}</div>
      <div class="lab" style="left:250px;top:58px">${tr("破浪", "Push")}</div><div class="lab" style="left:340px;top:40px">${tr("持續中的牌", "Lasting cards")}</div>
      <div class="handcount" data-hc="${p}"></div></div>`;
  }
  return h;
}

function bookPageHtml(ch) {
  const page = STORY[S.soul].chapters[ch];
  const px = BOOK.x;
  const nodes = bookLayout(S.soul, ch);
  const pos = Object.fromEntries(nodes.map(n => [n.id, n]));
  const entry = typeof page.entry === "string" ? esc(page.entry) : Object.entries(page.entry).map(([t, s]) => `<b class="th${t}">${tr(D.THREADS[t].zh, D.THREADS[t].en)}</b> ${esc(s)}`).join("<br>");
  let lines = "";
  const ctr = n => [n.x - px + (CW + 8) / 2, n.y - BOOK.y + (CH + 8) / 2];
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
  const tabs = STORY[S.soul].chapters.map((c, i) => `<button class="booktab${i === ch ? " on" : ""}" data-view="${i}">${S.chapter === i ? "★ " : ""}${tr(`第${"一二三"[i]}章`, `Chapter ${i + 1}`)}・${esc(c.title)}</button>`).join("");
  const here = S.chapter === ch
    ? `<span class="curnote">★ ${tr("目前的章節", "The chapter in play")}</span>`
    : `<button class="chbtn" data-ch="${ch}">${tr("把這章設為目前的章節（翻頁）", "Make this the chapter in play (turn the page)")}</button>`;
  return `${zoomBtn("book")}<div class="btitle">${tr("憶念之書", "Book of Remembrance")} <span class="booktabs">${tabs}</span> ${here}</div>
    ${S.chapter !== ch ? `<div class="browse">${tr("你正在翻閱其他章節；放在這頁的牌只會在這頁顯示。", "You are browsing another chapter; cards placed here only show on this page.")}</div>` : ""}
    <div class="entry">${entry}</div>
    <svg class="arrows" width="${BOOK.w}" height="${BOOK.h}"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#9a948c"/></marker></defs>${lines}</svg>
    ${cells}`;
}

let bookView = 0, lastChapter = 0;
function renderBook() {
  const el = $("#tt-book");
  if (!el) return;
  if (S.chapter !== lastChapter) { lastChapter = S.chapter; bookView = S.chapter; }
  const sig = `${bookView}|${S.chapter}|${LANG}`;
  if (el._sig === sig) return;
  el._sig = sig;
  el.innerHTML = bookPageHtml(bookView);
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
}
const zoomBtn = region => `<button class="zoombtn" data-zoom="${region}" title="${tr("放大這一區（再按「全桌」回到全景）", "Zoom to this section (press Fit for the whole table)")}">⌕</button>`;

function buildTable() {
  const app = $("#app");
  app.innerHTML = `
    <div class="tt-bar">
      <span class="brand">${icon("nb-bloom")}${tr("彼岸花渡・桌面", "Netherbloom · Table")}</span>
      <span class="muted">${esc(STORY[S.soul].name)}・${tr(D.LEVELS[S.level].zh, D.LEVELS[S.level].en)}・${S.players}${tr(" 人", "p")}</span>
      <span id="tt-code" class="muted"></span>
      <span class="sp"></span>
      <div id="tt-seats" class="seats"></div>
      <label class="switch"><input type="checkbox" id="tt-hints"> <span>${tr("下一步提示", "Next-step hints")}</span></label>
      <button id="tt-undo" title="Ctrl+Z">${tr("復原", "Undo")}</button>
      <button id="tt-redo" title="Ctrl+Y">${tr("重做", "Redo")}</button>
      <button id="tt-fit">${tr("全桌", "Fit")}</button>
      <button id="tt-rules">${tr("規則書", "Rulebook")}</button>
      <button id="tt-log">${tr("紀錄", "Log")}</button>
      <button id="tt-menu">${tr("選單", "Menu")}</button>
    </div>
    <div class="tt-view" id="tt-view"><div class="tt-world" id="tt-world" style="width:${WORLD.w}px;height:${WORLD.h}px">
      <div class="felt"></div><div id="tt-boards"></div><div id="tt-items"></div></div></div>
    <div class="tt-hand" id="tt-hand"><div class="hand-title"></div><div class="hand-cards"></div></div>
    <aside class="tt-hint hidden" id="tt-hint"></aside>
    <aside class="tt-drawer hidden" id="tt-drawer"></aside>
    <div class="tt-menu hidden" id="tt-ctx"></div>
    <div class="tt-cover hidden" id="tt-cover"></div>
    <div class="tt-modal hidden" id="tt-modal"></div>`;
  elWorld = $("#tt-world"); elTable = $("#tt-items"); elHand = $("#tt-hand"); elHint = $("#tt-hint"); elMenu = $("#tt-ctx"); elSeats = $("#tt-seats");
  for (const k in els) delete els[k];
  for (const k in stackEls) delete stackEls[k];
  buildSnaps(S.players);
  bookView = lastChapter = S.chapter;
  $("#tt-boards").innerHTML = boardsHtml();
  bindTable();
  let hintsOn = false;
  try { hintsOn = localStorage.getItem("nb-hints") === "1"; } catch { /* */ }
  $("#tt-hints").checked = hintsOn;
  elHint.classList.toggle("hidden", !hintsOn);
  fit();
  render();
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
    if (!el) { el = document.createElement("div"); el.dataset.id = id; elTable.appendChild(el); els[id] = el; }
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
    el.style.transform = `translate(${it.x - w / 2}px,${it.y - hgt / 2}px) rotate(${it.rot}deg)`;
    el.style.zIndex = it.kind === "tile" ? 2 + (it.z % 1000) : it.kind === "card" ? 1000 + it.z : 3000 + it.z;
    el.classList.toggle("unlit", it.kind === "card" && it.rot === 90);
  }
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
    const w = tokenBin ? 92 : st.small ? 86 : CW + 8, h = tokenBin ? 92 : st.small ? 86 : CH + 8;
    el.style.left = st.x + "px"; el.style.top = st.y + "px"; el.style.width = w + "px"; el.style.height = h + "px";
    const sig = `${top}|${it?.face}|${st.faceUp}|${st.items.length}|${LANG}`;
    if (el._sig !== sig) {
      let inner = "";
      if (it) {
        const r = itemHtml(it.kind === "card" ? { ...it, face: st.faceUp ? 1 : 0 } : { ...it, face: it.tk === "root" ? 0 : it.face });
        inner = `<div class="piece ${r.cls}" style="position:absolute;left:4px;top:4px;width:${w - 8}px;height:${h - 8}px">${r.html}</div>`;
      }
      el.innerHTML = `${inner}<div class="slabel">${esc(tr(...st.label))}</div><div class="scount">${st.items.length}</div>`;
      el._sig = sig;
    }
  }
  renderTracks();
  // hand
  renderHand();
  // seats & counts
  elSeats.innerHTML = S.names.map((n, i) => `<button class="seat${i === ME ? " me" : ""}" data-seat="${i}" title="${tr("手牌", "Hand")} ${S.hands[i].length}">${esc(n || tr(`擺渡人 ${i + 1}`, `Ferryman ${i + 1}`))} <b>${S.hands[i].length}</b></button>`).join("");
  document.querySelectorAll("[data-hc]").forEach(e => { const p = +e.dataset.hc; e.textContent = tr(`手牌 ${S.hands[p].length} 張`, `${S.hands[p].length} cards in hand`); });
  renderBook();
  renderHint();
}

// ---------------------------------------------------------------- slider tracks
const TRACK_ICON = { light: ["nb-rays", "lightm"], crack: ["nb-fracture", "crack"] };
const trackMax = id => (id === "light" ? 12 : id === "crack" ? D.LEVELS[S.level].fractures : id.startsWith("scar") ? 2 : 12);
const trackSnap = (id, v) => snapById[id.startsWith("knot") || id.startsWith("scar") ? `${id}_${v}` : `${id}${v}`];
const trackName = id => (id === "light" ? tr("光", "Light") : id === "crack" ? tr("裂痕", "Fractures")
  : `${tr(id.startsWith("knot") ? "結" : "傷疤", id.startsWith("knot") ? "Knots" : "Scars")}（${tr(D.THREADS[+id.slice(-1)].zh, D.THREADS[+id.slice(-1)].en)}）`);
const markerEls = {};
function renderTracks() {
  S.tracks ||= { light: 0, crack: 0, knot0: 0, knot1: 0, knot2: 0, scar0: 0, scar1: 0, scar2: 0 };
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
    el.title = `${trackName(id)}：${S.tracks[id]}`;
    el.style.width = el.style.height = TK + "px";
    el.style.transform = `translate(${sn.x + sn.w / 2 - TK / 2}px,${sn.y + sn.h / 2 - TK / 2}px)`;
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

function renderHand() {
  const list = S.hands[ME] || [];
  elHand.querySelector(".hand-title").innerHTML = `${tr("你的手牌", "Your hand")}（${esc(S.names[ME] || "")}）<small>${tr("拖到桌上打出；拖回這裡收回。右鍵看更多動作。", "Drag to the table to play; drag back to keep. Right-click for more.")}</small>`;
  const box = elHand.querySelector(".hand-cards");
  box.innerHTML = list.map(id => {
    const r = itemHtml({ ...S.items[id], face: 1 });
    return `<div class="piece hcard ${r.cls}" data-hid="${id}" title="${esc(r.title)}" style="width:${CW * 1.4}px;height:${CH * 1.4}px">${r.html}</div>`;
  }).join("") || `<div class="muted empty">${tr("（沒有手牌）", "(no cards)")}</div>`;
}

// ---------------------------------------------------------------- changes
function commit(msg, fn) {
  hist.push(JSON.stringify(S));
  if (hist.length > 80) hist.shift();
  fut = [];
  fn();
  S.rev++;
  if (msg) { S.log.push({ t: Date.now(), who: ME, m: msg }); if (S.log.length > 120) S.log.shift(); }
  changed();
}
function changed() { saveLocal(); render(); sync(); }
function undo() { if (!hist.length) return; fut.push(JSON.stringify(S)); S = JSON.parse(hist.pop()); S.rev = Date.now(); changed(); toast(tr("已復原", "Undone")); }
function redo() { if (!fut.length) return; hist.push(JSON.stringify(S)); S = JSON.parse(fut.pop()); S.rev = Date.now(); changed(); }

function detach(id) {
  delete S.items[id].pg;
  const w = S.where[id];
  if (!w) return;
  if (w.startsWith("s:")) { const st = S.stacks[w.slice(2)]; st.items = st.items.filter(x => x !== id); }
  if (w.startsWith("h:")) { const h = S.hands[+w.slice(2)]; S.hands[+w.slice(2)] = h.filter(x => x !== id); }
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
const nameOf = id => { const it = S.items[id]; return it.kind === "card" ? (it.face ? cardInfo(it.ck).title : tr("一張牌", "a card")) : itemHtml(it).title; };
const who = () => S.names[ME] || tr(`擺渡人 ${ME + 1}`, `Ferryman ${ME + 1}`);

// ---------------------------------------------------------------- interaction
let drag = null;
// the world is drawn turned by view.r around its centre, so a seat on any side can sit at the bottom of the screen
const viewMatrix = () => new DOMMatrix().translate(view.x, view.y).scale(view.s).translate(WORLD.w / 2, WORLD.h / 2).rotate(view.r).translate(-WORLD.w / 2, -WORLD.h / 2);
function worldPt(e) {
  const r = $("#tt-view").getBoundingClientRect();
  const q = viewMatrix().inverse().transformPoint(new DOMPoint(e.clientX - r.left, e.clientY - r.top));
  return { x: q.x, y: q.y };
}
function applyView() { elWorld.style.transform = viewMatrix().toString(); }
function fit() {
  const r = $("#tt-view").getBoundingClientRect();
  view.r = 0;   // everyone sees the same fixed table
  const side = Math.abs(view.r) === 90;
  const W = side ? WORLD.h : WORLD.w, H = side ? WORLD.w : WORLD.h;
  view.s = Math.min(r.width / W, r.height / H) * 0.98;
  // centre the (turned) table in the window
  view.x = r.width / 2 - WORLD.w / 2 * view.s; view.y = r.height / 2 - WORLD.h / 2 * view.s;
  applyView();
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
  v.addEventListener("click", e => { const z = e.target.closest(".zoombtn"); if (z) { e.stopPropagation(); zoomTo(z.dataset.zoom); } });
  if (!bindTable.once) {   // the window outlives every table: listen to it only once
    bindTable.once = true;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }
  v.addEventListener("dblclick", e => {
    const p = e.target.closest(".piece[data-id]");
    if (p) flip(p.dataset.id);
    const s = e.target.closest(".stack");
    if (s && !p) drawToHand(s.dataset.stack);
  });
  v.addEventListener("contextmenu", e => { e.preventDefault(); openMenu(e); });
  elHand.addEventListener("pointerdown", e => {
    const c = e.target.closest("[data-hid]");
    if (!c || e.button !== 0) return;
    e.preventDefault();
    drag = { pending: true, id: c.dataset.hid, from: "hand", sx: e.clientX, sy: e.clientY };
  });
  elHand.addEventListener("contextmenu", e => { e.preventDefault(); openMenu(e); });
  $("#tt-undo").onclick = undo; $("#tt-redo").onclick = redo; $("#tt-fit").onclick = fit;
  $("#tt-rules").onclick = () => openDrawer("rules");
  $("#tt-log").onclick = () => openDrawer("log");
  $("#tt-menu").onclick = () => {
    if (mode !== "local" && !confirm(tr("離開這張線上桌？其他人會和你斷線。", "Leave this online table? The others lose their link to you."))) return;
    showMenuScreen();
  };
  $("#tt-hints").onchange = e => { try { localStorage.setItem("nb-hints", e.target.checked ? "1" : "0"); } catch { /* */ } elHint.classList.toggle("hidden", !e.target.checked); renderHint(); };
  elSeats.onclick = e => { const b = e.target.closest("[data-seat]"); if (b && mode === "local") switchSeat(+b.dataset.seat); };
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
  const mk = e.target.closest(".tmarker");
  if (mk) { e.preventDefault(); drag = { track: mk.dataset.track, el: mk }; mk.classList.add("dragging"); return; }
  const tc = e.target.closest(".tcell");
  if (tc) { setTrack(tc.dataset.track, +tc.dataset.val); return; }
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
    if (it.kind === "card") it.face = from === "hand" ? 1 : st && st.faceUp ? 1 : 0;
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
    drag.el.style.transform = `translate(${sn.x + sn.w / 2 - TK / 2}px,${sn.y + sn.h / 2 - TK / 2}px)`;
    return;
  }
  if (drag.pan) { view.x = drag.ox + e.clientX - drag.sx; view.y = drag.oy + e.clientY - drag.sy; applyView(); return; }
  if (drag.stackMove) {
    const st = S.stacks[drag.stackMove];
    const pt = worldPt(e);
    st.x = drag.ox + pt.x - drag.wx; st.y = drag.oy + pt.y - drag.wy;
    stackEls[st.id].style.left = st.x + "px"; stackEls[st.id].style.top = st.y + "px"; return;
  }
  const pt = worldPt(e);
  const it = S.items[drag.id];
  if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 3) drag.moved = true;
  it.x = pt.x - drag.dx; it.y = pt.y - drag.dy;
  const el = els[drag.id];
  if (el) {
    const w = parseFloat(el.style.width), h = parseFloat(el.style.height);
    el.style.transform = `translate(${it.x - w / 2}px,${it.y - h / 2}px) rotate(${it.rot}deg)`;
    el.style.zIndex = 9000;
  }
  elHand.classList.toggle("drop", overHand(e));
}
const overHand = e => { const r = elHand.getBoundingClientRect(); return e.clientY > r.top && e.clientX > r.left && e.clientX < r.right; };

function onUp(e) {
  touches.delete(e.pointerId);
  if (drag?.pinch) { if (touches.size < 2) drag = null; return; }
  if (!drag) return;
  const d = drag; drag = null;
  elHand.classList.remove("drop");
  if (d.pending) return;   // a click on a pile or a hand card moves nothing
  if (d.track) { d.el.classList.remove("dragging"); if (d.val !== undefined) setTrack(d.track, d.val); else render(); return; }
  if (d.pan) return;
  if (d.stackMove) { hist.push(d.snapshot); fut = []; S.rev++; changed(); return; }
  const it = S.items[d.id];
  els[d.id]?.classList.remove("dragging");
  if (!d.moved && d.from === "table") return render();
  hist.push(d.snapshot); if (hist.length > 80) hist.shift(); fut = [];
  let msg = "";
  if (overHand(e) && it.kind === "card") {
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
    const w = tokenBin ? 92 : st.small ? 86 : CW + 8, h = tokenBin ? 92 : st.small ? 86 : CH + 8;
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
  const opts = [];
  const p = e.target.closest(".piece[data-id]");
  const hc = e.target.closest("[data-hid]");
  const s = e.target.closest(".stack");
  if (hc) {
    const id = hc.dataset.hid;
    opts.push([tr("面朝上放到桌上", "Place face up"), () => commit(tr(`${who()} 打出 ${nameOf(id)}`, `${who()} played ${nameOf(id)}`), () => { const pt = centerView(); toTable(id, pt.x, pt.y); S.items[id].face = 1; })]);
    opts.push([tr("面朝下放到桌上", "Place face down"), () => commit(tr(`${who()} 背面打出 1 張牌`, `${who()} played a card face down`), () => { const pt = centerView(); toTable(id, pt.x, pt.y); S.items[id].face = 0; })]);
    for (let q = 0; q < S.players; q++) if (q !== ME) opts.push([tr(`交給 ${S.names[q]}（換牌）`, `Give to ${S.names[q]} (swap)`), () => commit(tr(`${who()} 交給 ${S.names[q]} 1 張牌`, `${who()} gave ${S.names[q]} a card`), () => toHand(id, q))]);
    opts.push([tr("放到記憶牌庫底", "Put on the bottom of the deck"), () => commit(tr(`${who()} 把 1 張牌放到牌庫底`, `${who()} put a card on the bottom of the deck`), () => toStack(id, "deck", true))]);
  } else if (p) {
    const id = p.dataset.id, it = S.items[id];
    if (it.kind !== "tok" || ["root", "push"].includes(it.tk)) opts.push([tr("翻面（F）", "Flip (F)"), () => flip(id)]);
    if (it.kind === "card") {
      opts.push([it.rot ? tr("轉正（R）", "Turn upright (R)") : tr("橫放（R）", "Turn sideways (R)"), () => rotate(id)]);
      if (!it.face) opts.push([tr("偷看（只有你看到）", "Peek (only you)"), () => peek(id)]);
      opts.push([tr("放進我的手牌", "Take into my hand"), () => commit(tr(`${who()} 拿了 1 張牌到手牌`, `${who()} took a card`), () => toHand(id, ME))]);
      opts.push([tr("放大檢視", "Look closer"), () => zoomCard(id)]);
    }
    opts.push([tr("放回盒中（移出遊戲）", "Return to the box"), () => commit(tr(`${who()} 把 ${nameOf(id)} 移出遊戲`, `${who()} removed ${nameOf(id)}`), () => toStack(id, "box"))]);
  } else if (s) {
    const sid = s.dataset.stack, st = S.stacks[sid];
    const cards = st.accepts === "card" || st.accepts === "any";
    if (cards && st.items.length) {
      opts.push([tr("抽 1 張到手牌", "Draw 1 into my hand"), () => drawToHand(sid)]);
      opts.push([tr("翻開頂牌放到桌上", "Turn the top card onto the table"), () => commit(tr(`${who()} 翻開${tr(...st.label)}的頂牌`, `${who()} turned the top of ${tr(...st.label)}`), () => {
        const top = st.items[st.items.length - 1];
        // a Mist card goes to the "Mist ahead" slot; anything else to the middle of the view, clear of other piles
        const pt = /^mist\d$/.test(sid) ? snapPos("mistfront") : centerView();
        toTable(top, pt.x, pt.y); S.items[top].face = 1;
      })]);
      opts.push([tr("每人發 1 張", "Deal 1 to each player"), () => commit(tr(`${who()} 從${tr(...st.label)}每人發 1 張`, `${who()} dealt 1 card each`), () => { for (let q = 0; q < S.players; q++) { const top = st.items[st.items.length - 1]; if (top) toHand(top, q); } })]);
    }
    if (st.items.length > 1) opts.push([tr("洗牌", "Shuffle"), () => commit(tr(`${who()} 洗了${tr(...st.label)}`, `${who()} shuffled ${tr(...st.label)}`), () => shuffle(st.items))]);
    if (st.items.length) opts.push([tr("查看與搜尋", "Look through / search"), () => searchStack(sid)]);
    if (cards) opts.push([st.faceUp ? tr("整疊翻成面朝下", "Turn the pile face down") : tr("整疊翻成面朝上", "Turn the pile face up"), () => commit("", () => { st.faceUp = !st.faceUp; })]);
    opts.push([tr("移動整疊：按住 Shift 拖曳", "Move the pile: Shift + drag"), null]);
  } else {
    opts.push([tr("全桌檢視", "Fit the table"), fit]);
  }
  elMenu.innerHTML = opts.map(([t, f], i) => `<button data-i="${i}"${f ? "" : " disabled"}>${esc(t)}</button>`).join("");
  elMenu.style.left = e.clientX + "px"; elMenu.style.top = e.clientY + "px";
  elMenu.classList.remove("hidden");
  elMenu.onclick = ev => { const b = ev.target.closest("[data-i]"); if (!b) return; closeMenus(); opts[+b.dataset.i][1]?.(); };
}
const closeMenus = () => elMenu?.classList.add("hidden");
const centerView = () => { const r = $("#tt-view").getBoundingClientRect(); return worldPt({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }); };

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
function zoomCard(id) {
  const it = S.items[id];
  const r = itemHtml(it);
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
  elHint.querySelector(".hclose").onclick = () => { $("#tt-hints").checked = false; $("#tt-hints").onchange({ target: $("#tt-hints") }); };
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
    d.innerHTML = `<div class="hh">${tr("規則書 V5", "Rulebook V5")}<input id="rq" placeholder="${tr("搜尋…", "Search…")}"><button class="hclose">✕</button></div><div class="rules">${RULES_HTML}</div>`;
    $("#rq").oninput = e => {
      const q = e.target.value.trim();
      d.querySelectorAll(".rules > *").forEach(el => { el.style.display = !q || el.textContent.includes(q) ? "" : "none"; });
    };
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
  $("#seatok").onclick = () => { ME = n; c.classList.add("hidden"); render(); };
}

// ---------------------------------------------------------------- online
function sync() {
  if (mode === "host") link?.broadcast({ t: "state", S });
  if (mode === "guest") link?.send({ t: "state", S });
}
function startHost(code) {
  mode = "host";
  const seats = {};    // connection id -> seat
  const byClient = {}; // browser id -> seat, so a player who drops and comes back gets the same seat
  link = net.host(code, {
    open: () => { $("#tt-code") && ($("#tt-code").textContent = tr(`房間代碼 ${code}`, `Table code ${code}`)); },
    message: (cid, msg) => {
      if (msg.t === "hello") {
        const taken = new Set(Object.values(seats));
        let seat = byClient[msg.cid];
        if (seat === undefined || taken.has(seat)) {
          seat = undefined;
          for (let q = 1; q < S.players; q++) if (!taken.has(q) && !Object.values(byClient).includes(q)) { seat = q; break; }
          if (seat === undefined) for (let q = 1; q < S.players; q++) if (!taken.has(q)) { seat = q; break; }
        }
        if (seat === undefined) { link.send(cid, { t: "full" }); return; }
        seats[cid] = seat;
        if (msg.cid) byClient[msg.cid] = seat;
        if (msg.name) S.names[seat] = String(msg.name).slice(0, 18);
        link.send(cid, { t: "welcome", seat, S });
        S.log.push({ t: Date.now(), who: seat, m: tr(`${S.names[seat]} 加入了`, `${S.names[seat]} joined`) });
        changed();
      } else if (msg.t === "state" && msg.S && seats[cid] !== undefined && msg.S.rev >= S.rev) {
        S = msg.S; remoteChange(); saveLocal(); render(); link.broadcast({ t: "state", S }, cid);
      }
    },
    leave: cid => { delete seats[cid]; },
    error: e => toast(tr("連線錯誤：", "Connection error: ") + (e?.type || "")),
  });
}
// Undo steps back through this screen's own history. Once someone else has changed the table, that history no
// longer matches it, and undoing would wipe out their move, so it is cleared.
function remoteChange() { hist = []; fut = []; }
function startGuest(code, name) {
  mode = "guest";
  let seated = false;
  link = net.join(code, {
    open: () => link.send({ t: "hello", name, cid: net.clientId() }),
    message: msg => {
      if (msg.t === "welcome") { seated = true; ME = msg.seat; S = msg.S; hist = []; fut = []; buildTable(); $("#tt-code").textContent = tr(`房間 ${code}`, `Table ${code}`); }
      else if (msg.t === "state" && seated && msg.S && msg.S.rev >= S.rev) { S = msg.S; remoteChange(); if (onTable()) render(); }
      else if (msg.t === "full") toast(tr("這張桌子已經坐滿了。", "That table is full."));
    },
    close: () => toast(tr("與主持人的連線中斷了。", "Lost the host.")),
    error: e => toast(tr("連線錯誤：", "Connection error: ") + (e?.type || "")),
  });
}

// ---------------------------------------------------------------- lobby
function showMenuScreen() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(LS) || "null"); } catch { /* */ }
  if (link) { try { link.close(); } catch { /* */ } link = null; mode = "local"; }
  const app = $("#app");
  app.innerHTML = `<div class="lobby">
    <h1>${icon("nb-bloom")} ${tr("彼岸花渡", "Netherbloom")} <small>V5 · ${tr("手動桌面", "manual table")}</small></h1>
    <p class="muted">${tr("這是一張虛擬的實體桌面：所有的牌、板塊與指示物都由你們親手移動，程式不會替你們執行任何規則。需要時打開「下一步提示」，它會告訴你們規則的下一步。", "A virtual physical table: you move every card, tile and token yourselves; the page never carries out a rule. Turn on “Next-step hints” to be shown the next step of the rules.")}</p>
    ${saved?.soul ? `<div class="card-row"><button id="lb-resume" class="primary">${tr("繼續上一局", "Resume the last game")}</button><span class="muted">${esc(STORY[saved.soul]?.name || "")}・${saved.players}${tr(" 人", "p")}</span></div>` : ""}
    <fieldset><legend>${tr("新的一局", "New game")}</legend>
      <label>${tr("亡魂", "Soul")} <select id="lb-soul">${D.SOUL_ORDER.map(s => `<option value="${s}">${esc(STORY[s].name)}</option>`).join("")}</select></label>
      <label>${tr("難度", "Difficulty")} <select id="lb-level">${D.LEVELS.map((l, i) => `<option value="${i}"${i === 0 ? " selected" : ""}>${tr(l.zh, l.en)}</option>`).join("")}</select></label>
      <label>${tr("人數", "Players")} <select id="lb-players">${[1, 2, 3, 4].map(n => `<option${n === 2 ? " selected" : ""}>${n}</option>`).join("")}</select></label>
      <div id="lb-names"></div>
      <div class="card-row"><button id="lb-local" class="primary">${tr("在這台裝置開桌", "Open the table here")}</button>
      <button id="lb-host">${tr("開線上桌（其他人用代碼加入）", "Host online (others join with a code)")}</button></div>
    </fieldset>
    <fieldset><legend>${tr("加入線上桌", "Join an online table")}</legend>
      <label>${tr("代碼", "Code")} <input id="lb-code" maxlength="5" size="6"></label>
      <label>${tr("你的名字", "Your name")} <input id="lb-myname" maxlength="18" size="12"></label>
      <button id="lb-join">${tr("加入", "Join")}</button></fieldset>
    <p class="muted small">${tr("開桌時，元件會依規則書的準備步驟分好：牌庫洗好、河岸板塊面朝下隨機擺好、各種指示物放在供應區。發牌、放最初的花、翻開前方的霧等，都由你們自己動手（提示會一步一步帶你們）。", "When the table opens, the components are sorted as the rulebook's set-up says: decks shuffled, bank tiles placed face down at random, tokens in the supply. Dealing, the first flowers and the first Mist are yours to do (the hints walk you through it).")}</p>
  </div>`;
  const names = () => {
    const n = +$("#lb-players").value;
    $("#lb-names").innerHTML = Array.from({ length: n }, (_, i) => `<label>${tr(`擺渡人 ${i + 1}`, `Ferryman ${i + 1}`)} <input data-name="${i}" maxlength="18" size="10" value="${tr(`擺渡人 ${i + 1}`, `Ferryman ${i + 1}`)}"></label>`).join("");
  };
  $("#lb-players").onchange = names; names();
  const opts = () => ({ soul: $("#lb-soul").value, level: +$("#lb-level").value, players: +$("#lb-players").value,
    names: [...document.querySelectorAll("[data-name]")].map(i => i.value.trim() || i.defaultValue) });
  if ($("#lb-resume")) $("#lb-resume").onclick = () => { S = saved; ME = 0; mode = "local"; hist = []; fut = []; buildTable(); };
  $("#lb-local").onclick = () => { newTable(opts()); ME = 0; mode = "local"; hist = []; fut = []; buildTable(); saveLocal(); track("start"); };
  $("#lb-host").onclick = () => {
    const o = opts();
    if (o.players < 2) { toast(tr("線上桌需要 2–4 人。", "Online tables need 2–4 players.")); return; }
    newTable(o); ME = 0; hist = []; fut = []; buildTable(); saveLocal();
    startHost(net.newCode()); track("start");
  };
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
    lb.onclick = () => { LANG = LANG === "zh" ? "en" : "zh"; try { localStorage.setItem("nb-lang", LANG); } catch { /* */ } lb.textContent = LANG === "zh" ? "English" : "中文"; S && onTable() ? buildTable() : showMenuScreen(); };
  }
  window.addEventListener("resize", () => { if (S && onTable()) fit(); });
  fetch("/api/me", { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).then(me => { if (me?.admin) $("#btn-dash")?.classList.remove("hidden"); }).catch(() => {});
  showMenuScreen();
}
boot();

export const _test = { newTable: o => { newTable(o); return S; }, deckIds, cardInfo: ck => cardInfo(ck), bookLayout, buildSnaps };
