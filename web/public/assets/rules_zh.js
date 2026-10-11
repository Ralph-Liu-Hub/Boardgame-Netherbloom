// 規則書與玩家輔助卡（正體中文，台灣桌遊用語）。結構與 rules.js 相同；卡牌、迷霧、燈籠與幽靈表格
// 直接由 cards.js 與 zh.js 產生，因此無論目前介面語言為何，這裡的表格一律是中文。
import {
  CARDS, TAG_ICONS, MANTLES, FIRST_SOUL, LANTERN, MIST, HARSH, GHOST,
} from "./cards.js";
import { ZH_TAGS, ZH_CARD_NAMES, ZH_SOULS, ZH_MIST, ZH_MANTLES, ZH_REACHES, ZH_TILES, ZH_BANDS, zhOpsText } from "./zh.js";

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ico = (id, color) => `<svg class="ri" style="color:${color}" aria-hidden="true"><use href="#${id}"/></svg>`;
const TAGCOL = ["#D7263D", "#E6D3A3", "#8FD6E1"];

// 每種不同的卡牌（名稱＋絲線＋效果）一列。
function cardTableZh() {
  const seen = new Map();
  for (const c of CARDS) {
    const key = `${c.name}|${c.tag}|${JSON.stringify(c.eff)}`;
    if (!seen.has(key)) seen.set(key, { c, n: 0, packs: new Set() });
    const row = seen.get(key);
    row.n += 1;
    row.packs.add(c.id[0] === "C" ? "Core" : c.id[0] === "E" ? "Echo" : "Soul");
  }
  const rows = [...seen.values()].filter(r => r.packs.has("Core") || r.packs.has("Echo") || r.c.key);
  rows.sort((a, b) => a.c.tag - b.c.tag || a.c.name.localeCompare(b.c.name));
  return `<table class="rtable"><thead><tr><th>卡牌</th><th>正面打出</th><th>共鳴</th></tr></thead><tbody>${rows.map(({ c }) =>
    `<tr><td>${ico(TAG_ICONS[c.tag], TAGCOL[c.tag])}<b>${esc(c.name === "Echo" ? "迴響牌" : (ZH_CARD_NAMES[c.name] || c.name))}</b>${c.name === "Echo" ? ' <span class="rkey" style="color:var(--cyan)">無名渡河</span>' : ""}${c.key ? ' <span class="rkey">關鍵記憶</span>' : ""}</td><td>${esc(zhOpsText(c.eff))}</td><td>${c.rr ? "改為：" : ""}${esc(zhOpsText(c.res))}</td></tr>`).join("")}</tbody></table>`;
}

function mistTableZh() {
  const zn = n => (ZH_MIST[n] || [n, ""]);
  const names = new Map();
  MIST.forEach((deck, r) => deck.forEach(([n]) => { if (!names.has(n)) names.set(n, new Set()); names.get(n).add(["一", "二", "三"][r]); }));
  const rows = [...names.entries()].map(([n, reaches]) => `<tr><td><b>${esc(zn(n)[0])}</b></td><td>${[...reaches].join("、")}</td><td>${esc(zn(n)[1])}</td></tr>`).join("");
  const harsh = HARSH.map(([n]) => `<tr><td><b>${esc(zn(n)[0])}</b></td><td>凶霧</td><td>${esc(zn(n)[1])}</td></tr>`).join("");
  return `<table class="rtable"><thead><tr><th>迷霧牌</th><th>河段</th><th>發生什麼事</th></tr></thead><tbody>${rows}${harsh}</tbody></table>`;
}

function lanternTableZh() {
  return `<table class="rtable"><thead><tr><th>燈籠</th><th>黑水供應</th><th>消散門檻</th><th>每河段凶霧數</th></tr></thead><tbody>${
    Object.entries(LANTERN).map(([l, [bw, lim, h]]) => `<tr><td>${"◆".repeat(+l)}${"◇".repeat(5 - l)} ${l}</td><td>${bw}</td><td>遺忘${lim}張</td><td>${h}</td></tr>`).join("")}</tbody></table>`;
}

function ghostTableZh() {
  const what = { root_far: "在最遠的空河岸扎根", root_near: "在最近的空河岸扎根", bloom_near: "使最近的根綻放",
    bloom_far: "使最遠的根綻放", banish_forget: "驅散最近的怨念，或排乾黑水", none: "不採取行動" };
  const count = {};
  GHOST.forEach(([t, a]) => { const k = `${t}|${a}`; count[k] = (count[k] || 0) + 1; });
  return `<table class="rtable"><thead><tr><th>幽靈牌</th><th>×</th><th>行動</th></tr></thead><tbody>${Object.entries(count).map(([k, n]) => {
    const [t, a] = k.split("|");
    return `<tr><td>${ico(TAG_ICONS[t], TAGCOL[t])}${ZH_TAGS[t]}</td><td>${n}</td><td>${what[a]}</td></tr>`;
  }).join("")}</tbody></table>`;
}

// 開啟一個規則章節的一句世界觀短文。
const lore = text => `<p class="lore">${text}</p>`;
// 「桌上的世界」表格的一列：圖示、配件、它在故事中的身分、它在遊戲中的作用。
const piece = (icon, color, name, story, play) =>
  `<tr><td>${icon ? ico(icon, color) : ""}<b>${name}</b></td><td>${story}</td><td>${play}</td></tr>`;
const band = id => esc(ZH_BANDS[id]);

// 每個章節：id、標題、搜尋關鍵字（中英文並列）與內文 HTML。
// 第一部分講述故事，以及每個配件在故事中的意義；第二部分是規則，每一節都以一句世界觀短文開場。
export const RULEBOOK_ZH = [
  { id: "story", title: "1. 序章：遺忘之河", keys: "序章 故事 世界觀 背景 忘川 擺渡人 老擺渡人 銅錢 冥府 守岸人 彼岸花 無錢的亡者 主題 story lore setting world lethe ferryman coin underworld prologue theme", body: `
    ${lore("凡飲下忘川之水者，終將遺忘。")}
    <p>在生者的世界之下，流淌著一條黑色的河。亡者必須渡過它，才能抵達<b>彼岸</b>；一位蒙著面紗的<b>守岸人</b>在那裡等候，手中捧著一杯河水。飲下它，一生的重量便悄然滑落。</p>
    <p>一位老擺渡人載送亡者渡河，但只載那些下葬時帶著一枚銅錢作為船資的人。其餘的亡魂——<b>無錢的亡者</b>——只能獨自在<b>此岸</b>醒來，在河岸上遊蕩。霧氣滲入他們，他們開始遺忘：先是瑣碎的小事，接著是一張張面孔，最後是自己的名字。忘盡一切的亡魂，便就此消散於霧中。</p>
    <p>你們是<b>擺渡人</b>：不守舊規的引路人，專門護送老擺渡人不肯載的亡魂。你們沒有船，卻擁有更為奇異的東西。忘川兩岸生長著<b>彼岸花</b>，一種形似紅花石蒜的赤紅花朵，在光禿的花莖上綻放，不見一片葉子，因為<i>「花葉永不相見」</i>。它的光芒，是霧中迷途的亡魂唯一能追隨的光。你們在哪裡種下彼岸花，亡魂便能在哪裡行走。</p>
    <p>還有一件事：生者在冥府中無法言語。無論你們想對彼此說什麼，都只能透過種下的花與做出的抉擇來傳達。</p>` },

  { id: "mission", title: "2. 你們的使命", keys: "使命 目標 任務 勝利 落敗 護送 憶念 goal mission objective win lose escort remember purpose", body: `
    ${lore("將一個亡魂送往彼岸，並幫助它記起自己曾是誰。")}
    <p>每一局，都有一個亡魂在此岸醒來。你們共同肩負兩項任務，同勝同敗：</p>
    <ol class="steps">
      <li><b>渡河。</b>在河流的三個河段上點亮一條彼岸花小徑，將亡魂帶到位於第12格的彼岸。這就是你們<b>勝利</b>的方式。</li>
      <li><b>憶念。</b>亡魂的記憶，就是你們手中的牌。隨著你們打出它們，其中最好的記憶可以被<b>銘刻</b>進<b>憶念之書</b>，一次一句。你們寫下的內容，決定亡魂<i>如何</i>面對守岸人；渡河結束時，這本書將被朗讀出來。</li>
    </ol>
    <p>河流會以三種方式反撲，每一種都意味著落敗：</p>
    <ul>
      <li>${ico("nb-fog", "#9A948C")} <b>消散</b>：亡魂遺忘了太多，溶入霧中。</li>
      <li>${ico("nb-fracture", "#D7263D")} <b>破碎</b>：哀傷三度擊碎亡魂。</li>
      <li>${ico("nb-blackwater", "#9A948C")} <b>滅頂</b>：黑水上漲，再也沒有任何東西能將它擋住。</li>
    </ul>
    <p>這款遊戲核心的張力在於：遺忘既是武器，也是傷口。放下記憶能讓亡魂更輕盈、走得更快，而你們最強大的幾張牌，正是遺忘之舉。但每放下一段記憶，它便從亡魂的故事中永遠消失，也讓亡魂離消散更近一步。</p>` },

  { id: "silence", title: "3. 靜默之律", keys: "靜默 無聲 交談 溝通 桌邊談話 禮儀 說話 talk communicate table talk etiquette silent quiet speak", body: `
    ${lore("在冥府，生者沒有聲音。你們唯一的語言，是最後打出的那張牌。")}
    <p>從遊戲設置開始，直到亡魂抵達彼岸或就此失落為止，任何人都不得談論遊戲。不可說出或展示你的手牌、不可暗示、不可用手指點，也不可詢問其他人該打什麼。</p>
    <p>你們可以談論所有人都看得見的事物：河流、織機與憶念之書。你真正的聲音是<b>迴響</b>，也就是最後一張正面打出的牌所屬的絲線（見第11節）。跟隨某人的迴響，等於在說「我懂你的意思」；留下一個清楚的迴響，等於在說「這是我接下來需要的」。</p>
    <p>遊戲結束時，靜默解除。由你們其中一人逐頁朗讀憶念之書，整桌人終於聽見你們一同拯救的那段人生。</p>` },

  { id: "pieces", title: "4. 桌上的世界", keys: "配件 標記 圖示 符號 意義 圖例 版圖 是什麼 components pieces symbols icons meaning legend board tokens what is", body: `
    ${lore("桌上的每一個配件，都是故事的一部分。")}
    <p>每個配件在故事中是什麼，在遊戲中又有什麼作用。這些圖示與你在版圖和卡牌上看到的完全相同。</p>
    <table class="rtable rpieces"><thead><tr><th>配件</th><th>在故事中</th><th>在遊戲中</th></tr></thead><tbody>
      ${piece("nb-soul", "#EFE7D6", "亡魂", "一位無錢的亡者，在此岸醒來，一生的記憶仍完整地留在心中。", "你們護送的棋子，從第0格走到第12格的彼岸。它只會踏上被照亮的格子。")}
      ${piece("", "", "河流", "忘川，從此岸蜿蜒流向彼岸。", "第0至12格。第1–11格各有上岸與下岸，每個河岸可容納1個板塊或標記。")}
      ${piece("", "", "三個河段", `冥府中的三段路程：灰濛濛的<b>${ZH_REACHES[0]}</b>、哀傷久久不散的<b>${ZH_REACHES[1]}</b>，以及河水最深的<b>${ZH_REACHES[2]}</b>。`, "第1–4、5–8與9–11格。每個河段各有自己的迷霧牌庫，並在憶念之書中各佔一章。亡魂每進入一個河段，織機便會清空。")}
      ${piece("nb-light", "#E6D3A3", "彼岸", "蒙著面紗的守岸人捧著遺忘之杯等候之處。", "第12格。亡魂抵達此處，你們便獲勝。")}
      ${piece("nb-fog", "#9A948C", "霧", "遮蔽河岸的霧氣。沒有人知道底下藏著什麼。", "覆蓋每個河岸，直到有人在該處放置根，掀開下方的板塊。")}
      ${piece("nb-fertile", "#6d665e", ZH_TILES[0], "河岸上鬆軟的泥土。", "根能在此生長。")}
      ${piece("nb-stony", "#9A948C", ZH_TILES[1], "堅硬灰冷的石頭，幾乎寸草不生。", "一般的根會就此失去。只有頑根與織根者能在此生長。")}
      ${piece("nb-memorysite", "#E6D3A3", ZH_TILES[2], "亡魂曾經熟悉的地方，穿過霧氣浮現。", "根順利生長，並且你們找到一件<b>信物</b>，那是亡魂生前的一件小東西。在無名渡河中，它還會給予2點光。")}
      ${piece("nb-grave", "#8FD6E1", ZH_TILES[3], "河岸上的一座墳。這裡埋著未了的事。", "根無法生長，反而會升起一個怨念。")}
      ${piece("nb-root", "#E6D3A3", "根", "種在黑暗中的一顆彼岸花種子。", "延伸你們的根網。根本身不會照亮格子。")}
      ${piece("nb-bloom", "#D7263D", "花", "一朵盛開、散發赤紅光芒的彼岸花，是迷途亡魂唯一能追隨的光。", "任一河岸有花的格子即為<b>照亮</b>，亡魂可以踏上該格。")}
      ${piece("nb-light", "#E6D3A3", "光", "亡魂走過的花所留下的光芒，被收集起來隨身攜帶。", "亡魂身後每留下1朵花，便獲得1點光。花費光來召喚稱號。")}
      ${piece("", "", "記憶牌", "亡魂的記憶。你們所有人的手牌合起來，就是亡魂仍記得的一切。", "每回合打出2張。每張牌都帶有一個效果、一條絲線，且往往帶有一句亡魂生平的記憶文字。")}
      ${piece(TAG_ICONS[0], TAGCOL[0], `${ZH_TAGS[0]}絲線`, "被紡出、被緊握的絲線：執著、積怨，以及亡魂無法放下的一切。", "強力的根牌。絲線打滿時斷裂為<b>攫取</b>：亡魂身旁出現一個怨念。")}
      ${piece(TAG_ICONS[1], TAGCOL[1], `${ZH_TAGS[1]}絲線`, "被丈量的絲線：溫柔、原諒與平靜。", "綻放與修補的牌。絲線打滿時斷裂為<b>認命</b>：亡魂坐下並徘徊。")}
      ${piece(TAG_ICONS[2], TAGCOL[2], `${ZH_TAGS[2]}絲線`, "被剪斷的絲線：刻意的遺忘。", "能夠開路的強力牌，但使用後會被遺忘。絲線打滿時斷裂為<b>漲潮</b>：黑水淹沒前方。")}
      ${piece("nb-knot", "#E6D3A3", "命運織機", "命運三女神為每個亡魂編織最後旅程的巨大織機。", "每張正面打出的牌，都會在其絲線上打1個結。同一條絲線上的結太多，便會引發反噬。")}
      ${piece("nb-echo", "#8FD6E1", "迴響", "織機的梭子，停在你們最後拉動的那條絲線上。在無聲的世界裡，它就是你們的聲音。", "最後一張正面打出的牌所屬的絲線。若你的第一張牌與它相符，該牌便會<b>共鳴</b>。")}
      ${piece("nb-grievance", "#8FD6E1", "怨念", "由亡魂自身未了的怨恨所化成、躁動不安的陰影。", "封鎖一個河岸。若位於亡魂身旁，它便會啃噬亡魂：每次亡魂步驟造成1道裂痕。")}
      ${piece("nb-blackwater", "#9A948C", "黑水", "上漲的河水，要將眼前的小徑吞沒。", "淹沒一格，使亡魂無法進入，並使該格的花凋零。供應有限；當黑水必須上漲卻已用盡時，便是滅頂。")}
      ${piece("nb-fracture", "#D7263D", "裂痕", "亡魂對自我的認知所出現的一道裂縫。", "第3道裂痕會使亡魂破碎。")}
      ${piece("", "", "遺忘堆", "被河水帶走的一切。", "被遺忘的牌將永遠消失。遺忘的牌夠多時，亡魂先是變得輕盈（輕如灰燼），接著失去控制（漂離），最後消散。")}
      ${piece("nb-fog", "#9A948C", "迷霧牌", "冥府本身：上漲的河水、寒冷的風、重返的霧氣。", "每個回合結束時，從當前河段的迷霧牌庫翻開1張。")}
      ${piece("", "", "稱號", `擺渡人在河上可以擔起的角色：${["weaver", "warden", "bringer", "breaker"].map(k => ZH_MANTLES[k].name).join("、")}。`, "以光召喚一個稱號，獲得永久的能力（見第15節）。")}
      ${piece("", "", "燈籠", "今夜的河有多暗。", "難度等級，1至5。")}
      ${piece("nb-seal", "#E6D3A3", "憶念之書", "古老的墓文囑咐亡者莫飲忘川，而要去尋找的記憶之泉。寫在這裡的，亡魂便能留住。", "共三頁，每個河段一頁，每頁是一個有四處空白的句子。共鳴的牌會將它們填滿。")}
      ${piece("nb-slot-place", "#E6D3A3", "地點・人物・事蹟・感受", "一段記憶的四個部分：在哪裡、和誰、做了什麼，以及留下了什麼。", "憶念之書每頁的四個欄位。每張記憶牌都對應其中一個。")}
      ${piece("nb-seal", "#D7263D", "關鍵記憶", "對這個亡魂而言最重要的那一段記憶。", "只要正面打出，隨時都可以銘刻。它被寫下、被遺忘，還是從未說出，決定了結局。")}
      ${piece("nb-soul", "#8FD6E1", "幽靈（單人模式）", "一位與你同行的沉默擺渡人。", "單人模式中，它在你的每個回合之後打出一張牌，並留下迴響讓你跟隨。")}
    </tbody></table>` },

  { id: "overview", title: "5. 一次渡河的始末", keys: "始末 篇章 章節 河段 節奏 概覽 流程 遊戲長度 arc chapters reaches pacing overview flow game length", body: `
    ${lore("三個河段，一生的三個篇章，盡頭是一杯水。")}
    <p>一局遊戲就是一次渡河，約15個回合。亡魂每走過一個河段，憶念之書便寫滿它生命中的一個篇章：</p>
    <ul>
      <li><b>第一河段・${ZH_REACHES[0]}：第一章・我曾是誰。</b>亡魂生於何處、愛過誰、背負著什麼。</li>
      <li><b>第二河段・${ZH_REACHES[1]}：第二章・我做過什麼。</b>定義了它一生的那件事，以及其代價。</li>
      <li><b>第三河段・${ZH_REACHES[2]}：第三章・我所懷抱的。</b>它原諒了什麼、無法挽回什麼、又留住了什麼。</li>
    </ul>
    <p>每個河段都比前一個更艱難：迷霧越發殘酷，亡魂也遺忘得更多。到了彼岸，守岸人遞上那一杯，而亡魂的關鍵記憶，決定它如何接過這杯水（見第22節）。</p>` },

  { id: "board", title: "6. 河流", keys: "河流 格 河段 河岸 欄位 此岸 彼岸 霧 spaces reach bank slot near shore far shore", body: `
    ${lore("河流從此岸蜿蜒流向彼岸，每一處河岸，都可能開出一朵花。")}
    <p>河流共有13格：此岸（0）、第1至11格，以及彼岸（12）。第1至11格的每一格都有<b>上岸</b>與<b>下岸</b>，每個河岸可容納1個標記。</p>
    <ul><li><b>第一河段・${ZH_REACHES[0]}</b>：第1–4格。</li><li><b>第二河段・${ZH_REACHES[1]}</b>：第5–8格。</li><li><b>第三河段・${ZH_REACHES[2]}</b>：第9–11格。</li></ul>
    <p>每個河段都有自己的迷霧牌庫，並在憶念之書中各佔一頁。當亡魂進入新的河段時，命運織機會被清空。</p>
    <p>遊戲設置時，第1格的兩個河岸各放有1朵花，因此第一步永遠是照亮的。第2–11格的河岸則都覆蓋著<b>霧</b>板塊。</p>` },

  { id: "tokens", title: "7. 根、花與根網", keys: "根 花 綻放 照亮 根網 連接 放置 root bloom lit network touch place", body: `
    ${lore("彼岸花只從另一朵彼岸花生長而出。你們的小徑，必須是一條不曾斷絕的光之絲線。")}
    <p>${ico("nb-root", "#E6D3A3")} <b>根</b>是黑暗中的一顆種子。${ico("nb-bloom", "#D7263D")} <b>花</b>是已綻放成彼岸花的根。</p>
    <p>只要一格中至少有一個河岸放有花，該格即為<b>照亮</b>。亡魂只會踏上被照亮的格子。</p>
    <p><b>放置根。</b>根必須放在亡魂所在格或其前方的空河岸上，且必須<b>連接根網</b>：</p>
    <ul><li>位於亡魂所在格或下一格；或</li><li>同一格的對岸已有標記；或</li><li>前一格或後一格的同側河岸已有標記。</li></ul>
    <p><b>綻放</b>：將一個位於亡魂所在格或其前方的根變成花。</p>` },

  { id: "fog", title: "8. 霧與板塊", keys: "霧 沃土 石地 記憶之地 墳墓 掀開 信物 fertile stony memory site grave reveal keepsake fog", body: `
    ${lore("霧下藏著鬆軟的泥土、堅硬的石頭、半被遺忘的地方，以及古老的墳墓。")}
    <p>${ico("nb-fog", "#9A948C")} 霧覆蓋著每個河岸。在霧上放置根時，掀開下方的板塊，由板塊決定結果：</p>
    <ul>
      <li>${ico("nb-fertile", "#6d665e")} <b>沃土</b>：根順利生長。</li>
      <li>${ico("nb-stony", "#9A948C")} <b>石地</b>：一般的根無法生長，該根就此失去。頑根與織根者則能在此生長。</li>
      <li>${ico("nb-memorysite", "#E6D3A3")} <b>記憶之地</b>：根順利生長，並且你們找到一件信物。在無名渡河中，它還會給予+2點光。</li>
      <li>${ico("nb-grave", "#8FD6E1")} <b>墳墓</b>：根無法生長，且該河岸會升起一個怨念。</li>
    </ul>
    <p>第一河段有3塊沃土、1塊石地與2塊記憶之地。第二河段有3塊沃土、2塊石地、2塊記憶之地與1塊墳墓。第三河段有2塊沃土、1塊石地、2塊記憶之地與1塊墳墓。迷霧可能讓霧氣重新籠罩已掀開且空無一物的河岸。</p>` },

  { id: "turn", title: "9. 你的回合", keys: "回合 順序 流程 召喚 打出 抽牌 手牌上限 turn order sequence summon play draw", body: `
    ${lore("你們種花，亡魂前行，河流回應。")}
    <ol class="steps">
      <li><b>召喚稱號</b>（可選，須在打出第一張牌之前）。</li>
      <li><b>打出第一張牌</b>：正面打出、背面打出或焚燒。</li>
      <li><b>打出第二張牌。</b></li>
      <li><b>引花人</b>：若你持有此稱號，免費使1個根綻放。</li>
      <li><b>亡魂步驟</b>：亡魂前進或徘徊。</li>
      <li><b>迷霧</b>：翻開當前河段迷霧牌庫頂的1張牌。</li>
      <li><b>河流平息</b>：根吸乾洪水，受困的怨念消散。</li>
      <li><b>抽牌</b>，補回手牌上限。單人模式中，此時輪到幽靈行動。</li>
    </ol>
    <p>單人模式的手牌上限為4張；2–4人遊戲時為3張。</p>` },

  { id: "modes", title: "10. 打出卡牌的三種方式", keys: "正面打出 背面打出 焚燒 方式 說出口 face up face down burn mode", body: `
    ${lore("一段記憶，可以說出口、藏在心底，或焚燒殆盡以換取力量。")}
    <ul>
      <li><b>正面打出</b>（說出口）：執行卡牌效果，在織機上該牌的絲線打1個結，且該牌的絲線成為新的<b>迴響</b>。執念牌與釋懷牌放入棄牌堆。<b>忘卻</b>牌使用後會被<b>遺忘</b>。</li>
      <li><b>背面打出</b>（藏在心底）：放置1個根。不打結，迴響也不改變。此牌放入棄牌堆。</li>
      <li><b>焚燒</b>（焚燒殆盡）：執行效果<b>兩次</b>並打1個結。接著遺忘此牌，並連同牌庫頂的1張牌一起遺忘。亡魂變得更輕，它的故事也變得更短。</li>
    </ul>` },

  { id: "echo", title: "11. 迴響與共鳴", keys: "迴響 共鳴 絲線 無聲 暗示 echo resonance resonate thread silent signal", body: `
    ${lore("當兩位沉默的擺渡人拉動同一條絲線，織機便會歌唱。")}
    <p>${ico("nb-echo", "#8FD6E1")} <b>迴響</b>是任何人最後一張正面打出的牌所屬的絲線。這是沉默的玩家彼此交談的方式。</p>
    <p>若你本回合打出的<b>第一張</b>牌與迴響屬於同一條絲線，它便會<b>共鳴</b>。另外執行它的共鳴效果；部分忘卻牌則<i>改為</i>執行共鳴效果。帶有記憶的共鳴牌可以<b>銘刻</b>進憶念之書。</p>
    <p>留下一個下一位玩家能安心跟隨的迴響，正是這款遊戲的核心。</p>` },

  { id: "loom", title: "12. 命運織機與反噬", keys: "織機 命運三女神 結 絲線 反噬 攫取 認命 漲潮 業力 loom knot thread backlash grasping resignation tide karma", body: `
    ${lore("把一條絲線拉得太緊，命運三女神便會往回拉。")}
    <p>織機有三條絲線：${ico(TAG_ICONS[0], TAGCOL[0])}<b>執念</b>、${ico(TAG_ICONS[1], TAGCOL[1])}<b>釋懷</b>與${ico(TAG_ICONS[2], TAGCOL[2])}<b>忘卻</b>。每張正面打出或焚燒的牌，都會在其絲線上打1個結。2–3人遊戲時，每條絲線可容納4個結；單人模式或4人遊戲時為5個。</p>
    <p>當一條絲線打滿時，它會斷裂並引發<b>反噬</b>，然後清空：</p>
    <ul>
      <li><b>執念・攫取</b>：亡魂緊抓著積怨不放，身旁出現一個怨念。</li>
      <li><b>釋懷・認命</b>：亡魂一時放棄了；在下一次亡魂步驟時，它坐下並徘徊，遺忘1張牌。</li>
      <li><b>忘卻・漲潮</b>：放下的已經太多，黑水淹沒前方的格子。</li>
    </ul>
    <p>每當亡魂進入新的河段，織機便會清空。</p>` },

  { id: "soulstep", title: "13. 亡魂步驟", keys: "亡魂步驟 移動 徘徊 光 輕如灰燼 漂離 遺忘 堅守 move linger light as ash adrift forget hold", body: `
    ${lore("亡魂只朝著光走。在黑暗中，它只能等待；而在等待中，它漸漸遺忘。")}
    <p>打完牌後，亡魂會試著向前邁步。若下一格<b>已被照亮且未被淹沒</b>，亡魂便移動到該格。身後每留下1朵花，亡魂便獲得1點光，且它離開的那一格會被清空。</p>
    <p>否則亡魂便<b>徘徊</b>。若身旁有光（它所在的格子被照亮），它只是靜靜等待。若身處黑暗，則遺忘牌庫頂的1張牌。<i>堅守</i>與守魂者可以阻止徘徊。</p>
    <p><b>輕如灰燼。</b>一旦遺忘了6張牌，只要可行，亡魂每次都會額外滑行一格。它要背負的東西變少了。</p>
    <p><b>漂離。</b>一旦遺忘了9張牌，亡魂每次移動時都會再漂流一格，即使漂入黑暗也一樣，並承受一道裂痕。已經幾乎沒有什麼能將它留在原地。</p>
    <p>若亡魂步驟結束後，有怨念位於亡魂身旁，它便會啃噬亡魂：<b>1道裂痕</b>。</p>` },

  { id: "threats", title: "14. 黑水、怨念與裂痕", keys: "黑水 淹沒 吸乾 排乾 滅頂 怨念 啃噬 裂痕 護盾 受困 black water flood drink deluge grievance feed fracture shield trapped", body: `
    ${lore("河水上漲，舊怨從墳中爬出，亡魂開始龜裂。")}
    <p>${ico("nb-blackwater", "#9A948C")} <b>黑水</b>會淹沒一整格。亡魂無法踏上該格，該格上的花也會凋零為根。若回合結束時，被淹沒格子的兩個河岸都有根或花，根便會<b>吸乾洪水</b>，將黑水排乾。被排乾的黑水會移出遊戲，因此黑水供應只會越來越少。若黑水必須上漲但供應已空：<b>滅頂</b>。</p>
    <p>${ico("nb-grievance", "#8FD6E1")} <b>怨念</b>會佔據一個河岸並將其封鎖。位於亡魂身旁的怨念，在每次亡魂步驟都會啃噬亡魂。若怨念所在河岸的同一側，前一格與後一格都有花，它便<b>受困於光中</b>，並在回合結束時消散。</p>
    <p>${ico("nb-fracture", "#D7263D")} <b>裂痕</b>來自啃噬的怨念、漂離與黑風。累積3道時，亡魂便<b>破碎</b>。<i>守住防線</i>能升起一面護盾，擋下下一道裂痕。</p>` },

  { id: "mantles", title: "15. 稱號與光", keys: "稱號 召喚 光 織根者 守魂者 引花人 破霧者 mantle summon light weaver warden bringer breaker", body: `
    ${lore("走過之花留下的光芒，可以用來擔起河上一個古老的角色。")}
    <p>在打出第一張牌之前，你可以<b>召喚</b>一個尚無人持有的稱號：支付光（3點；國王為2點），並棄置1張與該稱號同一絲線的牌。每位玩家最多持有一個稱號。</p>
    <ul>${Object.entries(MANTLES).map(([k, m]) => `<li>${ico(TAG_ICONS[m.tag], TAGCOL[m.tag])}<b>${esc(ZH_MANTLES[k].name)}</b>：${esc(ZH_MANTLES[k].text)}</li>`).join("")}</ul>` },

  { id: "book", title: "16. 憶念之書", keys: "憶念之書 記憶之泉 銘刻 頁 章節 祝福 關鍵記憶 信物 欄位 地點 人物 事蹟 感受 inscribe page chapter blessing key memory keepsake slot place person deed feeling", body: `
    ${lore("古老的墓文告誡亡者：莫飲忘川之水，當尋記憶之泉。這本書，就是那道泉水。")}
    <p>憶念之書每個河段各有一頁。每頁有四個欄位：<b>地點</b>、<b>人物</b>、<b>事蹟</b>與<b>感受</b>，填滿後便組成一句關於亡魂生平的話。</p>
    <p>當一張牌共鳴時，若它的記憶所屬欄位在當前頁面上仍是空的，你可以將其<b>銘刻</b>。<b>關鍵記憶</b>牌只要正面打出，隨時都可以銘刻。被銘刻的牌將永久離開牌庫：你們以一張有用的牌，換來一段亡魂將會留住的記憶。</p>
    <p><b>章節祝福。</b>當一頁記下3段記憶時（花環少女為2段），河流會給予下列第一個適用的恩賜：修補一道裂痕、排乾黑水，或取回一張被遺忘的牌。</p>
    <p>遊戲結束時，朗讀憶念之書。從未填上的欄位會讀作「……但這一段，已被河水帶走」。</p>` },

  { id: "souls", title: "17. 亡魂", keys: "亡魂 孩子 國王 花環 新娘 無名渡河 特色規則 故事 第一場 新手 建議 child king garland bride open crossing twist first game new players suggested story", body: `
    ${lore("老擺渡人不肯載的四個亡魂，以及一個連名字都沒有的亡魂。")}
    <p>每位具名亡魂都會加入自己專屬的8張記憶牌，其中包括1張<b>關鍵記憶</b>，以及一條源自其故事的特色規則。無名渡河則改為加入8張迴響牌。</p>
    <h4>${esc(ZH_SOULS.child.name)}</h4>
    <p>一年中最寒冷的那一夜，一個小小的孩子獨自蜷在門口，手裡握著一把要賣的小火光，一個也沒賣出去。為了取暖，她把它們一一點亮。每一朵火焰裡，她都看見了些什麼：一座暖爐、一桌盛宴；最後，是那個唯一曾經抱過她的人，前來帶她回家。</p>
    <p><b>特色規則：</b>${esc(ZH_SOULS.child.twist)}她小小的火光守護著她。<b>關鍵記憶：</b><i>${band("L04")}</i>。</p>
    <h4>${esc(ZH_SOULS.garland.name)}</h4>
    <p>一位年輕女子，為她所愛的每一個人都編了一朵花。後來父親死了，那個許諾要娶她的男人變得冷酷，她便將花一朵一朵送了出去，然後仍輕聲唱著歌，滑入了溪水之中。她為自己留下了一朵花，卻從沒有人知道是哪一朵。</p>
    <p><b>特色規則：</b>${esc(ZH_SOULS.garland.twist)}她是以憶念之書為核心的亡魂。<b>關鍵記憶：</b><i>${band("G-04")}</i>。</p>
    <h4>${esc(ZH_SOULS.king.name)}</h4>
    <p>一位年邁的國王，贏下了每一場戰役，唯獨輸了最後一場。他最親近的摯友愛上了他的王后，他的同袍從此分崩離析，而他倒在一片親手造就的戰場上。彌留之際，他被安放在一艘黑色的渡船上。他借來的那柄寶劍，從未歸還給它所來自的那片湖水，因此他始終無法安息。</p>
    <p><b>特色規則：</b>${esc(ZH_SOULS.king.twist)}他的同伴只需些許代價便會重新集結，一旦有所破碎，便又離散而去。<b>關鍵記憶：</b><i>${band("K04")}</i>。</p>
    <h4>${esc(ZH_SOULS.bride.name)}</h4>
    <p>她死在自己的婚禮當天。她的丈夫走進黑暗深處，想把她帶回人間，卻有一個條件：在抵達光明之前，絕不能回頭。距離地面只剩一步時，他轉過了頭。從那以後，她便一直佇立在陰影裡，思量著該記住他的臉，還是放手讓它遠去。</p>
    <p><b>特色規則：</b>${esc(ZH_SOULS.bride.twist)}<b>關鍵記憶：</b><i>${band("B04")}</i>。</p>
    <h4>${esc(ZH_SOULS.open.name)}</h4>
    <p>一個無名的亡魂。你們不會得知它的故事，而是要親手寫下它。${esc(ZH_SOULS.open.twist)}這個亡魂沒有關鍵記憶，因此憶念之書就是它將擁有的一切。</p>
    <p class="rsuggest">${ico("nb-light", "#E6D3A3")}<b>你的第一次渡河：</b>我們建議以燈籠1或2遊玩<b>${esc(ZH_SOULS[FIRST_SOUL].name)}</b>。這位亡魂的特色規則能讓新玩家在遇見其他亡魂之前，先熟悉河流、織機與憶念之書。</p>` },

  { id: "mist", title: "18. 迷霧", keys: "迷霧 凶霧 迷霧牌 牌庫 漲水 凋零 寒風 黑風 霧氣重返 迴響斷絕 mist harsh card deck rising water withering cold wind fog returns severed", body: `
    ${lore("冥府並非空無一物。每個回合過後，它都會有所動靜。")}
    <p>每個回合結束時，翻開當前河段迷霧牌庫頂的1張牌。每個迷霧牌庫還另有2張額外的牌（漲水與怨念逼近），並在較高的燈籠等級加入一些<b>凶霧</b>牌。</p>${mistTableZh()}` },

  { id: "lantern", title: "19. 燈籠等級", keys: "難度 燈籠 等級 difficulty lantern level", body: `
    ${lore("夜色越深，燈籠能照見的便越少。")}
    <p>燈籠決定遊戲難度。</p>${lanternTableZh()}` },

  { id: "solo", title: "20. 單人模式與幽靈", keys: "單人模式 單人 幽靈 自動玩家 solo ghost automaton", body: `
    ${lore("即使是孤身一人的擺渡人，在河上也從不真正孤單。")}
    <p>單人模式中，你的手牌為4張，織機的每條絲線可容納5個結，且在你的每個回合結束後，<b>幽靈</b>會打出它專屬牌庫頂的牌。幽靈同樣會打結並設定迴響，請把它納入你的盤算。</p>${ghostTableZh()}` },

  { id: "end", title: "21. 勝利與落敗", keys: "勝利 落敗 失敗 消散 破碎 滅頂 遊戲結束 win lose faded shattered deluge end", body: `
    <p><b>勝利</b>：亡魂抵達彼岸。</p>
    <ul>
      <li><b>消散</b>：遺忘堆達到燈籠的上限。遺忘的太多，已沒有什麼留下來渡河。</li>
      <li><b>破碎</b>：第3道裂痕。三度破碎之後，亡魂再也撐不起自己，無法前行。</li>
      <li><b>滅頂</b>：黑水必須上漲，但供應已空。黑色的河水升起，再也沒有任何東西能將它擋住。</li>
    </ul>` },

  { id: "endings", title: "22. 彼岸與那一杯", keys: "結局 關鍵記憶 已銘刻 已遺忘 未曾說出 朗讀 尾聲 那一杯 守岸人 ending key memory inscribed forgotten unspoken read aloud epilogue cup keeper", body: `
    ${lore("在彼岸，守岸人掀起面紗，遞上那一杯。亡魂記得什麼，決定了它如何飲下。")}
    <p>渡河結束時，靜默解除。查看亡魂的<b>關鍵記憶</b>身在何處：</p>
    <ul>
      <li><b>已銘刻於書中</b>：被留住，也被說出。亡魂帶著最重要的記憶渡河。</li>
      <li><b>已遺忘</b>：被河水帶走。亡魂繼續前行，更輕盈，也更空洞，再也沒有它。</li>
      <li><b>未曾說出</b>（仍在牌庫、手牌或棄牌堆中，從未寫下）：從未面對。有些事，就這樣不曾說出口地渡過了河。</li>
    </ul>
    <p>接著逐頁朗讀憶念之書。即使渡河失敗，也會留下一個故事：空白的欄位會讀作「……但這一段，已被河水帶走」，而尾聲會訴說亡魂如何失落。每一局，都會寫下一段不同的人生。</p>` },

  { id: "cards", title: "23. 卡牌參考", keys: "卡牌 參考 效果 一覽 cards reference effects", body: cardTableZh() },
];

// 單頁玩家輔助卡。遊戲進行中時，顯示該局的數值。
export function playerAidZh(cfg) {
  const lim = cfg ? cfg.forgottenLimit : "10–14", cap = cfg ? cfg.karmaCap : "4–5", ash = cfg ? cfg.ashAt : 6, adrift = cfg ? (cfg.adriftAt < 99 ? cfg.adriftAt : "永不") : 9;
  return `
  <section class="aid">
    <h3>你的回合</h3>
    <ol class="steps">
      <li><b>召喚</b> <span>可選・支付光，棄置1張同絲線的牌</span></li>
      <li><b>第1張牌</b> <span>與迴響相符？它會共鳴</span></li>
      <li><b>第2張牌</b></li>
      <li><b>亡魂步驟</b> <span>前方照亮且未淹沒：前進。否則：徘徊</span></li>
      <li><b>迷霧</b> <span>翻開本河段的1張牌</span></li>
      <li><b>平息並抽牌</b> <span>根吸乾洪水，受困的怨念消散</span></li>
    </ol>
    <h3>打出卡牌</h3>
    <div class="aidgrid">
      <div><b>正面打出</b><span>效果＋結＋新迴響</span></div>
      <div><b>背面打出</b><span>只放置1個根</span></div>
      <div><b>焚燒</b><span>效果×2，遺忘此牌＋1張</span></div>
    </div>
    <h3>絲線（${cap}個結）</h3>
    <div class="aidgrid">
      <div class="c-obs">${ico(TAG_ICONS[0], TAGCOL[0])}<b>執念</b><span>反噬：亡魂身旁出現怨念</span></div>
      <div class="c-acc">${ico(TAG_ICONS[1], TAGCOL[1])}<b>釋懷</b><span>反噬：亡魂徘徊</span></div>
      <div class="c-obl">${ico(TAG_ICONS[2], TAGCOL[2])}<b>忘卻</b><span>反噬：前方出現黑水。打出的牌會被遺忘</span></div>
    </div>
    <h3>根必須連接根網</h3>
    <p>亡魂所在格或下一格、同一格的對岸，或相鄰格的同側河岸。</p>
    <h3>遺忘</h3>
    <div class="aidgrid">
      <div><b>${ash}</b><span>輕如灰燼：多滑行1格</span></div>
      <div><b>${adrift}</b><span>漂離：漂入黑暗，+1道裂痕</span></div>
      <div><b>${lim}</b><span>消散：遊戲失敗</span></div>
    </div>
    <h3>落敗條件</h3>
    <p><b>消散</b>（遺忘${lim}張）・<b>破碎</b>（3道裂痕）・<b>滅頂</b>（黑水須上漲，但已用盡）</p>
    <h3>圖示</h3>
    <div class="aidicons">
      <span>${ico("nb-bloom", "#D7263D")}花</span><span>${ico("nb-root", "#E6D3A3")}根</span><span>${ico("nb-grievance", "#8FD6E1")}怨念</span>
      <span>${ico("nb-blackwater", "#9A948C")}黑水</span><span>${ico("nb-fog", "#9A948C")}霧</span><span>${ico("nb-stony", "#9A948C")}石地</span>
      <span>${ico("nb-memorysite", "#E6D3A3")}記憶之地</span><span>${ico("nb-grave", "#8FD6E1")}墳墓</span><span>${ico("nb-fracture", "#D7263D")}裂痕</span>
      <span>${ico("nb-light", "#E6D3A3")}光</span><span>${ico("nb-echo", "#8FD6E1")}迴響</span><span>${ico("nb-seal", "#E6D3A3")}祝福</span>
    </div>
  </section>`;
}
