// Exports the in-game Rulebook and Player Aid as standalone HTML documents (English and Traditional Chinese),
// for Google Docs or print. Icons are dropped because document converters do not keep inline SVG.
//   node print/build_rulebook.mjs   → print/out/netherbloom-rulebook.en.html, netherbloom-rulebook.zh-TW.html
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RULEBOOK, playerAid } from "../web/public/assets/rules.js";
import { RULEBOOK_ZH, playerAidZh } from "../web/public/assets/rules_zh.js";

const out = join(dirname(fileURLToPath(import.meta.url)), "out");
const noIcons = html => html.replace(/<svg[^>]*>.*?<\/svg>/gs, "");

function doc(lang, title, intro, book, aid) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${title}</title></head><body>
<h1>${title}</h1>
<p><i>${intro}</i></p>
${book.map(r => `<h2>${r.title}</h2>\n${noIcons(r.body)}`).join("\n")}
<h2>${lang === "en" ? "Player Aid" : "玩家輔助卡"}</h2>
${noIcons(aid(null)).replace(/<h3>/g, "<h3>").replace(/<\/?section[^>]*>/g, "")}
</body></html>`;
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "netherbloom-rulebook.en.html"), doc("en", "Netherbloom — Rulebook",
  "The same text as the Rulebook inside the web game (netherbloom.vercel.app). Generated from web/public/assets/rules.js.", RULEBOOK, playerAid));
writeFileSync(join(out, "netherbloom-rulebook.zh-TW.html"), doc("zh-Hant-TW", "《彼岸花渡》Netherbloom — 規則書",
  "本文與網頁試玩版內的規則書相同，由 web/public/assets/rules_zh.js 產生。", RULEBOOK_ZH, playerAidZh));
console.log("wrote", out);
