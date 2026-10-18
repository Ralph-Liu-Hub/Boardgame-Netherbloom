// The two crossings between the menu and a table, animated from paintings made for them in the game's own style
// (art/masters/scene-*.png; web copies in assets/art/scene-*.webp):
//   ferry   (menu to a table): you are in the boat. The ferryman stands at the bow before you, poling; the boat rocks,
//           his cloak stirs, the river slides past on both sides as you go forward, and far ahead the Light of the Far
//           Shore kindles. Then the banks burn away to ash, the dark closes in, and opens on the table.
//   bearer  (a table back to the menu): a hooded figure stands in the mist with his back to you, a lantern in his
//           hand. He turns round to face you, and the lantern's light grows until it fills the screen.

export const FERRY_END = 6.4, BEARER_END = 5.4;
const ART = n => `/assets/art/${n}.webp`;
const imgs = {};
function img(name) {
  if (!imgs[name]) { const im = new Image(); im.decoding = "async"; im.src = ART(name); imgs[name] = im; }
  return imgs[name];
}
const ready = im => im.complete && im.naturalWidth > 0;
// Loaded at start, so a crossing never waits for its paintings.
export function preloadScenes() { ["scene-river", "scene-boat", "scene-bearer"].forEach(img); }

// The ferry painting (1680 × 944): the vanishing point where the Far Shore's light is, the boat's lantern, and the
// water's edges (the banks are everything else below the treeline).
const VP = [0.602, 0.321], BOAT_LANTERN = [0.548, 0.742], HORIZON = 0.345;
// The river, as a polygon in the painting's fractions: from the far end at the light, widening toward us.
const RIVER = [[0.48, 0.345], [0.66, 0.345], [0.72, 0.39], [0.8, 0.47], [0.86, 0.6], [0.92, 0.72], [1.0, 0.8], [1.0, 1.0], [0.07, 1.0], [0.08, 0.6], [0.1, 0.53], [0.2, 0.45], [0.35, 0.385]];
// The five poses of the lantern-bearer on their strip (x, width, centre of mass, lantern), all 785 px tall.
const POSES = [
  { sx: 6, sw: 369, cx: 187.7, lx: 330, ly: 417 }, { sx: 387, sw: 333, cx: 165.7, lx: 292, ly: 424 },
  { sx: 732, sw: 272, cx: 153.7, lx: 229, ly: 461 }, { sx: 1016, sw: 323, cx: 138.7, lx: 158, ly: 452 },
  { sx: 1351, sw: 358, cx: 179, lx: 275, ly: 488 },
];
const POSE_H = 785, POSE_PAD = 6;

const clamp01 = x => Math.max(0, Math.min(1, x));
const lerp = (a, b, x) => a + (b - a) * clamp01(x);
const ease = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const mix = (c1, c2, x) => c1.map((v, i) => Math.round(lerp(v, c2[i], x)));
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const INK = [8, 7, 10], GOLD = [255, 200, 120], BONE = [240, 228, 204], HOT = [255, 140, 50];
function noise2(x, y) {
  const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(h(i, j), h(i + 1, j), sx), lerp(h(i, j + 1), h(i + 1, j + 1), sx), sy);
}
function inPoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function canvasFor(host) {
  const cv = document.createElement("canvas"), g = cv.getContext("2d");
  if (!g) return null;
  host.appendChild(cv);
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  return { cv, g, dpr, W: cv.width, H: cv.height };
}
function layer(W, H) { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; }
function run(c, speed, end, draw) {
  const t0 = performance.now();
  let last = t0;
  const frame = now => {
    if (!c.cv.isConnected) return;
    const t = (now - t0) / 1000 / speed, dt = Math.min(0.05, (now - last) / 1000 / speed);
    last = now;
    if (t >= end) return;
    draw(t, dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
// Mist: soft long banks of fog drifting sideways.
function mist(g, W, H, y, h, a, t, speed, seed) {
  for (let i = 0; i < 4; i++) {
    const x = ((i * 0.37 + seed + t * speed) % 1.6 - 0.3) * W, w = W * (0.5 + 0.2 * Math.sin(i + seed * 3));
    const mg = g.createRadialGradient(x, y, 0, x, y, w * 0.5);
    mg.addColorStop(0, rgba([120, 114, 112], a)); mg.addColorStop(1, rgba([120, 114, 112], 0));
    g.save(); g.translate(x, y); g.scale(1, h / (w * 0.5)); g.translate(-x, -y);
    g.fillStyle = mg; g.fillRect(x - w / 2, y - w / 2, w, w);
    g.restore();
  }
}
function glow(g, x, y, r, inner, a) {
  if (a <= 0 || r <= 0) return;
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, rgba(inner, a)); rg.addColorStop(0.3, rgba([255, 170, 90], a * 0.45)); rg.addColorStop(1, rgba(GOLD, 0));
  g.globalCompositeOperation = "lighter"; g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.globalCompositeOperation = "source-over";
}
// The dark opening from the middle onto the next page.
function openOnto(g, W, H, p) {
  if (p <= 0) return;
  const cx = W / 2, cy = H / 2, diag = Math.hypot(W, H) / 2, r = diag * 1.4 * p ** 1.3, soft = diag * 0.5;
  const hole = g.createRadialGradient(cx, cy, Math.max(0, r - soft), cx, cy, Math.max(1, r));
  hole.addColorStop(0, "rgba(0,0,0,1)"); hole.addColorStop(1, "rgba(0,0,0,0)");
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = hole; g.fillRect(0, 0, W, H);
  if (r - soft > 0) { g.beginPath(); g.arc(cx, cy, r - soft, 0, 7); g.fill(); }
  g.globalCompositeOperation = "source-over";
}

// ------------------------------------------------------------------ the ferry
export function ferry(host, speed) {
  const c = canvasFor(host);
  if (!c) return;
  const { g, W, H, dpr } = c;
  const river = img("scene-river"), boat = img("scene-boat");
  let R = null;                         // where the painting sits: covering the screen, the ferryman and the light kept in view
  const place = () => {
    const iw = river.naturalWidth, ih = river.naturalHeight, k = Math.max(W / iw, H / ih), dw = iw * k, dh = ih * k;
    R = { dx: Math.min(0, Math.max(W - dw, W / 2 - (W < H ? 0.49 : 0.45) * dw)), dy: Math.min(0, Math.max(H - dh, H * 0.42 - VP[1] * dh)), dw, dh, iw, ih };
  };
  const at = (u, v) => [R.dx + u * R.dw, R.dy + v * R.dh];
  // the banks' cells, in the painting's own pixels, each burning at its own moment from the outer edges inward
  const CELL = 6;
  let cells = null, gw = 0, gh = 0, charMap, heatMap, charImg, heatImg;
  const ash = [];
  const cutBanks = () => {
    const off = layer(R.iw, R.ih), o = off.getContext("2d");
    o.drawImage(river, 0, 0);
    const px = o.getImageData(0, 0, R.iw, R.ih).data;
    gw = Math.ceil(R.iw / CELL); gh = Math.ceil(R.ih / CELL);
    charMap = layer(gw, gh); heatMap = layer(gw, gh);
    charImg = charMap.getContext("2d").createImageData(gw, gh); heatImg = heatMap.getContext("2d").createImageData(gw, gh);
    cells = [];
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const x = Math.min(R.iw - 1, gx * CELL + 3), y = Math.min(R.ih - 1, gy * CELL + 3), u = x / R.iw, v = y / R.ih;
      if (inPoly(u, v, RIVER) || v < 0.03) continue;
      const i = (y * R.iw + x) * 4, col = [px[i], px[i + 1], px[i + 2]];
      if (col[0] + col[1] + col[2] < 60) continue;           // the black of the night sky does not burn
      const edge = Math.abs(u - VP[0]) / 0.6;                  // the outer shores first, the river's edges last
      cells.push({ k: gy * gw + gx, u, v, at: 3.7 + (1 - clamp01(edge)) * 0.9 + noise2(u * 9, v * 9) * 0.5, col, gone: false });
    }
  };

  run(c, speed, FERRY_END, (t, dt) => {
    g.globalCompositeOperation = "source-over";
    g.fillStyle = rgba(INK, 1); g.fillRect(0, 0, W, H);
    if (!R) { if (ready(river) && ready(boat)) place(); else return; }
    const come = ease((t - 0.15) / 1.3);
    const [vx, vy] = at(...VP);
    // the river and its banks, sliding toward you as the boat goes forward (a slow push from the vanishing point)
    const fwd = 1 + 0.16 * ease(t / FERRY_END) ** 0.9;
    g.save();
    g.translate(vx, vy); g.scale(fwd, fwd); g.translate(-vx, -vy);
    // the water ripples: below the horizon the painting is drawn in thin rows, each nudged by a wave rolling toward you
    const horizon = R.dy + HORIZON * R.dh, rows = Math.ceil((R.dy + R.dh - horizon) / (3 * dpr));
    g.drawImage(river, 0, 0, R.iw, HORIZON * R.ih, R.dx, R.dy, R.dw, HORIZON * R.dh);
    for (let i = 0; i < rows; i++) {
      const y0 = horizon + i * 3 * dpr, v0 = (y0 - R.dy) / R.dh, depth = (v0 - HORIZON) / (1 - HORIZON);
      const off = Math.sin(v0 * 90 / (0.15 + depth) - t * 3.2) * dpr * (0.4 + 2.2 * depth);
      g.drawImage(river, 0, v0 * R.ih, R.iw, (3 * dpr / R.dh) * R.ih + 1, R.dx + off, y0, R.dw, 3 * dpr + 1);
    }
    // the banks burning
    if (t > 3.5) {
      if (!cells) cutBanks();
      const cd = charImg.data, hd = heatImg.data;
      for (const cl of cells) {
        const k = t - cl.at;
        if (k <= 0) continue;
        const j = cl.k * 4, burnt = clamp01(k / 0.45), heat = k < 0.4 ? Math.sin(Math.PI * k / 0.4) : 0;
        cd[j] = INK[0]; cd[j + 1] = INK[1]; cd[j + 2] = INK[2]; cd[j + 3] = Math.round(255 * burnt ** 1.2);
        hd[j] = 230; hd[j + 1] = Math.round(60 + 60 * heat); hd[j + 2] = 25; hd[j + 3] = Math.round(255 * heat * 0.4);
        if (k > 0.3 && !cl.gone) {
          cl.gone = true;
          if (Math.random() < 0.45) {
            const [sx, sy] = at(cl.u, cl.v);
            ash.push({ x: vx + (sx - vx) * fwd, y: vy + (sy - vy) * fwd, vx: (Math.random() - 0.5) * 24 * dpr, vy: -(16 + Math.random() * 46) * dpr,
              life: 1.2 + Math.random() * 1.5, age: 0, s: (1 + Math.random() * 1.8) * dpr, col: cl.col });
          }
        }
      }
      charMap.getContext("2d").putImageData(charImg, 0, 0); heatMap.getContext("2d").putImageData(heatImg, 0, 0);
      g.imageSmoothingEnabled = true;
      const sw = gw * CELL / R.iw * R.dw, sh = gh * CELL / R.ih * R.dh;
      g.drawImage(charMap, R.dx, R.dy, sw, sh);
      g.globalCompositeOperation = "lighter"; g.drawImage(heatMap, R.dx, R.dy, sw, sh); g.globalCompositeOperation = "source-over";
    }
    g.restore();
    // the Light of the Far Shore, kindling far ahead
    const light = ease((t - 1.6) / 2.0) * (1 - ease((t - 5.2) / 0.6));
    glow(g, vx, vy, Math.min(W, H) * (0.05 + 0.2 * light), [255, 240, 205], 0.75 * light * (0.94 + 0.06 * Math.sin(t * 6)));
    mist(g, W, H, horizon + (H - horizon) * 0.25, H * 0.05, 0.1 * come, t, 0.02, 0.4);
    // the boat, with you in it: it comes up into view, then rocks; the ferryman's cloak stirs in the wind off the water
    const rise = (1 - ease((t - 0.1) / 1.4)) * H * 0.08;
    const bob = Math.sin(t * 1.7) * H * 0.006, roll = Math.sin(t * 1.15) * 0.007;
    g.save();
    g.translate(W / 2, H + rise + bob); g.rotate(roll); g.translate(-W / 2, -H);
    const cut = R.dy + 0.66 * R.dh, band = 4 * dpr;           // above the gunwale, the cloak and the ferryman, in rows
    for (let y = Math.max(0, R.dy); y < cut; y += band) {
      const v = (y - R.dy) / R.dh, sway = Math.sin(t * 2.1 + v * 14) * dpr * 3 * clamp01((v - 0.08) / 0.5);
      g.drawImage(boat, 0, v * R.ih, R.iw, band / R.dh * R.ih + 1, R.dx + sway, y, R.dw, band + 1);
    }
    g.drawImage(boat, 0, 0.66 * R.ih, R.iw, 0.34 * R.ih, R.dx, cut, R.dw, 0.34 * R.dh);
    const [lx, ly] = at(...BOAT_LANTERN);
    glow(g, lx, ly, Math.min(W, H) * 0.09, GOLD, 0.35 * come * (0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 5.3)));
    g.restore();
    // ash rising off the burnt banks
    g.globalCompositeOperation = "lighter";
    for (let i = ash.length - 1; i >= 0; i--) {
      const a = ash[i];
      a.age += dt;
      if (a.age > a.life) { ash.splice(i, 1); continue; }
      a.x += a.vx * dt; a.y += a.vy * dt; a.vx += (Math.random() - 0.5) * 40 * dpr * dt;
      const u = a.age / a.life, base = a.col.map(v => Math.min(255, v + 60));
      g.fillStyle = rgba(u < 0.25 ? mix(HOT, base, u / 0.25) : mix(base, [110, 104, 100], (u - 0.25) / 0.75), (1 - u) ** 1.2 * 0.85);
      g.fillRect(a.x, a.y, a.s, a.s);
    }
    g.globalCompositeOperation = "source-over";
    // out of the dark at the start, into it at the end; then the dark opens on the table
    const dark = Math.max(1 - come, ease((t - 5.0) / 0.7) * 0.97);
    if (dark > 0) { g.fillStyle = rgba(INK, dark); g.fillRect(0, 0, W, H); }
    openOnto(g, W, H, (t - 5.7) / (FERRY_END - 5.7));
  });
}

// ------------------------------------------------------------------ the lantern-bearer
export function bearer(host, speed) {
  const c = canvasFor(host);
  if (!c) return;
  const { g, W, H } = c, m = Math.min(W, H);
  const sheet = img("scene-bearer");
  const fh = Math.min(H * 0.74, W * 1.35), k = fh / POSE_H, footY = H * 0.88, cx = W / 2;
  // pose i drawn with its centre of mass on the middle of the screen and its feet on the ground
  const where = i => { const p = POSES[i]; return { x: cx - p.cx * k, y: footY - fh, lx: cx + (p.lx - p.cx) * k, ly: footY - fh + p.ly * k }; };
  run(c, speed, BEARER_END, t => {
    g.globalCompositeOperation = "source-over";
    const clear = 1 - ease((t - 4.6) / 0.8);
    g.clearRect(0, 0, W, H);
    g.fillStyle = rgba(INK, clear); g.fillRect(0, 0, W, H);
    if (!ready(sheet)) return;
    g.globalAlpha = clear;
    const come = ease((t - 0.3) / 1.4);
    // the ground he stands on, faintly, and mist about his feet
    g.save();
    g.translate(cx, footY); g.scale(1, 0.12);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.45);
    gr.addColorStop(0, rgba([40, 36, 40], come)); gr.addColorStop(1, rgba([40, 36, 40], 0));
    g.fillStyle = gr; g.fillRect(-W * 0.5, -W * 0.5, W, W);
    g.restore();
    // his turn: from his back to you, round through the profile to facing you, each pose dissolving into the next
    const turn = clamp01((t - 1.7) / 1.5) * (POSES.length - 1), i0 = Math.floor(Math.min(turn, POSES.length - 1.001)), f = ease(turn - i0);
    const draw = (i, a) => {
      if (a <= 0) return;
      const p = POSES[i], w = where(i);
      g.globalAlpha = a * clear;
      g.drawImage(sheet, p.sx, POSE_PAD, p.sw, POSE_H, w.x, w.y, p.sw * k, fh);
    };
    draw(i0, come * (1 - f));
    draw(Math.min(POSES.length - 1, i0 + 1), come * f);
    g.globalAlpha = clear;
    mist(g, W, H, footY, H * 0.06, 0.14 * come, t, 0.015, 0.2);
    // the lantern burns as he turns, then he raises its light to you, brighter and brighter until it fills the screen
    const a = where(i0), b = where(Math.min(POSES.length - 1, i0 + 1));
    const lx = lerp(a.lx, b.lx, f), ly = lerp(a.ly, b.ly, f);
    const fl = 0.88 + 0.12 * Math.sin(t * 11) * Math.sin(t * 4.7);
    glow(g, lx, ly, m * 0.11, [255, 226, 170], 0.45 * come * fl);
    const bright = clamp01((t - 3.2) / 1.3) ** 1.7;
    if (bright > 0) {
      glow(g, lx, ly, m * (0.1 + 1.7 * bright), [255, 244, 214], Math.min(1, 0.5 + 0.5 * bright));
      const wash = clamp01((t - 4.0) / 0.6) ** 1.4;
      if (wash > 0) { g.fillStyle = rgba(BONE, 0.94 * wash); g.fillRect(0, 0, W, H); }
    }
    g.globalAlpha = 1;
  });
}
