// Builds the Traditional Chinese print-and-play components from the same data the web game uses,
// so card text always matches the shipped edition.
//   node print/build_pnp.mjs            → print/out/netherbloom-pnp.zh-TW.html
//   node print/build_pnp.mjs --pdf      → also print/out/netherbloom-pnp.zh-TW.pdf (needs playwright-core and Chromium)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CARDS, CORE_IDS, ECHO_IDS, SOUL_PACKS, MIST, HARSH, GHOST, MANTLES, TILES, LANTERN, lanternIcon, SLOTS, FIRST_SOUL, MIST_EXTRA,
} from "../web/public/assets/cards.js";
import {
  ZH_LANTERNS, ZH_TAGS, ZH_SLOTS, ZH_TILES, ZH_REACHES, ZH_CARD_NAMES, ZH_BANDS, ZH_SOULS, ZH_MIST, ZH_MANTLES, ZH_BOOK_FRAMES, zhOpsText,
} from "../web/public/assets/zh.js";
import { playerAidZh } from "../web/public/assets/rules_zh.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const symbols = readFileSync(join(here, "../web/public/assets/symbols.svg"), "utf8");
const icon = (id, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const TAG_ICON = ["nb-obsession", "nb-acceptance", "nb-oblivion"];
const TAG_CLS = ["obs", "acc", "obl"];
const SLOT_ICON = { Place: "nb-slot-place", Person: "nb-slot-person", Deed: "nb-slot-deed", Feeling: "nb-slot-feeling" };
const NUM = ["一", "二", "三"];
const SOUL_PACK_NAME = k => ZH_SOULS[k].name;

// ---------------------------------------------------------------- card faces
function memoryCard(cid, pack) {
  const c = CARDS[cid];
  return `<div class="card t-${TAG_CLS[c.tag]}">
    <div class="head">${icon(TAG_ICON[c.tag])}<div><div class="nm">${esc(ZH_CARD_NAMES[c.name] || c.name)}</div>
      <div class="sub">${ZH_TAGS[c.tag]}${c.key ? " · <b class=\"key\">關鍵記憶</b>" : ""}</div></div></div>
    <div class="eff">${esc(zhOpsText(c.eff))}</div>
    <div class="res"><b>共鳴：</b>${c.rr ? "改為" : ""}${esc(zhOpsText(c.res))}</div>
    ${c.slot ? `<div class="band">${icon(SLOT_ICON[c.slot])}<span><i>${ZH_SLOTS[c.slot]}</i>${esc(ZH_BANDS[c.id] || c.band)}</span></div>`
      : `<div class="band muted">忘卻牌使用後會被遺忘。</div>`}
    <div class="foot"><span>${pack}</span><span>${c.id}</span></div></div>`;
}

// What a Mist card does, for play on paper. S is the soul's space; "ahead k" is space S+k.
function mistOpZh(op) {
  switch (op[0]) {
    case "bw": return `在亡魂前方第${op[1]}格放置1個黑水（該格已淹沒則放在下一格）`;
    case "grv": return `在亡魂前方第${op[1]}格的${op[2] ? "右岸" : "左岸"}放置1個怨念`;
    case "grv_near": return "在亡魂所在格放置1個怨念（左岸優先；兩岸都有時，放在下一格的左岸）";
    case "wither": return `亡魂前方最遠的${op[1]}朵花凋零為根`;
    case "wither_far": return `亡魂前方第${op[1]}格以外的所有花凋零為根`;
    case "wither_at": return `亡魂前方第${op[1]}格的花凋零為根`;
    case "fog": return `前方最遠的${op[1]}個已掀開且空著的河岸重新蓋上霧`;
    case "forget": return `遺忘牌庫頂的${op[1]}張牌`;
    case "sever": return "將迴響從織機上移除";
    case "karma_all": return "每條絲線各打1個結";
    case "dark_wind": return "失去2點光；光不足2點時，改為承受1道裂痕";
  }
  return op[0];
}

function mistCard([name, ops], label, harsh) {
  const [zn, zt] = ZH_MIST[name];
  const rule = ops.length ? ops.map(mistOpZh).join("；") + "。" : "沒有任何效果。";
  return `<div class="card mist ${harsh ? "harsh" : ""}">
    <div class="kick">${harsh ? "凶霧" : "迷霧"}</div>${icon("nb-fog", "big")}
    <div class="nm c">${esc(zn)}</div><div class="eff c"><i>${esc(zt)}</i></div><div class="eff">${esc(rule)}</div>
    <div class="foot"><span>${label}</span><span></span></div></div>`;
}

const GHOST_ZH = { root_far: "在最遠的空河岸扎根", root_near: "在最近的空河岸扎根", bloom_near: "使最近的根綻放",
  bloom_far: "使最遠的根綻放", banish_forget: "驅散最近的怨念，或排乾黑水", none: "不採取行動" };
const ghostCard = ([tag, act], i) => `<div class="card ghost t-${TAG_CLS[tag]}">
    <div class="kick">幽靈牌</div>${icon(TAG_ICON[tag], "big")}
    <div class="nm c">${ZH_TAGS[tag]}</div><div class="eff c">${GHOST_ZH[act]}</div>
    <div class="note c">幽靈打出此牌時，在${ZH_TAGS[tag]}絲線上打一個結，並將迴響設為${ZH_TAGS[tag]}。</div>
    <div class="foot"><span>單人模式</span><span>G${String(i + 1).padStart(2, "0")}</span></div></div>`;

const mantleCard = m => `<div class="card mantle t-${TAG_CLS[MANTLES[m].tag]}">
    <div class="kick">稱號</div>${icon(TAG_ICON[MANTLES[m].tag], "big")}
    <div class="nm c">${ZH_MANTLES[m].name}</div><div class="sub c">${ZH_TAGS[MANTLES[m].tag]}絲線</div>
    <div class="eff">${esc(ZH_MANTLES[m].text)}</div>
    <div class="note">召喚：支付3點光（國王為2點），並棄掉一張${ZH_TAGS[MANTLES[m].tag]}牌。</div>
    <div class="foot"><span>稱號</span><span>${m}</span></div></div>`;

const soulCard = k => `<div class="card soul">
    <div class="kick">亡魂${k === FIRST_SOUL ? " · 新手推薦" : ""}</div>${icon("nb-soul", "big")}
    <div class="nm c">${ZH_SOULS[k].name}</div><div class="blurb c">${esc(ZH_SOULS[k].blurb)}</div>
    <div class="eff"><b>特色規則：</b>${esc(ZH_SOULS[k].twist)}</div>
    <div class="note">${k === "open" ? "加入8張迴響牌。" : "加入此亡魂的8張專屬牌（含1張關鍵記憶）。"}</div>
    <div class="foot"><span>亡魂</span><span>${k}</span></div></div>`;

// Card backs, so a duplex print lines up.
// Memory cards carry the full field-of-Netherblooms back, the same art as the web table.
const back = kind => kind === "memory" ? `<div class="card back memory"><svg class="cbfull" viewBox="0 0 630 880" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><use href="#nb-cardback"/></svg></div>`
  : `<div class="card back ${kind}">${icon(kind === "mist" ? "nb-fog" : kind === "ghost" ? "nb-soul" : "nb-bloom", "huge")}
    <div class="bt">${{ mist: "迷霧", ghost: "幽靈", mantle: "稱號", soul: "亡魂" }[kind]}</div><div class="bn">Netherbloom</div></div>`;

// 9 cards per A4 sheet; every face sheet is followed by its back sheet (mirrored for long-edge duplex).
function sheets(title, faces, kind) {
  let html = "";
  for (let i = 0; i < faces.length; i += 9) {
    const page = faces.slice(i, i + 9);
    html += `<section class="sheet"><h2>${title} <small>${Math.floor(i / 9) + 1}／${Math.ceil(faces.length / 9)}</small></h2><div class="grid">${page.join("")}</div></section>`;
    const rows = [];
    for (let r = 0; r < page.length; r += 3) rows.push(page.slice(r, r + 3).map(() => back(kind)).concat(Array(3 - Math.min(3, page.length - r)).fill('<div class="card blank"></div>')).reverse());
    html += `<section class="sheet backs"><h2>${title}・牌背 <small>雙面列印（長邊翻轉）</small></h2><div class="grid">${rows.flat().join("")}</div></section>`;
  }
  return html;
}

// ---------------------------------------------------------------- the other components
function bookSheet() {
  return `<section class="sheet book"><h2>憶念之書・記錄表 <small>每局一張</small></h2>
    <p class="lead">當一張牌與迴響產生共鳴，或打出關鍵記憶時，可將其記憶銘刻於當前河段的那一頁。一頁寫滿3段記憶（花環少女為2段）即獲得章節祝福。遊戲結束時，朗讀全書；未填上的欄位讀作「……但這一段，已被河水帶走」。</p>
    ${ZH_BOOK_FRAMES.map(([title, frame], r) => `<div class="chapter"><h3>${title}<span>${ZH_REACHES[r]}</span></h3>
      <p class="frame">${esc(frame).replace(/\{(\w+)\}/g, (_, s) => `<span class="blank">${ZH_SLOTS[s]}</span>`)}</p>
      <div class="slots">${SLOTS.map(s => `<div>${icon(SLOT_ICON[s])}<b>${ZH_SLOTS[s]}</b><span></span></div>`).join("")}</div>
      <div class="bless">□ 章節祝福　　信物：□ □ □</div></div>`).join("")}
    <div class="sign">亡魂：＿＿＿＿＿＿　燈籠：＿＿　玩家：＿＿＿＿＿＿＿＿＿＿＿＿＿＿　日期：＿＿＿＿</div></section>`;
}

function tileSheet() {
  const icons = ["nb-fertile", "nb-stony", "nb-memorysite", "nb-grave"];
  const tiles = TILES.map(([spaces, list], r) => list.map(t => `<div class="tile">${icon(icons[t], "big")}<b>${ZH_TILES[t]}</b><small>第${NUM[r]}河段</small></div>`).join("")).join("");
  const fog = Array.from({ length: 20 }, () => `<div class="tile fog">${icon("nb-fog", "big")}<b>霧</b></div>`).join("");
  const tok = (id, name, n) => Array.from({ length: n }, () => `<div class="tok">${icon(id)}<small>${name}</small></div>`).join("");
  return `<section class="sheet tiles"><h2>河岸板塊與標記</h2>
    <p class="lead">板塊依河段分開洗混，面朝下放在該河段的河岸上（第1格兩岸開局即各有1朵花）。霧板塊為牌背；可印在板塊背面。</p>
    <div class="tgrid">${tiles}</div><h3>霧（板塊背面）</h3><div class="tgrid">${fog}</div></section>
    <section class="sheet tiles"><h2>標記</h2><p class="lead">沿圓圈剪下。數量為建議值，不足時可用任何小物件代替。</p><div class="kgrid">${tok("nb-root", "根", 24)}${tok("nb-bloom", "花", 24)}${tok("nb-grievance", "怨念", 8)}${tok("nb-blackwater", "黑水", 6)}${tok("nb-fracture", "裂痕", 3)}${tok("nb-light", "光", 12)}${tok("nb-knot", "結", 15)}${tok("nb-echo", "迴響", 1)}${tok("nb-soul", "亡魂", 1)}</div>
    <h3 style="margin-top:5mm">行動標記</h3><p class="lead">記錄一條規則持續的效果：破浪標記每位玩家1個（奮力駛過時翻面）、堅守與認命放在亡魂旁、護盾放在升起者面前、船槳交給輪到的玩家。</p>
    <div class="kgrid">${tok("nb-tok-oar", "船槳", 1)}${tok("nb-tok-push", "破浪", 4)}${tok("nb-tok-hold", "堅守", 1)}${tok("nb-tok-shield", "護盾", 1)}${tok("nb-tok-resign", "認命", 1)}</div></section>`;
}

// The Ledger: the forgotten track (each Lantern's limit marked ✕), the Fracture wells and the Black Water well.
function ledgerSheet() {
  const limits = Object.entries(LANTERN).map(([l, [, lim]]) => [lim, ZH_LANTERNS[l]]);
  const cells = Array.from({ length: Math.max(...limits.map(x => x[0])) }, (_, i) => {
    const n = i + 1, at = limits.filter(x => x[0] === n).map(x => x[1]);
    return `<div class="lcell${at.length ? " lose" : ""}"><b>${n}</b>${at.length ? `<small>✕ ${at.join("・")}消散</small>` : ""}</div>`;
  }).join("");
  return `<section class="sheet ledger"><h2>渡帳</h2>
    <p class="lead">被遺忘的牌依序正面朝上放在編號軌上；最新那張上方的數字就是被遺忘的張數。到達你燈籠的✕即消散（落敗）。</p>
    <div class="ltrack">${cells}</div>
    <div class="lwells"><div><h3>裂痕</h3>${[1, 2, 3].map(n => `<span class="well">${icon("nb-fracture")}<small>${n === 3 ? "第3道：破碎" : n}</small></span>`).join("")}</div>
    <div><h3>黑水供應區</h3><span class="well big">${icon("nb-blackwater")}<small>放入燈籠規定數量的黑水；空了又必須放置黑水即滅頂</small></span></div></div></section>`;
}

function lanternCard() {
  return `<section class="sheet aidsheet"><h2>燈籠（難度）</h2><table class="lt"><thead><tr><th>燈籠</th><th>黑水供應</th><th>消散門檻</th><th>每河段凶霧數</th></tr></thead><tbody>${
    Object.entries(LANTERN).map(([l, [bw, lim, h]]) => `<tr><td>${lanternIcon(l)} ${ZH_LANTERNS[l]}</td><td>${bw}</td><td>遺忘${lim}張</td><td>${h}</td></tr>`).join("")}</tbody></table>
    <h2 style="margin-top:8mm">玩家輔助卡</h2>
    <div class="aid-print">${playerAidZh(null).replace(/#E6D3A3/g, "#9a7a3a").replace(/#8FD6E1/g, "#2f7f8e").replace(/#9A948C/g, "#6b655d")}</div></section>`;
}

function contents() {
  const n = { memory: CORE_IDS.length + ECHO_IDS.length + Object.values(SOUL_PACKS).flat().length, mist: MIST.flat().length + MIST_EXTRA.length * MIST.length + HARSH.length };
  return `<section class="sheet cover"><svg class="ic hero" aria-hidden="true"><use href="#nb-bloom"/></svg>
    <h1>Netherbloom<span>《彼岸花渡》</span></h1><p class="tag">合作遊戲 · 1–4人 · 正體中文 印刷試玩版（Print &amp; Play）</p>
    <table class="lt"><thead><tr><th>配件</th><th>數量</th><th>頁</th></tr></thead><tbody>
      <tr><td>記憶牌（基本牌庫32、迴響牌8、亡魂專屬牌4×8）</td><td>${n.memory}</td><td>卡牌</td></tr>
      <tr><td>迷霧牌（每河段${MIST[0].length + MIST_EXTRA.length}張）＋凶霧牌</td><td>${MIST.flat().length + MIST_EXTRA.length * MIST.length}＋${HARSH.length}</td><td>卡牌</td></tr>
      <tr><td>幽靈牌（單人模式）</td><td>${GHOST.length}</td><td>卡牌</td></tr>
      <tr><td>稱號牌</td><td>${Object.keys(MANTLES).length}</td><td>卡牌</td></tr>
      <tr><td>亡魂牌</td><td>${Object.keys(ZH_SOULS).length}</td><td>卡牌</td></tr>
      <tr><td>河岸板塊（沃土、石地、記憶之地、墳墓）與霧</td><td>${TILES.reduce((a, [, l]) => a + l.length, 0)}</td><td>板塊</td></tr>
      <tr><td>標記：根、花、怨念、黑水、裂痕、光、結、迴響、亡魂</td><td>—</td><td>標記</td></tr>
      <tr><td>行動標記：船槳1、破浪4、堅守1、護盾1、認命1</td><td>8</td><td>標記</td></tr>
      <tr><td>渡帳（遺忘軌、裂痕、黑水供應區）</td><td>1</td><td>渡帳</td></tr>
      <tr><td>燈籠表與玩家輔助卡</td><td>1</td><td>輔助</td></tr>
      <tr><td>憶念之書・記錄表</td><td>每局1張</td><td>記錄表</td></tr>
    </tbody></table>
    <p class="lead">列印：A4、實際大小（100%）。卡牌為63×88毫米，每頁9張，可沿裁切線剪下並套入卡套。牌背頁緊接在正面頁之後，請以雙面、長邊翻轉列印。
    卡牌文字與網頁試玩版（netherbloom.vercel.app）完全相同，皆由同一份遊戲資料產生。</p></section>`;
}

// ---------------------------------------------------------------- the document
const memory = [
  ...CORE_IDS.map(i => memoryCard(i, "基本")),
  ...ECHO_IDS.map(i => memoryCard(i, "迴響・無名渡河")),
  ...Object.entries(SOUL_PACKS).flatMap(([k, ids]) => ids.map(i => memoryCard(i, SOUL_PACK_NAME(k)))),
];
const mist = [
  ...MIST.flatMap((deck, r) => [...deck, ...MIST_EXTRA].map(m => mistCard(m, `第${NUM[r]}河段`, false))),
  ...HARSH.map(m => mistCard(m, "凶霧", true)),
];
const html = `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><title>Netherbloom 正體中文 印刷試玩配件</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Noto+Serif+TC:wght@400;600;700&family=LXGW+WenKai+TC&display=block">
<style>
@page { size: A4; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Noto Serif TC", serif; color: #231a12; font-size: 9pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet { page-break-after: always; break-after: page; }
h1, h2, h3 { font-weight: 600; margin: 0 0 3mm; }
h2 { font-size: 12pt; border-bottom: .3mm solid #b9a27a; padding-bottom: 1mm; } h2 small { font-weight: 400; color: #8a7a62; font-size: 8pt; margin-left: 2mm; }
.ic { width: 5mm; height: 5mm; flex: none; } .ic.big { width: 13mm; height: 13mm; display: block; margin: 1mm auto; } .ic.huge { width: 26mm; height: 26mm; }
.grid { display: grid; grid-template-columns: repeat(3, 63mm); grid-auto-rows: 88mm; gap: 0; justify-content: center; }
.card { width: 63mm; height: 88mm; border: .25mm dashed #b8ab96; padding: 4mm 4.2mm 3mm; display: flex; flex-direction: column; gap: 2mm; position: relative; overflow: hidden; background: #fbf7ee; }
.card::before { content: ""; position: absolute; inset: 1.6mm; border: .35mm solid #c9b48a; border-radius: 2.5mm; pointer-events: none; }
.t-obs { --tc: #a32a30; } .t-acc { --tc: #9a7a3a; } .t-obl { --tc: #2f7f8e; }
.card .head { display: flex; gap: 2mm; align-items: center; color: var(--tc, #4a3a28); border-bottom: .3mm solid var(--tc, #c9b48a); padding-bottom: 1.5mm; }
.card .head .ic { width: 8mm; height: 8mm; }
.nm { font-size: 12.5pt; font-weight: 700; line-height: 1.15; } .nm.c { text-align: center; color: var(--tc, #4a2a14); }
.sub { font-size: 7.5pt; color: #6b5a44; letter-spacing: .15em; } .sub.c { text-align: center; }
.key { color: #a32a30; }
.eff { font-size: 9pt; line-height: 1.5; } .eff.c, .note.c, .blurb.c { text-align: center; }
.res { font-size: 8.5pt; line-height: 1.45; color: #3c3024; background: rgba(201,180,138,.18); border-radius: 1.5mm; padding: 1.2mm 1.6mm; }
.band { margin-top: auto; display: flex; gap: 1.6mm; font-family: "LXGW WenKai TC", "Noto Serif TC", serif; font-size: 9pt; line-height: 1.45; border-top: .25mm solid #c9b48a; padding-top: 1.6mm; color: #4a2a14; }
.band i { font-style: normal; font-family: "Noto Serif TC"; font-size: 7pt; color: #8a5a2e; display: block; letter-spacing: .2em; }
.band.muted { color: #8a7a62; font-family: "Noto Serif TC"; font-size: 8pt; }
.foot { display: flex; justify-content: space-between; font-size: 6pt; color: #9a8a70; letter-spacing: .08em; margin-top: auto; }
.band + .foot { margin-top: 0; }
.kick { text-align: center; font-size: 7.5pt; letter-spacing: .4em; color: #8a5a2e; }
.note { font-size: 7.5pt; color: #6b5a44; line-height: 1.45; }
.blurb { font-family: "LXGW WenKai TC", serif; font-size: 9pt; color: #4a2a14; }
.mist { background: #eef0f0; } .mist.harsh { background: #efe4e4; } .mist .ic.big { color: #5a6468; } .mist.harsh .ic.big { color: #7a2a30; }
.mantle .ic.big, .ghost .ic.big { color: var(--tc); } .soul .ic.big { color: #4a3a28; }
.back { background: #1d1a20; color: #e6d3a3; align-items: center; justify-content: center; } .back::before { border-color: #6b5a44; }
.back .ic.huge { color: #d7263d; } .back.mist .ic.huge, .back.ghost .ic.huge { color: #8fd6e1; }
.back .bt { font-size: 14pt; letter-spacing: .6em; margin-top: 4mm; } .back .bn { font-family: "IM Fell English SC", serif; font-size: 11pt; letter-spacing: .1em; color: #9a948c; }
.blank { border: 0; background: none; } .blank::before { display: none; }
.back.memory { padding: 0; background: #100d12; } .back.memory::before { display: none; } .cbfull { position: absolute; inset: 0; width: 100%; height: 100%; }
.cover { text-align: center; padding-top: 20mm; } .cover .hero { width: 40mm; height: 40mm; color: #a32a30; }
.cover h1 { font-family: "IM Fell English SC", "Noto Serif TC", serif; font-size: 34pt; } .cover h1 span { display: block; font-family: "Noto Serif TC"; font-size: 15pt; letter-spacing: .5em; margin-top: 2mm; }
.cover .tag { color: #6b5a44; letter-spacing: .1em; }
.lt { border-collapse: collapse; margin: 6mm auto; font-size: 9.5pt; } .lt th, .lt td { border: .25mm solid #c9b48a; padding: 1.6mm 3mm; text-align: left; } .lt th { background: #efe6d2; }
.lead { line-height: 1.7; max-width: 170mm; margin: 0 auto 4mm; text-align: left; }
.book .chapter { border: .4mm solid #c9b48a; border-radius: 3mm; padding: 4mm 5mm; margin-bottom: 5mm; background: #fbf7ee; }
.book h3 { font-family: "LXGW WenKai TC", serif; font-size: 15pt; color: #4a2a14; display: flex; justify-content: space-between; align-items: baseline; }
.book h3 span { font-family: "Noto Serif TC"; font-size: 9pt; color: #8a5a2e; letter-spacing: .2em; }
.book .frame { font-family: "LXGW WenKai TC", serif; font-size: 11pt; line-height: 2.6; }
.book .frame .blank { display: inline-block; min-width: 38mm; border-bottom: .3mm solid #8a6a3e; text-align: center; font-size: 7pt; color: #a08a6a; line-height: 1.2; vertical-align: bottom; }
.book .slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 2mm; }
.book .slots div { display: flex; gap: 1.5mm; align-items: center; border-bottom: .25mm dotted #8a6a3e; padding-bottom: 1mm; color: #8a5a2e; } .book .slots span { flex: 1; }
.book .bless, .book .sign { font-size: 9pt; color: #6b5a44; margin-top: 2mm; }
.tgrid { display: grid; grid-template-columns: repeat(6, 25mm); grid-auto-rows: 25mm; gap: 1.5mm; margin-bottom: 4mm; }
.tile { border: .3mm solid #8a7a62; border-radius: 2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8pt; background: #fbf7ee; }
.tile .ic.big { width: 11mm; height: 11mm; margin: 0; color: #5a4630; } .tile small { font-size: 6pt; color: #8a7a62; } .tile.fog { background: #e6e8e8; }
.kgrid { display: grid; grid-template-columns: repeat(10, 16mm); grid-auto-rows: 16mm; gap: 1mm; }
.tok { border: .3mm solid #8a7a62; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.tok .ic { width: 8mm; height: 8mm; color: #5a4630; } .tok small { font-size: 5.5pt; }
.aid-print { columns: 2; column-gap: 8mm; font-size: 8.5pt; line-height: 1.5; }
.aid-print h3 { font-size: 10pt; margin: 3mm 0 1mm; break-after: avoid; } .aid-print .ri { width: 4mm; height: 4mm; vertical-align: -1mm; margin-right: 1mm; }
.aid-print ol.steps { margin: 0; padding-left: 5mm; } .aid-print ol.steps li span { display: block; color: #6b5a44; font-size: 7.5pt; }
.aid-print .aidgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5mm; break-inside: avoid; } .aid-print .aidgrid div { border: .25mm solid #c9b48a; border-radius: 1.5mm; padding: 1.2mm; }
.aid-print .aidgrid span { display: block; font-size: 7.5pt; color: #6b5a44; } .aid-print .c-obs { color: #a32a30; } .aid-print .c-acc { color: #9a7a3a; } .aid-print .c-obl { color: #2f7f8e; }
.ledger .ltrack { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin: 4mm 0; } .ledger .lcell { height: 40mm; border: .3mm dashed #8a7a62; border-radius: 2mm; padding: 1.5mm; } .ledger .lcell b { font-size: 14pt; } .ledger .lcell.lose { border: .5mm solid #a32a30; } .ledger .lcell small { display: block; color: #a32a30; font-size: 7pt; }
.ledger .lwells { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; } .ledger .well { display: inline-flex; flex-direction: column; align-items: center; width: 22mm; margin-right: 3mm; border: .3mm solid #8a7a62; border-radius: 50%; padding: 4mm 1mm; } .ledger .well.big { width: 60mm; border-radius: 4mm; } .ledger .well small { font-size: 7pt; text-align: center; } .ledger .well .ic { width: 8mm; height: 8mm; }
.aid-print .aidicons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1mm; } .aid-print p { margin: 0 0 2mm; }
</style></head><body>${symbols}
${contents()}
${sheets("記憶牌", memory, "memory")}
${sheets("迷霧牌", mist, "mist")}
${sheets("幽靈牌（單人模式）", GHOST.map(ghostCard), "ghost")}
${sheets("稱號牌與亡魂牌", [...Object.keys(MANTLES).map(mantleCard), ...Object.keys(ZH_SOULS).map(soulCard)], "mantle")}
${tileSheet()}
${ledgerSheet()}
${lanternCard()}
${bookSheet()}
</body></html>`;

mkdirSync(out, { recursive: true });
const htmlPath = join(out, "netherbloom-pnp.zh-TW.html");
writeFileSync(htmlPath, html);
console.log("wrote", htmlPath, `${memory.length} memory, ${mist.length} Mist, ${GHOST.length} Ghost cards`);

if (process.argv.includes("--pdf")) {
  const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const page = await browser.newPage();
  await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const pdfPath = join(out, "netherbloom-pnp.zh-TW.pdf");
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log("wrote", pdfPath);
}
