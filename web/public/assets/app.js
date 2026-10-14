// Netherbloom web table: menus, the board, the hand, animations and the three ways to play
// (solo against the Ghost, everyone at one screen, or online with each player on their own device).
import * as E from "./engine.js";
import { CARDS, TAG_ICONS, SOULS, FIRST_SOUL, MANTLES, LANTERN, STANDARD_LANTERN, lanternIcon, HARSH, STONY, MEMORY, GRAVE, FERTILE } from "./cards.js";
import * as A from "./audio.js";
import { soulMiniature } from "./miniature.js";
import * as N from "./net.js";
import { rulebook, playerAid } from "./rules.js";
import { openBook, closeBook, refreshBook, resetBookMemory, relangBook } from "./book.js";
import {
  LANGS, lang, zh, setLang, onLang, hasChosenLang, say, backlashText, causeName, cardName, cardBand, tagName, slotLabel, tileName,
  reachName, soulInfo, mantleInfo, mistName, mistText, bookFrames, ops, pname, lanternName,
} from "./i18n.js";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const svgUse = (id, cls = "", style = "") => `<svg class="${cls}" style="${style}" aria-hidden="true"><use href="#${id}"/></svg>`;
const TAGCLS = ["c-obs", "c-acc", "c-obl"];
const TAGCOL = ["#D7263D", "#E6D3A3", "#8FD6E1"];
const SLOT_ICON = { Place: "nb-slot-place", Person: "nb-slot-person", Deed: "nb-slot-deed", Feeling: "nb-slot-feeling" };
const HARSH_NAMES = new Set(HARSH.map(h => h[0]));
const ROMAN = ["I", "II", "III"], ZHNUM = ["一", "二", "三"];
// Inline bilingual text: L("English", "中文").
const L = (en, zhText) => (zh() ? zhText : en);
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

// ---------------------------------------------------------------- app state
let S = null;              // the game
let mode = null;           // "solo" | "local" | "online"
let seats = new Set();     // seats this browser plays
let mySeat = 0;            // online: this player's own seat
let uncovered = -1;        // same-screen play: the seat whose hand is showing
let pending = null;        // a choice the active player must make
let busy = false;          // a card is resolving
let selected = null;       // card opened up close from the hand
let arriving = new Set();  // cards drawn this playback that are still in the air: the hand keeps their place empty
let dockOpen = true;       // the hand panel along the foot of the window
try { dockOpen = localStorage.getItem("nb-dock") !== "0"; } catch { /* storage blocked */ }
let lastEv = 0;            // last event animated
// Step-by-step playback: while effects are being shown, the table is drawn from the snapshot of the step on
// screen (`view`) rather than from the finished state, so every effect happens in order, as at a real table.
let view = null;
let fxSpeed = 1;
try { fxSpeed = +localStorage.getItem("nb-fx") || 1; } catch { /* storage blocked */ }
let prev = null;           // board as last drawn, for change animations
let prevHand = [];
let prevBookIds = new Set();
let passOpen = false, endShown = false;
let net = null;            // online session
let guideStep = null;      // set while the end-of-turn animations play, so the guide can follow them
let screen = null;         // what fills the window, so a language change can redraw it: ["menu", which] | ["lobby", note] | ["game"]
const setup = load("nb-setup", { players: 3, soul: "child", lantern: STANDARD_LANTERN, names: ["", "", "", ""], name: "" });
// Saved before the four named Lanterns: Lanterns 1–5 become Gentle, Gentle, Standard, Hard, Heroic.
if (hasStored("nb-setup") && !setup.lv) setup.lantern = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4 }[setup.lantern] || STANDARD_LANTERN;
setup.lv = 2;

function load(key, dflt) {
  try { return { ...dflt, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch { return dflt; }
}
function hasStored(key) { try { return localStorage.getItem(key) !== null; } catch { return false; } }
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
  $("btn-fx").onclick = () => {
    fxSpeed = fxSpeed < 1 ? 1 : 0.45;
    try { localStorage.setItem("nb-fx", String(fxSpeed)); } catch { /* storage blocked */ }
    topbar();
  };
  $("btn-sfx").onclick = () => { A.setSfx(!A.isSfxOn()); topbar(); };
  buildDrawer();
  $("btn-rules").onclick = () => openDrawer("rules");
  $("btn-aid").onclick = () => openDrawer("aid");
  $("btn-lang").onclick = () => setLang(zh() ? "en" : "zh");
  onLang(relang);
  $("btn-menu").onclick = () => {
    if (S && !S.result && !confirm(L("Leave this game and return to the menu?", "要離開這場遊戲並回到主選單嗎？"))) return;
    leaveGame();
    menu();
  };
  topbar();
  if (hasChosenLang()) menu(); else chooseLanguage();
}

// The first visit asks for a language; afterwards the top-bar button switches at any time.
function chooseLanguage() {
  $("app").innerHTML = `<div class="screen langpick">
    <div class="hero"><svg class="lily" aria-hidden="true"><use href="#nb-bloom"/></svg><h1>Netherbloom</h1><p>Choose your language · 請選擇語言</p></div>
    <div class="langopts">${Object.entries(LANGS).map(([k, v]) => `<button type="button" data-lang="${k}" class="${k === lang() ? "on" : ""}">${v}</button>`).join("")}</div>
  </div>`;
  document.querySelectorAll("[data-lang]").forEach(b => b.onclick = () => { setLang(b.dataset.lang); menu(); });
}

// Redraw everything on screen in the new language. The game itself is unchanged.
function relang() {
  topbar();
  rebuildDrawer();
  if (screen?.[0] === "menu") menu(screen[1]);
  else if (screen?.[0] === "lobby" && net) lobby(screen[1]);
  else if (S && $("board")) {
    const kind = $("veil")?.dataset.kind;
    buildTable();
    refresh();
    if (kind === "end") { endShown = false; showEnd(true); }
    else if (kind === "pass") showPass();
    else if (kind === "summon") summonDialog();
  }
  relangBook();
}

function topbar() {
  $("btn-music").textContent = L(`Music: ${A.isMusicOn() ? "on" : "off"}`, `音樂：${A.isMusicOn() ? "開" : "關"}`);
  $("btn-sfx").textContent = L(`Sound: ${A.isSfxOn() ? "on" : "off"}`, `音效：${A.isSfxOn() ? "開" : "關"}`);
  $("btn-fx").textContent = L(`Effects: ${fxSpeed < 1 ? "fast" : "step by step"}`, `效果：${fxSpeed < 1 ? "快速" : "逐步"}`);
  $("btn-fx").title = L("How quickly each effect is played out on the table", "每個效果在桌面上演示的速度");
  $("btn-lang").textContent = zh() ? "English" : "中文";
  $("btn-lang").title = L("Switch to Traditional Chinese", "切換為英文");
  $("btn-aid").textContent = L("Player Aid", "玩家輔助卡");
  $("btn-rules").textContent = L("Rulebook", "規則書");
  $("btn-menu").textContent = L("Menu", "主選單");
  $("btn-out").textContent = L("Sign out", "登出");
  $("btn-menu").classList.toggle("hidden", !S && !net);
  $("aid-tab").classList.toggle("hidden", !S);
  $("modelabel").textContent = mode ? (zh()
    ? { solo: "單人 · 與幽靈同行", local: "同一螢幕", online: `線上${net?.code ? " · 桌號 " + net.code : ""}` }
    : { solo: "Solo · against the Ghost", local: "Same screen", online: `Online${net?.code ? " · table " + net.code : ""}` })[mode] : "";
}

function leaveGame() {
  if (net?.api) net.api.close();
  net = null;
  S = null;
  mode = null;
  pending = null;
  busy = false;
  closeVeil();
  closeBook();
  topbar();
}

// ---------------------------------------------------------------- menu
function menu(which = "solo") {
  S = null;
  A.lullaby(null);
  screen = ["menu", which];
  topbar();
  const soulBtns = Object.keys(SOULS).map(k => [k, soulInfo(k)]).map(([k, v]) =>
    `<button type="button" class="soulopt ${setup.soul === k ? "on" : ""}" data-soul="${k}"><b>${esc(v.name)}</b>${k === FIRST_SOUL ? `<span class="firsttag" title="${L("Suggested for your first crossing", "建議第一次渡河時選擇")}">${L("Suggested first", "新手推薦")}</span>` : ""}<small>${esc(v.twist)}</small></button>`).join("");
  if (!LANTERN[setup.lantern]) setup.lantern = STANDARD_LANTERN;
  const lan = Object.keys(LANTERN).map(Number).map(l => `<button type="button" data-lantern="${l}" class="${setup.lantern === l ? "on" : ""}">${lanternIcon(l)} ${esc(lanternName(l))}</button>`).join("");
  $("app").innerHTML = `
  <div class="screen">
    <div class="hero">
      <svg class="lily" aria-hidden="true"><use href="#nb-bloom"/></svg>
      <div class="eyebrow">${L("Publisher preview", "出版社試玩版")}</div>
      <h1>Netherbloom${zh() ? '<span class="zhtitle">彼岸花渡</span>' : ""}</h1>
      <p>${L("Grow a path of Netherblooms across the river of forgetting, and carry one soul to the Far Shore before it forgets who it was. A silent co-operative game for 1 to 4.",
        "在遺忘之河上種出一條彼岸花小徑，趕在亡魂忘記自己是誰之前，護送它抵達彼岸。一款1至4人的無聲合作遊戲。")}</p>
    </div>
    <div class="modes">
      <button type="button" class="mode ${which === "solo" ? "on" : ""}" data-mode="solo"><h3>${L("Solo", "單人模式")}</h3><p>${L("You and the Ghost, an automated companion who plays a card after each of your turns.", "你與幽靈同行。幽靈是自動夥伴，會在你每個回合結束後打出一張牌。")}</p></button>
      <button type="button" class="mode ${which === "local" ? "on" : ""}" data-mode="local"><h3>${L("Same Screen", "同一螢幕")}</h3><p>${L("2 to 4 players share this window. Hands stay hidden while you pass the device.", "2至4名玩家共用這個視窗。傳遞裝置時，手牌會保持隱藏。")}</p></button>
      <button type="button" class="mode ${which === "online" ? "on" : ""}" data-mode="online"><h3>${L("Online", "線上模式")}</h3><p>${L("2 to 4 players, each on their own computer. Host a table and share its code.", "2至4名玩家，各自使用自己的電腦。開一張桌子並分享桌號。")}</p></button>
    </div>
    <section class="panel">
      <h2>${L("The soul to carry", "要護送的亡魂")}</h2>
      <div class="souls">${soulBtns}</div>
      <div class="field"><span>${L("Lantern (difficulty)", "燈籠（難度）")}</span><div class="lanterns">${lan}</div>
        <small class="muted" id="lanhelp"></small></div>
    </section>
    <section class="panel" id="modepanel"></section>
    <p class="muted" style="text-align:center;margin:0">${L("New to the river? Read", "第一次來到這條河？閱讀")} <button type="button" class="ghost" id="howto">${L("How to play", "遊戲說明")}</button></p>
    <p class="muted" style="text-align:center;margin:0;font-size:.88rem"><a href="/downloads/netherbloom-pnp.zh-TW.pdf" target="_blank" rel="noopener" style="color:var(--bone)">${L("Print & Play components (Traditional Chinese, PDF)", "下載正體中文印刷試玩配件（PDF）")}</a></p>
  </div>`;
  $("howto").onclick = () => openDrawer("rules");
  document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => menu(b.dataset.mode));
  document.querySelectorAll("[data-soul]").forEach(b => b.onclick = () => { setup.soul = b.dataset.soul; store("nb-setup", setup); menu(which); });
  document.querySelectorAll("[data-lantern]").forEach(b => b.onclick = () => { setup.lantern = +b.dataset.lantern; store("nb-setup", setup); menu(which); });
  const [bw, lim, harsh] = LANTERN[setup.lantern];
  $("lanhelp").textContent = L(`${lanternName(setup.lantern)}${setup.lantern === STANDARD_LANTERN ? " (the game as designed)" : ""}: ${bw} Black Water in the supply, Faded at ${lim} forgotten, ${harsh} harsh Mist card${harsh === 1 ? "" : "s"} per Reach.`,
    `${lanternName(setup.lantern)}燈籠${setup.lantern === STANDARD_LANTERN ? "（遊戲設計的本來面貌）" : ""}：黑水供應${bw}個，遺忘${lim}張時消散，每個河段${harsh}張凶霧。`);
  const mp = $("modepanel");
  if (which === "solo") {
    mp.innerHTML = `<h2>${L("Solo", "單人模式")}</h2><div class="form"><label class="field"><span>${L("Your name", "你的名字")}</span><input id="nm0" maxlength="18" value="${esc(setup.names[0])}" placeholder="${L("Player 1", "玩家1")}"></label></div>
      <div class="row"><button type="button" class="primary" id="go">${L("Begin the crossing", "開始渡河")}</button></div>`;
    $("go").onclick = () => {
      setup.names[0] = $("nm0").value.trim();
      store("nb-setup", setup);
      startLocal("solo", 1);
    };
  } else if (which === "local") {
    const counts = [2, 3, 4].map(n => `<button type="button" data-n="${n}" class="${setup.players === n ? "on" : ""}">${L(`${n} players`, `${n}人`)}</button>`).join("");
    mp.innerHTML = `<h2>${L("Same Screen", "同一螢幕")}</h2><div class="lanterns">${counts}</div>
      <div class="names">${[0, 1, 2, 3].slice(0, Math.max(2, setup.players)).map(i =>
        `<label class="field"><span>${L(`Player ${i + 1}`, `玩家${i + 1}`)}</span><input id="nm${i}" maxlength="18" value="${esc(setup.names[i])}" placeholder="${L(`Player ${i + 1}`, `玩家${i + 1}`)}"></label>`).join("")}</div>
      <div class="row"><button type="button" class="primary" id="go">${L("Begin the crossing", "開始渡河")}</button></div>`;
    mp.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { saveNames(); setup.players = +b.dataset.n; store("nb-setup", setup); menu("local"); });
    if (setup.players < 2) { setup.players = 3; }
    $("go").onclick = () => { saveNames(); startLocal("local", setup.players); };
  } else {
    mp.innerHTML = `<h2>${L("Online", "線上模式")}</h2>
      <div class="form">
        <label class="field"><span>${L("Your name", "你的名字")}</span><input id="nmo" maxlength="18" value="${esc(setup.name)}" placeholder="${L("Your name", "你的名字")}"></label>
        <label class="field"><span>${L("Table code (to join)", "桌號（加入時填寫）")}</span><input id="code" maxlength="5" placeholder="${L("e.g. K7QXM", "例如 K7QXM")}" style="text-transform:uppercase;letter-spacing:.2em"></label>
      </div>
      <div class="row"><button type="button" class="primary" id="hostbtn">${L("Host a new table", "開新桌")}</button><button type="button" id="joinbtn">${L("Join a table", "加入牌桌")}</button><span class="muted" id="neterr"></span></div>
      <p class="muted" style="margin:0;font-size:.88rem">${L("Players connect browser to browser. Everyone signs in with the publisher account, then the host shares the five-letter code.", "玩家之間以瀏覽器直接連線。所有人都用出版社帳號登入，再由主持人分享5個字母的桌號。")}</p>`;
    const nm = () => { setup.name = $("nmo").value.trim() || "Player"; store("nb-setup", setup); return setup.name; };
    $("hostbtn").onclick = () => hostTable(nm());
    $("joinbtn").onclick = () => {
      const code = $("code").value.trim().toUpperCase();
      if (code.length !== 5) { $("neterr").textContent = L("Enter the five-letter code.", "請輸入5個字母的桌號。"); return; }
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
  screen = ["game"];
  uncovered = -1;
  pending = null;
  busy = false;
  selected = null;
  passOpen = false;
  endShown = false;
  prev = null;
  prevHand = [];
  arriving = new Set();
  pilesHeld = {};
  trayShown = 0;
  prevBookIds = new Set();
  lastEv = Math.max(0, S.evn - 1);
  guideStep = null;
  resetBookMemory();
  closeVeil();
  closeBook();
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
  lobby(L("Opening the table…", "正在開桌…"));
  net.api = N.host(code, {
    open: () => lobby(),
    error: e => { lobby(L(`Connection problem: ${e.type || e.message}`, `連線問題：${e.type || e.message}`)); },
    message: (connId, msg) => hostMessage(connId, msg),
    leave: connId => {
      const p = net.players.find(x => x.conn === connId);
      if (!p) return;
      p.online = false;
      p.conn = null;
      if (net.started) { seats.add(net.players.indexOf(p)); toast(L(`${p.name} lost connection. You will play their turns until they return.`, `${p.name}斷線了。在對方回來之前，由你代為進行其回合。`)); }
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
    if (net.started) { seats.delete(seat); toast(L(`${p.name} is back at the table.`, `${p.name}回到牌桌了。`)); }
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
  lobby(L("Looking for the table…", "正在尋找牌桌…"));
  net.api = N.join(code, {
    open: () => net.api.send({ t: "hello", name, cid: N.clientId() }),
    message: msg => guestMessage(msg),
    close: () => {
      if (!net) return;
      toast(L("The connection to the host was lost.", "與主持人的連線中斷了。"));
      if (S) setPrompt(`<span class="msg">${L("The host has left the table. <b>The game cannot continue.</b>", "主持人已離開牌桌。<b>遊戲無法繼續。</b>")}</span>`);
      else lobby(L("The host closed the table.", "主持人關閉了牌桌。"));
    },
    error: e => {
      if (!net) return;
      const text = e?.type === "peer-unavailable" ? L("No open table with that code.", "找不到這個桌號的牌桌。") : L(`Connection problem: ${e?.type || e?.message || e}`, `連線問題：${e?.type || e?.message || e}`);
      if (S) toast(text); else lobby(text);
    },
  });
}

function guestMessage(msg) {
  if (!msg || typeof msg !== "object" || !net) return;
  if (msg.t === "welcome") { mySeat = msg.seat; seats = new Set([mySeat]); if (!S) lobby(); }
  else if (msg.t === "full") lobby(L("That table is full or its game has already begun.", "這張牌桌已滿，或遊戲已經開始。"));
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
  screen = ["lobby", note];
  topbar();
  const host = net.role === "host";
  const soul = host ? setup.soul : net.soul, lan = host ? setup.lantern : net.lantern;
  const list = (net.players || []).map((p, i) => `<div><span class="dot ${p.online ? "" : "off"}"></span>${esc(p.name)}${i === 0 ? ` <span class="muted">${L("(host)", "（主持人）")}</span>` : ""}${host || i !== mySeat ? "" : ` <span class="muted">${L("(you)", "（你）")}</span>`}</div>`).join("");
  $("app").innerHTML = `
  <div class="screen">
    <section class="panel" style="justify-items:center;text-align:center">
      <div class="eyebrow">${L("Online table", "線上牌桌")}</div>
      <div class="code">${esc(net.code)}</div>
      <p class="muted" style="margin:0">${host ? L("Share this code. Other players choose Online → Join a table.", "分享這個桌號。其他玩家選擇「線上模式 → 加入牌桌」。") : L("Waiting for the host to begin.", "等待主持人開始遊戲。")}</p>
      ${note ? `<p style="margin:0;color:var(--crimson)">${esc(note)}</p>` : ""}
    </section>
    <section class="panel">
      <h2>${L("At the table", "牌桌上的玩家")} (${(net.players || []).length}/4)</h2>
      <div class="plist">${list || `<span class="muted">${L("Connecting…", "連線中…")}</span>`}</div>
      <div class="muted">${L("Soul", "亡魂")}: <b style="color:var(--bone)">${esc(soulInfo(soul)?.name || "—")}</b> · ${L("Lantern", "燈籠")} ${lan ? esc(lanternName(lan)) : "—"}</div>
      ${host ? `<div class="row"><button type="button" class="primary" id="start" ${net.players.length < 2 ? "disabled" : ""}>${L("Begin the crossing", "開始渡河")}</button>
        <span class="muted">${net.players.length < 2 ? L("Needs at least 2 players.", "至少需要2名玩家。") : ""}</span></div>
        <p class="muted" style="margin:0;font-size:.88rem">${L("To change the soul or Lantern, go back to the menu, choose them, then host again.", "若要更換亡魂或燈籠，請回到主選單重新選擇，再開一次桌。")}</p>` : ""}
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
const canPlayCards = () => canAct() && !busy && !pending && !playingBack() && S.phase === "play" && S.played < S.cfg.cardsPerTurn && S.hands[S.cur].length > 0;

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
  const name = pname(S.names[S.cur]);
  veil(`<div class="dialog pass">
    <svg class="lily" aria-hidden="true"><use href="#nb-bloom"/></svg>
    <h2>${L(`Pass the lantern to ${esc(name)}`, `把燈籠交給${esc(name)}`)}</h2>
    <p class="muted">${L("Everyone else, look away from the screen. In Netherbloom nobody speaks about their cards.", "其他人請把視線移開螢幕。在這個遊戲裡，沒有人會談論自己的手牌。")}</p>
    <button type="button" class="primary" id="reveal">${L(`I am ${esc(name)}: show my hand`, `我是${esc(name)}：顯示我的手牌`)}</button></div>`, "pass");
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
    commit();
    idle().then(() => {
      pending = { ...p, resolve };
      refresh();
    });
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
  closeZoom();
  flyCard(cid, mode_);
  selected = null;
  busy = true;
  A.sfx("card");
  try {
    if (mode_ === "seek") E.seek(S, cid);
    else await E.playCard(S, cid, mode_, chooser);
  } catch (e) {
    if (!(e instanceof E.GameOver)) throw e;
    S.phase = "over";
  }
  busy = false;
  await afterAction();
}

async function pushNow() {
  if (!canPlayCards() || !E.canPush(S)) return;
  selected = null;
  busy = true;
  try {
    E.pushAction(S);
  } catch (e) {
    if (!(e instanceof E.GameOver)) throw e;
    S.phase = "over";
  }
  busy = false;
  await afterAction();
}

async function afterAction() {
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

// Recall: choose which forgotten card comes back.
function recallDialog() {
  const rows = [...new Set(S.forgotten)].reverse().map(cid => {
    const c = CARDS[cid];
    return `<button type="button" class="recallopt t${c.tag}" data-rc="${cid}"><b>${esc(cardName(cid))}</b>${c.key ? ` <span class="firsttag">${L("Key Memory", "關鍵記憶")}</span>` : ""}
      <small>${esc(tagName(c.tag))}${c.band ? ` · <i>${esc(cardBand(cid))}</i>` : ""}</small></button>`;
  }).join("");
  veil(`<div class="dialog wide"><h2>${L("Recall a memory", "喚回一段記憶")}</h2>
    <p>${L(`As your <b>Answer</b>, spend <b>${S.cfg.recallCost} Light</b>: one forgotten card of your choice returns to the discard pile. This is your Answer, so it cannot Resonate.`,
      `以你的<b>回應</b>花費<b>${S.cfg.recallCost}點光</b>：選一張被遺忘的牌回到棄牌堆。這就是你的回應，因此無法產生共鳴。`)}</p>
    <div class="recallgrid">${rows}</div>
    <div class="row"><button type="button" id="cancel">${L("Not now", "暫時不要")}</button></div></div>`, "recall");
  $("cancel").onclick = closeVeil;
  document.querySelectorAll("[data-rc]").forEach(b => b.onclick = async () => {
    closeVeil();
    if (!canPlayCards() || !E.canRecall(S)) return;
    selected = null;
    E.recall(S, +b.dataset.rc);
    await afterAction();
  });
}

function summonDialog() {
  const p = S.cur, hand = S.hands[p];
  const rows = Object.keys(MANTLES).filter(m => S.mantles[m] === -1).map(m => {
    const info = mantleInfo(m);
    const cards = hand.filter(cid => CARDS[cid].tag === info.tag);
    return `<div class="panel" style="gap:6px"><h3 class="${TAGCLS[info.tag]}">${esc(info.name)}</h3><p class="muted" style="margin:0">${esc(info.text)}</p>
      <div class="row">${cards.length ? cards.map(cid => `<button type="button" data-m="${m}" data-cid="${cid}">${L("Discard", "棄掉")} ${esc(cardName(cid))}</button>`).join("")
        : `<span class="muted">${L(`Needs a ${tagName(info.tag)} card.`, `需要一張${tagName(info.tag)}牌。`)}</span>`}</div></div>`;
  }).join("");
  const old = E.heldMantle(S, p), left = S.cfg.maxSummons - S.stats.summons;
  const swap = old ? `<p class="pushwarn">${L(`You hold <b>${esc(mantleInfo(old).name)}</b>. Summoning a new Mantle lays it down for good: no one can summon it again. Summons left this game: <b>${left}</b>.`,
    `你持有<b>${esc(mantleInfo(old).name)}</b>。召喚新的稱號會將它永久放下，之後再也無法召喚。本局剩餘召喚次數：<b>${left}</b>。`)}</p>` : "";
  veil(`<div class="dialog wide"><h2>${old ? L("Summon a new Mantle", "召喚新的稱號") : L("Summon a Mantle", "召喚稱號")}</h2>
    <p>${L(`Pay <b>${S.cfg.mantleCost} Light</b> and discard a card of the Mantle's thread. ${S.cfg.resummon ? `Solo: you may later trade it for another, up to ${S.cfg.maxSummons} summons in a game.` : "You keep the Mantle for the rest of the game."}`,
      `支付<b>${S.cfg.mantleCost}點光</b>，並棄掉一張與該稱號同絲線的牌。${S.cfg.resummon ? `單人模式：之後可以換成另一個稱號，一局最多召喚${S.cfg.maxSummons}次。` : "你將持有這個稱號直到遊戲結束。"}`)}</p>${swap}
    ${rows}<div class="row"><button type="button" id="cancel">${L("Not now", "暫時不要")}</button></div></div>`, "summon");
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
        <div class="boardscroll"><svg id="board" viewBox="0 0 1120 400" role="img" aria-label="${L("The river", "河流")}"></svg></div>
        <div class="boardcap" id="boardcap" aria-live="polite"></div>
      </div>
      <div class="tabletop">
        <div class="piles" id="piles"></div>
        <section class="guide" id="guide" aria-live="polite"></section>
        <div class="tokstrip" id="tokstrip" aria-label="${L("Tokens in play", "場上的標記")}"></div>
        <div class="tray" id="tray" aria-label="${L("Actions this turn", "本回合的行動")}"></div>
      </div>
      <section class="panel"><h2>${L("Book of Remembrance", "憶念之書")} <button type="button" class="link openbook" id="openbook">${svgUse("nb-seal")}${L("Open the Book", "翻開書本")}</button></h2>
        <div class="bookstrip" id="book" title="${L("Open the Book of Remembrance", "翻開憶念之書")}"></div></section>
    </div>
    <aside class="side">
      <section class="panel"><h2>${L("Loom of the Fates", "命運織機")}</h2><div class="loom" id="loom"></div></section>
      <section class="panel"><h2>${L("The Soul", "亡魂")}</h2><div id="soulboard"></div></section>
      <section class="panel chron"><h2>${L("Chronicle", "紀事")}</h2><div class="log" id="log"></div></section>
    </aside>
  </div>
  <section class="dock ${dockOpen ? "open" : ""}" id="dock" aria-label="${L("Your hand", "你的手牌")}">
    <div class="dockbar">
      <button type="button" class="docktoggle" id="docktoggle" aria-expanded="${dockOpen}" aria-controls="hand"></button>
      <div class="prompt" id="prompt"></div>
    </div>
    <div class="fanwrap"><div class="dockinfo" id="dockinfo"></div><div class="fan" id="hand"></div></div>
  </section>
  <div class="zoom hidden" id="zoom" role="dialog" aria-modal="true"></div>`;
  // the close-up lives at the top of the page, so it can also rise above a dialog (the forgotten pile)
  document.querySelectorAll("body > .zoom").forEach(z => z.remove());
  document.body.appendChild($("zoom"));
  $("docktoggle").onclick = () => setDock(!dockOpen);
  $("zoom").addEventListener("click", e => { if (e.target.id === "zoom" || e.target.closest("[data-close]")) closeZoom(); });
  // the heights the layout needs: the whole hand panel, its bar alone, and the top bar
  const sizes = () => {
    const r = document.documentElement.style;
    r.setProperty("--dockh", `${$("dock")?.offsetHeight || 0}px`);
    r.setProperty("--barh", `${$("dock")?.querySelector(".dockbar")?.offsetHeight || 0}px`);
    r.setProperty("--toph", `${document.querySelector(".topbar")?.offsetHeight || 0}px`);
  };
  const ro = new ResizeObserver(sizes);
  ro.observe($("dock"));
  if (document.querySelector(".topbar")) ro.observe(document.querySelector(".topbar"));
  drawBoardStatic();
  $("board").addEventListener("click", e => {
    const g = e.target.closest(".slot.target");
    if (!g || !pending || !canAct()) return;
    const k = +g.dataset.k;
    if (pending.targets?.includes(k)) answer(k);
  });
  $("openbook").onclick = () => openBook(S);
  $("book").onclick = e => {
    const pg = e.target.closest("[data-page]");
    openBook(S, pg ? +pg.dataset.page + 1 : null);
  };
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
  const reachLbl = [[reachName(0), 1, 4], [reachName(1), 5, 8], [reachName(2), 9, 11]].map(([n, a, b], i) =>
    `<text x="${(X(a) + X(b)) / 2}" y="22" text-anchor="middle">${L(`REACH ${ROMAN[i]} · ${n.toUpperCase()}`, `第${ZHNUM[i]}河段 · ${n}`)}</text>`).join("");
  const nums = Array.from({ length: 13 }, (_, sp) => `<text x="${X(sp)}" y="392" text-anchor="middle">${sp === 0 ? L("near shore", "此岸") : sp === 12 ? "" : sp}</text>`).join("");
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
  <g font-family="IBM Plex Mono, monospace" font-size="10" fill="#9A948C" letter-spacing="1.2" text-anchor="middle" opacity=".8">
    <text x="${X(0)}" y="${Y(0) - 80}">${L("LEFT BANK", "左岸")}</text><text x="${X(0)}" y="${Y(0) + 88}">${L("RIGHT BANK", "右岸")}</text></g>
  <g transform="translate(${X(12)}, ${Y(12)})">
    <use href="#nb-light" x="-22" y="-26" width="44" height="48" style="color:#E6D3A3"/>
    <text y="-48" text-anchor="middle" font-family="IM Fell English SC, Noto Serif TC, serif" font-size="16" fill="#E6D3A3">${L("Far Shore", "彼岸")}</text>
  </g>
  <g id="dyn"></g>
  <g id="soulG"><g class="bob">
    <circle class="soulglow" r="34" fill="url(#soulGrad)"/>
    <g id="soulFig" data-soul="${S?.cfg.soul || ""}">${soulMiniature(S?.cfg.soul || "open")}</g>
  </g></g>
  <g id="fx"></g>`;
}

// The game as the table should show it right now: mid-playback, the snapshot of the step on screen.
function vs() {
  if (!view) return S;
  return { ...S, tok: view.tok, griev: view.griev, flooded: view.flooded, revealed: view.revealed, soul: view.soul, fract: view.fract,
    light: view.light, bw: view.bw, karma: view.karma, echo: view.echo, forgotten: { length: view.f },
    pile: { deck: view.deck ?? S.deck.length, disc: view.disc ?? S.discard.length, top: view.top ?? S.discard.at(-1) ?? -1, ft: view.ft ?? S.forgotten.at(-1) ?? -1 },
    hold: view.hold ?? S.hold, acts: view.acts ?? S.acts ?? [],
    shieldOn: view.shield ?? S.shieldUntil >= S.turn, resign: view.resign ?? S.resign, pushedBy: view.pushed ?? S.pushedBy ?? [] };
}
const asPrev = b => ({ tok: b.tok, griev: b.griev, revealed: b.revealed, flooded: b.flooded, soul: b.soul, karma: b.karma, forgotten: b.f,
  pile: b.deck !== undefined && b.disc !== undefined ? { deck: b.deck, disc: b.disc, top: b.top, ft: b.ft } : null, hold: b.hold, acts: b.acts,
  shield: b.shield, resign: b.resign, pushed: b.pushed });
const finalPrev = () => ({ tok: [...S.tok], griev: [...S.griev], revealed: [...S.revealed], flooded: [...S.flooded], soul: S.soul, karma: [...S.karma], forgotten: S.forgotten.length,
  pile: { deck: S.deck.length, disc: S.discard.length, top: S.discard.at(-1) ?? -1, ft: S.forgotten.at(-1) ?? -1 }, hold: S.hold, acts: [...(S.acts || [])],
  shield: S.shieldUntil >= S.turn, resign: !!S.resign, pushed: [...(S.pushedBy || [])] });
const playingBack = () => running || queue.length > 0;

function drawBoard() {
  const s = vs();
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
  const sp = Math.min(s.soul, 12);
  const fig = $("soulFig");
  if (fig && fig.dataset.soul !== s.cfg.soul) { fig.dataset.soul = s.cfg.soul; fig.innerHTML = soulMiniature(s.cfg.soul); }
  $("soulG").style.transform = `translate(${X(sp)}px, ${Y(sp)}px)`;
  if (s.hold && sp < 12) h += `<g class="holdtok" transform="translate(${X(sp) + 30},${Y(sp) - 34})"><title>${esc(L("Hold Fast: the soul waits this turn without forgetting", "堅守：亡魂本回合停留而不遺忘"))}</title><g class="${p.hold ? "" : "stampin"}">
    <circle r="15" fill="#17161B" stroke="#8FD6E1" stroke-width="1.6"/><use href="#nb-tok-hold" x="-10" y="-10" width="20" height="20" style="color:#8FD6E1"/></g></g>`;
  if (s.resign && sp < 12) h += `<g class="holdtok" transform="translate(${X(sp) - 30},${Y(sp) - 34})"><title>${esc(L("Resignation: at the next Soul Step the soul sits down and Lingers", "認命：下一次亡魂步驟時，亡魂坐下並徘徊"))}</title><g class="${p.resign ? "" : "stampin"}">
    <circle r="15" fill="#17161B" stroke="#E6D3A3" stroke-width="1.6"/><use href="#nb-tok-resign" x="-10" y="-10" width="20" height="20" style="color:#E6D3A3"/></g></g>`;
  $("dyn").innerHTML = h;
  if (p.soul > s.soul) $("boardwrap").classList.add("shake");
}

function slotTitle(k) {
  const s = S;
  const where = L(`Space ${k >> 1}, ${k % 2 ? "right" : "left"} bank`, `第${k >> 1}格${k % 2 ? "右岸" : "左岸"}`);
  const sep = L(": ", "：");
  if (s.griev[k]) return where + sep + L("Grievance", "怨念");
  if (s.tok[k] === E.BLOOM) return where + sep + L("Bloom", "花");
  if (s.tok[k] === E.ROOT) return where + sep + L("Root", "根");
  return where + sep + (s.revealed[k] ? tileName(s.tile[k]) : L("fog", "霧"));
}

// ---------------------------------------------------------------- side panels
function drawLoom() {
  const S = vs();
  const cap = S.cfg.karmaCap;
  $("loom").innerHTML = [0, 1, 2].map(t => {
    let knots = "";
    for (let k = 0; k < cap; k++) {
      const on = k < S.karma[t];
      const isNew = on && prev && k >= (prev.karma?.[t] ?? 0);
      knots += `<span class="kn ${on ? "on" : ""} ${on && S.karma[t] >= cap - 1 ? "hot" : ""} ${isNew ? "new" : ""}">${on ? svgUse("nb-knot") : ""}</span>`;
    }
    return `<div class="thread ${TAGCLS[t]} ${S.echo === t ? "echo" : ""}">${svgUse(TAG_ICONS[t])}
      <span>${tagName(t)}${S.echo === t ? ` <span class="echotag">${L("ECHO", "迴響")}</span>` : ""}</span><span class="knots">${knots}</span></div>`;
  }).join("") + (S.echo < 0 ? `<small class="muted">${L("No Echo on the Loom.", "織機上沒有迴響。")}</small>` : "");
  drawDockInfo();
}

function drawSoulboard() {
  const S = vs();
  const c = S.cfg, f = S.forgotten.length;
  let cells = "";
  for (let n = 1; n <= c.forgottenLimit; n++) {
    const cls = [n <= f ? "fill" : "", n === c.ashAt || n === c.adriftAt ? "mark" : "", n === c.forgottenLimit ? "end" : "", prev && n <= f && n > prev.forgotten ? "new" : ""].join(" ");
    cells += `<span class="cell ${cls}" title="${n === c.ashAt ? L("Light as Ash", "輕如灰燼") : n === c.adriftAt ? L("Adrift", "漂離") : n === c.forgottenLimit ? L("Faded", "消散") : ""}">${n}</span>`;
  }
  let bw = "";
  for (let n = 0; n < c.bwSupply; n++) bw += svgUse("nb-blackwater", n < S.bw ? "" : "dim", "color:#9A948C");
  const fr = [0, 1, 2].map(n => svgUse("nb-fracture", n < S.fract ? "" : "dim", "color:#D7263D")).join("");
  const mantles = Object.keys(MANTLES).map(m => [m, mantleInfo(m)]).map(([m, info]) =>
    `<div title="${esc(info.text)}"><span class="${TAGCLS[info.tag]}">${esc(info.name.replace("The ", ""))}</span><b>${S.mantles[m] >= 0 ? esc(pname(S.names[S.mantles[m]])) : S.mantles[m] === -2 ? `<span class="muted">${L("laid down", "已放下")}</span>` : `<span class="muted">${L("free", "未取得")}</span>`}</b></div>`).join("");
  $("soulboard").innerHTML = `<div class="soulgrid">
    <div class="lbl wide">${L(`Forgotten ${f} of ${c.forgottenLimit}`, `遺忘 ${f}／${c.forgottenLimit}`)} <span class="muted" style="text-transform:none;letter-spacing:0">· ${L("Ash", "灰燼")} ${c.ashAt}${c.adriftAt < 99 ? ` · ${L("Adrift", "漂離")} ${c.adriftAt}` : ""}</span></div>
    <div class="track wide" style="grid-template-columns:repeat(${c.forgottenLimit},minmax(0,1fr))">${cells}</div>
    <div><div class="lbl">${L("Fractures", "裂痕")}</div><div class="icons">${fr}</div></div>
    <div><div class="lbl">${L("Light", "光")}</div><div class="icons" id="sb-light">${svgUse("nb-light", "", "color:#E6D3A3")}<span style="font-family:var(--display);font-size:1.25rem;color:var(--bone)">${S.light}</span></div></div>
    <div class="wide"><div class="lbl">${L("Black Water supply", "黑水供應")}</div><div class="icons">${bw}</div></div>
    <div class="wide"><div class="lbl">${L(`Mantles · cost ${c.mantleCost} Light`, `稱號 · 花費${c.mantleCost}點光`)}</div><div class="mantles" id="sb-mantles">${mantles}</div></div>
  </div>`;
  drawTokStrip();
}

// The tabletop tokens and turned cards that keep track of a rule over time, as they lie on a real table:
// each one lights up while it is in force (or still to be used) and goes dark once it is spent.
function drawTokStrip() {
  const el = $("tokstrip");
  if (!el || !S) return;
  const s = vs();
  const chip = (a, label, on, title) => `<span class="ttok ${on ? "on" : "off"}" title="${esc(title)}">${tokIcon(a)}<small>${esc(label)}</small></span>`;
  const out = [
    chip("shield", L("Shield", "護盾"), !!s.shieldOn, s.shieldOn ? L("Shield up: the next Fracture before the raiser's next turn is stopped", "護盾升起：在升起者的下個回合前，擋下下一道裂痕") : L("Shield: not raised", "護盾：未升起")),
    chip("hold", L("Hold Fast", "堅守"), !!s.hold, s.hold ? L("Hold Fast: if the soul cannot step this turn, it waits without forgetting", "堅守：若亡魂本回合無法前進，它會停留而不遺忘") : L("Hold Fast: not in play", "堅守：未使用")),
    chip("resign", L("Resignation", "認命"), !!s.resign, s.resign ? L("Resignation: the soul will sit down and Linger at its next step", "認命：亡魂下一步會坐下徘徊") : L("Resignation: not in play", "認命：未出現")),
  ];
  for (let p = 0; p < S.n; p++) {
    const spent = !!s.pushedBy?.[p];
    out.push(chip("push", S.n > 1 ? pname(S.names[p]) : L("Push Through", "破浪"), !spent,
      spent ? L(`${pname(S.names[p])} has used their Push Through`, `${pname(S.names[p])}的破浪標記已翻面：奮力駛過已用掉`) : L(`${pname(S.names[p])} can still Push Through once`, `${pname(S.names[p])}的破浪標記：還能奮力駛過一次`)));
  }
  const turned = (label, on, title) => `<span class="ttok turn ${on ? "on" : "off"}" title="${esc(title)}"><i class="tcard"></i><small>${esc(label)}</small></span>`;
  if (S.mantles.warden >= 0) out.push(turned(L("Warden", "守魂者"), S.wardenReady, S.wardenReady ? L("Spirit Warden upright: ready this round", "守魂者直放：本輪可用") : L("Spirit Warden turned sideways: used this round", "守魂者橫放：本輪已使用")));
  if (S.cfg.soul === "child" && S.reach < 3) out.push(turned(L("Little flame", "小小火光"), !!S.childShield[S.reach], S.childShield[S.reach] ? L("Soul card upright: the little flame still burns this Reach", "亡魂牌直放：本河段的小小火光仍在") : L("Soul card turned sideways: the little flame is spent this Reach", "亡魂牌橫放：本河段的小小火光已用掉")));
  if (S.cfg.soul === "bride") out.push(turned(L("Pull back", "拉回"), !S.bridePulled, S.bridePulled ? L("Soul card turned sideways: she has been pulled back once", "亡魂牌橫放：她已被拉回過一次") : L("Soul card upright: she can still be pulled back once", "亡魂牌直放：她還能被拉回一次")));
  el.innerHTML = `<div class="stripk">${L("Tokens", "標記")}</div><div class="tabletoks">${out.join("")}</div>`;
}

function drawBook() {
  const ids = new Set();
  $("book").innerHTML = bookFrames().map(([title, frame], r) => {
    const page = S.book[r];
    const text = frame.replace(/\{(\w+)\}/g, (_, slot) => {
      const cid = page[slot];
      if (cid === undefined) return `<span class="gone">[${zh() ? slotLabel(slot) : slot.toLowerCase()}]</span>`;
      ids.add(`${r}-${slot}`);
      return `<b class="${prevBookIds.has(`${r}-${slot}`) ? "" : "new"}">${esc(cardBand(cid))}</b>`;
    });
    const n = Object.keys(page).length;
    return `<div class="page ${S.blessed[r] ? "blessed" : ""}" data-page="${r}"><h3><span>${title}</span><span>${S.blessed[r] ? svgUse("nb-seal", "", "width:16px;height:16px;color:#E6D3A3") : ""}</span></h3>${text}
      <div class="meter">${[0, 1, 2, 3].map(i => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div></div>`;
  }).join("");
  prevBookIds = ids;
}

function drawLog() {
  const el = $("log");
  el.innerHTML = S.log.map(l => `<div class="k-${l.kind}">${esc(say(l))}</div>`).join("");
  el.scrollTop = el.scrollHeight;
}

function drawStatus() {
  const soul = soulInfo(S.cfg.soul);
  $("status").innerHTML = `
    <span><b>${esc(soul.name)}</b></span>
    <span>${L("Lantern", "燈籠")} <b>${esc(lanternName(S.cfg.lantern))}</b></span>
    <span>${L(`Turn <b>${S.turn}</b>`, `第<b>${S.turn}</b>回合`)}</span>
    <span>${L(`Reach <b>${ROMAN[S.reach]}</b>`, `第<b>${ZHNUM[S.reach]}</b>河段`)} · ${reachName(S.reach)}</span>
    <span>${L("Soul at", "亡魂位置")} <b>${Math.min(S.soul, 12)}</b> / 12</span>
    ${mode === "online" ? `<span class="net"><span class="dot"></span>${esc(net?.code || "")} · ${L("you are", "你是")} ${esc(pname(S.names[mySeat]))}</span>` : ""}`;
}

// ---------------------------------------------------------------- prompt and hand
function setPrompt(html, mine = false) {
  const el = $("prompt");
  el.innerHTML = html;
  el.classList.toggle("mine", mine);
}

function drawPrompt() {
  if (S.result) { setPrompt(`<span class="msg">${S.result === "win" ? L("<b>The soul has crossed.</b>", "<b>亡魂已經渡河。</b>") : L(`<b>Lost: ${esc(S.cause)}.</b>`, `<b>失敗：${esc(causeName(S.cause))}。</b>`)}</span><button type="button" id="seeend">${L("See the ending", "查看結局")}</button>`); $("seeend").onclick = () => { endShown = false; showEnd(); }; return; }
  const who = esc(pname(S.names[S.cur]));
  if (!canAct()) {
    const why = mode === "local" ? L(`Waiting for <b>${who}</b> to take the lantern.`, `等待<b>${who}</b>接過燈籠。`)
      : L(`<b>${who}</b> is playing. ${mode === "online" ? "Study your hand while you wait." : ""}`, `<b>${who}</b>正在行動。${mode === "online" ? "等待時可以先研究你的手牌。" : ""}`);
    setPrompt(`<span class="msg">${why}</span>`);
    return;
  }
  if (pending) {
    const skip = `<button type="button" id="skip">${L("Skip", "跳過")}</button>`;
    if (pending.type === "root") setPrompt(`<span class="msg">${L(`Choose where <b>Root ${pending.i} of ${pending.n}</b> grows. Glowing slots touch the network${pending.stony ? " (Stony ground allowed)" : ""}.`,
      `選擇<b>第${pending.i}個根（共${pending.n}個）</b>的位置。發光的河岸與根網相連${pending.stony ? "（可放在石地上）" : ""}。`)}</span>${skip}`, true);
    else if (pending.type === "bloom") setPrompt(`<span class="msg">${L(`Choose a Root to <b>Bloom</b> (${pending.i} of ${pending.n}).`, `選擇一個根使其<b>綻放</b>（第${pending.i}個，共${pending.n}個）。`)}</span>${skip}`, true);
    else if (pending.type === "bringer") setPrompt(`<span class="msg">${L("<b>The Bloom-Bringer</b>: bloom one Root for free.", "<b>引花人</b>：免費使一個根綻放。")}</span>${skip}`, true);
    else if (pending.type === "inscribe") {
      const c = CARDS[pending.cid];
      setPrompt(`<span class="msg">${L(`Inscribe <b>“${esc(c.band)}”</b> as the ${c.slot} on page ${ROMAN[S.reach]}? The card leaves the deck for good.`,
        `要將<b>「${esc(cardBand(pending.cid))}」</b>銘刻為第${ZHNUM[S.reach]}頁的${slotLabel(c.slot)}嗎？這張牌將永久離開牌庫。`)}</span>
        <button type="button" class="primary" id="yes">${L("Inscribe", "銘刻")}</button><button type="button" id="no">${L("Keep it in the deck", "留在牌庫中")}</button>`, true);
      $("yes").onclick = () => { A.sfx("inscribe"); answer(true); };
      $("no").onclick = () => answer(false);
      return;
    }
    $("skip").onclick = () => answer(null);
    return;
  }
  if (busy || playingBack()) { setPrompt(`<span class="msg">${L("Carrying out each effect on the table…", "正在桌面上逐一執行效果……")}</span>`, true); return; }
  const n = S.played + 1;
  const echo = S.echo >= 0 && S.played === 0 ? L(` The Echo is <b class="${TAGCLS[S.echo]}">${tagName(S.echo)}</b>: an Answer of that thread Resonates.`,
    `迴響是<b class="${TAGCLS[S.echo]}">${tagName(S.echo)}</b>：以同絲線的牌回應便會產生共鳴。`) : "";
  const sum = E.canSummon(S) ? `<button type="button" id="summon" class="tokbtn">${tokIcon("summon")}${E.heldMantle(S) ? L(`Summon a new Mantle (${S.cfg.mantleCost} Light)`, `召喚新的稱號（${S.cfg.mantleCost}點光）`) : L(`Summon a Mantle (${S.cfg.mantleCost} Light)`, `召喚稱號（${S.cfg.mantleCost}點光）`)}</button>` : "";
  const rec = E.canRecall(S) ? `<button type="button" id="recall" class="recallbtn tokbtn">${tokIcon("recall")}${L(`Recall a memory · ${S.cfg.recallCost} Light`, `喚回記憶 · ${S.cfg.recallCost}點光`)}</button>` : "";
  const cost = E.pushCost(S);
  const push = E.canPush(S) ? `<button type="button" id="push" class="pushbtn tokbtn">${tokIcon("push")}${L(`Push Through · ${cost} Fracture${cost > 1 ? "s" : ""}, forget 1 · once a game`, `奮力駛過 · ${cost}道裂痕，遺忘1張 · 整局一次`)}</button>` : "";
  setPrompt(`<span class="msg">${L(`${S.n > 1 ? `<b>${who}</b>, ` : ""}${n === 1 ? (S.n > 1 ? "your <b>Answer</b>" : "Your <b>Answer</b>") : (S.n > 1 ? "now <b>Steer</b>" : "Now <b>Steer</b>")}: play a card${E.canSeek(S) ? ", Seek" : ""}${rec ? ", Recall" : ""}${push ? " or Push Through" : ""}.`, `${S.n > 1 ? `<b>${who}</b>，` : ""}${n === 1 ? "你的<b>回應</b>" : "接著<b>掌舵</b>"}：打出一張牌${E.canSeek(S) ? "、尋覓" : ""}${rec ? "、喚回記憶" : ""}${push ? "或奮力駛過" : ""}。`)}${echo}</span>${push}${rec}${sum}`, true);
  if (sum) $("summon").onclick = summonDialog;
  if (rec) $("recall").onclick = recallDialog;
  if (push) $("push").onclick = pushNow;
}

function viewSeat() {
  if (mode === "local") return S.n === 1 || uncovered === S.cur ? S.cur : -1;
  if (controls(S.cur)) return S.cur;
  return mySeat;
}

// What each effect means at the table: shown on a card held up close.
const GLOSS = {
  root: ["<b>Root</b>: a seed on an empty bank at or ahead of the soul. It must touch the network: the soul's own space or the next, the opposite bank, or the same bank one space before or after a token. Placing it on fog reveals the tile.",
    "<b>根</b>：放在亡魂所在格或前方的空河岸上，必須與根網相連：亡魂所在格或下一格、同格對岸，或同側前後一格有標記。放在霧上會翻開地塊。"],
  bloom: ["<b>Bloom</b>: one of your Roots, at or ahead of the soul, opens into a Netherbloom. A space with a Bloom is Lit, and the soul only steps onto Lit spaces.",
    "<b>綻放</b>：亡魂所在格或前方的一個根開成彼岸花。有花的格子即被照亮，亡魂只會踏上被照亮的格子。"],
  hold: ["<b>Hold Fast</b>: if the soul cannot step this turn, it waits without forgetting a card. The token stays beside the soul until the turn ends.",
    "<b>堅守</b>：若亡魂本回合無法前進，它會停留而不遺忘任何牌。標記放在亡魂旁，直到回合結束。"],
  shield: ["<b>Shield</b>: the next Fracture before your next turn is stopped.", "<b>護盾</b>：在你的下個回合之前，擋下下一道裂痕。"],
  mend: ["<b>Mend</b>: remove a Fracture from the Soul board. At 3 Fractures the soul Shatters.", "<b>修補</b>：從亡魂板上移除一道裂痕。裂痕達到3道，亡魂便會破碎。"],
  release: ["<b>Release</b>: untie knots on the Loom's fullest thread, further from a Backlash.", "<b>解結</b>：解開命運織機上最滿那條絲線的結，遠離反噬。"],
  unmake: ["<b>Unmake</b>: the fullest thread is emptied at once, with no Backlash.", "<b>消解</b>：最滿的絲線立即清空，不會反噬。"],
  guide: ["<b>Guide</b>: the soul steps forward now, but only if the next space is Lit.", "<b>引導</b>：若下一格被照亮，亡魂立刻前進一格。"],
  vigil: ["<b>Vigil</b>: look at the top 3 cards of this Reach's Mist deck and put the worst of them at the bottom of the three.", "<b>守夜</b>：查看本河段迷霧牌堆頂的3張，把最糟的一張放在這三張的最下面。"],
  banish: ["<b>Banish</b>: remove the Grievance that threatens the soul most.", "<b>驅散</b>：移除對亡魂威脅最大的怨念。"],
  drain: ["<b>Drain</b>: remove the Black Water nearest the soul and return it to the supply.", "<b>排水</b>：移除離亡魂最近的黑水，放回供應區。"],
  banish_or_drain: ["<b>Banish or Drain</b>: clear whichever is more urgent, a Grievance or Black Water.", "<b>驅散或排水</b>：清除較緊迫的一個，怨念或黑水。"],
  wash: ["<b>Wash</b>: the Grievances on the soul's own space are washed away.", "<b>洗淨</b>：洗去亡魂所在格上的怨念。"],
  lowtide: ["<b>Low Tide</b>: all Black Water in this Reach drains away.", "<b>退潮</b>：本河段所有黑水退去。"],
  light: ["<b>Light</b>: spend 3 to Recall a forgotten card as your Answer, or (with a card of its thread) to summon a Mantle.", "<b>光</b>：以回應花3點光喚回一張被遺忘的牌，或搭配同絲線的牌召喚稱號。"],
  reveal_reach: ["<b>Reveal</b>: every fogged bank in this Reach is turned up. Graves found this way turn Fertile.", "<b>揭示</b>：翻開本河段所有被霧覆蓋的河岸。以此翻出的墳墓會變成沃土。"],
  extra_karma: ["<b>Extra knot</b>: one more knot is tied on the Obsession thread.", "<b>額外的結</b>：執念絲線再打上一個結。"],
};
const THREAD_NOTE = [
  ["Played face up, it ties a knot on the <b>Obsession</b> thread. When the thread fills: <i>Grasping</i>, a Grievance claws at the soul.", "正面打出時在<b>執念</b>絲線上打結。絲線滿時：<i>攫取</i>，一個怨念撲向亡魂。"],
  ["Played face up, it ties a knot on the <b>Acceptance</b> thread. When the thread fills: <i>Resignation</i>, the soul sits down and Lingers.", "正面打出時在<b>釋懷</b>絲線上打結。絲線滿時：<i>認命</i>，亡魂坐下並徘徊。"],
  ["Played face up, it ties a knot on the <b>Oblivion</b> thread. When the thread fills: <i>The Tide Rises</i>, Black Water floods ahead.", "正面打出時在<b>忘卻</b>絲線上打結。絲線滿時：<i>漲潮</i>，黑水淹沒前方。"],
];
function cardGloss(cid) {
  const c = CARDS[cid];
  const kinds = [...new Set([...c.eff, ...c.res].map(o => o[0]))].filter(k => GLOSS[k]);
  const items = kinds.map(k => `<li>${L(...GLOSS[k])}</li>`);
  items.push(`<li>${L(...THREAD_NOTE[c.tag])}</li>`);
  items.push(`<li>${L("<b>Resonance</b>: played as your Answer while the Echo sits on this card's thread.", "<b>共鳴</b>：迴響停在這張牌的絲線上時，以它作為回應打出。")}</li>`);
  if (c.key) items.push(`<li>${L("<b>Key Memory</b>: it may be inscribed in the Book even without Resonating.", "<b>關鍵記憶</b>：即使沒有共鳴，也可以銘刻進憶念之書。")}</li>`);
  else if (c.slot) items.push(`<li>${L("<b>Memory</b>: when it Resonates, its line may be inscribed in the Book as this Reach's " + c.slot + ".", `<b>記憶</b>：產生共鳴時，可以把這句話銘刻進憶念之書，作為本河段的${slotLabel(c.slot)}。`)}</li>`);
  return `<ul class="gloss">${items.join("")}</ul>`;
}

function cardHTML(cid, opts = {}) {
  const c = CARDS[cid];
  const res = opts.resonant;
  return `<div class="card t${c.tag} ${opts.playable ? "playable" : ""} ${opts.sel ? "sel" : ""} ${res ? "resonant" : ""} ${opts.dealt ? "dealt" : ""} ${opts.cls || ""}" data-cid="${cid}" ${opts.style ? `style="${opts.style}"` : ""} ${opts.focus ? 'role="button" tabindex="0"' : ""}>
    <div class="top">${svgUse(TAG_ICONS[c.tag], TAGCLS[c.tag])}<div><div class="nm">${esc(cardName(cid))}</div><div class="tag">${tagName(c.tag)}${c.key ? ` · <span class="key">${L("Key Memory", "關鍵記憶")}</span>` : ""}</div></div></div>
    <div class="eff">${esc(ops(c.eff))}</div>
    <div class="res"><b>${L("Resonance:", "共鳴：")}</b> ${c.rr ? L("instead, ", "改為") : ""}${esc(ops(c.res))}</div>
    ${opts.gloss ? cardGloss(cid) : ""}
    ${c.slot ? `<div class="band">${svgUse(SLOT_ICON[c.slot], "", "color:#E6D3A3")}<span>${esc(cardBand(cid))}</span></div>` : `<div class="band"><span class="muted">${L("An Oblivion card is forgotten after use.", "忘卻牌使用後會被遺忘。")}</span></div>`}
  </div>`;
}

// ---------------------------------------------------------------- the hand: a fan of cards in a panel along the foot of the window
function setDock(open) {
  dockOpen = open;
  try { localStorage.setItem("nb-dock", open ? "1" : "0"); } catch { /* storage blocked */ }
  $("dock")?.classList.toggle("open", open);
  $("docktoggle")?.setAttribute("aria-expanded", String(open));
  if (S) drawHand();
}

// Whether this screen may see the faces of a player's cards.
function seesHand(p) {
  if (S.n === 1) return true;
  if (mode === "online") return p === mySeat;
  return uncovered === p;
}

// Fan angles: the cards splay from a point below the hand, the way they are held.
function fanPose(i, n) {
  const spread = Math.min(4.5, 18 / Math.max(1, n - 1));
  const off = i - (n - 1) / 2;
  return `--r:${(off * spread).toFixed(2)}deg;--y:${(off * off * 2).toFixed(1)}px;--z:${i + 1}`;
}

function drawHand() {
  const el = $("hand");
  if (!el) return;
  const seat = viewSeat();
  const tog = $("docktoggle");
  if (S.result) { el.innerHTML = ""; prevHand = []; if (tog) tog.innerHTML = dockLabel(L("Hand", "手牌"), 0); return; }
  if (seat < 0) {
    const n = S.hands[S.cur].length;
    el.innerHTML = Array.from({ length: n }, (_, i) => `<div class="card back" style="${fanPose(i, n)}">${cardBack()}</div>`).join("");
    if (tog) tog.innerHTML = dockLabel(L(`${pname(S.names[S.cur])}'s hand · hidden`, `${pname(S.names[S.cur])}的手牌 · 蓋著`), n);
    prevHand = [];
    return;
  }
  const hand = S.hands[seat];
  const playable = seat === S.cur && canPlayCards();
  const n = hand.length;
  el.innerHTML = hand.map((cid, i) => cardHTML(cid, {
    playable, focus: true, sel: selected === cid, dealt: !prevHand.includes(cid) && !arriving.has(cid),
    resonant: playable && S.played === 0 && S.echo === CARDS[cid].tag,
    cls: arriving.has(cid) ? "await" : "", style: fanPose(i, n),
  })).join("");
  prevHand = hand.filter(cid => !arriving.has(cid));
  if (tog) tog.innerHTML = dockLabel(seat !== S.cur || S.n > 1 ? L(`${pname(S.names[seat])}'s hand`, `${pname(S.names[seat])}的手牌`) : L("Your hand", "你的手牌"), n);
  $("dock")?.classList.toggle("yourturn", playable);
  el.querySelectorAll(".card[data-cid]").forEach(card => {
    const cid = +card.dataset.cid;
    const open = () => openZoom(cid);
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
  if (selected !== null && !$("zoom").classList.contains("hidden")) {
    if (hand.includes(selected)) openZoom(selected); else closeZoom();
  }
}
const dockLabel = (who, n) => `<span class="chev">${dockOpen ? "▾" : "▴"}</span><span>${esc(who)}</span><b>${n}</b>`;

// A card held up close: its full text, and (on your turn) the ways to play it.
// With look set, the card is only looked at (a forgotten memory): no ways to play it.
function openZoom(cid, look = false) {
  const z = $("zoom");
  if (!z || !S) return;
  const seat = viewSeat();
  if (look) {
    z.innerHTML = `<div class="zoombox">${cardHTML(cid, { cls: "big", gloss: true })}
      <div class="zside"><p class="muted zwait">${L("A forgotten memory. Spend Light as your Answer to Recall it.", "一段被遺忘的記憶。以回應花費光可以喚回它。")}</p><button type="button" class="ghost" data-close>${L("Close", "關閉")}</button></div></div>`;
    z.classList.remove("hidden");
    z.querySelector("[data-close]")?.focus();
    return;
  }
  if (seat < 0 || !S.hands[seat].includes(cid)) return;
  selected = cid;
  const playable = seat === S.cur && canPlayCards();
  const res = playable && S.played === 0 && S.echo === CARDS[cid].tag;
  const tag = CARDS[cid].tag;
  const modes = playable ? `<div class="zmodes">
      <button type="button" class="tokbtn primary" data-play="up">${tokIcon("card", tag)}<span><b>${L("Play face up", "正面打出")}</b>${res ? `<small>${L("Resonates with the Echo", "與迴響產生共鳴")}</small>` : `<small>${L("its effect, and a knot on its thread", "執行效果，並在其絲線上打結")}</small>`}</span></button>
      <button type="button" class="tokbtn" data-play="down">${tokIcon("down")}<span><b>${L("Face down", "背面打出")}</b><small>${L("1 Root, no knot", "放1個根，不打結")}</small></span></button>
      <button type="button" class="tokbtn" data-play="burn">${tokIcon("burn", tag)}<span><b>${L("Burn", "焚燒")}</b><small>${L("its effect twice, then forget it and 1 more", "效果兩次，再遺忘此牌與另1張")}</small></span></button>
      ${E.canSeek(S) ? `<button type="button" class="tokbtn" data-play="seek">${tokIcon("seek")}<span><b>${L("Seek", "尋覓")}</b><small>${L(`discard this, draw 1${S.played === 0 ? " (the Echo passes)" : ""}`, `棄掉此牌，抽1張${S.played === 0 ? "（放過迴響）" : ""}`)}</small></span></button>` : ""}
    </div>` : `<p class="muted zwait">${seat === S.cur ? L("You can play it once the table is ready.", "桌面準備好後就能打出。") : L("Not your turn: study it while you wait.", "還沒輪到你：等待時可以先研究。")}</p>`;
  z.innerHTML = `<div class="zoombox">
    ${cardHTML(cid, { cls: "big", resonant: res, gloss: true })}
    <div class="zside">${modes}<button type="button" class="ghost" data-close>${L("Back to the hand", "放回手牌")}</button></div></div>`;
  z.classList.remove("hidden");
  z.querySelectorAll("[data-play]").forEach(b => b.onclick = () => playSelected(cid, b.dataset.play));
  (z.querySelector("[data-play]") || z.querySelector("[data-close]"))?.focus();
  $("hand")?.querySelectorAll(".card").forEach(c => c.classList.toggle("sel", +c.dataset.cid === cid));
}
function closeZoom() {
  const z = $("zoom");
  if (!z || z.classList.contains("hidden")) return;
  z.classList.add("hidden");
  z.innerHTML = "";
  selected = null;
  $("hand")?.querySelectorAll(".card.sel").forEach(c => c.classList.remove("sel"));
}
document.addEventListener("keydown", e => { if (e.key === "Escape") closeZoom(); });

// ---------------------------------------------------------------- action tokens
// Each action a player takes is marked with a token on the turn tray, as it would be at a real table.
const TOKS = {
  card: { icon: t => TAG_ICONS[t], col: t => TAGCOL[t], en: "Card played face up", zh: "正面打出一張牌" },
  burn: { icon: () => "nb-tok-burn", col: t => TAGCOL[t], en: "Card Burned", zh: "焚燒一張牌" },
  down: { icon: () => "nb-tok-down", col: () => "#E6D3A3", en: "Card played face down: 1 Root", zh: "背面打出：放1個根" },
  seek: { icon: () => "nb-tok-seek", col: () => "#8FD6E1", en: "Seek: discard 1, draw 1", zh: "尋覓：棄1張，抽1張" },
  recall: { icon: () => "nb-tok-recall", col: () => "#E6D3A3", en: "Recall: Light spent to bring a memory back", zh: "喚回：花光把一段記憶帶回" },
  push: { icon: () => "nb-tok-push", col: () => "#D7263D", en: "Push Through the Grievances", zh: "奮力駛過怨念" },
  summon: { icon: () => "nb-tok-summon", col: m => TAGCOL[MANTLES[m]?.tag ?? 1], en: "Mantle summoned with Light", zh: "以光召喚稱號" },
  hold: { icon: () => "nb-tok-hold", col: () => "#8FD6E1", en: "Hold Fast", zh: "堅守" },
  shield: { icon: () => "nb-tok-shield", col: () => "#E6D3A3", en: "Shield", zh: "護盾" },
  resign: { icon: () => "nb-tok-resign", col: () => "#E6D3A3", en: "Resignation", zh: "認命" },
  oar: { icon: () => "nb-tok-oar", col: () => "#E6D3A3", en: "The Oar", zh: "船槳" },
};
// The web table's own pieces: the action tokens on the turn tray, explained in the Player Aid.
function tokenLegend() {
  const row = (a, arg, en, zhT) => `<span>${tokIcon(a, arg)}${L(en, zhT)}</span>`;
  return `<h3>${L("Turn tray (web table)", "回合托盤（網頁版）")}</h3><p>${L("On this screen, each action this turn is also marked on the tray under the river. These marks are only a record: at a real table the played cards show it.", "在這個畫面上，本回合的每個行動也會標在河流下方的托盤上。這些只是紀錄：在真實的桌面上，打出的牌就說明了一切。")}</p>
    <div class="aidicons tokenlegend">${row("card", 0, "Card face up (its thread)", "正面打出（其絲線）")}${row("down", 0, "Face down", "背面打出")}${row("burn", 0, "Burn", "焚燒")}${row("seek", 0, "Seek", "尋覓")}
    ${row("recall", 0, "Recall · 3 Light", "喚回 · 3點光")}${row("summon", "bringer", "Summon · Light", "召喚 · 光")}${row("push", 0, "Push Through", "奮力駛過")}</div>`;
}
function tokIcon(a, arg) {
  const k = TOKS[a];
  return `<span class="tokico" style="--tc:${k.col(arg)}">${svgUse(k.icon(arg))}</span>`;
}
function tokHTML(act, cls = "") {
  const k = TOKS[act.a];
  const arg = act.a === "summon" ? act.m : act.tag;
  const light = act.a === "recall" ? S.cfg.recallCost : act.a === "summon" ? S.cfg.mantleCost : 0;
  const title = L(k.en, k.zh) + (act.a === "card" || act.a === "burn" ? ` · ${tagName(act.tag)}` : "") + (act.res ? L(" · Resonated", " · 共鳴") : "")
    + (act.a === "summon" ? ` · ${mantleInfo(act.m).name}` : "");
  return `<span class="tok tok-${act.a} ${act.res ? "res" : ""} ${cls}" style="--tc:${k.col(arg)}" title="${esc(title)}">${svgUse(k.icon(arg))}${light ? `<i class="lightcost">${svgUse("nb-light")}${light}</i>` : ""}</span>`;
}
let trayShown = 0;
function drawTray() {
  const el = $("tray");
  if (!el || !S) return;
  const acts = vs().acts || [];
  const turn = view?.turn ?? S.turn, who = view?.cur ?? S.cur;
  if (acts.length < trayShown) trayShown = 0;     // a new turn cleared the tray
  const sum = acts.filter(x => x.a === "summon");
  const main = acts.filter(x => x.a !== "summon");
  const fresh = i => (i >= trayShown ? "stampin" : "");
  const idx = x => acts.indexOf(x);
  const slots = [L("Answer", "回應"), L("Steer", "掌舵")].slice(0, S.cfg.cardsPerTurn).map((name, i) =>
    `<div class="tslot">${main[i] ? tokHTML(main[i], fresh(idx(main[i]))) : `<span class="tok empty"></span>`}<small>${name}</small></div>`).join("");
  el.innerHTML = `<div class="trayh"><span class="oar" title="${esc(L("The Oar: the Ferryman whose turn it is holds it", "船槳：輪到的擺渡人握著它"))}">${tokIcon("oar")}</span>${L(`Turn ${turn || 1}`, `第${turn || 1}回合`)}<small>${esc(pname(S.names[who]))}</small></div>
    ${sum.length ? `<div class="tslot">${sum.map(x => tokHTML(x, fresh(idx(x)))).join("")}<small>${L("Summon", "召喚")}</small></div>` : ""}${slots}`;
  trayShown = acts.length;
}
// A token stamped onto the river, where an action struck it.
function boardToken(a, at) {
  const fx = $("fx");
  if (!fx || !at) return;
  const k = TOKS[a];
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", "boardtok");
  g.setAttribute("transform", `translate(${at[0]},${at[1]})`);
  g.innerHTML = `<g class="stampin"><circle r="20" fill="#17161B" stroke="${k.col()}" stroke-width="2"/><use href="#${k.icon()}" x="-13" y="-13" width="26" height="26" style="color:${k.col()}"/></g>`;
  fx.appendChild(g);
  setTimeout(() => g.remove(), 2200);
}

// ---------------------------------------------------------------- the piles: deck, discard and forgotten
const miniFace = cid => (cid < 0 ? miniBack() : `<div class="mc t${CARDS[cid].tag}">${svgUse(TAG_ICONS[CARDS[cid].tag], TAGCLS[CARDS[cid].tag])}<span class="mcn">${esc(cardName(cid))}</span><span class="mct">${tagName(CARDS[cid].tag)}</span></div>`);
// The memory card back, the same art as the printed cards.
const cardBack = () => `<svg class="cb" viewBox="0 0 630 880" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><use href="#nb-cardback"/></svg>`;
const miniBack = () => `<div class="mc back">${cardBack()}</div>`;
let pilesHeld = {};   // a pile a card is flying towards keeps its old look until the card lands
function drawPiles() {
  const el = $("piles");
  if (!el || !S) return;
  const s = vs();
  const now = s.pile || { deck: S.deck.length, disc: S.discard.length, top: S.discard.at(-1) ?? -1, ft: S.forgotten.at(-1) ?? -1 };
  const f = s.forgotten.length;
  const pv = { ...now, f, ...pilesHeld };
  const stack = n => `--layers:${Math.min(6, Math.ceil(n / 4))}`;
  el.innerHTML = `
    <div class="pile deck" id="pile-deck" title="${L("The deck, face down", "牌庫（背面朝上）")}">
      <span class="pst ${pv.deck ? "" : "none"}" style="${stack(pv.deck)}">${pv.deck ? miniBack() : ""}</span><span class="plbl">${L("Deck", "牌庫")} <b>${pv.deck}</b></span></div>
    <div class="pile disc" id="pile-disc" title="${L("The discard pile, face down: nobody looks through it", "棄牌堆（背面朝上）：任何人都不能翻看")}">
      <span class="pst ${pv.disc ? "" : "none"}" style="${stack(pv.disc)}">${pv.disc ? miniBack() : ""}</span><span class="plbl">${L("Discard", "棄牌堆")} <b>${pv.disc}</b></span></div>
    <button type="button" class="pile forg" id="pile-forg" data-list="forg" title="${L("Forgotten memories: click to look through them", "被遺忘的記憶：點擊查看")}">
      <span class="pst ${pv.f ? "" : "none"}" style="${stack(pv.f)}">${pv.f ? miniFace(pv.ft) : ""}</span><span class="plbl">${L("Forgotten", "遺忘")} <b>${pv.f}</b>/${S.cfg.forgottenLimit}</span></button>`;
  el.querySelectorAll("[data-list]").forEach(b => b.onclick = () => pileDialog(b.dataset.list));
  drawDockInfo();
}
// Beside the open hand: what the table shows under the cards, so a choice can be made without closing the hand.
function drawDockInfo() {
  const el = $("dockinfo");
  if (!el || !S) return;
  const s = vs();
  const f = s.forgotten.length, ft = pilesHeld.ft ?? s.pile?.ft ?? S.forgotten.at(-1) ?? -1;
  const fn = pilesHeld.f ?? f;
  const echo = s.echo;
  el.innerHTML = `<button type="button" class="pile forg" data-list="forg" title="${L("Forgotten memories: click to look through them", "被遺忘的記憶：點擊查看")}">
      <span class="pst ${fn ? "" : "none"}" style="--layers:${Math.min(6, Math.ceil(fn / 4))}">${fn ? miniFace(ft) : ""}</span><span class="plbl">${L("Forgotten", "遺忘")} <b>${fn}</b>/${S.cfg.forgottenLimit}</span></button>
    <div class="dockecho ${echo >= 0 ? TAGCLS[echo] : ""}" title="${esc(L("The Echo on the Loom: a card of this thread played as your Answer Resonates", "織機上的迴響：以回應打出此絲線的牌會產生共鳴"))}">
      <span class="stripk">${L("Echo", "迴響")}</span>
      ${echo >= 0 ? `${svgUse(TAG_ICONS[echo], TAGCLS[echo])}<b>${tagName(echo)}</b><small>${L("Resonates as your Answer", "作為回應打出即共鳴")}</small>` : `<small class="muted">${L("No Echo on the Loom", "織機上沒有迴響")}</small>`}
    </div>`;
  el.querySelector("[data-list]").onclick = () => pileDialog();
}
// The forgotten pile is face up, so anyone may look through it, and hold any card up close (the discard pile is face down and stays closed).
function pileDialog() {
  const cards = [...S.forgotten].reverse();
  const title = L("Forgotten memories", "被遺忘的記憶");
  const note = L(`Most recent first. ${S.cfg.forgottenLimit} forgotten and the soul Fades. Spend ${S.cfg.recallCost} Light as your Answer to Recall one.`, `最近遺忘的排在最前。遺忘達到${S.cfg.forgottenLimit}張，亡魂就會消散。以回應花費${S.cfg.recallCost}點光可以喚回一張。`);
  veil(`<div class="dialog wide"><h2>${title} · ${cards.length}</h2><p class="muted">${note}</p>
    <div class="pilelist">${cards.length ? cards.map(cid => `<button type="button" class="mcbtn" data-cid="${cid}" title="${esc(cardName(cid))}">${miniFace(cid)}</button>`).join("") : `<span class="muted">${L("Empty.", "空的。")}</span>`}</div>
    <div class="row"><button type="button" id="cancel">${L("Close", "關閉")}</button></div></div>`, "pile");
  $("cancel").onclick = closeVeil;
  $("veil").querySelectorAll(".mcbtn").forEach(b => b.onclick = () => openZoom(+b.dataset.cid, true));
}

// ---------------------------------------------------------------- cards and Light in flight
const centre = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
function handPoint(cid) {
  const card = cid !== undefined ? document.querySelector(`#hand .card[data-cid="${cid}"]`) : null;
  if (card && dockOpen) return centre(card);
  const tog = $("docktoggle");
  return tog ? centre(tog) : [innerWidth / 2, innerHeight - 30];
}
const boardPoint = () => ($("boardwrap") ? centre($("boardwrap")) : [innerWidth / 2, innerHeight / 3]);
const pilePoint = name => ($(`pile-${name}`)?.querySelector(".pst") ? centre($(`pile-${name}`).querySelector(".pst")) : boardPoint());

// One card travelling across the table, turning over on the way if it should.
function fly(from, to, { cid = -1, up0 = true, up1 = true, ms = 650, delay = 0, onland } = {}) {
  ms *= fxSpeed; delay *= fxSpeed;
  const el = document.createElement("div");
  el.className = "flight";
  el.innerHTML = `<div class="fl-in"><div class="fl-f">${miniFace(cid)}</div><div class="fl-b">${miniBack()}</div></div>`;
  el.style.left = `${from[0]}px`; el.style.top = `${from[1]}px`;
  document.body.appendChild(el);
  const dx = to[0] - from[0], dy = to[1] - from[1], lift = Math.min(90, Math.hypot(dx, dy) * 0.18);
  const r0 = up0 ? 0 : 180, r1 = up1 ? 0 : 180;
  const go = el.animate([
    { transform: "translate(-50%,-50%) scale(.9)", opacity: 0 },
    { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - lift}px)) scale(1.12)`, opacity: 1, offset: 0.5 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.92)`, opacity: 1 },
  ], { duration: ms, delay, easing: "cubic-bezier(.35,.1,.25,1)", fill: "both" });
  el.firstElementChild.animate([{ transform: `rotateY(${r0}deg)` }, { transform: `rotateY(${(r0 + r1) / 2 + (r0 === r1 ? 0 : 0)}deg)`, offset: 0.5 }, { transform: `rotateY(${r1}deg)` }],
    { duration: ms, delay, easing: "ease-in-out", fill: "both" });
  go.onfinish = () => { el.remove(); onland?.(); };
  return delay + ms;
}
// Light spent: motes of lantern-light drift from the Light counter to where it is used.
function motes(toPt, n) {
  // From the Light counter on the Soul board; when that is scrolled out of sight or under the hand, from the turn tray.
  const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight - ($("dock")?.offsetHeight || 0) && r.width > 0; };
  const src = visible($("sb-light")) ? $("sb-light") : $("tray");
  if (!src) return;
  const a = centre(src);
  for (let i = 0; i < n; i++) {
    const m = document.createElement("div");
    m.className = "mote";
    m.style.left = `${a[0]}px`; m.style.top = `${a[1]}px`;
    document.body.appendChild(m);
    const dx = toPt[0] - a[0], dy = toPt[1] - a[1];
    m.animate([{ transform: "translate(-50%,-50%) scale(.4)", opacity: 0 }, { transform: `translate(calc(-50% + ${dx * 0.45 + (i - 1) * 24}px), calc(-50% + ${dy * 0.45 - 40}px)) scale(1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.5)`, opacity: 0 }],
    { duration: 900 * fxSpeed, delay: i * 140 * fxSpeed, easing: "ease-in-out", fill: "both" }).onfinish = () => m.remove();
  }
}
// Hold a pile at its old look until the card arrives.
function holdPile(keys, before) {
  const b = before?.pile;
  if (!b) return () => {};
  for (const k of keys) {
    if (k === "disc") { pilesHeld.disc = b.disc; pilesHeld.top = b.top; }
    if (k === "forg") { pilesHeld.f = before.forgotten; pilesHeld.ft = b.ft; }
    if (k === "deck") pilesHeld.deck = b.deck;
  }
  drawPiles();
  return () => { for (const k of keys) { if (k === "disc") { delete pilesHeld.disc; delete pilesHeld.top; } if (k === "forg") { delete pilesHeld.f; delete pilesHeld.ft; } if (k === "deck") delete pilesHeld.deck; } drawPiles(); };
}
// A card arriving in the hand takes its place in the fan.
function landInHand(cid) {
  arriving.delete(cid);
  const c = document.querySelector(`#hand .card[data-cid="${cid}"]`);
  if (c) { c.classList.remove("await"); c.classList.add("dealt"); }
  if (!prevHand.includes(cid)) prevHand.push(cid);
}

// The local player's card leaves the hand for the river.
function flyCard(cid, how = "up") {
  const src = document.querySelector(`#hand .card[data-cid="${cid}"]`);
  const from = src && dockOpen ? centre(src) : handPoint();
  fly(from, boardPoint(), { cid, up0: true, up1: how !== "down", ms: 700 });
}

// ---------------------------------------------------------------- the turn guide
// Lights the step the active player is on. While the end-of-turn animations play, it follows them
// (Soul Step, then the Mist, then the draw) before moving on to the next player's first card.
const GUIDE = [
  ["summon", "Summon", "optional · before your Answer", "召喚", "可選 · 在回應之前"],
  ["card1", "Answer", "first action · a card matching the Echo Resonates, or Recall with 3 Light", "回應", "第一個行動 · 與迴響相同的牌產生共鳴，或花3點光喚回"],
  ["card2", "Steer", "second action · a card, Seek, or Push Through", "掌舵", "第二個行動 · 打出一張牌、尋覓或奮力駛過"],
  ["bringer", "Bloom-Bringer", "free Bloom", "引花人", "免費綻放"],
  ["soul", "Soul Step", "move if the next space is Lit", "亡魂步驟", "下一格被照亮就前進"],
  ["mist", "The Mist", "one card from this Reach", "迷霧", "翻開本河段的一張牌"],
  ["draw", "Settle and draw", "refill your hand", "平息並抽牌", "補滿手牌"],
];

function guideState() {
  const order = GUIDE.map(g => g[0]);
  let now;
  if (guideStep && S.played === 0 && !pending && !busy) now = guideStep;
  else if (S.result) now = null;
  else if (pending?.type === "bringer") now = "bringer";
  else if (S.phase !== "play") now = "card1";
  else now = (busy || pending) ? (S.played <= 1 ? "card1" : "card2") : (S.played === 0 ? "card1" : "card2");
  const idx = now ? order.indexOf(now) : order.length;
  const hasBringer = S.mantles.bringer === S.cur;
  return GUIDE.map(([id, enTitle, enSub, zhTitle, zhSub], i) => {
    const title = L(enTitle, zhTitle), sub = L(enSub, zhSub);
    let cls = i < idx ? "done" : i === idx ? "now" : "";
    if (id === "summon") cls = (!(guideStep && S.played === 0) && S.phase === "play" && S.played === 0 && E.canSummon(S) && canAct()) ? "avail" : (i < idx ? "skip" : "");
    if (id === "bringer" && !hasBringer) cls = "skip";
    return { id, title, sub, cls };
  });
}

function guideHint() {
  if (S.result) return S.result === "win" ? L("The crossing is complete. Open the Book to read the soul's story.", "渡河完成。翻開書本，讀讀亡魂的故事。")
    : L("The crossing has failed. Open the Book to read what was kept.", "渡河失敗了。翻開書本，看看留下了什麼。");
  const anim = guideStep && S.played === 0 && !pending && !busy;
  if (anim && guideStep === "soul") return L("The soul tries to step onto the next Lit space. In the dark, it Lingers. Grievances on both banks ahead also make it Linger, unless a player spent an action to Push Through.", "亡魂試著踏上下一個被照亮的格子。若前方黑暗，它便會徘徊。前方兩岸都被怨念佔據時也會徘徊，除非有玩家花了行動奮力駛過。");
  if (anim && guideStep === "mist") return L("The Mist turns a card for this Reach.", "迷霧為本河段翻開一張牌。");
  if (anim && guideStep === "draw") return L("The river settles and hands are refilled.", "河面平靜下來，玩家補滿手牌。");
  const who = esc(pname(S.names[S.cur]));
  if (!canAct()) return mode === "local" ? L(`Pass the device to <b>${who}</b>.`, `請把裝置交給<b>${who}</b>。`) : L(`Waiting for <b>${who}</b>…`, `等待<b>${who}</b>…`);
  if (pending?.type === "root") return L(`Click a <b>glowing bank</b> on the river to place Root ${pending.i} of ${pending.n}.`, `點擊河上<b>發光的河岸</b>，放置第${pending.i}個根（共${pending.n}個）。`);
  if (pending?.type === "bloom") return L("Click one of your <b>Roots</b> to open it into a Bloom.", "點擊一個<b>根</b>，讓它綻放成花。");
  if (pending?.type === "bringer") return L("Click a <b>Root</b> to bloom it for free, or skip.", "點擊一個<b>根</b>免費使其綻放，或選擇跳過。");
  if (pending?.type === "inscribe") return L("Write this memory into the <b>Book</b>, or keep the card in the deck.", "將這段記憶寫進<b>憶念之書</b>，或把這張牌留在牌庫中。");
  const echo = S.echo >= 0 && S.played === 0 ? L(` A <b class="${TAGCLS[S.echo]}">${tagName(S.echo)}</b> card will Resonate.`, `<b class="${TAGCLS[S.echo]}">${tagName(S.echo)}</b>牌會產生共鳴。`) : "";
  const wounds = E.pushCost(S);
  const push = E.canPush(S) ? `<span class="pushwarn">${L(`Grievances hold both banks ahead, so the soul will Linger. You may spend an action to <b>Push Through</b>: both Grievances scatter and the soul steps forward now, at ${wounds} Fracture${wounds > 1 ? "s" : ""} and 1 forgotten card. Each Ferryman may do this only once in the whole game.`, `前方兩岸都被怨念佔據，亡魂將會徘徊。你可以花1個行動<b>奮力駛過</b>：兩個怨念四散，亡魂立刻前進一格，代價是${wounds}道裂痕並遺忘1張牌。每位擺渡人整局只能這麼做一次。`)}</span>`
    : E.blockedByGrievances(S) && E.hasPushed(S) ? `<span class="pushwarn">${L("Grievances hold both banks ahead. You have already used your one Push Through this game: clear a bank with your cards.", "前方兩岸都被怨念佔據。你本局的奮力駛過已經用過了：請用手牌清出一側河岸。")}</span>` : "";
  return L(`Click a card in your hand to hold it up close, then choose <b>Face up</b>, <b>Face down</b>, <b>Burn</b> or <b>Seek</b> (discard it and draw).${echo}`, `點擊手牌中的一張牌把它拿近細看，再選擇<b>正面打出</b>、<b>背面打出</b>、<b>焚燒</b>或<b>尋覓</b>（棄掉並抽1張）。${echo}`) + push;
}

// The turn reminder beside the piles: the seven steps of a turn as a row of beads, the current one named.
function drawGuide() {
  const el = $("guide");
  if (!el) return;
  const steps = guideState();
  const now = steps.find(g => g.cls === "now") || steps.find(g => g.cls === "avail");
  el.innerHTML = `<div class="ghead"><span class="stripk">${L("Turn reminder", "回合提示")}</span>
    <ol class="gsteps">${steps.map((g, i) => `<li class="${g.cls}" title="${esc(`${i + 1}. ${g.title}${g.sub ? ` · ${g.sub}` : ""}`)}"><span class="gi"><span>${i + 1}</span></span><b>${g.title}</b></li>`).join("")}</ol></div>
    ${now ? `<div class="gnow"><b>${now.title}</b>${now.sub ? ` <small>${now.sub}</small>` : ""}</div>` : ""}
    <div class="ghint">${guideHint()}</div>`;
}
function setGuide(step) { guideStep = step; if (S && $("guide")) drawGuide(); }

// ---------------------------------------------------------------- Player Aid and Rulebook drawer
let drawerTab = "aid";
function buildDrawer() {
  const d = document.createElement("aside");
  d.className = "drawer";
  d.id = "drawer";
  d.innerHTML = `<header><div class="tabs"><button type="button" data-tab="aid"></button><button type="button" data-tab="rules"></button></div>
      <button type="button" id="drawer-x"></button></header>
    <div class="search" id="dsearch"><input type="search" id="dq"><span class="count" id="dcount"></span></div>
    <div class="body" id="dbody"></div>`;
  document.body.appendChild(d);
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "drawer-tab hidden";
  tab.id = "aid-tab";
  tab.onclick = () => openDrawer(drawerTab);
  document.body.appendChild(tab);
  d.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => openDrawer(b.dataset.tab));
  $("drawer-x").onclick = closeDrawer;
  $("dq").addEventListener("input", () => searchRules($("dq").value));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && d.classList.contains("open")) closeDrawer(); });
  rebuildDrawer();
}

// The drawer's own labels, and its contents when it is open.
function rebuildDrawer() {
  const d = $("drawer");
  d.setAttribute("aria-label", L("Player Aid and Rulebook", "玩家輔助卡與規則書"));
  d.querySelector('[data-tab="aid"]').textContent = L("Player Aid", "玩家輔助卡");
  d.querySelector('[data-tab="rules"]').textContent = L("Rulebook", "規則書");
  $("drawer-x").textContent = L("Close", "關閉");
  $("dq").placeholder = L("Search the rules… e.g. Backlash, Stony, Linger", "搜尋規則…例如：反噬、石地、徘徊");
  $("dq").setAttribute("aria-label", L("Search the rules", "搜尋規則"));
  $("aid-tab").textContent = L("Player Aid · Rules", "輔助卡 · 規則");
  if (d.classList.contains("open")) openDrawer(drawerTab);
}

function openDrawer(tab) {
  drawerTab = tab;
  const d = $("drawer");
  d.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  $("dsearch").classList.toggle("hidden", tab !== "rules");
  d.classList.toggle("wide", tab === "rules");
  if (tab === "aid") $("dbody").innerHTML = playerAid(S?.cfg).replace(/<\/section>\s*$/, `${tokenLegend()}</section>`);
  else {
    const book = rulebook();
    $("dbody").innerHTML = `<nav class="toc">${book.map(r => `<a href="#r-${r.id}">${esc(r.title.replace(/^\d+\. /, ""))}</a>`).join("")}</nav>` +
      book.map(r => `<section class="rsec" id="r-${r.id}" data-keys="${esc(r.keys || "")}"><h3>${r.title}</h3>${r.body}</section>`).join("");
    $("dbody").querySelectorAll(".toc a").forEach(a => a.onclick = e => {
      e.preventDefault();
      document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    searchRules($("dq").value);
  }
  d.classList.add("open");
  $("aid-tab").classList.add("hidden");
  if (tab === "rules" && !d.dataset.wasOpen) setTimeout(() => $("dq").focus(), 300);
  d.dataset.wasOpen = "1";
}

function closeDrawer() {
  $("drawer").classList.remove("open");
  delete $("drawer").dataset.wasOpen;
  $("aid-tab").classList.toggle("hidden", !S);
}

function searchRules(q) {
  const body = $("dbody");
  body.querySelectorAll("mark").forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
  body.normalize();
  const terms = q.toLowerCase().split(/\s+/).filter(t => t.length > 1 || /[\u3400-\u9fff]/.test(t));
  let hits = 0, shown = 0, first = null;
  body.querySelectorAll(".rsec").forEach(sec => {
    const text = (sec.textContent + " " + sec.dataset.keys).toLowerCase();
    const match = !terms.length || terms.every(t => text.includes(t));
    sec.classList.toggle("hide", !match);
    if (!match) return;
    shown += 1;
    if (!terms.length) return;
    const re = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (re.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const span = document.createElement("span");
      span.innerHTML = esc(node.nodeValue).replace(re, m => { hits += 1; return `<mark>${m}</mark>`; });
      node.replaceWith(...span.childNodes);
    }
    first = first || sec.querySelector("mark");
  });
  body.querySelector(".toc")?.classList.toggle("hidden", terms.length > 0);
  $("dcount").textContent = terms.length ? (shown ? L(`${hits} match${hits === 1 ? "" : "es"} · ${plural(shown, "section")}`, `${hits}處符合 · ${shown}個章節`) : L("No matches", "沒有符合的結果")) : "";
  if (first) first.scrollIntoView({ block: "center" });
}

// ---------------------------------------------------------------- refresh everything
function refresh() {
  if (!S || !$("board")) return;
  A.lullaby(S.cfg.soul);
  if (!$("dyn")) drawBoardStatic();
  animateEvents();
  if (!playingBack()) arriving.clear();
  drawStatus();
  drawPrompt();
  drawHand();
  drawGuide();
  topbar();
  if (playingBack()) return;     // the board, Loom, Soul board, piles, Book and Chronicle catch up step by step
  drawBoard();
  drawLoom();
  drawSoulboard();
  drawPiles();
  drawTray();
  drawBook();
  drawLog();
  refreshBook(S);
  prev = finalPrev();
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
    await new Promise(r => setTimeout(r, Math.round((ms || 0) * fxSpeed)));
  }
  running = false;
  if (view) { prev = asPrev(view); view = null; }
  if (guideStep) setGuide(null);
  refresh();
  idleWaiters.splice(0).forEach(r => r());
}
const idle = () => (running || queue.length ? new Promise(r => idleWaiters.push(r)) : Promise.resolve());

function animateEvents() {
  const evs = S.ev.filter(e => e.id > lastEv);
  if (!evs.length) return;
  lastEv = evs[evs.length - 1].id;
  if (!view && !running && !queue.length) view = prev ? { ...prevAsSnap(prev) } : null;
  const endOfTurn = evs.some(e => e.kind === "mist");
  let soulShown = false;
  for (const ev of evs) {
    if (endOfTurn && !soulShown && (ev.kind === "move" || ev.kind === "linger" || ev.kind === "adrift" || ev.kind === "mist")) {
      soulShown = true;
      enqueue(() => { setGuide("soul"); return 700; });
    }
    if (ev.kind === "draw" && ev.cids && viewSeat() === ev.p && seesHand(ev.p)) ev.cids.forEach(c => arriving.add(c));
    enqueue(() => stepEvent(ev));
  }
}
// The previous finished state, in snapshot form, so the first step of a playback starts from what was on screen.
const prevAsSnap = p => ({ tok: p.tok, griev: p.griev, flooded: p.flooded, revealed: p.revealed, soul: p.soul, karma: p.karma, f: p.forgotten,
  fract: S.fract, light: S.light, bw: S.bw, echo: S.echo, ...(p.pile ? { deck: p.pile.deck, disc: p.pile.disc, top: p.pile.top, ft: p.pile.ft } : {}), hold: p.hold, acts: p.acts,
  shield: p.shield, resign: p.resign, pushed: p.pushed });

// Show one effect: move the table to the moment just after it, mark where it happened, sound it and caption it.
// Returns how long to hold the step before the next one.
function stepEvent(ev) {
  if (ev.b) {
    if (view) prev = asPrev(view);
    view = ev.b;
    drawBoard();
    drawLoom();
    drawSoulboard();
    drawPiles();
    drawTray();
  }
  const text = say(ev);
  const at = ev.k !== undefined ? slotXY(ev.k) : ev.sp !== undefined ? [X(ev.sp), Y(ev.sp)] : null;
  const cap = (cls = "") => { if (text) caption(text, cls); };
  switch (ev.kind) {
    case "start": cap(); return 1400;
    case "turn": cap(); if (mode !== "local") A.sfx("turn"); return 700;
    case "play":
      if (!seats.has(ev.p)) fly([innerWidth / 2, 40], boardPoint(), { cid: ev.cid, up0: ev.cid >= 0, up1: ev.cid >= 0, ms: 750 });
      if (!seats.has(ev.p) || mode === "local") toast(text, ev.cid >= 0 ? CARDS[ev.cid].tag : 1);
      cap(ev.cid >= 0 ? ["obs", "acc", "obl"][CARDS[ev.cid].tag] : "");
      if (!seats.has(ev.p)) A.sfx("card");
      if (ev.res) { A.sfx("resonance"); enqueueFront(() => banner(L("Resonance", "共鳴"), L("The card answers the Echo", "這張牌回應了迴響"), "obl")); }
      return 1100;
    case "ghost": toast(text, ev.tag); cap(["obs", "acc", "obl"][ev.tag]); A.sfx("card"); return 1300;
    case "seek": if (!seats.has(ev.p) || mode === "local") toast(text, 1); cap(); A.sfx("card"); return 900;
    case "root": ring(at, "#E6D3A3"); cap(); A.sfx("root"); return 800;
    case "bloom": ring(at, "#D7263D"); cap(); A.sfx("bloom"); return 850;
    case "wither": ring(at, "#9A948C"); cap("bad"); A.sfx("forget"); return 950;
    case "reveal": if (at) ring(at, "#8FD6E1"); cap(); A.sfx("chime"); return 1000;
    case "fog": ring(at, "#9A948C"); cap("bad"); A.sfx("mist"); return 900;
    case "grievance": ring(at, "#8FD6E1"); cap("bad"); A.sfx("grievance"); return 1100;
    case "banish": ring(at, "#E6D3A3"); cap("good"); A.sfx("drain"); return 950;
    case "flood": ring(at, "#8FD6E1"); cap("bad"); A.sfx("flood"); return 1200;
    case "drain": ring(at, "#E6D3A3"); cap("good"); A.sfx("drain"); return 1000;
    case "move": ring([X(Math.min(ev.to, 12)), Y(Math.min(ev.to, 12))], "#EFE7D6"); cap(); A.sfx("move"); return 1100;
    case "light": cap("good"); A.sfx("chime"); return 900;
    case "keepsake": cap("good"); A.sfx("inscribe"); return 1000;
    case "knot": cap(["obs", "acc", "obl"][ev.tag]); A.sfx("chime"); return 750;
    case "echo": cap(ev.tag >= 0 ? ["obs", "acc", "obl"][ev.tag] : "bad"); return 750;
    case "forget": {
      const done = holdPile(["forg"], prev);
      fly(ev.from === "deck" ? pilePoint("deck") : boardPoint(), pilePoint("forg"), { cid: ev.cid ?? -1, up0: ev.from !== "deck", up1: true, ms: 750, onland: done });
      cap("bad"); A.sfx("forget"); return 1100;
    }
    case "discard": {
      const done = holdPile(["disc"], prev);
      // Every card lands face down. A card that was played face up turns over on its way; one from a hand never shows.
      const shown = ev.from === "play" && ev.cid >= 0;
      fly(ev.from === "hand" ? handPoint() : boardPoint(), pilePoint("disc"), { cid: ev.cid, up0: shown, up1: false, ms: 650, onland: done });
      caption(shown ? L(`${cardName(ev.cid)} goes face down onto the discard pile.`, `「${cardName(ev.cid)}」背面朝上放入棄牌堆。`) : L("A card goes face down onto the discard pile.", "一張牌背面朝上放入棄牌堆。"));
      A.sfx("card");
      return 750;
    }
    case "fracture": cap("bad"); A.sfx("fracture"); flash(); shake(); return 1200;
    case "shield": case "mend": case "release": case "guide": cap("good"); A.sfx("chime"); return 1000;
    case "linger": case "adrift": cap("bad"); A.sfx("linger"); toast(text); return 1300;
    case "inscribe":
      if ($("book")) fly(boardPoint(), centre($("book")), { cid: ev.cid, ms: 850 });
      toast(text, 1); cap("good"); if (!seats.has(S.cur)) A.sfx("inscribe"); return 1300;
    case "draw": {
      const cids = ev.cids || [];
      const see = viewSeat() === ev.p && seesHand(ev.p);
      cids.forEach((cid, i) => fly(pilePoint("deck"), handPoint(see ? cid : undefined), { cid: see ? cid : -1, up0: false, up1: see, ms: 650, delay: i * 220, onland: () => landInHand(cid) }));
      if (text) cap(); else caption(L(`${pname(S.names[ev.p])} draws a card.`, `${pname(S.names[ev.p])}抽一張牌。`));
      A.sfx("card");
      return cids.length ? 650 + 220 * cids.length : 700;
    }
    case "recall": {
      motes(pilePoint("forg"), S.cfg.recallCost);
      const done = holdPile(["disc"], prev);
      fly(pilePoint("forg"), pilePoint("disc"), { cid: ev.cid, up1: false, ms: 800, delay: 650, onland: done });
      cap("good"); A.sfx("inscribe"); toast(text, 1); return 1700;
    }
    case "info": {
      const m = ev.m?.[0];
      if (m === "reshuffle") {
        const done = holdPile(["deck"], prev);
        const n = Math.min(6, ev.n || 4);
        for (let i = 0; i < n; i++) fly(pilePoint("disc"), pilePoint("deck"), { up0: false, up1: false, ms: 520, delay: i * 110, onland: i === n - 1 ? done : undefined });
        cap(); A.sfx("card"); return 700 + n * 110;
      }
      if (m === "hold" || m === "holding") {    // the Hold Fast token goes down beside the soul, and is shown again when it takes effect
        if (m === "holding") boardToken("hold", [X(Math.min(vs().soul, 12)), Y(Math.min(vs().soul, 12)) - 58]);
        cap(m === "holding" ? "good" : ""); A.sfx("chime"); return 1400;
      }
      cap(); return 1200;
    }
    case "push": A.sfx("fracture"); flash(); shake(); cap("bad"); boardToken("push", [X(ev.sp), Y(ev.sp)]); return banner(L("Through the shades", "駛過怨念"), text, "obs");
    case "blessing":
      if (ev.cid !== undefined) { const done = holdPile(["disc"], prev); fly(pilePoint("forg"), pilePoint("disc"), { cid: ev.cid, up1: false, ms: 800, delay: 500, onland: done }); }
      A.sfx("inscribe"); cap("good"); return banner(L("Chapter Blessing", "章節祝福"), text.replace(/^(Chapter Blessing: |章節祝福：)/, ""), "good");
    case "summon": {
      A.sfx("summon"); cap("good");
      if ($("tray")) motes(centre($("tray")), S.cfg.mantleCost);
      const mi = mantleInfo(ev.mantle); return banner(text, mi.text, ["obs", "acc", "obl"][mi.tag]);
    }
    case "mist": setGuide("mist"); cap("bad"); return mistCard(ev.name) + 300;
    case "backlash": A.sfx("backlash"); shake(); cap("bad"); return banner(L(`Backlash · ${tagName(ev.tag)}`, `反噬 · ${tagName(ev.tag)}`), backlashText(ev.tag), ["obs", "acc", "obl"][ev.tag]);
    case "reach": A.sfx("summon"); cap("good"); return banner(L(`Reach ${ROMAN[ev.reach]}`, `第${ZHNUM[ev.reach]}河段`), reachName(ev.reach), "good");
    case "win": A.sfx("win"); cap("good"); return 900;
    case "loss": A.sfx("loss"); cap("bad"); return 900;
    default: cap(); return text ? 900 : 0;
  }
}
function enqueueFront(fn) { queue.unshift(fn); if (!running) runQueue(); }

// A ring of light where an effect lands on the river.
function ring(at, color) {
  const fx = $("fx");
  if (!fx || !at) return;
  const g = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  g.setAttribute("cx", at[0]); g.setAttribute("cy", at[1]); g.setAttribute("r", "30");
  g.setAttribute("class", "fxring"); g.setAttribute("style", `stroke:${color}`);
  fx.appendChild(g);
  setTimeout(() => g.remove(), 1400);
}
// The caption line along the foot of the board names each effect as it is carried out.
let capTimer = 0;
function caption(text, cls = "") {
  const el = $("boardcap");
  if (!el) return;
  el.className = `boardcap on ${cls}`;
  el.textContent = text;
  clearTimeout(capTimer);
  capTimer = setTimeout(() => el.classList.remove("on"), 3200);
}

function mistCard(name) {
  A.sfx("mist");
  const harsh = HARSH_NAMES.has(name);
  const el = document.createElement("div");
  el.className = `mistcard ${harsh ? "harsh" : ""}`;
  el.innerHTML = `<div class="k">${harsh ? L("Harsh Mist", "凶霧") : L("The Mist", "迷霧")}</div>${svgUse("nb-fog")}<h3>${esc(mistName(name))}</h3><p>${esc(mistText(name))}</p>`;
  document.body.appendChild(el);
  // Crisp while it is read; it only blurs as it leaves. 2 seconds in all.
  setTimeout(() => el.classList.add("out"), 1550);
  setTimeout(() => el.remove(), 2000);
  return 2000;
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
function veil(html, kind = "") {
  closeVeil();
  const v = document.createElement("div");
  v.className = "veil";
  v.id = "veil";
  v.dataset.kind = kind;
  v.innerHTML = html;
  document.body.appendChild(v);
  v.querySelector("button")?.focus();
}
function closeVeil() { $("veil")?.remove(); }

async function showEnd(now = false) {
  if (endShown) return;
  endShown = true;
  if (!now) {
    await idle();
    await new Promise(r => setTimeout(r, 600));
  }
  if (!S || !S.result) return;
  const win = S.result === "win";
  const fate = E.keyMemoryFate(S);
  const soul = soulInfo(S.cfg.soul);
  const fateText = fate && (zh() ? {
    inscribed: `關鍵記憶已寫進書中。${soul.name}帶著最重要的回憶渡過了河。`,
    forgotten: `關鍵記憶被河水帶走了。${soul.name}${win ? "抵達時變得更輕，也更空" : "沒有帶著它，走進了迷霧"}。`,
    unspoken: "關鍵記憶始終沒有被寫下。有些事，就這樣未曾說出口地渡過了河。",
  } : {
    inscribed: `The Key Memory was written into the Book. ${soul.name} crosses remembering what mattered most.`,
    forgotten: `The Key Memory was lost to the river. ${soul.name} ${win ? "arrives lighter, and emptier" : "goes into the mist without it"}.`,
    unspoken: `The Key Memory was never written down. Some things go across unsaid.`,
  })[fate];
  const pages = bookFrames().map(([title, frame], r) => `<div class="page"><h3>${title}</h3>${frame.replace(/\{(\w+)\}/g, (_, slot) => {
    const cid = S.book[r][slot];
    return cid === undefined ? `<span class="gone">${L("…but this, the river has taken", "……但這一段，已被河水帶走")}</span>` : `<b>${esc(cardBand(cid))}</b>`;
  })}</div>`).join("");
  const canRestart = mode !== "online" || net?.role === "host";
  const stat = (n, en, zhText) => `<div><b>${n}</b>${L(en, zhText)}</div>`;
  veil(`<div class="dialog wide end">
    <div class="eyebrow">${esc(soul.name)} · ${L("Lantern", "燈籠")} ${esc(lanternName(S.cfg.lantern))}</div>
    <h2 class="${S.result}">${win ? L("The soul reaches the Far Shore", "亡魂抵達了彼岸") : causeName(S.cause)}</h2>
    <p class="muted">${esc(say(S.log.filter(l => l.kind === "win" || l.kind === "loss").pop()))}</p>
    ${fateText ? `<p style="font-family:var(--serif);font-style:italic;color:var(--bone)">${esc(fateText)}</p>` : ""}
    <div class="stats">
      ${stat(S.turn, "turns", "回合")}${stat(`${Math.min(S.soul, 12)}/12`, "spaces crossed", "渡過的格數")}
      ${stat(S.forgotten.length, "forgotten", "遺忘")}${stat(S.stats.resonances, "resonances", "共鳴")}
      ${stat(S.stats.inscribed, "memories inscribed", "銘刻的記憶")}${stat(S.stats.backlashes, "backlashes", "反噬")}
    </div>
    <h3 style="color:var(--bone)">${L("The Book of Remembrance", "憶念之書")}</h3>
    <div class="book">${pages}</div>
    <div class="row">${canRestart ? `<button type="button" class="primary" id="again">${L("Cross again", "再渡一次")}</button>` : `<span class="muted">${L("The host can start another crossing.", "主持人可以開始新的渡河。")}</span>`}
      <button type="button" id="readbook" class="openbook">${svgUse("nb-seal")}${L("Open the Book", "翻開書本")}</button>
      <button type="button" id="tomenu">${L("Back to the menu", "回到主選單")}</button><button type="button" id="stay">${L("Look at the board", "查看版圖")}</button></div>
  </div>`, "end");
  $("tomenu").onclick = () => { leaveGame(); menu(); };
  $("stay").onclick = closeVeil;
  $("readbook").onclick = () => { closeVeil(); openBook(S, 0); };
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

boot();
