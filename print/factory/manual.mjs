// The production manual for the factory: one A4 PDF per edition (print/out/factory/<lang>/MANUAL.pdf) that says what every
// file is, how it is printed (both sides), on what, and how one copy of the game is assembled and packed.
// Counts, page numbers and file names come from the same modules that build the files, so the manual cannot drift from them.
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { BLEED, C, FONTS, FACE, SYMBOLS, FIT_SCRIPT, render } from "./lib.mjs";
import { decks, cardBacks } from "./cards.mjs";
import { TOKENS, BIG, SMALL, CUT_BLEED } from "./tokens.mjs";
import { LID, BASE, TURN } from "./box.mjs";
import { TILES } from "../../web/public/assets/cards.js";
import { pressPlan } from "./pressplan.mjs";
import { PW as BPW, PH as BPH } from "./board.mjs";
import { TILE, TILE_COUNT } from "./tiles.mjs";

const tokensOf = size => TOKENS.filter(t => t[5] === size).reduce((a, t) => a + t[4], 0);
const nBig = tokensOf(BIG), nSmall = tokensOf(SMALL);

const PW = 210, PH = 297;
const today = new Date().toISOString().slice(0, 10);
const pages = file => existsSync(file) ? (readFileSync(file).toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length : 0;

// ---------------------------------------------------------------- diagrams (inline SVG, mm units)
const S = (w, h, body) => `<svg class="dg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">${body}</svg>`;
const T = (x, y, s, o = "") => `<text x="${x}" y="${y}" ${o}>${s}</text>`;
const R = (x, y, w, h, o = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${o}/>`;
const ARROW = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#9b1f2f"/></marker></defs>`;

function dgCard(L) {
  return S(150, 62, `${ARROW}
    ${R(4, 4, 36, 50, 'rx="2.5" class="ink"')}${R(7, 7, 30, 44, 'rx="1.6" class="gilt"')}${T(22, 22, L.front, 'class="lbl bone"')}${T(22, 30, "▲ " + L.top, 'class="sm bone"')}
    ${R(104, 4, 36, 50, 'rx="2.5" class="ink"')}${R(107, 7, 30, 44, 'rx="1.6" class="gilt"')}${T(122, 22, L.back, 'class="lbl bone"')}${T(122, 30, "▲ " + L.top, 'class="sm bone"')}
    <path d="M44 29 H100" class="arr" marker-end="url(#ah)"/>${T(72, 24, L.cardFlip, 'class="sm"')}
    ${T(22, 60, L.trim, 'class="sm"')}${T(122, 60, L.trim, 'class="sm"')}`);
}
function dgPunch(L) {
  return S(170, 66, `${ARROW}
    ${R(4, 6, 66, 47, 'class="ink"')}${T(37, 3.5, L.sheetFront, 'class="sm"')}<circle cx="16" cy="18" r="6" class="disc"/>${T(16, 19.5, "A", 'class="lbl bone"')}<circle cx="60" cy="18" r="4" class="disc"/>${T(60, 19.5, "B", 'class="sm bone"')}
    ${R(100, 6, 66, 47, 'class="ink"')}${T(133, 3.5, L.sheetBack, 'class="sm"')}<circle cx="154" cy="18" r="6" class="disc"/>${T(154, 19.5, "A′", 'class="lbl bone"')}<circle cx="110" cy="18" r="4" class="disc"/>${T(110, 19.5, "B′", 'class="sm bone"')}
    <path d="M74 30 C82 20 90 20 96 30" class="arr" marker-end="url(#ah)"/>${T(85, 40, L.flipLR, 'class="sm"')}
    ${T(85, 62, L.punchNote, 'class="sm"')}`);
}
function dgBoard(L) {
  return S(170, 40, `${R(4, 8, 54, 26, 'class="ink"')}${R(58, 8, 54, 26, 'class="ink"')}${R(112, 8, 54, 26, 'class="ink"')}
    ${R(4, 18, 162, 6, 'class="water"')}
    ${T(31, 15, "I", 'class="lbl bone"')}${T(85, 15, "II", 'class="lbl bone"')}${T(139, 15, "III", 'class="lbl bone"')}
    ${T(31, 31, "1–4", 'class="sm bone"')}${T(85, 31, "5–8", 'class="sm bone"')}${T(139, 31, "9–11 · 12", 'class="sm bone"')}
    ${T(4, 5, "◀ " + L.near, 'class="sm" text-anchor="start"')}${T(166, 5, L.far + " ▶", 'class="sm" text-anchor="end"')}${T(85, 39, L.boardJoin, 'class="sm"')}`);
}
function dgBox(L) {
  const k = .17, l = LID.L * k, d = LID.D * k, t = TURN * k, o = d + t, n = l + 2 * o;
  const side = (x, y, w, h, s) => `${R(x, y, w, h, 'class="side"')}${T(x + w / 2, y + h / 2 + 1.5, s, 'class="sm"')}`;
  return S(150, n + 6, `<g transform="translate(2 2)">
    ${R(o, o, l, l, 'class="top"')}${T(o + l / 2, o + l / 2, L.top, 'class="lbl"')}${T(o + l / 2, o + l / 2 + 6, "Cover F", 'class="sm"')}
    ${side(o, o + l, l, d, "A · " + L.front)}${side(o, t, l, d, "C · " + L.back)}${side(t, o, d, l, "")}${side(o + l, o, d, l, "")}
    ${T(t + d / 2, o + l / 2, "D", 'class="lbl"')}${T(o + l + d / 2, o + l / 2, "B", 'class="lbl"')}
    ${R(o, 0, l, t, 'class="turn"')}${R(o, o + l + d, l, t, 'class="turn"')}${R(0, o, t, l, 'class="turn"')}${R(o + l + d, o, t, l, 'class="turn"')}
    <path d="M${o} ${o} H${o + l} V${o + l} H${o} Z M${o} ${t} H${o + l} M${o} ${o + l + d} H${o + l} M${t} ${o} V${o + l} M${o + l + d} ${o} V${o + l}" class="fold"/>
    </g>
    <g transform="translate(${n + 10} 6)">
      <line x1="0" y1="2" x2="10" y2="2" class="cutl"/>${T(13, 3.2, L.cut, 'class="sm" text-anchor="start"')}
      <line x1="0" y1="10" x2="10" y2="10" class="fold"/>${T(13, 11.2, L.fold, 'class="sm" text-anchor="start"')}
      ${R(0, 15, 10, 5, 'class="turn"')}${T(13, 19, L.turnIn, 'class="sm" text-anchor="start"')}
      ${T(0, 30, L.boxNote1, 'class="sm" text-anchor="start"')}${T(0, 36, L.boxNote2, 'class="sm" text-anchor="start"')}${T(0, 42, L.boxNote3, 'class="sm" text-anchor="start"')}
    </g>`);
}
function dgBook(L) {
  const sheet = (x, label, a, b, c, d2) => `${T(x + 30, 4, label, 'class="sm"')}
    ${R(x, 7, 60, 22, 'class="paper"')}<line x1="${x + 30}" y1="7" x2="${x + 30}" y2="29" class="fold"/>${T(x + 15, 20, a, 'class="lbl"')}${T(x + 45, 20, b, 'class="lbl"')}
    ${R(x, 33, 60, 22, 'class="paper"')}<line x1="${x + 30}" y1="33" x2="${x + 30}" y2="55" class="fold"/>${T(x + 15, 46, c, 'class="lbl"')}${T(x + 45, 46, d2, 'class="lbl"')}`;
  return S(170, 62, `${sheet(4, L.sheet1, "8", "1", "2", "7")}${sheet(78, L.sheet2, "6", "3", "4", "5")}
    ${T(146, 18, L.outside, 'class="sm" text-anchor="start"')}${T(146, 44, L.inside, 'class="sm" text-anchor="start"')}${T(85, 61, L.bookNote, 'class="sm"')}`);
}

// ---------------------------------------------------------------- the words
const W = {
  en: {
    title: "Production Manual", edition: "English edition", sub: "Prototype run · print specifications, double-sided printing, assembly and packing for one complete copy of the game",
    files: "All files are in", ver: "Built", contact: "Designer: RALPH LAUXIE",
    s1: "1. What is in one box", bomHead: ["Component", "Qty", "Finished size", "Printing", "Suggested stock and finish", "File"],
    s2: "2. Rules for every file",
    s3pf: "3. Printing instructions, file by file",
    pfIntro: "Every file below is listed with everything needed to print it. Pages labelled DIE LINE or TRIM LINE are cutting guides: register them to the printed page with the crop marks and never print them. Files not listed here (MANUAL.pdf, tiles/bank-tile-singles.pdf) are not printed. The tokens are single JPGs, not a PDF: see section 6.",
    pfKeys: ["Contents", "Finished size (trim)", "PDF page", "Colours", "Pages, front and back", "Turning the sheet", "Stock", "Finishing", "Quantity per game"],
    pfPage: (w, h, b, s) => `${w + 2 * b} × ${h + 2 * b} mm with bleed; ${w + 2 * b + 2 * s} × ${h + 2 * b + 2 * s} mm with the slug and marks`,
    pfReg: "Front and back registration was checked on every two-sided file. Cards, Player Aid, rulebook and Books: every front and back page has the same page size, bleed box and trim box. Token JPGs: every front has a back of the same name, the same canvas size, and the token centred on it. Bank tiles: with the back turned over left to right, every tile back is centred exactly on its front and on its cut on the die line, and the art covers the whole band 1.5 mm past every cut on both sides (it runs 2 mm past). The check is <code>print/factory/checkpress.py</code>; it also confirms every page is CMYK and the art fills the bleed.",
    general: [
      "Every page has <b>3 mm bleed</b> on all four sides (more than the 1.5 mm minimum), and the die-cut sheets carry <b>2 mm</b> of art past every cut. Trim to the finished size; keep the cut within ±0.5 mm. Nothing important sits within 3 mm of the trim.",
      "Files are <b>CMYK</b>, converted with the profile <b>Coated FOGRA39</b> (ISO Coated v2 condition, total ink 330%, relative colorimetric with black point compensation). If you print to another standard, convert from these files with your own profile. Send a printed <b>colour proof</b> before the run: the art is dark, so protect shadow detail and do not let blacks fill in.",
      "Every page sits in a <b>10 mm slug</b> outside the bleed with <b>crop marks</b> (trim), dashed <b>bleed marks</b>, three <b>registration targets</b> on the centre lines (top, left, right), a <b>CMYK colour bar</b> and a <b>page label</b> (file, page, what the page is, trim, bleed). The marks are in registration colour, so they print on all four plates; they sit at the same places on a front and its back. Each PDF page also carries a <b>TrimBox</b> and <b>BleedBox</b>.",
      "Images are 300 dpi or better at finished size; fonts are embedded. Do not rescale any page.",
      "<b>4/4</b> means printed on both sides, <b>4/0</b> on one side. Magenta lines (#EC008C) are cut lines and cyan dashed lines are folds; they appear only on die-line pages and are <b>never printed</b>.",
    ],
    s3: "4. Cards (63 × 88 mm)",
    cards: [
      "Each card PDF has <b>one card front per page</b>, in deck order. Print every page once. Every card in a deck has the same back, taken from <code>cards/card-backs.pdf</code> (table below).",
      "Print the back <b>head to head</b> with the front: the top of the back is behind the top of the front (diagram). Round the corners (3 mm radius).",
    ],
    backHead: ["Back page", "Back", "Used by"], cardHead: ["Deck", "Cards", "Front file", "Back page"],
    s4: "5. River board (3 panels)",
    board: [
      `<code>board/river-board.pdf</code> has three pages, one panel each (4/0), <b>${BPW} × ${BPH} mm</b>. Mount each on 2 mm greyboard, matte laminate, trim. Each panel has 42 mm square wells for the ${TILE} mm bank tiles and, in a strip along the left bank, a 66 × 91 mm Mist deck well; the river painting runs across all three joins (the middle panel is drawn mirrored so each join matches). The panels lie flat in the 296 mm box base. The panels are separate pieces laid edge to edge on the table, I | II | III, left to right; the river runs straight across the joins.`,
      "<b>Loom of the Fates board.</b> <code>loom/loom-of-the-fates.pdf</code>, page 1 (4/0); page 2 is its trim line (not printed). Mount on 2 mm greyboard, matte laminate, trim to 297 × 210 mm with 3 mm round corners. Its 22 mm knot circles take the 18 mm Knot tokens.",
      "<b>The Ledger board.</b> <code>ledger/the-ledger.pdf</code>, page 1 (4/0); page 2 is its trim line (not printed). Mount, laminate and trim like the Loom board (297 × 210 mm, 3 mm round corners). It holds the forgotten pile (a card-width numbered track), the 3 Fracture discs and the Black Water discs.",
    ],
    s5: "6. Tokens and bank tiles",
    punch: [
      `<b>Tokens.</b> The tokens come as single CMYK JPGs, one per side, not as a sheet: <code>tokens/jpg/25mm/</code> (${nBig} tokens of ${BIG} mm) and <code>tokens/jpg/18mm/</code> (${nSmall} tokens of ${SMALL} mm). Each JPG is the token centred on a square canvas at true size, 600 dpi, Coated FOGRA39 embedded; the art runs ${CUT_BLEED} mm past the cut circle. A token's front and back share a name (<code>Soul Front 1.jpg</code>, <code>Soul Back 1.jpg</code>): place both on the same spot of your die layout, centre on centre, upright, back behind front (the backs are <b>not</b> mirrored; mirror them yourself if your layout is work-and-turn). Die-cut ${BIG} mm and ${SMALL} mm circles from 2 mm greyboard, laminated, 4/4. The README in each folder lists the copies of each token.`,
      `<b>Bank tiles.</b> <code>tiles/bank-tiles.pdf</code>: ${TILE_COUNT} square tiles, ${TILE} × ${TILE} mm, on one A4 landscape sheet of 2 mm greyboard, laminated, 4/4. Page 1 front, page 2 back (already mirrored: turn the sheet over left to right, as the drawing shows), page 3 die line. The back is the fog side, marked with its Reach's numeral. <code>tiles/bank-tile-singles.pdf</code> is the same tiles one per page, for the digital table only (not printed).`,
    ],
    tokHead: ["Token", "Front", "Back", "Qty", "Size"],
    tokenNames: { "nb-tok-oar": "The Oar", "nb-tok-push": "Push Through", "nb-tok-hold": "Hold Fast", "nb-tok-shield": "Shield", "nb-tok-resign": "Resignation", "nb-soul": "The soul / the Ghost",
      "nb-root": "Root / Bloom", "nb-grievance": "Shade", "nb-blackwater": "Black Water", "nb-fracture": "Fracture", "nb-light": "Light", "nb-knot": "Knot", "nb-echo": "The Echo" },
    sameBoth: "same", spent: "spent (dimmed)", ghost: "the Ghost", bloom: "Bloom",
    s6: "7. Books of Remembrance (5) and rulebook",
    books: [
      "One Book per Soul: <code>books/book-of-remembrance-child, -garland, -king, -bride, -open.pdf</code>. Each is <b>8 A4 pages in reading order</b>; impose them yourselves for saddle stitching on two sheets (diagram). Cover sheet (pages 1, 2, 7, 8) on 250 g/m², inner sheet (pages 3–6) on 157 g/m² matte.",
      "<b>Photo corners.</b> Pages 4, 5 and 6 each have four card wells with a printed corner mark at every corner. Stick one clear self-adhesive photo corner (about 12 mm) on each mark: <b>48 per Book, 240 per game</b>. Do not die-cut slits: page 4 is printed on the back of page 3, so slits would cut through its text.",
      "<code>rulebook/rulebook.pdf</code>: RBPAGES A4 pages in reading order, saddle-stitched (RBSHEETS sheets). <code>rulebook/player-aid.pdf</code>: AIDCARDS A5 cards printed 4/4, AIDPAGES pages in order (page 1 is the first card's front, page 2 its back, and so on). Round the corners and join each set at the top-left corner with a 6 mm rivet so it fans open. 4 sets per game.",
    ],
    s7: "8. The box",
    box: [
      `Lid ${LID.L} × ${LID.L} × ${LID.D} mm and base ${BASE.L} × ${BASE.L} × ${BASE.D} mm, 2 mm greyboard wrapped in 157 g/m² art paper, matte laminated. <code>box/box-lid-wrap.pdf</code> and <code>box/box-base-wrap.pdf</code> are the flat wraps (4/0) with ${TURN} mm turn-ins; <code>box-lid-dieline.pdf</code> and <code>box-base-dieline.pdf</code> show where to cut and fold. If your stock box is a different size, send us its dieline and we will place the art on it.`,
      "On the lid the four sides are already turned so each reads upright once folded down: <b>A</b> (front, below the bottom edge of the cover art), <b>B</b> (right), <b>C</b> (back, above the title), <b>D</b> (left). The base wrap carries the box back on the bottom panel; its sides are plain.",
      "Glue <code>box-lid-liner.pdf</code> inside the lid and <code>box-base-liner.pdf</code> on the floor of the base, art side up, after wrapping.",
    ],
    s8: "9. Assembly and packing (one copy)",
    pack: [
      "Base on the table. In this order, bottom to top:",
      "The three river board panels, stacked I, II, III, face up, then the Loom of the Fates board and the Ledger board on top.",
      "The tokens (bagged) and the bank-tile board, face up (unpunched).",
      "The five Books of Remembrance, each with its photo corners applied.",
      "The cards, each deck shrink-wrapped or banded separately: Memory 72, Mist 42, Ghost 12, then Soul 5 and Mantle 4 together.",
      "Four Player Aids, then the rulebook on top, cover up.",
      "Lid on, side A to the front (the cover reads upright). Shrink-wrap the box.",
    ],
    s9: "10. Before you print: checklist",
    check: [
      "Colour proof approved, especially the dark river and box art.",
      "Card backs line up with their fronts (head to head); every bank tile's fog side shows its own Reach.",
      `Every token's back sits centre on centre behind its front; die cuts stay inside the art's ${CUT_BLEED} mm overrun.`,
      "Box wrap: sides read upright when folded; cover title at the top; turn-ins neat on the inside.",
      "Book pages 4–6: 48 photo corners each, on the printed marks; cards slide in and out.",
      "Counts match section 1.",
    ],
    s10: "11. File list",
    // diagram labels
    front: "FRONT", back: "BACK", top: "top", cardFlip: "same orientation, top to top", trim: "63 × 88 mm + 3 mm bleed",
    sheetFront: "page 1 · front", sheetBack: "page 2 · back (already mirrored)", flipLR: "turn over left to right", punchNote: "each back (A′, B′) lands behind its front (A, B)",
    near: "Near Shore", far: "Far Shore", boardJoin: "three separate panels, laid edge to edge",
    cut: "cut", fold: "fold", turnIn: "turn-in (15 mm)", boxNote1: "Lid wrap, flat.", boxNote2: "Sides fold down; turn-ins", boxNote3: "fold over the inside edge.",
    sheet1: "Sheet 1 (cover)", sheet2: "Sheet 2 (inside)", outside: "outer side", inside: "inner side", bookNote: "nest sheet 2 inside sheet 1, fold, staple twice on the fold",
    rows: (n) => [
      ["Memory cards", n.memory, "63 × 88 mm", "4/4", "310 g/m² black-core card, linen, matte", "cards/cards-memory.pdf"],
      ["Mist cards", n.mist, "63 × 88 mm", "4/4", "as above", "cards/cards-mist.pdf"],
      ["Ghost cards", n.ghost, "63 × 88 mm", "4/4", "as above", "cards/cards-ghost.pdf"],
      ["Soul cards", n.soul, "63 × 88 mm", "4/4", "as above", "cards/cards-soul.pdf"],
      ["Mantle cards", n.mantle, "63 × 88 mm", "4/4", "as above", "cards/cards-mantle.pdf"],
      ["River board panels", 3, `${BPW} × ${BPH} mm`, "4/0", "mounted on 2 mm greyboard, matte laminated", "board/river-board.pdf"],
      ["Loom of the Fates board", 1, "297 × 210 mm", "4/0", "mounted on 2 mm greyboard, matte laminated", "loom/loom-of-the-fates.pdf"],
      ["The Ledger board", 1, "297 × 210 mm", "4/0", "mounted on 2 mm greyboard, matte laminated", "ledger/the-ledger.pdf"],
      ["Tokens", n.tokens, `${BIG} mm and ${SMALL} mm discs`, "4/4", "2 mm greyboard, laminated, die-cut", "tokens/jpg/25mm/, tokens/jpg/18mm/"],
      ["Bank tiles", n.tiles, `${TILE} × ${TILE} mm`, "4/4", "2 mm greyboard, laminated, die-cut (one A4 sheet)", "tiles/bank-tiles.pdf"],
      ["Books of Remembrance", 5, "A4, 8 pages", "4/4", "cover 250 g/m², inside 157 g/m² matte; saddle stitch", "books/…"],
      ["Clear photo corners", 240, "≈12 mm", "—", "self-adhesive, 48 per Book", "—"],
      ["Rulebook", 1, "A4, RBPAGES pages", "4/4", "157 g/m² matte; saddle stitch", "rulebook/rulebook.pdf"],
      ["Player Aid", "4 sets of AIDCARDS", "A5", "4/4", "300 g/m² card, matte; corner rivet", "rulebook/player-aid.pdf"],
      ["Box lid", 1, `${LID.L} × ${LID.L} × ${LID.D} mm`, "4/0 wrap", "2 mm greyboard, 157 g/m² wrap, matte laminated", "box/box-lid-wrap.pdf"],
      ["Box base", 1, `${BASE.L} × ${BASE.L} × ${BASE.D} mm`, "4/0 wrap", "as above", "box/box-base-wrap.pdf"],
      ["Box liners", 2, "inside lid, base floor", "4/0", "157 g/m², glued in", "box/box-*-liner.pdf"],
    ],
    backUse: ["Memory cards", "Mist cards", "Ghost cards", "Soul cards", "Mantle cards"],
    backName: ["Memory", "Mist", "Ghost", "Soul", "Mantle"],
    deckName: { "cards-memory": "Memory", "cards-mist": "Mist", "cards-ghost": "Ghost", "cards-mantle": "Mantle", "cards-soul": "Soul" },
    byReach: "6, 7 or 8 by Reach",
  },
  zh: {
    title: "生產手冊", edition: "正體中文版", sub: "打樣用 · 一套完整遊戲的印刷規格、雙面印刷、組裝與包裝說明",
    files: "所有檔案位於", ver: "產生日期", contact: "設計：RALPH LAUXIE",
    s1: "1. 一盒內容物", bomHead: ["配件", "數量", "成品尺寸", "印刷", "建議用紙與加工", "檔案"],
    s2: "2. 所有檔案的共通規則",
    s3pf: "3. 逐檔印刷說明",
    pfIntro: "以下每個檔案都列出印刷所需的全部資訊。標示 DIE LINE 或 TRIM LINE 的頁面為裁切依據：請以裁切標記與印刷頁套準，且絕不印出。未列於此的檔案（MANUAL.pdf、tiles/bank-tile-singles.pdf）不需印刷。標記為單張 JPG 而非 PDF：見第 6 節。",
    pfKeys: ["內容", "成品尺寸（裁切）", "PDF 頁面", "色數", "頁面與正背面", "翻面方式", "用紙", "加工", "每套數量"],
    pfPage: (w, h, b, s) => `含出血 ${w + 2 * b} × ${h + 2 * b} mm；含版邊與標記 ${w + 2 * b + 2 * s} × ${h + 2 * b + 2 * s} mm`,
    pfReg: "所有雙面印刷的檔案都已檢查正背面套準。卡牌、玩家輔助卡、規則書與憶念之書：每個正面與背面頁的頁面尺寸、BleedBox 與 TrimBox 完全相同。標記 JPG：每個正面都有同名的背面，畫布尺寸相同，標記置中。河岸板塊：將背面左右翻面後，每塊板塊的背面都正好對準其正面與刀模上的裁切線，且正、背兩面的圖案都完整覆蓋裁切線外 1.5 mm 的範圍（實際超出 2 mm）。檢查程式為 <code>print/factory/checkpress.py</code>，並確認每頁皆為 CMYK、圖案填滿出血。",
    general: [
      "每個頁面四邊皆有 <b>3 mm 出血</b>（大於 1.5 mm 的最低要求），模切紙張上的圖案超出每條裁切線 <b>2 mm</b>。裁切至成品尺寸，誤差在 ±0.5 mm 以內。距裁切線 3 mm 內沒有重要內容。",
      "檔案為 <b>CMYK</b>，以 <b>Coated FOGRA39</b> 描述檔（ISO Coated v2 印刷條件，總墨量 330%，相對色度並使用黑點補償）轉換。如貴廠採用其他印刷標準，請由這些檔案以貴廠描述檔轉換。量產前請提供<b>印刷色樣</b>：美術風格偏暗，請保留暗部細節，避免黑色糊掉。",
      "每頁在出血外有 <b>10 mm 的版邊</b>，含<b>裁切標記</b>、虛線<b>出血標記</b>、位於中心線（上、左、右）的三個<b>套準標記</b>、<b>CMYK 色條</b>與<b>頁面說明</b>（檔案、頁碼、此頁內容、成品尺寸、出血）。標記使用套準色，四色版皆會印出；正面與背面的標記位置相同。每個 PDF 頁面也設定了 <b>TrimBox</b> 與 <b>BleedBox</b>。",
      "圖像在成品尺寸下皆為 300 dpi 以上；字型已內嵌。請勿縮放任何頁面。",
      "<b>4/4</b> 表示雙面印刷，<b>4/0</b> 表示單面印刷。洋紅色線（#EC008C）為裁切線，青色虛線為摺線；它們只出現在刀模頁上，<b>不可印出</b>。",
    ],
    s3: "4. 卡牌（63 × 88 mm）",
    cards: [
      "每個卡牌 PDF <b>每頁一張牌的正面</b>，依牌組順序排列。每一頁各印一張。同一牌組的所有卡牌使用相同的背面，取自 <code>cards/card-backs.pdf</code>（見下表）。",
      "背面與正面<b>頭對頭</b>印刷：背面的上緣位於正面上緣的背後（見圖）。圓角半徑 3 mm。",
    ],
    backHead: ["背面頁", "背面", "使用於"], cardHead: ["牌組", "張數", "正面檔案", "背面頁"],
    s4: "5. 河流圖板（3 塊）",
    board: [
      `<code>board/river-board.pdf</code> 有三頁，每頁一塊（4/0），<b>${BPW} × ${BPH} mm</b>。各自裱於 2 mm 灰紙板，上霧膜後裁切。每塊有 42 mm 方槽用來放 ${TILE} mm 的河岸板塊，左岸外側的長條區有一個 66 × 91 mm 的迷霧牌庫槽；河流圖案跨過所有接縫（中間一塊以鏡像繪製，讓每條接縫兩側相同）。圖板可平放入 296 mm 的盒底。三塊為獨立配件，於桌上依 I | II | III 由左至右邊對邊排列；河流會直接跨過接縫。`,
      "<b>命運織機圖板。</b><code>loom/loom-of-the-fates.pdf</code> 第 1 頁（4/0）；第 2 頁為裁切線（不印）。裱於 2 mm 灰紙板，上霧膜，裁切為 297 × 210 mm，圓角 3 mm。其 22 mm 的結圓圈用來放 18 mm 的結標記。",
      "<b>渡帳圖板。</b><code>ledger/the-ledger.pdf</code> 第 1 頁（4/0）；第 2 頁為裁切線（不印）。裱板、上膜與裁切方式同命運織機圖板（297 × 210 mm，圓角 3 mm）。板上放遺忘堆（一條與牌同寬的編號軌）、3 個裂痕圓片與黑水圓片。",
    ],
    s5: "6. 標記與河岸板塊",
    punch: [
      `<b>標記。</b>標記以單張 CMYK JPG 提供，每面一張，不再排成一張板：<code>tokens/jpg/25mm/</code>（${nBig} 個 ${BIG} mm 標記）與 <code>tokens/jpg/18mm/</code>（${nSmall} 個 ${SMALL} mm 標記）。每張 JPG 都是標記以實際尺寸置中於正方形畫布上，600 dpi，內嵌 Coated FOGRA39；圖案超出圓形裁切線 ${CUT_BLEED} mm。同一標記的正面與背面檔名相對應（<code>Soul Front 1.jpg</code>、<code>Soul Back 1.jpg</code>）：請在模切排版上放在同一位置，中心對中心、正立、背面在正面背後（背面<b>未</b>鏡像；若採自翻版印刷請自行鏡像）。以 2 mm 灰紙板模切 ${BIG} mm 與 ${SMALL} mm 圓片，上膜，4/4。各資料夾內的 README 列出每種標記的數量。`,
      `<b>河岸板塊。</b><code>tiles/bank-tiles.pdf</code>：${TILE_COUNT} 塊 ${TILE} × ${TILE} mm 方形板塊，排在一張 A4 橫式 2 mm 灰紙板上，上膜，4/4。第 1 頁正面、第 2 頁背面（已鏡像：如圖所示將紙張左右翻面）、第 3 頁刀模。背面為霧面，印有所屬河段的羅馬數字。<code>tiles/bank-tile-singles.pdf</code> 為每頁一塊的版本，僅供線上桌遊使用（不印）。`,
    ],
    tokHead: ["標記", "正面", "背面", "數量", "尺寸"],
    tokenNames: { "nb-tok-oar": "船槳", "nb-tok-push": "破浪", "nb-tok-hold": "堅守", "nb-tok-shield": "護盾", "nb-tok-resign": "認命", "nb-soul": "亡魂／幽靈",
      "nb-root": "根／花", "nb-grievance": "怨念", "nb-blackwater": "黑水", "nb-fracture": "裂痕", "nb-light": "光", "nb-knot": "結", "nb-echo": "迴響" },
    sameBoth: "相同", spent: "已使用（變暗）", ghost: "幽靈", bloom: "花",
    s6: "7. 憶念之書（5 本）與規則書",
    books: [
      "每個亡魂一本：<code>books/book-of-remembrance-child、-garland、-king、-bride、-open.pdf</code>。每本為<b>依閱讀順序排列的 8 頁 A4</b>；請自行拼版，以兩張紙騎馬釘裝訂（見圖）。封面紙（第 1、2、7、8 頁）用 250 g/m²，內頁紙（第 3–6 頁）用 157 g/m² 霧面紙。",
      "<b>相角。</b>第 4、5、6 頁各有四個牌槽，每個角都印有角標。請在每個角標上貼一個透明自黏相角（約 12 mm）：<b>每本 48 個，每套 240 個</b>。請勿模切切口：第 4 頁印在第 3 頁的背面，切口會切穿其文字。",
      "<code>rulebook/rulebook.pdf</code>：依閱讀順序排列的 RBPAGES 頁 A4，騎馬釘（RBSHEETS 張紙）。<code>rulebook/player-aid.pdf</code>：AIDCARDS 張 A5 卡，4/4 印刷，共 AIDPAGES 頁依序排列（第 1 頁為第一張卡的正面、第 2 頁為其背面，依此類推）。導圓角，並在左上角以 6 mm 鉚釘將每組串起，可扇形展開。每套 4 組。",
    ],
    s7: "8. 盒子",
    box: [
      `盒蓋 ${LID.L} × ${LID.L} × ${LID.D} mm，盒底 ${BASE.L} × ${BASE.L} × ${BASE.D} mm，2 mm 灰紙板裱 157 g/m² 銅版紙，上霧膜。<code>box/box-lid-wrap.pdf</code> 與 <code>box/box-base-wrap.pdf</code> 為攤平的裱紙（4/0），含 ${TURN} mm 內折邊；<code>box-lid-dieline.pdf</code> 與 <code>box-base-dieline.pdf</code> 標示裁切與摺線位置。若貴廠的標準盒尺寸不同，請提供刀模，我們會將美術配置上去。`,
      "盒蓋四個側面已預先轉好方向，往下摺後皆為正向：<b>A</b>（正面，位於封面圖下緣）、<b>B</b>（右）、<b>C</b>（背面，位於標題上方）、<b>D</b>（左）。盒底裱紙的底面為盒背圖，側面為素面。",
      "裱完後，將 <code>box-lid-liner.pdf</code> 貼於盒蓋內側，<code>box-base-liner.pdf</code> 貼於盒底內面，圖案朝上。",
    ],
    s8: "9. 組裝與包裝（一套）",
    pack: [
      "盒底放在桌上，由下而上依序放入：",
      "三塊河流圖板，依 I、II、III 疊放，面朝上；最上面放命運織機圖板與渡帳圖板。",
      "標記（裝袋）與河岸板塊板，面朝上（未壓出）。",
      "五本憶念之書，各自貼好相角。",
      "卡牌，各牌組分別收縮膜或以束帶綁好：記憶牌 72、迷霧牌 42、幽靈牌 12，亡魂牌 5 與稱號牌 4 合為一疊。",
      "四張玩家輔助卡，最上面放規則書，封面朝上。",
      "蓋上盒蓋，A 面朝前（封面為正向）。整盒收縮膜。",
    ],
    s9: "10. 印刷前檢查清單",
    check: [
      "印刷色樣已確認，尤其是深色的河流與盒子美術。",
      "卡牌背面與正面對齊（頭對頭）；每塊河岸板塊的霧面印有其所屬河段。",
      `每個標記的背面與正面中心對中心套準；模切位置不超出圖案的 ${CUT_BLEED} mm 延伸範圍。`,
      "盒子裱紙：側面摺下後為正向；封面標題在上；內折邊平整。",
      "憶念之書第 4–6 頁：每頁 48 個相角貼在角標上；卡牌能順利插入與取出。",
      "數量與第 1 節相符。",
    ],
    s10: "11. 檔案清單",
    front: "正面", back: "背面", top: "上", cardFlip: "方向相同，上對上", trim: "63 × 88 mm + 3 mm 出血",
    sheetFront: "第 1 頁 · 正面", sheetBack: "第 2 頁 · 背面（已鏡像）", flipLR: "左右翻面", punchNote: "每個背面（A′、B′）落在其正面（A、B）的背後",
    near: "此岸", far: "彼岸", boardJoin: "三塊獨立圖板，邊對邊排列",
    cut: "裁切", fold: "摺線", turnIn: "內折邊（15 mm）", boxNote1: "盒蓋裱紙（攤平）。", boxNote2: "側面往下摺；", boxNote3: "內折邊翻折到內側。",
    sheet1: "第 1 張（封面）", sheet2: "第 2 張（內頁）", outside: "外側", inside: "內側", bookNote: "將第 2 張套入第 1 張內，對摺，於摺線上釘兩針",
    rows: (n) => [
      ["記憶牌", n.memory, "63 × 88 mm", "4/4", "310 g/m² 黑芯卡紙，布紋，霧面", "cards/cards-memory.pdf"],
      ["迷霧牌", n.mist, "63 × 88 mm", "4/4", "同上", "cards/cards-mist.pdf"],
      ["幽靈牌", n.ghost, "63 × 88 mm", "4/4", "同上", "cards/cards-ghost.pdf"],
      ["亡魂牌", n.soul, "63 × 88 mm", "4/4", "同上", "cards/cards-soul.pdf"],
      ["稱號牌", n.mantle, "63 × 88 mm", "4/4", "同上", "cards/cards-mantle.pdf"],
      ["河流圖板", 3, `${BPW} × ${BPH} mm`, "4/0", "裱 2 mm 灰紙板，上霧膜", "board/river-board.pdf"],
      ["命運織機圖板", 1, "297 × 210 mm", "4/0", "裱 2 mm 灰紙板，上霧膜", "loom/loom-of-the-fates.pdf"],
      ["渡帳圖板", 1, "297 × 210 mm", "4/0", "裱 2 mm 灰紙板，上霧膜", "ledger/the-ledger.pdf"],
      ["標記", n.tokens, `${BIG} mm 與 ${SMALL} mm 圓片`, "4/4", "2 mm 灰紙板，上膜，模切", "tokens/jpg/25mm/、tokens/jpg/18mm/"],
      ["河岸板塊", n.tiles, `${TILE} × ${TILE} mm`, "4/4", "2 mm 灰紙板，上膜，模切（一張 A4）", "tiles/bank-tiles.pdf"],
      ["憶念之書", 5, "A4，8 頁", "4/4", "封面 250 g/m²，內頁 157 g/m² 霧面；騎馬釘", "books/…"],
      ["透明相角", 240, "約 12 mm", "—", "自黏，每本 48 個", "—"],
      ["規則書", 1, "A4，RBPAGES 頁", "4/4", "157 g/m² 霧面；騎馬釘", "rulebook/rulebook.pdf"],
      ["玩家輔助卡", "4 組，每組 AIDCARDS 張", "A5", "4/4", "300 g/m² 卡紙，霧面；角落鉚釘", "rulebook/player-aid.pdf"],
      ["盒蓋", 1, `${LID.L} × ${LID.L} × ${LID.D} mm`, "4/0 裱紙", "2 mm 灰紙板，裱 157 g/m²，上霧膜", "box/box-lid-wrap.pdf"],
      ["盒底", 1, `${BASE.L} × ${BASE.L} × ${BASE.D} mm`, "4/0 裱紙", "同上", "box/box-base-wrap.pdf"],
      ["盒內襯紙", 2, "盒蓋內側、盒底內面", "4/0", "157 g/m²，黏貼", "box/box-*-liner.pdf"],
    ],
    backUse: ["記憶牌", "迷霧牌", "幽靈牌", "亡魂牌", "稱號牌"],
    backName: ["記憶", "迷霧", "幽靈", "亡魂", "稱號"],
    deckName: { "cards-memory": "記憶牌", "cards-mist": "迷霧牌", "cards-ghost": "幽靈牌", "cards-mantle": "稱號牌", "cards-soul": "亡魂牌" },
    byReach: "依河段用 6、7 或 8",
  },
};

const FILES = [
  "MANUAL.pdf", "cards/cards-memory.pdf", "cards/cards-mist.pdf", "cards/cards-ghost.pdf", "cards/cards-mantle.pdf", "cards/cards-soul.pdf", "cards/card-backs.pdf",
  "board/river-board.pdf", "loom/loom-of-the-fates.pdf", "ledger/the-ledger.pdf", "tokens/jpg/25mm/", "tokens/jpg/18mm/", "tiles/bank-tiles.pdf", "tiles/bank-tile-singles.pdf",
  "books/book-of-remembrance-child.pdf", "books/book-of-remembrance-garland.pdf", "books/book-of-remembrance-king.pdf", "books/book-of-remembrance-bride.pdf", "books/book-of-remembrance-open.pdf",
  "rulebook/rulebook.pdf", "rulebook/player-aid.pdf",
  "box/box-lid-wrap.pdf", "box/box-lid-dieline.pdf", "box/box-base-wrap.pdf", "box/box-base-dieline.pdf", "box/box-lid-liner.pdf", "box/box-base-liner.pdf",
];

const table = (head, rows, cls = "") => `<table class="${cls}"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const icon = (id, col) => `<svg class="ti" style="color:${col}"><use href="#${id}"/></svg>`;

function body(lang) {
  const L = W[lang], dk = decks(lang), backs = cardBacks(lang);
  const plan = pressPlan(lang);
  const count = name => dk.find(d => d[0] === name)[1].length;
  const n = { memory: count("cards-memory"), mist: count("cards-mist"), ghost: count("cards-ghost"), soul: count("cards-soul"), mantle: count("cards-mantle"), tiles: TILE_COUNT,
    tokens: TOKENS.reduce((a, t) => a + t[4], 0) };
  const backPage = { "cards-memory": 1, "cards-mist": 2, "cards-ghost": 3, "cards-soul": 4, "cards-mantle": 5 };
  const reachCounts = TILES.map(([, l]) => l.length).join(" / ");
  return `
  <section class="cover">
    <div class="eyebrow">NETHERBLOOM · 《彼岸花渡》</div>
    <h1>${L.title}</h1><div class="ed">${L.edition}</div><p class="sub">${L.sub}</p>
    <p class="meta">${L.files} <code>print/factory/dist/${lang === "zh" ? "zh-TW" : "en"}/</code><br>${L.ver} ${today} · ${L.contact}</p>
  </section>
  <h2>${L.s1}</h2>${table(L.bomHead, L.rows(n).map(r => r.map((c, i) => i === 5 && c !== "—" ? `<code>${c}</code>` : c)), "bom")}
  <h2>${L.s2}</h2><ul>${L.general.map(p => `<li>${p}</li>`).join("")}</ul>
  <h2>${L.s3pf}</h2><p>${L.pfIntro}</p><p>${L.pfReg}</p>${plan.files.map(f => `<div class="pf"><h3><code>${f.path}</code></h3>${table(["", ""], [
    [L.pfKeys[0], f.what[lang]], [L.pfKeys[1], `${f.trim[0]} × ${f.trim[1]} mm`], [L.pfKeys[2], L.pfPage(f.trim[0], f.trim[1], plan.bleed, plan.slug)],
    [L.pfKeys[3], f.sides === "4/4" ? (lang === "zh" ? "4/4（雙面 CMYK）" : "4/4 (CMYK both sides)") : f.sides === "4/0" ? (lang === "zh" ? "4/0（單面 CMYK）" : "4/0 (CMYK one side)") : (lang === "zh" ? "不印（裁切依據）" : "not printed (cutting guide)")],
    [L.pfKeys[4], f.pair[lang]], [L.pfKeys[5], f.turn[lang]], [L.pfKeys[6], f.stock[lang]], [L.pfKeys[7], f.finish[lang]], [L.pfKeys[8], f.qty[lang]]], "kv")}</div>`).join("")}
  <h2>${L.s3}</h2>${L.cards.map(p => `<p>${p}</p>`).join("")}<div class="fig">${dgCard(L)}</div>
  <div class="two">${table(L.cardHead, dk.map(([file, cards]) => [L.deckName[file], cards.length, `<code>cards/${file}.pdf</code>`, backPage[file] ?? L.byReach]))}
  ${table(L.backHead, backs.map((b, i) => [i + 1, L.backName[i], L.backUse[i]]))}</div>
  <p class="small">${lang === "zh" ? "河岸板塊每河段塊數" : "Bank tiles per Reach"}: ${reachCounts}</p>
  <h2>${L.s4}</h2>${L.board.map(p => `<p>${p}</p>`).join("")}<div class="fig">${dgBoard(L)}</div>
  <h2>${L.s5}</h2>${L.punch.map(p => `<p>${p}</p>`).join("")}<div class="fig">${dgPunch(L)}</div>
  ${table(L.tokHead, TOKENS.map(([f, fc, b, bc, q, d]) => [L.tokenNames[f], icon(f, fc === C.bone || fc === "#EFE7D6" ? "#8a6a3e" : fc === C.cyan ? "#2f7f8e" : fc === C.mist ? "#6b655d" : fc),
    f === b && bc === fc ? L.sameBoth : `${icon(b, bc === C.bone ? "#8a6a3e" : bc === C.cyan ? "#2f7f8e" : bc === C.mist ? "#6b655d" : bc)} ${f === "nb-tok-push" ? L.spent : f === "nb-soul" ? L.ghost : f === "nb-root" ? L.bloom : ""}`, q, `${d} mm`]), "tok")}
  <h2>${L.s6}</h2>${L.books.map(p => `<p>${p}</p>`).join("")}<div class="fig">${dgBook(L)}</div>
  <h2>${L.s7}</h2>${L.box.map(p => `<p>${p}</p>`).join("")}<div class="fig">${dgBox(L)}</div>
  <h2>${L.s8}</h2><p>${L.pack[0]}</p><ol>${L.pack.slice(1).map(p => `<li>${p}</li>`).join("")}</ol>
  <h2>${L.s9}</h2><ul class="check">${L.check.map(p => `<li>${p}</li>`).join("")}</ul>
  <h2>${L.s10}</h2><div class="files">${FILES.map(f => `<code>${f}</code>`).join("")}</div>`;
}

const CSS = lang => `
@page { size: A4; margin: 16mm 16mm 18mm; @bottom-center { content: counter(page); font-family: "IBM Plex Mono", monospace; font-size: 7.5pt; color: #8a6a3e; }
  @top-right { content: "Netherbloom · ${W[lang].title}"; font-family: "IBM Plex Mono", "Noto Serif TC", monospace; font-size: 7pt; color: #8a6a3e; } }
@page :first { @top-right { content: none; } }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${FACE[lang].body}; font-size: ${lang === "zh" ? 9.6 : 10}pt; line-height: ${lang === "zh" ? 1.7 : 1.45}; color: #1b1712; }
.cover { padding: 30mm 0 10mm; border-bottom: .5mm solid #8a6a3e; margin-bottom: 6mm; }
.eyebrow { font-family: "IBM Plex Mono", "Noto Serif TC", monospace; font-size: 8pt; letter-spacing: .3em; color: #9b1f2f; }
h1 { font-family: ${FACE[lang].display}; font-weight: ${lang === "zh" ? 600 : 400}; font-size: 30pt; margin: 3mm 0 1mm; }
.ed { font-family: ${FACE[lang].display}; font-size: 13pt; color: #5c4a3a; }
.sub { font-size: 11pt; color: #3c2f22; max-width: 150mm; }
.meta { font-size: 9pt; color: #5c4a3a; }
h2 { font-family: ${FACE[lang].display}; font-weight: ${lang === "zh" ? 600 : 400}; font-size: 15pt; margin: 7mm 0 2mm; padding-bottom: 1mm; border-bottom: .3mm solid #c9b48a; break-after: avoid; }
p, li { margin: 0 0 2mm; } ul, ol { padding-left: 5mm; margin: 0 0 2mm; }
code { font-family: "IBM Plex Mono", monospace; font-size: .86em; background: #f3ecdd; padding: 0 .8mm; border-radius: .6mm; white-space: nowrap; }
b { color: #3a1a12; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 3mm; font-size: .86em; break-inside: auto; }
th, td { border: .25mm solid #c9b48a; padding: 1.1mm 1.6mm; text-align: left; vertical-align: top; } th { background: #ede2c8; }
tr { break-inside: avoid; }
table.bom code { white-space: nowrap; font-size: .74em; }
.two { display: grid; grid-template-columns: 1.3fr 1fr; gap: 4mm; align-items: start; }
.fig { margin: 2mm 0 3mm; break-inside: avoid; text-align: center; }
.dg { max-width: 100%; height: auto; overflow: visible; }
.dg text { font-family: "Alegreya Sans", "Noto Serif TC", sans-serif; fill: #3c2f22; } .dg text:not([text-anchor]) { text-anchor: middle; }
.dg .lbl { font-size: 4.2px; font-weight: 700; } .dg .sm { font-size: 3px; } .dg .bone { fill: #E6D3A3; }
.dg .ink { fill: #17141b; } .dg .gilt { fill: none; stroke: #8a6d48; stroke-width: .4; } .dg .water { fill: #16343b; }
.dg .arr { fill: none; stroke: #9b1f2f; stroke-width: .6; } .dg .disc { fill: #2a2530; stroke: #8a6d48; stroke-width: .4; }
.dg .top { fill: #efe5cf; stroke: #8a6a3e; stroke-width: .3; } .dg .side { fill: #e6d9bf; stroke: #8a6a3e; stroke-width: .3; } .dg .turn { fill: #d8cab0; }
.dg .fold { fill: none; stroke: #00a0e0; stroke-width: .35; stroke-dasharray: 1.4 .9; } .dg .cutl { stroke: #ec008c; stroke-width: .5; } .dg .paper { fill: #fbf7ee; stroke: #8a6a3e; stroke-width: .3; }
.ti { width: 5mm; height: 5mm; vertical-align: middle; }
table.tok td { vertical-align: middle; }
.pf { break-inside: avoid; margin: 0 0 4mm; } .pf h3 { font-size: 10.5pt; margin: 3mm 0 1mm; }
table.kv thead { display: none; } table.kv td:first-child { width: 34mm; color: #5c4a3a; font-weight: 600; background: #f6efe0; }
.check li { list-style: none; margin-left: -5mm; } .check li::before { content: "☐ "; color: #8a6a3e; }
.files { columns: 2; column-gap: 8mm; font-size: .9em; } .files code { display: block; white-space: normal; background: none; padding: .3mm 0; }
.small { font-size: .85em; color: #5c4a3a; }
`;

export async function build(lang, dir, { png }) {
  const html = `<!doctype html><html lang="${lang === "zh" ? "zh-Hant-TW" : "en"}"><head><meta charset="utf-8"><title>Netherbloom ${W[lang].title}</title>${FONTS}<style>${CSS(lang)}</style></head>
<body><div style="display:none">${SYMBOLS}</div>${body(lang)}${FIT_SCRIPT}</body></html>`;
  const rb = pages(join(dir, "rulebook", "rulebook.pdf")) || 16, aid = pages(join(dir, "rulebook", "player-aid.pdf")) || 2;
  await render(join(dir, "MANUAL"), html.replaceAll("RBPAGES", rb).replaceAll("RBSHEETS", rb / 4).replaceAll("AIDPAGES", aid).replaceAll("AIDCARDS", Math.ceil(aid / 2)), { w: PW, h: PH, png });
}
