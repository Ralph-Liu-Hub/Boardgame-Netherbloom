// Netherbloom web table: menus, the board, the hand, animations and the three ways to play
// (solo against the Ghost, everyone at one screen, or online with each player on their own device).
import * as E from "./engine.js";
import { CARDS, CORE_IDS, ECHO_IDS, SOUL_PACKS, TAG_ICONS, SOULS, FIRST_SOUL, MANTLES, LANTERN, STANDARD_LANTERN, lanternIcon, HARSH, MIST, GHOST, TILES, STONY, MEMORY, GRAVE, FERTILE } from "./cards.js";
import * as A from "./audio.js";
import { setupFigure } from "./setupfig.js";
import { artSrc, artImg, soulPortrait, reachPainting, preloadArt } from "./art.js";
import * as N from "./net.js";
import { passage, passageLeft, preloadScenes } from "./passage.js";
import { rulebook, playerAid } from "./rules.js";
import { T as CARD_WORDS, cardKit, webCardCSS, mistDeck, mistId, harshId, ghostId } from "./cardface.js";
import { fillFigures, RULEFIG_CSS } from "./rulefigs.js";
import { openBook, closeBook, refreshBook, resetBookMemory, relangBook } from "./book.js";
import {
  LANGS, lang, zh, setLang, onLang, hasChosenLang, say, backlashText, causeName, cardName, cardBand, tagName, slotLabel, tileName,
  reachName, soulInfo, mantleInfo, bookFrames, ops, pname, lanternName,
} from "./i18n.js";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const svgUse = (id, cls = "", style = "") => `<svg class="${cls}" style="${style}" aria-hidden="true"><use href="#${id}"/></svg>`;
const TAGCLS = ["c-obs", "c-acc", "c-obl"];
// Every card on screen is the printed card: the design system's template (cardface.js), drawn at whatever width its box has.
const kit = cardKit((name, pos) => artImg(name, "pa", pos));
const CW = () => CARD_WORDS[zh() ? "zh" : "en"];
const face = html => `<div class="nbface">${html}</div>`;
const memoryFace = cid => face(kit.memoryCard(CW(), cid));
// A Mist card by its name and effects (as the engine reports it), with the ID it is printed with.
function mistFace(name, ops, reach = 0) {
  const h = HARSH.findIndex(m => m[0] === name);
  if (h >= 0) return face(kit.mistFace(CW(), HARSH[h], harshId(h), reach, true));
  const deck = mistDeck(reach), key = m => JSON.stringify(m);
  let at = ops ? deck.findIndex(m => key(m) === key([name, ops])) : -1;
  if (at < 0) at = deck.findIndex(m => m[0] === name);
  return face(kit.mistFace(CW(), at >= 0 ? deck[at] : [name, ops || []], at >= 0 ? mistId(reach, at) : "", reach, false));
}
const ghostFace = (t, a) => face(kit.ghostFace(CW(), t, a, ghostId(Math.max(0, GHOST.findIndex(g => g[0] === t && g[1] === a)))));
if (!document.getElementById("nbcards")) document.head.insertAdjacentHTML("beforeend", `<style id="nbcards">${webCardCSS()}${RULEFIG_CSS}</style>`);
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
let stage = null;
let spy = { on: false, seat: null }; // a watching host: show the players' hands, and whose (null follows the turn)
let looks = {};               // a watching host: seat -> the card that player is holding up close right now
let amAdmin = false;         // the signed-in account may see the play log and host a table without playing          // the opening: what is already laid on the table while the setup plays out
const setup = load("nb-setup", { players: 3, soul: "child", lantern: STANDARD_LANTERN, names: ["", "", "", ""], name: "" });
if (![2, 3, 4].includes(setup.tableSize)) setup.tableSize = 3;   // online: how many seats the host opens
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
  try { const me = await fetch("/api/me", { cache: "no-store" }); if (me.ok) amAdmin = !!(await me.json()).admin; } catch { /* not signed in, or offline */ }
  preloadScenes();
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
  $("btn-cards").onclick = () => openDrawer("cards");
  $("btn-aid").onclick = () => openDrawer("aid");
  $("btn-lang").onclick = () => setLang(zh() ? "en" : "zh");
  onLang(relang);
  $("btn-menu").onclick = () => {
    if (S && !S.result && !confirm(L("Leave this game and return to the menu?", "要離開這場遊戲並回到主選單嗎？"))) return;
    backToMenu();
  };
  topbar();
  guardBack();
  const saved = readSave();
  if (!hasChosenLang()) chooseLanguage();
  else if (ownsSave(saved)) resumeGame(saved);
  else menu();
  let arrived = false;
  try { arrived = !!sessionStorage.getItem("nb-arrive"); sessionStorage.removeItem("nb-arrive"); } catch { /* storage blocked */ }
  if (arrived) passage("arrive", undefined, { ...crossing(), title: `Netherbloom${zh() ? "<small>彼岸花渡</small>" : ""}`,
    sub: L("A crossing of the river of forgetting", "渡過遺忘之河") });
  else document.documentElement.classList.remove("arriving");
}

// Going down to a table and coming back up are crossings of their own (passage.js).
function crossing(kind) {
  return { speed: fxSpeed < 1 ? 0.6 : 1,
    line: kind === "down" ? L("Down, into the river of forgetting", "沉入遺忘之河") : kind === "up" ? L("The river lets you go, for now", "河水暫且放你離去") : "",
    sound: kind ? () => A.sfx(kind === "down" ? "descend" : "ascend") : undefined };
}
function backToMenu() { passage("up", () => { leaveGame(); menu(); scrollTo(0, 0); }, crossing("up")); }

// The Back button closes what is open (a card, a dialog) and never drops a game by accident:
// at the table it asks first, the way the Menu button does.
function guardBack() {
  const arm = () => { try { history.pushState({ nb: 1 }, ""); } catch { /* history blocked */ } };
  arm();
  addEventListener("popstate", () => {
    arm();
    if (!$("zoom")?.classList.contains("hidden")) { closeZoom(); return; }
    if ($("drawer")?.classList.contains("open")) { closeDrawer(); return; }
    if ($("veil") && $("veil").dataset.kind !== "pass" && $("veil").dataset.kind !== "leave") { closeVeil(); return; }
    if (S && !S.result || (mode === "online" && net)) askLeave();
  });
}
function askLeave() {
  veil(`<div class="dialog"><h2>${L("Leave the table?", "要離開牌桌嗎？")}</h2>
    <p class="muted">${L("A refresh never loses the game; leaving does. Leaving ends this crossing on this device.", "重新整理不會失去遊戲，但離開會。離開後，這台裝置上的這場渡河就結束了。")}</p>
    <div class="row"><button type="button" class="primary" id="stayhere">${L("Stay at the table", "留在牌桌")}</button><button type="button" id="leavenow">${L("Leave the game", "離開遊戲")}</button></div></div>`, "leave");
  $("stayhere").onclick = closeVeil;
  $("leavenow").onclick = () => { closeVeil(); backToMenu(); };
}

// The first visit asks for a language; afterwards the top-bar button switches at any time.
function chooseLanguage() {
  $("app").innerHTML = `<div class="screen langpick">
    <div class="hero"><svg class="lily" aria-hidden="true"><use href="#nb-bloom"/></svg><h1>Netherbloom</h1><p>Choose your language · 請選擇語言</p></div>
    <div class="langopts">${Object.entries(LANGS).map(([k, v]) => `<button type="button" data-lang="${k}" class="${k === lang() ? "on" : ""}">${v}</button>`).join("")}</div>
  </div>`;
  document.querySelectorAll("[data-lang]").forEach(b => b.onclick = () => { setLang(b.dataset.lang); const saved = readSave(); if (ownsSave(saved)) resumeGame(saved); else menu(); });
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
  $("btn-cards").textContent = L("Cards", "卡牌");
  $("btn-menu").textContent = L("Menu", "主選單");
  $("btn-out").textContent = L("Sign out", "登出");
  const dash = $("btn-dash");
  if (dash) { dash.classList.toggle("hidden", !amAdmin); dash.querySelector("button").textContent = L("Dashboard", "管理面板"); }
  $("btn-menu").classList.toggle("hidden", !S && !net);
  $("aid-tab").classList.toggle("hidden", !S);
  $("modelabel").textContent = mode ? (zh()
    ? { solo: "單人 · 與幽靈同行", local: "同一螢幕", online: `線上${net?.code ? " · 桌號 " + net.code : ""}` }
    : { solo: "Solo · against the Ghost", local: "Same screen", online: `Online${net?.code ? " · table " + net.code : ""}` })[mode] : "";
}

function leaveGame() {
  endOpening();
  queue.length = 0;           // effects still waiting to play belong to the table being left
  view = null;
  A.mood(0, 0);
  if (S && !S.result) { recordChron(); track("beat", { result: "left", detail: endRecord("left") }); }
  clearInterval(beatTimer);
  dropSave();
  clearTimeout(net?.retry);
  if (net) net.closed = true;
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
    `<button type="button" class="soulopt ${setup.soul === k ? "on" : ""}" data-soul="${k}"><span class="soulpic">${artImg(soulPortrait(k))}</span><b>${esc(v.name)}</b>${k === FIRST_SOUL ? `<span class="firsttag" title="${L("Suggested for your first crossing", "建議第一次渡河時選擇")}">${L("Suggested first", "新手推薦")}</span>` : ""}<small>${esc(v.twist)}</small></button>`).join("");
  if (!LANTERN[setup.lantern]) setup.lantern = STANDARD_LANTERN;
  const lan = Object.keys(LANTERN).map(Number).map(l => `<button type="button" data-lantern="${l}" class="${setup.lantern === l ? "on" : ""}">${lanternIcon(l)} ${esc(lanternName(l))}</button>`).join("");
  $("app").innerHTML = `
  <div class="screen">
    <div class="hero">
      <div class="heroart" aria-hidden="true">${artImg("cover-f")}</div>
      <div class="eyebrow">${L("Publisher preview", "出版社試玩版")}</div>
      <h1>Netherbloom${zh() ? '<span class="zhtitle">彼岸花渡</span>' : ""}</h1>
      <p>${L("Grow a path of Netherblooms across the river of forgetting, and carry one soul to the Far Shore before it forgets who it was. A co-operative game for 1 to 4: plan together, but a soul's memories are never spoken.",
        "在遺忘之河上種出一條彼岸花小徑，趕在亡魂忘記自己是誰之前，護送它抵達彼岸。一款1至4人的合作遊戲：一起商量，但亡魂的記憶絕不說出口。")}</p>
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
  const saved = readSave();
  if (saved) {
    const box = document.createElement("section");
    box.className = "panel resumebox";
    box.innerHTML = `<div><div class="eyebrow">${L("Crossing in progress", "進行中的渡河")}</div><b>${esc(saveSummary(saved))}</b></div>
      <div class="row"><button type="button" class="primary" id="resumego">${L("Resume", "繼續")}</button><button type="button" id="resumedrop">${L("Discard", "捨棄")}</button></div>`;
    document.querySelector("#app .hero")?.after(box);
    $("resumego").onclick = () => { dropSave(saved); resumeGame(saved); };
    $("resumedrop").onclick = () => { dropSave(saved); menu(which); };
  }
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
    const sizes = [2, 3, 4].map(n => `<button type="button" data-size="${n}" class="${setup.tableSize === n ? "on" : ""}">${L(`${n} players`, `${n}人`)}</button>`).join("");
    mp.innerHTML = `<h2>${L("Online", "線上模式")}</h2>
      <div class="netpick">
        <section class="netcard">
          <h3>${L("Host a new table", "開新桌")}</h3>
          <p class="muted">${L("You open the table, choose how many players will sit at it, and share its code.", "由你開桌、決定這桌的人數，再把桌號分享給其他玩家。")}</p>
          <label class="field"><span>${L("Your name", "你的名字")}</span><input id="nmh" class="nmo" maxlength="18" value="${esc(setup.name)}" placeholder="${L("Your name", "你的名字")}"></label>
          <div class="field"><span>${L("Players at this table", "這桌的人數")}</span><div class="lanterns">${sizes}</div></div>
          ${amAdmin ? `<label class="check"><input type="checkbox" id="watchhost" ${setup.watchHost ? "checked" : ""}> ${L("Host without playing: watch the whole table, no hands shown (admin)", "主持但不參與：旁觀整張牌桌，不顯示任何手牌（管理員）")}</label>` : ""}
          <div class="row"><button type="button" class="primary" id="hostbtn">${L("Host a new table", "開新桌")}</button></div>
        </section>
        <section class="netcard">
          <h3>${L("Join a table", "加入牌桌")}</h3>
          <p class="muted">${L("Just your name and the five-letter code from your host. The host has already chosen the number of players.", "只需要填寫你的名字，以及主持人給你的5個字母桌號。人數已由主持人決定。")}</p>
          <label class="field"><span>${L("Your name", "你的名字")}</span><input id="nmj" class="nmo" maxlength="18" value="${esc(setup.name)}" placeholder="${L("Your name", "你的名字")}"></label>
          <label class="field"><span>${L("Table code", "桌號")}</span><input id="code" maxlength="5" autocomplete="off" autocapitalize="characters" placeholder="${L("e.g. K7QXM", "例如 K7QXM")}" style="text-transform:uppercase;letter-spacing:.2em"></label>
          <div class="row"><button type="button" class="primary" id="joinbtn">${L("Join a table", "加入牌桌")}</button></div>
        </section>
      </div>
      <span class="muted" id="neterr"></span>
      <p class="muted" style="margin:0;font-size:.88rem">${L("Players connect browser to browser. The host shares the five-letter code.", "玩家之間以瀏覽器直接連線。由主持人分享5個字母的桌號。")}</p>`;
    // one name, typed in whichever panel: the two boxes stay the same
    const nm = id => { setup.name = $(id).value.trim() || "Player"; store("nb-setup", setup); return setup.name; };
    mp.querySelectorAll(".nmo").forEach(el => el.oninput = () => mp.querySelectorAll(".nmo").forEach(o => { if (o !== el) o.value = el.value; }));
    mp.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { setup.name = $("nmh").value.trim(); setup.tableSize = +b.dataset.size; store("nb-setup", setup); menu("online"); });
    if ($("watchhost")) $("watchhost").onchange = e => { setup.watchHost = e.target.checked; store("nb-setup", setup); };
    $("hostbtn").onclick = () => hostTable(nm("nmh"), null, 0, amAdmin && !!setup.watchHost);
    $("joinbtn").onclick = () => {
      const code = $("code").value.trim().toUpperCase();
      if (code.length !== 5) { $("neterr").textContent = L("Enter the five-letter code.", "請輸入5個字母的桌號。"); return; }
      if (net && net.role === "guest" && net.code === code) leaveGame();   // a fresh search, not the end of the last one
      joinTable(code, nm("nmj"));
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
  beginGame(s, true);
}

// From the menu or a lobby, the table is reached by going down into the river.
function beginGame(s, opening = false) {
  if (screen?.[0] === "menu" || screen?.[0] === "lobby") passage("down", () => setTable(s, opening), crossing("down"));
  else setTable(s, opening);
}
function setTable(s, opening) {
  preloadArt(["tex-bank", "tex-water", "card-fog", "back-memory", "back-mist", soulPortrait(s.cfg.soul), ...[0, 1, 2].map(r => reachPainting(s.cfg.soul, r))]);
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
  stage = null;
  looks = {};
  if (opening && s.turn <= 1 && !s.played && !(s.acts || []).length) startOpening();
  refresh();
  saveGame();
  trackGame(S.turn <= 1 && !S.played);
  tick();
}

// ---------------------------------------------------------------- online
// restore: a saved table to open again under the same code (after a refresh or a closed tab).
// watch: the host keeps the table without taking a seat (an admin overseeing a playtest). It sees the whole table but no hand,
// and only plays a seat while that player is disconnected, so the game can go on.
function hostTable(name, restore = null, tries = 0, watch = false) {
  const code = restore?.code || N.newCode();
  mode = "online";
  if (!net || net.code !== code) {
    watch = restore ? !!restore.watch : watch;
    net = { role: "host", code, watch, hostName: name, started: !!restore?.started, capacity: restore?.capacity || setup.tableSize,
      players: restore?.players ? restore.players.map((p, i) => ({ ...p, conn: null, online: i === 0 && !watch })) : watch ? [] : [{ name, cid: N.clientId(), conn: null, online: true }] };
    mySeat = watch ? -1 : 0;
    // players who have not reconnected yet are played by the host, as when anyone drops out mid-game
    seats = restore?.started ? hostSeats() : new Set(watch ? [] : [0]);
    if (restore?.s) beginGame(restore.s);
    else lobby();
  }
  net.api = N.host(code, {
    open: () => {
      const back = net.away;
      net.ready = true; net.away = false;
      if (net.started && (back || restore)) toast(L(`Table ${code} is open again. The other players rejoin as their browsers reconnect.`, `牌桌 ${code} 已重新開啟。其他玩家的瀏覽器重新連線後就會回到牌桌。`));
      if (!net.started) lobby();
      saveGame();
    },
    // the line to the matchmaking server dropped: nobody new can find the table until it is back
    away: () => {
      if (!net || net.closed || net.away) return;
      net.away = true;
      if (!net.started) lobby();
    },
    error: e => {
      if (!net || net.closed) return;
      if (net.ready && SERVER_DROP.includes(e?.type)) { net.away = true; if (!net.started) lobby(); return; }
      // after a refresh the old table can take a few seconds to be released: try the same code again
      if (e?.type === "unavailable-id" && restore && tries < 20) {
        net.api.close();
        net.retry = setTimeout(() => { if (net && !net.closed) hostTable(name, restore, tries + 1, watch); }, 2500);
        return;
      }
      const text = netError(e);
      if (net?.started) toast(text); else lobby(text);
    },
    message: (connId, msg) => hostMessage(connId, msg),
    leave: connId => {
      const p = net.players.find(x => x.conn === connId);
      if (!p) return;
      p.online = false;
      p.conn = null;
      if (net.started) { seats.add(net.players.indexOf(p)); toast(L(`${p.name} lost connection. You will play their turns until they return${net.watch ? " (you will see their hand while you do)" : ""}.`, `${p.name}斷線了。在對方回來之前，由你代為進行其回合${net.watch ? "（代打時你會看到其手牌）" : ""}。`)); }
      else net.players.splice(net.players.indexOf(p), 1);
      sendLobby();
      saveGame();
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
    else if (!net.started && net.players.length < net.capacity) { p = { name, cid: msg.cid, conn: connId, online: true }; net.players.push(p); }
    else { net.api.send(connId, { t: "full" }); return; }
    const seat = net.players.indexOf(p);
    if (net.started) { seats.delete(seat); toast(L(`${p.name} is back at the table.`, `${p.name}回到牌桌了。`)); }
    net.api.send(connId, { t: "welcome", seat, code: net.code });
    sendLobby();
    saveGame();
    if (net.started && S) net.api.send(connId, { t: "state", s: S });
    if (!net.started) lobby();
    else refresh();
  } else if (msg.t === "look") {
    // a player holds a card up close (or puts it back): only the watching host shows it
    const seat = net.players.findIndex(x => x.conn === connId);
    if (seat < 0) return;
    looks[seat] = Number.isInteger(msg.cid) ? msg.cid : null;
    if (watching() && S) drawHand();
  } else if (msg.t === "state" && S && msg.s) {
    const p = net.players.find(x => x.conn === connId);
    const seat = net.players.indexOf(p);
    if (msg.s.gid === S.gid && msg.s.ver > S.ver && seat === E.actor(S) && !seats.has(seat)) {
      S = msg.s;
      net.api.broadcast({ t: "state", s: S }, connId);
      onRemoteState();
    }
  }
}

// The seats the host's browser plays: its own (unless it only watches) and any player who is not connected.
const hostSeats = () => new Set(net.players.map((p, i) => (i === 0 && !net.watch) || !p.online ? i : -1).filter(i => i >= 0));

function sendLobby() {
  if (net?.role !== "host") return;
  net.api.broadcast({ t: "lobby", watched: !!net.watch, hostName: net.watch ? net.hostName : undefined, players: net.players.map(p => ({ name: p.name, online: p.online })), capacity: net.capacity, soul: setup.soul, lantern: setup.lantern, started: net.started });
}

// restore: a saved seat at a table (after a refresh), or a reconnection after the link dropped.
function joinTable(code, name, restore = null) {
  mode = "online";
  if (!net || net.code !== code || net.role !== "guest") {
    net = { role: "guest", code, started: false, players: [], soul: null, lantern: null, capacity: 4, name };
    seats = new Set();
    if (restore?.s) { mySeat = restore.seat ?? 0; seats = new Set([mySeat]); net.started = true; beginGame(restore.s); }
    else lobby(L("Looking for the table…", "正在尋找牌桌…"));
  }
  if (restore?.rejoin) net.rejoining = true;
  const reconnect = () => {
    // keep trying for ten minutes: the host may be refreshing their page or briefly offline
    if (!net || net.closed) return;
    net.rejoining = true;
    net.since ||= Date.now();
    if (Date.now() - net.since > 10 * 60e3) {
      net.rejoining = false;
      if (S) setPrompt(`<span class="msg">${L("The host has not come back. <b>The game cannot continue.</b>", "主持人一直沒有回來。<b>遊戲無法繼續。</b>")}</span>`);
      else lobby(L("The host closed the table.", "主持人關閉了牌桌。"));
      return;
    }
    if (S) setPrompt(`<span class="msg">${L("Reconnecting to the host…", "正在重新連線到主持人…")}</span>`);
    else lobby(L("Reconnecting to the host…", "正在重新連線到主持人…"));
    net.api?.close();
    net.retry = setTimeout(() => { if (net && !net.closed) joinTable(code, name, { rejoin: true }); }, 3000);
  };
  net.api = N.join(code, {
    open: () => { net.since = 0; net.api.send({ t: "hello", name, cid: N.clientId() }); },
    message: msg => guestMessage(msg),
    close: () => {
      if (!net || net.closed) return;
      if (net.started || net.joined) { toast(L("Lost the connection to the host. Reconnecting…", "與主持人的連線中斷了，正在重新連線…")); reconnect(); }
      else lobby(L("The host closed the table.", "主持人關閉了牌桌。"));
    },
    error: e => {
      if (!net || net.closed) return;
      if (net.rejoining || net.started) { reconnect(); return; }
      // the host may still be opening the table, or be back in a moment (a phone that switched apps): look again for a while
      if (e?.type === "peer-unavailable" && !net.joined && (net.looks || 0) < 15) {
        net.looks = (net.looks || 0) + 1;
        lobby(L(`Looking for table ${code}…`, `正在尋找桌號 ${code} 的牌桌…`));
        net.api?.close();
        net.retry = setTimeout(() => { if (net && !net.closed) joinTable(code, name); }, 3000);
        return;
      }
      const text = netError(e);
      if (S) toast(text); else lobby(text);
    },
  });
}

function guestMessage(msg) {
  if (!msg || typeof msg !== "object" || !net) return;
  if (msg.t === "welcome") {
    mySeat = msg.seat; seats = new Set([mySeat]); net.joined = true;
    if (net.rejoining) { net.rejoining = false; toast(L("Back at the table.", "回到牌桌了。")); }
    saveGame();
    if (!S) lobby(); else refresh();
  }
  else if (msg.t === "full") lobby(L("That table is full or its game has already begun.", "這張牌桌已滿，或遊戲已經開始。"));
  else if (msg.t === "lobby") {
    net.players = msg.players;
    net.capacity = msg.capacity || 4;
    net.soul = msg.soul;
    net.lantern = msg.lantern;
    net.started = msg.started;
    net.watched = !!msg.watched;
    net.hostName = msg.hostName;
    if (!S) lobby(); else refresh();
  } else if (msg.t === "state" && msg.s) {
    if (!S || msg.s.gid !== S.gid) { beginGame(msg.s, true); return; }
    if (msg.s.ver > S.ver) { S = msg.s; onRemoteState(); }
  }
}

// Errors that only mean the line to the matchmaking server dropped for a moment; the host keeps retrying.
const SERVER_DROP = ["network", "server-error", "socket-error", "socket-closed", "disconnected"];

// Plain words for what went wrong with a connection.
function netError(e) {
  const type = e?.type || e?.message || String(e);
  if (type === "peer-unavailable") return L("No open table with that code. Check the code with your host, and ask them to keep the Netherbloom page open and in front: on a phone, switching to another app can hide the table until they come back.",
    "找不到這個桌號的牌桌。請向主持人確認桌號，並請主持人讓《彼岸花渡》的頁面保持開啟、留在最前面：在手機上切換到其他應用程式時，牌桌可能會暫時找不到，直到主持人回到頁面。");
  if (type === "negotiation-failed" || type === "webrtc")
    return N.hasRelay() ? L("Your two networks could not reach each other, even through the relay. Try again, or try another network.", "雙方的網路即使透過中繼伺服器也無法連通。請再試一次，或換一個網路。")
      : L("Your two networks could not reach each other directly (a strict router or a mobile network). Online play needs a relay server for this; ask the site owner to set one up.", "雙方的網路無法直接連通（例如嚴格的路由器或行動網路）。這種情況需要中繼伺服器；請網站管理者設定。");
  if (type === "unavailable-id") return L("That table code is already in use. Host again for a new code.", "這個桌號已被使用。請重新開桌取得新的桌號。");
  if (type === "network" || type === "server-error" || type === "socket-error" || type === "socket-closed")
    return L("Could not reach the matchmaking server. Check your connection and try again.", "無法連上配對伺服器。請檢查網路後再試一次。");
  return L(`Connection problem: ${type}`, `連線問題：${type}`);
}

function lobby(note = "") {
  screen = ["lobby", note];
  topbar();
  const host = net.role === "host";
  const soul = host ? setup.soul : net.soul, lan = host ? setup.lantern : net.lantern;
  const watching = host ? net.watch : net.watched;
  const list = (watching ? `<div class="muted"><span class="dot"></span>${esc(host ? net.hostName : net.hostName || L("The host", "主持人"))} ${L("(host, watching: not playing)", "（主持人，旁觀：不參與遊戲）")}</div>` : "")
    + (net.players || []).map((p, i) => `<div><span class="dot ${p.online ? "" : "off"}"></span>${esc(p.name)}${i === 0 && !watching ? ` <span class="muted">${L("(host)", "（主持人）")}</span>` : ""}${host || i !== mySeat ? "" : ` <span class="muted">${L("(you)", "（你）")}</span>`}</div>`).join("");
  $("app").innerHTML = `
  <div class="screen">
    <section class="panel" style="justify-items:center;text-align:center">
      <div class="eyebrow">${L("Online table", "線上牌桌")}</div>
      <div class="code ${host && !net.ready ? "dim" : ""}">${esc(net.code)}</div>
      ${host ? `<p class="tablestate ${net.away ? "away" : net.ready ? "open" : ""}"><span class="dot ${net.ready && !net.away ? "" : "off"}"></span>${net.away
        ? L("Reconnecting to the matchmaking server… Players cannot find the table until this page is back online.", "正在重新連線到配對伺服器…在此頁面恢復連線之前，其他玩家找不到這張牌桌。")
        : net.ready ? L("Open: players can join with this code.", "已開桌：其他玩家可以用這個桌號加入。") : L("Opening the table…", "正在開桌…")}</p>
      <p class="muted" style="margin:0">${L("Other players choose Online → Join a table and type the code. Keep this page open and in front until everyone is in: on a phone, switching to another app can hide the table.", "其他玩家選擇「線上模式 → 加入牌桌」並輸入桌號。在所有人到齊之前，請讓這個頁面保持開啟、留在最前面：在手機上切換到其他應用程式時，牌桌可能會找不到。")}</p>`
        : `<p class="muted" style="margin:0">${L("Waiting for the host to begin.", "等待主持人開始遊戲。")}</p>`}
      ${note ? `<p style="margin:0;color:var(--crimson)">${esc(note)}</p>` : ""}
    </section>
    <section class="panel">
      <h2>${L("At the table", "牌桌上的玩家")} (${(net.players || []).length}/${net.capacity || 4})</h2>
      <div class="plist">${list || `<span class="muted">${L("Connecting…", "連線中…")}</span>`}</div>
      <div class="muted">${L("Soul", "亡魂")}: <b style="color:var(--bone)">${esc(soulInfo(soul)?.name || "—")}</b> · ${L("Lantern", "燈籠")} ${lan ? esc(lanternName(lan)) : "—"}</div>
      ${host ? `<div class="field"><span>${L("Players", "人數")}</span><div class="lanterns">${[2, 3, 4].map(n => `<button type="button" data-cap="${n}" class="${net.capacity === n ? "on" : ""}" ${n < net.players.length ? "disabled" : ""}>${L(`${n} players`, `${n}人`)}</button>`).join("")}</div></div>
        <div class="row"><button type="button" class="primary" id="start" ${net.players.length < net.capacity ? "disabled" : ""}>${L("Begin the crossing", "開始渡河")}</button>
        <span class="muted">${net.players.length < net.capacity ? L(`Waiting for ${net.capacity - net.players.length} more ${net.capacity - net.players.length === 1 ? "player" : "players"}.`, `還在等待${net.capacity - net.players.length}名玩家。`) : L("Everyone is here.", "所有人都到齊了。")}</span></div>
        <p class="muted" style="margin:0;font-size:.88rem">${L("To change the soul or Lantern, go back to the menu, choose them, then host again.", "若要更換亡魂或燈籠，請回到主選單重新選擇，再開一次桌。")}</p>` : ""}
    </section>
  </div>`;
  if (host) {
    $("start").onclick = startOnline;
    document.querySelectorAll("[data-cap]").forEach(b => b.onclick = () => {
      net.capacity = +b.dataset.cap;
      setup.tableSize = net.capacity;
      store("nb-setup", setup);
      sendLobby();
      lobby();
    });
  }
}

function startOnline() {
  net.started = true;
  const names = net.players.map(p => p.name);
  const s = E.newGame(E.makeConfig({ players: names.length, soul: setup.soul, lantern: setup.lantern }), undefined, names);
  s.gid = Math.random().toString(36).slice(2, 10);
  seats = hostSeats();
  sendLobby();
  net.api.broadcast({ t: "state", s });
  beginGame(s, true);
}

function onRemoteState() {
  saveGame();
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
  saveGame();
  refresh();
}

// ---------------------------------------------------------------- the play log
// Each browser reports the game it is playing: when it starts, a sign of life every five minutes, and how it ended.
// The site owner reads this on the Play log page (/admin). Nothing here affects the game if the log is off.
let beatTimer = 0, trackedEnd = "";
function track(ev, extra = {}) {
  if (!S || !S.gid) return;
  const body = JSON.stringify({
    sid: `${S.gid}-${mySeat}`, ev, mode, players: S.n, soul: S.cfg.soul, lantern: S.cfg.lantern,
    names: S.names, table: mode === "online" ? net?.code : "", turn: S.turn, ...extra,
  });
  try {
    if (ev === "beat" && document.visibilityState === "hidden" && navigator.sendBeacon) navigator.sendBeacon("/api/track", body);
    else fetch("/api/track", { method: "POST", body, keepalive: body.length < 60000, headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch { /* the log never stops play */ }
}
function trackGame(starting) {
  clearInterval(beatTimer);
  if (!S) return;
  track(starting ? "start" : "beat");
  beatTimer = setInterval(() => { if (S && !S.result && document.visibilityState === "visible") track("beat"); }, 5 * 60e3);
}
function trackEnd() {
  if (!S || !S.result || trackedEnd === S.gid) return;
  trackedEnd = S.gid;
  clearInterval(beatTimer);
  recordChron();
  track("end", { result: S.result, cause: S.cause || "", detail: endRecord() });
}

// The record of a game for the play log (the admin's Dashboard): the whole Chronicle, a line per turn of how the table
// stood when it ended, and the table itself at the end (the river, the Loom, the Soul board, the Book and every hand).
// The engine keeps only the last 80 Chronicle lines, so the browser gathers them as they come.
let chron = { gid: null, seen: 0, lines: [], turns: [] };
function recordChron() {
  if (!S) return;
  if (chron.gid !== S.gid) chron = { gid: S.gid, seen: 0, lines: [], turns: [] };
  for (const l of S.log) if (l.id > chron.seen) { chron.lines.push([l.turn, l.kind, l.msg]); chron.seen = l.id; }
  if (chron.lines.length > 400) chron.lines.splice(0, chron.lines.length - 400);
  const now = { t: S.turn, p: S.cur, soul: S.soul, f: S.forgotten.length, fr: S.fract, li: S.light, bw: S.bw, k: [...S.karma] };
  if (chron.turns.at(-1)?.t === S.turn) chron.turns[chron.turns.length - 1] = now;
  else {
    chron.turns.push(now);
    // a new round: keep the record so far, so the Chronicle can be read back even if the game is never finished
    if (S.turn > 1 && !S.result) track("beat", { detail: endRecord("playing") });
  }
}
function endRecord(state) {
  const TOK = { [E.ROOT]: "root", [E.BLOOM]: "bloom" };
  const TILE = { [STONY]: "stony", [MEMORY]: "memory", [GRAVE]: "grave", [FERTILE]: "fertile" };
  const cn = cid => CARDS[cid]?.name || String(cid);
  return {
    turn: S.turn, reach: S.reach, soul: S.soul, result: S.result || state || "left", cause: S.cause || "", names: S.names, cur: S.cur,
    slots: Array.from({ length: E.NSLOT }, (_, k) => ({ t: TILE[S.tile[k]], r: !!S.revealed[k], tok: TOK[S.tok[k]] || "", g: !!S.griev[k] })),
    flooded: S.flooded.map(Boolean), fract: S.fract, light: S.light, bw: S.bw, bwSupply: S.cfg.bwSupply, karma: S.karma, cap: S.cfg.karmaCap, echo: S.echo,
    forgotten: S.forgotten.map(cn), limit: S.cfg.forgottenLimit, ash: S.cfg.ashAt, adrift: S.cfg.adriftAt,
    book: S.book.map(pg => Object.fromEntries(Object.entries(pg).map(([slot, cid]) => [slot, CARDS[cid]?.band || cn(cid)]))), blessed: S.blessed,
    mantles: Object.fromEntries(Object.entries(S.mantles).map(([m, p]) => [m, p >= 0 ? S.names[p] : p === -2 ? "laid down" : ""])),
    hands: S.hands.map(h => h.map(cn)), deck: S.deck.length, discard: S.discard.length, stats: S.stats, lastMist: S.lastMist || "",
    lines: chron.lines, turns: chron.turns, trail: (S.trail || []).slice(-300),
  };
}
addEventListener("pagehide", () => { if (S && !S.result) track("beat"); });

// ---------------------------------------------------------------- the saved game
// The game in progress is kept in this browser, so a refresh, a Back press or a closed tab never loses it.
// It is cleared only when the crossing ends or a player leaves it from the menu.
const SAVE = "nb-save:";   // one slot per tab, so two tabs in the same browser never overwrite each other
const SAVE_HOURS = 48;
function saveGame() {
  if (!mode || (S && S.result)) { dropSave(); return; }
  const online = mode === "online" && net ? {
    role: net.role, code: net.code, capacity: net.capacity, started: net.started, cid: N.clientId(), name: setup.name, watch: !!net.watch,
    players: net.role === "host" ? net.players.map(p => ({ name: p.name, cid: p.cid })) : undefined,
  } : null;
  if (!S && !online) return;
  const tab = N.clientId();
  try { localStorage.setItem(SAVE + tab, JSON.stringify({ v: 1, at: Date.now(), tab, mode, s: S, seats: [...seats], mySeat, online, chron })); } catch { /* storage full or blocked */ }
}
function dropSave(d) { try { localStorage.removeItem(SAVE + (d?.tab || N.clientId())); } catch { /* storage blocked */ } }
// This tab's own saved game if it has one, otherwise the most recent game saved in this browser.
function readSave() {
  const all = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(SAVE)) continue;
      let d = null;
      try { d = JSON.parse(localStorage.getItem(k)); } catch { /* damaged */ }
      if (!d || d.v !== 1 || Date.now() - d.at > SAVE_HOURS * 3600e3 || (d.s && d.s.result)) { localStorage.removeItem(k); i--; continue; }
      all.push(d);
    }
  } catch { return null; }
  let own = null;
  try { own = all.find(d => d.tab === sessionStorage.getItem("nb-client")); } catch { /* storage blocked */ }
  return own || all.sort((a, b) => b.at - a.at)[0] || null;
}
// A refreshed tab picks its own game straight back up; another tab only offers it from the menu,
// so two tabs never play the same seat.
const ownsSave = d => { try { return !!d && sessionStorage.getItem("nb-client") === d.tab; } catch { return false; } };
function saveSummary(d) {
  const kind = { solo: L("Solo", "單人"), local: L("Same screen", "同一螢幕"), online: L(`Online table ${d.online?.code || ""}`, `線上牌桌 ${d.online?.code || ""}`) }[d.mode];
  const turn = d.s ? L(` · turn ${d.s.turn}`, ` · 第${d.s.turn}回合`) : L(" · in the lobby", " · 等待開始");
  const soul = d.s ? ` · ${soulInfo(d.s.cfg.soul)?.name || ""}` : "";
  return kind + soul + turn;
}
// Bring a saved game back exactly where it was.
function resumeGame(d) {
  N.setClientId(d.tab);
  if (d.chron?.gid === d.s?.gid) chron = d.chron;
  mode = d.mode;
  mySeat = d.mySeat ?? 0;
  if (d.mode !== "online") {
    seats = new Set(d.seats);
    beginGame(d.s);
    toast(L("Your crossing was saved. It carries on where you left it.", "已保存的渡河從你離開的地方繼續。"));
    return;
  }
  const o = d.online;
  if (o.role === "host") {
    // The host opens the same table again; every other player shows as away until their browser reconnects.
    hostTable(o.name || setup.name || "Player", { code: o.code, capacity: o.capacity, players: o.players, started: o.started, s: d.s, watch: o.watch });
  } else {
    joinTable(o.code, o.name || setup.name || "Player", { s: d.s, seat: mySeat, rejoin: true });
  }
}

const controls = seat => seats.has(seat);
// The seat that acts now: the active player, or the helper while a joint Burn waits for their card.
function canAct() {
  if (!S || S.result || !controls(E.actor(S))) return false;
  if (mode === "local" && S.n > 1 && uncovered !== E.actor(S)) return false;
  return true;
}
const canPlayCards = () => canAct() && !busy && !pending && !playingBack() && S.phase === "play" && S.played < S.cfg.cardsPerTurn && S.hands[S.cur].length > 0;

async function tick() {
  if (!S) return;
  if (S.result) { trackEnd(); showEnd(); return; }
  if (!controls(E.actor(S))) return;
  if (mode === "local" && S.n > 1 && uncovered !== E.actor(S)) {
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
  const name = pname(S.names[E.actor(S)]);
  veil(`<div class="dialog pass">
    <svg class="lily" aria-hidden="true"><use href="#nb-bloom"/></svg>
    <h2>${L(`Pass the lantern to ${esc(name)}`, `把燈籠交給${esc(name)}`)}</h2>
    <p class="muted">${S.burn && S.burn.pcid === null ? L(`${esc(pname(S.names[S.cur]))} asks you to Burn with them. Everyone else, look away from the screen.`, `${esc(pname(S.names[S.cur]))}邀請你一起焚燒。其他人請把視線移開螢幕。`)
      : L("Everyone else, look away from the screen. Talk as much as you like, but never name or show your cards.", "其他人請把視線移開螢幕。你們可以盡情討論，但絕不說出或展示自己的牌。")}</p>
    <button type="button" class="primary" id="reveal">${L(`I am ${esc(name)}: show my hand`, `我是${esc(name)}：顯示我的手牌`)}</button></div>`, "pass");
  $("reveal").onclick = () => {
    uncovered = E.actor(S);
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
  vigilOrder: (s, top) => ask({ type: "vigil", top: top.map(m => m[0]), ops: top.map(m => m[1]) }),
  pickThread: (s, tied) => ask({ type: "thread", tied }),
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
    await E.playCard(S, cid, mode_, chooser);
  } catch (e) {
    if (!(e instanceof E.GameOver)) throw e;
    S.phase = "over";
  }
  busy = false;
  await afterAction();
}

// ---------------------------------------------------------------- the joint Burn (2-4 players)
// The active player picks a helper who holds the card's thread; the helper adds a card of that thread from their own hand;
// both are revealed and the active player chooses which card's effect happens twice.
function startBurn(cid) {
  if (!canPlayCards() || !E.canBurn(S, cid)) return;
  closeZoom();
  const partners = E.burnPartners(S, cid);
  const go = q => {
    closeVeil();
    E.askBurn(S, cid, q);
    selected = null;
    if (mode === "local") uncovered = -1;
    commit();
    tick();
  };
  if (partners.length === 1) return go(partners[0]);
  veil(`<div class="dialog"><h2>${L("Burn with whom?", "與誰一起焚燒？")}</h2>
    <p class="muted">${L(`These players hold a card of the <b>${tagName(CARDS[cid].tag)}</b> thread. Talk it over, then choose one.`, `這些玩家握有<b>${tagName(CARDS[cid].tag)}</b>牌。先商量，再選擇一位。`)}</p>
    <div class="row">${partners.map(q => `<button type="button" class="primary" data-q="${q}">${esc(pname(S.names[q]))}</button>`).join("")}
    <button type="button" id="cancel">${L("Cancel", "取消")}</button></div></div>`, "burn");
  $("cancel").onclick = closeVeil;
  $("veil").querySelectorAll("[data-q]").forEach(b => b.onclick = () => go(+b.dataset.q));
}
function joinBurnNow(pcid) {
  if (!canAct() || busy || !E.joinBurn(S, pcid)) return;
  closeZoom();
  if (mode === "local") uncovered = -1;
  commit();
  tick();
}
function burnDialog() {
  const b = S.burn;
  if (!b || b.pcid === null) return;
  const side = (cid, which, who) => `<div class="burnpick">${cardHTML(cid, { cls: "big", resonant: S.played === 0 && S.echo === CARDS[cid].tag })}
    <button type="button" class="primary" data-which="${which}">${L(`Twice: ${esc(cardName(cid))}`, `執行兩次：${esc(cardName(cid))}`)}</button><small class="muted">${esc(who)}</small></div>`;
  veil(`<div class="dialog wide"><h2>${L("Burn together", "共同焚燒")}</h2>
    <p class="muted">${L("Both cards are revealed. Choose the one whose effect happens <b>twice</b>. Both cards are then forgotten, and your helper draws a card.", "兩張牌都已翻開。選擇效果要執行<b>兩次</b>的那一張。之後兩張牌都會被遺忘，協助者抽1張牌。")}</p>
    <div class="burnrow">${side(b.cid, "own", pname(S.names[b.by]))}${side(b.pcid, "partner", pname(S.names[b.partner]))}</div></div>`, "burn");
  $("veil").querySelectorAll("[data-which]").forEach(x => x.onclick = () => resolveBurnNow(x.dataset.which));
}
async function resolveBurnNow(which) {
  if (!canAct() || busy || !S.burn || S.burn.pcid === null) return;
  closeVeil();
  busy = true;
  A.sfx("card");
  try {
    await E.resolveBurn(S, which, chooser);
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

// Vigil: the top Mist cards of this Reach, face up in the order they would come. The player moves them into any order
// and puts them back on top; the order is kept on the pending question, so the dialog can be reopened.
function vigilDialog() {
  if (pending?.type !== "vigil") return;
  const order = pending.order ||= pending.top.map((_, i) => i), n = order.length;
  const when = [L("Next", "下一張"), L("Then", "接著"), L("After that", "再之後")];
  const cards = order.map((j, pos) => {
    const name = pending.top[j], harsh = HARSH_NAMES.has(name);
    return `<div class="vigilopt${harsh ? " harsh" : ""}"><span class="k">${when[pos]}${harsh ? ` · ${L("Harsh", "凶霧")}` : ""}</span>
      ${mistFace(name, pending.ops?.[j], S.reach)}
      <span class="vmove"><button type="button" data-vm="${pos}" data-d="-1" ${pos === 0 ? "disabled" : ""} aria-label="${L("Earlier", "提前")}">◀ ${L("Earlier", "提前")}</button>
      <button type="button" data-vm="${pos}" data-d="1" ${pos === n - 1 ? "disabled" : ""} aria-label="${L("Later", "延後")}">${L("Later", "延後")} ▶</button></span></div>`;
  }).join("");
  veil(`<div class="dialog wide"><h2>${L("Vigil", "守夜")}</h2>
    <p>${L(`The top ${plural(n, "Mist card")} of this Reach, in the order they will come. Move them into any order you like, then put them back on top of the deck.`,
      `本河段迷霧牌庫頂的${n}張牌，依照即將出現的順序排列。把它們排成你想要的任意順序，再放回牌庫頂。`)}</p>
    <div class="vigilgrid">${cards}</div>
    <div class="row"><button type="button" class="primary" id="vigildone">${L("Put them back in this order", "依此順序放回牌庫頂")}</button></div></div>`, "vigil");
  document.querySelectorAll(".vigilopt .nbface").forEach(f => f.onclick = () => peekCard(f.outerHTML));
  document.querySelectorAll("[data-vm]").forEach(b => b.onclick = () => {
    const i = +b.dataset.vm, k = i + +b.dataset.d;
    [order[i], order[k]] = [order[k], order[i]];
    vigilDialog();
  });
  $("vigildone").onclick = () => { closeVeil(); A.sfx("card"); answer([...order]); };
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
    <div class="spybar" id="spybar"></div>
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

// The ripples on the water, as on the printed river board: every space is a ring of hand-drawn ripples around a soft
// halo, its number glowing in the middle, with a small wake trailing back towards the near shore. Drawn from the same
// seeded strokes as the print (print/factory/board.mjs), scaled from its 74 mm pitch to the board's.
const RK = 82.5 / 74, RS = 1.5;     // board units per mm; strokes a little heavier on screen
const rf = x => (+x.toFixed(1)).toString();
function rrng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const runi = (r, a, b) => a + (b - a) * r();
function rringPath(cx, cy, rx, ry, r) {
  const ph1 = runi(r, 0, 6.3), ph2 = runi(r, 0, 6.3), a1 = runi(r, .02, .05), a2 = runi(r, .01, .03), pts = [];
  for (let i = 0; i < 49; i++) {
    const t = i / 48 * 2 * Math.PI, k = 1 + a1 * Math.sin(2 * t + ph1) + a2 * Math.sin(5 * t + ph2);
    pts.push(`${rf(cx + rx * k * Math.cos(t))} ${rf(cy + ry * k * Math.sin(t))}`);
  }
  return "M" + pts.join(" L") + " Z";
}
function rsketch(d, col, { w = 1, op = .5, seed = 1 } = {}) {
  const r = rrng(seed * 31 + 7);
  let o = "";
  for (let k = 0; k < 2; k++) o += `<path d="${d}" transform="translate(${rf(runi(r, -.8, .8) * RK)} ${rf(runi(r, -.8, .8) * RK)})" fill="none" stroke="${col}" stroke-width="${rf(w * (k ? .6 : 1) * RS)}" opacity="${(op * (k ? .55 : 1)).toFixed(2)}" stroke-linecap="round"/>`;
  return o;
}
function riverRipple(x, y, num, seed) {
  const r = rrng(seed * 7 + 3), u = v => v * RK;
  let o = `<ellipse cx="${rf(x)}" cy="${rf(y)}" rx="${rf(u(25))}" ry="${rf(u(18))}" fill="url(#rpHalo)"/>`;
  for (const side of [-1, 1]) {
    o += rsketch(`M${rf(x - u(19))} ${rf(y + side * u(9))} C${rf(x - u(26))} ${rf(y + side * u(11))} ${rf(x - u(34))} ${rf(y + side * u(14))} ${rf(x - u(46))} ${rf(y + side * u(16))}`, "#E6D3A3", { w: .3, op: .26, seed: seed + side + 50 });
    for (let j = 0; j < 3; j++) {
      const cx = x - u(24 + j * 8), cy = y + side * u(11.5 + j * 1.6);
      o += `<path d="M${rf(cx - u(2.6))} ${rf(cy - side * u(1.6))} Q${rf(cx)} ${rf(cy + side * u(.6))} ${rf(cx + u(2.6))} ${rf(cy - side * u(1.6))}" fill="none" stroke="#8FD6E1" stroke-width="${rf(.2 * RS * RK)}" opacity="${(.3 - j * .08).toFixed(2)}"/>`;
    }
  }
  for (let k = 0; k < 5; k++) {
    const rr = u(8.2 + k * 4), op = .58 - k * .1;
    const dash = [0, 1, 2].map(() => `${(runi(r, 6, 16) * (1 + k * .4) * RK).toFixed(1)} ${(runi(r, .4, 1.4) * (1 + k * 1.1) * RK).toFixed(1)}`).join(" ");
    const d = rringPath(x - u(k * 1.3), y, rr, rr * .74, r);
    o += `<path d="${d}" fill="none" stroke="#E6D3A3" stroke-width="${rf((.5 - k * .07) * RS * RK)}" stroke-dasharray="${dash}" stroke-dashoffset="${(runi(r, 0, 20) * RK).toFixed(1)}" opacity="${op.toFixed(2)}" stroke-linecap="round"/>`;
    if (k < 3) o += `<path d="${d}" transform="translate(.6 .6)" fill="none" stroke="#8FD6E1" stroke-width="${rf(.22 * RS * RK)}" stroke-dasharray="${dash}" opacity="${(op * .4).toFixed(2)}"/>`;
  }
  return o + `<text class="rpnum" x="${rf(x)}" y="${rf(y + 5.5)}" text-anchor="middle">${num}</text>`;
}

// A revealed bank card's symbol: full size in the middle while the bank is empty, tucked small into the
// bottom-right corner once a Root, Bloom or Shade sits on it.
function tileMark(t, cx, cy, covered) {
  const icon = { [STONY]: "nb-stony", [MEMORY]: "nb-memorysite", [GRAVE]: "nb-grave", [FERTILE]: "nb-fertile" }[t];
  const col = { [STONY]: "#cfc8bd", [MEMORY]: "#E6D3A3", [GRAVE]: "#8FD6E1", [FERTILE]: "#b9ae9c" }[t];
  if (covered) return `<use href="#${icon}" x="${cx + 10}" y="${cy + 19}" width="14" height="14" style="color:${col}" opacity=".9"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="19" fill="rgba(14,12,17,.62)" stroke="${col}" stroke-opacity=".45"/>
    <use href="#${icon}" x="${cx - 14}" y="${cy - 14}" width="28" height="28" style="color:${col}"/>`;
}

// The soul on the river: its painted portrait in a small round cameo, centred on the face.
// [x, y] of the face and how much of the painting's height the cameo shows, read off each painting.
const CAMEO = { child: [.40, .25, .30], garland: [.36, .21, .30], king: [.44, .26, .34], bride: [.55, .18, .28], open: [.50, .17, .30] };
function soulCameo(soul) {
  const [fx, fy, span] = CAMEO[soul] || CAMEO.open;
  const hs = 50 / span, ws = hs * 673 / 900;
  return `<circle r="29" fill="#0e0c11" stroke="#8a6d48" stroke-width="1.5"/>
    <image href="${artSrc(soulPortrait(soul))}" x="${(-fx * ws).toFixed(1)}" y="${(-fy * hs).toFixed(1)}" width="${ws.toFixed(1)}" height="${hs.toFixed(1)}" clip-path="url(#soulClip)" preserveAspectRatio="none"/>
    <circle r="25.5" fill="none" stroke="#E6D3A3" stroke-width="1.6" opacity=".85"/><circle r="28.5" fill="none" stroke="#8FD6E1" stroke-width=".8" opacity=".5"/>`;
}

function drawBoardStatic() {
  const d = riverPath();
  const reachLbl = [[reachName(0), 1, 4], [reachName(1), 5, 8], [reachName(2), 9, 11]].map(([n, a, b], i) =>
    `<text x="${(X(a) + X(b)) / 2}" y="22" text-anchor="middle">${L(`REACH ${ROMAN[i]} · ${n.toUpperCase()}`, `第${ZHNUM[i]}河段 · ${n}`)}</text>`).join("");
  const nums = `<text x="${X(0)}" y="392" text-anchor="middle">${L("near shore", "此岸")}</text>`;
  $("board").innerHTML = `
  <defs>
    <radialGradient id="litGrad"><stop offset="0" stop-color="#D7263D" stop-opacity=".55"/><stop offset=".6" stop-color="#D7263D" stop-opacity=".12"/><stop offset="1" stop-color="#D7263D" stop-opacity="0"/></radialGradient>
    <radialGradient id="soulGrad"><stop offset="0" stop-color="#EFE7D6" stop-opacity=".55"/><stop offset="1" stop-color="#8FD6E1" stop-opacity="0"/></radialGradient>
    <radialGradient id="shoreGrad"><stop offset="0" stop-color="#E6D3A3" stop-opacity=".7"/><stop offset="1" stop-color="#E6D3A3" stop-opacity="0"/></radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="2.5"/></filter>
    <filter id="bankEdge" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
    <radialGradient id="vigGrad" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
    <linearGradient id="waterEdge" gradientUnits="userSpaceOnUse" x1="0" y1="130" x2="0" y2="270"><stop offset="0" stop-color="#2d5a62" stop-opacity=".45"/><stop offset=".5" stop-color="#16343b" stop-opacity="0"/><stop offset="1" stop-color="#2d5a62" stop-opacity=".45"/></linearGradient>
    <mask id="riverMask" maskUnits="userSpaceOnUse" x="0" y="0" width="1120" height="400"><path d="${d}" fill="none" stroke="#fff" stroke-width="74" stroke-linecap="round" filter="url(#bankEdge)"/></mask>
    <clipPath id="soulClip"><circle r="25"/></clipPath>
    <radialGradient id="rpHalo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F3E6C0" stop-opacity=".34"/><stop offset=".35" stop-color="#E6D3A3" stop-opacity=".16"/><stop offset=".7" stop-color="#8FD6E1" stop-opacity=".07"/><stop offset="1" stop-color="#8FD6E1" stop-opacity="0"/></radialGradient>
    <filter id="rpGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.8" result="b"/><feFlood flood-color="#F3E6C0" flood-opacity=".55"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1120" height="400" fill="#121117"/>
  <image href="${artSrc("tex-bank")}" x="-20" y="-10" width="1160" height="420" preserveAspectRatio="xMidYMid slice" opacity=".9"/>
  <rect width="1120" height="400" fill="#0f0d11" opacity=".38"/>
  <rect width="1120" height="400" fill="url(#vigGrad)"/>
  <circle class="shore" cx="${X(12) + 20}" cy="${Y(12)}" r="120" fill="url(#shoreGrad)"/>
  <path d="${d}" fill="none" stroke="#050407" stroke-width="96" stroke-linecap="round" opacity=".75" filter="url(#bankEdge)"/>
  <g mask="url(#riverMask)"><rect width="1120" height="400" fill="#071319"/>
    <image href="${artSrc("tex-water")}" x="0" y="80" width="1120" height="240" preserveAspectRatio="xMidYMid slice" opacity=".95"/>
    <rect width="1120" height="400" fill="url(#waterEdge)"/></g>
  <path class="flow" d="${d}" fill="none" stroke="#8FD6E1" stroke-opacity=".35" stroke-width="1.6" transform="translate(0,-18)"/>
  <path class="flow b" d="${d}" fill="none" stroke="#8FD6E1" stroke-opacity=".25" stroke-width="1.2" transform="translate(0,14)"/>
  <path class="flow" d="${d}" fill="none" stroke="#E6D3A3" stroke-opacity=".15" stroke-width="1" style="animation-duration:7s"/>
  <g class="ripples">${Array.from({ length: 12 }, (_, i) => riverRipple(X(i + 1), Y(i + 1), i + 1, i + 1)).join("")}</g>
  <g stroke="#4A4642" stroke-dasharray="4 6">
    <path d="M${(X(4) + X(5)) / 2} 34 V372"/><path d="M${(X(8) + X(9)) / 2} 34 V372"/>
  </g>
  <g font-family="IBM Plex Mono, monospace" font-size="11" fill="#9A948C" letter-spacing="1.4">${reachLbl}</g>
  <g font-family="IBM Plex Mono, monospace" font-size="11" fill="#9A948C">${nums}</g>
  <g font-family="IBM Plex Mono, monospace" font-size="10" fill="#9A948C" letter-spacing="1.2" text-anchor="middle" opacity=".8">
    <text x="${X(0)}" y="${Y(0) - 80}">${L("LEFT BANK", "左岸")}</text><text x="${X(0)}" y="${Y(0) + 88}">${L("RIGHT BANK", "右岸")}</text></g>
  <g transform="translate(${X(12)}, ${Y(12)})">
    <use href="#nb-light" x="-14" y="-58" width="28" height="30" style="color:#E6D3A3"/>
    <text y="-64" text-anchor="middle" font-family="IM Fell English SC, Noto Serif TC, serif" font-size="16" fill="#E6D3A3">${L("Far Shore", "彼岸")}</text>
  </g>
  <g id="dyn"></g>
  <g id="soulG"><g class="bob">
    <circle class="soulglow" r="34" fill="url(#soulGrad)"/>
    <g id="soulFig" data-soul="${S?.cfg.soul || ""}">${soulCameo(S?.cfg.soul || "open")}</g>
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
    if (E.lit(s, sp) && sp >= s.soul && !(stage && !stage.blooms)) h += `<ellipse class="bloomglow" cx="${X(sp)}" cy="${Y(sp)}" rx="44" ry="30" fill="url(#litGrad)"/>`;
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
    // The bank card in its well: the fog side until the bank is revealed, then its plain face with the ground's symbol.
    const dealt = !stage || stage.banks.has(k) || (k < 4 && stage.blooms);
    const base = !dealt ? ""
      : !s.revealed[k]
      ? `<g class="fogpuff${stage?.fresh.has(k) ? " dealin" : ""}"><image href="${artSrc("card-fog")}" x="${cx - 27}" y="${cy - 36}" width="54" height="72" preserveAspectRatio="xMidYMid slice"/></g>`
      : `<g class="${p.revealed[k] ? "" : "revealin"}"><rect x="${cx - 27}" y="${cy - 36}" width="54" height="72" rx="4" fill="#17141b" stroke="#8a6d48" stroke-opacity=".6"/>
          ${tileMark(s.tile[k], cx, cy, !!s.griev[k] || s.tok[k] !== E.NONE)}</g>`;
    let inner = "";
    if (s.griev[k]) {
      inner = `<g class="${p.griev[k] ? "" : "grievin"}"><circle cx="${cx}" cy="${cy}" r="22" fill="rgba(5,12,16,.72)" stroke="#8FD6E1" stroke-opacity=".5"/><g class="griev"><use href="#nb-grievance" x="${cx - 21}" y="${cy - 21}" width="42" height="42" style="color:#8FD6E1"/></g></g>`;
    } else if (s.tok[k] === E.BLOOM && !(stage && !stage.blooms)) {
      const fresh = stage ? stage.fresh.has(k) : p.tok[k] !== E.BLOOM;
      inner = `<g class="${fresh ? "bloomin" : ""}"><circle cx="${cx}" cy="${cy}" r="23" fill="rgba(20,6,10,.72)" stroke="#E6D3A3" stroke-width="1.2"/>
        <use href="#nb-bloom" x="${cx - 21}" y="${cy - 21}" width="42" height="42" style="color:#D7263D"/></g>`;
    } else if (s.tok[k] === E.ROOT) {
      const cls = p.tok[k] === E.BLOOM ? "wither" : p.tok[k] === E.NONE ? "pop" : "";
      inner = `<g class="${cls}"><circle cx="${cx}" cy="${cy}" r="21" fill="rgba(14,12,17,.74)" stroke="#E6D3A3" stroke-opacity=".6"/><use href="#nb-root" x="${cx - 18}" y="${cy - 18}" width="36" height="36" style="color:#E6D3A3"/></g>`;
    }
    const tgt = targets.has(k);
    h += `<g class="slot${tgt ? " target" : ""}" data-k="${k}" opacity="${behind ? 0.35 : 1}"><title>${esc(slotTitle(k))}</title>
      <rect class="frame" x="${cx - 29}" y="${cy - 38}" width="58" height="76" rx="6"/>${base}${inner}<rect class="gilt" x="${cx - 27}" y="${cy - 36}" width="54" height="72" rx="4"/></g>`;
  }
  const sp = Math.min(s.soul, 12);
  const fig = $("soulFig");
  if (fig && fig.dataset.soul !== s.cfg.soul) { fig.dataset.soul = s.cfg.soul; fig.innerHTML = soulCameo(s.cfg.soul); }
  $("soulG").style.transform = `translate(${X(sp)}px, ${Y(sp)}px)`;
  $("soulG").style.opacity = stage && !stage.soul ? "0" : "";
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
  if (s.griev[k]) return where + sep + L("Shade", "怨念");
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
      const undone = !on && view && prev && k < (prev.karma?.[t] ?? 0);     // a Backlash unties the thread
      knots += `<span class="kn ${on ? "on" : ""} ${on && S.karma[t] >= cap - 1 ? "hot" : ""} ${isNew ? "new" : ""} ${undone ? "undone" : ""}">${on || undone ? svgUse("nb-knot") : ""}</span>`;
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
    <div class="track wide" id="sb-track" style="grid-template-columns:repeat(${c.forgottenLimit},minmax(0,1fr))">${cells}</div>
    <div><div class="lbl">${L("Fractures", "裂痕")}</div><div class="icons" id="sb-fract">${fr}</div></div>
    <div><div class="lbl">${L("Light", "光")}</div><div class="icons" id="sb-light">${svgUse("nb-light", "", "color:#E6D3A3")}<span style="font-family:var(--display);font-size:1.25rem;color:var(--bone)">${stage && !stage.light ? 0 : S.light}</span></div></div>
    <div class="wide"><div class="lbl">${L("Black Water supply", "黑水供應")}</div><div class="icons" id="sb-bw">${bw}</div></div>
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
    ${mode === "online" ? `<span class="net"><span class="dot"></span>${esc(net?.code || "")} · ${mySeat < 0 ? L("watching", "旁觀中") : `${L("you are", "你是")} ${esc(pname(S.names[mySeat]))}`}</span>` : ""}`;
}

// ---------------------------------------------------------------- prompt and hand
function setPrompt(html, mine = false) {
  const el = $("prompt");
  el.innerHTML = html;
  el.classList.toggle("mine", mine);
}

function drawPrompt() {
  if (S.result) { setPrompt(`<span class="msg">${S.result === "win" ? L("<b>The soul has crossed.</b>", "<b>亡魂已經渡河。</b>") : L(`<b>Lost: ${esc(S.cause)}.</b>`, `<b>失敗：${esc(causeName(S.cause))}。</b>`)}</span><button type="button" id="seeend">${L("See the ending", "查看結局")}</button>`); $("seeend").onclick = () => { endShown = false; showEnd(); }; return; }
  const who = esc(pname(S.names[E.actor(S)]));
  if (!canAct()) {
    const why = S.burn && S.burn.pcid === null ? L(`<b>${esc(pname(S.names[S.cur]))}</b> asks <b>${who}</b> to Burn with them: waiting for a card of the <b>${tagName(S.burn.tag)}</b> thread.`, `<b>${esc(pname(S.names[S.cur]))}</b>邀請<b>${who}</b>一起焚燒：等待一張<b>${tagName(S.burn.tag)}</b>牌。`)
      : mode === "local" ? L(`Waiting for <b>${who}</b> to take the lantern.`, `等待<b>${who}</b>接過燈籠。`)
      : mode === "online" && mySeat < 0 ? (spy.on ? L(`Watching: <b>${who}</b> is playing. Hands are shown on your screen only.`, `旁觀中：<b>${who}</b>正在行動。手牌只顯示在你的螢幕上。`)
        : L(`Watching: <b>${who}</b> is playing. Hands are hidden.`, `旁觀中：<b>${who}</b>正在行動。手牌已隱藏。`))
      : L(`<b>${who}</b> is playing. ${mode === "online" ? "Study your hand while you wait." : ""}`, `<b>${who}</b>正在行動。${mode === "online" ? "等待時可以先研究你的手牌。" : ""}`);
    setPrompt(`<span class="msg">${why}</span>`);
    return;
  }
  if (S.phase === "burn" && S.burn && !pending && !busy) {
    if (S.burn.pcid === null) {
      setPrompt(`<span class="msg">${L(`<b>${esc(pname(S.names[S.cur]))}</b> asks you to <b>Burn</b> with them. Open your hand and choose a card of the <b class="${TAGCLS[S.burn.tag]}">${tagName(S.burn.tag)}</b> thread to add.`,
        `<b>${esc(pname(S.names[S.cur]))}</b>邀請你一起<b>焚燒</b>。打開手牌，選一張<b class="${TAGCLS[S.burn.tag]}">${tagName(S.burn.tag)}</b>牌加入。`)}</span>`, true);
      if (!dockOpen) setDock(true);
    } else {
      setPrompt(`<span class="msg">${L("Both cards are revealed: choose which one Burns twice.", "兩張牌都已翻開：選擇哪一張執行兩次。")}</span>
        <button type="button" class="primary" id="burnopen">${L("Choose", "選擇")}</button>`, true);
      $("burnopen").onclick = burnDialog;
      if (!$("veil")) burnDialog();
    }
    return;
  }
  if (pending) {
    const skip = `<button type="button" id="skip">${L("Skip", "跳過")}</button>`;
    if (pending.type === "thread") {
      setPrompt(`<span class="msg">${L("The fullest threads are tied: choose which one.", "最滿的絲線平手：選擇其中一條。")}</span>
        ${pending.tied.map(t => `<button type="button" class="primary" data-thread="${t}">${tagName(t)}</button>`).join("")}`, true);
      document.querySelectorAll("[data-thread]").forEach(b => b.onclick = () => answer(+b.dataset.thread));
      return;
    }
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
    } else if (pending.type === "vigil") {
      setPrompt(`<span class="msg">${L("<b>Vigil</b>: put the coming Mist cards back in any order.", "<b>守夜</b>：把即將到來的迷霧牌以任意順序放回。")}</span>
        <button type="button" class="primary" id="vigilopen">${L("Read the Mist", "查看迷霧")}</button>`, true);
      $("vigilopen").onclick = vigilDialog;
      if (!$("veil")) vigilDialog();
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
  setPrompt(`<span class="msg">${L(`${S.n > 1 ? `<b>${who}</b>, ` : ""}${n === 1 ? (S.n > 1 ? "your <b>Answer</b>" : "Your <b>Answer</b>") : (S.n > 1 ? "now <b>Steer</b>" : "Now <b>Steer</b>")}: play a card${rec ? ", Recall" : ""}${push ? " or Push Through" : ""}.`, `${S.n > 1 ? `<b>${who}</b>，` : ""}${n === 1 ? "你的<b>回應</b>" : "接著<b>掌舵</b>"}：打出一張牌${rec ? "、喚回記憶" : ""}${push ? "或奮力駛過" : ""}。`)}${echo}</span>${push}${rec}${sum}`, true);
  if (sum) $("summon").onclick = summonDialog;
  if (rec) $("recall").onclick = recallDialog;
  if (push) $("push").onclick = pushNow;
}

function viewSeat() {
  if (mode === "local") return S.n === 1 || uncovered === E.actor(S) ? E.actor(S) : -1;
  if (controls(E.actor(S))) return E.actor(S);
  if (watching() && spy.on) return spySeat();
  return mySeat;
}
// The host watching an online table (no seat of its own), and the hand it has chosen to look at.
const watching = () => mode === "online" && mySeat < 0;
const spySeat = () => (spy.seat !== null && spy.seat < S.n ? spy.seat : S.cur);

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
  vigil: ["<b>Vigil</b>: look at the top 3 cards of this Reach's Mist deck and put them back on top in any order you choose.", "<b>守夜</b>：查看本河段迷霧牌庫頂的3張牌，再依你選擇的任意順序放回牌庫頂。"],
  banish: ["<b>Banish</b>: remove the Shade that threatens the soul most.", "<b>驅散</b>：移除對亡魂威脅最大的怨念。"],
  drain: ["<b>Drain</b>: remove the Black Water nearest the soul and return it to the supply.", "<b>排水</b>：移除離亡魂最近的黑水，放回供應區。"],
  banish_or_drain: ["<b>Banish or Drain</b>: clear whichever is more urgent, a Shade or Black Water.", "<b>驅散或排水</b>：清除較緊迫的一個，怨念或黑水。"],
  wash: ["<b>Wash</b>: the Shades on the soul's own space are washed away.", "<b>洗淨</b>：洗去亡魂所在格上的怨念。"],
  lowtide: ["<b>Low Tide</b>: all Black Water in this Reach drains away.", "<b>退潮</b>：本河段所有黑水退去。"],
  light: ["<b>Light</b>: spend 3 to Recall a forgotten card as your Answer, or (with a card of its thread) to summon a Mantle.", "<b>光</b>：以回應花3點光喚回一張被遺忘的牌，或搭配同絲線的牌召喚稱號。"],
  reveal_reach: ["<b>Reveal</b>: every fogged bank in this Reach is turned up. Graves found this way turn Fertile.", "<b>揭示</b>：翻開本河段所有被霧覆蓋的河岸。以此翻出的墳墓會變成沃土。"],
  extra_karma: ["<b>Extra knot</b>: one more knot is tied on the Obsession thread.", "<b>額外的結</b>：執念絲線再打上一個結。"],
};
const THREAD_NOTE = [
  ["Played face up, it ties a knot on the <b>Obsession</b> thread. When the thread fills: <i>Grasping</i>, a Shade claws at the soul.", "正面打出時在<b>執念</b>絲線上打結。絲線滿時：<i>攫取</i>，一個怨念撲向亡魂。"],
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
  return `<div class="card face t${c.tag}${c.key ? " keymem" : ""} ${opts.playable ? "playable" : ""} ${opts.sel ? "sel" : ""} ${opts.resonant ? "resonant" : ""} ${opts.dealt ? "dealt" : ""} ${opts.cls || ""}" data-cid="${cid}" ${opts.style ? `style="${opts.style}"` : ""} ${opts.focus ? 'role="button" tabindex="0"' : ""} aria-label="${esc(cardName(cid))}">
    ${memoryFace(cid)}</div>`;
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
  if (mode === "online") return p === mySeat || (mySeat < 0 && (controls(p) || (spy.on && p === spySeat())));
  if (S.n === 1) return true;
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
  drawSpybar();
  const seat = viewSeat();
  const tog = $("docktoggle");
  if (S.result) { el.innerHTML = ""; prevHand = []; if (tog) tog.innerHTML = dockLabel(L("Hand", "手牌"), 0); return; }
  const hands = stage ? S.hands.map((h, i) => h.slice(0, stage.dealt[i])) : S.hands;
  if (seat < 0) {
    const n = hands[S.cur].length;
    el.innerHTML = Array.from({ length: n }, (_, i) => `<div class="card back" style="${fanPose(i, n)}">${cardBack()}</div>`).join("");
    if (tog) tog.innerHTML = dockLabel(L(`${pname(S.names[S.cur])}'s hand · hidden`, `${pname(S.names[S.cur])}的手牌 · 蓋著`), n);
    prevHand = [];
    return;
  }
  const hand = hands[seat];
  const playable = seat === S.cur && canPlayCards();
  const joining = S.burn && S.burn.pcid === null && seat === S.burn.partner && canAct() && !busy;
  const n = hand.length;
  el.innerHTML = hand.map((cid, i) => cardHTML(cid, {
    playable: playable || (joining && CARDS[cid].tag === S.burn.tag), focus: true, sel: selected === cid, dealt: !prevHand.includes(cid) && !arriving.has(cid),
    resonant: playable && S.played === 0 && S.echo === CARDS[cid].tag,
    cls: `${arriving.has(cid) ? "await" : ""} ${watching() && looks[seat] === cid ? "peeked" : ""}`, style: fanPose(i, n),
  })).join("");
  prevHand = hand.filter(cid => !arriving.has(cid));
  if (tog) tog.innerHTML = dockLabel(seat !== S.cur || S.n > 1 ? L(`${pname(S.names[seat])}'s hand`, `${pname(S.names[seat])}的手牌`) : L("Your hand", "你的手牌"), n);
  $("dock")?.classList.toggle("yourturn", playable || joining);
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
// The watching host's controls over the hand panel: show or hide the hands, pick whose hand to look at (or follow the
// turn), and see which card each player is holding up close. With the hands hidden it only says that someone is reading.
function drawSpybar() {
  const el = $("spybar");
  if (!el) return;
  if (!watching() || !S || S.result) { el.innerHTML = ""; return; }
  const cur = spySeat();
  const seatsBtns = spy.on ? `<button type="button" data-spy="follow" class="${spy.seat === null ? "on" : ""}">${L("Follow the turn", "跟隨回合")}</button>`
    + S.names.map((n, i) => `<button type="button" data-spy="${i}" class="${spy.seat === i ? "on" : ""}${i === S.cur ? " turn" : ""}">${esc(pname(n))}<small>${S.hands[i].length}</small></button>`).join("") : "";
  const reading = Object.entries(looks).filter(([p, cid]) => cid !== null && S.hands[+p]?.includes(cid)).map(([p, cid]) =>
    `<span class="peek">${svgUse("nb-seal")}${spy.on ? L(`${esc(pname(S.names[p]))} is reading <b>${esc(cardName(cid))}</b>`, `${esc(pname(S.names[p]))}正在看<b>${esc(cardName(cid))}</b>`) : L(`${esc(pname(S.names[p]))} is reading a card`, `${esc(pname(S.names[p]))}正在看一張牌`)}</span>`).join("");
  el.innerHTML = `<button type="button" data-spy="toggle" class="spytoggle ${spy.on ? "on" : ""}" aria-pressed="${spy.on}">${spy.on ? L("Hide hands", "隱藏手牌") : L("Show hands", "顯示手牌")}</button>${seatsBtns}${reading}`;
  el.dataset.seat = cur;
  el.querySelectorAll("[data-spy]").forEach(b => b.onclick = () => {
    const v = b.dataset.spy;
    if (v === "toggle") spy.on = !spy.on;
    else spy.seat = v === "follow" ? null : +v;
    closeZoom();
    prevHand = S.hands[viewSeat()] || [];     // switching hands is not a deal: no dealing animation
    drawHand(); drawDockInfo(); drawPrompt();
  });
}
const dockLabel = (who, n) => `<span class="chev">${dockOpen ? "▾" : "▴"}</span><span>${esc(who)}</span><b>${n}</b>`;

// A card held up close: its full text, and (on your turn) the ways to play it.
// With look set, the card is only looked at (a forgotten memory): no ways to play it.
function openZoom(cid, look = false) {
  const z = $("zoom");
  if (!z || !S) return;
  const seat = viewSeat();
  if (look) {
    z.innerHTML = `<div class="zoombox">${cardHTML(cid, { cls: "big" })}
      <div class="zside">${cardGloss(cid)}<p class="muted zwait">${L("A forgotten memory. Spend Light as your Answer to Recall it.", "一段被遺忘的記憶。以回應花費光可以喚回它。")}</p><button type="button" class="ghost" data-close>${L("Close", "關閉")}</button></div></div>`;
    z.classList.remove("hidden");
    z.querySelector("[data-close]")?.focus();
    return;
  }
  if (seat < 0 || !S.hands[seat].includes(cid)) return;
  selected = cid;
  const playable = seat === S.cur && canPlayCards();
  const joining = S.burn && S.burn.pcid === null && seat === S.burn.partner && canAct() && !busy;
  const res = playable && S.played === 0 && S.echo === CARDS[cid].tag;
  const tag = CARDS[cid].tag;
  const modes = playable ? `<div class="zmodes">
      <button type="button" class="tokbtn primary" data-play="up">${tokIcon("card", tag)}<span><b>${L("Play face up", "正面打出")}</b>${res ? `<small>${L("Resonates with the Echo", "與迴響產生共鳴")}</small>` : `<small>${L("its effect, and a knot on its thread", "執行效果，並在其絲線上打結")}</small>`}</span></button>
      <button type="button" class="tokbtn" data-play="down">${tokIcon("down")}<span><b>${L("Face down", "背面打出")}</b><small>${L("1 Root, no knot", "放1個根，不打結")}</small></span></button>
      ${E.canBurn(S, cid) ? `<button type="button" class="tokbtn" data-play="burn">${tokIcon("burn", tag)}<span><b>${L("Burn", "焚燒")}</b><small>${S.n === 1 ? L("its effect twice, then forget it and 1 more", "效果兩次，再遺忘此牌與另1張")
        : L("with a player who holds this thread: both reveal a card, one effect happens twice", "與握有此絲線的玩家一起：各翻開一張，其中一張效果執行兩次")}</small></span></button>` : ""}
    </div>` : joining ? (tag === S.burn.tag ? `<div class="zmodes"><button type="button" class="tokbtn primary" data-join>${tokIcon("burn", tag)}<span><b>${L("Add to the Burn", "加入焚燒")}</b><small>${L("it is revealed beside their card; one of the two happens twice", "它會與對方的牌一起翻開；兩者之一執行兩次")}</small></span></button></div>`
      : `<p class="muted zwait">${L(`Only a card of the <b>${tagName(S.burn.tag)}</b> thread can join this Burn.`, `只有<b>${tagName(S.burn.tag)}</b>牌能加入這次焚燒。`)}</p>`) : watching() ? `<p class="muted zwait">${L(`${esc(pname(S.names[seat]))}'s card. You are watching.`, `${esc(pname(S.names[seat]))}的牌。你正在旁觀。`)}</p>` : `<p class="muted zwait">${seat === S.cur ? L("You can play it once the table is ready.", "桌面準備好後就能打出。") : L("Not your turn: study it while you wait.", "還沒輪到你：等待時可以先研究。")}</p>`;
  z.innerHTML = `<div class="zoombox">
    ${cardHTML(cid, { cls: "big", resonant: res })}
    <div class="zside">${cardGloss(cid)}${modes}<button type="button" class="ghost" data-close>${L("Back to the hand", "放回手牌")}</button></div></div>`;
  z.classList.remove("hidden");
  z.querySelectorAll("[data-play]").forEach(b => b.onclick = () => (b.dataset.play === "burn" && S.n > 1 ? startBurn(cid) : playSelected(cid, b.dataset.play)));
  z.querySelector("[data-join]")?.addEventListener("click", () => joinBurnNow(cid));
  (z.querySelector("[data-play]") || z.querySelector("[data-close]"))?.focus();
  $("hand")?.querySelectorAll(".card").forEach(c => c.classList.toggle("sel", +c.dataset.cid === cid));
  if (mode === "online" && net?.role === "guest") net.api?.send({ t: "look", cid });
}
function closeZoom() {
  const z = $("zoom");
  if (!z || z.classList.contains("hidden")) return;
  z.classList.add("hidden");
  z.innerHTML = "";
  if (selected !== null && mode === "online" && net?.role === "guest") net.api?.send({ t: "look", cid: null });
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
  push: { icon: () => "nb-tok-push", col: () => "#D7263D", en: "Push Through the Shades", zh: "奮力駛過怨念" },
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
    <div class="aidicons tokenlegend">${row("card", 0, "Card face up (its thread)", "正面打出（其絲線）")}${row("down", 0, "Face down", "背面打出")}${row("burn", 0, "Burn", "焚燒")}
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
const miniFace = cid => (cid < 0 ? miniBack() : `<div class="mc face t${CARDS[cid].tag}">${memoryFace(cid)}</div>`);
// The memory card back, the same art as the printed cards.
const cardBack = () => `<img class="cb" src="${artSrc("back-memory")}" alt="" draggable="false">`;
const miniBack = () => `<div class="mc back">${cardBack()}</div>`;
let pilesHeld = {};   // a pile a card is flying towards keeps its old look until the card lands
function drawPiles() {
  const el = $("piles");
  if (!el || !S) return;
  const s = vs();
  const now = s.pile || { deck: S.deck.length, disc: S.discard.length, top: S.discard.at(-1) ?? -1, ft: S.forgotten.at(-1) ?? -1 };
  const f = s.forgotten.length;
  const pv = { ...now, f, ...pilesHeld, ...(stage ? { deck: stage.deck } : {}) };
  const stack = n => `--layers:${Math.min(6, Math.ceil(n / 4))}`;
  el.innerHTML = `
    <div class="pile deck" id="pile-deck" title="${L("The deck, face down", "牌庫（背面朝上）")}">
      <span class="pst ${pv.deck ? "" : "none"}" style="${stack(pv.deck)}">${pv.deck ? miniBack() : ""}</span><span class="plbl">${L("Deck", "牌庫")} <b>${pv.deck}</b></span></div>
    <button type="button" class="pile disc" id="pile-disc" data-list="disc" title="${L("The discard pile, face up: click to look through it", "棄牌堆（正面朝上）：點擊查看")}">
      <span class="pst ${pv.disc ? "" : "none"}" style="${stack(pv.disc)}">${pv.disc ? miniFace(pv.top) : ""}</span><span class="plbl">${L("Discard", "棄牌堆")} <b>${pv.disc}</b></span></button>
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
// The forgotten pile is face up, so anyone may look through it, and hold any card up close.
function pileDialog(which = "forg") {
  const disc = which === "disc";
  const cards = [...(disc ? S.discard : S.forgotten)].reverse();
  const title = disc ? L("The discard pile", "棄牌堆") : L("Forgotten memories", "被遺忘的記憶");
  const note = disc ? L("Most recent first. When the deck runs out, these are shuffled into a new deck.", "最近棄掉的排在最前。牌庫用完時，這些牌會洗成新的牌庫。") : L(`Most recent first. ${S.cfg.forgottenLimit} forgotten and the soul Fades. Spend ${S.cfg.recallCost} Light as your Answer to Recall one.`, `最近遺忘的排在最前。遺忘達到${S.cfg.forgottenLimit}張，亡魂就會消散。以回應花費${S.cfg.recallCost}點光可以喚回一張。`);
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
  ["card2", "Steer", "second action · a card or Push Through; Burn once a turn", "掌舵", "第二個行動 · 打出一張牌或奮力駛過；每回合焚燒一次"],
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
  if (anim && guideStep === "soul") return L("The soul tries to step onto the next Lit space. In the dark, it Lingers. Shades on both banks ahead also make it Linger, unless a player spent an action to Push Through.", "亡魂試著踏上下一個被照亮的格子。若前方黑暗，它便會徘徊。前方兩岸都被怨念佔據時也會徘徊，除非有玩家花了行動奮力駛過。");
  if (anim && guideStep === "mist") return L("The Mist turns a card for this Reach.", "迷霧為本河段翻開一張牌。");
  if (anim && guideStep === "draw") return L("The river settles and hands are refilled.", "河面平靜下來，玩家補滿手牌。");
  const who = esc(pname(S.names[E.actor(S)]));
  if (!canAct()) return mode === "local" ? L(`Pass the device to <b>${who}</b>.`, `請把裝置交給<b>${who}</b>。`) : L(`Waiting for <b>${who}</b>…`, `等待<b>${who}</b>…`);
  if (pending?.type === "root") return L(`Click a <b>glowing bank</b> on the river to place Root ${pending.i} of ${pending.n}.`, `點擊河上<b>發光的河岸</b>，放置第${pending.i}個根（共${pending.n}個）。`);
  if (pending?.type === "bloom") return L("Click one of your <b>Roots</b> to open it into a Bloom.", "點擊一個<b>根</b>，讓它綻放成花。");
  if (pending?.type === "bringer") return L("Click a <b>Root</b> to bloom it for free, or skip.", "點擊一個<b>根</b>免費使其綻放，或選擇跳過。");
  if (pending?.type === "vigil") return L("Read the coming Mist cards and put them back on top in <b>any order</b>.", "查看即將到來的迷霧牌，再以<b>任意順序</b>放回牌庫頂。");
  if (pending?.type === "inscribe") return L("Write this memory into the <b>Book</b>, or keep the card in the deck.", "將這段記憶寫進<b>憶念之書</b>，或把這張牌留在牌庫中。");
  const echo = S.echo >= 0 && S.played === 0 ? L(` A <b class="${TAGCLS[S.echo]}">${tagName(S.echo)}</b> card will Resonate.`, `<b class="${TAGCLS[S.echo]}">${tagName(S.echo)}</b>牌會產生共鳴。`) : "";
  const wounds = E.pushCost(S);
  const push = E.canPush(S) ? `<span class="pushwarn">${L(`Shades hold both banks ahead, so the soul will Linger. You may spend an action to <b>Push Through</b>: both Shades scatter and the soul steps forward now, at ${wounds} Fracture${wounds > 1 ? "s" : ""} and 1 forgotten card. Each Ferryman may do this only once in the whole game.`, `前方兩岸都被怨念佔據，亡魂將會徘徊。你可以花1個行動<b>奮力駛過</b>：兩個怨念四散，亡魂立刻前進一格，代價是${wounds}道裂痕並遺忘1張牌。每位擺渡人整局只能這麼做一次。`)}</span>`
    : E.blockedByGrievances(S) && E.hasPushed(S) ? `<span class="pushwarn">${L("Shades hold both banks ahead. You have already used your one Push Through this game: clear a bank with your cards.", "前方兩岸都被怨念佔據。你本局的奮力駛過已經用過了：請用手牌清出一側河岸。")}</span>` : "";
  if (S.phase === "burn" && S.burn) return S.burn.pcid === null ? L(`Choose a card of the <b>${tagName(S.burn.tag)}</b> thread to add to the Burn.`, `從手牌選一張<b>${tagName(S.burn.tag)}</b>牌加入焚燒。`)
    : L("Choose which of the two revealed cards happens <b>twice</b>.", "選擇兩張翻開的牌中，哪一張執行<b>兩次</b>。");
  if (pending?.type === "thread") return L("The fullest threads are tied: choose which one the card works on.", "最滿的絲線平手：選擇這張牌作用在哪一條。");
  return L(`Click a card in your hand to hold it up close, then choose <b>Face up</b>, <b>Face down</b> or <b>Burn</b>${S.n > 1 ? " (with a player who holds its thread)" : ""}.${echo}`, `點擊手牌中的一張牌把它拿近細看，再選擇<b>正面打出</b>、<b>背面打出</b>或<b>焚燒</b>${S.n > 1 ? "（與握有其絲線的玩家一起）" : ""}。${echo}`) + push;
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
  d.innerHTML = `<header><div class="tabs"><button type="button" data-tab="aid"></button><button type="button" data-tab="rules"></button><button type="button" data-tab="cards"></button></div>
      <button type="button" id="drawer-x"></button></header>
    <div class="search" id="dsearch"><input type="search" id="dq"><span class="count" id="dcount"></span></div>
    <div class="body" id="dbody"></div>
    <div class="dnav hidden" id="dnav"><div class="dtoc hidden" id="dtoc" role="menu"></div>
      <button type="button" id="dtocbtn" aria-expanded="false"></button><button type="button" id="dtop" class="hidden"></button></div>`;
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
  // In the Rulebook: a Contents list and a Back to top button float at the bottom right of the drawer.
  const toggleToc = open => { $("dtoc").classList.toggle("hidden", !open); $("dtocbtn").setAttribute("aria-expanded", String(open)); };
  $("dtocbtn").onclick = () => toggleToc($("dtoc").classList.contains("hidden"));
  $("dtop").onclick = () => { toggleToc(false); $("dbody").scrollTo({ top: 0, behavior: "smooth" }); };
  $("dbody").addEventListener("scroll", () => $("dtop").classList.toggle("hidden", $("dbody").scrollTop < 300), { passive: true });
  $("dbody").addEventListener("pointerdown", () => toggleToc(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && d.classList.contains("open")) closeDrawer(); });
  rebuildDrawer();
}

// The drawer's own labels, and its contents when it is open.
function rebuildDrawer() {
  const d = $("drawer");
  d.setAttribute("aria-label", L("Player Aid, Rulebook and Cards", "玩家輔助卡、規則書與卡牌"));
  d.querySelector('[data-tab="aid"]').textContent = L("Player Aid", "玩家輔助卡");
  d.querySelector('[data-tab="rules"]').textContent = L("Rulebook", "規則書");
  d.querySelector('[data-tab="cards"]').textContent = L("Cards", "卡牌");
  $("drawer-x").textContent = L("Close", "關閉");
  searchLabels();
  $("aid-tab").textContent = L("Player Aid · Rules", "輔助卡 · 規則");
  $("dtocbtn").textContent = L("☰ Contents", "☰ 目錄");
  $("dtop").textContent = L("↑ Top", "↑ 回到頂端");
  $("dtop").title = L("Back to top", "回到頂端");
  if (d.classList.contains("open")) openDrawer(drawerTab);
}

// The search box's prompt: the rules, or the cards.
function searchLabels() {
  const cards = drawerTab === "cards";
  $("dq").placeholder = cards ? L("Search the cards… e.g. Bloom, Shade, Light", "搜尋卡牌…例如：綻放、怨念、光") : L("Search the rules… e.g. Backlash, Stony, Linger", "搜尋規則…例如：反噬、石地、徘徊");
  $("dq").setAttribute("aria-label", cards ? L("Search the cards", "搜尋卡牌") : L("Search the rules", "搜尋規則"));
}

function openDrawer(tab) {
  const was = drawerTab;
  drawerTab = tab;
  const d = $("drawer");
  d.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  $("dsearch").classList.toggle("hidden", tab === "aid");
  $("dnav").classList.toggle("hidden", tab === "aid");
  $("dtoc").classList.add("hidden");
  $("dtop").classList.add("hidden");
  d.classList.toggle("wide", tab !== "aid");
  d.classList.toggle("cardview", tab === "cards");
  if (was !== tab) $("dq").value = "";
  searchLabels();
  if (tab === "aid") $("dbody").innerHTML = playerAid(S?.cfg).replace(/<\/section>\s*$/, `${tokenLegend()}</section>`);
  else {
    const cards = tab === "cards", book = cards ? cardsBook() : rulebook();
    $("dbody").innerHTML = (cards ? cardChips() : `<nav class="toc">${book.map(r => `<a href="#r-${r.id}">${esc(r.title.replace(/^\d+\. /, ""))}</a>`).join("")}</nav>`) +
      fillFigures(book.map(r => `<section class="rsec" id="r-${r.id}" data-keys="${esc(r.keys || "")}"${r.group ? ` data-group="${r.group}"` : ""}><h3>${r.title}</h3>${r.body}</section>`).join(""),
        zh() ? "zh" : "en", { artImg: (name, pos) => lazy(artImg(name, "pa", pos)) });
    $("dbody").querySelectorAll(".rfig .nbface").forEach(f => f.onclick = () => peekCard(f.outerHTML.replace(/ loading="lazy"/g, "")));
    if (cards) {
      showCardGroup(cardGroup);
      $("dbody").querySelectorAll(".gchips button").forEach(b => b.onclick = () => { showCardGroup(b.dataset.group); $("dbody").scrollTo({ top: 0 }); });
      $("dbody").querySelectorAll(".gitem").forEach(b => b.onclick = () => peekCard(b.querySelector(".nbface").outerHTML.replace(/ loading="lazy"/g, "")));
    }
    $("dbody").querySelectorAll(".setupfig").forEach(f => { f.innerHTML = setupFigure(artSrc, zh()); });
    $("dtoc").innerHTML = book.map(r => `<a href="#r-${r.id}" role="menuitem">${esc(r.title)}</a>`).join("");
    d.querySelectorAll(".toc a, .dtoc a").forEach(a => a.onclick = e => {
      e.preventDefault();
      $("dtoc").classList.add("hidden"); $("dtocbtn").setAttribute("aria-expanded", "false");
      const sec = document.getElementById(a.getAttribute("href").slice(1));
      if (sec?.classList.contains("hide")) { $("dq").value = ""; searchRules(""); }
      if (sec?.classList.contains("off")) showCardGroup(sec.dataset.group);
      sec?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    searchRules($("dq").value);
  }
  d.classList.add("open");
  $("aid-tab").classList.add("hidden");
  if (tab !== "aid" && !d.dataset.wasOpen) setTimeout(() => $("dq").focus(), 300);
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
  body.classList.toggle("searching", terms.length > 0);   // a search in the Cards view looks through every group
  // in the Cards view, each card is shown or hidden on its own; a section shows while any of its cards match
  let cardsShown = 0;
  body.querySelectorAll(".gitem").forEach(it => {
    const show = !terms.length || terms.every(t => (it.textContent + " " + (it.dataset.keys || "")).toLowerCase().includes(t));
    it.classList.toggle("hide", !show);
    if (show) cardsShown += 1;
  });
  body.querySelectorAll(".rsec").forEach(sec => { if (sec.querySelector(".gitem") && !sec.querySelector(".gitem:not(.hide)")) sec.classList.add("hide"); });
  if (drawerTab === "cards") shown = cardsShown;
  $("dcount").textContent = terms.length ? (shown ? (drawerTab === "cards" ? L(plural(shown, "card"), `${shown}張牌`) : L(`${hits} match${hits === 1 ? "" : "es"} · ${plural(shown, "section")}`, `${hits}處符合 · ${shown}個章節`)) : L("No matches", "沒有符合的結果")) : "";
  if (first) first.scrollIntoView({ block: "center" });
}

// ---------------------------------------------------------------- the Cards view: every card in the game, by kind
// Every card as printed (cardface.js), built from cards.js like the Rulebook's tables, so it always shows the cards the
// engine plays. Copies that read the same are shown once, with how many there are. The cards come in four groups, one
// shown at a time (a search looks through all of them); any card opens full size to be read.
const CARD_GROUPS = [["memory", "Memory cards", "記憶牌"], ["souls", "Souls", "亡魂"], ["mist", "Mist & Ghost", "迷霧與幽靈"], ["table", "Mantles, banks & backs", "稱號、河岸與牌背"]];
let cardGroup = "memory";
const lazy = html => html.replace(/<img /g, '<img loading="lazy" ');
const gitem = (html, n = 1, keys = "") => `<button type="button" class="gitem" data-keys="${esc(keys)}" title="${esc(L("Show it full size", "放大查看"))}">${lazy(face(html))}${n > 1 ? `<span class="gcount">×${n}</span>` : ""}</button>`;
const ggrid = items => `<div class="ggrid">${items.join("")}</div>`;
// Copies that are the same card (the same words) are counted, not repeated.
function counted(list, key) {
  const seen = new Map();
  for (const x of list) { const k = key(x); if (seen.has(k)) seen.get(k).n += 1; else seen.set(k, { x, n: 1 }); }
  return [...seen.values()];
}
function memoryGrid(ids) {
  return ggrid(counted(ids, cid => { const c = CARDS[cid]; return `${c.name}|${JSON.stringify([c.eff, c.res])}|${c.band}|${c.key}`; })
    .map(({ x: cid, n }) => gitem(kit.memoryCard(CW(), cid), n, `${CARDS[cid].name} ${["Obsession", "Acceptance", "Oblivion"][CARDS[cid].tag]}${CARDS[cid].key ? " Key Memory" : ""}`)));
}
const intro = (en, zhText) => `<p class="gintro">${L(en, zhText)}</p>`;
function cardsBook() {
  const out = [], W = CW();
  const sec = (group, id, title, body) => out.push({ group, id, title, body });
  const threads = [["obs", "the knots of what the soul cannot let go", "靈魂放不下的執著之結"], ["acc", "the warmth the soul makes peace with", "靈魂與之和解的溫暖"], ["obl", "what the soul gives to the river; used once, then forgotten", "靈魂交給河水的東西；使用一次後便被遺忘"]];
  threads.forEach(([id, en, zhText], t) => sec("memory", `core-${id}`, L(`Core deck · ${tagName(t)}`, `基本牌庫 · ${tagName(t)}`),
    intro(`Memory cards of the ${tagName(t)} thread: ${en}.`, `${tagName(t)}絲線的記憶牌：${zhText}。`) + memoryGrid(CORE_IDS.filter(cid => CARDS[cid].tag === t))));
  sec("memory", "echo", L(`Echo deck · ${soulInfo("open").name}`, `迴響牌庫 · ${soulInfo("open").name}`),
    intro("Shuffled into the core deck when you guide the nameless soul of the Open Crossing.", "引導無名渡河的亡魂時，洗入基本牌庫。") + memoryGrid(ECHO_IDS));
  sec("souls", "souls", L("The Souls", "亡魂"),
    intro("Choose one soul to guide across the river. Each brings its own cards and twist.", "選擇一個亡魂引導渡河。每個亡魂都有自己的牌與特殊規則。") +
      ggrid(Object.keys(SOULS).map(k => gitem(kit.soulFace(W, k), 1, `${SOULS[k].name} soul`))));
  for (const soul of Object.keys(SOUL_PACKS)) sec("souls", `pack-${soul}`, L(`Soul cards · ${soulInfo(soul).name}`, `亡魂牌 · ${soulInfo(soul).name}`),
    intro(`Shuffled into the core deck when you guide ${soulInfo(soul).name}. Its Key Memory may be inscribed even without Resonating.`, `引導${soulInfo(soul).name}時，洗入基本牌庫。關鍵記憶即使沒有共鳴也可以銘刻。`) + memoryGrid(SOUL_PACKS[soul]));
  MIST.forEach((_, r) => sec("mist", `mist-${r + 1}`, L(`Mist · Reach ${ROMAN[r]}`, `迷霧 · 第${ZHNUM[r]}河段`),
    intro(`${reachName(r)}: one is turned at the end of every turn while the soul is in this Reach.`, `${reachName(r)}：亡魂在本河段時，每回合結束翻開一張。`) +
      ggrid(counted(mistDeck(r).map((m, i) => [m, i]), ([m]) => JSON.stringify(m)).map(({ x: [m, i], n }) => gitem(kit.mistFace(W, m, mistId(r, i), r, false), n, `${m[0]} Mist`)))));
  const harshPer = Object.entries(LANTERN).map(([l, v]) => `${lanternName(l)} ${v[2]}`).join(" · ");
  sec("mist", "harsh", L("Harsh Mist", "凶霧"),
    intro(`Shuffled into each Reach's Mist deck, as many as the Lantern says (${harshPer}). The Child of the Last Flame faces none.`, `依燈籠的設定洗入每個河段的迷霧牌庫（${harshPer}）。最後火光的孩子不會遇到凶霧。`) +
      ggrid(HARSH.map((m, i) => gitem(kit.mistFace(W, m, harshId(i), 0, true), 1, `${m[0]} Harsh Mist`))));
  sec("mist", "ghost", L("Ghost cards", "幽靈牌"),
    intro("Solo only. After each of your turns the Ghost plays one, then ties a knot on its thread and moves the Echo there.", "僅限單人。你的每個回合之後，幽靈打出一張，在該絲線上打一個結，並把迴響移到那裡。") +
      ggrid(counted(GHOST.map((g, i) => [g, i]), ([g]) => g.join("|")).map(({ x: [[t, a], i], n }) => gitem(kit.ghostFace(W, t, a, ghostId(i)), n, "Ghost"))));
  sec("table", "mantles", L("Mantles", "稱號"),
    intro("Summon one by discarding a card of its thread and spending 3 Light (2 with the King on the Barge).", "棄掉一張同絲線的牌並花費3點光（渡船上的國王為2點光）即可召喚。") +
      ggrid(Object.keys(MANTLES).map(m => gitem(kit.mantleFace(W, m), 1, `${MANTLES[m].name} Mantle`))));
  sec("table", "banks", L("Bank cards", "河岸牌"),
    intro("Laid fog side up in the wells on the banks of each Reach, and turned over when a Root is placed there.", "霧面朝上放進各河段河岸的牌槽，放置根時翻開。") +
      ggrid(TILES.flatMap(([, tiles], r) => [FERTILE, STONY, MEMORY, GRAVE].filter(t => tiles.includes(t))
        .map(t => gitem(kit.bankFace(W, t, r), tiles.filter(x => x === t).length, "bank tile")))));
  sec("table", "backs", L("Card backs", "牌背"),
    intro("One back per deck. The bank cards' backs are the fog, one for each Reach.", "每副牌一種牌背。河岸牌的背面是霧，每個河段一種。") +
      ggrid([["back-memory", "Memory", "記憶牌"], ["back-mist", "Mist", "迷霧牌"], ["back-ghost", "Ghost", "幽靈牌"], ["back-soul", "Soul and Mantle", "亡魂與稱號"]]
        .map(([file, en, zhText]) => gitem(kit.paintedBack(file), 1, `${en} ${zhText} back`)).concat([0, 1, 2].map(r => gitem(kit.fogBack(W, r), 1, "fog bank back")))));
  return out;
}
// The groups as chips above the cards, and which sections the current group shows.
const cardChips = () => `<nav class="gchips" aria-label="${esc(L("Kinds of card", "卡牌種類"))}">${CARD_GROUPS.map(([g, en, zhText]) =>
  `<button type="button" data-group="${g}" class="${g === cardGroup ? "on" : ""}">${L(en, zhText)}</button>`).join("")}</nav>`;
function showCardGroup(g) {
  cardGroup = g;
  const body = $("dbody");
  body.querySelectorAll(".gchips button").forEach(b => b.classList.toggle("on", b.dataset.group === g));
  body.querySelectorAll(".rsec[data-group]").forEach(sec => sec.classList.toggle("off", sec.dataset.group !== g));
}
// A card from the Cards view, full size over the drawer: click anywhere or press Escape to put it back.
function peekCard(html) {
  document.querySelector(".cardpeek")?.remove();
  const el = document.createElement("div");
  el.className = "cardpeek";
  el.innerHTML = `<div class="peekcard">${html}</div><span class="peekhint">${L("Click anywhere to close", "點擊任意處關閉")}</span>`;
  const close = () => { el.remove(); document.removeEventListener("keydown", esc_, true); };
  const esc_ = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  el.onclick = close;
  document.addEventListener("keydown", esc_, true);
  document.body.appendChild(el);
}

// ---------------------------------------------------------------- the opening: the table is set up before the eyes
// A new crossing opens with the Setup steps of the Rulebook carried out on screen, in the same order and with the same
// numbers: the bank cards are shuffled and dealt into the wells, the decks are shuffled and laid down, and the hands
// are dealt. It plays on the effects queue, so nothing can be played until it ends; Skip sets the table at once.
const SETUP_SPACES = [[2, 4], [5, 8], [9, 11]];
function boardPt(x, y) {
  const svg = $("board"), m = svg?.getScreenCTM();
  if (!m) return boardPoint();
  const pt = svg.createSVGPoint();
  pt.x = x; pt.y = y;
  const q = pt.matrixTransform(m);
  return [q.x, q.y];
}
// On a narrow screen the river scrolls sideways: bring the part being set up into view.
function followBoard(x) {
  const sc = document.querySelector(".boardscroll");
  if (!sc || sc.scrollWidth <= sc.clientWidth + 2) return;
  sc.scrollLeft = x <= 0 ? 0 : x * boardScale() - sc.clientWidth / 2;
}
const boardScale = () => $("board")?.getScreenCTM()?.a || 1;
// A painted card travelling across the table (a bank card to its well, a Mist card to its Reach).
function artFly(src, from, to, { ms = 460, delay = 0, w = 54, h = 72, onland } = {}) {
  ms *= fxSpeed; delay *= fxSpeed;
  setTimeout(() => {
    if (!stage) return;
    const el = document.createElement("div");
    el.className = "artfly";
    el.style.cssText = `left:${from[0]}px;top:${from[1]}px;width:${w}px;height:${h}px`;
    el.innerHTML = `<img src="${artSrc(src)}" alt="" draggable="false">`;
    document.body.appendChild(el);
    const dx = to[0] - from[0], dy = to[1] - from[1], lift = Math.min(60, Math.hypot(dx, dy) * 0.15);
    el.animate([
      { transform: "translate(-50%,-50%) scale(1)" },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - lift}px)) scale(1.1) rotate(${dx < 0 ? -5 : 5}deg)`, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)` },
    ], { duration: ms, easing: "cubic-bezier(.35,.1,.25,1)", fill: "both" }).onfinish = () => { el.remove(); if (stage) onland?.(); };
  }, delay);
  return delay + ms;
}
// A small deck riffle-shuffled in place: two cuts, interleaved twice, then it waits to be dealt from and fades.
function shuffleAt(at, src, { n = 7, w = 54, h = 72, stay = 0 } = {}) {
  const ms = 1300 * fxSpeed, life = ms + stay * fxSpeed;
  const el = document.createElement("div");
  el.className = "shuf";
  el.style.cssText = `left:${at[0]}px;top:${at[1]}px`;
  el.innerHTML = Array.from({ length: n }, () => `<img src="${artSrc(src)}" alt="" draggable="false" style="width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px">`).join("");
  document.body.appendChild(el);
  [...el.children].forEach((c, i) => {
    const side = i % 2 ? 1 : -1, y0 = -i * 0.9, y1 = -(n - 1 - i) * 0.9;
    c.animate([
      { transform: `translate(0, ${y0}px)` },
      { transform: `translate(${side * w * 0.7}px, ${y0 + 4}px) rotate(${side * 9}deg)`, offset: 0.22 },
      { transform: `translate(0, ${y1}px)`, offset: 0.45 },
      { transform: `translate(${-side * w * 0.6}px, ${y1 + 4}px) rotate(${-side * 8}deg)`, offset: 0.68 },
      { transform: `translate(0, ${y0}px)`, offset: 0.9 },
      { transform: `translate(0, ${y0}px)` },
    ], { duration: ms, easing: "ease-in-out", fill: "both" });
  });
  el.animate([{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "scale(1)", offset: 0.08 }, { opacity: 1, offset: 0.92 }, { opacity: 0 }],
    { duration: life, fill: "both" }).onfinish = () => el.remove();
  A.sfx("card");
  return 1300;
}
// One step of the opening, carried out only while the opening still runs (Skip or leaving the table ends it).
function openStep(fn) {
  const f = () => (stage && $("board") ? fn() : 0);
  f.opening = true;
  enqueue(f);
}
function setupCap(n, en, zhText) {
  caption(L(`Setup ${n} · ${en}`, `準備 ${n} · ${zhText}`));
}
function startOpening() {
  const cfg = S.cfg, players = S.n;
  const handSize = S.hands[0].length;
  const total = S.deck.length + S.hands.reduce((a, h) => a + h.length, 0);
  stage = { banks: new Set(), fresh: new Set(), blooms: false, soul: false, light: false, deck: 0, dealt: S.hands.map(() => 0) };
  window.scrollTo(0, 0);
  drawBoard(); drawLoom(); drawSoulboard(); drawPiles(); drawTray(); drawBook(); drawLog(); drawHand();
  const skip = document.createElement("button");
  skip.type = "button";
  skip.id = "skipopen";
  skip.className = "skipopen";
  skip.textContent = L("Skip setup ›", "略過準備 ›");
  skip.onclick = () => endOpening();
  document.body.appendChild(skip);
  // Still on the way down: the setup waits until the dark has nearly opened onto the table.
  if (passageLeft()) { const wait = () => (stage ? passageLeft() * 0.8 / pace() : 0); wait.opening = true; enqueue(wait); }

  // 1. The river board
  openStep(() => {
    const b = $("board");
    b.style.animationDuration = `${1.3 * fxSpeed}s`;
    b.classList.add("boardin");
    setupCap(1, "The river board: three panels, Reach I to Reach III.", "河流圖板：三塊圖板，第一到第三河段。");
    return 1500;
  });
  // 2. Bank cards: each Reach's cards shuffled on their own, then dealt fog side up, space by space, left bank then right
  SETUP_SPACES.forEach(([a, b], r) => openStep(() => {
    followBoard((X(a) + X(b)) / 2);
    const mid = boardPt((X(a) + X(b)) / 2, Y((a + b) / 2));
    const sc = boardScale(), w = 54 * sc, h = 72 * sc;
    const n = (b - a + 1) * 2;
    setupCap(2, `Bank cards for Reach ${ROMAN[r]}: ${n} shuffled, dealt fog side up into spaces ${a}–${b}.`,
      `第${ZHNUM[r]}河段的河岸牌：${n}張洗勻，霧面朝上放進第${a}–${b}格。`);
    const shuf = shuffleAt(mid, "card-fog", { n: Math.min(n, 8), w, h, stay: n * 170 + 300 });
    let i = 0;
    for (let sp = a; sp <= b; sp++) for (const k of [sp * 2, sp * 2 + 1]) {
      artFly("card-fog", mid, boardPt(...slotXY(k)), { delay: shuf + i++ * 170, w, h, onland: () => {
        stage.banks.add(k); stage.fresh.add(k); drawBoard(); stage.fresh.delete(k);
        A.sfx("card");
      } });
    }
    return shuf + n * 170 + 500;
  }));
  // 3. The first Blooms and the soul
  openStep(() => {
    followBoard(0);
    stage.blooms = true; stage.fresh.add(2); stage.fresh.add(3);
    drawBoard(); stage.fresh.delete(2); stage.fresh.delete(3);
    A.sfx("bloom");
    setupCap(3, "Space 1 has no bank cards: a Bloom on both banks, so the first step is always Lit.", "第1格沒有河岸牌：兩岸各放1朵花，讓第一步永遠是照亮的。");
    return 1500;
  });
  openStep(() => {
    stage.soul = true;
    drawBoard();
    const g = $("soulG");
    g.classList.remove("soulin"); void g.getBoundingClientRect(); g.classList.add("soulin");
    ring([X(0), Y(0)], "#EFE7D6");
    A.sfx("move");
    setupCap(3, "The soul waits on the near shore (space 0).", "亡魂在此岸（第0格）等待。");
    return 1400;
  });
  // 4. The Soul and the Lantern
  openStep(() => {
    const soul = soulInfo(cfg.soul);
    banner(soul?.name || "", L(`Lantern: ${lanternName(cfg.lantern)}`, `燈籠：${lanternName(cfg.lantern)}`), "", soulPortrait(cfg.soul));
    shine($("soulboard")?.closest(".panel"), 1800);
    stage.light = true;
    drawSoulboard();
    if (S.light) shine($("sb-light"), 1600);
    setupCap(4, S.light ? `The Soul card and the Lantern. The Child starts with ${S.light} Light.` : "The Soul card and the Lantern. The soul starts with no Light.",
      S.light ? `亡魂牌與燈籠。孩子起始擁有${S.light}點光。` : "亡魂牌與燈籠。亡魂起始沒有光。");
    return 2100;
  });
  // 5. The Memory deck
  openStep(() => {
    const at = pilePoint("deck");
    setupCap(5, `The Memory deck: ${total} cards shuffled and laid face down. The discard and forgotten piles start empty.`,
      `記憶牌庫：${total}張洗勻，背面朝上放好。棄牌堆與遺忘堆一開始是空的。`);
    const ms = shuffleAt(at, "back-memory", { w: 46, h: 64 });
    setTimeout(() => { if (!stage) return; stage.deck = total; drawPiles(); shine($("pile-deck"), 1000); }, ms * fxSpeed);
    return ms + 700;
  });
  // 6. The Mist decks, one beside each Reach
  openStep(() => {
    const sc = boardScale();
    let ms = 0;
    SETUP_SPACES.forEach(([a, b], r) => { ms = shuffleAt(boardPt((X(a) + X(b)) / 2, Y((a + b) / 2)), "back-mist", { n: 6, w: 44 * sc, h: 62 * sc, stay: 500 }); });
    const n = S.mist.map(d => d.length);
    setupCap(6, `The Mist decks: one for each Reach (${n.join(", ")} cards), shuffled and laid beside it.`, `迷霧牌庫：每個河段一副（${n.join("、")}張），洗勻後放在河段旁。`);
    return ms + 900;
  });
  // 7–10. The Loom, the Mantles, the Book, the supply
  openStep(() => {
    shine($("loom")?.closest(".panel"), 1600);
    setupCap(7, `The Loom of the Fates: three threads, ${cfg.karmaCap} knots each. No Echo yet.`, `命運織機：三條絲線，每條${cfg.karmaCap}個結。還沒有迴響。`);
    return 1500;
  });
  openStep(() => {
    shine($("sb-mantles"), 1600);
    setupCap(8, "The four Mantles, face up where everyone can reach them.", "四張稱號牌正面朝上，放在每個人都拿得到的地方。");
    return 1400;
  });
  openStep(() => {
    shine($("book")?.closest(".panel"), 1600);
    setupCap(9, "The Book of Remembrance, open at Chapter I.", "憶念之書翻開到第一章。");
    return 1400;
  });
  openStep(() => {
    shine($("sb-bw"), 1600);
    shine($("tokstrip"), 1600);
    setupCap(10, `The supply, with ${cfg.bwSupply} Black Water for this Lantern.`, `供應區，此燈籠的黑水共${cfg.bwSupply}個。`);
    return 1500;
  });
  // 11. The Ferrymen: the hands dealt one card at a time around the table, then the Oar to the first player
  openStep(() => {
    setupCap(11, players > 1 ? `The Ferrymen: ${handSize} cards each, dealt around the table. The first player takes the Oar.` : `The Ferryman: a hand of ${handSize} cards.`,
      players > 1 ? `擺渡人：每人${handSize}張，輪流發牌。起始玩家拿起船槳。` : `擺渡人：${handSize}張手牌。`);
    let i = 0;
    for (let c = 0; c < handSize; c++) for (let p = 0; p < players; p++) {
      const t = 140 + i++ * 260;
      setTimeout(() => {
        if (!stage) return;
        stage.deck--; drawPiles();
        fly(pilePoint("deck"), handPoint(), { up0: false, up1: false, ms: 520, onland: () => { if (!stage) return; stage.dealt[p]++; drawHand(); } });
      }, t * fxSpeed);
    }
    return 140 + i * 260 + 700;
  });
  openStep(() => {
    shine($("tokstrip"), 1400);
    shine($("tray")?.querySelector(".oar"), 1400);
    setupCap(11, players > 1 ? "A Push Through token for each Ferryman, face up." : "Your Push Through token, face up.", players > 1 ? "每位擺渡人一個破浪標記，正面朝上。" : "你的破浪標記，正面朝上。");
    return 1300;
  });
  openStep(() => {
    endOpening(false);
    return callout(L("The memories are veiled", "記憶已被隱藏"), L("Talk freely, but never name your cards. Then the first turn.", "盡情討論，但絕不說出你的牌。接著是第一個回合。"));
  });
}
// The table as it really is: the opening's steps still waiting are dropped (Skip), or it simply ends.
function endOpening(skip = true) {
  if (!stage) return;
  stage = null;
  $("skipopen")?.remove();
  $("board")?.classList.remove("boardin");
  $("soulG")?.classList.remove("soulin");
  if (skip) {
    for (let i = queue.length - 1; i >= 0; i--) if (queue[i].opening) queue.splice(i, 1);
    document.querySelectorAll(".artfly, .shuf, .flight, .banner, .callout").forEach(e => e.remove());
    $("boardcap")?.classList.remove("on");
  }
  if (!$("board")) return;
  drawBoard(); drawSoulboard(); drawPiles(); drawHand();
}

// ---------------------------------------------------------------- refresh everything
function refresh() {
  if (!S || !$("board")) return;
  recordChron();
  A.lullaby(S.cfg.soul);
  A.mood(S.reach, tensionNow());
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

// How close the crossing is to being lost, 0 to 1, for the music: the nearest of the ways to lose it
// (forgotten cards, Fractures, the Black Water supply) or a thread of the Loom about to Backlash.
function tensionNow() {
  if (!S || S.result) return 0;
  const c = S.cfg;
  return Math.max(S.forgotten.length / c.forgottenLimit, S.fract / c.fractureLimit, 1 - S.bw / c.bwSupply, 0.85 * Math.max(...S.karma) / c.karmaCap);
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
    await new Promise(r => setTimeout(r, Math.round((ms || 0) * pace())));
  }
  running = false;
  if (view) { prev = asPrev(view); view = null; }
  if (guideStep) setGuide(null);
  refresh();
  idleWaiters.splice(0).forEach(r => r());
}
// Step by step goes at the pace of a real table, where each effect is carried out by hand: every step is held long
// enough to read its caption and see where it lands before the next one starts.
const stepping = () => fxSpeed >= 1;
const pace = () => (stepping() ? 1.2 : fxSpeed);
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
    if (stepping() && LEADS.has(ev.kind)) enqueue(() => lead(ev));
    enqueue(() => stepEvent(ev));
  }
}
// The previous finished state, in snapshot form, so the first step of a playback starts from what was on screen.
const prevAsSnap = p => ({ tok: p.tok, griev: p.griev, flooded: p.flooded, revealed: p.revealed, soul: p.soul, karma: p.karma, f: p.forgotten,
  fract: S.fract, light: S.light, bw: S.bw, echo: S.echo, ...(p.pile ? { deck: p.pile.deck, disc: p.pile.disc, top: p.pile.top, ft: p.pile.ft } : {}), hold: p.hold, acts: p.acts,
  shield: p.shield, resign: p.resign, pushed: p.pushed });

// Step by step, before an effect changes the table, what it is about to change glows for a moment while the caption
// names what is coming: first the cause, then where it lands, then the change itself. This is the order a player
// carries the effect out at a real table. Fast effects skip straight to the change.
const LEADS = new Set(["backlash", "grievance", "wither", "fog", "banish", "bloom", "flood", "drain", "fracture", "mend", "forget", "linger", "adrift"]);
function lead(ev) {
  const text = say(ev);
  const s = vs();
  const cap = cls => { if (text) caption(text, cls); };
  const onSlot = (col, cls, ms) => {
    if (ev.k === undefined) return 0;
    shineSlot(ev.k); spot(slotXY(ev.k), col); cap(cls); return ms;
  };
  const soulAt = () => [X(Math.min(s.soul, 12)), Y(Math.min(s.soul, 12))];
  switch (ev.kind) {
    case "backlash":
      shine(loomRow(ev.tag), 2000);
      caption(L(`The ${tagName(ev.tag)} thread is full of knots.`, `${tagName(ev.tag)}之線的結已打滿。`), ["obs", "acc", "obl"][ev.tag]);
      A.sfx("chime"); return 1700;
    case "grievance": return onSlot("#8FD6E1", "bad", 1300);
    case "wither": return onSlot("#9A948C", "bad", 1000);
    case "fog": return onSlot("#9A948C", "bad", 900);
    case "banish": return onSlot("#E6D3A3", "good", 1000);
    case "bloom": return onSlot("#D7263D", "", 800);
    case "flood": spot([X(ev.sp), Y(ev.sp)], "#8FD6E1", 40); shine($("sb-bw"), 1300); cap("bad"); return 1200;
    case "drain": spot([X(ev.sp), Y(ev.sp)], "#E6D3A3", 40); cap("good"); return 900;
    case "fracture": shine($("sb-fract"), 1100); spot(soulAt(), "#D7263D", 36); cap("bad"); return 1000;
    case "mend": shine($("sb-fract"), 1000); cap("good"); return 800;
    case "forget": shine($("sb-track")?.children[s.forgotten.length], 1000); cap("bad"); return 800;
    case "linger": case "adrift": spot(soulAt(), "#EFE7D6", 36); cap("bad"); return 1000;
    default: return 0;
  }
}
const loomRow = t => $("loom")?.querySelectorAll(".thread")[t];
// A part of the table glows, then settles. Panels redraw at the next step, which clears it in any case.
function shine(el, ms = 1200) {
  if (!el) return;
  el.classList.remove("shine");
  void el.getBoundingClientRect();
  el.classList.add("shine");
  setTimeout(() => el.classList.remove("shine"), ms * pace());
}
function shineSlot(k) { $("dyn")?.querySelector(`.slot[data-k="${k}"]`)?.classList.add("shine"); }
// A soft light that pulses over the spot on the river an effect is about to touch.
function spot(at, color, r = 32) {
  const fx = $("fx");
  if (!fx || !at) return;
  const g = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  g.setAttribute("cx", at[0]); g.setAttribute("cy", at[1]); g.setAttribute("r", r);
  g.setAttribute("class", "fxspot"); g.setAttribute("style", `stroke:${color};fill:${color};color:${color}`);
  fx.appendChild(g);
  setTimeout(() => g.remove(), 1500 * pace());
}
// A short line in the middle of the screen for an effect worth stopping on, smaller than a banner.
function callout(title, sub, cls = "") {
  const el = document.createElement("div");
  el.className = `callout ${cls}`;
  el.style.animationDuration = `${2.1 * pace()}s`;
  el.innerHTML = `<b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2100 * pace());
  return 1600;
}

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
    case "ghost": toast(text, ev.tag); cap(["obs", "acc", "obl"][ev.tag]); A.sfx("card"); return ghostCard(ev.tag, ev.m?.[2]);
    case "seek": if (!seats.has(ev.p) || mode === "local") toast(text, 1); cap(); A.sfx("card"); return 900;
    case "root": ring(at, "#E6D3A3"); cap(); A.sfx("root"); return 800;
    case "bloom": ring(at, "#D7263D"); cap(); A.sfx("bloom"); return 850;
    case "wither": ring(at, "#9A948C"); cap("bad"); A.sfx("forget"); return 950;
    case "reveal": if (at) ring(at, "#8FD6E1"); cap(); A.sfx("chime"); return 1000;
    case "fog": ring(at, "#9A948C"); cap("bad"); A.sfx("mist"); return 900;
    case "grievance": ring(at, "#8FD6E1"); cap("bad"); A.sfx("grievance"); return 1100;
    case "banish": ring(at, "#E6D3A3"); cap("good"); A.sfx("drain"); return 950;
    case "flood":
      ring(at, "#8FD6E1"); cap("bad"); A.sfx("flood");
      if (ev.m?.[2] === 0) return Math.max(1200, callout(L("The last Black Water", "最後一塊黑水"), L("The next flood is the Deluge.", "下一次淹沒就會滅頂。"), "bad"));
      return 1200;
    case "drain": ring(at, "#E6D3A3"); cap("good"); A.sfx("drain"); return 1000;
    case "move": ring([X(Math.min(ev.to, 12)), Y(Math.min(ev.to, 12))], "#EFE7D6"); cap(); A.sfx("move"); return 1100;
    case "light": cap("good"); A.sfx("chime"); return 900;
    case "keepsake": cap("good"); A.sfx("inscribe"); return 1000;
    case "knot": shine(loomRow(ev.tag), 900); cap(["obs", "acc", "obl"][ev.tag]); A.sfx("chime"); return 750;
    case "echo": if (ev.tag >= 0) shine(loomRow(ev.tag), 900); cap(ev.tag >= 0 ? ["obs", "acc", "obl"][ev.tag] : "bad"); return 750;
    case "forget": {
      const done = holdPile(["forg"], prev);
      fly(ev.from === "deck" ? pilePoint("deck") : boardPoint(), pilePoint("forg"), { cid: ev.cid ?? -1, up0: ev.from !== "deck", up1: true, ms: 750, onland: done });
      cap("bad"); A.sfx("forget");
      if (ev.b && ev.b.f === S.cfg.forgottenLimit - 1) return Math.max(1100, callout(L("One memory from Fading", "再遺忘一張就會消散"), L(`${ev.b.f} of ${S.cfg.forgottenLimit} forgotten.`, `已遺忘 ${ev.b.f}／${S.cfg.forgottenLimit}。`), "bad"));
      return 1100;
    }
    case "discard": {
      const done = holdPile(["disc"], prev);
      // The discard pile is face up: every card lands showing its face.
      const shown = ev.cid >= 0;
      fly(ev.from === "hand" ? handPoint() : boardPoint(), pilePoint("disc"), { cid: ev.cid, up0: shown && ev.from === "play", up1: shown, ms: 650, onland: done });
      caption(shown ? L(`${cardName(ev.cid)} goes face up onto the discard pile.`, `「${cardName(ev.cid)}」正面朝上放入棄牌堆。`) : L("A card goes onto the discard pile.", "一張牌放入棄牌堆。"));
      A.sfx("card");
      return 750;
    }
    case "fracture": {
      cap("bad"); A.sfx("fracture"); flash(); shake();
      const [, n, lim] = ev.m || [];
      if (!n) return 1200;
      return banner(L(`Fracture ${n} of ${lim}`, `裂痕 ${n}／${lim}`), n === lim - 1 ? L("One more Fracture and the soul shatters.", "再一道裂痕，亡魂就會破碎。") : text, "obs");
    }
    case "shield": {
      cap("good"); A.sfx("chime");
      const m = ev.m?.[0];
      if (m === "shieldHold" || m === "childShield") return callout(L("The Fracture is stopped", "裂痕被擋下了"), text, "good");
      if (m === "wardenDrift" || m === "wardenSteady") return callout(L("The Spirit Warden holds", "守魂者穩住了亡魂"), text, "good");
      return 1000;
    }
    case "mend": case "release": case "guide": cap("good"); A.sfx("chime"); return 1000;
    case "linger": {
      cap("bad"); A.sfx("linger"); toast(text);
      const m = ev.m?.[0];
      const title = { linger: L("The soul Lingers", "亡魂徘徊"), waitLit: L("The soul waits", "亡魂停留"), bridePull: L("Pulled back", "被拉回"), resign: L("Resignation", "認命") }[m];
      return title ? Math.max(1300, callout(title, text, "bad")) : 1300;
    }
    case "adrift": cap("bad"); A.sfx("linger"); toast(text); return banner(L("Adrift", "漂離"), text, "obs");
    case "inscribe":
      if ($("book")) fly(boardPoint(), centre($("book")), { cid: ev.cid, ms: 850 });
      toast(text, 1); cap("good"); if (!seats.has(S.cur)) A.sfx("inscribe");
      return Math.max(1300, callout(L("Written into the Book", "銘刻進憶念之書"), ev.cid >= 0 ? cardName(ev.cid) : "", "good"));
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
      if (m === "ash") { cap("good"); A.sfx("chime"); return callout(L("Light as Ash", "輕如灰燼"), text, "good"); }
      if (m === "feed" || m === "darkWindHurt") { cap("bad"); A.sfx("linger"); return callout(m === "feed" ? L("A Shade feeds", "怨念吞噬亡魂") : L("The Dark Wind wounds", "黑風傷了亡魂"), text, "bad"); }
      if (m === "hold" || m === "holding") {    // the Hold Fast token goes down beside the soul, and is shown again when it takes effect
        if (m === "holding") boardToken("hold", [X(Math.min(vs().soul, 12)), Y(Math.min(vs().soul, 12)) - 58]);
        cap(m === "holding" ? "good" : ""); A.sfx("chime");
        return m === "holding" ? Math.max(1400, callout(L("Hold Fast", "堅守"), text, "good")) : 1400;
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
    case "mist": setGuide("mist"); cap("bad"); return mistCard(ev.name, ev.ops) + 300;
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
  capTimer = setTimeout(() => el.classList.remove("on"), 3200 * Math.max(1, pace()));
}

function mistCard(name, ops) {
  A.sfx("mist");
  const el = document.createElement("div");
  el.className = "mistcard face";
  el.innerHTML = mistFace(name, ops, S?.reach ?? 0);
  document.body.appendChild(el);
  // Crisp while it is read; it only blurs as it leaves. 2 seconds in all, longer step by step.
  const t = Math.max(1, pace());
  setTimeout(() => el.classList.add("out"), 2000 * t - 450);
  setTimeout(() => el.remove(), 2000 * t);
  return 2000;
}
// The Ghost's card, turned up for a moment in the middle of the table (solo).
function ghostCard(tag, act) {
  const el = document.createElement("div");
  el.className = "mistcard face";
  el.innerHTML = ghostFace(tag, act || "none");
  document.body.appendChild(el);
  const t = Math.max(1, pace());
  setTimeout(() => el.classList.add("out"), 1500 * t - 400);
  setTimeout(() => el.remove(), 1500 * t);
  return 1500;
}
function banner(title, sub, cls, art) {
  const el = document.createElement("div");
  el.className = `banner ${cls || ""}${art ? " withart" : ""}`;
  el.innerHTML = `${art ? `<span class="bart">${artImg(art)}</span>` : ""}${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ""}`;
  el.style.animationDuration = `${2.4 * Math.max(1, pace())}s`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500 * Math.max(1, pace()));
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
    <div class="endpic">${artImg(win ? reachPainting(S.cfg.soul, 2) : soulPortrait(S.cfg.soul))}</div>
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
  $("tomenu").onclick = backToMenu;
  $("stay").onclick = closeVeil;
  $("readbook").onclick = () => { closeVeil(); openBook(S, 0); };
  if (canRestart) $("again").onclick = () => {
    if (mode === "online") {
      const names = S.names;
      const s = E.newGame(E.makeConfig({ players: S.n, soul: S.cfg.soul, lantern: S.cfg.lantern }), undefined, names);
      s.gid = Math.random().toString(36).slice(2, 10);
      seats = hostSeats();
      net.api.broadcast({ t: "state", s });
      beginGame(s, true);
    } else startLocal(mode, S.n);
  };
}

boot();
