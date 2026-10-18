// The two crossings between the menu and a table, animated from paintings made for them in the game's own style
// (art/masters/scene-*.png; web copies in assets/art/scene-*.webp):
//   ferry   (menu to a table): you are in the boat. The ferryman stands at the bow before you, pole in hand; the boat
//           rocks, his cloak stirs, the river slides past on both sides as you go forward, and far ahead the Light of
//           the Far Shore kindles. Then everything burns away to ash, the banks, the river, the boat and the ferryman,
//           until only the Light is left; the dark closes in, and opens on the table.
//   bearer  (a table back to the menu): a hooded figure stands facing you before the river of the world, a lantern
//           in his hand, and its light grows until it fills the screen.

export const FERRY_END = 6.4, BEARER_END = 5.6;
const ART = n => `/assets/art/${n}.webp`;
const imgs = {};
function img(name) {
  if (!imgs[name]) { const im = new Image(); im.decoding = "async"; im.src = ART(name); imgs[name] = im; }
  return imgs[name];
}
const ready = im => im.complete && im.naturalWidth > 0;
// Loaded at start, so a crossing never waits for its paintings.
export function preloadScenes() { ["scene-river", "scene-boat", "scene-pole", "scene-bearer", "cover-f"].forEach(img); }

// The ferry painting (1680 × 944): the vanishing point where the Far Shore's light is, the boat's lantern, and the
// water's edges (the banks are everything else below the treeline).
const VP = [0.602, 0.321], BOAT_LANTERN = [0.548, 0.742], HORIZON = 0.345;
// The river, as a polygon in the painting's fractions: from the far end at the light, widening toward us.
const RIVER = [[0.48, 0.345], [0.66, 0.345], [0.72, 0.39], [0.8, 0.47], [0.86, 0.6], [0.92, 0.72], [1.0, 0.8], [1.0, 1.0], [0.07, 1.0], [0.08, 0.6], [0.1, 0.53], [0.2, 0.45], [0.35, 0.385]];
// The ferryman's pole, kept straight apart from his stirring cloak: where his hand holds it (painting pixels), the way
// it runs down into the water, and the straightened strip of its wood (14 × 700), 150 of it above his hand.
const HAND = [781, 268], POLE_DIR = [0.161, 0.987], POLE_LEN = 700, POLE_W = 14, POLE_ABOVE = 150, GUNWALE = 0.66;
// The lantern-bearer: the last frame (facing you) of his turnaround sheet (5 × 5 frames of 440 × 600), and where his
// lantern's flame is in it.
const BEARER = { fw: 440, fh: 600, cols: 5, frame: 24, flame: [315, 511] };

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

// A painting cut into cells in its own pixels, each catching fire at its own moment (when(u, v, colour), or null to
// never burn): it glows, chars, and gives off ash. char and heat are small maps of the cells, drawn smoothed over it.
const CELL = 6;
function burner(src, iw, ih, when) {
  const o = layer(iw, ih).getContext("2d", { willReadFrequently: true });
  o.drawImage(src, 0, 0);
  const px = o.getImageData(0, 0, iw, ih).data, gw = Math.ceil(iw / CELL), gh = Math.ceil(ih / CELL);
  const char = layer(gw, gh), heat = layer(gw, gh), cells = [];
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const x = Math.min(iw - 1, gx * CELL + 3), y = Math.min(ih - 1, gy * CELL + 3), i = (y * iw + x) * 4;
    if (px[i + 3] < 16) continue;
    const at = when(x / iw, y / ih, px[i] + px[i + 1] + px[i + 2]);
    if (at != null) cells.push({ k: gy * gw + gx, u: x / iw, v: y / ih, at, col: [px[i], px[i + 1], px[i + 2]], gone: false });
  }
  return { cells, char, heat, ci: char.getContext("2d").createImageData(gw, gh), hi: heat.getContext("2d").createImageData(gw, gh),
    w: gw * CELL, h: gh * CELL };
}
function burn(b, t, glowA, ashRate, emit) {
  const cd = b.ci.data, hd = b.hi.data;
  for (const cl of b.cells) {
    const k = t - cl.at;
    if (k <= 0) continue;
    const j = cl.k * 4, burnt = clamp01(k / 0.45), heat = k < 0.4 ? Math.sin(Math.PI * k / 0.4) : 0;
    cd[j] = INK[0]; cd[j + 1] = INK[1]; cd[j + 2] = INK[2]; cd[j + 3] = Math.round(255 * burnt ** 1.2);
    hd[j] = 215; hd[j + 1] = Math.round(45 + 55 * heat); hd[j + 2] = 20; hd[j + 3] = Math.round(255 * heat * glowA);
    if (k > 0.3 && !cl.gone) { cl.gone = true; if (Math.random() < ashRate) emit(cl); }
  }
  b.char.getContext("2d").putImageData(b.ci, 0, 0); b.heat.getContext("2d").putImageData(b.hi, 0, 0);
}

// ------------------------------------------------------------------ the ferry
export function ferry(host, speed) {
  const c = canvasFor(host);
  if (!c) return;
  const { g, W, H, dpr } = c;
  const river = img("scene-river"), boat = img("scene-boat"), pole = img("scene-pole");
  let R = null;                         // where the painting sits: covering the screen, the ferryman and the light kept in view
  const place = () => {
    const iw = river.naturalWidth, ih = river.naturalHeight, k = Math.max(W / iw, H / ih), dw = iw * k, dh = ih * k;
    R = { dx: Math.min(0, Math.max(W - dw, W / 2 - (W < H ? 0.49 : 0.45) * dw)), dy: Math.min(0, Math.max(H - dh, H * 0.42 - VP[1] * dh)), dw, dh, iw, ih };
  };
  const at = (u, v) => [R.dx + u * R.dw, R.dy + v * R.dh];
  // everything burns: the outer shores first, then the river from the far end toward you, then the boat and the
  // ferryman from the waterline up; only the Light of the Far Shore is left
  let land, hull, poleL, boatL;
  const ash = [];
  const kindle = () => {
    land = burner(river, R.iw, R.ih, (u, v, lum) => lum < 60 ? null : inPoly(u, v, RIVER)   // the black night does not burn
      ? 3.75 + clamp01((v - HORIZON) / (1 - HORIZON)) * 0.6 + noise2(u * 9, v * 9) * 0.35
      : (v < 0.03 ? null : 3.3 + (1 - clamp01(Math.abs(u - VP[0]) / 0.6)) * 0.8 + noise2(u * 9, v * 9) * 0.45));
    // the pole in its place in the painting, so it burns with him
    poleL = layer(R.iw, R.ih);
    const p = poleL.getContext("2d");
    p.translate(HAND[0] - POLE_DIR[0] * POLE_ABOVE, HAND[1] - POLE_DIR[1] * POLE_ABOVE); p.rotate(Math.atan2(POLE_DIR[1], POLE_DIR[0]) - Math.PI / 2);
    p.drawImage(pole, -POLE_W / 2, 0, POLE_W, POLE_LEN);
    const both = layer(R.iw, R.ih), bo = both.getContext("2d");
    bo.drawImage(poleL, 0, 0); bo.drawImage(boat, 0, 0);
    hull = burner(both, R.iw, R.ih, (u, v) => 4.2 + (1 - v) * 0.65 + noise2(u * 11, v * 11) * 0.3);
    boatL = [layer(R.iw, R.ih), layer(R.iw, R.ih)];
  };
  // a layer (the boat or the pole) as it burns: glowing where the fire is, gone where it has passed
  const burning = (out, src) => {
    const o = out.getContext("2d");
    o.globalCompositeOperation = "source-over"; o.clearRect(0, 0, R.iw, R.ih); o.drawImage(src, 0, 0);
    o.imageSmoothingEnabled = true;
    o.globalCompositeOperation = "source-atop"; o.drawImage(hull.heat, 0, 0, hull.w, hull.h);
    o.globalCompositeOperation = "destination-out"; o.drawImage(hull.char, 0, 0, hull.w, hull.h);
    return out;
  };
  const spark = (x, y, col) => ash.push({ x, y, vx: (Math.random() - 0.5) * 24 * dpr, vy: -(16 + Math.random() * 46) * dpr,
    life: 1.2 + Math.random() * 1.5, age: 0, s: (1 + Math.random() * 1.8) * dpr, col });

  run(c, speed, FERRY_END, (t, dt) => {
    g.globalCompositeOperation = "source-over";
    g.fillStyle = rgba(INK, 1); g.fillRect(0, 0, W, H);
    if (!R) { if (ready(river) && ready(boat) && ready(pole)) { place(); kindle(); } else return; }
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
    // the banks and the river burning
    if (t > 3.2) {
      burn(land, t, 0.24, 0.07, cl => { const [sx, sy] = at(cl.u, cl.v); spark(vx + (sx - vx) * fwd, vy + (sy - vy) * fwd, cl.col); });
      g.imageSmoothingEnabled = true;
      const sw = land.w / R.iw * R.dw, sh = land.h / R.ih * R.dh;
      g.drawImage(land.char, R.dx, R.dy, sw, sh);
      g.globalCompositeOperation = "lighter"; g.drawImage(land.heat, R.dx, R.dy, sw, sh); g.globalCompositeOperation = "source-over";
    }
    g.restore();
    // the Light of the Far Shore, kindling far ahead
    const light = ease((t - 1.6) / 2.0) * (1 - ease((t - 5.2) / 0.6));
    glow(g, vx, vy, Math.min(W, H) * (0.05 + 0.2 * light), [255, 240, 205], 0.75 * light * (0.94 + 0.06 * Math.sin(t * 6)));
    mist(g, W, H, horizon + (H - horizon) * 0.25, H * 0.05, 0.1 * come, t, 0.02, 0.4);
    // the boat, with you in it: it comes up into view, then rocks; the ferryman's cloak stirs in the wind off the water
    const rise = (1 - ease((t - 0.1) / 1.4)) * H * 0.08;
    const bob = Math.sin(t * 1.7) * H * 0.006, roll = Math.sin(t * 1.15) * 0.007;
    const cut = R.dy + GUNWALE * R.dh, aflame = t > 4.1;
    if (aflame) burn(hull, t, 0.4, 0.12, cl => { const [sx, sy] = at(cl.u, cl.v); spark(sx, sy + bob, cl.col); });
    const hullImg = aflame ? burning(boatL[0], boat) : boat;
    g.save();
    g.translate(W / 2, H + rise + bob); g.rotate(roll); g.translate(-W / 2, -H);
    // the pole held still in his hand, behind the boat
    g.globalAlpha = come;
    g.drawImage(aflame ? burning(boatL[1], poleL) : poleL, R.dx, R.dy, R.dw, R.dh);
    g.globalAlpha = 1;
    const band = 4 * dpr;                                       // above the gunwale, the cloak and the ferryman, in rows
    for (let y = Math.max(0, R.dy); y < cut; y += band) {
      const v = (y - R.dy) / R.dh, sway = Math.sin(t * 2.1 + v * 14) * dpr * 3 * clamp01((v - 0.08) / 0.5);
      g.drawImage(hullImg, 0, v * R.ih, R.iw, band / R.dh * R.ih + 1, R.dx + sway, y, R.dw, band + 1);
    }
    g.drawImage(hullImg, 0, GUNWALE * R.ih, R.iw, (1 - GUNWALE) * R.ih, R.dx, cut, R.dw, (1 - GUNWALE) * R.dh);
    const [lx, ly] = at(...BOAT_LANTERN);
    glow(g, lx, ly, Math.min(W, H) * 0.09, GOLD, 0.35 * come * (1 - ease((t - 4.3) / 0.5)) * (0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 5.3)));
    g.restore();
    // ash rising off everything burnt
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
  const sheet = img("scene-bearer"), world = img("cover-f");
  // close on him: from the hood down past the lantern, filling the height of the screen
  // (on a tall screen he may overflow the sides a little, and stands in the middle of the height)
  const k = Math.min(H * 1.02 / BEARER.fh, W * (W < H ? 1.3 : 0.95) / BEARER.fw), fw = BEARER.fw * k, fh = BEARER.fh * k;
  const x0 = (W - fw) / 2, y0 = Math.max(H * 0.01, (H - fh) * 0.42);
  const lx = x0 + BEARER.flame[0] * k, ly = y0 + BEARER.flame[1] * k;
  let fig = null;                       // him, once, with his feet going into the dark below the lantern
  run(c, speed, BEARER_END, t => {
    g.globalCompositeOperation = "source-over";
    g.fillStyle = rgba(INK, 1); g.fillRect(0, 0, W, H);
    if (!ready(sheet) || !ready(world)) return;
    if (!fig) {
      fig = layer(Math.ceil(fw), Math.ceil(fh));
      const f = fig.getContext("2d");
      f.drawImage(sheet, (BEARER.frame % BEARER.cols) * BEARER.fw, Math.floor(BEARER.frame / BEARER.cols) * BEARER.fh, BEARER.fw, BEARER.fh, 0, 0, fig.width, fig.height);
      const fade = f.createLinearGradient(0, fh * 0.72, 0, fh);
      fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(1, "rgba(0,0,0,1)");
      f.globalCompositeOperation = "destination-out"; f.fillStyle = fade; f.fillRect(0, fh * 0.72, fig.width, fig.height);
    }
    const come = ease((t - 0.2) / 1.2);
    // the world behind him: the river of forgetting under the night, its banks of Netherbloom, dim and drawing slowly in
    const wk = Math.max(W / world.naturalWidth, H / world.naturalHeight) * (1.04 + 0.03 * t / BEARER_END);
    const ww = world.naturalWidth * wk, wh = world.naturalHeight * wk;
    g.globalAlpha = 0.6 * come;
    g.drawImage(world, (W - ww) / 2, Math.min(0, H * 0.4 - wh * 0.45), ww, wh);
    g.globalAlpha = 1;
    const shade = g.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, rgba(INK, 0.35)); shade.addColorStop(0.7, rgba(INK, 0.7)); shade.addColorStop(1, rgba(INK, 0.95));
    g.fillStyle = shade; g.fillRect(0, 0, W, H);
    mist(g, W, H, H * 0.62, H * 0.06, 0.1 * come, t, 0.012, 0.6);
    // him, standing still, facing you
    g.globalAlpha = come;
    g.drawImage(fig, x0, y0, fw, fh);
    g.globalAlpha = 1;
    mist(g, W, H, H * 0.92, H * 0.07, 0.12 * come, t, 0.015, 0.2);
    // the lantern's light, brighter and brighter until it fills the screen
    const fl = 0.88 + 0.12 * Math.sin(t * 11) * Math.sin(t * 4.7);
    glow(g, lx, ly, m * 0.15, [255, 226, 170], 0.5 * come * fl);
    const bright = clamp01((t - 2.0) / 2.2) ** 1.7;
    if (bright > 0) {
      glow(g, lx, ly, m * (0.12 + 1.7 * bright), [255, 244, 214], Math.min(1, 0.5 + 0.5 * bright));
      const wash = clamp01((t - 3.7) / 0.7) ** 1.4;
      if (wash > 0) { g.fillStyle = rgba(BONE, 0.94 * wash); g.fillRect(0, 0, W, H); }
    }
    // and clears onto the menu
    const gone = ease((t - 4.7) / 0.8);
    if (gone > 0) { g.globalCompositeOperation = "destination-out"; g.fillStyle = `rgba(0,0,0,${gone.toFixed(3)})`; g.fillRect(0, 0, W, H); }
  });
}
