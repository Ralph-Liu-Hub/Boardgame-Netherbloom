// The Books of Remembrance as editable Word files: the same words and paintings as the printed Books (print/factory/books.mjs),
// laid out as a plain document, one per Soul and language. Writes <out>/<lang>-<soul>.html with JPEG pictures beside it;
// books.py embeds them and turns each into .docx and .pdf through LibreOffice.
//   node print/docx/books.mjs <out dir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { art, esc } from "../factory/lib.mjs";
import { BOOK_PARTS } from "../factory/books.mjs";
import { STORIES } from "../factory/stories.mjs";
import { PAIR_SLOTS, PAIR_REWARDS } from "../../web/public/assets/cards.js";

const { W, ORDER, ART, PAINT, KEY, leads, bookPart, paras } = BOOK_PARTS;
const out = resolve(process.argv[2]);
mkdirSync(join(out, "jpg"), { recursive: true });
// each painting once, 1200 px wide
const pic = (name, inches) => {
  const src = art(name);
  if (!src) return "";
  const jpg = join(out, "jpg", `${name}.jpg`);
  execFileSync("convert", [fileURLToPath(src), "-resize", "1200x1200>", "-quality", "84", jpg]);
  return `<p class="fig"><img src="${jpg}" style="width:${inches}in" /></p>`;
};
const box = "☐";
const strip = html => html.replace(/<svg[^>]*>.*?<\/svg>/gs, "");

for (const lang of ["en", "zh"]) for (const k of ORDER) {
  const w = W[lang], s = w.soul(k), st = STORIES[k][lang];
  const end = strip(bookPart(w.book, 1));
  const ps = [...end.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[1]), lis = [...end.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);
  let h = `<!DOCTYPE html><html lang="${lang === "zh" ? "zh-Hant-TW" : "en"}"><head><meta charset="utf-8"><title>${esc(w.title)} · ${esc(s.name)}</title></head><body>
  <p class="eyebrow">Netherbloom${lang === "zh" ? " · 《彼岸花渡》" : ""}</p>
  ${pic(`soul-${ART[k]}`, 3)}<p class="lore"><i>${esc(w.bookLore)}</i></p>
  <h2>${esc(s.name)}</h2><p class="lore"><i>${esc(st.epigraph)}</i></p>
  ${st.tale.map(t => `<p>${esc(t)}</p>`).join("")}${pic(PAINT[k][1], 4)}
  <h2>${esc(w.ferry)}</h2><p>${esc(st.ferry)}</p>
  <p><b>${w.twist}:</b> ${esc(s.twist)}</p>${KEY[k] ? `<p><b>${w.key}:</b> <i>${esc(w.band(KEY[k]))}</i></p>` : ""}
  <h3>${w.keeping}</h3>${paras(bookPart(w.book, 0)).map(p => `<p>${p}</p>`).join("")}<p><i>${esc(w.tuck)}</i></p>`;
  w.frames.forEach(([title, frame], r) => {
    h += `<h2>${esc(w.reach(r))} · ${esc(title)}</h2>${pic(PAINT[k][r], 3.4)}
    ${leads(frame).map(([slot, lead]) => `<p><b>${esc(w.slot(slot))}</b> · ${esc(lead)}<br><i>${esc(w.taken)}</i></p>`).join("")}
    <p>${PAIR_SLOTS.map(([a, b], i) => `${box} <b>${esc(w.slot(a))}${w.plus}${esc(w.slot(b))}</b>: ${esc(w.ops(PAIR_REWARDS[r][i]))}`).join("<br>")}</p>
    <p>${box} ${w.blessing}${KEY[k] ? `<br>${w.keepsakes}: ${box} ${box} ${box}` : ""}</p>`;
  });
  h += `<h2>${w.far}</h2>${pic(PAINT[k][2], 3.4)}<p class="lore"><i>${esc(w.endLore)}</i></p><p>${ps[0]}</p>
  ${KEY[k] ? `<p>${ps[1]}</p>${lis.map(p => `<p>${box} ${p}</p>`).join("")}${ps.slice(2).map(p => `<p>${p}</p>`).join("")}` : ""}
  <p>${w.sign.map(t => `${t}: ________________`).join("<br><br>")}</p></body></html>`;
  writeFileSync(join(out, `${lang}-${k}.html`), h);
}
console.log("book html written to", out);
