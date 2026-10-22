// The Rulebook and the Player Aid as Markdown, English and Traditional Chinese, with the Rulebook's figures.
// Needs pandoc, and the figure images from the Word edition (sh print/docx/build.sh → print/out/docx/jpg).
//   node print/markdown/build.mjs   → docs/rules/{en,zh-TW}/  (Rulebook.md, Player-Aid.md, figures/)
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const { setLang } = await import(join(ROOT, "web/public/assets/i18n.js"));
const { RULEBOOK, playerAid } = await import(join(ROOT, "web/public/assets/rules.js"));
const { RULEBOOK_ZH, playerAidZh } = await import(join(ROOT, "web/public/assets/rules_zh.js"));
const FIGS = join(ROOT, "print/out/docx/jpg");

// HTML that pandoc turns into clean Markdown: no icons, figures as image links, boxes as quotes, grids as lists.
function tidy(html, tag, used) {
  return html
    .replace(/<h3>(Icons|圖示)<\/h3>\s*<div class="aidicons">[\s\S]*?<\/div>/g, "")   // a list of icons means nothing without them
    .replace(/<svg[\s\S]*?<\/svg>/g, "")
    .replace(/<div class="setupfig"[^>]*><\/div>/g, () => ["setup0", "setup1"].map(id => fig(tag, id, used)).join(""))
    .replace(/<div class="rfig" data-fig="(\w+)"><\/div>/g, (_, id) => fig(tag, id, used))
    .replace(/<span class="kw">(.*?)<\/span>/g, "$1")
    .replace(/<div class="rsuggest rlose">([\s\S]*?)<\/div>/g, "<blockquote>$1</blockquote>")
    .replace(/<p class="rsuggest">([\s\S]*?)<\/p>/g, "<blockquote><p>$1</p></blockquote>")
    .replace(/<p class="lore">([\s\S]*?)<\/p>/g, "<p><em>$1</em></p>")
    .replace(/<div class="aidgrid">([\s\S]*?)<\/div>\s*(?=<h3|<p|$)/g, (_, inner) => `<ul>${inner.replace(/<div[^>]*>([\s\S]*?)<\/div>/g, (m, c) => `<li>${c.replace(/<b>(.*?)<\/b>\s*<span>(.*?)<\/span>/, "<b>$1</b>: $2")}</li>`)}</ul>`)
    .replace(/<div class="aidicons[^"]*">([\s\S]*?)<\/div>/g, (_, inner) => `<ul>${inner.replace(/<span>([\s\S]*?)<\/span>/g, "<li>$1</li>")}</ul>`)
    .replace(/<li><b>(.*?)<\/b> <span>(.*?)<\/span><\/li>/g, "<li><b>$1</b>: $2</li>");
}
function fig(tag, id, used) {
  const f = `${tag}_${id}.jpg`;
  if (!existsSync(join(FIGS, f))) return "";
  used.add(f);
  return `<p><img src="figures/${f}" alt="${id}"></p>`;
}
const md = html => execFileSync("pandoc", ["-f", "html", "-t", "gfm-raw_html", "--wrap=none"], { input: html, maxBuffer: 1 << 26 }).toString()
  .replace(/\n{3,}/g, "\n\n").replace(/^#### /gm, "### ");   // sub-sections one level under their section

for (const [lang, tag, book, aid, title, aidTitle, intro] of [
  ["en", "en", RULEBOOK, () => (setLang("en"), playerAid(null)), "Netherbloom — Rulebook", "Netherbloom — Player Aid", ""],
  ["zh-TW", "zh-TW", RULEBOOK_ZH, () => playerAidZh(null), "《彼岸花渡》Netherbloom — 規則書", "《彼岸花渡》Netherbloom — 玩家輔助卡", ""],
]) {
  const out = join(ROOT, "docs/rules", lang), used = new Set();
  mkdirSync(join(out, "figures"), { recursive: true });
  // GitHub's heading anchors: lower case, punctuation dropped, spaces to hyphens (CJK kept)
  const slug = t => t.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s/g, "-");
  const toc = book.map(s => `- [${s.title}](#${slug(s.title)})`).join("\n");
  const body = book.map(s => `<h2 id="${s.id}">${s.title}</h2>\n${tidy(s.body, tag, used)}`).join("\n");
  writeFileSync(join(out, "Rulebook.md"), `# ${title}\n\n${intro}${toc}\n\n${md(body)}`);
  writeFileSync(join(out, "Player-Aid.md"), `# ${aidTitle}\n\n${md(tidy(aid().replace(/<\/?section[^>]*>/g, ""), tag, used))}`);
  for (const f of used) copyFileSync(join(FIGS, f), join(out, "figures", f));
  console.log(lang, "figures:", used.size);
}
