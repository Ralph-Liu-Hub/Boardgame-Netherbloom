// 正體中文（台灣桌遊用語）資料：卡牌、亡魂、迷霧、稱號與效果文字。結構與 cards.js 相同，以 id 或英文名稱對應。
//
// 用語表（遊戲內一律使用）：
//   Soul 亡魂 · Far Shore 彼岸 · near shore 此岸 · space 格 · bank 河岸（left 左岸 / right 右岸；面向下游，左岸在版圖上方）· Reach 河段
//   Root 根 · Bloom 花（動詞：綻放）· Lit 照亮 · network 根網 · fog 霧 · Light 光（點）
//   Fertile 沃土 · Stony 石地 · Memory Site 記憶之地 · Grave 墳墓 · keepsake 信物
//   Black Water 黑水 · flood 淹沒 · drain 排乾 · Deluge 滅頂 · Grievance 怨念 · banish 驅散 · Fracture 裂痕 · Shield 護盾
//   Shattered 破碎 · Faded 消散 · Linger 徘徊 · forget 遺忘 · forgotten pile 遺忘堆 · Light as Ash 輕如灰燼 · Adrift 漂離
//   Loom of the Fates 命運織機 · thread 絲線 · knot 結 · Backlash 反噬 · Obsession 執念 · Acceptance 釋懷 · Oblivion 忘卻
//   Echo 迴響 · Resonate / Resonance 共鳴 · face up 正面打出 · face down 背面打出 · Burn 焚燒
//   Book of Remembrance 憶念之書 · inscribe 銘刻 · Chapter Blessing 章節祝福 · Key Memory 關鍵記憶
//   Mantle 稱號 · Summon 召喚 · Mist 迷霧 · harsh Mist 凶霧 · Lantern 燈籠（難度：Gentle 溫和 / Standard 標準 / Hard 困難 / Heroic 英雄）· Ghost 幽靈（單人模式的自動玩家）
//   Soul Step 亡魂步驟 · deck 牌庫 · discard pile 棄牌堆 · hand 手牌 · draw 抽牌 · turn 回合 · round 輪
//   Place 地點 · Person 人物 · Deed 事蹟 · Feeling 感受
//   Ferrymen 擺渡人（玩家：冥府的僕役，既非生者也非亡魂）· old ferryman 老擺渡人（傳說中只載付了船資的亡者）· Keeper 守岸人
//   action 行動 · Answer (first action) 回應 · Steer (second action) 掌舵 · Seek 尋覓 · discard 棄掉 · push through 奮力駛過 · Recall 喚回 · lay down (a Mantle, for good) 永久放下 · Chronicle 紀事
//   tokens: the Oar (whose turn) 船槳 · Push Through token 破浪標記（擺渡人使盡全力、破浪駛過險阻） · Hold Fast token 堅守標記 · Shield token 護盾標記 · Resignation token 認命標記 · turn a card sideways 橫放 · straighten 轉正
//   Backlash 反噬：Grasping 攫取 / Resignation 認命 / The Tide Rises 漲潮

export const ZH_LANTERNS = { 1: "溫和", 2: "標準", 3: "困難", 4: "英雄" };
export const ZH_TAGS = ["執念", "釋懷", "忘卻"];
export const ZH_SLOTS = { Place: "地點", Person: "人物", Deed: "事蹟", Feeling: "感受" };
export const ZH_TILES = ["沃土", "石地", "記憶之地", "墳墓"];
export const ZH_REACHES = ["日光蘭之路", "哀悼之野", "忘川之岸"];

export const ZH_CARD_NAMES = {
  "Deep Roots": "深根", "Stubborn Root": "頑根", "Hold Fast": "堅守", "Overreach": "貪求", "Vigil": "守夜",
  "Hold the Line": "守住防線", "Old Oath": "舊誓", "Open Hand": "張開手心", "Full Bloom": "盛放", "Mend": "修補",
  "Let Go": "放手", "Guide": "引路", "Rekindle": "重燃", "Unremember": "不復記憶", "Blank Fog": "白霧",
  "Unmake": "消解", "Wash Away": "沖刷", "Low Tide": "退潮", "Lethe's Gift": "忘川之禮", "Echo": "迴響",
  "Last Army": "最後的軍隊", "The Line": "防線", "Heavy Crown": "沉重王冠", "The Lake's Gift": "湖中之禮",
  "Honest Love": "真摯之愛", "Too Late": "為時已晚",
  "Pretended Stranger": "佯裝陌路", "The Song": "那首歌", "Every Flower": "每一朵花", "One Flower Kept": "留給自己的花",
  "The Willow": "垂柳", "Names of Herbs": "草藥之名",
  "Without a Word": "一語不發", "The Narrow Stair": "窄梯", "Almost Saved": "差點得救", "His Face": "他的臉",
  "Noon Meadow": "正午草原", "His Hand": "他的手",
  "Coldest Doorway": "最冷的門口", "Hunger": "飢餓", "One More Light": "再一點火光", "Held": "被擁抱",
  "Frosted Window": "結霜的窗", "Roast Apples": "烤蘋果",
};

// Memory bands by card id. Each must read naturally inside the Book's sentence frames below.
export const ZH_BANDS = {
  C01: "我發誓永不離開的那道門", C02: "我埋葬怒氣的那座山丘", C03: "出賣我名字的朋友",
  C04: "我走過上千遍的那條路", C05: "在承諾早已無關緊要之後仍守著它", C06: "我發誓要償還的一筆債",
  C07: "在低頭便能得救時拒絕低頭", C08: "本該屬於我的那棟房子", C09: "一隻從未鬆開的拳頭",
  C10: "我始終無法原諒的對手", C11: "我一心想討好的老師", C12: "算清每一枚別人欠我的錢",
  C13: "我在黑暗中反覆唸著的名字", C14: "飄著麵包與柴煙香氣的廚房", C15: "在織布機前哼著歌的母親",
  C16: "無事可做的傍晚那份溫暖", C17: "夏天我們洗腳的那條河", C18: "與我分享斗笠的陌生人",
  C19: "在渡口原諒了我的兄弟", C20: "我終於不再害怕的寂靜", C21: "任蘋果花飄落，不再細數",
  C22: "叫錯我名字的孩子", C23: "種下一棵我知道自己永遠無法在樹下乘涼的樹", C24: "春天第一個溫暖的傍晚",
  E01: "窗邊一盞未熄的燈", E02: "被我誤當成力量的憤怒", E03: "不肯收我銅錢的擺渡人",
  E04: "替一個我從未道謝的人挑水", E05: "雪中賣栗子的老婦人", E06: "我每天早晨走過的那座橋",
  K01: "我最後一支軍隊倒下的戰場", K02: "在防線早已失守後仍堅守陣地", K03: "一年比一年沉重的王冠",
  K04: "從湖中伸出、贈我寶劍的那隻手", K05: "比我更真誠地愛著王后的那位朋友", K06: "原諒了他們兩人，卻已來不及告訴他們",
  "G-01": "許下承諾、卻又裝作不認識我的男人", "G-02": "一首我停不下來的歌", "G-03": "為我愛過的每一個人編一朵花",
  "G-04": "我唯一留給自己的那朵花", "G-05": "斜倚在溪上的那棵垂柳", "G-06": "教我認識草藥名字的父親",
  B01: "一語不發地循著他的腳步穿過黑暗向上走", B02: "生者與亡者之間的那道窄梯", B03: "差點得救的憤怒",
  B04: "他回頭看我那一瞬間的臉", B05: "我們在正午成婚的那片草原", B06: "他鬆手前那一刻掌心的溫度",
  L01: "一年中最冷那夜的門口", L02: "讓我無法入睡的飢餓", L03: "又點亮一簇小小的火光，然後再一簇",
  L04: "她離去前總是抱著我的那個人", L05: "隔著結霜窗戶瞥見的溫暖廚房", L06: "從別人家飄來的烤蘋果香",
};

export const ZH_SOULS = {
  open: { name: "無名渡河", blurb: "一個無名的亡魂。迴響牌加入基本牌庫。記憶之地給予2點光。", twist: "記憶之地給予+2點光。" },
  child: { name: "最後火光的孩子", blurb: "再點亮一簇小小的火光，抵擋寒冷。", twist: "起始擁有3點光。每個河段的第一道裂痕會被忽略。永遠不會漂離。消散前可多遺忘1張牌。沒有凶霧。" },
  garland: { name: "花環少女", blurb: "她為每個人編了花，卻沒有為自己編一朵。", twist: "只需銘刻2段記憶，就能獲得章節祝福。" },
  king: { name: "渡船上的國王", blurb: "王國覆滅已久，王冠仍戴在頭上。", twist: "稱號花費2點光。造成裂痕的玩家會失去自己的稱號。" },
  bride: { name: "留在冥府的新娘", blurb: "差一點，就得救了。", twist: "她第一次將在黑暗中徘徊時，不會遺忘，而是被拉回一格。" },
};

export const ZH_MIST = {
  "Rising Water": ["漲水", "黑水淹沒前方的河道。"],
  "Grievance": ["怨念", "一個怨念佔據前方的河岸。"],
  "Grievance Drawn Near": ["怨念逼近", "一個怨念落在亡魂身旁。"],
  "Withering": ["凋零", "前方最遠的2朵花凋零為根。"],
  "Great Withering": ["大凋零", "前方3朵花凋零為根。"],
  "Fog Returns": ["霧氣重返", "霧氣重新籠罩空無一物的河岸。"],
  "Cold Wind": ["寒風", "遺忘一段記憶。"],
  "Bitter Wind": ["刺骨寒風", "遺忘兩段記憶。"],
  "The Mist Parts": ["迷霧散開", "一切平靜。喘口氣吧。"],
  "Echo Severed": ["迴響斷絕", "迴響從織機上被扯下。"],
  "Undertow": ["暗流", "水位上漲，一旁的花隨之凋零。"],
  "Twin Grievances": ["雙生怨念", "兩個怨念佔據前方的河岸。"],
  "Flood Surge": ["洪水暴漲", "黑水兩度氾濫。"],
  "Grievance Host": ["怨念成群", "怨念擠滿前方兩岸。"],
  "Wither Storm": ["凋零風暴", "前方兩格之外的所有花全部凋零。"],
  "Deep Cold": ["深寒", "遺忘兩段記憶。"],
  "Karma Surge": ["業力湧現", "每條絲線各打上一個結。"],
  "Dark Wind": ["黑風", "失去2點光，否則承受一道裂痕。"],
};

export const ZH_MANTLES = {
  weaver: { name: "織根者", text: "你的根可以生長在石地上。你每回合的第一個根效果額外放置1個根。" },
  warden: { name: "守魂者", text: "每輪一次，阻止亡魂徘徊或漂離。" },
  bringer: { name: "引花人", text: "你的每個回合結束時，免費使1個根綻放。" },
  breaker: { name: "破霧者", text: "你每回合打出的第一張忘卻牌改為棄掉，而非遺忘。" },
};

export const ZH_BOOK_FRAMES = [
  ["第一章 · 我曾是誰", "我生於{Place}附近。我愛過{Person}。我曾經{Deed}，從此心中一直懷著{Feeling}。"],
  ["第二章 · 我做過什麼", "在{Place}，在{Person}面前，我{Deed}。代價是{Feeling}。"],
  ["第三章 · 我所懷抱的", "如今我離去，離開{Place}，原諒{Person}，無法挽回我{Deed}的那一天，只懷抱著{Feeling}。"],
];

export function zhOpText(op) {
  switch (op[0]) {
    case "root": return `放置${op[1]}個根${op[2] ? "，即使在石地上也可以" : ""}`;
    case "bloom": return `使${op[1]}個根綻放`;
    case "hold": return "本回合亡魂停留時不會遺忘";
    case "shield": return "在你的下個回合之前，防止下一道裂痕";
    case "mend": return `修補${op[1]}道裂痕`;
    case "release": return `在最滿的絲線上解開${op[1]}個結`;
    case "guide": return "若下一格已被照亮，亡魂立即前進一格";
    case "vigil": return "查看迷霧牌庫頂的3張牌，再以任意順序放回牌庫頂";
    case "banish_or_drain": return "驅散最近的怨念，或排乾最近的黑水";
    case "banish": return "驅散最近的怨念";
    case "drain": return "排乾最近的黑水";
    case "light": return `獲得${op[1]}點光`;
    case "reveal_reach": return "掀開本河段的所有霧氣；墳墓變為沃土";
    case "unmake": return "清空最滿的絲線，且不觸發反噬";
    case "wash": return "沖走亡魂身旁的怨念";
    case "lowtide": return "排乾本河段的所有黑水";
    case "extra_karma": return "額外在執念絲線上打1個結";
  }
  return op[0];
}
export const zhOpsText = ops => ops.map(zhOpText).join("。") + "。";
