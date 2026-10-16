// Builds the PARKED components: the story cards and Nameless Souls module from the Soul Roster v3 and Card Compendium v0.2,
// plus the Book of Crossings pad and the Ending Gallery. They are not in the factory files, the manual or the box,
// because the rulebook and the web game have no rules for them yet. Output: print/out/factory/<en|zh-TW>/parked/.
//   node print/factory/parked.mjs [--lang en|zh] [--png]
import { join } from "node:path";
import { OUT, render, closeBrowser, doc } from "./lib.mjs";
import { T, CW, CH, parts } from "./cards.mjs";
import { compendiumDecks, compendiumBacks, COMP_CSS } from "./compendium.mjs";
import { build as extras } from "./extras.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const langs = arg("--lang", "all") === "all" ? ["en", "zh"] : [arg("--lang")];
const png = process.argv.includes("--png");
const cardDoc = (lang, title, pages) => doc({ lang, title, w: CW, h: CH, css: parts.CSS + COMP_CSS, pages });

for (const lang of langs) {
  const dir = join(OUT, lang === "zh" ? "zh-TW" : "en", "parked");
  for (const [file, cards] of compendiumDecks(lang, { ...parts, T })) await render(join(dir, file), cardDoc(lang, file, cards), { w: CW, h: CH, png });
  await render(join(dir, "card-backs"), cardDoc(lang, "card-backs", compendiumBacks(lang)), { w: CW, h: CH, png });
  await extras(lang, dir, { png });
}
await closeBrowser();
