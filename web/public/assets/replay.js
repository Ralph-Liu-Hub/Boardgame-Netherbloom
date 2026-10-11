// Replays the soul's journey from the state's trail as a small animated river scene.
// Two looks: "ink" (drawn on the Book's parchment) and "night" (the band beneath the Book).
// The scene loops: the soul walks space by space, lilies open where it left Blooms behind,
// it flickers where it Lingered, cracks where it Fractured, and inscribed memories rise as ink.
import { zh, cardBand } from "./i18n.js";
const L = (en, zhText) => (zh() ? zhText : en);

const NS = "http://www.w3.org/2000/svg";
const STEP_MS = 1150, HOLD_MS = 2600;
const running = new Set();

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
function use(id, x, y, w, h, style, parent) {
  return el("use", { href: `#${id}`, x, y, width: w, height: h, style }, parent);
}

// Steps for a stretch of river [lo, hi]. The scene starts with the soul at lo - 1.
export function stepsFor(S, lo, hi) {
  const t = S.trail || [];
  const inRange = p => p >= lo - 1 && p <= hi;
  const out = [];
  for (const e of t) {
    if (e.k === "m" && e.to >= lo && e.to <= hi + (hi === 11 ? 1 : 0)) out.push(e);
    else if (e.k === "p" && inRange(e.f)) out.push(e);
    else if ((e.k === "w" || e.k === "l" || e.k === "x") && e.at >= lo && e.at <= hi) out.push(e);
    else if (e.k === "i" && e.at >= lo - 1 && e.at <= hi) out.push(e);
    else if ((e.k === "win" && hi === 11) || (e.k === "end" && S.soul >= lo - 1 && S.soul <= hi)) out.push(e);
  }
  return out;
}

export function mountReplay(host, S, { lo = 1, hi = 11, look = "ink", focus = null } = {}) {
  const night = look === "night";
  const far = hi === 11;
  const first = lo - 1, last = far ? 12 : hi;
  // The band is wide and short; a chapter scene is a tall vignette with scenery.
  const W = night ? 1160 : 560, H = night ? 120 : 330;
  const pad = night ? 46 : 40;
  const X = sp => pad + (sp - first) * ((W - 2 * pad) / (last - first));
  const Y = sp => (night ? 74 : 232) + (night ? 8 : 14) * Math.sin(sp * 0.9);
  const ink = night ? "#E6D3A3" : "#6b4a2a", red = night ? "#D7263D" : "#a32a30";
  const big = night ? 1 : 1.55;   // figure scale

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: `rp rp-${look}`, role: "img", "aria-label": L("The soul's journey, replayed", "亡魂旅程的重播") });
  host.replaceChildren(svg);

  if (!night) {
    // scenery drawn in ink: a crescent moon, two lines of hills, reeds and slow mist
    const sc = el("g", { fill: "none", stroke: ink, "stroke-linecap": "round" }, svg);
    el("path", { d: `M${W - 92} 52 a26 26 0 1 0 22 40 a20 20 0 1 1 -22 -40 z`, fill: ink, opacity: 0.18, stroke: "none" }, sc);
    el("path", { d: `M0 172 C70 128 120 150 180 138 S300 98 360 126 S470 150 ${W} 118`, "stroke-width": 1, opacity: 0.35 }, sc);
    el("path", { d: `M0 186 C90 160 150 176 230 162 S380 150 440 166 S520 172 ${W} 158`, "stroke-width": 0.8, opacity: 0.25 }, sc);
    for (let i = 0; i < 9; i++) {
      const x = 14 + i * 66 + (i % 2) * 12, y = 304 + (i % 3) * 6;
      el("path", { d: `M${x} ${y} q-3 -18 2 -32 M${x + 6} ${y} q2 -14 -1 -26 M${x + 11} ${y} q4 -12 1 -20`, "stroke-width": 0.9, opacity: 0.4 }, sc);
    }
    for (let i = 0; i < 3; i++) el("ellipse", { cx: 120 + i * 170, cy: 196 + i * 10, rx: 90, ry: 9, fill: ink, opacity: 0.06, stroke: "none", class: `rp-mist m${i}` }, sc);
  } else {
    const st = el("g", { fill: ink }, svg);
    for (let i = 0; i < 36; i++) el("circle", { cx: (i * 97) % W, cy: 6 + ((i * 37) % 34), r: i % 5 ? 0.7 : 1.1, opacity: 0.35, class: i % 3 ? "" : "rp-star" }, st);
  }

  // river
  let d = "";
  for (let sp = first - 0.6; sp <= last + 0.6; sp += 0.2) d += `${d ? "L" : "M"}${X(sp).toFixed(1)},${Y(sp).toFixed(1)} `;
  const river = el("g", { fill: "none", stroke: ink, "stroke-linecap": "round" }, svg);
  el("path", { d, "stroke-width": night ? 20 : 26, opacity: night ? 0.1 : 0.13 }, river);
  el("path", { d, "stroke-width": 1.2, opacity: 0.7, transform: `translate(0,${night ? -7 : -11})` }, river);
  el("path", { d, "stroke-width": 0.8, opacity: 0.45, transform: `translate(0,${night ? 7 : 11})` }, river);
  if (night) el("path", { d, "stroke-width": 1, class: "rp-flow", stroke: "#8FD6E1", opacity: 0.45 }, river);

  // spaces, reach dividers and the far shore
  const marks = el("g", { "font-family": "IBM Plex Mono, monospace", "font-size": night ? 9 : 10, fill: ink, "text-anchor": "middle", opacity: 0.75 }, svg);
  for (let sp = first; sp <= last; sp++) {
    if (sp === 0 || sp === 12) continue;
    el("circle", { cx: X(sp), cy: Y(sp), r: 2.2, fill: ink, opacity: 0.6 }, marks);
    el("text", { x: X(sp), y: Y(sp) + (night ? 30 : 40) }, marks).textContent = sp;
    if (night && (sp === 4 || sp === 8)) el("line", { x1: (X(sp) + X(sp + 1)) / 2, x2: (X(sp) + X(sp + 1)) / 2, y1: 10, y2: H - 6, stroke: ink, "stroke-dasharray": "3 4", opacity: 0.35 }, marks);
  }
  if (night && focus !== null) {
    const [a, b] = [[1, 4], [5, 8], [9, 11]][focus];
    el("rect", { x: X(a) - 18, y: 6, width: X(b) - X(a) + 36, height: H - 12, rx: 10, fill: "#E6D3A3", opacity: 0.06, class: "rp-focus" }, svg);
  }
  if (far) {
    use("nb-light", X(12) - 11, Y(12) - 40, 22, 24, `color:${ink}`, svg);
    el("text", { x: X(12), y: Y(12) + (night ? 30 : 34), "text-anchor": "middle", "font-family": "IM Fell English SC, serif", "font-size": 10, fill: ink }, svg).textContent = L("Far Shore", "彼岸");
  }
  if (first === 0) el("text", { x: X(0), y: Y(0) + (night ? 30 : 34), "text-anchor": "middle", "font-family": "IM Fell English SC, serif", "font-size": 10, fill: ink, opacity: 0.8 }, svg).textContent = L("near shore", "此岸");

  const lilies = el("g", {}, svg);
  const words = el("g", {}, svg);
  const soul = el("g", { class: "rp-soul" }, svg);
  el("circle", { r: 15 * big, cy: -6 * big, fill: night ? "#8FD6E1" : "#f6ecd2", opacity: night ? 0.25 : 0.75, class: "rp-glow" }, soul);
  use("nb-soul", -10 * big, -24 * big, 20 * big, 24 * big, `color:${night ? "#EFE7D6" : "#3a2817"}`, soul);
  const label = el("text", { x: W - 10, y: night ? 14 : 24, "text-anchor": "end", class: night ? "" : "rp-ink-label", "font-family": "IBM Plex Mono, monospace", "font-size": 10, fill: ink, opacity: 0.8 }, svg);

  const steps = stepsFor(S, lo, hi);
  const reached = (S.soul >= lo) || steps.length > 0;
  let i = 0, pos = first, timer = null, alive = true;

  const place = (sp, instant) => {
    soul.style.transition = instant ? "none" : `transform ${STEP_MS * 0.8}ms cubic-bezier(.45,.05,.35,1)`;
    soul.style.transform = `translate(${X(sp)}px, ${Y(sp) - 2}px)`;
  };
  const lily = sp => {
    if (sp < first || sp > last || sp === 0 || sp === 12) return;
    const g = el("g", { class: "rp-lily" }, lilies);
    const z = 18 * big, top = Y(sp) - (night ? 36 : 62);
    use("nb-bloom", X(sp) - z / 2, top, z, z, `color:${red}`, g);
    el("line", { x1: X(sp), x2: X(sp), y1: top + z * 0.9, y2: Y(sp) - 9, stroke: ink, "stroke-width": 0.9, opacity: 0.6 }, g);
  };
  const rise = (text, sp, cls) => {
    const tx = el("text", { x: Math.min(W - 120, Math.max(120, X(sp))), y: Y(sp) - (night ? 26 : 74), "text-anchor": "middle", class: `rp-word ${cls || ""}`,
      "font-family": "IM Fell English, serif", "font-style": "italic", "font-size": night ? 12 : 17, fill: cls === "x" ? red : ink }, words);
    tx.textContent = text.length > 52 ? text.slice(0, 50) + "…" : text;
    setTimeout(() => tx.remove(), STEP_MS * 2.6);
  };

  function reset() {
    lilies.replaceChildren();
    words.replaceChildren();
    soul.classList.remove("rp-gone", "rp-home");
    pos = first;
    i = 0;
    place(pos, true);
    label.textContent = reached ? "" : (S.result ? L("never reached", "未曾抵達") : L("not yet reached", "尚未抵達"));
    svg.classList.toggle("rp-waiting", !reached);
  }

  function tick() {
    if (!alive || !host.isConnected) { stop(); return; }
    if (!reached) return;
    if (i >= steps.length) {
      timer = setTimeout(() => { svg.classList.add("rp-fadeout"); setTimeout(() => { svg.classList.remove("rp-fadeout"); reset(); timer = setTimeout(tick, 600); }, 900); }, HOLD_MS);
      return;
    }
    const e = steps[i++];
    label.textContent = L(`Turn ${e.t}`, `第${e.t}回合`);
    soul.classList.remove("rp-flicker", "rp-pulse", "rp-crack");
    void soul.getBBox?.();
    if (e.k === "m") {
      if (e.b > 0) lily(e.f);
      pos = e.to;
      place(pos);
    } else if (e.k === "p") {
      pos = e.to;
      place(pos);
      rise(L("pulled back toward the living", "被拉回生者的方向"), pos);
    } else if (e.k === "w") soul.classList.add("rp-pulse");
    else if (e.k === "l") { soul.classList.add("rp-flicker"); rise(L("forgets…", "遺忘了…"), pos); }
    else if (e.k === "x") { soul.classList.add("rp-crack"); rise(L("a Fracture", "一道裂痕"), pos, "x"); }
    else if (e.k === "i") rise(L(`“${cardBand(e.cid)}”`, `「${cardBand(e.cid)}」`), pos);
    else if (e.k === "win") soul.classList.add("rp-home");
    else if (e.k === "end") { soul.classList.add("rp-gone"); rise((zh() ? { Faded: "消散", Shattered: "破碎", Deluge: "被洪水吞沒", Stalled: "靜止" } : { Faded: "faded", Shattered: "shattered", Deluge: "lost to the flood", Stalled: "still" })[e.cause] || "", pos, "x"); }
    timer = setTimeout(tick, e.k === "i" ? STEP_MS * 1.6 : STEP_MS);
  }

  function stop() {
    alive = false;
    clearTimeout(timer);
    running.delete(stop);
  }
  running.add(stop);
  reset();
  timer = setTimeout(tick, 700);
  return stop;
}

export function stopAllReplays() { for (const s of [...running]) s(); }
