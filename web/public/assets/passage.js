// Page changes as crossings between the world of the living and the river.
//   arrive: after signing in, out of the dark into the game's world (the bloom opens, the title, the mist parts)
//   down:   the menu to a table, and
//   up:     a table back to the menu: red, a white flash, a Netherbloom that burns, its ash falling into the dark
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

// Down to a table and back up again, as one rite on a canvas (seconds of the standard crossing):
//   0.0  red      the old page flies at us as red floods in, embers rushing past out of the middle
//   0.8  white    a flash opens from the centre and holds, pale and warm
//   1.1  bloom    a Netherbloom draws itself on the white, petal by petal
//   1.9  burning  it catches at the tips and burns inward, glowing; the white chars to black around it
//   2.6  ash      what has burnt falls away as ash, drifting out into the dark
//   3.6  open     the dark opens from the centre onto the next page
const T = { red: 0.9, white: 0.8, full: 1.15, bloom: 1.1, drawn: 2.0, burn: 1.9, burnt: 3.0, dark: 2.9, open: 3.6, end: 4.3 };
const lerp = (a, b, x) => a + (b - a) * Math.max(0, Math.min(1, x));
const mix = (c1, c2, x) => c1.map((v, i) => Math.round(lerp(v, c2[i], x)));
const WHITE = [234, 224, 210], CHAR = [9, 7, 9], CRIMSON = [215, 38, 61], HOT = [255, 160, 70];
export const RITE_SECONDS = T.end;

// The bloom as strokes of points, in the 48-unit box of the game's symbol (centre 24,26): six petals, six threads.
function bloomStrokes() {
  const rot = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a); return [24 + (x - 24) * c - (y - 26) * s, 26 + (x - 24) * s + (y - 26) * c]; };
  const petals = [0, 60, 120, 180, 240, 300].map(d => {
    const a = d * Math.PI / 180, pts = [];
    for (let i = 0; i <= 36; i++) {
      const t = i / 36, m = 1 - t;
      const x = m * m * m * 24 + 3 * m * m * t * 30 + 3 * m * t * t * 33 + t * t * t * 31;
      const y = m * m * m * 26 + 3 * m * m * t * 22 + 3 * m * t * t * 15 + t * t * t * 9;
      pts.push(rot(x, y, a));
    }
    return { pts, w: 1.5 };
  });
  const threads = [[19, 4], [42, 13], [44, 34], [6, 36], [4, 14], [30, 47]].map(([x, y]) => ({
    pts: Array.from({ length: 19 }, (_, i) => [24 + (x - 24) * i / 18, 26 + (y - 26) * i / 18]), w: 0.6, tip: [x, y] }));
  return [...petals, ...threads];
}

function rite(host, kind, speed) {
  const cv = document.createElement("canvas"), g = cv.getContext("2d");
  if (!g) return;
  host.appendChild(cv);
  const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth * dpr, H = innerHeight * dpr;
  cv.width = W; cv.height = H;
  const cx = W / 2, cy = H / 2, sc = Math.min(W, H) * 0.6 / 44, diag = Math.hypot(W, H) / 2, f = Math.max(W, H) * 0.42;
  const P = ([x, y]) => [cx + (x - 24) * sc, cy + (y - 26) * sc];
  // Each point burns at its own moment: the tips first, the heart last, with a little flicker.
  const strokes = bloomStrokes().map(st => ({ ...st, pts: st.pts.map(p => {
    const d = Math.hypot(p[0] - 24, p[1] - 26) / 23;
    return { at: P(p), burn: T.burn + (1 - Math.min(1, d)) * 0.75 + Math.random() * 0.12, gone: false };
  }) }));
  const ash = [];
  // The embers rushing past in the red: depth-projected streaks out of the centre.
  const rush = Array.from({ length: 180 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: 0.05 + Math.random() * 0.95, w: 0.6 + Math.random() * 1.6, hot: Math.random() < 0.3 }));
  const t0 = performance.now();
  let last = t0;
  const frame = now => {
    if (!cv.isConnected) return;
    const t = (now - t0) / 1000 / speed, dt = Math.min(0.05, (now - last) / 1000 / speed);
    last = now;
    if (t >= T.end) return;
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = "source-over";

    // ground: red over the old page, the white flash opening, then charring to black
    if (t < T.full) {
      const a = Math.min(0.94, (t / T.red) ** 1.4);
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, diag);
      rg.addColorStop(0, `rgba(150,14,32,${a})`); rg.addColorStop(1, `rgba(40,3,9,${a})`);
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    if (t >= T.white) {
      const r = diag * 1.2 * Math.min(1, (t - T.white) / (T.full - T.white)) ** 0.8;
      const burnt = (t - T.dark + 1) / 1.0;           // 0 at the burn's start, 1 when charred
      const col = burnt <= 0 ? WHITE : burnt < 0.5 ? mix(WHITE, [120, 40, 30], burnt * 2) : mix([120, 40, 30], CHAR, (burnt - 0.5) * 2);
      if (t < T.full) {
        const wg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r));
        wg.addColorStop(0, `rgb(${col})`); wg.addColorStop(0.75, `rgba(${col},0.9)`); wg.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = wg;
      } else g.fillStyle = `rgb(${col})`;
      g.fillRect(0, 0, W, H);
    }

    // embers rushing past while the red floods in
    if (t < 1.3) {
      const v = 2.2 * Math.min(1, t / 0.4), alpha = t < 1 ? 1 : 1 - (t - 1) / 0.3;
      g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      for (const a of rush) {
        const zp = a.z;
        a.z -= v * dt * (0.6 + a.w * 0.25);
        if (a.z < 0.03) Object.assign(a, { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: 1 });
        const px = cx + a.x / a.z * f, py = cy + a.y / a.z * f, zt = Math.min(1, zp + v * 0.04);
        const near = 1 - a.z, c = a.hot ? [255, 120, 60] : CRIMSON;
        g.strokeStyle = `rgba(${c},${(alpha * Math.min(1, near * near * 1.5 + 0.05)).toFixed(3)})`;
        g.lineWidth = Math.min(4 * dpr, a.w * dpr * (0.3 + near * 2));
        g.beginPath(); g.moveTo(cx + a.x / zt * f, cy + a.y / zt * f); g.lineTo(px, py); g.stroke();
      }
      g.globalCompositeOperation = "source-over";
    }

    // the bloom: drawn in, then burning point by point from the tips
    if (t >= T.bloom && t < T.burnt + 0.3) {
      const drawn = Math.min(1, (t - T.bloom) / (T.drawn - T.bloom));
      g.lineCap = "round";
      for (const st of strokes) {
        const n = Math.max(1, Math.ceil(st.pts.length * drawn));
        for (let i = 1; i < n; i++) {
          const a = st.pts[i - 1], b = st.pts[i], k = t - b.burn;
          if (k > 0.32) {
            if (!b.gone) {
              b.gone = true;
              for (let j = 0; j < 5; j++) {
                const dx = b.at[0] - cx, dy = b.at[1] - cy, dl = Math.hypot(dx, dy) || 1, sp = (14 + Math.random() * 46) * dpr;
                ash.push({ x: b.at[0], y: b.at[1], vx: dx / dl * sp + (Math.random() - 0.5) * 30 * dpr, vy: dy / dl * sp - (10 + Math.random() * 25) * dpr,
                  life: 1.1 + Math.random() * 1.3, age: 0, s: (0.9 + Math.random() * 2) * dpr });
              }
            }
            continue;
          }
          const fl = 0.85 + Math.random() * 0.15;
          const col = k < 0 ? CRIMSON : k < 0.16 ? mix(CRIMSON, HOT, k / 0.16) : mix(HOT, [70, 20, 14], (k - 0.16) / 0.16);
          const w = st.w * sc * (k < 0 ? 1 : 1 + k * 0.8);
          if (k >= 0) {
            g.globalCompositeOperation = "lighter";
            g.strokeStyle = `rgba(255,110,40,${(0.18 * fl).toFixed(3)})`; g.lineWidth = w * 1.8;
            g.beginPath(); g.moveTo(...a.at); g.lineTo(...b.at); g.stroke();
            g.globalCompositeOperation = "source-over";
          }
          g.strokeStyle = `rgb(${col})`; g.lineWidth = w;
          g.beginPath(); g.moveTo(...a.at); g.lineTo(...b.at); g.stroke();
        }
        if (st.tip && drawn >= 1) {
          const tp = st.pts[st.pts.length - 1];
          if (!tp.gone) { g.fillStyle = `rgb(${t < tp.burn ? CRIMSON : HOT})`; g.beginPath(); g.arc(...tp.at, 1.2 * sc, 0, 7); g.fill(); }
        }
      }
      const heart = Math.min(...strokes.map(st => st.pts[0].burn));
      if (t < heart + 0.3) { g.fillStyle = `rgb(${t < heart ? CRIMSON : HOT})`; g.beginPath(); g.arc(cx, cy, 2 * sc * Math.min(1, drawn * 3), 0, 7); g.fill(); }
    }

    // ash drifting out into the dark: embers cooling to grey as they fade
    g.globalCompositeOperation = "lighter";
    for (let i = ash.length - 1; i >= 0; i--) {
      const a = ash[i];
      a.age += dt;
      if (a.age > a.life) { ash.splice(i, 1); continue; }
      a.x += a.vx * dt; a.y += a.vy * dt; a.vx *= 0.985; a.vy = a.vy * 0.985 - 4 * dpr * dt;
      const u = a.age / a.life, c = mix([255, 130, 60], [120, 112, 106], u * 1.6);
      g.fillStyle = `rgba(${c},${(1 - u) ** 1.3 * 0.9})`;
      g.fillRect(a.x, a.y, a.s, a.s);
    }
    g.globalCompositeOperation = "source-over";

    // the dark opens from the centre onto the next page
    if (t > T.open) {
      const r = diag * 1.4 * ((t - T.open) / (T.end - T.open)) ** 1.3, soft = diag * 0.5;
      const hole = g.createRadialGradient(cx, cy, Math.max(0, r - soft), cx, cy, Math.max(1, r));
      hole.addColorStop(0, "rgba(0,0,0,1)"); hole.addColorStop(1, "rgba(0,0,0,0)");
      g.globalCompositeOperation = "destination-out";
      g.fillStyle = hole; g.fillRect(0, 0, W, H);
      if (r - soft > 0) { g.beginPath(); g.arc(cx, cy, r - soft, 0, 7); g.fill(); }
      g.globalCompositeOperation = "source-over";
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
  const ms = (kind === "arrive" ? 4600 : RITE_SECONDS * 1000) * speed;
  const pz = document.createElement("div");
  pz.className = `passage pz-${kind}`;
  pz.style.setProperty("--k", speed);
  pz.setAttribute("aria-hidden", "true");
  if (kind !== "arrive") pz.appendChild(snapshot());
  pz.insertAdjacentHTML("beforeend", `<div class="pz-dark"></div><div class="pz-surface"></div><div class="pz-motes"></div><div class="pz-glow"></div>
    ${kind === "arrive" ? `<div class="pz-mark">${LILY}<div class="pz-title">${title}</div><div class="pz-sub">${sub}</div></div>` : ""}
    ${line ? `<div class="pz-line">${line}</div>` : ""}<div class="pz-mist"><span></span><span></span><span></span></div>`);
  if (kind === "arrive") streaks(pz.querySelector(".pz-motes"), 18, "ember");
  else rite(pz.querySelector(".pz-motes"), kind, speed);
  document.body.appendChild(pz);
  busyUntil = performance.now() + ms;
  draw();
  const skip = () => { busyUntil = 0; pz.remove(); };
  pz.addEventListener("pointerdown", skip, { once: true });
  setTimeout(() => sound?.(), 300 * speed);
  setTimeout(() => { if (pz.isConnected) skip(); }, ms + 50);
}
