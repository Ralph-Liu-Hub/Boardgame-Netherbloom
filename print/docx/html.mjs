// Builds the Word-edition HTML: the Rulebook text with the figure images in place.
const [root, imgdir, out] = process.argv.slice(2);
const { RULEBOOK, playerAid } = await import(root + "/web/public/assets/rules.js");
const { RULEBOOK_ZH, playerAidZh } = await import(root + "/web/public/assets/rules_zh.js");
const { writeFileSync } = await import("node:fs");
// Icons become small pictures (paper colours), since a Word file cannot use the web icon set.
const paper = c => ({ "#E6D3A3": "#8a6a3e", "#8FD6E1": "#2f7f8e", "#9A948C": "#6b655d", "#EFE7D6": "#5c4a3a" })[c.toUpperCase()] || c;
const ICONS = process.env.ICONS;
const noIcons = h => h.replace(/<svg class="ri" style="color:(#[0-9A-Fa-f]{6})"[^>]*><use href="#([\w-]+)"\/><\/svg>/g,
  (_, c, id) => `<img class="ic" src="${ICONS}/${id}_${paper(c).slice(1)}.png" />`).replace(/<svg[^>]*>.*?<\/svg>/gs, "");
const img = (tag, id, w) => `<p class="fig"><img src="${imgdir}/${tag}_${id}.jpg" style="width:${w}in" /></p>`;
const WIDE = new Set(["mantles", "souls", "mist", "card", "tiles", "echo", "threats"]);
function doc(lang, tag, title, book, aid) {
  const body = book.map(s => `<h2>${s.title}</h2>\n${noIcons(s.body)}`).join("\n")
    .replace(/<div class="setupfig"[^>]*><\/div>/, img(tag, "setup0", 6.3) + img(tag, "setup1", 6.3))
    .replace(/<div class="rfig" data-fig="(\w+)"><\/div>/g, (_, id) => img(tag, id, WIDE.has(id) ? 6.3 : 5.2))
    .replace(/<p class="lore">(.*?)<\/p>/g, "<p><i>$1</i></p>");
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${title}</title></head><body>

${body}
<h2>${lang === "en" ? "Player Aid" : "玩家輔助卡"}</h2>
${noIcons(aid(null)).replace(/<\/?section[^>]*>/g, "")}
</body></html>`;
}
writeFileSync(out + "/en.html", doc("en", "en", "Netherbloom — Rulebook", RULEBOOK, playerAid));
writeFileSync(out + "/zh.html", doc("zh-Hant-TW", "zh-TW", "《彼岸花渡》Netherbloom — 規則書", RULEBOOK_ZH, playerAidZh));
console.log("ok");
