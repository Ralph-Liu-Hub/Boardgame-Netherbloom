// Shared pieces for the factory files: paths, fonts, colours, the icon sprite, the two languages and the renderer.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const OUT = join(ROOT, "print/out/factory");
export const ART = join(ROOT, "art/masters");
export const SYMBOLS = readFileSync(join(ROOT, "web/public/assets/symbols.svg"), "utf8");

// Print geometry, in millimetres. Every piece is drawn with BLEED on each side; keep text SAFE inside the trim.
export const BLEED = 3, SAFE = 3;
export const DPI = 300;

export const C = { ink: "#0e0c11", ink2: "#17141b", ash: "#2a2530", bone: "#E6D3A3", paper: "#F2E8D5", mist: "#9A948C",
  crimson: "#D7263D", cyan: "#8FD6E1", gilt: "#8a6d48", water: "#0b1418" };
export const TAG_COL = [C.crimson, C.bone, C.cyan];
export const TAG_ICON = ["nb-obsession", "nb-acceptance", "nb-oblivion"];
export const SLOT_ICON = { Place: "nb-slot-place", Person: "nb-slot-person", Deed: "nb-slot-deed", Feeling: "nb-slot-feeling" };

export const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=IM+Fell+English:ital@0;1&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&family=Noto+Serif+TC:wght@400;600;700&family=LXGW+WenKai+TC&display=block">`;
// Per-language font stacks: English uses the design system's faces; Chinese sets everything in Noto Serif TC, the Book in WenKai.
export const FACE = {
  en: { display: `"IM Fell English SC", Georgia, serif`, serif: `"IM Fell English", Georgia, serif`, body: `"Alegreya Sans", sans-serif`, hand: `"IM Fell English", Georgia, serif`, mono: `"IBM Plex Mono", monospace` },
  zh: { display: `"Noto Serif TC", serif`, serif: `"Noto Serif TC", serif`, body: `"Noto Serif TC", serif`, hand: `"LXGW WenKai TC", "Noto Serif TC", serif`, mono: `"IBM Plex Mono", "Noto Serif TC", monospace` },
};

export const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const icon = (id, col = "currentColor", cls = "ic") => `<svg class="${cls}" style="color:${col}" aria-hidden="true"><use href="#${id}"/></svg>`;

// Art lives in art/masters as lossless PNG. The PDFs embed a quality-92 JPEG copy (same pixels, a tenth of the size),
// made once into print/out/factory/.art with ImageMagick; without ImageMagick the PNG is used as is.
// A missing painting returns null, and callers draw a dark wash instead so the build never breaks.
const CACHE = join(OUT, ".art");
// Upscaled print copies (art/print/<name>.jpg, 4x Real-ESRGAN) win over the masters where they exist.
export const PRINT_ART = join(ROOT, "art/print");
export function art(name) {
  const up = join(PRINT_ART, `${name}.jpg`);
  if (existsSync(up)) return "file://" + up;
  const png = join(ART, `${name}.png`);
  if (!existsSync(png)) return null;
  const jpg = join(CACHE, `${name}.jpg`);
  if (!existsSync(jpg)) {
    mkdirSync(CACHE, { recursive: true });
    try { execFileSync("convert", [png, "-quality", "92", "-sampling-factor", "4:4:4", jpg]); } catch { return "file://" + png; }
  }
  return "file://" + jpg;
}
// A painting faded into the Book's paper: sepia, 30% strength, edges dissolving into the paper colour. Baked into the JPEG
// rather than done with CSS blend modes and masks, which Chromium would rasterise into a much larger PDF.
export function ghostArt(name) {
  const png = join(ART, `${name}.png`);
  if (!existsSync(png)) return null;
  const jpg = join(CACHE, `${name}.ghost.jpg`);
  if (!existsSync(jpg)) {
    mkdirSync(CACHE, { recursive: true });
    try {
      execFileSync("convert", [png, "-sepia-tone", "75%", "-fill", "#efe5cf", "-modulate", "100,55", "-colorize", "80%", "-background", "#efe5cf", "-vignette", "0x180", "-quality", "90", jpg]);
    } catch { return null; }
  }
  return "file://" + jpg;
}

// Where each Soul's head sits in its painting: [top, bottom] as fractions of the image height, crown or hood included.
// A head is never cropped: wherever a painting is cut down to fit a frame, fitArt() below keeps this band in view.
export const HEADS = {
  "child-road": [.12, .25], "child-fields": [.18, .33], "child-lethe": [.15, .28],
  "garland-brook": [.13, .27], "garland-wade": [.13, .27], "garland-lethe": [.13, .24],
  "king-field": [.03, .20], "king-barge": [.17, .32], "king-lake": [.13, .30],
  "bride-wedding": [.05, .17], "bride-stair": [.08, .30], "bride-shore": [.08, .22],
  "nameless-road": [.13, .28], "nameless-mourners": [.12, .30], "nameless-lethe": [.12, .30],
  "soul-child": [.10, .42], "soul-garland": [.05, .28], "soul-king": [.04, .34], "soul-bride": [.03, .25], "soul-nameless": [.02, .25],
  "life-widow": [.09, .24], "life-physician": [.06, .30], "life-apprentice": [.08, .25], "life-lantern": [.22, .42],
  "life-soldier": [.12, .32], "life-player": [.11, .28], "life-merchant": [.10, .30], "life-gardener": [.27, .44],
};

// Runs in the page before printing. Plates (.plate) never get wider than 3:2, so a portrait painting is not sliced into a strip;
// then every cropped painting with a known head is shifted so the head and a little headroom stay in the frame. If even that
// cannot fit, the painting is shown whole (contain) on the frame's dark ground instead of losing the head.
export const FIT_SCRIPT = `<script>
window.__fit = () => {
  for (const p of document.querySelectorAll(".plate")) {
    const r = p.getBoundingClientRect();
    if (r.width > r.height * 1.5) { p.style.width = (r.height * 1.5) + "px"; p.style.alignSelf = "center"; }
  }
  for (const img of document.querySelectorAll("img[data-head]")) {
    const [t, b] = img.dataset.head.split(",").map(Number), W = img.clientWidth, H = img.clientHeight, w = img.naturalWidth, h = img.naturalHeight;
    if (!W || !H || !w || !h) continue;
    const v = H / (h * Math.max(W / w, H / h));          // visible fraction of the image height under object-fit: cover
    if (v >= .999) continue;                              // the full height shows; nothing to protect
    if (v < (b - t) + .06) { img.style.objectFit = "contain"; img.style.background = "#0e0c11"; continue; }
    let top = Math.max(0, t - .06);                       // a little headroom above the head
    if (top + v < b + .03) top = b + .03 - v;              // but never lose the chin
    top = Math.min(top, 1 - v);
    img.style.objectPosition = img.style.objectPosition.split(" ")[0] + " " + (top / (1 - v) * 100).toFixed(1) + "%";
  }
};
</script>`;

// An <img> that fills its positioned parent, or the dark wash when the painting is missing.
export const artImg = (name, pos = "50% 50%", cls = "ai") => {
  const src = art(name);
  return src ? `<img class="${cls}" src="${src}" style="object-position:${pos}"${HEADS[name] ? ` data-head="${HEADS[name]}"` : ""} alt="">`
    : `<div class="${cls}" style="background:radial-gradient(ellipse at 50% 60%, #3a2a30, #0e0c11 70%)"></div>`;
};
export const hasArt = name => existsSync(join(ART, `${name}.png`));

// One HTML document, its pages each exactly w x h mm (bleed included).
export function doc({ lang, title, w, h, css, pages }) {
  const f = FACE[lang];
  return `<!doctype html><html lang="${lang === "zh" ? "zh-Hant-TW" : "en"}"><head><meta charset="utf-8"><title>${esc(title)}</title>${FONTS}
<style>
@page { size: ${w}mm ${h}mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { --f-display: ${f.display}; --f-serif: ${f.serif}; --f-body: ${f.body}; --f-hand: ${f.hand}; --f-mono: ${f.mono}; font-family: var(--f-body); }
.pg { width: ${w}mm; height: ${h}mm; position: relative; overflow: hidden; break-after: page; page-break-after: always; }
.pg:last-child { break-after: auto; page-break-after: auto; }
.ic { width: 1em; height: 1em; flex: none; }
.ai { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
${css}
</style></head><body><div style="display:none">${SYMBOLS}</div>
${pages.map(p => `<section class="pg" data-name="${esc(p.name || "")}">${p.html}</section>`).join("\n")}
${FIT_SCRIPT}</body></html>`;
}

let browser;
async function chromium() {
  if (browser) return browser;
  const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  return browser;
}
export async function closeBrowser() { if (browser) await browser.close(); browser = null; }

// Wait for fonts and images, then let the page fit its paintings (heads in frame).
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    if (window.__fit) window.__fit();
  });
}

// Write the HTML, print it to PDF, and (with png) save every page as its own 300 dpi PNG named after data-name.
export async function render(file, html, { w, h, png = false } = {}) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file + ".html", html);
  const b = await chromium();
  const page = await b.newPage();
  await page.goto("file://" + file + ".html", { waitUntil: "networkidle" });
  await settle(page);
  await page.pdf({ path: file + ".pdf", width: `${w}mm`, height: `${h}mm`, printBackground: true, preferCSSPageSize: true });
  if (png) {
    const scale = DPI / 96;
    const shot = await b.newPage({ deviceScaleFactor: scale, viewport: { width: Math.ceil(w / 25.4 * 96), height: Math.ceil(h / 25.4 * 96) } });
    await shot.goto("file://" + file + ".html", { waitUntil: "networkidle" });
    await settle(shot);
    const dir = file + "_png";
    mkdirSync(dir, { recursive: true });
    const n = await shot.locator("section.pg").count();
    for (let i = 0; i < n; i++) {
      const el = shot.locator("section.pg").nth(i);
      const name = (await el.getAttribute("data-name")) || String(i + 1).padStart(3, "0");
      await el.screenshot({ path: join(dir, `${name}.png`) });
    }
    await shot.close();
  }
  await page.close();
  console.log("wrote", file.replace(ROOT + "/", "") + ".pdf", png ? "+ PNGs" : "");
}
