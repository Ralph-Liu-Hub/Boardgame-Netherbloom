// Renders every icon the Rulebook uses (id + colour, paper colours) to a PNG, for the Word editions.
import { readFileSync, mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_CORE);
const [root, out] = process.argv.slice(2);
const { RULEBOOK, playerAid } = await import(root + "/web/public/assets/rules.js");
const { RULEBOOK_ZH, playerAidZh } = await import(root + "/web/public/assets/rules_zh.js");
const paper = c => ({ "#E6D3A3": "#8a6a3e", "#8FD6E1": "#2f7f8e", "#9A948C": "#6b655d", "#EFE7D6": "#5c4a3a" })[c.toUpperCase()] || c;
const all = [...RULEBOOK, ...RULEBOOK_ZH].map(s => s.body).join("") + playerAid(null) + playerAidZh(null);
const set = new Set([...all.matchAll(/<svg class="ri" style="color:(#[0-9A-Fa-f]{6})"[^>]*><use href="#([\w-]+)"\/><\/svg>/g)].map(m => `${m[2]}|${paper(m[1])}`));
mkdirSync(out, { recursive: true });
const sprite = readFileSync(root + "/web/public/assets/symbols.svg", "utf8");
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ deviceScaleFactor: 3 });
await p.setContent(`<html><body style="margin:0;background:transparent">${sprite}${[...set].map((k, i) => { const [id, c] = k.split("|");
  return `<svg id="i${i}" width="48" height="48" style="color:${c};display:block"><use href="#${id}"/></svg>`; }).join("")}</body></html>`);
let n = 0;
for (const [i, k] of [...set].entries()) { const [id, c] = k.split("|"); await p.locator(`#i${i}`).screenshot({ path: `${out}/${id}_${c.slice(1)}.png`, omitBackground: true }); n++; }
console.log(n, "icons");
await b.close();
