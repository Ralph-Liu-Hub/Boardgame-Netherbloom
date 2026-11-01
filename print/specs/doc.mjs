// The print specification document (for Google Drive): every printed component's finished size, size with bleed, sides,
// stock and file, then the dimension drawings. Sizes come from the factory press plan, so the document matches the files.
//   node print/specs/doc.mjs <commit>   → docs/print-specs/<en|zh-TW>.html (images linked from GitHub at that commit)
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../factory/lib.mjs";
import { pressPlan } from "../factory/pressplan.mjs";
import { BIG, SMALL, CUT_BLEED, CANVAS, TOKENS } from "../factory/tokens.mjs";
import { LID, BASE, TURN } from "../factory/box.mjs";

const sha = process.argv[2];
const raw = (dir, f) => `https://raw.githubusercontent.com/Ralph-Liu-Hub/Boardgame-Netherbloom/${sha}/docs/print-specs/${dir}/${f}.png`;
const T = {
  en: { title: "Netherbloom — Print Specifications V3.2", sub: "Every printed component: finished size, size with bleed, printing, stock and file. Measures in millimetres.",
    rules: "General rules", ruleList: (p) => [`Every PDF page is the finished (trim) size plus ${p.bleed} mm bleed on each side, plus a ${p.slug} mm slug with crop marks, registration targets and a colour bar.`,
      "Keep text and important art at least 3 mm inside the trim (the safe area).", `Colour: CMYK, ${p.profile}.`, "Card fronts and backs share one page size; every card back lines up head to head with its front.",
      `Die-cut tokens and bank tiles carry ${CUT_BLEED} mm of art past every cut.`],
    table: "Components", head: ["Component", "Finished size", "With bleed", "Print", "Stock and finish", "Quantity", "File"],
    tokens: "Tokens (single JPGs, die-cut)", tokenRow: (d, n) => [`Tokens Ø${d} mm`, `Ø${d}`, `art Ø${d + 2 * CUT_BLEED}; JPG canvas ${CANVAS(d)} × ${CANVAS(d)}`, "4/4", "2 mm greyboard, laminated, die-cut", `${n} tokens`, `tokens/jpg/${d}mm/`],
    corners: ["Clear photo corners", "≈ 12", "—", "—", "self-adhesive", "48 per Book, 240 per game", "—"],
    drawings: "Dimension drawings", caps: ["Card (every deck): trim, bleed and safe area", "Bank tile", "Tokens: cut, art bleed and JPG canvas", "River board: three panels side by side, with the Mist deck wells and bank tile wells",
      "Loom of the Fates and the Ledger (same size)", "Rulebook and Book of Remembrance page; Player Aid card (A5)", `Box lid wrap, flat (${LID.L} × ${LID.L} × ${LID.D} mm lid, ${TURN} mm turn-ins; base ${BASE.L} × ${BASE.L} × ${BASE.D} mm)`, "Fit: every board and booklet lies flat in the box base"],
    legend: "In the drawings: solid black = trim (cut); dashed magenta = bleed; dotted cyan = safe area (or folds on the box); blue = dimensions in mm.", dir: "en" },
  zh: { title: "《彼岸花渡》印刷規格 V3.2", sub: "所有印刷配件的成品尺寸、含出血尺寸、印刷方式、用紙與檔案。單位：公釐（mm）。",
    rules: "共通規則", ruleList: (p) => [`每個 PDF 頁面為成品（裁切）尺寸，四邊各加 ${p.bleed} mm 出血，外加 ${p.slug} mm 版邊，含裁切標記、套準標記與色彩導表。`,
      "文字與重要圖像距裁切線至少 3 mm（安全區）。", `色彩：CMYK，${p.profile}。`, "卡牌正面與背面頁面尺寸相同；每張牌背與正面頭對頭對齊。",
      `模切的標記與河岸板塊，圖像超出每條裁切線 ${CUT_BLEED} mm。`],
    table: "配件一覽", head: ["配件", "成品尺寸", "含出血", "印刷", "用紙與加工", "數量", "檔案"],
    tokens: "標記與指示物（單張 JPG，模切）", tokenRow: (d, n) => [`標記與指示物 Ø${d} mm`, `Ø${d}`, `圖像 Ø${d + 2 * CUT_BLEED}；JPG 畫布 ${CANVAS(d)} × ${CANVAS(d)}`, "4/4", "2 mm 灰紙板，上膜，模切", `${n} 個`, `tokens/jpg/${d}mm/`],
    corners: ["透明相角", "約 12", "—", "—", "自黏", "每本 48 個，每盒 240 個", "—"],
    drawings: "尺寸圖", caps: ["卡牌（所有牌組）：裁切線、出血與安全區", "河岸板塊", "標記與指示物：裁切、圖像出血與 JPG 畫布", "河流圖板：三塊並排，含迷霧牌槽與河岸板塊方槽",
      "命運織機與渡帳（尺寸相同）", "規則書與憶念之書內頁；玩家輔助卡（A5）", `盒蓋裱紙攤平（盒蓋 ${LID.L} × ${LID.L} × ${LID.D} mm，內折 ${TURN} mm；盒底 ${BASE.L} × ${BASE.L} × ${BASE.D} mm）`, "收納：所有圖板與冊子都能平放進盒底"],
    legend: "圖例：黑色實線＝裁切線；洋紅虛線＝出血；青色點線＝安全區（盒子圖上為折線）；藍色＝尺寸（mm）。", dir: "zh-TW" },
};
const NAMES = {
  en: { "cards-memory": "Memory cards", "cards-mist": "Mist cards", "cards-ghost": "Ghost cards (solo)", "cards-mantle": "Mantle cards", "cards-soul": "Soul cards",
    "cards-keepsake": "Keepsake cards", "cards-ending": "Ending cards", "card-backs": "Card backs (7 kinds)", "bank-tiles": "Bank tiles (one die-cut sheet)", "river-board": "River board panels",
    "loom-of-the-fates": "Loom of the Fates board", "the-ledger": "Ledger board", "book-of-remembrance": "Books of Remembrance (one per Soul, 8 pages each)", rulebook: "Rulebook",
    "player-aid": "Player Aid cards (A5)", "box-lid-wrap": "Box lid wrap", "box-base-wrap": "Box base wrap", "box-lid-liner": "Lid liner", "box-base-liner": "Base liner" },
  zh: { "cards-memory": "記憶牌", "cards-mist": "迷霧牌", "cards-ghost": "幽靈牌（單人）", "cards-mantle": "稱號牌", "cards-soul": "亡魂牌",
    "cards-keepsake": "信物牌", "cards-ending": "結局牌", "card-backs": "牌背（7種）", "bank-tiles": "河岸板塊（一張模切板）", "river-board": "河流圖板",
    "loom-of-the-fates": "命運織機圖板", "the-ledger": "渡帳圖板", "book-of-remembrance": "憶念之書（每位亡魂一本，各8頁）", rulebook: "規則書",
    "player-aid": "玩家輔助卡（A5）", "box-lid-wrap": "盒蓋裱紙", "box-base-wrap": "盒底裱紙", "box-lid-liner": "盒蓋內襯", "box-base-liner": "盒底內襯" },
};
const FIGS = ["01-card", "02-bank-tile", "03-tokens", "04-river-board", "05-loom-ledger", "06-pages", "07-box-lid", "08-box-fit"];
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
for (const lang of ["en", "zh"]) {
  const L = T[lang], p = pressPlan(lang), b = p.bleed;
  const size = (w, h) => `${w} × ${h}`, files = p.files.filter(f => f.sides !== "—" && !/book-of-remembrance-(?!child)/.test(f.path));
  const rows = files.map(f => {
    const name = NAMES[lang][f.path.split("/").pop().replace(/\.pdf$/, "").replace(/-child$/, "")] || f.what[lang];
    const tile = f.path.startsWith("tiles/");
    return [name, tile ? `40 × 40 (${size(...f.trim)})` : size(...f.trim), tile ? `${lang === "zh" ? "圖像" : "art"} 44 × 44 (${size(f.trim[0] + 2 * b, f.trim[1] + 2 * b)})` : size(f.trim[0] + 2 * b, f.trim[1] + 2 * b), f.sides, f.stock[lang], f.qty[lang],
      f.path.replace("-child.pdf", "-<soul>.pdf")];
  });
  const count = d => TOKENS.filter(tk => tk[5] === d).reduce((a, tk) => a + tk[4], 0);
  rows.push(L.tokenRow(BIG, count(BIG)), L.tokenRow(SMALL, count(SMALL)), L.corners);
  const html = `<html><head><meta charset="utf-8"><title>${esc(L.title)}</title></head><body>
<h1>${esc(L.title)}</h1><p><i>${esc(L.sub)}</i></p>
<h2>${L.rules}</h2><ul>${L.ruleList(p).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
<h2>${L.table}</h2><table border="1" cellpadding="4"><tr>${L.head.map(h => `<th>${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</table>
<h2>${L.drawings}</h2><p>${esc(L.legend)}</p>
${FIGS.map((f, i) => `<h3>${i + 1}. ${esc(L.caps[i])}</h3><p><img src="${raw(L.dir, f)}" width="620"></p>`).join("\n")}
</body></html>`;
  writeFileSync(join(ROOT, "docs/print-specs", `${L.dir}.html`), html);
  console.log(L.dir, html.length, rows.length);
}
