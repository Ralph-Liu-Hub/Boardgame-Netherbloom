// Page changes as crossings between the world of the living and the river.
//   arrive: after signing in, out of the dark into the game's world (the bloom opens, the title, the mist parts)
//   down:   the menu to a table: the ferryman's boat rises out of the dark, the river and its banks with it, the Light
//           of the Far Shore kindles, and the banks burn away to ash
//   up:     a table back to the menu: the hooded figure with the lantern, whose light grows until it fills the screen
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

// Down to a table and back up again, each a scene painted from the game's own art on a canvas.
//   down (to a table), from the box cover: out of the dark the ferryman's boat comes up from the bottom of the screen;
//        the water and the banks rise into view with the figures and the Netherblooms; far down the river the Light of
//        the Far Shore kindles; then everything on the banks burns away into ash, the rest sinks into the dark, and the
//        dark opens on the table.
//   up (back to the menu), from the Nameless soul's last painting: the hooded figure with the lantern comes out of the
//        dark from the middle of the screen, and the lantern's light grows brighter and brighter until it fills the
//        screen, then clears onto the menu.
const SCENE = {
  down: { art: "cover-f", end: 5.6, focus: [0.42, 0.62], light: [0.62, 0.6] },
  up: { art: "nameless-lethe", end: 4.6, lantern: [0.53, 0.645] },
};
export const sceneSeconds = kind => SCENE[kind].end;
const lerp = (a, b, x) => a + (b - a) * Math.max(0, Math.min(1, x));
const mix = (c1, c2, x) => c1.map((v, i) => Math.round(lerp(v, c2[i], x)));
const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => { x = clamp01(x); return 1 - (1 - x) ** 3; };
const HOT = [255, 150, 60], CHAR = [8, 6, 8];
const paintings = {};
function painting(name) {
  if (!paintings[name]) { const im = new Image(); im.decoding = "async"; im.src = `/assets/art/${name}.webp`; paintings[name] = im; }
  return paintings[name];
}
// Load the two paintings early, so a crossing never waits on them.
export function preloadScenes() { Object.values(SCENE).forEach(sc => painting(sc.art)); }

// On the cover, the banks: the left shore with its lantern-bearer, and the right shore with the great bloom and the
// far figure (the boat, its lantern, the water and the ferryman are not bank).
// The edges are roughened with noise, so the fire takes ragged ground rather than a box.
const onBank = (u, v, n) => v > 0.22 + 0.06 * n && (
  u < 0.17 + 0.12 * n && v > 0.4 && v < 0.7 - u * 0.4 + 0.06 * n ||          // left shore, sloping down to the water
  u > 0.58 + 0.08 * n && v < 0.6 + (u - 0.6) * 0.55 + 0.06 * n);           // right shore along its diagonal edge
// Smooth value noise in [0, 1], for burn fronts that creep like fire.
function noise(x, y) {
  const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(h(i, j), h(i + 1, j), sx), lerp(h(i, j + 1), h(i + 1, j + 1), sx), sy);
}

function scene(host, kind, speed) {
  const cv = document.createElement("canvas"), g = cv.getContext("2d");
  if (!g) return;
  host.appendChild(cv);
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
  cv.width = W; cv.height = H;
  const buf = document.createElement("canvas"); buf.width = W; buf.height = H;
  const b = buf.getContext("2d");
  const S = SCENE[kind], img = painting(S.art), m = Math.min(W, H), cx = W / 2, cy = H / 2;
  // Where the painting sits when still: covering the screen (down), or standing tall in the middle (up).
  let rect = null;
  const place = () => {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (kind === "down") {
      // cover the screen, but on a tall screen keep most of the painting's width (both shores) and stand it on the
      // bottom edge, the night sky above it running on into the dark
      const k = Math.min(Math.max(W / iw, H / ih), W / (iw * 0.8)), dw = iw * k, dh = ih * k;
      const dx = Math.min(0, Math.max(W - dw, W / 2 - S.focus[0] * dw));
      const dy = dh >= H ? Math.min(0, Math.max(H - dh, H / 2 - S.focus[1] * dh)) : H - dh;
      rect = { dx, dy, dw, dh };
    } else {
      const k = Math.min(W * 0.92 / iw, H * 0.92 / ih), dw = iw * k, dh = ih * k;
      rect = { dx: (W - dw) / 2, dy: (H - dh) / 2, dw, dh };
    }
  };
  const at = (u, v) => [rect.dx + u * rect.dw, rect.dy + v * rect.dh];
  let cells = null, ash = [], gw = 0, gh = 0, charMap = null, heatMap = null, charImg = null, heatImg = null;
  const c = Math.round(5 * dpr);
  // The bank, cut into small cells that each catch, glow and fall to ash at their own moment: the outer shores first.
  const cutBanks = () => {
    b.clearRect(0, 0, W, H);
    b.drawImage(img, rect.dx, rect.dy, rect.dw, rect.dh);
    const px = b.getImageData(0, 0, W, H).data;
    cells = [];
    gw = Math.ceil(W / c); gh = Math.ceil(H / c);
    const mk = () => { const m = document.createElement("canvas"); m.width = gw; m.height = gh; return m; };
    charMap = mk(); heatMap = mk();
    charImg = charMap.getContext("2d").createImageData(gw, gh); heatImg = heatMap.getContext("2d").createImageData(gw, gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const x = gx * c + c / 2, y = gy * c + c / 2, u = (x - rect.dx) / rect.dw, v = (y - rect.dy) / rect.dh;
      const n = noise(u * 7, v * 7) * 0.7 + noise(u * 23, v * 23) * 0.3;
      if (!onBank(u, v, n - 0.5)) continue;
      const i = (Math.min(H - 1, Math.round(y)) * W + Math.min(W - 1, Math.round(x))) * 4, col = [px[i], px[i + 1], px[i + 2]];
      if (col[0] + col[1] + col[2] < 70) continue;   // the black of the night sky does not burn
      const reach = u < 0.5 ? (0.17 - u) / 0.17 : (u - 0.6) / 0.4;   // 1 at the outer edge, 0 by the water
      cells.push({ k: gy * gw + gx, x, y, at: 3.15 + (1 - clamp01(reach)) * 0.7 + noise(u * 5 + 7, v * 5) * 0.6, col, gone: false });
    }
  };
  const t0 = performance.now();
  let last = t0;
  const frame = now => {
    if (!cv.isConnected) return;
    const t = (now - t0) / 1000 / speed, dt = Math.min(0.05, (now - last) / 1000 / speed);
    last = now;
    if (t >= S.end) return;
    if (!rect && img.complete && img.naturalWidth) place();
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, W, H);
    // the old page goes dark (coming up, the dark clears with the light at the end)
    const clear = kind === "up" ? 1 - clamp01((t - 3.9) / 0.7) : 1;
    g.fillStyle = `rgba(${CHAR},${Math.min(1, t / 0.6) * clear})`;
    g.fillRect(0, 0, W, H);
    if (rect && kind === "down") down(t, dt);
    if (rect && kind === "up") up(t);
    requestAnimationFrame(frame);
  };

  const down = (t, dt) => {
    const e = ease((t - 0.35) / 2.0);
    const s = 0.86 + 0.14 * e, ty = (1 - e) * 0.38 * H;
    b.globalCompositeOperation = "source-over";
    b.clearRect(0, 0, W, H);
    b.save();
    b.translate(cx, cy + ty); b.scale(s, s); b.translate(-cx, -cy);
    b.drawImage(img, rect.dx, rect.dy, rect.dw, rect.dh);
    b.restore();
    // still dim while it rises, full by the time it has arrived
    b.fillStyle = `rgba(${CHAR},${0.55 * (1 - ease((t - 0.4) / 2.2))})`;
    b.fillRect(0, 0, W, H);
    // the Light of the Far Shore, kindling far down the river
    const L = ease((t - 2.0) / 1.5) * (1 - clamp01((t - 4.5) / 0.6)) * (0.92 + 0.08 * Math.sin(t * 7));
    if (L > 0) {
      const [lx, ly] = at(...S.light), r = m * (0.05 + 0.3 * L);
      const lg = b.createRadialGradient(lx, ly, 0, lx, ly, r);
      lg.addColorStop(0, `rgba(255,236,190,${0.85 * L})`); lg.addColorStop(0.25, `rgba(255,200,120,${0.45 * L})`); lg.addColorStop(1, "rgba(255,160,80,0)");
      b.globalCompositeOperation = "lighter"; b.fillStyle = lg; b.fillRect(0, 0, W, H);
      b.globalCompositeOperation = "source-over";
    }
    // the banks burn away
    if (t > 3.0) {
      if (!cells) cutBanks(), b.clearRect(0, 0, W, H), b.drawImage(img, rect.dx, rect.dy, rect.dw, rect.dh);
      // each cell: a glow that comes and goes as it burns, and char that stays; drawn small and smoothed up, so
      // the fire has soft ragged edges
      const cd = charImg.data, hd = heatImg.data;
      for (const cl of cells) {
        const k = t - cl.at;
        if (k <= 0) continue;
        // a thin line of fire: it glows for a moment as the char takes the cell
        const j = cl.k * 4, burnt = clamp01(k / 0.35), heat = k < 0.3 ? Math.sin(Math.PI * k / 0.3) : 0;
        cd[j] = CHAR[0]; cd[j + 1] = CHAR[1]; cd[j + 2] = CHAR[2]; cd[j + 3] = Math.round(255 * burnt ** 1.3);
        hd[j] = 255; hd[j + 1] = Math.round(70 + 70 * heat); hd[j + 2] = 25; hd[j + 3] = Math.round(255 * heat * 0.55);
        if (k > 0.35 && !cl.gone) {
          cl.gone = true;
          if (Math.random() < 0.55) ash.push({ x: cl.x, y: cl.y, vx: (Math.random() - 0.5) * 30 * dpr, vy: -(18 + Math.random() * 50) * dpr,
            life: 1.4 + Math.random() * 1.4, age: 0, s: (1 + Math.random() * 2) * dpr, col: cl.col });
        }
      }
      charMap.getContext("2d").putImageData(charImg, 0, 0);
      heatMap.getContext("2d").putImageData(heatImg, 0, 0);
      b.imageSmoothingEnabled = true;
      b.drawImage(charMap, 0, 0, gw * c, gh * c);
      b.globalCompositeOperation = "lighter";
      b.drawImage(heatMap, 0, 0, gw * c, gh * c);
      b.globalCompositeOperation = "source-over";
    }
    // what is left sinks into the dark
    const dark = clamp01((t - 4.3) / 0.8);
    if (dark > 0) { b.fillStyle = `rgba(${CHAR},${dark})`; b.fillRect(0, 0, W, H); }
    // it comes up from the bottom of the screen: only what has risen into view shows
    const edge = H * (1.05 - 1.5 * ease((t - 0.45) / 2.4)), soft = H * 0.35;
    const mg = b.createLinearGradient(0, edge - soft, 0, edge);
    mg.addColorStop(0, "rgba(0,0,0,0)"); mg.addColorStop(1, "rgba(0,0,0,1)");
    b.globalCompositeOperation = "destination-in"; b.fillStyle = mg; b.fillRect(0, 0, W, H);
    b.globalCompositeOperation = "source-over";
    g.drawImage(buf, 0, 0);
    // ash drifting up off the banks, embers cooling to the colour of what burnt, then grey
    g.globalCompositeOperation = "lighter";
    for (let i = ash.length - 1; i >= 0; i--) {
      const a = ash[i];
      a.age += dt;
      if (a.age > a.life) { ash.splice(i, 1); continue; }
      a.x += a.vx * dt; a.y += a.vy * dt; a.vx += (Math.random() - 0.5) * 40 * dpr * dt;
      const u = a.age / a.life, col = u < 0.3 ? mix(HOT, a.col.map(v => v + 40), u / 0.3) : mix(a.col.map(v => v + 40), [110, 104, 100], (u - 0.3) / 0.7);
      g.fillStyle = `rgba(${col},${((1 - u) ** 1.2 * 0.85).toFixed(3)})`;
      g.fillRect(a.x, a.y, a.s, a.s);
    }
    g.globalCompositeOperation = "source-over";
    openOnto(t, 5.0);
  };

  const up = t => {
    // the hooded figure comes out of the dark from the middle of the screen
    const e = ease((t - 0.3) / 2.4), s = 0.55 + 0.45 * e;
    b.globalCompositeOperation = "source-over";
    b.clearRect(0, 0, W, H);
    b.save();
    b.translate(cx, cy); b.scale(s, s); b.translate(-cx, -cy);
    b.drawImage(img, rect.dx, rect.dy, rect.dw, rect.dh);
    b.restore();
    // seen through an oval of light that opens from the middle and never shows the painting's edges
    const R = rect.dw * s * (0.12 + 0.46 * e), asp = rect.dh / rect.dw;
    b.save();
    b.translate(cx, cy); b.scale(1, asp);
    const mg = b.createRadialGradient(0, 0, R * 0.45, 0, 0, R);
    mg.addColorStop(0, `rgba(0,0,0,${ease((t - 0.3) / 1.6)})`); mg.addColorStop(1, "rgba(0,0,0,0)");
    b.globalCompositeOperation = "destination-in"; b.fillStyle = mg; b.fillRect(-W, -H / asp, 2 * W, 2 * H / asp);
    b.restore();
    b.globalCompositeOperation = "source-over";
    const fade = 1 - clamp01((t - 3.9) / 0.7);
    g.globalAlpha = fade;
    g.drawImage(buf, 0, 0);
    // the lantern's light, brighter and brighter until it fills the screen
    const lx = cx + (rect.dx + S.lantern[0] * rect.dw - cx) * s, ly = cy + (rect.dy + S.lantern[1] * rect.dh - cy) * s;
    const I = clamp01((t - 0.9) / 2.9) ** 1.6 * (0.94 + 0.06 * Math.sin(t * 9));
    if (I > 0) {
      const r = m * (0.04 + 1.6 * I ** 1.4);
      const lg = g.createRadialGradient(lx, ly, 0, lx, ly, r);
      lg.addColorStop(0, `rgba(255,240,205,${Math.min(1, 0.6 + 0.4 * I)})`); lg.addColorStop(0.3, `rgba(255,205,130,${0.55 * I})`); lg.addColorStop(1, "rgba(255,170,90,0)");
      g.globalCompositeOperation = "lighter"; g.fillStyle = lg; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = "source-over";
      const wash = clamp01((t - 2.9) / 0.9) ** 1.5;
      if (wash > 0) { g.fillStyle = `rgba(244,232,206,${0.92 * wash})`; g.fillRect(0, 0, W, H); }
    }
    g.globalAlpha = 1;
  };

  // the dark opens from the middle onto the next page
  const openOnto = (t, from) => {
    if (t <= from) return;
    const diag = Math.hypot(W, H) / 2, r = diag * 1.4 * ((t - from) / (S.end - from)) ** 1.3, soft = diag * 0.5;
    const hole = g.createRadialGradient(cx, cy, Math.max(0, r - soft), cx, cy, Math.max(1, r));
    hole.addColorStop(0, "rgba(0,0,0,1)"); hole.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = hole; g.fillRect(0, 0, W, H);
    if (r - soft > 0) { g.beginPath(); g.arc(cx, cy, r - soft, 0, 7); g.fill(); }
    g.globalCompositeOperation = "source-over";
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
  const ms = (kind === "arrive" ? 4600 : sceneSeconds(kind) * 1000) * speed;
  const pz = document.createElement("div");
  pz.className = `passage pz-${kind}`;
  pz.style.setProperty("--k", speed);
  pz.setAttribute("aria-hidden", "true");
  if (kind !== "arrive") pz.appendChild(snapshot());
  pz.insertAdjacentHTML("beforeend", `<div class="pz-dark"></div><div class="pz-surface"></div><div class="pz-motes"></div><div class="pz-glow"></div>
    ${kind === "arrive" ? `<div class="pz-mark">${LILY}<div class="pz-title">${title}</div><div class="pz-sub">${sub}</div></div>` : ""}
    ${line ? `<div class="pz-line">${line}</div>` : ""}<div class="pz-mist"><span></span><span></span><span></span></div>`);
  if (kind === "arrive") streaks(pz.querySelector(".pz-motes"), 18, "ember");
  else scene(pz.querySelector(".pz-motes"), kind, speed);
  document.body.appendChild(pz);
  busyUntil = performance.now() + ms;
  draw();
  const skip = () => { busyUntil = 0; pz.remove(); };
  pz.addEventListener("pointerdown", skip, { once: true });
  setTimeout(() => sound?.(), 300 * speed);
  setTimeout(() => { if (pz.isConnected) skip(); }, ms + 50);
}
