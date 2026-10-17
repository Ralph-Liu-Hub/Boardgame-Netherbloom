// Page changes as crossings between the world of the living and the river.
//   arrive: after signing in, out of the dark into the game's world (the bloom opens, the title, the mist parts)
//   down:   the menu to a table, rushing forward through a storm of ash into the red-black abyss
//   up:     a table back to the menu, rushing forward through the ash toward a pale light
// The new page is drawn at once underneath; the old one is shown as a still copy we fly through,
// so the game's state never waits on an animation.

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

// Ash rushing at us out of a vanishing point in the middle of the screen: each flake has a depth and is drawn as a
// streak from where it was a moment ago, so the faster we go the longer the streaks. Mostly pale ash, with embers
// (and on the way up, a cold glint or two). Speed swells, holds, then eases as we arrive.
const ASH = {
  down: [[226, 214, 196, 0.62], [160, 150, 142, 0.18], [215, 38, 61, 0.14], [255, 120, 70, 0.06]],
  up: [[236, 228, 210, 0.7], [180, 176, 170, 0.14], [143, 214, 225, 0.1], [215, 38, 61, 0.06]],
};
function ashStorm(host, kind, ms) {
  const cv = document.createElement("canvas"), g = cv.getContext("2d");
  if (!g) return;
  host.appendChild(cv);
  const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth * dpr, H = innerHeight * dpr;
  cv.width = W; cv.height = H;
  const cx = W / 2, cy = H / 2, f = Math.max(W, H) * 0.42;
  const pick = () => { let r = Math.random(); for (const c of ASH[kind]) { if ((r -= c[3]) <= 0) return c; } return ASH[kind][0]; };
  const spawn = (z = Math.random()) => {
    let x, y;
    do { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; } while (Math.abs(x) < 0.04 && Math.abs(y) < 0.04);
    return { x, y, z: 0.04 + z * 0.96, w: 0.5 + Math.random() * 1.8, c: pick(), ph: Math.random() * 6.28 };
  };
  const ash = Array.from({ length: Math.round(Math.min(520, Math.max(260, (innerWidth * innerHeight) / 2600))) }, () => spawn());
  const t0 = performance.now();
  let last = t0;
  const frame = now => {
    if (!cv.isConnected) return;
    const u = (now - t0) / ms, dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (u >= 1) return;
    // speed in depth per second, and the storm's overall brightness
    const v = 2.4 * (u < 0.22 ? (u / 0.22) ** 1.6 : u < 0.55 ? 1 : Math.max(0.12, 1 - (u - 0.55) / 0.35));
    const alpha = Math.min(1, u / 0.06) * (u < 0.72 ? 1 : Math.max(0, 1 - (u - 0.72) / 0.26));
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    for (let i = 0; i < ash.length; i++) {
      const a = ash[i], zPrev = a.z;
      a.z -= v * dt * (0.55 + a.w * 0.25);
      a.x += Math.sin(now / 400 + a.ph) * 0.0006;
      const px = cx + (a.x / a.z) * f, py = cy + (a.y / a.z) * f;
      if (a.z < 0.02 || px < -40 || px > W + 40 || py < -40 || py > H + 40) { ash[i] = spawn(1); continue; }
      const zt = Math.min(1, zPrev + v * 0.045);   // the streak's tail, a little deeper
      const tx = cx + (a.x / zt) * f, ty = cy + (a.y / zt) * f;
      const near = 1 - a.z;
      const [r, gg, b] = a.c;
      g.strokeStyle = `rgba(${r},${gg},${b},${(alpha * Math.min(1, near * near * 1.6 + 0.08)).toFixed(3)})`;
      g.lineWidth = Math.min(5 * dpr, a.w * dpr * (0.35 + near * 2.2));
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(px, py); g.stroke();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
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
  const ms = { arrive: 4600, down: 3400, up: 3200 }[kind] * speed;
  const pz = document.createElement("div");
  pz.className = `passage pz-${kind}`;
  pz.style.setProperty("--k", speed);
  pz.setAttribute("aria-hidden", "true");
  if (kind !== "arrive") pz.appendChild(snapshot());
  pz.insertAdjacentHTML("beforeend", `<div class="pz-dark"></div><div class="pz-surface"></div><div class="pz-motes"></div><div class="pz-glow"></div>
    ${kind === "arrive" ? `<div class="pz-mark">${LILY}<div class="pz-title">${title}</div><div class="pz-sub">${sub}</div></div>` : ""}
    ${line ? `<div class="pz-line">${line}</div>` : ""}<div class="pz-mist"><span></span><span></span><span></span></div>`);
  if (kind === "arrive") streaks(pz.querySelector(".pz-motes"), 18, "ember");
  else ashStorm(pz.querySelector(".pz-motes"), kind, ms);
  document.body.appendChild(pz);
  busyUntil = performance.now() + ms;
  draw();
  const skip = () => { busyUntil = 0; pz.remove(); };
  pz.addEventListener("pointerdown", skip, { once: true });
  setTimeout(() => sound?.(), 300 * speed);
  setTimeout(() => { if (pz.isConnected) skip(); }, ms + 50);
}
