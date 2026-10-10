// The full Book of Remembrance: an illustrated two-page spread with page turns.
// Spread 0 is the title and contents, spreads 1–3 are the chapters (one per Reach), and an epilogue follows once the game ends.
import { CARDS, BOOK_FRAMES, SOULS, REACH_NAMES, SLOTS } from "./cards.js";
import { keyMemoryFate } from "./engine.js";
import { mountReplay } from "./replay.js";
import { storyTheme } from "./audio.js";

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ROMAN = ["I", "II", "III"];
const SLOT_ICON = { Place: "nb-slot-place", Person: "nb-slot-person", Deed: "nb-slot-deed", Feeling: "nb-slot-feeling" };
const use = (id, cls = "", style = "") => `<svg class="${cls}" style="${style}" aria-hidden="true"><use href="#${id}"/></svg>`;
const TITLES = BOOK_FRAMES.map(([t]) => t.split(" · ")[1]);

let S = null, at = 0, seen = new Set(), turning = false, onKey = null;
let shown = { left: null, right: null }, pageStops = [], bandStop = null, bandFocus = undefined;
const REACH_SPAN = [[1, 4], [5, 8], [9, 11]];

// Corner ornaments and a double rule, drawn over each page.
const frame = () => `<svg class="bk-frame" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
  <rect x="4" y="4" width="92" height="132" fill="none" stroke="#8a6a3e" stroke-width=".45"/>
  <rect x="5.6" y="5.6" width="88.8" height="128.8" fill="none" stroke="#8a6a3e" stroke-width=".2"/></svg>
  ${["tl", "tr", "bl", "br"].map(c => `<span class="bk-corner ${c}">${use("nb-bloom")}</span>`).join("")}`;

// A small ink drawing of the river: three currents, two lilies on the banks and the soul between them.
const vignette = () => `<div class="bk-vignette" aria-hidden="true"><svg viewBox="0 0 300 74">
  <g fill="none" stroke="currentColor" stroke-linecap="round">
    <path d="M6 44 C40 34 70 54 105 44 S170 34 205 44 S265 54 294 42" stroke-width="1.3"/>
    <path d="M22 54 C55 46 85 62 120 54 S185 46 220 54 S268 60 288 52" stroke-width="1" opacity=".65"/>
    <path d="M44 63 C72 59 97 67 132 63 S202 59 244 63" stroke-width=".8" opacity=".45"/>
    <path d="M30 40 L30 22 M268 38 L268 20" stroke-width="1"/>
  </g>
  <use href="#nb-bloom" x="16" y="2" width="28" height="28" style="color:#a32a30"/>
  <use href="#nb-bloom" x="254" y="0" width="28" height="28" style="color:#a32a30"/>
  <use href="#nb-soul" x="141" y="14" width="18" height="22" style="color:#5b4630"/></svg></div>`;

function spreads() {
  const n = S.result ? 5 : 4;
  return Array.from({ length: n }, (_, i) => i);
}

function filled(r) { return Object.keys(S.book[r]).length; }

function leftPage(i) {
  const soul = SOULS[S.cfg.soul];
  if (i === 0) {
    return `<div class="bk-title">
      <div class="bk-kicker">Here is written</div>
      <h1>The Book of<br>Remembrance</h1>
      <div class="bk-lily">${use("nb-bloom")}</div>
      <div class="bk-of">of</div>
      <h2>${esc(soul.name)}</h2>
      <p class="bk-blurb">${esc(soul.blurb)}</p>
      <div class="bk-imprint">Lantern ${S.cfg.lantern} · ${S.names.map(esc).join(", ")}</div>
    </div>`;
  }
  if (i === 4) {
    const win = S.result === "win";
    return `<div class="bk-chapter">
      <div class="bk-kicker">Epilogue</div>
      <h2 class="bk-script">${win ? "The Far Shore" : "Into the Mist"}</h2>
      <div class="bk-scene" data-lo="1" data-hi="11"></div>
      <p class="bk-centre">${win ? "The soul set down its last memory on the bank and walked on into the light." : { Faded: "So much was forgotten that nothing was left to cross.", Shattered: "Broken three times, the soul could carry itself no further.", Deluge: "The black river rose, and there was nothing left to hold it back.", Stalled: "The river grew still, and the crossing was abandoned." }[S.cause]}</p>
      <div class="bk-imprint">${S.turn} turns · ${S.stats.inscribed} memories inscribed · ${S.forgotten.length} forgotten</div>
    </div>`;
  }
  const r = i - 1, here = S.reach === r && !S.result, done = S.reach > r || (S.result && S.reach >= r);
  return `<div class="bk-chapter">
    <div class="bk-kicker">Chapter ${ROMAN[r]}</div>
    <h2 class="bk-script">${TITLES[r]}</h2>
    <div class="bk-reach">${REACH_NAMES[r]}</div>
    <div class="bk-scene" data-lo="${REACH_SPAN[r][0]}" data-hi="${REACH_SPAN[r][1]}"></div>
    <div class="bk-status">${here ? "The soul walks here now" : done ? "The soul has passed this way" : S.result ? "The soul never came this way" : "Not yet reached"}</div>
    <ul class="bk-slots">${SLOTS.map(slot => {
      const cid = S.book[r][slot];
      return `<li class="${cid === undefined ? "" : "on"}">${use(SLOT_ICON[slot])}<span>${slot}</span><em>${cid === undefined ? "unwritten" : "inscribed"}</em></li>`;
    }).join("")}</ul>
    ${S.blessed[r] ? `<div class="bk-wax" title="Chapter Blessing">${use("nb-seal")}</div>` : ""}
    ${S.keepsakes[r] ? `<div class="bk-keep">${S.keepsakes[r]} keepsake${S.keepsakes[r] === 1 ? "" : "s"} found</div>` : ""}
  </div>`;
}

function rightPage(i) {
  if (i === 0) {
    return `<div class="bk-contents">
      <div class="bk-kicker">Contents</div>
      <ol>${[0, 1, 2].map(r => `<li data-go="${r + 1}"><span class="n">${ROMAN[r]}</span><span class="t">${TITLES[r]}</span><span class="dots"></span>
        <span class="c">${filled(r)}/4${S.blessed[r] ? use("nb-seal") : ""}</span></li>`).join("")}
        ${S.result ? `<li data-go="4"><span class="n">·</span><span class="t">Epilogue</span><span class="dots"></span><span class="c"></span></li>` : ""}</ol>
      <p class="bk-note">Memories are written here when a card Resonates with the Echo, or when a Key Memory is played. Three memories on a page bring a Chapter Blessing.</p>
      ${vignette()}
    </div>`;
  }
  if (i === 4) {
    const fate = keyMemoryFate(S), soul = SOULS[S.cfg.soul];
    const text = fate ? {
      inscribed: `The Key Memory was written into this Book. ${soul.name} crossed remembering what mattered most.`,
      forgotten: `The Key Memory was lost to the river. ${soul.name} went on without it.`,
      unspoken: "The Key Memory was never written down. Some things go across unsaid.",
    }[fate] : "A nameless soul leaves no Key Memory, only what you wrote for it.";
    return `<div class="bk-prose">
      <p class="bk-dropcap">${esc(text)}</p>
      <div class="bk-rule">${use("nb-bloom")}</div>
      <p class="bk-centre bk-finis">Here ends the crossing.</p>
      ${vignette()}
    </div>`;
  }
  const r = i - 1, page = S.book[r];
  const [, frameText] = BOOK_FRAMES[r];
  const lost = !!S.result || S.reach > r;
  let n = 0;
  const html = esc(frameText).replace(/\{(\w+)\}/g, (_, slot) => {
    const cid = page[slot];
    n += 1;
    if (cid !== undefined) {
      const key = `${r}-${slot}`, fresh = !seen.has(key);
      seen.add(key);
      return `<span class="bk-ink ${fresh ? "write" : ""}" style="--d:${n * 0.35}s">${esc(CARDS[cid].band)}</span>`;
    }
    return lost ? `<span class="bk-lost">…but this, the river has taken</span>` : `<span class="bk-blank">${use(SLOT_ICON[slot])}${slot.toLowerCase()}</span>`;
  });
  const margin = SLOTS.map(slot => {
    const cid = page[slot];
    return `<li class="${cid === undefined ? "" : "on"}">${use(SLOT_ICON[slot])}<b>${slot}</b><span>${cid === undefined ? (lost ? "lost to the river" : "unwritten") : esc(CARDS[cid].name)}</span></li>`;
  }).join("");
  return `<div class="bk-prose"><p class="bk-dropcap">${html}</p><div class="bk-rule">${use("nb-bloom")}</div>
    <ul class="bk-margin">${margin}</ul>
    <p class="bk-foot">${filled(r)} of 4 memories${S.blessed[r] ? " · blessed" : ""}</p>${vignette()}</div>`;
}

const pageNo = (i, side) => `<span class="bk-pno">${i * 2 + side + 1}</span>`;

// Pages are only rebuilt when their content changes, so a running replay is not restarted by every game update.
function render(force = false) {
  const book = document.getElementById("bk-book");
  const L = leftPage(at) + pageNo(at, 0), R = rightPage(at) + pageNo(at, 1);
  let changed = false;
  if (force || L !== shown.left) { book.querySelector(".bk-left .bk-inner").innerHTML = L; shown.left = L; changed = true; }
  if (force || R !== shown.right) { book.querySelector(".bk-right .bk-inner").innerHTML = R; shown.right = R; changed = true; }
  if (changed) {
    pageStops.forEach(stop => stop());
    pageStops = [...book.querySelectorAll(".bk-page .bk-scene")].map(host =>
      mountReplay(host, S, { lo: +host.dataset.lo, hi: +host.dataset.hi, look: "ink" }));
  }
  const focus = at >= 1 && at <= 3 ? at - 1 : null;
  if (focus !== bandFocus) {
    bandFocus = focus;
    if (bandStop) bandStop();
    bandStop = mountReplay(document.getElementById("bk-band"), S, { lo: 1, hi: 11, look: "night", focus });
  }
  document.getElementById("bk-dots").innerHTML = spreads().map(i =>
    `<button type="button" class="${i === at ? "on" : ""}" data-go="${i}" aria-label="Spread ${i + 1}"></button>`).join("");
  document.getElementById("bk-prev").disabled = at === 0;
  document.getElementById("bk-next").disabled = at === spreads().length - 1;
  book.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(+b.dataset.go));
  document.querySelectorAll("#bk-dots [data-go]").forEach(b => b.onclick = () => go(+b.dataset.go));
}

function go(to) {
  const max = spreads().length - 1;
  to = Math.max(0, Math.min(max, to));
  if (to === at || turning) return;
  const book = document.getElementById("bk-book");
  const narrow = window.matchMedia("(max-width: 760px)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (narrow) { at = to; render(); return; }
  turning = true;
  const fwd = to > at, from = at;
  const leaf = document.createElement("div");
  leaf.className = `bk-leaf ${fwd ? "fwd" : "back"}`;
  leaf.innerHTML = `<div class="bk-face front"><div class="bk-inner">${fwd ? rightPage(from) + pageNo(from, 1) : leftPage(from) + pageNo(from, 0)}</div>${frame()}</div>
    <div class="bk-face backside"><div class="bk-inner">${fwd ? leftPage(to) + pageNo(to, 0) : rightPage(to) + pageNo(to, 1)}</div>${frame()}</div>`;
  // The page under the leaf already shows the new spread; the other page keeps the old one until the leaf lands.
  at = to;
  const keepSide = fwd ? ".bk-left" : ".bk-right";
  const kept = book.querySelector(`${keepSide} .bk-inner`).innerHTML;
  render(true);
  book.querySelector(`${keepSide} .bk-inner`).innerHTML = kept;
  book.appendChild(leaf);
  leaf.addEventListener("animationend", () => { leaf.remove(); turning = false; render(true); }, { once: true });
}

export function openBook(state, spread = null) {
  S = state;
  at = spread ?? (S.result ? 4 : Math.min(3, S.reach + 1));
  at = Math.min(at, spreads().length - 1);
  closeBook();
  const v = document.createElement("div");
  v.className = "bk-veil";
  v.id = "bk-veil";
  v.innerHTML = `
    <div class="bk-stage" role="dialog" aria-modal="true" aria-label="The Book of Remembrance">
      <div class="bk-book" id="bk-book">
        <div class="bk-page bk-left"><div class="bk-inner"></div>${frame()}</div>
        <div class="bk-page bk-right"><div class="bk-inner"></div>${frame()}</div>
        <div class="bk-spine"></div>
      </div>
      <div class="bk-band"><div class="bk-band-h">The Crossing <span>replayed from your game</span></div><div id="bk-band"></div></div>
      <div class="bk-nav">
        <button type="button" id="bk-prev" aria-label="Previous page">‹</button>
        <div class="bk-dots" id="bk-dots"></div>
        <button type="button" id="bk-next" aria-label="Next page">›</button>
        <button type="button" id="bk-close" class="bk-x">Close the Book</button>
      </div>
    </div>`;
  document.body.appendChild(v);
  v.addEventListener("click", e => { if (e.target === v) closeBook(); });
  document.getElementById("bk-prev").onclick = () => go(at - 1);
  document.getElementById("bk-next").onclick = () => go(at + 1);
  document.getElementById("bk-close").onclick = closeBook;
  onKey = e => {
    if (e.key === "Escape") closeBook();
    if (e.key === "ArrowRight") go(at + 1);
    if (e.key === "ArrowLeft") go(at - 1);
  };
  document.addEventListener("keydown", onKey);
  shown = { left: null, right: null };
  bandFocus = undefined;
  render();
  storyTheme(S.cfg.soul);
  document.getElementById("bk-next").focus({ preventScroll: true });
  v.scrollTop = 0;
}

export function closeBook() {
  const wasOpen = !!document.getElementById("bk-veil");
  document.getElementById("bk-veil")?.remove();
  pageStops.forEach(stop => stop());
  pageStops = [];
  if (bandStop) bandStop();
  bandStop = null;
  if (wasOpen) storyTheme(null);
  if (onKey) document.removeEventListener("keydown", onKey);
  onKey = null;
  turning = false;
}

export const bookOpen = () => !!document.getElementById("bk-veil");
export function refreshBook(state) { if (bookOpen() && !turning) { S = state; render(); } }
export function resetBookMemory() { seen = new Set(); }
