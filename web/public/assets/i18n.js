// Language: English or 正體中文 (Taiwan). The choice is kept in localStorage and can change mid-game;
// listeners redraw whatever they own. Game data is translated here, so the rest of the app asks for
// "the name of card 12" rather than reading CARDS[12].name directly.
import { CARDS, TAG_NAMES, TILE_NAMES, REACH_NAMES, SOULS, MANTLES, MIST_TEXT, BOOK_FRAMES, LANTERN_NAMES, opsText } from "./cards.js";
import { ZH_LANTERNS, ZH_TAGS, ZH_SLOTS, ZH_TILES, ZH_REACHES, ZH_CARD_NAMES, ZH_BANDS, ZH_SOULS, ZH_MIST, ZH_MANTLES, ZH_BOOK_FRAMES, zhOpsText } from "./zh.js";

export const LANGS = { en: "English", zh: "正體中文" };
const KEY = "nb-lang";

function stored() {
  try { const v = localStorage.getItem(KEY); return v in LANGS ? v : null; } catch { return null; }
}
let current = stored() || "en";
const listeners = new Set();

export const lang = () => current;
export const zh = () => current === "zh";
export const hasChosenLang = () => stored() !== null;
export function setLang(l) {
  if (!(l in LANGS)) return;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  const changed = l !== current;
  current = l;
  if (typeof document !== "undefined") document.documentElement.lang = l === "zh" ? "zh-Hant-TW" : "en";
  if (changed) listeners.forEach(fn => fn(l));
}
export const onLang = fn => listeners.add(fn);
if (typeof document !== "undefined") document.documentElement.lang = current === "zh" ? "zh-Hant-TW" : "en";

// ---------------------------------------------------------------- game data
export const cardName = cid => (zh() ? ZH_CARD_NAMES[CARDS[cid].name] || CARDS[cid].name : CARDS[cid].name);
export const cardBand = cid => (zh() ? ZH_BANDS[CARDS[cid].id] || CARDS[cid].band : CARDS[cid].band);
export const tagName = t => (zh() ? ZH_TAGS : TAG_NAMES)[t];
export const slotLabel = slot => (zh() ? ZH_SLOTS[slot] : slot);
export const tileName = t => (zh() ? ZH_TILES : TILE_NAMES)[t];
export const reachName = r => (zh() ? ZH_REACHES : REACH_NAMES)[r];
export const soulInfo = k => (zh() ? ZH_SOULS[k] : SOULS[k]);
export const mantleInfo = m => ({ ...MANTLES[m], ...(zh() ? ZH_MANTLES[m] : {}) });
export const mistName = n => (zh() ? ZH_MIST[n]?.[0] || n : n);
export const mistText = n => (zh() ? ZH_MIST[n]?.[1] : MIST_TEXT[n]) || "";
export const bookFrames = () => (zh() ? ZH_BOOK_FRAMES : BOOK_FRAMES);
export const ops = list => (zh() ? zhOpsText(list) : opsText(list));
// Default seat names are stored in English ("Player 2"); show them in the reader's language.
export const pname = n => (zh() ? String(n).replace(/^Player (\d)$/, "玩家$1") : n);
export const lanternName = l => (zh() ? ZH_LANTERNS : LANTERN_NAMES)[l] || String(l);
export const roman = r => ["I", "II", "III"][r];

// ---------------------------------------------------------------- the Chronicle
// The engine records each message as [key, ...args] next to its English text, so every player
// reads the log in their own language, even at an online table.
const CAUSE_ZH = { Faded: "消散", Shattered: "破碎", Deluge: "滅頂", Stalled: "停滯" };
export const causeName = c => (zh() ? CAUSE_ZH[c] || c : c);
const bankZh = k => `第${k >> 1}格${k % 2 ? "右岸" : "左岸"}`;
const ZH_MSG = {
  start: () => `亡魂在此岸醒來。前方是${reachName(0)}。`,
  loss_Faded: () => "遺忘的太多了。亡魂消散在迷霧之中。",
  loss_Shattered: () => "第三道裂痕。亡魂破碎了。",
  loss_Deluge: () => "黑水上漲，已無物能夠阻擋。滅頂。",
  loss_Stalled: () => "河水靜止了。這趟渡河就此放棄。",
  win: () => "亡魂抵達了彼岸。",
  reveal: (k, t) => `${bankZh(k)}的霧散開了：${tileName(t)}。`,
  grave: () => "一個怨念從墳墓中升起。",
  stony: () => "石地。根無法扎下。",
  memLight: () => "記憶之地發出光芒：+2點光。",
  memKeep: () => "記憶之地：找到了一件信物。",
  shieldHold: () => "護盾擋住了。沒有產生裂痕。",
  childShield: () => "小小的火光保護著孩子。本河段的第一道裂痕被忽略。",
  fracture: (n, lim) => `裂痕 ${n}／${lim}。`,
  kingStrip: (m, p) => `國王的悲傷奪走了${pname(p)}的${mantleInfo(m).name}。`,
  reshuffle: () => "棄牌堆洗混，成為新的牌庫。",
  forgot: cid => `遺忘：${cardName(cid)}。`,
  flood: (x, left) => `黑水淹沒第${x}格。供應區還剩${left}個。`,
  drain: sp => `第${sp}格的黑水退去了。`,
  griev: k => `一個怨念佔據了${bankZh(k)}。`,
  backlash: tag => `${tagName(tag)}反噬！${BACKLASH_ZH[tag]}`,
  noRoot: () => "已沒有可以扎根的地方。",
  noBloom: () => "已沒有可以綻放的根。",
  hold: () => "堅守：亡魂將停留，且不會遺忘。",
  shield: () => "升起護盾，持續到你的下個回合。",
  mend: () => "修補了一道裂痕。",
  release: tag => `解開了${tagName(tag)}絲線上的結。`,
  guided: () => "在引導下，亡魂向前走了一步。",
  noGuide: () => "前方一片黑暗。亡魂無法被引導。",
  vigil: n => `守夜：預讀了即將到來的迷霧。下一張：${n ? mistName(n) : "—"}。`,
  light: n => `+${n}點光。`,
  revealAll: () => "整個河段的霧都散開了。",
  unmade: tag => `${tagName(tag)}絲線被消解了。`,
  banish: k => `${bankZh(k)}的怨念被驅散了。`,
  turn: (t, p) => `第${t}回合：${pname(p)}。`,
  summon: (p, m) => `${pname(p)}取得了${mantleInfo(m).name}。`,
  playDown: p => `${pname(p)}背面打出一張牌：放置1個根。`,
  play: (p, cid, burn, res) => `${pname(p)}打出${cardName(cid)}${burn ? "並將其焚燒" : ""}${res ? "。它與迴響產生共鳴！" : "。"}`,
  breaker: () => "破霧者讓這段記憶免於被河水帶走。",
  inscribe: cid => `銘刻於憶念之書（${slotLabel(CARDS[cid].slot)}）：「${cardBand(cid)}」`,
  bless_mend: () => "章節祝福：修補了一道裂痕。",
  bless_drain: () => "章節祝福：黑水退去了。",
  bless_return: () => "章節祝福：一段被遺忘的記憶回來了。",
  bless_glow: () => "章節祝福：書頁發出光芒。",
  bringer: () => "引花人讓一朵花綻放。",
  reach: r => `亡魂進入第${"一二三"[r]}河段：${reachName(r)}。命運織機已清空。`,
  resign: () => "認命：亡魂在蘆葦間坐了下來。",
  wardenDrift: () => "守魂者拉住了漂離的亡魂。",
  adrift: () => "漂離：遺忘了太多，亡魂漂進了黑暗。",
  ash: () => "輕如灰燼：變輕的亡魂又滑行了一格。",
  holding: () => "亡魂堅守著，停留而不遺忘。",
  wardenSteady: () => "守魂者穩住了亡魂。",
  waitLit: () => "前方一片黑暗。亡魂在自己的光旁等待。",
  bridePull: () => "她在黑暗中回頭，被拉回了一格，靠近生者的世界。",
  linger: () => "亡魂在黑暗中徘徊，並遺忘了一些事。",
  push: (n = 1, p) => `${p ? pname(p) : "擺渡人"}推著亡魂奮力駛過了怨念。它們四散而去，卻也傷了亡魂：${n}道裂痕。`,
  seek: p => `${pname(p)}尋覓：棄掉一張牌，抽一張牌。`,
  feed: () => "一個怨念啃噬著亡魂。",
  mist: n => mistName(n),
  drink: sp => `兩岸的根吸乾了第${sp}格的洪水。`,
  trapped: k => `被花朵包夾，${bankZh(k)}的怨念在光中消融。`,
  ghost: (tag, act) => `幽靈打出${tagName(tag)}：${GHOST_ZH[act]}。`,
  root: k => `${bankZh(k)}扎下了一個根。`,
  bloomAt: k => `${bankZh(k)}的根綻放了。`,
  wither: k => `${bankZh(k)}的花凋零為根。`,
  drown: k => `黑水之下，${bankZh(k)}的花凋零為根。`,
  grievOver: (k, bloom) => `一個怨念佔據了${bankZh(k)}，吞沒了那裡的${bloom ? "花" : "根"}。`,
  knot: (tag, n, cap) => `${tagName(tag)}絲線打上一個結（${n}／${cap}）。`,
  move: sp => (sp >= 12 ? "亡魂踏上了彼岸。" : `亡魂走到第${sp}格。`),
  pulled: sp => `亡魂被拉回第${sp}格。`,
  passLight: n => `亡魂帶走了身後${n}朵花的光：+${n}點光。`,
  fogBack: k => `霧氣再次籠罩${bankZh(k)}。`,
  sever: () => "迴響從織機上被扯下。",
  darkWind: () => "黑風吹熄了2點光。",
  darkWindHurt: () => "黑風找不到可以帶走的光，轉而傷了亡魂。",
  draw: (p, n) => `${pname(p)}抽了${n}張牌，補回手牌上限。`,
  echoOn: tag => `迴響梭移到${tagName(tag)}絲線上。`,
  resummon: (p, old, m) => `${pname(p)}永久放下了${mantleInfo(old).name}，改為取得${mantleInfo(m).name}。`,
  recall: (p, cid, n) => `${pname(p)}花費${n}點光：「${cardName(cid)}」被想起，回到棄牌堆。`,
};
const BACKLASH_ZH = ["攫取：一個怨念撲向亡魂。", "認命：亡魂將坐下並徘徊。", "漲潮：黑水淹沒前方。"];
const GHOST_ZH = { root_far: "在遠方扎根", root_near: "在近處扎根", bloom_near: "使最近的根綻放", bloom_far: "使最遠的根綻放", banish_forget: "清出道路", none: "靜靜地飄過" };

// Text for a log entry or event in the current language.
export function say(entry) {
  if (!entry) return "";
  if (zh() && entry.m && ZH_MSG[entry.m[0]]) return ZH_MSG[entry.m[0]](...entry.m.slice(1));
  return entry.msg || "";
}
export const backlashText = tag => (zh() ? BACKLASH_ZH[tag] : ["Grasping: a Grievance claws at the soul.", "Resignation: the soul will sit down and Linger.", "The Tide Rises: Black Water floods ahead."][tag]);
