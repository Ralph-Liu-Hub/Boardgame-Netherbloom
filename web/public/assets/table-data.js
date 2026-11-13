// V5 component data for the manual table: everything that is not a memory card or a storybook page.
// Numbers follow docs/rules/zh-TW/V5/Rulebook.md (appendices A and C).

export const THREADS = [
  { zh: "執念", en: "Obsession", icon: "nb-obsession", col: "#b8323a" },
  { zh: "釋懷", en: "Acceptance", icon: "nb-acceptance", col: "#e6d3a3" },
  { zh: "忘卻", en: "Oblivion", icon: "nb-oblivion", col: "#5fb3b8" },
];

export const SLOT_NAMES = {
  Place: { zh: "地點", en: "Place", icon: "nb-slot-place" },
  Person: { zh: "人物", en: "Person", icon: "nb-slot-person" },
  Deed: { zh: "事蹟", en: "Deed", icon: "nb-slot-deed" },
  Feeling: { zh: "感受", en: "Feeling", icon: "nb-slot-feeling" },
};

// Mist: [key, zh, en, thread, fog strength, zh text, en text]; counts per chapter deck (淺 / 濃 / 深), set-up extras included.
const M = (key, zh, en, th, fog, tz, te) => ({ key, zh, en, th, fog, tz, te });
export const MIST_CARDS = {
  rising: M("rising", "漲水", "Rising Water", 2, 1, "在亡魂前方第 2 格放 1 個黑水。", "Black Water on the 2nd space ahead."),
  shade: M("shade", "怨念", "Shade", 0, 1, "在亡魂前方第 1 格放 1 個怨念。", "A Shade on the 1st space ahead."),
  near: M("near", "怨念逼近", "Shade Drawn Near", 0, 1, "在亡魂所在格放 1 個怨念（左岸優先；兩岸都有時改放下一格）。", "A Shade beside the soul (left bank first; next space if both are taken)."),
  wither: M("wither", "凋零", "Withering", 1, 1, "亡魂前方最遠的 2 朵花凋零。", "The 2 furthest Blooms ahead wither."),
  fogret: M("fogret", "霧氣重返", "Fog Returns", 2, 2, "將亡魂前方最遠的 1 塊已翻開的空河岸板塊翻回霧面。", "The furthest revealed empty bank tile ahead turns back to fog."),
  cold: M("cold", "寒風", "Cold Wind", 2, 1, "遺忘牌庫頂的 1 張。", "Forget the top card of the deck."),
  parts: M("parts", "迷霧散開", "The Mist Parts", 1, 0, "沒有任何效果。", "Nothing happens."),
  collapse: M("collapse", "崩岸", "Collapsing Bank", 0, 1, "亡魂前方最近的 1 個根被沖走，放回供應區。", "The nearest Root ahead is washed away."),
  sever: M("sever", "迴響斷絕", "Echo Severed", 1, 1, "將迴響放回織機的沉默格。", "The Echo returns to the Loom's silent space."),
  undertow: M("undertow", "暗潮回湧", "Undertow Returns", 2, 2, "亡魂退回前一格；不能後退時，遺忘牌庫頂的 1 張。", "The soul steps back one space; if it cannot, forget the top card."),
  peel: M("peel", "記憶剝落", "Memory Peels", 1, 1, "當前頁面最新銘刻、未點亮的記憶移到遺忘堆。", "The newest unlit memory on this page is forgotten."),
  dim: M("dim", "熄燈", "Lights Out", 1, 1, "直到下一次迷霧前，不能點亮記憶。", "No memory can be lit until the next Mist."),
  silence: M("silence", "沉默之霧", "Mist of Silence", 1, 1, "直到下一次迷霧前，所有人不能說出任何關於手牌的事。", "Until the next Mist, nobody may say anything about their hand."),
  current: M("current", "暗流", "Undertow", 2, 1, "在亡魂前方第 2 格放 1 個黑水；亡魂前方第 1 格的花凋零。", "Black Water on the 2nd space ahead; Blooms on the 1st space ahead wither."),
  twin: M("twin", "雙生怨念", "Twin Shades", 0, 1, "在亡魂前方第 2 格的左岸與右岸各放 1 個怨念。", "A Shade on each bank of the 2nd space ahead."),
  great: M("great", "大凋零", "Great Withering", 1, 1, "亡魂前方最遠的 3 朵花凋零。", "The 3 furthest Blooms ahead wither."),
  bitter: M("bitter", "刺骨寒風", "Bitter Wind", 2, 1, "遺忘牌庫頂的 2 張。", "Forget the top 2 cards of the deck."),
};
export const MIST_DECKS = [   // chapter decks: [key, count]
  [["rising", 3], ["shade", 2], ["near", 2], ["wither", 1], ["fogret", 1], ["cold", 1], ["parts", 2], ["collapse", 1]],
  [["rising", 3], ["shade", 2], ["near", 2], ["wither", 2], ["fogret", 1], ["cold", 1], ["collapse", 1], ["sever", 1], ["undertow", 1], ["peel", 1], ["dim", 1], ["silence", 1]],
  [["rising", 3], ["near", 2], ["wither", 1], ["cold", 1], ["sever", 1], ["undertow", 1], ["peel", 1], ["dim", 1], ["current", 1], ["twin", 1], ["great", 1], ["bitter", 1]],
];
export const DECK_NAMES = [{ zh: "淺霧", en: "Pale Mist" }, { zh: "濃霧", en: "Thick Mist" }, { zh: "深霧", en: "Deep Mist" }];

export const HARSH_CARDS = [
  M("flood", "洪水暴漲", "Flood Surge", 2, 1, "在亡魂前方第 1 格與第 3 格各放 1 個黑水。", "Black Water on the 1st and 3rd spaces ahead."),
  M("host", "怨念成群", "Shade Host", 0, 1, "在亡魂前方第 1 格的左岸與右岸各放 1 個怨念。", "A Shade on each bank of the 1st space ahead."),
  M("storm", "凋零風暴", "Wither Storm", 1, 2, "亡魂前方第 2 格以外的所有花凋零。", "Every Bloom beyond the 2nd space ahead withers."),
  M("karma", "業力湧現", "Karma Surge", null, 2, "每條絲線各打 1 個結。成為霧痕時算忘卻。", "One knot on each thread. As a mist scar it counts as Oblivion."),
  M("dark", "黑風", "Dark Wind", 0, 2, "失去 2 點光；光不足 2 點時，改為承受 1 道裂痕。", "Lose 2 Light, or take a Fracture if you cannot."),
  M("page", "河水漫過書頁", "River Over the Page", 1, 2, "當前頁面所有未點亮的記憶移到遺忘堆。", "Every unlit memory on this page is forgotten."),
  M("gaze", "守岸人的凝視", "The Keeper's Gaze", 0, 1, "下一次翻頁時，本頁點亮數視為少 1 段；在第三章時，要完成的託付 +1。", "At the next page turn, count one lit memory fewer; in chapter 3, one more commission is needed."),
  M("blind", "濃霧蔽眼", "Blinding Fog", 0, 2, "直到下一次迷霧前，所有稱號失效。", "No Mantle works until the next Mist."),
  M("night", "寒夜", "Cold Night", 1, 1, "直到你的下一個回合結束前，所有人的手牌上限 −1。", "Until the end of your next turn, every hand limit is 1 lower."),
  M("thunder", "遠方雷聲", "Distant Thunder", 2, 2, "這張先放一旁。下一次迷霧翻 2 張並全部執行（霧勢取較大的一張）。", "Set this aside. The next Mist turns 2 cards and does both (the larger fog strength)."),
  M("bwret", "黑水回流", "Black Water Returns", 2, 1, "從盒中拿 1 個已移除的黑水放回供應區。", "Return one removed Black Water to the supply."),
];
export const HARSH_PER_DECK = 2;

// Bank tiles: kind -> faces
export const TILE_KINDS = {
  fertile: { zh: "沃土", en: "Fertile", icon: "nb-fertile", tz: "放置根。", te: "Place a Root." },
  stony: { zh: "石地", en: "Stony", icon: "nb-stony", tz: "只有「即使在石地上也可以」或織根者才能放根。", te: "Roots only with “even on Stony ground” or the Rootweaver." },
  grave: { zh: "墳墓", en: "Grave", icon: "nb-grave", tz: "不放根，改放 1 個怨念。之後永遠不能放根。", te: "No Root: place a Shade instead. Never a Root here." },
  spring: { zh: "記憶之泉", en: "Memory Spring", icon: "nb-memorysite", tz: "放置根，並可以把 1 張手牌銘刻到當前路線。", te: "Place a Root; you may inscribe a card from your hand." },
  field: { zh: "花田", en: "Flower Field", icon: "nb-bloom", tz: "放置根，並立即綻放。", te: "Place a Root; it Blooms at once." },
  frost: { zh: "寒霜", en: "Frost", icon: "nb-fog", tz: "放置根。這裡的花不會被凋零或黑水翻回根。", te: "Place a Root. Blooms here never wither or drown." },
  ember: { zh: "餘燼", en: "Ember", icon: "nb-light", tz: "放置根，並獲得 1 點光。", te: "Place a Root and gain 1 Light." },
  echo: { zh: "迴聲之岩", en: "Echo Rock", icon: "nb-echo", tz: "放置根，並可以把迴響移到任一條絲線。", te: "Place a Root; you may move the Echo to any thread." },
};
export const TILE_POOLS = [   // [spaces, pool to draw from]; graves are added on top
  { spaces: [2, 3, 4], graves: 0, pool: { fertile: 4, stony: 2, spring: 1, field: 1 } },
  { spaces: [5, 6, 7, 8], graves: 1, pool: { fertile: 3, stony: 2, spring: 1, field: 1, frost: 1, ember: 1 } },
  { spaces: [9, 10, 11, 12, 13], graves: null, pool: { fertile: 4, stony: 2, spring: 1, ember: 1, echo: 1, field: 1, frost: 1 } },
];
export const SPARE_TILES = { field: 2, fertile: 2, spring: 2 };
export const REACHES = [{ zh: "日光蘭之路", en: "The Asphodel Road" }, { zh: "哀悼之野", en: "The Fields of Mourning" }, { zh: "忘川之岸", en: "The Banks of Lethe" }];

export const MANTLES = [
  { key: "weaver", th: 0, zh: "織根者", en: "Rootweaver", tz: "你的根可以長在石地上。你每回合第一個「放置根」的效果多放 1 個根。", te: "Your Roots grow on Stony ground. Your first Root effect each turn places 1 more." },
  { key: "warden", th: 0, zh: "守魂者", en: "Spirit Warden", tz: "駐足：每輪一次，亡魂行動時，你可以讓亡魂留在原格，不遺忘任何牌。", te: "Stay: once a round, keep the soul where it is during its step, forgetting nothing." },
  { key: "bringer", th: 1, zh: "引花人", en: "Bloombringer", tz: "你的每個回合結束時，可以免費使 1 個根綻放。", te: "At the end of each of your turns, one Root may Bloom for free." },
  { key: "breaker", th: 2, zh: "破霧者", en: "Mistbreaker", tz: "看穿迷霧：每輪一次，在迷霧步驟之前，查看迷霧牌庫頂的 1 張，可以放到牌庫底。", te: "See through: once a round, before the Mist, look at the top Mist card and you may put it on the bottom." },
  { key: "reaper", th: 2, zh: "收割者", en: "Reaper", tz: "在你的回合、第一個行動之前，查看記憶牌庫頂的 2 張，可以替換你的手牌。", te: "Before your first action, look at the top 2 memory cards and swap any of them into your hand." },
];

export const GHOST = [
  ...Array(3).fill({ th: 0, zh: "在最遠的空河岸扎根", en: "Root on the furthest empty bank" }),
  ...Array(2).fill({ th: 0, zh: "在最近的空河岸扎根", en: "Root on the nearest empty bank" }),
  ...Array(2).fill({ th: 1, zh: "使最近的根綻放", en: "The nearest Root Blooms" }),
  ...Array(2).fill({ th: 1, zh: "使最遠的根綻放", en: "The furthest Root Blooms" }),
  ...Array(2).fill({ th: 2, zh: "驅散最近的怨念，或排乾黑水", en: "Banish the nearest Shade, or drain Black Water" }),
  { th: 2, zh: "不採取行動", en: "No action" },
];

export const LEVELS = [   // 11/7 retune round 3 (about 60 / 50 / 40 %); 11/13: Hard takes no Fracture when engulfed, but has 5 Black Water and Fades at 11
  { zh: "溫和", en: "Gentle", fog: 0, knots: 0, dissolve: 14, loom: 7, fractures: 5, bw: 7 },
  { zh: "標準", en: "Standard", fog: 1, knots: 0, dissolve: 12, loom: 7, fractures: 4, bw: 6 },
  { zh: "困難", en: "Hard", fog: 1, knots: 1, dissolve: 11, loom: 7, fractures: 3, bw: 5 },
];
export const SETUP_TABLE = { 1: { graves: 2, need: 1 }, 2: { graves: 1, need: 2 }, 3: { graves: 2, need: 2 }, 4: { graves: 2, need: 3 } };
export const START_LIGHT = { child: 3, garland: 0, king: 0, bride: 1, open: 2 };
export const SOUL_ART = { open: "soul-nameless", child: "soul-child", garland: "soul-garland", king: "soul-king", bride: "soul-bride" };
export const SOUL_ORDER = ["child", "garland", "king", "bride", "open"];
// English names, as in the English rulebook
export const SOUL_EN = { child: "The Child of the Last Flame", garland: "The Garland Girl", king: "The King on the Barge", bride: "The Bride Who Stayed Below", open: "Open Crossing" };
// Loom threshold with 0 / 1 / 2 scars: the level's base for 2-4 players, +3 solo
export const thresholds = (level, players) => { const b = LEVELS[level].loom + (players === 1 ? 3 : 0); return [b, b - 1, b - 2]; };
export const BACKLASH = [
  ["亡魂所在格放 1 個怨念", "前方第 1 格兩岸各放 1 個怨念", "同第二級，再承受 1 道裂痕"],
  ["認命（下次亡魂行動不動，遺忘 1 張）", "認命，那次共遺忘 2 張", "認命，共遺忘 3 張；霧推進 2"],
  ["下一格放 1 個黑水", "下一格與前方第 3 格各放 1 個黑水", "同第二級，再遺忘 1 張"],
];
export const BACKLASH_EN = [
  ["Place 1 Shade on the soul's space", "Place 1 Shade on each bank of the next space ahead", "As level II, and take 1 Fracture"],
  ["Resignation (the soul does not move on its next Soul Step; forget 1 card)", "Resignation, forgetting 2 cards that time", "Resignation, forgetting 3 cards in all; the Mist advances 2"],
  ["Place 1 Black Water on the next space", "Place 1 Black Water on the next space and on the 3rd space ahead", "As level II, and forget 1 more card"],
];
export const TURN_TABLE = [0, 3, 6, 9];
