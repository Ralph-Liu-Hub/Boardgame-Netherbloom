// 規則書與玩家輔助卡（正體中文，台灣桌遊用語）。結構與 rules.js 相同；卡牌、迷霧、燈籠與幽靈表格
// 直接由 cards.js 與 zh.js 產生，因此無論目前介面語言為何，這裡的表格一律是中文。
import {
  CARDS, TAG_ICONS, MANTLES, SOULS, FIRST_SOUL, LANTERN, MIST, HARSH, GHOST,
} from "./cards.js";
import { ZH_TAGS, ZH_CARD_NAMES, ZH_SOULS, ZH_MIST, ZH_MANTLES, ZH_REACHES, zhOpsText } from "./zh.js";

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

// 每個章節：id、標題、搜尋關鍵字（中英文並列）與內文 HTML。
export const RULEBOOK_ZH = [
  { id: "overview", title: "1. 渡河", keys: "渡河 亡魂 彼岸 無聲 合作 crossing soul far shore silent co-operative", body: `
    <p>一個亡魂在遺忘之河的此岸醒來。你們將一同培育一條彼岸花小徑——<b>Netherbloom</b>——引領它前往位於第12格的<b>彼岸</b>。沿途，你們要抉擇哪些記憶該留下，哪些該交給河水帶走。</p>
    <p>Netherbloom 是一款適合1至4名玩家的<b>無聲合作</b>遊戲。所有人同勝同敗。你永遠不可以告訴其他玩家你的手牌內容或你打算怎麼做。你打出的牌，以及它們留下的迴響，就是你唯一的聲音。</p>` },
  { id: "board", title: "2. 河流", keys: "格 河段 河岸 欄位 此岸 彼岸 霧 spaces reach bank slot near shore far shore", body: `
    <p>河流共有13格：此岸（0）、第1至11格，以及彼岸（12）。第1至11格的每一格都有<b>上岸</b>與<b>下岸</b>，每個河岸可容納1個標記。</p>
    <ul><li><b>第一河段・${ZH_REACHES[0]}</b>：第1–4格。</li><li><b>第二河段・${ZH_REACHES[1]}</b>：第5–8格。</li><li><b>第三河段・${ZH_REACHES[2]}</b>：第9–11格。</li></ul>
    <p>每個河段都有自己的迷霧牌庫，並在憶念之書中各佔一頁。當亡魂進入新的河段時，命運織機會被清空。</p>
    <p>遊戲設置時，第1格的兩個河岸各放有1朵花，因此第一步永遠是照亮的。第2–11格的河岸則都覆蓋著<b>霧</b>板塊。</p>` },
  { id: "tokens", title: "3. 根、花與根網", keys: "根 花 綻放 照亮 根網 連接 放置 root bloom lit network touch place", body: `
    <p>${ico("nb-root", "#E6D3A3")} <b>根</b>是黑暗中的一顆種子。${ico("nb-bloom", "#D7263D")} <b>花</b>是已綻放成彼岸花的根。</p>
    <p>只要一格中至少有一個河岸放有花，該格即為<b>照亮</b>。亡魂只會踏上被照亮的格子。</p>
    <p><b>放置根。</b>根必須放在亡魂所在格或其前方的空河岸上，且必須<b>連接根網</b>：</p>
    <ul><li>位於亡魂所在格或下一格；或</li><li>同一格的對岸已有標記；或</li><li>前一格或後一格的同側河岸已有標記。</li></ul>
    <p><b>綻放</b>：將一個位於亡魂所在格或其前方的根變成花。</p>` },
  { id: "fog", title: "4. 霧與板塊", keys: "霧 沃土 石地 記憶之地 墳墓 掀開 信物 fertile stony memory site grave reveal keepsake fog", body: `
    <p>${ico("nb-fog", "#9A948C")} 霧覆蓋著每個河岸。在霧上放置根時，掀開下方的板塊，由板塊決定結果：</p>
    <ul>
      <li><b>沃土</b>：根順利生長。</li>
      <li>${ico("nb-stony", "#9A948C")} <b>石地</b>：一般的根無法生長，該根就此失去。頑根與織根者則能在此生長。</li>
      <li>${ico("nb-memorysite", "#E6D3A3")} <b>記憶之地</b>：根順利生長，並且你們找到一件信物。在無名渡河中，它還會給予+2點光。</li>
      <li>${ico("nb-grave", "#8FD6E1")} <b>墳墓</b>：根無法生長，且該河岸會升起一個怨念。</li>
    </ul>
    <p>第一河段有3塊沃土、1塊石地與2塊記憶之地。第二河段有3塊沃土、2塊石地、2塊記憶之地與1塊墳墓。第三河段有2塊沃土、1塊石地、2塊記憶之地與1塊墳墓。迷霧可能讓霧氣重新籠罩已掀開且空無一物的河岸。</p>` },
  { id: "turn", title: "5. 你的回合", keys: "回合 順序 流程 召喚 打出 抽牌 手牌上限 turn order sequence summon play draw", body: `
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
  { id: "modes", title: "6. 打出卡牌的三種方式", keys: "正面打出 背面打出 焚燒 方式 face up face down burn mode", body: `
    <ul>
      <li><b>正面打出</b>：執行卡牌效果，在織機上該牌的絲線打1個結，且該牌的絲線成為新的<b>迴響</b>。執念牌與釋懷牌放入棄牌堆。<b>忘卻</b>牌使用後會被<b>遺忘</b>。</li>
      <li><b>背面打出</b>：放置1個根。不打結，迴響也不改變。此牌放入棄牌堆。</li>
      <li><b>焚燒</b>：執行效果<b>兩次</b>並打1個結。接著遺忘此牌，並連同牌庫頂的1張牌一起遺忘。</li>
    </ul>` },
  { id: "echo", title: "7. 迴響與共鳴", keys: "迴響 共鳴 絲線 無聲 暗示 echo resonance resonate thread silent signal", body: `
    <p>${ico("nb-echo", "#8FD6E1")} <b>迴響</b>是任何人最後一張正面打出的牌所屬的絲線。這是沉默的玩家彼此交談的方式。</p>
    <p>若你本回合打出的<b>第一張</b>牌與迴響屬於同一條絲線，它便會<b>共鳴</b>。另外執行它的共鳴效果；部分忘卻牌則<i>改為</i>執行共鳴效果。帶有記憶的共鳴牌可以<b>銘刻</b>進憶念之書。</p>
    <p>留下一個下一位玩家能安心跟隨的迴響，正是這款遊戲的核心。</p>` },
  { id: "loom", title: "8. 命運織機與反噬", keys: "織機 結 絲線 反噬 攫取 認命 漲潮 業力 loom knot thread backlash grasping resignation tide karma", body: `
    <p>織機有三條絲線：${ico(TAG_ICONS[0], TAGCOL[0])}<b>執念</b>、${ico(TAG_ICONS[1], TAGCOL[1])}<b>釋懷</b>與${ico(TAG_ICONS[2], TAGCOL[2])}<b>忘卻</b>。每張正面打出或焚燒的牌，都會在其絲線上打1個結。2–3人遊戲時，每條絲線可容納4個結；單人模式或4人遊戲時為5個。</p>
    <p>當一條絲線打滿時，它會斷裂並引發<b>反噬</b>，然後清空：</p>
    <ul>
      <li><b>執念・攫取</b>：亡魂身旁出現一個怨念。</li>
      <li><b>釋懷・認命</b>：在下一次亡魂步驟時，亡魂坐下並徘徊，遺忘1張牌。</li>
      <li><b>忘卻・漲潮</b>：黑水淹沒前方的格子。</li>
    </ul>
    <p>每當亡魂進入新的河段，織機便會清空。</p>` },
  { id: "soulstep", title: "9. 亡魂步驟", keys: "亡魂步驟 移動 徘徊 光 輕如灰燼 漂離 遺忘 堅守 move linger light as ash adrift forget hold", body: `
    <p>打完牌後，亡魂會試著向前邁步。若下一格<b>已被照亮且未被淹沒</b>，亡魂便移動到該格。身後每留下1朵花，亡魂便獲得1點光，且它離開的那一格會被清空。</p>
    <p>否則亡魂便<b>徘徊</b>。若身旁有光（它所在的格子被照亮），它只是靜靜等待。若身處黑暗，則遺忘牌庫頂的1張牌。<i>堅守</i>與守魂者可以阻止徘徊。</p>
    <p><b>輕如灰燼。</b>一旦遺忘了6張牌，只要可行，亡魂每次都會額外滑行一格。</p>
    <p><b>漂離。</b>一旦遺忘了9張牌，亡魂每次移動時都會再漂流一格，即使漂入黑暗也一樣，並承受一道裂痕。</p>
    <p>若亡魂步驟結束後，有怨念位於亡魂身旁，它便會啃噬亡魂：<b>1道裂痕</b>。</p>` },
  { id: "threats", title: "10. 黑水、怨念與裂痕", keys: "黑水 淹沒 吸乾 排乾 滅頂 怨念 啃噬 裂痕 護盾 受困 black water flood drink deluge grievance feed fracture shield trapped", body: `
    <p>${ico("nb-blackwater", "#9A948C")} <b>黑水</b>會淹沒一整格。亡魂無法踏上該格，該格上的花也會凋零為根。若回合結束時，被淹沒格子的兩個河岸都有根或花，根便會<b>吸乾洪水</b>，將黑水排乾。被排乾的黑水會移出遊戲，因此黑水供應只會越來越少。若黑水必須上漲但供應已空：<b>滅頂</b>。</p>
    <p>${ico("nb-grievance", "#8FD6E1")} <b>怨念</b>會佔據一個河岸並將其封鎖。位於亡魂身旁的怨念，在每次亡魂步驟都會啃噬亡魂。若怨念所在河岸的同一側，前一格與後一格都有花，它便<b>受困於光中</b>，並在回合結束時消散。</p>
    <p>${ico("nb-fracture", "#D7263D")} <b>裂痕</b>來自啃噬的怨念、漂離與黑風。累積3道時，亡魂便<b>破碎</b>。<i>守住防線</i>能升起一面護盾，擋下下一道裂痕。</p>` },
  { id: "book", title: "11. 憶念之書", keys: "憶念之書 銘刻 頁 章節 祝福 關鍵記憶 信物 欄位 地點 人物 事蹟 感受 inscribe page chapter blessing key memory keepsake slot place person deed feeling", body: `
    <p>憶念之書每個河段各有一頁。每頁有四個欄位：<b>地點</b>、<b>人物</b>、<b>事蹟</b>與<b>感受</b>，填滿後便組成一句關於亡魂生平的話。</p>
    <p>當一張牌共鳴時，若它的記憶所屬欄位在當前頁面上仍是空的，你可以將其<b>銘刻</b>。<b>關鍵記憶</b>牌只要正面打出，隨時都可以銘刻。被銘刻的牌將永久離開牌庫。</p>
    <p><b>章節祝福。</b>當一頁記下3段記憶時（花環少女為2段），河流會給予下列第一個適用的恩賜：修補一道裂痕、排乾黑水，或取回一張被遺忘的牌。</p>
    <p>遊戲結束時，朗讀憶念之書。從未填上的欄位會讀作「……但這一段，已被河水帶走」。</p>` },
  { id: "mantles", title: "12. 稱號與光", keys: "稱號 召喚 光 織根者 守魂者 引花人 破霧者 mantle summon light weaver warden bringer breaker", body: `
    <p>在打出第一張牌之前，你可以<b>召喚</b>一個尚無人持有的稱號：支付光（3點；國王為2點），並棄置1張與該稱號同一絲線的牌。每位玩家最多持有一個稱號。</p>
    <ul>${Object.entries(MANTLES).map(([k, m]) => `<li>${ico(TAG_ICONS[m.tag], TAGCOL[m.tag])}<b>${esc(ZH_MANTLES[k].name)}</b>：${esc(ZH_MANTLES[k].text)}</li>`).join("")}</ul>` },
  { id: "souls", title: "13. 亡魂", keys: "亡魂 孩子 國王 花環 新娘 無名渡河 特色規則 第一場 新手 建議 child king garland bride open crossing twist first game new players suggested", body: `
    <ul>${Object.keys(SOULS).map(k => `<li><b>${esc(ZH_SOULS[k].name)}</b>：${esc(ZH_SOULS[k].twist)}</li>`).join("")}</ul>
    <p>每位具名亡魂都會加入自己專屬的8張牌，其中包括1張<b>關鍵記憶</b>。無名渡河則改為加入8張迴響牌。</p>
    <p class="rsuggest">${ico("nb-light", "#E6D3A3")}<b>你的第一次渡河：</b>我們建議以燈籠1或2遊玩<b>${esc(ZH_SOULS[FIRST_SOUL].name)}</b>。它的特色規則能讓新玩家在遇見其他亡魂之前，先熟悉河流、織機與憶念之書。</p>` },
  { id: "mist", title: "14. 迷霧", keys: "迷霧 凶霧 迷霧牌 牌庫 漲水 凋零 寒風 黑風 霧氣重返 迴響斷絕 mist harsh card deck rising water withering cold wind fog returns severed", body: `
    <p>每個回合結束時，翻開當前河段迷霧牌庫頂的1張牌。每個迷霧牌庫還另有2張額外的牌（漲水與怨念逼近），並在較高的燈籠等級加入一些<b>凶霧</b>牌。</p>${mistTableZh()}` },
  { id: "lantern", title: "15. 燈籠等級", keys: "難度 燈籠 等級 difficulty lantern level", body: `<p>燈籠決定遊戲難度。</p>${lanternTableZh()}` },
  { id: "solo", title: "16. 單人模式與幽靈", keys: "單人模式 單人 幽靈 自動玩家 solo ghost automaton", body: `
    <p>單人模式中，你的手牌為4張，織機的每條絲線可容納5個結，且在你的每個回合結束後，<b>幽靈</b>會打出它專屬牌庫頂的牌。幽靈同樣會打結並設定迴響，請把它納入你的盤算。</p>${ghostTableZh()}` },
  { id: "end", title: "17. 勝利與落敗", keys: "勝利 落敗 失敗 消散 破碎 滅頂 遊戲結束 win lose faded shattered deluge end", body: `
    <p><b>勝利</b>：亡魂抵達彼岸。</p>
    <ul><li><b>消散</b>：遺忘堆達到燈籠的上限。</li><li><b>破碎</b>：第3道裂痕。</li><li><b>滅頂</b>：黑水必須上漲，但供應已空。</li></ul>` },
  { id: "cards", title: "18. 卡牌參考", keys: "卡牌 參考 效果 一覽 cards reference effects", body: cardTableZh() },
  { id: "silence", title: "19. 無聲遊玩", keys: "交談 溝通 桌邊談話 禮儀 無聲 talk communicate table talk etiquette", body: `
    <p>你可以談論公開的資訊：版圖、織機與憶念之書。你不可以說出手牌中的牌、暗示它們，或詢問其他人該打什麼。一個好的迴響，勝過千言萬語。</p>` },
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
