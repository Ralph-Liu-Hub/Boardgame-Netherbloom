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
const CW = 72, CH = 100;                  // card size
const RIVER = { x: 60, y: 60, sp: 94, bank: 82 };
const RIVER_W = 15 * RIVER.sp + 20, RIVER_H = 340;
const MISTA = { x: RIVER.x + RIVER_W + 40, y: 60, w: 300, h: 340 };
const LOOM = { x: MISTA.x + MISTA.w + 40, y: 60, w: 1000, h: 340 };
const BOOK = { x: 60, y: 450, pw: 900, ph: 500, gap: 24 };
const LEDGER = { x: 60, y: 1000, w: 1380, h: 300 };
const FATE = { x: 1480, y: 1000, w: 640, h: 300 };
const SUPPLY = { x: 2160, y: 1000, w: 700, h: 440 };
const MATS = { x: 60, y: 1480, w: 690, h: 250, gap: 20 };
const WORLD = { w: Math.max(LOOM.x + LOOM.w, SUPPLY.x + SUPPLY.w, BOOK.x + 3 * (BOOK.pw + BOOK.gap)) + 60, h: 1780 };

// ---------------------------------------------------------------- state
let S = null;            // the shared table
let ME = 0;              // my seat
let mode = "local";      // local | host | guest
let link = null;         // net handle
let hist = [], fut = [];
const LS = "nb-table-v5";
const saveLocal = () => { if (mode !== "guest") try { localStorage.setItem(LS, JSON.stringify(S)); } catch { /* full */ } };

const uid = (() => { let n = 0; return p => `${p}${(++n).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`; })();

function blankState(opts) {
  return {
    v: 1, rev: 0, soul: opts.soul, level: opts.level, players: opts.players, names: opts.names,
    items: {}, stacks: {}, hands: Array.from({ length: opts.players }, () => []), where: {}, z: 10,
    chapter: 0, hint: 0, log: [],
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
  addStack("deck", { x: LEDGER.x + 20, y: LEDGER.y + 40, label: ["記憶牌庫", "Memory deck"], accepts: "card" });
  addStack("discard", { x: LEDGER.x + 110, y: LEDGER.y + 40, label: ["棄牌堆", "Discard"], accepts: "card", faceUp: true });
  addStack("forgot", { x: LEDGER.x + 200, y: LEDGER.y + 40, label: ["遺忘堆", "Forgotten"], accepts: "card", faceUp: true, counter: "forgot" });
  addStack("box", { x: LEDGER.x + LEDGER.w - 100, y: LEDGER.y + 170, label: ["盒中（移出遊戲）", "Box (out of game)"], accepts: "any", faceUp: true });
  for (let r = 0; r < 3; r++) addStack("mist" + r, { x: MISTA.x + 20 + r * 92, y: MISTA.y + 40, label: [D.DECK_NAMES[r].zh, D.DECK_NAMES[r].en], accepts: "card", showBack: true });
  addStack("mistdis", { x: MISTA.x + 200, y: MISTA.y + 210, label: ["迷霧棄牌", "Mist discard"], accepts: "card", faceUp: true });
  addStack("spare", { x: MISTA.x + 20, y: MISTA.y + 210, label: ["備用板塊", "Spare tiles"], accepts: "tile", faceUp: true, small: true });
  for (let ch = 0; ch < 3; ch++) for (let k = 0; k < 2; k++)
    addStack(`fate${ch}${k}`, { x: FATE.x + 20 + (ch * 2 + k) * 100, y: FATE.y + 170, label: [`第${"一二三"[ch]}章・${k ? "書上" : "河流"}`, `Ch ${ch + 1} · ${k ? "Book" : "River"}`], accepts: "card" });
  addStack("comm", { x: FATE.x + 360, y: FATE.y + 40, label: ["託付卡", "Commissions"], accepts: "card" });
  addStack("ending", { x: FATE.x + 460, y: FATE.y + 40, label: ["結局牌", "Endings"], accepts: "card" });
  if (opts.players === 1) addStack("ghost", { x: FATE.x + 560, y: FATE.y + 40, label: ["幽靈牌庫", "Ghost deck"], accepts: "card", showBack: true });
  const binX = i => SUPPLY.x + 20 + (i % 6) * 112, binY = i => SUPPLY.y + 180 + Math.floor(i / 6) * 128;
  const bins = [["root", ["根／花", "Root / Bloom"], 24], ["shade", ["怨念", "Shade"], 8], ["fog", ["霧標記", "Fog marker"], 6],
    ["crack", ["裂痕", "Fracture"], 3], ["hold", ["堅守", "Hold Fast"], 1], ["shield", ["護盾", "Shield"], 1],
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
  addItem("card", { ck: "soul:" + soul, face: 1 }, { x: FATE.x + 20, y: FATE.y + 40 });
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
  addItem("tok", { tk: "light" }, snapPos("light0"));
  addItem("tok", { tk: "echo" }, snapPos("echoS"));
  for (let t = 0; t < 3; t++) {
    addItem("tok", { tk: "knot" + t }, snapPos(`knot${t}_0`));
    addItem("tok", { tk: "scar" + t }, snapPos(`scar${t}_0`));
  }
  for (let i = 0; i < 6; i++) addItem("tok", { tk: "bw" }, snapPos(i < 5 ? `bwsup${i}` : null) || { stack: "box" });
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
    const x = R.x + 10 + sp * R.sp;
    if (sp >= 1 && sp <= 13) {
      snap(`bank${sp}L`, x + 6, R.y + 40, R.bank, R.bank, ["tile", "tok"]);
      snap(`bank${sp}R`, x + 6, R.y + 40 + R.bank + 92, R.bank, R.bank, ["tile", "tok"]);
    }
    snap(`soul${sp}`, x + 16, R.y + 40 + R.bank + 4, 60, 40, ["tok"]);
    snap(`water${sp}`, x + 16, R.y + 40 + R.bank + 46, 60, 42, ["tok"]);
  }
  // mist front
  snap("mistfront", MISTA.x + 110, MISTA.y + 200, CW + 8, CH + 8, ["card"]);
  // loom
  for (let t = 0; t < 3; t++) {
    const y = LOOM.y + 60 + t * 88;
    for (let k = 0; k <= 9; k++) snap(`knot${t}_${k}`, LOOM.x + 120 + k * 44, y, 40, 40, ["tok"]);
    for (let k = 0; k <= 2; k++) snap(`scar${t}_${k}`, LOOM.x + 580 + k * 40, y, 36, 40, ["tok"]);
    snap(`echo${t}`, LOOM.x + 84, y + 2, 32, 36, ["tok"]);
  }
  snap("echoS", LOOM.x + 20, LOOM.y + 300, 40, 32, ["tok"]);
  // ledger
  for (let k = 0; k <= 12; k++) snap(`light${k}`, LEDGER.x + 320 + k * 48, LEDGER.y + 50, 44, 44, ["tok"]);
  for (let k = 0; k < 3; k++) snap(`crack${k}`, LEDGER.x + 320 + k * 60, LEDGER.y + 150, 50, 50, ["tok"]);
  for (let k = 0; k < 5; k++) snap(`bwsup${k}`, LEDGER.x + 560 + k * 56, LEDGER.y + 150, 50, 50, ["tok"]);
  // mantle row, fate slots
  // the Mantle row sits along the top of the supply panel
  D.MANTLES.forEach((_, i) => snap(`mantle${i}`, SUPPLY.x + 20 + i * 92, SUPPLY.y + 50, CW + 8, CH + 8, ["card"]));
  for (let k = 0; k < 2; k++) snap(`fateslot${k}`, FATE.x + 120 + k * 100, FATE.y + 40, CW + 8, CH + 8, ["card"]);
  // book nodes
  for (let ch = 0; ch < 3; ch++) for (const n of bookLayout(S.soul, ch)) {
    if (n.k === "m" || n.k === "g") snap(`node${ch}_${n.id}`, n.x, n.y, CW + 8, CH + 8, ["card"]);
    if (n.k === "x") snap(`node${ch}_${n.id}`, n.x, n.y, CW + 8, CH + 8, ["card"]);
    if (n.k === "f") snap(`node${ch}_${n.id}`, n.x, n.y, CW + 8, CH + 8, ["card"]);
  }
  // player mats
  for (let p = 0; p < players; p++) {
    const mx = MATS.x + p * (MATS.w + MATS.gap), my = MATS.y;
    snap(`mat${p}comm`, mx + 20, my + 50, CW + 8, CH + 8, ["card"]);
    snap(`mat${p}mantle`, mx + 120, my + 50, CW + 8, CH + 8, ["card"]);
    snap(`mat${p}push`, mx + 220, my + 60, 50, 50, ["tok"]);
    snap(`mat${p}keep`, mx + 300, my + 50, CW + 8, CH + 8, ["card"]);
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
  const px = BOOK.x + ch * (BOOK.pw + BOOK.gap), py = BOOK.y;
  const colW = Math.min(118, (BOOK.pw - 150) / ncol);
  const out = [];
  for (const [d, list] of Object.entries(cols)) {
    const rowH = (BOOK.ph - 90) / list.length;
    list.forEach((n, i) => out.push({ ...n, x: px + 130 + d * colW, y: py + 60 + i * rowH + (rowH - CH - 8) / 2 }));
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
  light: () => ({ cls: "tk lightm", ic: "nb-light", t: tr("光", "Light") }),
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
let view = { x: 0, y: 0, s: 0.6 };

function boardsHtml() {
  const R = RIVER, soul = S.soul;
  const lv = D.LEVELS[S.level];
  let h = "";
  // river
  h += `<div class="board river" data-region="river" style="left:${R.x}px;top:${R.y}px;width:${RIVER_W}px;height:${RIVER_H}px">`;
  for (let sp = 0; sp <= 14; sp++) {
    const x = 10 + sp * R.sp;
    const reach = sp <= 4 ? 0 : sp <= 8 ? 1 : 2;
    h += `<div class="space${sp === 0 || sp === 14 ? " shore" : ""} reach${reach}" style="left:${x}px;width:${R.sp - 4}px">
      <div class="spn">${sp === 0 ? tr("此岸", "Near") : sp === 14 ? tr("彼岸", "Far Shore") : sp}</div>
      ${sp === 5 ? `<div class="hintmark">${tr("故事應該寫到第二章", "Story: chapter 2")}</div>` : ""}
      ${sp === 9 ? `<div class="hintmark">${tr("故事應該寫到第三章", "Story: chapter 3")}</div>` : ""}
      ${sp === 13 ? `<div class="gate">${tr("彼岸的門", "Gate")}</div>` : ""}</div>`;
  }
  h += `<div class="banklabel l">${tr("左岸", "Left bank")}</div><div class="banklabel r">${tr("右岸", "Right bank")}</div>`;
  h += [0, 1, 2].map(r => `<div class="reachname" style="left:${10 + [1, 5, 9][r] * R.sp}px">${tr(D.REACHES[r].zh, D.REACHES[r].en)}</div>`).join("");
  h += `</div>`;
  // mist area
  h += `<div class="board mista" data-region="mist" style="left:${MISTA.x}px;top:${MISTA.y}px;width:${MISTA.w}px;height:${MISTA.h}px">
    <div class="btitle">${tr("迷霧", "Mist")}</div><div class="lab" style="left:110px;top:186px">${tr("前方的霧", "Mist ahead")}</div></div>`;
  // loom
  const th = S.players === 1 ? D.THRESHOLDS.solo : D.THRESHOLDS.multi;
  h += `<div class="board loom" data-region="loom" style="left:${LOOM.x}px;top:${LOOM.y}px;width:${LOOM.w}px;height:${LOOM.h}px">
    <div class="btitle">${tr("命運織機", "Loom of the Fates")}</div>
    <div class="lab" style="left:120px;top:36px">${tr("結", "Knots")}</div><div class="lab" style="left:580px;top:36px">${tr("傷疤", "Scars")}</div>
    <div class="lab" style="left:720px;top:36px">${tr("反噬（第一／二／三級）", "Backlash (I / II / III)")}</div>`;
  for (let t = 0; t < 3; t++) {
    const y = 60 + t * 88;
    h += `<div class="thread th${t}" style="top:${y}px">${icon(D.THREADS[t].icon)}${tr(D.THREADS[t].zh, D.THREADS[t].en)}</div>`;
    for (let k = 0; k <= 9; k++) h += `<div class="cell${th.includes(k) ? " lim" : ""}" style="left:${120 + k * 44}px;top:${y}px">${k}${k === th[0] ? `<i>${th[0]}</i>` : ""}</div>`;
    for (let k = 0; k <= 2; k++) h += `<div class="cell scar" style="left:${580 + k * 40}px;top:${y}px;width:36px">${k}</div>`;
    h += `<div class="blash" style="top:${y - 4}px">${D.BACKLASH[t].map((s, i) => `<div><b>${"ⅠⅡⅢ"[i]}</b>${esc(s)}</div>`).join("")}</div>`;
  }
  h += `<div class="lab" style="left:20px;top:284px">${tr("沉默格", "Silent")}</div>
    <div class="note" style="left:120px;top:300px">${tr(`門檻 ${th[0]}／${th[1]}／${th[2]}（0／1／2 道傷疤）。霧痕：同絲線反噬升一級。`, `Threshold ${th.join(" / ")} (0 / 1 / 2 scars). Mist scars raise that thread's Backlash one level.`)}</div></div>`;
  // book
  for (let ch = 0; ch < 3; ch++) h += bookPageHtml(ch);
  // ledger
  h += `<div class="board ledger" data-region="ledger" style="left:${LEDGER.x}px;top:${LEDGER.y}px;width:${LEDGER.w}px;height:${LEDGER.h}px">
    <div class="btitle">${tr("渡帳", "Ledger")}</div>
    <div class="lab" style="left:320px;top:30px">${tr("光", "Light")}</div>`;
  for (let k = 0; k <= 12; k++) h += `<div class="cell round" style="left:${320 + k * 48}px;top:50px;width:44px;height:44px">${k}</div>`;
  h += `<div class="lab" style="left:320px;top:130px">${tr("裂痕（3 道破碎）", "Fractures (3 = Shattered)")}</div>`;
  for (let k = 0; k < 3; k++) h += `<div class="cell round crack" style="left:${320 + k * 60}px;top:150px;width:50px;height:50px">${k + 1}</div>`;
  h += `<div class="lab" style="left:560px;top:130px">${tr("黑水供應", "Black Water supply")}</div>`;
  for (let k = 0; k < 5; k++) h += `<div class="cell round" style="left:${560 + k * 56}px;top:150px;width:50px;height:50px"></div>`;
  h += `<div class="note" style="left:20px;top:250px">${tr(`消散門檻：遺忘 ${lv.dissolve} 張。輕如灰燼 6、漂離 9。忘川的拉力：第一／二／三章 ${PULL.join("／")} 張。`, `Faded at ${lv.dissolve} forgotten. Light as Ash 6, Adrift 9. Pull of Lethe: ${PULL.join(" / ")}.`)}</div></div>`;
  // fate area
  h += `<div class="board fatea" data-region="fate" style="left:${FATE.x}px;top:${FATE.y}px;width:${FATE.w}px;height:${FATE.h}px">
    <div class="btitle">${tr("亡魂・命運之霧・託付", "Soul · Fate · Commissions")}</div>
    <div class="lab" style="left:120px;top:24px">${tr("本章的兩張命運之霧（條件面朝上）", "This chapter's two fates (condition up)")}</div>
    <div class="lab" style="left:20px;top:150px">${tr("命運之霧（每章河流／書上各 2 張）", "Fate mist (2 river + 2 book per chapter)")}</div></div>`;
  // supply
  h += `<div class="board supply" data-region="supply" style="left:${SUPPLY.x}px;top:${SUPPLY.y}px;width:${SUPPLY.w}px;height:${SUPPLY.h}px"><div class="btitle">${tr("稱號列與供應區", "Mantles and supply")}</div>
    <div class="lab" style="left:20px;top:160px">${tr("供應區", "Supply")}</div></div>`;
  // mats
  for (let p = 0; p < S.players; p++) {
    const mx = MATS.x + p * (MATS.w + MATS.gap);
    h += `<div class="board mat" data-region="mat${p}" style="left:${mx}px;top:${MATS.y}px;width:${MATS.w}px;height:${MATS.h}px">
      <div class="btitle">${esc(S.names[p] || tr(`擺渡人 ${p + 1}`, `Ferryman ${p + 1}`))}</div>
      <div class="lab" style="left:20px;top:30px">${tr("託付", "Commission")}</div><div class="lab" style="left:120px;top:30px">${tr("稱號", "Mantle")}</div>
      <div class="lab" style="left:220px;top:30px">${tr("破浪", "Push")}</div><div class="lab" style="left:300px;top:30px">${tr("持續中的牌", "Lasting card")}</div>
      <div class="handcount" data-hc="${p}"></div></div>`;
  }
  return h;
}

function bookPageHtml(ch) {
  const page = STORY[S.soul].chapters[ch];
  const px = BOOK.x + ch * (BOOK.pw + BOOK.gap);
  const nodes = bookLayout(S.soul, ch);
  const pos = Object.fromEntries(nodes.map(n => [n.id, n]));
  const entry = typeof page.entry === "string" ? page.entry : Object.entries(page.entry).map(([t, s]) => `<b class="th${t}">${tr(D.THREADS[t].zh, D.THREADS[t].en)}</b> ${esc(s)}`).join("<br>");
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
  return `<div class="board bookp${S.chapter === ch ? " current" : ""}" data-region="book${ch}" style="left:${px}px;top:${BOOK.y}px;width:${BOOK.pw}px;height:${BOOK.ph}px">
    <div class="btitle">${tr(`第${"一二三"[ch]}章・`, `Chapter ${ch + 1} · `)}${esc(page.title)} <button class="chbtn" data-ch="${ch}">${S.chapter === ch ? tr("目前章節", "Current") : tr("翻到這章", "Turn to this")}</button></div>
    <div class="entry">${entry}</div>
    <svg class="arrows" width="${BOOK.pw}" height="${BOOK.ph}"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#9a948c"/></marker></defs>${lines}</svg>
    ${cells}</div>`;
}

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
      <div id="tt-boards"></div><div id="tt-items"></div></div></div>
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
    const w = it.kind === "card" ? CW : it.kind === "tile" ? RIVER.bank - 6 : 36;
    const hgt = it.kind === "card" ? CH : it.kind === "tile" ? RIVER.bank - 6 : 36;
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
  // hand
  renderHand();
  // seats & counts
  elSeats.innerHTML = S.names.map((n, i) => `<button class="seat${i === ME ? " me" : ""}" data-seat="${i}" title="${tr("手牌", "Hand")} ${S.hands[i].length}">${esc(n || tr(`擺渡人 ${i + 1}`, `Ferryman ${i + 1}`))} <b>${S.hands[i].length}</b></button>`).join("");
  document.querySelectorAll("[data-hc]").forEach(e => { const p = +e.dataset.hc; e.textContent = tr(`手牌 ${S.hands[p].length} 張`, `${S.hands[p].length} cards in hand`); });
  document.querySelectorAll(".bookp").forEach((e, i) => e.classList.toggle("current", S.chapter === i));
  document.querySelectorAll(".chbtn").forEach(b => { b.textContent = S.chapter === +b.dataset.ch ? tr("目前章節", "Current") : tr("翻到這章", "Turn to this"); });
  renderHint();
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
  const w = S.where[id];
  if (!w) return;
  if (w.startsWith("s:")) { const st = S.stacks[w.slice(2)]; st.items = st.items.filter(x => x !== id); }
  if (w.startsWith("h:")) { const h = S.hands[+w.slice(2)]; S.hands[+w.slice(2)] = h.filter(x => x !== id); }
  S.where[id] = null;
}
function toTable(id, x, y) { detach(id); const it = S.items[id]; it.x = x; it.y = y; it.z = ++S.z; S.where[id] = "t"; }
function toStack(id, sid, bottom = false) { detach(id); const st = S.stacks[sid]; bottom ? st.items.unshift(id) : st.items.push(id); S.where[id] = "s:" + sid; }
function toHand(id, seat) { detach(id); S.hands[seat].push(id); S.where[id] = "h:" + seat; const it = S.items[id]; it.rot = 0; }
const nameOf = id => { const it = S.items[id]; return it.kind === "card" ? (it.face ? cardInfo(it.ck).title : tr("一張牌", "a card")) : itemHtml(it).title; };
const who = () => S.names[ME] || tr(`擺渡人 ${ME + 1}`, `Ferryman ${ME + 1}`);

// ---------------------------------------------------------------- interaction
let drag = null;
function worldPt(e) {
  const r = $("#tt-view").getBoundingClientRect();
  return { x: (e.clientX - r.left - view.x) / view.s, y: (e.clientY - r.top - view.y) / view.s };
}
function applyView() { elWorld.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.s})`; }
function fit() {
  const r = $("#tt-view").getBoundingClientRect();
  view.s = Math.min(r.width / WORLD.w, r.height / WORLD.h) * 0.98;
  view.x = (r.width - WORLD.w * view.s) / 2; view.y = 6;
  applyView();
}

function bindTable() {
  const v = $("#tt-view");
  v.addEventListener("wheel", e => {
    e.preventDefault();
    const r = v.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const k = Math.exp(-e.deltaY * 0.0015);
    const ns = Math.min(2.5, Math.max(0.2, view.s * k));
    view.x = mx - (mx - view.x) * ns / view.s; view.y = my - (my - view.y) * ns / view.s; view.s = ns;
    applyView();
  }, { passive: false });
  v.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
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
    startDrag(e, c.dataset.hid, "hand");
  });
  elHand.addEventListener("contextmenu", e => { e.preventDefault(); openMenu(e); });
  $("#tt-undo").onclick = undo; $("#tt-redo").onclick = redo; $("#tt-fit").onclick = fit;
  $("#tt-rules").onclick = () => openDrawer("rules");
  $("#tt-log").onclick = () => openDrawer("log");
  $("#tt-menu").onclick = () => showMenuScreen();
  $("#tt-hints").onchange = e => { try { localStorage.setItem("nb-hints", e.target.checked ? "1" : "0"); } catch { /* */ } elHint.classList.toggle("hidden", !e.target.checked); renderHint(); };
  elSeats.onclick = e => { const b = e.target.closest("[data-seat]"); if (b && mode === "local") switchSeat(+b.dataset.seat); };
  document.querySelectorAll(".chbtn").forEach(b => b.onclick = () => commit(tr(`翻到第${"一二三"[+b.dataset.ch]}章`, `turned to chapter ${+b.dataset.ch + 1}`), () => { S.chapter = +b.dataset.ch; }));
  window.onkeydown = e => {
    if (e.target.closest("input,textarea")) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    else if (hover && e.key.toLowerCase() === "f") flip(hover);
    else if (hover && e.key.toLowerCase() === "r") rotate(hover);
    else if (e.key === "Escape") closeMenus();
  };
  v.addEventListener("pointerover", e => { const p = e.target.closest(".piece[data-id]"); hover = p ? p.dataset.id : null; });
}
let hover = null;

function onDown(e) {
  if (e.button !== 0) return;
  closeMenus();
  const p = e.target.closest(".piece[data-id]");
  if (p) return startDrag(e, p.dataset.id, "table");
  const s = e.target.closest(".stack");
  if (s) {
    const st = S.stacks[s.dataset.stack];
    if (e.shiftKey) { drag = { stackMove: st.id, sx: e.clientX, sy: e.clientY, ox: st.x, oy: st.y, snapshot: JSON.stringify(S) }; return; }
    const top = st.items[st.items.length - 1];
    if (!top) return;
    return startDrag(e, top, "stack:" + st.id);
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
  if (!drag) return;
  if (drag.pan) { view.x = drag.ox + e.clientX - drag.sx; view.y = drag.oy + e.clientY - drag.sy; applyView(); return; }
  if (drag.stackMove) {
    const st = S.stacks[drag.stackMove];
    st.x = drag.ox + (e.clientX - drag.sx) / view.s; st.y = drag.oy + (e.clientY - drag.sy) / view.s;
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
  if (!drag) return;
  const d = drag; drag = null;
  elHand.classList.remove("drop");
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
      opts.push([tr("翻開頂牌放到桌上", "Turn the top card onto the table"), () => commit(tr(`${who()} 翻開${tr(...st.label)}的頂牌`, `${who()} turned the top of ${tr(...st.label)}`), () => { const top = st.items[st.items.length - 1]; toTable(top, st.x + CW * 1.7, st.y + CH / 2 + 4); S.items[top].face = 1; })]);
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
const centerView = () => { const r = $("#tt-view").getBoundingClientRect(); return { x: (r.width / 2 - view.x) / view.s, y: (r.height / 2 - view.y) / view.s }; };

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
      else { const pt = { x: st.x + 140, y: st.y + 40 }; toTable(id, pt.x, pt.y); it.face = 1; }
    });
  });
}

// ---------------------------------------------------------------- hints
function renderHint() {
  if (!elHint || elHint.classList.contains("hidden")) return;
  const i = Math.max(0, Math.min(STEPS.length - 1, S.hint || 0));
  const step = STEPS[i];
  const ctx = { players: S.players, level: D.LEVELS[S.level], soul: S.soul, ch: S.chapter, light: D.START_LIGHT[S.soul], pull: PULL[S.chapter],
    th: S.players === 1 ? D.THRESHOLDS.solo : D.THRESHOLDS.multi, hand: S.players === 1 ? 5 : 3, need: D.SETUP_TABLE[S.players].need, graves: D.SETUP_TABLE[S.players].graves };
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
  for (const r of step.focus || []) document.querySelectorAll(`[data-region="${r === "book" ? "book" + S.chapter : r}"]`).forEach(e => e.classList.add("focus"));
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
  link = net.host(code, {
    open: () => { $("#tt-code") && ($("#tt-code").textContent = tr(`房間代碼 ${code}`, `Table code ${code}`)); },
    message: (cid, msg) => {
      if (msg.t === "hello") {
        let seat = Object.values(seats).length + 1;
        if (msg.seat !== undefined && msg.seat > 0 && msg.seat < S.players) seat = msg.seat;
        if (seat >= S.players) { link.send(cid, { t: "full" }); return; }
        seats[cid] = seat;
        if (msg.name) S.names[seat] = String(msg.name).slice(0, 18);
        link.send(cid, { t: "welcome", seat, S });
        S.log.push({ t: Date.now(), who: seat, m: tr(`${S.names[seat]} 加入了`, `${S.names[seat]} joined`) });
        changed();
      } else if (msg.t === "state" && msg.S && msg.S.rev >= S.rev) {
        S = msg.S; saveLocal(); render(); link.broadcast({ t: "state", S }, cid);
      }
    },
    leave: cid => { delete seats[cid]; },
    error: e => toast(tr("連線錯誤：", "Connection error: ") + (e?.type || "")),
  });
}
function startGuest(code, name) {
  mode = "guest";
  link = net.join(code, {
    open: () => link.send({ t: "hello", name, cid: net.clientId() }),
    message: msg => {
      if (msg.t === "welcome") { ME = msg.seat; S = msg.S; buildTable(); $("#tt-code").textContent = tr(`房間 ${code}`, `Table ${code}`); }
      else if (msg.t === "state" && S && msg.S.rev >= S.rev) { S = msg.S; render(); }
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
    const holder = document.createElement("div"); holder.style.display = "none"; holder.innerHTML = svg; document.body.prepend(holder);
  } catch { /* icons are optional */ }
  const lb = $("#btn-lang");
  if (lb) {
    lb.textContent = LANG === "zh" ? "English" : "中文";
    lb.onclick = () => { LANG = LANG === "zh" ? "en" : "zh"; try { localStorage.setItem("nb-lang", LANG); } catch { /* */ } lb.textContent = LANG === "zh" ? "English" : "中文"; S ? buildTable() : showMenuScreen(); };
  }
  window.addEventListener("resize", () => { if (S && elWorld) fit(); });
  fetch("/api/me", { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).then(me => { if (me?.admin) $("#btn-dash")?.classList.remove("hidden"); }).catch(() => {});
  showMenuScreen();
}
boot();

export const _test = { newTable: o => { newTable(o); return S; }, deckIds, cardInfo: ck => cardInfo(ck), bookLayout, buildSnaps };
