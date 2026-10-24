// Builds the factory (prototype manufacturing) files for Netherbloom in English and Traditional Chinese.
//   node print/factory/build.mjs                 → everything, both languages, PDFs
//   node print/factory/build.mjs --png           → also one 300 dpi PNG per card / piece
//   node print/factory/build.mjs --lang zh --only cards,board
// Output: print/out/factory/<en|zh-TW>/..., with MANUAL.pdf (the production manual for the factory) at the top (see print/factory/README.md). Needs playwright-core and Chromium
// (PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs, CHROMIUM_PATH=/path/to/chromium).
import { join } from "node:path";
import { OUT, render, closeBrowser } from "./lib.mjs";
import { decks, cardBacks, cardDoc, CW, CH } from "./cards.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const langs = (arg("--lang", "all") === "all" ? ["en", "zh"] : [arg("--lang")]);
const only = arg("--only", "cards,board,tiles,loom,ledger,tokens,box,books,rulebook,manual").split(",");
const png = process.argv.includes("--png");
const dirOf = lang => join(OUT, lang === "zh" ? "zh-TW" : "en");

for (const lang of langs) {
  const dir = dirOf(lang);
  if (only.includes("cards")) {
    for (const [file, cards] of decks(lang)) await render(join(dir, "cards", file), cardDoc(lang, file, cards), { w: CW, h: CH, png });
    await render(join(dir, "cards", "card-backs"), cardDoc(lang, "card-backs", cardBacks(lang)), { w: CW, h: CH, png });
  }
  for (const part of ["board", "tiles", "loom", "ledger", "tokens", "box", "books", "rulebook"]) {
    if (!only.includes(part)) continue;
    const mod = await import(`./${part}.mjs`).catch(e => (e.code === "ERR_MODULE_NOT_FOUND" ? null : Promise.reject(e)));
    if (mod) await mod.build(lang, join(dir, part), { png });
  }
  // the production manual last, at the top of the edition's folder, so it can read what was built
  if (only.includes("manual")) await (await import("./manual.mjs")).build(lang, dir, { png: false });
}
await closeBrowser();
