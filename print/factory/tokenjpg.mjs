// The tokens as single CMYK JPGs, one per side, for each edition:
//   node print/factory/tokenjpg.mjs   → print/out/factory/<en|zh-TW>/tokens/jpg/<Name> Front <n>.jpg and <Name> Back <n>.jpg
// Every JPG is the same square canvas (SINGLE mm at 600 dpi) with the token centred at true size, so a front and its back
// match exactly when placed on the same spot. Each page is rasterised (Poppler's pdftoppm), converted to CMYK through the
// press profile (icc/FOGRA39-argyll.icc, embedded) and saved at JPEG quality 100 without chroma subsampling (ImageMagick).
import { join } from "node:path";
import { mkdirSync, rmSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { OUT, doc, render, closeBrowser } from "./lib.mjs";
import { SINGLE, singlePages, TOKENS, BIG, SMALL, CUT_BLEED, TOKEN_NAMES } from "./tokens.mjs";

const DPI = 600, PROFILE = join(import.meta.dirname, "icc", "FOGRA39-argyll.icc"), SRGB = "/usr/share/color/icc/sRGB.icc";
for (const lang of ["en", "zh"]) {
  const dir = join(OUT, lang === "zh" ? "zh-TW" : "en", "tokens"), out = join(dir, "jpg"), tmp = join(dir, "png-tmp");
  const pages = singlePages();
  await render(join(dir, "token-singles"), doc({ lang, title: "Tokens, one side per page", w: SINGLE, h: SINGLE, css: ".pg > svg { display: block; width: 100%; height: 100%; }", pages }), { w: SINGLE, h: SINGLE });
  for (const d of [out, tmp, join(dir, "png")]) rmSync(d, { recursive: true, force: true });
  mkdirSync(out, { recursive: true }); mkdirSync(tmp, { recursive: true });
  // every page rasterised at the same size from the same page box, so fronts and backs are pixel-identical in size
  const px = Math.round(SINGLE / 25.4 * DPI);
  execFileSync("pdftoppm", ["-png", "-r", String(DPI), "-scale-to-x", String(px), "-scale-to-y", String(px), join(dir, "token-singles.pdf"), join(tmp, "p")]);
  const files = readdirSync(tmp).filter(f => f.startsWith("p-")).sort();
  if (files.length !== pages.length) throw new Error(`expected ${pages.length} pages, got ${files.length}`);
  // RGB → CMYK through the press profile, profile embedded, 600 dpi stamped, quality 100, no chroma subsampling
  files.forEach((f, i) => execFileSync("convert", [join(tmp, f), "-profile", SRGB, "-profile", PROFILE, "-quality", "100", "-sampling-factor", "1x1",
    "-units", "PixelsPerInch", "-density", String(DPI), join(out, `${pages[i].name}.jpg`)]));
  rmSync(tmp, { recursive: true, force: true });
  writeFileSync(join(out, "README.txt"), [
    "Netherbloom tokens, one CMYK JPG per side",
    "",
    `Every JPG: ${SINGLE} x ${SINGLE} mm canvas, ${px} x ${px} px at ${DPI} dpi, CMYK (Coated FOGRA39 profile embedded), JPEG quality 100, no chroma subsampling.`,
    "The token is centred on the canvas at true size. White around it is no ink.",
    `Cut: a circle of ${BIG} mm (large tokens) or ${SMALL} mm (small tokens) diameter, centred on the canvas. The art runs ${CUT_BLEED} mm past the cut.`,
    "Front and back of one token share a name: <Token> Front <n>.jpg and <Token> Back <n>.jpg. Place both on the same spot,",
    "centre on centre, back behind front, upright (head to head).",
    "",
    "Token, cut diameter, copies:",
    ...TOKENS.map(t => `  ${TOKEN_NAMES[t[0]]}: ${t[5]} mm, x${t[4]}`),
    `  Total: ${TOKENS.reduce((n, t) => n + t[4], 0)} tokens, ${pages.length} JPGs`,
  ].join("\n") + "\n");
  console.log("wrote", pages.length, "CMYK JPGs to", out);
}
await closeBrowser();
