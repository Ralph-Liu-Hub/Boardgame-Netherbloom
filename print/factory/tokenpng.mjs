// The tokens as single PNGs, one per side, for each edition:
//   node print/factory/tokenpng.mjs   → print/out/factory/<en|zh-TW>/tokens/png/<Name> Front <n>.png and <Name> Back <n>.png
// Every PNG is the same square canvas (SINGLE mm at 600 dpi), lossless, with the token centred at true size, so a front
// and its back match exactly when placed on the same spot. Needs Chromium (as build.mjs) and Poppler's pdftoppm.
import { join } from "node:path";
import { mkdirSync, rmSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { OUT, doc, render, closeBrowser } from "./lib.mjs";
import { SINGLE, singlePages, TOKENS, BIG, SMALL, CUT_BLEED, TOKEN_NAMES } from "./tokens.mjs";

const DPI = 600;
for (const lang of ["en", "zh"]) {
  const dir = join(OUT, lang === "zh" ? "zh-TW" : "en", "tokens"), out = join(dir, "png");
  const pages = singlePages();
  await render(join(dir, "token-singles"), doc({ lang, title: "Tokens, one side per page", w: SINGLE, h: SINGLE, css: ".pg > svg { display: block; width: 100%; height: 100%; }", pages }), { w: SINGLE, h: SINGLE });
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  // every page rasterised at the same size from the same page box, so fronts and backs are pixel-identical in size
  const px = Math.round(SINGLE / 25.4 * DPI);
  execFileSync("pdftoppm", ["-png", "-r", String(DPI), "-scale-to-x", String(px), "-scale-to-y", String(px), join(dir, "token-singles.pdf"), join(out, "p")]);
  const files = readdirSync(out).filter(f => f.startsWith("p-")).sort();
  if (files.length !== pages.length) throw new Error(`expected ${pages.length} PNGs, got ${files.length}`);
  files.forEach((f, i) => renameSync(join(out, f), join(out, `${pages[i].name}.png`)));
  // stamp 600 dpi into every PNG so it opens at its true size
  execFileSync("python3", ["-c", `import sys,glob\nfrom PIL import Image\nfor f in glob.glob(sys.argv[1]+'/*.png'):\n  im=Image.open(f); im.save(f, dpi=(${DPI},${DPI}), optimize=True)`, out]);
  writeFileSync(join(out, "README.txt"), [
    "Netherbloom tokens, one PNG per side",
    "",
    `Every PNG: ${SINGLE} x ${SINGLE} mm canvas, ${px} x ${px} px at ${DPI} dpi, lossless (PNG), sRGB. Convert to CMYK with your press profile.`,
    "The token is centred on the canvas at true size. White around it is no ink.",
    `Cut: a circle of ${BIG} mm (large tokens) or ${SMALL} mm (small tokens) diameter, centred on the canvas. The art runs ${CUT_BLEED} mm past the cut.`,
    "Front and back of one token share a name: <Token> Front <n>.png and <Token> Back <n>.png. Place both on the same spot,",
    "centre on centre, back behind front, upright (head to head).",
    "",
    "Token, cut diameter, copies:",
    ...TOKENS.map(t => `  ${TOKEN_NAMES[t[0]]}: ${t[5]} mm, x${t[4]}`),
    `  Total: ${TOKENS.reduce((n, t) => n + t[4], 0)} tokens, ${pages.length} PNGs`,
  ].join("\n") + "\n");
  console.log("wrote", pages.length, "PNGs to", out);
}
await closeBrowser();
