// Netherbloom web table: menus, the board, the hand, animations and the three ways to play
// (solo against the Ghost, everyone at one screen, or online with each player on their own device).
import * as E from "./engine.js";
import {
  CARDS, TAG_NAMES, TAG_ICONS, SOULS, MANTLES, BOOK_FRAMES, REACH_NAMES, TILE_NAMES, LANTERN, HARSH, MIST_TEXT,
  STONY, MEMORY, GRAVE, FERTILE, opsText,
} from "./cards.js";
import * as A from "./audio.js";
import * as N from "./net.js";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const svgUse = (id, cls = "", style = "") => `<svg class="${cls}" style="${style}" aria-hidden="true"><use href="#${id}"/></svg>`;
const TAGCLS = ["c-obs", "c-acc", "c-obl"];
const TAGCOL = ["#D7263D", "#E6D3A3", "#8FD6E1"];
const SLOT_ICON = { Place: "nb-slot-place", Person: "nb-slot-person", Deed: "nb-slot-deed", Feeling: "nb-slot-feeling" };
const HARSH_NAMES = new Set(HARSH.map(h => h[0]));
const ROMAN = ["I", "II", "III"];

// ---------------------------------------------------------------- app state
let S = null;              // the game
let mode = null;           // "solo" | "local" | "online"
let seats = new Set();     // seats this browser plays
let mySeat = 0;            // online: this player's own seat
let uncovered = -1;        // same-screen play: the seat whose hand is showing
let pending = null;        // a choice the active player must make
let busy = false;          // a card is resolving
let selected = null;       // card picked in the hand
let lastEv = 0;            // last event animated
let prev = null;           // board as last drawn, for change animations
let prevHand = [];
let prevBookIds = new Set();
let passOpen = false, endShown = false;
let net = null;            // online session
const setup = load("nb-setup", { players: 3, soul: "child", lantern: 2, names: ["", "", "", ""], name: "" });

function load(key, dflt) {
  try { return { ...dflt, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch { return dflt; }
}
function store(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }

// ---------------------------------------------------------------- boot
async function boot() {
  try {
    const r = await fetch("/assets/symbols.svg");
    if (r.status === 401) { location.href = "/login"; return; }
    const holder = document.createElement("div");
    holder.innerHTML = await r.text();
    document.body.prepend(holder.firstElementChild);
  } catch { /* icons missing; the game still runs */ }
  const embers = $("embers");
  for (let i = 0; i < 16; i++) {
    const e = document.createElement("i");
    e.style.left = `${Math.random() * 100}%`;
    e.style.animationDuration = `${14 + Math.random() * 18}s`;
    e.style.animationDelay = `${-Math.random() * 30}s`;
    e.style.setProperty("--dx", `${(Math.random() - 0.5) * 160}px`);
    if (Math.random() < 0.35) { e.style.background = "#8FD6E1"; e.style.boxShadow = "0 0 8px #8FD6E1"; }
    embers.appendChild(e);
  }
  document.addEventListener("pointerdown", () => { if (A.isMusicOn()) A.start(); else A.setSfx(A.isSfxOn()); }, { once: true });
  $("btn-music").onclick = () => { A.setMusic(!A.isMusicOn()); topbar(); };
  $("btn-sfx").onclick = () => { A.setSfx(!A.isSfxOn()); topbar(); };
  $("btn-rules").onclick = rules;
  $("btn-menu").onclick = () => {
    if (S && !S.result && !confirm("Leave this game and return to the menu?")) return;
    leaveGame();
    menu();
  };
  topbar();
  menu();
}

function topbar() {
  $("btn-music").textContent = `Music: ${A.isMusicOn() ? "on" : "off"}`;
  $("btn-sfx").textContent = `Sound: ${A.isSfxOn() ? "on" : "off"}`;
  $("btn-menu").classList.toggle("hidden", !S && !net);
  $("modelabel").textContent = mode ? { solo: "Solo · against the Ghost", local: "Same screen", online: `Online${net?.code ? " · table " + net.code : ""}` }[mode] : "";
}

function leaveGame() {
  if (net?.api) net.api.close();
  net = null;
  S = null;
  mode = null;
  pending = null;
  busy = false;
  closeVeil();
  topbar();
}

// ---------------------------------------------------------------- menu
function menu(which = "solo") {
  S = null;
  topbar();
  const soulBtns = Object.entries(SOULS).map(([k, v]) =>
    `<button type="button" class="soulopt ${setup.soul === k ? "on" : ""}" data-soul="${k}"><b>${esc(v.name)}</b><small>${esc(v.twist)}</small></button>`).join("");
  const lan = [1, 2, 3, 4, 5].map(l => `<button type="button" data-lantern="${l}" class="${setup.lantern === l ? "on" : ""}">${"◆".repeat(l)}${"◇".repeat(5 - l)}</button>`).join("");
  $("app").innerHTML = `
  <div class="screen">
    <div class="hero">
      <svg class="lily" aria-hidden="true"><use href="#nb-bloom"/></svg>
      <div class="eyebrow">Publisher preview</div>
      <h1>Netherbloom</h1>
      <p>Grow a path of spider lilies across the river of forgetting, and carry one soul to the Far Shore before it forgets who it was. A silent co-operative game for 1 to 4.</p>
    </div>
    <div class="modes">
      <button type="button" class="mode ${which === "solo" ? "on" : ""}" data-mode="solo"><h3>Solo</h3><p>You and the Ghost, an automated companion who plays a card after each of your turns.</p></button>
      <button type="button" class="mode ${which === "local" ? "on" : ""}" data-mode="local"><h3>Same Screen</h3><p>2 to 4 players share this window. Hands stay hidden while you pass the device.</p></button>
      <button type="button" class="mode ${which === "online" ? "on" : ""}" data-mode="online"><h3>Online</h3><p>2 to 4 players, each on their own computer. Host a table and share its code.</p></button>
    </div>
    <section class="panel">
      <h2>The soul to carry</h2>
      <div class="souls">${soulBtns}</div>
      <div class="field"><span>Lantern (difficulty)</span><div class="lanterns">${lan}</div>
        <small class="muted" id="lanhelp"></small></div>
    </section>
    <section class="panel" id="modepanel"></section>
    <p class="muted" style="text-align:center;margin:0">New to the river? Read <button type="button" class="ghost" id="howto">How to play</button></p>
  </div>`;
  $("howto").onclick = rules;
  document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => menu(b.dataset.mode));
  document.querySelectorAll("[data-soul]").forEach(b => b.onclick = () => { setup.soul = b.dataset.soul; store("nb-setup", setup); menu(which); });
  document.querySelectorAll("[data-lantern]").forEach(b => b.onclick = () => { setup.lantern = +b.dataset.lantern; store("nb-setup", setup); menu(which); });
  const [bw, lim, harsh] = LANTERN[setup.lantern];
  $("lanhelp").textContent = `Lantern ${setup.lantern}: ${bw} Black Water in the supply, Faded at ${lim} forgotten, ${harsh} harsh Mist card${harsh === 1 ? "" : "s"} per Reach.`;
  const mp = $("modepanel");
  if (which === "solo") {
    mp.innerHTML = `<h2>Solo</h2><div class="form"><label class="field"><span>Your name</span><input id="nm0" maxlength="18" value="${esc(setup.names[0])}" placeholder="Player 1"></label></div>
      <div class="row"><button type="button" class="primary" id="go">Begin the crossing</button></div>`;
    $("go").onclick = () => {
      setup.names[0] = $("nm0").value.trim();
      store("nb-setup", setup);
      startLocal("solo", 1);
    };
  } else if (which === "local") {
    const counts = [2, 3, 4].map(n => `<button type="button" data-n="${n}" class="${setup.players === n ? "on" : ""}">${n} players</button>`).join("");
    mp.innerHTML = `<h2>Same Screen</h2><div class="lanterns">${counts}</div>
      <div class="names">${[0, 1, 2, 3].slice(0, Math.max(2, setup.players)).map(i =>
        `<label class="field"><span>Player ${i + 1}</span><input id="nm${i}" maxlength="18" value="${esc(setup.names[i])}" placeholder="Player ${i + 1}"></label>`).join("")}</div>
      <div class="row"><button type="button" class="primary" id="go">Begin the crossing</button></div>`;
    mp.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { saveNames(); setup.players = +b.dataset.n; store("nb-setup", setup); menu("local"); });
    if (setup.players < 2) { setup.players = 3; }
    $("go").onclick = () => { saveNames(); startLocal("local", setup.players); };
  } else {
    mp.innerHTML = `<h2>Online</h2>
      <div class="form">
        <label class="field"><span>Your name</span><input id="nmo" maxlength="18" value="${esc(setup.name)}" placeholder="Your name"></label>
        <label class="field"><span>Table code (to join)</span><input id="code" maxlength="5" placeholder="e.g. K7QXM" style="text-transform:uppercase;letter-spacing:.2em"></label>
      </div>
      <div class="row"><button type="button" class="primary" id="hostbtn">Host a new table</button><button type="button" id="joinbtn">Join a table</button><span class="muted" id="neterr"></span></div>
      <p class="muted" style="margin:0;font-size:.88rem">Players connect browser to browser. Everyone signs in with the publisher account, then the host shares the five-letter code.</p>`;
    const nm = () => { setup.name = $("nmo").value.trim() || "Player"; store("nb-setup", setup); return setup.name; };
    $("hostbtn").onclick = () => hostTable(nm());
    $("joinbtn").onclick = () => {
      const code = $("code").value.trim().toUpperCase();
      if (code.length !== 5) { $("neterr").textContent = "Enter the five-letter code."; return; }
      joinTable(code, nm());
    };
  }
}
function saveNames() {
  for (let i = 0; i < 4; i++) { const el = $(`nm${i}`); if (el) setup.names[i] = el.value.trim(); }
  store("nb-setup", setup);
}

// ---------------------------------------------------------------- starting games
function startLocal(m, players) {
  mode = m;
  const names = setup.names.slice(0, players).map((n, i) => n || `Player ${i + 1}`);
  const s = E.newGame(E.makeConfig({ players, soul: setup.soul, lantern: setup.lantern }), undefined, names);
  s.gid = Math.random().toString(36).slice(2, 10);
  seats = new Set(Array.from({ length: players }, (_, i) => i));
  mySeat = 0;
  beginGame(s);
}

function beginGame(s) {
  S = s;
  uncovered = -1;
  pending = null;
  busy = false;
  selected = null;
  passOpen = false;
  endShown = false;
  prev = null;
  prevHand = [];
  prevBookIds = new Set();
  lastEv = Math.max(0, S.evn - 1);
  closeVeil();
  topbar();
  buildTable();
  refresh();
  tick();
}

// ---------------------------------------------------------------- online
function hostTable(name) {
  const code = N.newCode();
  mode = "online";
  net = { role: "host", code, started: false, players: [{ name, cid: N.clientId(), conn: null, online: true }] };
  mySeat = 0;
  seats = new Set([0]);
  lobby("Opening the table…");
  net.api = N.host(code, {
    open: () => lobby(),
    error: e => { lobby(`Connection problem: ${e.type || e.message}`); },
    message: (connId, msg) => hostMessage(connId, msg),
    leave: connId => {
      const p = net.players.find(x => x.conn === connId);
      if (!p) return;
      p.online = false;
      p.conn = null;
      if (net.started) { seats.add(net.players.indexOf(p)); toast(`${p.name} lost connection. You will play their turns until they return.`); }
      else net.players.splice(net.players.indexOf(p), 1);
      sendLobby();
      if (net.started) { refresh(); tick(); } else lobby();
    },
  });
}

function hostMessage(connId, msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.t === "hello") {
    const name = String(msg.name || "Player").slice(0, 18);
    let p = net.players.find(x => x.cid === msg.cid);
    if (p) { p.conn = connId; p.online = true; p.name = name; }
    else if (!net.started && net.players.length < 4) { p = { name, cid: msg.cid, conn: connId, online: true }; net.players.push(p); }
    else { net.api.send(connId, { t: "full" }); return; }
    const seat = net.players.indexOf(p);
    if (net.started) { seats.delete(seat); toast(`${p.name} is back at the table.`); }
    net.api.send(connId, { t: "welcome", seat, code: net.code });
    sendLobby();
    if (net.started && S) net.api.send(connId, { t: "state", s: S });
    if (!net.started) lobby();
    else refresh();
  } else if (msg.t === "state" && S && msg.s) {
    const p = net.players.find(x => x.conn === connId);
    const seat = net.players.indexOf(p);
    if (msg.s.gid === S.gid && msg.s.ver > S.ver && seat === S.cur && !seats.has(seat)) {
      S = msg.s;
      net.api.broadcast({ t: "state", s: S }, connId);
      onRemoteState();
    }
  }
}

function sendLobby() {
  if (net?.role !== "host") return;
  net.api.broadcast({ t: "lobby", players: net.players.map(p => ({ name: p.name, online: p.online })), soul: setup.soul, lantern: setup.lantern, started: net.started });
}

function joinTable(code, name) {
  mode = "online";
  net = { role: "guest", code, started: false, players: [], soul: null, lantern: null };
  seats = new Set();
  lobby("Looking for the table…");
  net.api = N.join(code, {
    open: () => net.api.send({ t: "hello", name, cid: N.clientId() }),
    message: msg => guestMessage(msg),
    close: () => {
      if (!net) return;
      toast("The connection to the host was lost.");
      if (S) setPrompt(`<span class="msg">The host has left the table. <b>The game cannot continue.</b></span>`);
      else lobby("The host closed the table.");
    },
    error: e => {
      if (!net) return;
      const text = e?.type === "peer-unavailable" ? "No open table with that code." : `Connection problem: ${e?.type || e?.message || e}`;
      if (S) toast(text); else lobby(text);
    },
  });
}

function guestMessage(msg) {
  if (!msg || typeof msg !== "object" || !net) return;
  if (msg.t === "welcome") { mySeat = msg.seat; seats = new Set([mySeat]); if (!S) lobby(); }
  else if (msg.t === "full") lobby("That table is full or its game has already begun.");
  else if (msg.t === "lobby") {
    net.players = msg.players;
    net.soul = msg.soul;
    net.lantern = msg.lantern;
    net.started = msg.started;
    if (!S) lobby(); else refresh();
  } else if (msg.t === "state" && msg.s) {
    if (!S || msg.s.gid !== S.gid) { beginGame(msg.s); return; }
    if (msg.s.ver > S.ver) { S = msg.s; onRemoteState(); }
  }
}

function lobby(note = "") {
  topbar();
  const host = net.role === "host";
  const soul = host ? setup.soul : net.soul, lan = host ? setup.lantern : net.lantern;
  const list = (net.players || []).map((p, i) => `<div><span class="dot ${p.online ? "" : "off"}"></span>${esc(p.name)}${i === 0 ? ' <span class="muted">(host)</span>' : ""}${host || i !== mySeat ? "" : ' <span class="muted">(you)</span>'}</div>`).join("");
  $("app").innerHTML = `
  <div class="screen">
    <section class="panel" style="justify-items:center;text-align:center">
      <div class="eyebrow">Online table</div>
      <div class="code">${esc(net.code)}</div>
      <p class="muted" style="margin:0">${host ? "Share this code. Other players choose Online → Join a table." : "Waiting for the host to begin."}</p>
      ${note ? `<p style="margin:0;color:var(--crimson)">${esc(note)}</p>` : ""}
    </section>
    <section class="panel">
      <h2>At the table (${(net.players || []).length}/4)</h2>
      <div class="plist">${list || '<span class="muted">Connecting…</span>'}</div>
      <div class="muted">Soul: <b style="color:var(--bone)">${esc(SOULS[soul]?.name || "—")}</b> · Lantern ${lan || "—"}</div>
      ${host ? `<div class="row"><button type="button" class="primary" id="start" ${net.players.length < 2 ? "disabled" : ""}>Begin the crossing</button>
        <span class="muted">${net.players.length < 2 ? "Needs at least 2 players." : ""}</span></div>
        <p class="muted" style="margin:0;font-size:.88rem">To change the soul or Lantern, go back to the menu, choose them, then host again.</p>` : ""}
    </section>
  </div>`;
  if (host) $("start").onclick = startOnline;
}

function startOnline() {
  net.started = true;
  const names = net.players.map(p => p.name);
  const s = E.newGame(E.makeConfig({ players: names.length, soul: setup.soul, lantern: setup.lantern }), undefined, names);
  s.gid = Math.random().toString(36).slice(2, 10);
  seats = new Set([0, ...net.players.map((p, i) => (p.online ? -1 : i)).filter(i => i > 0)]);
  sendLobby();
  net.api.broadcast({ t: "state", s });
  beginGame(s);
}

function onRemoteState() {
  if (selected !== null && !canPlayCards()) selected = null;
  refresh();
  tick();
}

// ---------------------------------------------------------------- committing changes
function commit() {
  S.ver += 1;
  if (mode === "online" && net?.api) {
    if (net.role === "host") net.api.broadcast({ t: "state", s: S });
    else net.api.send({ t: "state", s: S });
  }
  refresh();
}

const controls = seat => seats.has(seat);
function canAct() {
  if (!S || S.result || !controls(S.cur)) return false;
  if (mode === "local" && S.n > 1 && uncovered !== S.cur) return false;
  return true;
}
const canPlayCards = () => canAct() && !busy && !pending && S.phase === "play" && S.played < S.cfg.cardsPerTurn && S.hands[S.cur].length > 0;

async function tick() {
  if (!S) return;
  if (S.result) { showEnd(); return; }
  if (!controls(S.cur)) return;
  if (mode === "local" && S.n > 1 && uncovered !== S.cur) {
    if (passOpen) return;
    passOpen = true;
    await idle();
    showPass();
    return;
  }
  if (S.phase === "start") {
    E.beginTurn(S);
    commit();
  }
}

function showPass() {
  const name = S.names[S.cur];
  veil(`<div class="dialog pass">
    <svg class="lily" aria-hidden="true"><use href="#nb-bloom"/></svg>
    <h2>Pass the lantern to ${esc(name)}</h2>
    <p class="muted">Everyone else, look away from the screen. In Netherbloom nobody speaks about their cards.</p>
    <button type="button" class="primary" id="reveal">I am ${esc(name)}: show my hand</button></div>`);
  $("reveal").onclick = () => {
    uncovered = S.cur;
    passOpen = false;
    closeVeil();
    A.sfx("turn");
    refresh();
    tick();
  };
}

// ---------------------------------------------------------------- the human chooser
const chooser = {
  rootTarget: (s, stony, targets, i, n) => ask({ type: "root", targets, i, n, stony }),
  bloomTarget: (s, targets, i, n) => ask({ type: "bloom", targets, i, n }),
  wantInscribe: (s, cid) => ask({ type: "inscribe", cid }),
};
function ask(p) {
  return new Promise(resolve => {
    pending = { ...p, resolve };
    commit();
  });
}
function answer(v) {
  if (!pending) return;
  const r = pending.resolve;
  pending = null;
  r(v);
}

async function playSelected(cid, mode_) {
  if (!canPlayCards()) return;
  flyCard(cid);
  selected = null;
  busy = true;
  A.sfx("card");
  try {
    await E.playCard(S, cid, mode_, chooser);
  } catch (e) {
    if (!(e instanceof E.GameOver)) throw e;
    S.phase = "over";
  }
  busy = false;
  if (!S.result && (S.played >= S.cfg.cardsPerTurn || !S.hands[S.cur].length)) {
    await finishTurn();
    return;
  }
  commit();
  tick();
}

async function finishTurn() {
  if (E.bringerPending(S)) {
    busy = true;
    const k = await ask({ type: "bringer", targets: E.bloomTargets(S) });
    busy = false;
    E.bringerBloom(S, k);
  }
  E.endTurn(S);
  if (mode === "local") uncovered = -1;
  commit();
  tick();
}

function summonDialog() {
  const p = S.cur, hand = S.hands[p];
  const rows = Object.entries(MANTLES).filter(([m]) => S.mantles[m] === -1).map(([m, info]) => {
    const cards = hand.filter(cid => CARDS[cid].tag === info.tag);
    return `<div class="panel" style="gap:6px"><h3 class="${TAGCLS[info.tag]}">${esc(info.name)}</h3><p class="muted" style="margin:0">${esc(info.text)}</p>
      <div class="row">${cards.length ? cards.map(cid => `<button type="button" data-m="${m}" data-cid="${cid}">Discard ${esc(CARDS[cid].name)}</button>`).join("")
        : `<span class="muted">Needs a ${TAG_NAMES[info.tag]} card.</span>`}</div></div>`;
  }).join("");
  veil(`<div class="dialog wide"><h2>Summon a Mantle</h2>
    <p>Pay <b>${S.cfg.mantleCost} Light</b> and discard a card of the Mantle's thread. You keep the Mantle for the rest of the game.</p>
    ${rows}<div class="row"><button type="button" id="cancel">Not now</button></div></div>`);
  $("cancel").onclick = closeVeil;
  document.querySelectorAll("[data-m]").forEach(b => b.onclick = () => {
    E.summon(S, b.dataset.m, +b.dataset.cid);
    closeVeil();
    commit();
  });
}

// ---------------------------------------------------------------- table layout
function buildTable() {
  $("app").innerHTML = `
  <div class="table">
    <div class="main">
      <div class="status" id="status"></div>
      <div class="boardwrap" id="boardwrap">
        <div class="boardscroll"><svg id="board" viewBox="0 0 1120 400" role="img" aria-label="The river"></svg></div>
        <div class="legend">
          <span>${svgUse("nb-bloom", "", "color:#D7263D")}Bloom (lights its space)</span>
          <span>${svgUse("nb-root", "", "color:#E6D3A3")}Root</span>
          <span>${svgUse("nb-grievance", "", "color:#8FD6E1")}Grievance</span>
          <span>${svgUse("nb-blackwater", "", "color:#9A948C")}Black Water</span>
          <span>${svgUse("nb-fog", "", "color:#9A948C")}Fog</span>
          <span>${svgUse("nb-stony", "", "color:#9A948C")}Stony</span>
          <span>${svgUse("nb-memorysite", "", "color:#E6D3A3")}Memory Site</span>
          <span>${svgUse("nb-grave", "", "color:#8FD6E1")}Grave</span>
        </div>
      </div>
      <div class="prompt" id="prompt"></div>
      <div class="hand" id="hand"></div>
      <section class="panel"><h2>Book of Remembrance</h2><div class="book" id="book"></div></section>
    </div>
    <aside class="side">
      <section class="panel"><h2>Loom of the Fates</h2><div class="loom" id="loom"></div>
        <small class="muted">A first card on the Echo's thread Resonates. A full thread snaps in a Backlash.</small></section>
      <section class="panel"><h2>The Soul</h2><div id="soulboard" style="display:grid;gap:8px"></div></section>
      <section class="panel"><h2>Chronicle</h2><div class="log" id="log"></div></section>
    </aside>
  </div>`;
  drawBoardStatic();
  $("board").addEventListener("click", e => {
    const g = e.target.closest(".slot.target");
    if (!g || !pending || !canAct()) return;
    const k = +g.dataset.k;
    if (pending.targets?.includes(k)) answer(k);
  });
}

// ---------------------------------------------------------------- the board
const X = sp => 64 + sp * 82.5;
const Y = sp => 200 + 22 * Math.sin(sp * 0.8);
const slotXY = k => [X(k >> 1), Y(k >> 1) + (k % 2 ? 84 : -84)];

function riverPath() {
  const pts = [];
  for (let sp = -1; sp <= 13; sp++) pts.push([X(sp), Y(sp)]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function drawBoardStatic() {
  const d = riverPath();
  const reachLbl = [[REACH_NAMES[0], 1, 4], [REACH_NAMES[1], 5, 8], [REACH_NAMES[2], 9, 11]].map(([n, a, b], i) =>
    `<text x="${(X(a) + X(b)) / 2}" y="22" text-anchor="middle">REACH ${ROMAN[i]} · ${n.toUpperCase()}</text>`).join("");
  const nums = Array.from({ length: 13 }, (_, sp) => `<text x="${X(sp)}" y="392" text-anchor="middle">${sp === 0 ? "near shore" : sp === 12 ? "" : sp}</text>`).join("");
  $("board").innerHTML = `
  <defs>
    <radialGradient id="litGrad"><stop offset="0" stop-color="#D7263D" stop-opacity=".55"/><stop offset=".6" stop-color="#D7263D" stop-opacity=".12"/><stop offset="1" stop-color="#D7263D" stop-opacity="0"/></radialGradient>
    <radialGradient id="soulGrad"><stop offset="0" stop-color="#EFE7D6" stop-opacity=".55"/><stop offset="1" stop-color="#8FD6E1" stop-opacity="0"/></radialGradient>
    <radialGradient id="shoreGrad"><stop offset="0" stop-color="#E6D3A3" stop-opacity=".7"/><stop offset="1" stop-color="#E6D3A3" stop-opacity="0"/></radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="2.5"/></filter>
  </defs>
  <rect width="1120" height="400" fill="#121117"/>
  <circle class="shore" cx="${X(12) + 20}" cy="${Y(12)}" r="120" fill="url(#shoreGrad)"/>
  <path d="${d}" fill="none" stroke="#08080c" stroke-width="92" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="#0f1219" stroke-width="70" stroke-linecap="round"/>
  <path class="flow" d="${d}" fill="none" stroke="#8FD6E1" stroke-opacity=".35" stroke-width="1.6" transform="translate(0,-18)"/>
  <path class="flow b" d="${d}" fill="none" stroke="#8FD6E1" stroke-opacity=".25" stroke-width="1.2" transform="translate(0,14)"/>
  <path class="flow" d="${d}" fill="none" stroke="#E6D3A3" stroke-opacity=".15" stroke-width="1" style="animation-duration:7s"/>
  <g stroke="#4A4642" stroke-dasharray="4 6">
    <path d="M${(X(4) + X(5)) / 2} 34 V372"/><path d="M${(X(8) + X(9)) / 2} 34 V372"/>
  </g>
  <g font-family="IBM Plex Mono, monospace" font-size="11" fill="#9A948C" letter-spacing="1.4">${reachLbl}</g>
  <g font-family="IBM Plex Mono, monospace" font-size="11" fill="#9A948C">${nums}</g>
  <g transform="translate(${X(12)}, ${Y(12)})">
    <use href="#nb-light" x="-22" y="-26" width="44" height="48" style="color:#E6D3A3"/>
    <text y="-48" text-anchor="middle" font-family="IM Fell English SC, serif" font-size="16" fill="#E6D3A3">Far Shore</text>
  </g>
  <g id="dyn"></g>
  <g id="soulG"><g class="bob">
    <circle class="soulglow" r="34" fill="url(#soulGrad)"/>
    <use href="#nb-soul" x="-19" y="-24" width="38" height="44" style="color:#EFE7D6"/>
  </g></g>`;
}

function drawBoard() {
  const s = S;
  const p = prev || { tok: s.tok, griev: s.griev, revealed: s.revealed, flooded: s.flooded, soul: s.soul };
  const targets = pending && canAct() && pending.targets ? new Set(pending.targets) : new Set();
  let h = "";
  for (let sp = 1; sp < 12; sp++) {
    if (E.lit(s, sp) && sp >= s.soul) h += `<ellipse class="bloomglow" cx="${X(sp)}" cy="${Y(sp)}" rx="44" ry="30" fill="url(#litGrad)"/>`;
  }
  for (let sp = 1; sp < 12; sp++) {
    if (!s.flooded[sp]) continue;
    const isNew = !p.flooded[sp];
    h += `<g transform="translate(${X(sp)},${Y(sp)})"><g class="${isNew ? "floodin" : ""}">
      <ellipse rx="34" ry="26" fill="#000" stroke="#4A4642" stroke-width="1.5"/>
      <ellipse class="ripple" rx="30" ry="20" fill="none" stroke="#8FD6E1" stroke-opacity=".5"/>
      <ellipse class="ripple b" rx="30" ry="20" fill="none" stroke="#8FD6E1" stroke-opacity=".4"/>
      <use href="#nb-blackwater" x="-17" y="-17" width="34" height="34" style="color:#9A948C"/></g></g>`;
  }
  for (let k = 2; k < E.NSLOT; k++) {
    const [cx, cy] = slotXY(k);
    const sp = k >> 1;
    const behind = sp < s.soul;
    let inner = "";
    if (s.griev[k]) {
      inner = `<g class="${p.griev[k] ? "" : "grievin"}"><g class="griev"><use href="#nb-grievance" x="${cx - 21}" y="${cy - 21}" width="42" height="42" style="color:#8FD6E1"/></g></g>`;
    } else if (s.tok[k] === E.BLOOM) {
      const fresh = p.tok[k] !== E.BLOOM;
      inner = `<g class="${fresh ? "bloomin" : ""}"><circle cx="${cx}" cy="${cy}" r="24" fill="rgba(215,38,61,.12)" stroke="#E6D3A3" stroke-width="1.2"/>
        <use href="#nb-bloom" x="${cx - 21}" y="${cy - 21}" width="42" height="42" style="color:#D7263D"/></g>`;
    } else if (s.tok[k] === E.ROOT) {
      const cls = p.tok[k] === E.BLOOM ? "wither" : p.tok[k] === E.NONE ? "pop" : "";
      inner = `<g class="${cls}"><use href="#nb-root" x="${cx - 19}" y="${cy - 19}" width="38" height="38" style="color:#E6D3A3"/></g>`;
    } else if (!s.revealed[k]) {
      inner = `<g class="fogpuff"><use href="#nb-fog" x="${cx - 20}" y="${cy - 20}" width="40" height="40" style="color:#9A948C"/></g>`;
    } else {
      const t = s.tile[k];
      const icon = { [STONY]: ["nb-stony", "#9A948C"], [MEMORY]: ["nb-memorysite", "#E6D3A3"], [GRAVE]: ["nb-grave", "#8FD6E1"], [FERTILE]: ["nb-fertile", "#6d665e"] }[t];
      inner = `<g class="${p.revealed[k] ? "" : "revealin"}" opacity="${t === FERTILE ? 0.5 : 0.85}"><use href="#${icon[0]}" x="${cx - 14}" y="${cy - 14}" width="28" height="28" style="color:${icon[1]}"/></g>`;
    }
    const tgt = targets.has(k);
    h += `<g class="slot${tgt ? " target" : ""}" data-k="${k}" opacity="${behind ? 0.3 : 1}"><title>${esc(slotTitle(k))}</title>
      <rect class="frame" x="${cx - 27}" y="${cy - 27}" width="54" height="54" rx="8"/>${inner}</g>`;
  }
  $("dyn").innerHTML = h;
  const sp = Math.min(s.soul, 12);
  $("soulG").style.transform = `translate(${X(sp)}px, ${Y(sp)}px)`;
  if (p.soul > s.soul) $("boardwrap").classList.add("shake");
}

function slotTitle(k) {
  const s = S;
  const where = `Space ${k >> 1}, ${k % 2 ? "lower" : "upper"} bank`;
  if (s.griev[k]) return `${where}: Grievance`;
  if (s.tok[k] === E.BLOOM) return `${where}: Bloom`;
  if (s.tok[k] === E.ROOT) return `${where}: Root`;
  return `${where}: ${s.revealed[k] ? TILE_NAMES[s.tile[k]] : "fog"}`;
}

// ---------------------------------------------------------------- side panels
function drawLoom() {
  const cap = S.cfg.karmaCap;
  $("loom").innerHTML = [0, 1, 2].map(t => {
    let knots = "";
    for (let k = 0; k < cap; k++) {
      const on = k < S.karma[t];
      const isNew = on && prev && k >= (prev.karma?.[t] ?? 0);
      knots += `<span class="kn ${on ? "on" : ""} ${on && S.karma[t] >= cap - 1 ? "hot" : ""} ${isNew ? "new" : ""}">${on ? svgUse("nb-knot") : ""}</span>`;
    }
    return `<div class="thread ${TAGCLS[t]} ${S.echo === t ? "echo" : ""}">${svgUse(TAG_ICONS[t])}
      <span>${TAG_NAMES[t]}${S.echo === t ? ' <span class="echotag">ECHO</span>' : ""}</span><span class="knots">${knots}</span></div>`;
  }).join("") + (S.echo < 0 ? '<small class="muted">No Echo on the Loom.</small>' : "");
}

function drawSoulboard() {
  const c = S.cfg, f = S.forgotten.length;
  let cells = "";
  for (let n = 1; n <= c.forgottenLimit; n++) {
    const cls = [n <= f ? "fill" : "", n === c.ashAt || n === c.adriftAt ? "mark" : "", n === c.forgottenLimit ? "end" : "", prev && n <= f && n > prev.forgotten ? "new" : ""].join(" ");
    cells += `<span class="cell ${cls}" title="${n === c.ashAt ? "Light as Ash" : n === c.adriftAt ? "Adrift" : n === c.forgottenLimit ? "Faded" : ""}">${n}</span>`;
  }
  let bw = "";
  for (let n = 0; n < c.bwSupply; n++) bw += svgUse("nb-blackwater", n < S.bw ? "" : "dim", "color:#9A948C");
  const fr = [0, 1, 2].map(n => svgUse("nb-fracture", n < S.fract ? "" : "dim", "color:#D7263D")).join("");
  const mantles = Object.entries(MANTLES).map(([m, info]) =>
    `<div title="${esc(info.text)}"><span class="${TAGCLS[info.tag]}">${esc(info.name)}</span><b>${S.mantles[m] >= 0 ? esc(S.names[S.mantles[m]]) : '<span class="muted">free</span>'}</b></div>`).join("");
  $("soulboard").innerHTML = `
    <div class="lbl">Forgotten ${f} of ${c.forgottenLimit}</div>
    <div class="track" style="grid-template-columns:repeat(${c.forgottenLimit},minmax(0,1fr))">${cells}</div>
    <small class="muted">At ${c.ashAt} the soul is Light as Ash and glides faster.${c.adriftAt < 99 ? ` At ${c.adriftAt} it may drift Adrift into the dark.` : ""}</small>
    <div class="lbl">Fractures</div><div class="icons">${fr}</div>
    <div class="lbl">Black Water supply</div><div class="icons">${bw}</div>
    <div class="lbl">Light</div><div class="icons">${svgUse("nb-light", "", "color:#E6D3A3")}<span style="font-family:var(--display);font-size:1.3rem;color:var(--bone)">${S.light}</span>
      <small class="muted">Mantles cost ${c.mantleCost}</small></div>
    <div class="lbl">Mantles</div><div class="mantles">${mantles}</div>`;
}

function drawBook() {
  const ids = new Set();
  $("book").innerHTML = BOOK_FRAMES.map(([title, frame], r) => {
    const page = S.book[r];
    const text = frame.replace(/\{(\w+)\}/g, (_, slot) => {
      const cid = page[slot];
      if (cid === undefined) return `<span class="gone">[${slot.toLowerCase()}]</span>`;
      ids.add(`${r}-${slot}`);
      return `<b class="${prevBookIds.has(`${r}-${slot}`) ? "" : "new"}">${esc(CARDS[cid].band)}</b>`;
    });
    return `<div class="page ${S.blessed[r] ? "blessed" : ""}"><h3><span>${title}</span><span>${S.blessed[r] ? svgUse("nb-seal", "", "width:18px;height:18px;color:#E6D3A3") : ""}</span></h3>${text}</div>`;
  }).join("");
  prevBookIds = ids;
}

function drawLog() {
  const el = $("log");
  el.innerHTML = S.log.map(l => `<div class="k-${l.kind}">${esc(l.msg)}</div>`).join("");
  el.scrollTop = el.scrollHeight;
}

function drawStatus() {
  const soul = SOULS[S.cfg.soul];
  $("status").innerHTML = `
    <span><b>${esc(soul.name)}</b></span>
    <span>Lantern <b>${S.cfg.lantern}</b></span>
    <span>Turn <b>${S.turn}</b></span>
    <span>Reach <b>${ROMAN[S.reach]}</b> · ${REACH_NAMES[S.reach]}</span>
    <span>Soul at <b>${Math.min(S.soul, 12)}</b> / 12</span>
    <span>Deck <b>${S.deck.length}</b> · Discard <b>${S.discard.length}</b></span>
    ${mode === "online" ? `<span class="net"><span class="dot"></span>${esc(net?.code || "")} · you are ${esc(S.names[mySeat])}</span>` : ""}`;
}

// ---------------------------------------------------------------- prompt and hand
function setPrompt(html, mine = false) {
  const el = $("prompt");
  el.innerHTML = html;
  el.classList.toggle("mine", mine);
}

function drawPrompt() {
  if (S.result) { setPrompt(`<span class="msg">${S.result === "win" ? "<b>The soul has crossed.</b>" : `<b>Lost: ${esc(S.cause)}.</b>`}</span><button type="button" id="seeend">See the ending</button>`); $("seeend").onclick = () => { endShown = false; showEnd(); }; return; }
  const who = esc(S.names[S.cur]);
  if (!canAct()) {
    const why = mode === "local" ? `Waiting for <b>${who}</b> to take the lantern.` : `<b>${who}</b> is playing. ${mode === "online" ? "Study your hand while you wait." : ""}`;
    setPrompt(`<span class="msg">${why}</span>`);
    return;
  }
  if (pending) {
    const skip = `<button type="button" id="skip">Skip</button>`;
    if (pending.type === "root") setPrompt(`<span class="msg">Choose where <b>Root ${pending.i} of ${pending.n}</b> grows. Glowing slots touch the network${pending.stony ? " (Stony ground allowed)" : ""}.</span>${skip}`, true);
    else if (pending.type === "bloom") setPrompt(`<span class="msg">Choose a Root to <b>Bloom</b> (${pending.i} of ${pending.n}).</span>${skip}`, true);
    else if (pending.type === "bringer") setPrompt(`<span class="msg"><b>The Bloom-Bringer</b>: bloom one Root for free.</span>${skip}`, true);
    else if (pending.type === "inscribe") {
      const c = CARDS[pending.cid];
      setPrompt(`<span class="msg">Inscribe <b>“${esc(c.band)}”</b> as the ${c.slot} on page ${ROMAN[S.reach]}? The card leaves the deck for good.</span>
        <button type="button" class="primary" id="yes">Inscribe</button><button type="button" id="no">Keep it in the deck</button>`, true);
      $("yes").onclick = () => { A.sfx("inscribe"); answer(true); };
      $("no").onclick = () => answer(false);
      return;
    }
    $("skip").onclick = () => answer(null);
    return;
  }
  if (busy) { setPrompt(`<span class="msg">…</span>`, true); return; }
  const n = S.played + 1;
  const echo = S.echo >= 0 && S.played === 0 ? ` The Echo is <b class="${TAGCLS[S.echo]}">${TAG_NAMES[S.echo]}</b>: a first card of that thread Resonates.` : "";
  const sum = E.canSummon(S) ? `<button type="button" id="summon">Summon a Mantle (${S.cfg.mantleCost} Light)</button>` : "";
  setPrompt(`<span class="msg">${S.n > 1 ? `<b>${who}</b>, choose` : "Choose"} card ${n} of ${S.cfg.cardsPerTurn}.${echo}</span>${sum}`, true);
  if (sum) $("summon").onclick = summonDialog;
}

function viewSeat() {
  if (mode === "local") return S.n === 1 || uncovered === S.cur ? S.cur : -1;
  if (controls(S.cur)) return S.cur;
  return mySeat;
}

function cardHTML(cid, opts = {}) {
  const c = CARDS[cid];
  const res = opts.resonant;
  return `<div class="card t${c.tag} ${opts.playable ? "playable" : ""} ${opts.sel ? "sel" : ""} ${res ? "resonant" : ""} ${opts.dealt ? "dealt" : ""}" data-cid="${cid}" ${opts.playable ? 'role="button" tabindex="0"' : ""}>
    <div class="top">${svgUse(TAG_ICONS[c.tag], TAGCLS[c.tag])}<div><div class="nm">${esc(c.name)}</div><div class="tag">${TAG_NAMES[c.tag]}${c.key ? ' · <span class="key">Key Memory</span>' : ""}</div></div></div>
    <div class="eff">${esc(opsText(c.eff))}</div>
    <div class="res"><b>Resonance:</b> ${c.rr ? "instead, " : ""}${esc(opsText(c.res))}</div>
    ${c.slot ? `<div class="band">${svgUse(SLOT_ICON[c.slot], "", "color:#E6D3A3")}<span>${esc(c.band)}</span></div>` : '<div class="band"><span class="muted">An Oblivion card is forgotten after use.</span></div>'}
    ${opts.sel ? `<div class="modes">
      <button type="button" data-play="up">Play face up${res ? " · Resonates" : ""}</button>
      <button type="button" data-play="down">Face down · 1 Root, no knot</button>
      <button type="button" data-play="burn">Burn · twice, then forget it and 1 more</button></div>` : ""}
  </div>`;
}

function drawHand() {
  const el = $("hand");
  const seat = viewSeat();
  if (S.result) { el.innerHTML = ""; prevHand = []; return; }
  if (seat < 0) {
    el.innerHTML = Array.from({ length: S.hands[S.cur].length }, () => `<div class="card back">${svgUse("nb-bloom")}</div>`).join("");
    prevHand = [];
    return;
  }
  const hand = S.hands[seat];
  const playable = seat === S.cur && canPlayCards();
  el.innerHTML = (seat !== S.cur ? `<div class="muted" style="width:100%">Your hand (${esc(S.names[seat])})</div>` : "") + hand.map(cid => cardHTML(cid, {
    playable, sel: playable && selected === cid, dealt: !prevHand.includes(cid),
    resonant: playable && S.played === 0 && S.echo === CARDS[cid].tag,
  })).join("");
  prevHand = [...hand];
  if (!playable) return;
  el.querySelectorAll(".card.playable").forEach(card => {
    const cid = +card.dataset.cid;
    const pick = e => {
      if (e.target.closest("[data-play]")) return;
      selected = selected === cid ? null : cid;
      drawHand();
    };
    card.addEventListener("click", pick);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(e); } });
    card.querySelectorAll("[data-play]").forEach(b => b.onclick = () => playSelected(cid, b.dataset.play));
  });
}

function flyCard(cid) {
  const src = document.querySelector(`.card[data-cid="${cid}"]`);
  const board = $("boardwrap");
  if (!src || !board || !src.animate) return;
  const a = src.getBoundingClientRect(), b = board.getBoundingClientRect();
  const clone = src.cloneNode(true);
  clone.classList.add("flycard");
  clone.querySelector(".modes")?.remove();
  Object.assign(clone.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, margin: 0 });
  document.body.appendChild(clone);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  clone.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.35) rotate(-8deg)`, opacity: 0, filter: "blur(2px)" }],
    { duration: 750, easing: "cubic-bezier(.3,.6,.2,1)" }).onfinish = () => clone.remove();
}

// ---------------------------------------------------------------- refresh everything
function refresh() {
  if (!S || !$("board")) return;
  if (!$("dyn")) drawBoardStatic();
  drawStatus();
  drawBoard();
  drawLoom();
  drawSoulboard();
  drawBook();
  drawLog();
  drawPrompt();
  drawHand();
  topbar();
  animateEvents();
  prev = { tok: [...S.tok], griev: [...S.griev], revealed: [...S.revealed], flooded: [...S.flooded], soul: S.soul, karma: [...S.karma], forgotten: S.forgotten.length };
}

// ---------------------------------------------------------------- event animations and sound
const queue = [];
let running = false, idleWaiters = [];
function enqueue(fn) {
  queue.push(fn);
  if (!running) runQueue();
}
async function runQueue() {
  running = true;
  while (queue.length) {
    const ms = queue.shift()();
    await new Promise(r => setTimeout(r, ms));
  }
  running = false;
  idleWaiters.splice(0).forEach(r => r());
}
const idle = () => (running || queue.length ? new Promise(r => idleWaiters.push(r)) : Promise.resolve());

function animateEvents() {
  const evs = S.ev.filter(e => e.id > lastEv);
  if (!evs.length) return;
  lastEv = evs[evs.length - 1].id;
  const sounds = new Set();
  for (const ev of evs) {
    switch (ev.kind) {
      case "root": sounds.add("root"); break;
      case "bloom": sounds.add("bloom"); break;
      case "flood": sounds.add("flood"); break;
      case "drain": sounds.add("drain"); break;
      case "grievance": sounds.add("grievance"); break;
      case "forget": sounds.add("forget"); break;
      case "move": sounds.add("move"); break;
      case "linger": sounds.add("linger"); toast(ev.msg); break;
      case "play":
        if (!seats.has(ev.p) || mode === "local") toast(ev.msg, ev.cid >= 0 ? CARDS[ev.cid].tag : 1);
        if (!seats.has(ev.p)) sounds.add("card");
        if (ev.res) { sounds.add("resonance"); enqueue(() => banner("Resonance", "The card answers the Echo", "obl")); }
        break;
      case "ghost": toast(ev.msg, ev.tag); sounds.add("card"); break;
      case "inscribe": toast(ev.msg, 1); if (!seats.has(S.cur)) sounds.add("inscribe"); break;
      case "blessing": enqueue(() => { A.sfx("inscribe"); return banner("Chapter Blessing", ev.msg.replace("Chapter Blessing: ", ""), "good"); }); break;
      case "summon": enqueue(() => { A.sfx("summon"); return banner(ev.msg, MANTLES[ev.mantle].text, ["obs", "acc", "obl"][MANTLES[ev.mantle].tag]); }); break;
      case "mist": enqueue(() => mistCard(ev.name)); break;
      case "backlash": enqueue(() => { A.sfx("backlash"); shake(); return banner(`Backlash · ${TAG_NAMES[ev.tag]}`, ev.msg.split("! ")[1] || "", ["obs", "acc", "obl"][ev.tag]); }); break;
      case "fracture": enqueue(() => { A.sfx("fracture"); flash(); shake(); return 900; }); break;
      case "reach": enqueue(() => { A.sfx("summon"); return banner(`Reach ${ROMAN[ev.reach]}`, REACH_NAMES[ev.reach], "good"); }); break;
      case "turn": if (mode !== "local") sounds.add("turn"); break;
      case "win": enqueue(() => { A.sfx("win"); return 400; }); break;
      case "loss": enqueue(() => { A.sfx("loss"); return 400; }); break;
    }
  }
  let delay = 0;
  for (const snd of sounds) { setTimeout(() => A.sfx(snd), delay); delay += 90; }
}

function mistCard(name) {
  A.sfx("mist");
  const harsh = HARSH_NAMES.has(name);
  const el = document.createElement("div");
  el.className = `mistcard ${harsh ? "harsh" : ""}`;
  el.innerHTML = `<div class="k">${harsh ? "Harsh Mist" : "The Mist"}</div>${svgUse("nb-fog")}<h3>${esc(name)}</h3><p>${esc(MIST_TEXT[name] || "")}</p>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2700);
  return 2300;
}
function banner(title, sub, cls) {
  const el = document.createElement("div");
  el.className = `banner ${cls || ""}`;
  el.innerHTML = `${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ""}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
  return 1900;
}
function flash() {
  const el = document.createElement("div");
  el.className = "flash";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
function shake() {
  const b = $("boardwrap");
  if (!b) return;
  b.classList.remove("shake");
  void b.offsetWidth;
  b.classList.add("shake");
}
function toast(msg, tag = 1) {
  const box = $("toasts");
  const el = document.createElement("div");
  el.className = `toast t${tag}`;
  el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 4) box.firstElementChild.remove();
  setTimeout(() => el.remove(), 4600);
}

// ---------------------------------------------------------------- dialogs
function veil(html) {
  closeVeil();
  const v = document.createElement("div");
  v.className = "veil";
  v.id = "veil";
  v.innerHTML = html;
  document.body.appendChild(v);
  v.querySelector("button")?.focus();
}
function closeVeil() { $("veil")?.remove(); }

async function showEnd() {
  if (endShown) return;
  endShown = true;
  await idle();
  await new Promise(r => setTimeout(r, 600));
  if (!S || !S.result) return;
  const win = S.result === "win";
  const fate = E.keyMemoryFate(S);
  const soul = SOULS[S.cfg.soul];
  const fateText = fate && {
    inscribed: `The Key Memory was written into the Book. ${soul.name} crosses remembering what mattered most.`,
    forgotten: `The Key Memory was lost to the river. ${soul.name} ${win ? "arrives lighter, and emptier" : "goes into the mist without it"}.`,
    unspoken: `The Key Memory was never written down. Some things go across unsaid.`,
  }[fate];
  const pages = BOOK_FRAMES.map(([title, frame], r) => `<div class="page"><h3>${title}</h3>${frame.replace(/\{(\w+)\}/g, (_, slot) => {
    const cid = S.book[r][slot];
    return cid === undefined ? `<span class="gone">…but this, the river has taken</span>` : `<b>${esc(CARDS[cid].band)}</b>`;
  })}</div>`).join("");
  const canRestart = mode !== "online" || net?.role === "host";
  veil(`<div class="dialog wide end">
    <div class="eyebrow">${esc(soul.name)} · Lantern ${S.cfg.lantern}</div>
    <h2 class="${S.result}">${win ? "The soul reaches the Far Shore" : { Faded: "Faded", Shattered: "Shattered", Deluge: "Deluge", Stalled: "Stalled" }[S.cause]}</h2>
    <p class="muted">${esc(S.log.filter(l => l.kind === "win" || l.kind === "loss").pop()?.msg || "")}</p>
    ${fateText ? `<p style="font-family:var(--serif);font-style:italic;color:var(--bone)">${esc(fateText)}</p>` : ""}
    <div class="stats">
      <div><b>${S.turn}</b>turns</div><div><b>${Math.min(S.soul, 12)}/12</b>spaces crossed</div>
      <div><b>${S.forgotten.length}</b>forgotten</div><div><b>${S.stats.resonances}</b>resonances</div>
      <div><b>${S.stats.inscribed}</b>memories inscribed</div><div><b>${S.stats.backlashes}</b>backlashes</div>
    </div>
    <h3 style="color:var(--bone)">The Book of Remembrance</h3>
    <div class="book">${pages}</div>
    <div class="row">${canRestart ? '<button type="button" class="primary" id="again">Cross again</button>' : '<span class="muted">The host can start another crossing.</span>'}
      <button type="button" id="tomenu">Back to the menu</button><button type="button" id="stay">Look at the board</button></div>
  </div>`);
  $("tomenu").onclick = () => { leaveGame(); menu(); };
  $("stay").onclick = closeVeil;
  if (canRestart) $("again").onclick = () => {
    if (mode === "online") {
      const names = S.names;
      const s = E.newGame(E.makeConfig({ players: S.n, soul: S.cfg.soul, lantern: S.cfg.lantern }), undefined, names);
      s.gid = Math.random().toString(36).slice(2, 10);
      seats = new Set([0, ...net.players.map((p, i) => (p.online ? -1 : i)).filter(i => i > 0)]);
      net.api.broadcast({ t: "state", s });
      beginGame(s);
    } else startLocal(mode, S.n);
  };
}

function rules() {
  veil(`<div class="dialog wide">
    <div class="eyebrow">How to play</div>
    <h2>Carry the soul across</h2>
    <p>A soul has woken on the near shore of the river of forgetting. Together you must grow a path of spider lilies (Netherbloom) for it to follow to the Far Shore at space 12. The game is <b>silent</b>: never tell the others what is in your hand. The cards you play are your only voice.</p>
    <h3 style="color:var(--bone)">Your turn</h3>
    <ul>
      <li><b>Summon (optional).</b> Before your first card you may pay Light and discard a matching card to take a Mantle with a lasting power.</li>
      <li><b>Play 2 cards</b>, each in one of three ways:
        <ul><li><b>Face up</b>: do its effect, tie a knot on its thread in the Loom, and it becomes the new <b>Echo</b>.</li>
        <li><b>Face down</b>: just place 1 Root. No knot, no Echo.</li>
        <li><b>Burn</b>: do its effect twice, then forget the card and the top card of the deck.</li></ul></li>
      <li><b>Resonance.</b> If your <i>first</i> card is on the same thread as the Echo, it also does its Resonance effect, and you may inscribe its memory in the Book of Remembrance.</li>
      <li><b>Soul Step.</b> If the next space is <b>Lit</b> (a Bloom on either bank) and not flooded, the soul moves forward and gains 1 Light for each Bloom it leaves behind. If not, it <b>Lingers</b>: beside its own light it simply waits; in the dark it forgets a card.</li>
      <li><b>The Mist</b> then turns a card: Black Water, Grievances, Withering, Fog or cold winds.</li>
    </ul>
    <h3 style="color:var(--bone)">The river</h3>
    <ul>
      <li><b>Roots</b> must touch the network: next to the soul, or beside another token on the same or opposite bank. Fog hides each bank until a Root reveals it: <b>Stony</b> ground refuses ordinary Roots, a <b>Grave</b> raises a Grievance, and a <b>Memory Site</b> rewards you.</li>
      <li><b>Black Water</b> blocks a space. Roots on both banks drink it away. If water must rise and the supply is empty: <b>Deluge</b>.</li>
      <li>A <b>Grievance</b> beside the soul feeds on it and causes a <b>Fracture</b>. A Grievance with Blooms on both sides along its bank dissolves in the light.</li>
      <li><b>The Loom.</b> A thread that fills snaps in a Backlash: Obsession brings a Grievance, Acceptance makes the soul sit down and Linger, Oblivion raises Black Water. The Loom clears at each new Reach.</li>
      <li><b>Forgetting</b> is not all bad: at 6 forgotten the soul is Light as Ash and glides faster. At 9 it may drift Adrift into the dark and Fracture.</li>
    </ul>
    <h3 style="color:var(--bone)">The end</h3>
    <p>You win when the soul reaches the Far Shore. You lose if too much is forgotten (<b>Faded</b>), at the third Fracture (<b>Shattered</b>), or in a <b>Deluge</b>. In solo play the <b>Ghost</b> plays a card from its own small deck after each of your turns.</p>
    <div class="row"><button type="button" class="primary" id="ok">Into the Mist</button></div></div>`);
  $("ok").onclick = closeVeil;
}

boot();
