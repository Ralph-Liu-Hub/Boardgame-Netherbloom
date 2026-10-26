// The print plan: every factory file, what each of its pages is, and how the printer prints it. One source for two
// readers: press.py (which converts each PDF to CMYK and adds the slug with crop marks, registration targets, a colour bar
// and a page label) and the production manual (which turns it into the file-by-file printing instructions).
import { BLEED } from "./lib.mjs";
import { decks, cardBacks } from "./cards.mjs";
import { PW as BPW, PH as BPH } from "./board.mjs";
import { LID, BASE, TURN } from "./box.mjs";
import { TILE, TILE_COUNT } from "./tiles.mjs";

export const SLUG = 10;                       // mm of slug outside the bleed, for the marks
export const PROFILE = "Coated FOGRA39 (ISO 12647-2:2004, ISO Coated v2 condition), total ink 330%";

// how each two-sided piece is turned over between its front and back
export const TURN_HOW = {
  card: { en: "Head to head: the top of the back sits behind the top of the front. Page sizes, bleed and trim of front and back are identical.",
    zh: "頭對頭：背面的上緣位於正面上緣的背後。正、背面的頁面尺寸、出血與裁切完全相同。" },
  sheet: { en: "Page 2 is already mirrored: turn the sheet over left to right (work-and-turn, round its vertical centre line; for this landscape sheet that is a short-edge flip). Do not mirror it again. Each back then lands exactly behind its front (checked: every back is centred on its cut, with art 2 mm past it all round).",
    zh: "第 2 頁已鏡像：請將紙張沿垂直中線左右翻面（自翻版 work-and-turn；本橫式紙張即短邊翻轉）。請勿再次鏡像。如此每個背面都會正好落在其正面的背後（已檢查：每個背面都正好對準其裁切線，圖案四周超出 2 mm）。" },
  aid: { en: "Pages 1–2, 3–4 and 5–6 are the front and back of one card. Portrait: turn left to right (long-edge flip), head to head.",
    zh: "第 1–2、3–4、5–6 頁分別為一張卡的正面與背面。直式：左右翻面（長邊翻轉），頭對頭。" },
  book: { en: "Pages are in reading order, one page per PDF page. Impose them yourselves for saddle stitching.",
    zh: "頁面依閱讀順序，每個 PDF 頁一頁。請自行拼版後騎馬釘裝訂。" },
};

const T = (en, zh) => ({ en, zh });

// Every file: path, nominal trim [w, h] in mm, colour sides, page labels (ASCII, printed in the slug), and the
// instructions for the manual. A page whose label starts with "DIE" or "TRIM" is a cutting guide and is never printed.
export function pressPlan(lang) {
  const dk = decks(lang), backs = cardBacks(lang);
  const backPage = { "cards-memory": 1, "cards-mist": 2, "cards-ghost": 3, "cards-soul": 4, "cards-mantle": 5 };
  const card = T("310 g/m² black-core card, linen finish, matte", "310 g/m² 黑芯卡紙，布紋，霧面");
  const board = T("Print on 157 g/m² art paper, mount on 2 mm greyboard, matte laminate", "印於 157 g/m² 銅版紙，裱 2 mm 灰紙板，上霧膜");
  const lidW = LID.L + 2 * (LID.D + TURN), baseW = BASE.L + 2 * (BASE.D + TURN);
  const files = [];
  for (const [file, cards] of dk) files.push({
    path: `cards/${file}.pdf`, trim: [63, 88], sides: "4/4",
    labels: cards.map(c => `FRONT · ${c.name} · back = card-backs.pdf page ${backPage[file]}`),
    what: T(`${cards.length} card fronts, one per page`, `${cards.length} 張卡牌正面，每頁一張`),
    pair: T(`Back: page ${backPage[file]} of cards/card-backs.pdf, for every card in this file.`, `背面：cards/card-backs.pdf 第 ${backPage[file]} 頁，本檔每張卡牌皆同。`),
    turn: TURN_HOW.card, stock: card,
    finish: T("Cut on the trim marks, round the corners (3 mm radius)", "沿裁切標記裁切，導圓角（半徑 3 mm）"),
    qty: T(`Each page once: ${cards.length} cards`, `每頁各 1 張：共 ${cards.length} 張`),
  });
  files.push({
    path: "cards/card-backs.pdf", trim: [63, 88], sides: "4/4",
    labels: backs.map((b, i) => `BACK · ${b.name} · page ${i + 1}`),
    what: T(`${backs.length} card backs, one per deck (Mantle shares the Soul back)`, `${backs.length} 種牌背，每個牌組一種（稱號牌與亡魂牌共用背面）`),
    pair: T("Page 1 Memory, 2 Mist, 3 Ghost, 4 Soul, 5 Mantle: print behind every front of that deck.", "第 1 頁記憶、2 迷霧、3 幽靈、4 亡魂、5 稱號：印在該牌組每張正面的背後。"),
    turn: TURN_HOW.card, stock: card, finish: T("As the fronts", "同正面"), qty: T("As many as the fronts of its deck", "與該牌組正面數量相同"),
  });
  files.push({
    path: "tiles/bank-tiles.pdf", trim: [297, 210], sides: "4/4",
    labels: ["FRONT · bank tiles", "BACK · bank tiles (fog) · already mirrored: work-and-turn", "DIE LINE · do not print · register to page 1"],
    what: T(`${TILE_COUNT} bank tiles, ${TILE} × ${TILE} mm, 1.5 mm corners; art runs 2 mm past every cut`, `${TILE_COUNT} 塊河岸板塊，${TILE} × ${TILE} mm，圓角 1.5 mm；圖案超出每條裁切線 2 mm`),
    pair: T("Page 1 front, page 2 back (the fog side, marked with its Reach), page 3 die line (not printed).", "第 1 頁正面、第 2 頁背面（霧面，印有所屬河段）、第 3 頁刀模（不印）。"),
    turn: TURN_HOW.sheet, stock: T("2 mm greyboard, both sides laminated with printed 157 g/m² art paper", "2 mm 灰紙板，雙面裱 157 g/m² 印刷銅版紙"),
    finish: T("Die-cut with page 3, leave the tiles in the board (kiss-cut tabs) for shipping", "依第 3 頁模切，板塊留在板上（留連接點）出貨"),
    qty: T("1 sheet", "1 張"),
  });
  files.push({
    path: "board/river-board.pdf", trim: [BPW, BPH], sides: "4/0",
    labels: [0, 1, 2].map(i => `PRINT · river board panel ${i + 1} of 3 (Reach ${["I", "II", "III"][i]})`),
    what: T(`3 river board panels, ${BPW} × ${BPH} mm`, `3 塊河流圖板，${BPW} × ${BPH} mm`),
    pair: T("One side only. Each page is one panel.", "單面印刷。每頁一塊圖板。"), turn: T("—", "—"),
    stock: board, finish: T("Trim on the crop marks, 3 mm round corners. Back of the greyboard: plain black paper", "沿裁切標記裁切，圓角 3 mm。灰紙板背面裱黑色素紙"),
    qty: T("Each page once: 3 panels", "每頁各 1 塊：共 3 塊"),
  });
  for (const [name, title] of [["loom/loom-of-the-fates.pdf", T("Loom of the Fates board", "命運織機圖板")], ["ledger/the-ledger.pdf", T("Ledger board", "渡帳圖板")]]) files.push({
    path: name, trim: [297, 210], sides: "4/0",
    labels: [`PRINT · ${title.en}`, "TRIM LINE · do not print · register to page 1"],
    what: T(`${title.en}, 297 × 210 mm`, `${title.zh}，297 × 210 mm`),
    pair: T("Page 1 print, one side. Page 2 is its trim line (not printed).", "第 1 頁單面印刷。第 2 頁為裁切線（不印）。"), turn: T("—", "—"),
    stock: board, finish: T("Trim with page 2, 3 mm round corners. Back of the greyboard: plain black paper", "依第 2 頁裁切，圓角 3 mm。灰紙板背面裱黑色素紙"),
    qty: T("1", "1"),
  });
  for (const k of ["child", "garland", "king", "bride", "open"]) files.push({
    path: `books/book-of-remembrance-${k}.pdf`, trim: [210, 297], sides: "4/4",
    labels: Array.from({ length: 8 }, (_, i) => `BOOK PAGE ${i + 1} of 8 · reading order`),
    what: T("8 A4 pages in reading order", "8 頁 A4，依閱讀順序"),
    pair: T("Sheet 1 (cover): pages 8 | 1 outside, 2 | 7 inside. Sheet 2: pages 6 | 3 outside, 4 | 5 inside.", "第 1 張（封面）：外側 8 | 1、內側 2 | 7。第 2 張：外側 6 | 3、內側 4 | 5。"),
    turn: TURN_HOW.book, stock: T("Cover sheet 250 g/m², inner sheet 157 g/m², matte", "封面 250 g/m²，內頁 157 g/m²，霧面"),
    finish: T("Saddle-stitch (2 staples), then 48 clear photo corners on the printed marks of pages 4–6", "騎馬釘（2 針），再於第 4–6 頁的角標貼上 48 個透明相角"),
    qty: T("1 of each Soul's Book: 5 Books", "每位亡魂 1 本：共 5 本"),
  });
  files.push({
    path: "rulebook/rulebook.pdf", trim: [210, 297], sides: "4/4", labelsAuto: "RULEBOOK PAGE {n} of {N} · reading order",
    what: T("The rulebook, A4, pages in reading order (a multiple of 4)", "規則書，A4，依閱讀順序（4 的倍數）"),
    pair: T("Pages 2–3 are the two halves of one picture (the set-up spread): keep them facing.", "第 2–3 頁為同一張圖（遊戲準備跨頁）的左右兩半：須相對。"),
    turn: TURN_HOW.book, stock: T("157 g/m² matte art paper (cover may be 250 g/m²)", "157 g/m² 霧面銅版紙（封面可用 250 g/m²）"),
    finish: T("Saddle-stitch (2 staples)", "騎馬釘（2 針）"), qty: T("1", "1"),
  });
  files.push({
    path: "rulebook/player-aid.pdf", trim: [148, 210], sides: "4/4", labelsAuto: "PLAYER AID page {n} of {N} · card {c} {side}",
    what: T("The Player Aid: A5 cards, each printed both sides", "玩家輔助卡：A5 卡片，每張雙面印刷"),
    pair: T("Odd page = front, the next even page = its back.", "奇數頁為正面，其後的偶數頁為其背面。"),
    turn: TURN_HOW.aid, stock: T("300 g/m² card, matte", "300 g/m² 卡紙，霧面"),
    finish: T("Trim, round the corners (3 mm), join each set at the top-left corner with a 6 mm rivet", "裁切、導圓角（3 mm），每組在左上角以 6 mm 鉚釘串起"),
    qty: T("4 sets per game", "每套 4 組"),
  });
  for (const [file, trim, label, en, zh, finEn, finZh] of [
    ["box/box-lid-wrap.pdf", [lidW, lidW], "PRINT · box lid wrap", `Box lid wrap, flat (${LID.L} × ${LID.L} × ${LID.D} mm lid, ${TURN} mm turn-ins)`, `盒蓋裱紙，攤平（${LID.L} × ${LID.L} × ${LID.D} mm，內折 ${TURN} mm）`, "Cut with box-lid-dieline.pdf, wrap the 2 mm greyboard lid, matte laminate", "依 box-lid-dieline.pdf 裁切，裱 2 mm 灰紙板盒蓋，上霧膜"],
    ["box/box-lid-dieline.pdf", [lidW, lidW], "DIE LINE · do not print · register to box-lid-wrap.pdf", "Die line for the lid wrap: cut (magenta) and folds (cyan, dashed)", "盒蓋裱紙刀模：裁切（洋紅）與摺線（青色虛線）", "Cutting guide only", "僅為裁切依據"],
    ["box/box-base-wrap.pdf", [baseW, baseW], "PRINT · box base wrap", `Box base wrap, flat (${BASE.L} × ${BASE.L} × ${BASE.D} mm base)`, `盒底裱紙，攤平（${BASE.L} × ${BASE.L} × ${BASE.D} mm）`, "Cut with box-base-dieline.pdf, wrap the 2 mm greyboard base, matte laminate", "依 box-base-dieline.pdf 裁切，裱 2 mm 灰紙板盒底，上霧膜"],
    ["box/box-base-dieline.pdf", [baseW, baseW], "DIE LINE · do not print · register to box-base-wrap.pdf", "Die line for the base wrap", "盒底裱紙刀模", "Cutting guide only", "僅為裁切依據"],
    ["box/box-lid-liner.pdf", [LID.L, LID.L], "PRINT · lid liner", "Liner glued inside the lid", "盒蓋內襯", "Trim, glue inside the lid after wrapping", "裁切，裱盒後貼於盒蓋內側"],
    ["box/box-base-liner.pdf", [BASE.L, BASE.L], "PRINT · base liner", "Liner glued on the floor of the base", "盒底內襯", "Trim, glue on the floor of the base", "裁切，貼於盒底內面"],
  ]) files.push({
    path: file, trim, sides: label.startsWith("DIE") ? "—" : "4/0", labels: [label], what: T(en, zh),
    pair: T("One side only.", "單面印刷。"), turn: T("—", "—"),
    stock: label.startsWith("DIE") ? T("—", "—") : T("157 g/m² art paper", "157 g/m² 銅版紙"), finish: T(finEn, finZh), qty: T("1", "1"),
  });
  return { bleed: BLEED, slug: SLUG, profile: PROFILE, files };
}
