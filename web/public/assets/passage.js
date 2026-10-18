// Page changes as crossings between the world of the living and the river.
//   arrive: after signing in, out of the dark into the game's world (the bloom opens, the title, the mist parts)
//   down:   the menu to a table: you are in the ferry, the ferryman before you, going down the river toward the Far
//           Shore's light, and the banks burn away to ash (scenes.js, ferry)
//   up:     a table back to the menu: a hooded figure turns round to face you, and his lantern's light grows until it
//           fills the screen (scenes.js, bearer)
// The new page is drawn at once underneath; the old one is shown as a still copy we fly through,
// so the game's state never waits on an animation.
import { ferry, bearer, FERRY_END, BEARER_END } from "./scenes.js";
export { preloadScenes } from "./scenes.js";

const LILY = `<svg class="pz-lily" viewBox="0 0 48 48" aria-hidden="true"><g class="pz-petals" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">${
  [0, 60, 120, 180, 240, 300].map(r => `<path pathLength="1" d="M24 26 C30 22 33 15 31 9" transform="rotate(${r} 24 26)"/>`).join("")
}</g><g class="pz-threads" stroke="currentColor" stroke-width="1.1" fill="none">${
  [[19, 4], [42, 13], [44, 34], [6, 36], [4, 14], [30, 47]].map(([x, y]) => `<path pathLength="1" d="M24 26 L${x} ${y}"/>`).join("")
}</g><g fill="currentColor">${
  [[19, 4], [42, 13], [44, 34], [6, 36], [4, 14], [30, 47]].map(([x, y]) => `<circle class="pz-tip" cx="${x}" cy="${y}" r="1.7"/>`).join("")
}<circle cx="24" cy="26" r="2.8"/></g></svg>`;

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let busyUntil = 0;

// How long the current crossing still covers the screen, in ms (0 when none is running).
export function passageLeft() { return Math.max(0, busyUntil - performance.now()); }

// The arrival's slow sparks rising out of the dark.
const MOTION = { ember: [3, 3.5] };
function streaks(host, n, cls) {
  const [d0, dv] = MOTION[cls];
  for (let i = 0; i < n; i++) {
    const s = document.createElement("i");
    s.className = cls;
    s.style.left = `${Math.random() * 100}%`;
    s.style.animationDelay = `${-Math.random() * d0}s`;
    s.style.animationDuration = `${d0 + Math.random() * dv}s`;
    s.style.setProperty("--len", `${20 + Math.random() * 70}px`);
    s.style.setProperty("--dx", `${(Math.random() - 0.5) * 60}px`);
    if (Math.random() < 0.4) s.classList.add("cy");
    host.appendChild(s);
  }
}

// A still copy of what is on screen now, to fly through while the next page is drawn underneath.
function snapshot() {
  const app = document.querySelector(".app"), bg = document.querySelector(".coverbg");
  const copy = document.createElement("div");
  copy.className = "pz-old";
  if (bg) copy.appendChild(bg.cloneNode(true));
  if (app) {
    const c = app.cloneNode(true);
    // Only the look is kept: no ids (the live page owns them), except inside <defs> so glows and gradients still draw.
    c.querySelectorAll("[id]").forEach(e => { if (!e.closest("defs")) e.removeAttribute("id"); });
    c.style.transform = `translateY(${-scrollY}px)`;
    copy.appendChild(c);
  }
  return copy;
}

// kind: "arrive" | "down" | "up". draw() puts the next page in place; it runs at once (arrive: already drawn).
// speed < 1 shortens the crossing (the Effects button's fast mode). line: words shown in the dark, if any.
export function passage(kind, draw = () => {}, { speed = 1, line = "", title = "", sub = "", sound } = {}) {
  document.documentElement.classList.remove("arriving");
  if (still() || passageLeft()) { draw(); return; }
  const ms = { arrive: 4600, down: FERRY_END * 1000, up: BEARER_END * 1000 }[kind] * speed;
  const pz = document.createElement("div");
  pz.className = `passage pz-${kind}`;
  pz.style.setProperty("--k", speed);
  pz.setAttribute("aria-hidden", "true");
  if (kind !== "arrive") pz.appendChild(snapshot());
  pz.insertAdjacentHTML("beforeend", `<div class="pz-dark"></div><div class="pz-surface"></div><div class="pz-motes"></div><div class="pz-glow"></div>
    ${kind === "arrive" ? `<div class="pz-mark">${LILY}<div class="pz-title">${title}</div><div class="pz-sub">${sub}</div></div>` : ""}
    ${line ? `<div class="pz-line">${line}</div>` : ""}<div class="pz-mist"><span></span><span></span><span></span></div>`);
  if (kind === "arrive") streaks(pz.querySelector(".pz-motes"), 18, "ember");
  else (kind === "down" ? ferry : bearer)(pz.querySelector(".pz-motes"), speed);
  document.body.appendChild(pz);
  busyUntil = performance.now() + ms;
  draw();
  const skip = () => { busyUntil = 0; pz.remove(); };
  pz.addEventListener("pointerdown", skip, { once: true });
  setTimeout(() => sound?.(), 300 * speed);
  setTimeout(() => { if (pz.isConnected) skip(); }, ms + 50);
}
