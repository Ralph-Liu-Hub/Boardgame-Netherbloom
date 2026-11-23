# The reprint manual (A4) for owners of the printed V3.2 game: what of V5 must be printed new or again because its content
# differs, what to keep from V3.2, and the press spec of the files in the reprint zip. Written by reprint_from_v3.py with
# the page counts it actually picked, so the manual and the zip always agree.
import json, os, subprocess
from common import OUT, HERE, FONTS, FAMILY, DISPLAY, E

NEW, AGAIN, KEEP, SKIP = "new", "again", "keep", "skip"


def rows(L):
    T = lambda zh, en: L(zh, en)
    # (V5 component, V5 qty + size, V3.2 counterpart, verdict, why, files in the reprint zip)
    return [
        (T("記憶牌", "Memory cards"), T("72 張，迷你 41 × 63", "72, mini 41 × 63"), T("72 張，63 × 88", "72, 63 × 88"), AGAIN,
         T("尺寸改為迷你牌，才放得進新的憶念之書；效果文字全部改寫。", "Now mini size, to fit the new Books; every effect was rewritten."), "cards/memory-cards.pdf, card-backs-mini.pdf"),
        (T("迷霧牌", "Mist cards"), T("56 張，迷你 41 × 63", "56, mini 41 × 63"), T("42 張，63 × 88", "42, 63 × 88"), AGAIN,
         T("張數、尺寸與內容都不同；每張背面印本章的霧。", "Count, size and content changed; each back shows its chapter's fog."), "cards/mist-cards-fronts.pdf, mist-cards-backs.pdf"),
        (T("命運之霧", "Fate Mist cards"), T("60 張，迷你 41 × 63", "60, mini 41 × 63"), T("無", "none"), NEW,
         T("V5 新增：雙面，一面事件、一面條件。", "New in V5: two sides, event and condition."), "cards/fate-mist-event-side.pdf, fate-mist-condition-side.pdf"),
        (T("託付卡", "Commission cards"), T("40 張，63 × 88", "40, 63 × 88"), T("無（V3 的信物牌 36 張停用）", "none (V3's 36 Keepsakes retire)"), NEW,
         T("V5 新增，取代信物牌。", "New in V5; replaces the Keepsakes."), "cards/commission-cards.pdf, card-backs-standard.pdf p.1"),
        (T("結局牌", "Ending cards"), T("20 張，63 × 88", "20, 63 × 88"), T("19 張", "19"), AGAIN,
         T("結局全部改寫，張數也不同；每張背面不同。", "Every ending was rewritten and the count changed; each back differs."), "cards/ending-cards-fronts.pdf, ending-cards-backs.pdf"),
        (T("亡魂牌：最後火光的孩子、花環少女、無名渡河", "Soul cards: the Child, the Garland Girl, Open Crossing"), T("3 張，63 × 88", "3, 63 × 88"), T("同名 3 張", "the same 3"), AGAIN,
         T("特色規則改了（孩子：整局忽略第一道裂痕；花環少女：散花；無名渡河：起始 2 點光）。", "Their special rules changed (Child: the first Fracture of the game; Garland Girl: Scattered Petals; Open Crossing: 2 starting Light)."), T("cards/soul-cards.pdf（3 頁）", "cards/soul-cards.pdf (3 pages)")),
        (T("亡魂牌：渡船上的國王、留在冥府的新娘", "Soul cards: the King, the Bride"), T("2 張", "2"), T("同名 2 張", "the same 2"), KEEP,
         T("特色規則與 V5 相同。", "Same special rule as V5."), ""),
        (T("稱號牌：守魂者、破霧者", "Mantles: Spirit Warden, Mistbreaker"), T("2 張，63 × 88", "2, 63 × 88"), T("同名 2 張", "the same 2"), AGAIN,
         T("效果改了（守魂者：駐足；破霧者：看穿迷霧）。", "Their effects changed (Warden: Linger; Mistbreaker: See Through the Mist)."), "cards/mantle-cards.pdf"),
        (T("稱號牌：收割者", "Mantle: the Reaper"), T("1 張，63 × 88", "1, 63 × 88"), T("無", "none"), NEW,
         T("V5 新增的第 5 張稱號。", "The fifth Mantle, new in V5."), "cards/mantle-cards.pdf"),
        (T("稱號牌：織根者、引花人", "Mantles: Rootweaver, Bloombringer"), T("2 張", "2"), T("同名 2 張", "the same 2"), KEEP,
         T("效果與召喚費用與 V5 相同。", "Same effect and summoning cost as V5."), ""),
        (T("幽靈牌（單人）", "Ghost cards (solo)"), T("12 張", "12"), T("12 張", "12"), KEEP,
         T("效果相同（V5 只是換了措辭）。", "Same effects (V5 only rewords them)."), ""),
        (T("牌背：託付卡、亡魂牌、稱號牌", "Backs: Commission, Soul, Mantle"), T("各 1 款", "1 each"), T("—", "—"), NEW,
         T("新印的牌要用 V5 牌背。亡魂牌與稱號牌都是面朝上挑選，沿用的 V3 牌背不會造成混淆。", "The new cards take the V5 backs. Soul cards and Mantles are chosen face up, so the kept V3 backs give nothing away."), T("card-backs-standard.pdf（3 頁）", "card-backs-standard.pdf (3 pages)")),
        (T("河岸板塊", "Bank tiles"), T("37 塊，40 × 40", "37, 40 × 40"), T("20 塊", "20"), AGAIN,
         T("V5 有 8 種板塊，霧面印符號；V3 霧面印河段，混用會洩漏資訊。", "V5 has 8 kinds with fog-side symbols; V3 shows the Reach on the fog side, so mixing them gives information away."), "tiles/bank-tiles-fronts.pdf, bank-tiles-fog-side.pdf"),
        (T("河流圖板", "River boards"), T("3 塊，256 × 124", "3, 256 × 124"), T("3 塊，266 × 244", "3, 266 × 244"), AGAIN,
         T("格數改為 15 格（第 0–14 格）、板塊格與霧標示都不同。", "Now 15 spaces (0–14); the tile slots and fog keys differ."), "boards/river-boards.pdf"),
        (T("命運織機", "Loom of the Fates"), "262 × 138", "285 × 210", AGAIN,
         T("結軌改為 0–10，加上傷疤格與反噬表。", "Knot tracks 0–10 with scar spaces and the backlash table."), "boards/loom-of-the-fates.pdf"),
        (T("渡帳", "The Ledger"), "262 × 190", "285 × 210", AGAIN,
         T("遺忘軌、裂痕軌、光軌與黑水區都改了。", "The forgotten, Fracture and Light tracks and the Black Water area changed."), "boards/the-ledger.pdf"),
        (T("迷霧渡口、供應區", "Misty Landing, Supply"), "206 × 204", T("無", "none"), SKIP,
         T("只是擺放用，牌與指示物可以直接放桌上；要印的話在完整版 part2 zip。", "They only hold things; cards and tokens can lie on the table. To print them, they are in the full part2 zip."), ""),
        (T("憶念之書", "Books of Remembrance"), T("5 本，240 × 282，12 頁", "5, 240 × 282, 12 pages"), T("5 本，210 × 280，8 頁", "5, 210 × 280, 8 pages"), AGAIN,
         T("路線全部改了，牌格改為迷你牌；不再需要透明相角。", "Every route changed and the slots take mini cards; no photo corners needed."), "books/*.pdf"),
        (T("指示物：傷疤 3、霧 2、遺忘 1", "Tokens: Scar 3, Fog 2, forgotten 1"), "Ø18", T("無", "none"), NEW,
         T("V5 新增的標記。", "Markers new in V5."), "tokens/tokens-18mm-*.pdf"),
        (T("指示物：黑水 1", "Token: Black Water 1"), "Ø18", T("6 個", "6"), NEW,
         T("V5 溫和難度要 7 個，V3 只有 6 個。", "Gentle needs 7; V3 has 6."), "tokens/tokens-18mm-*.pdf"),
        (T("指示物：根網特性 1", "Token: Root trait 1"), "Ø25", T("無", "none"), NEW,
         T("V5 新增（根深／花開蔓延）。", "New in V5 (Deep Roots / Spreading Bloom)."), "tokens/tokens-25mm-*.pdf"),
        (T("其他指示物", "Other tokens"), T("見第 3 節", "see section 3"), T("有", "yes"), KEEP,
         T("圖示與用法相同。", "Same icons and use."), ""),
        (T("規則書、單人模式規則書", "Rulebook, Solo Rulebook"), "210 × 280", T("規則書 32 頁", "Rulebook, 32 pages"), AGAIN,
         T("V5 規則。", "The V5 rules."), "rulebook/*.pdf"),
        (T("玩家輔助卡", "Player Aid"), "A5 × 4", T("4 組", "4 sets"), SKIP,
         T("V3 的內容已過時，但規則書與網頁版有同樣內容；要印的話在完整版 part4 zip。", "V3's is out of date, but the Rulebook and web table have the same content. To print it, it is in the full part4 zip."), ""),
        (T("盒子", "Box"), "300 × 300 × 75", T("相同尺寸", "same size"), KEEP,
         T("所有 V5 圖板都放得下；盒上的配件清單是 V3 的。", "Every V5 board fits; the contents list on it is V3's."), ""),
    ]


def print_list(L, c):
    """The print order, grouped the way a press works: by stock and process, then piece by piece. c: pages per file."""
    S = lambda zh, en: L(zh, en)
    f = lambda path, n=None: f"{path}（{n or c[path]} {S('頁', 'pp')}）" if L.code == "zh" else f"{path} ({n or c[path]} pp)"
    same = S("同正面頁序，一對一", "same order as the fronts, one to one")
    cards = lambda n: S(f"{n} 張", f"{n}")
    G = [
        ("A", S("卡牌・迷你", "Cards, mini"), "41 × 63", S("4/4 雙面", "4/4"), S("310 g 黑芯紙、霧面、圓角 2 mm", "310 gsm black-core, matte, 2 mm corners"), [
            ("A1", S("記憶牌", "Memory cards"), AGAIN, c["cards/memory-cards.pdf"], f("cards/memory-cards.pdf"), f("cards/card-backs-mini.pdf"), S("72 張共用同一款牌背", "all 72 share one back")),
            ("A2", S("迷霧牌", "Mist cards"), AGAIN, c["cards/mist-cards-fronts.pdf"], f("cards/mist-cards-fronts.pdf"), f("cards/mist-cards-backs.pdf"), S("每張背面不同，", "every back differs; ") + same),
            ("A3", S("命運之霧", "Fate Mist cards"), NEW, c["cards/fate-mist-event-side.pdf"], f("cards/fate-mist-event-side.pdf"), f("cards/fate-mist-condition-side.pdf"), S("雙面各不同（事件面／條件面），", "two different sides (event / condition); ") + same)]),
        ("B", S("卡牌・標準", "Cards, standard"), "63 × 88", S("4/4 雙面", "4/4"), S("310 g 黑芯紙、霧面、圓角 3 mm", "310 gsm black-core, matte, 3 mm corners"), [
            ("B1", S("託付卡", "Commission cards"), NEW, c["cards/commission-cards.pdf"], f("cards/commission-cards.pdf"), S("card-backs-standard.pdf 第 1 頁", "card-backs-standard.pdf p.1"), S("共用牌背", "one shared back")),
            ("B2", S("結局牌", "Ending cards"), AGAIN, c["cards/ending-cards-fronts.pdf"], f("cards/ending-cards-fronts.pdf"), f("cards/ending-cards-backs.pdf"), S("每張背面不同，", "every back differs; ") + same),
            ("B3", S("亡魂牌（最後火光的孩子、花環少女、無名渡河）", "Soul cards (the Child, the Garland Girl, Open Crossing)"), AGAIN, c["cards/soul-cards.pdf"], f("cards/soul-cards.pdf"), S("card-backs-standard.pdf 第 2 頁", "card-backs-standard.pdf p.2"), S("共用牌背", "one shared back")),
            ("B4", S("稱號牌（守魂者、破霧者：重印；收割者：新增）", "Mantles (Warden, Mistbreaker: reprint; Reaper: new)"), AGAIN, c["cards/mantle-cards.pdf"], f("cards/mantle-cards.pdf"), S("card-backs-standard.pdf 第 3 頁", "card-backs-standard.pdf p.3"),
             S("共用牌背；頁邊標籤寫的 p.4 是完整版頁碼，本 zip 為第 3 頁", "one shared back; the slug's p.4 is the full set's page, here it is p.3"))]),
        ("C", S("河岸板塊", "Bank tiles"), "40 × 40", S("4/4 雙面", "4/4"), S("2 mm 灰紙板、上膜、模切", "2 mm greyboard, laminated, die-cut"), [
            ("C1", S("河岸板塊", "Bank tiles"), AGAIN, c["tiles/bank-tiles-fronts.pdf"], f("tiles/bank-tiles-fronts.pdf"), f("tiles/bank-tiles-fog-side.pdf"), S("背面為霧面，", "the back is the fog side; ") + same + S("，不需鏡像", "; no mirroring"))]),
        ("D", S("指示物", "Tokens"), S("Ø18、Ø25", "Ø18, Ø25"), S("4/4 雙面", "4/4"), S("2 mm 灰紙板、上膜、模切", "2 mm greyboard, laminated, die-cut"), [
            ("D1", S("18 mm：傷疤 3、霧 2、遺忘 1、黑水 1", "18 mm: Scar 3, Fog 2, forgotten 1, Black Water 1"), NEW, c["tokens/tokens-18mm-fronts.pdf"], f("tokens/tokens-18mm-fronts.pdf"), f("tokens/tokens-18mm-backs.pdf"), S("圓形；頁面標籤註明者為圓角方形；", "round, or rounded square where the label says; ") + same),
            ("D2", S("25 mm：根網特性", "25 mm: Root trait"), NEW, c["tokens/tokens-25mm-fronts.pdf"], f("tokens/tokens-25mm-fronts.pdf"), f("tokens/tokens-25mm-backs.pdf"), S("兩面圖案不同（根深／花開蔓延）", "two different sides (Deep Roots / Spreading Bloom)"))]),
        ("E", S("圖板", "Boards"), S("見各列", "per row"), S("4/0 單面", "4/0"), S("裱 2 mm 灰紙板、霧膜、圓角 3 mm", "wrapped on 2 mm greyboard, matte laminate, 3 mm corners"), [
            ("E1", S("河流圖板（256 × 124）", "River boards (256 × 124)"), AGAIN, 3, f("boards/river-boards.pdf"), "—", S("一頁一塊", "one board per page")),
            ("E2", S("命運織機（262 × 138）", "Loom of the Fates (262 × 138)"), AGAIN, 1, f("boards/loom-of-the-fates.pdf"), "—", ""),
            ("E3", S("渡帳（262 × 190）", "The Ledger (262 × 190)"), AGAIN, 1, f("boards/the-ledger.pdf"), "—", "")]),
        ("F", S("憶念之書", "Books of Remembrance"), S("每頁 240 × 282", "page 240 × 282"), S("4/4", "4/4"), S("250 g 霧面銅版、騎馬釘、12 頁", "250 gsm matte art paper, saddle-stitched, 12 pages"), [
            (f"F{i + 1}", nm, AGAIN, 1, f(f"books/book-of-remembrance-{k}.pdf"), "—", S("依閱讀順序；第 4–5、6–7、8–9、10–11 頁為跨頁", "reading order; pp 4–5, 6–7, 8–9, 10–11 are spreads") if i == 0 else S("同 F1", "as F1"))
            for i, (k, nm) in enumerate([("child", S("最後火光的孩子", "the Child of the Last Flame")), ("garland", S("花環少女", "the Garland Girl")),
                                         ("king", S("渡船上的國王", "the King on the Barge")), ("bride", S("留在冥府的新娘", "the Bride Who Stayed Below")), ("open", S("無名渡河", "Open Crossing"))])]),
        ("G", S("規則書", "Rulebooks"), "210 × 280", S("4/4", "4/4"), S("128 g 霧面銅版、騎馬釘", "128 gsm matte art paper, saddle-stitched"), [
            ("G1", S("規則書", "Rulebook"), AGAIN, 1, f("rulebook/rulebook.pdf"), "—", S("依閱讀順序，已補到 4 的倍數", "reading order, padded to a multiple of 4")),
            ("G2", S("單人模式規則書", "Solo Rulebook"), AGAIN, 1, f("rulebook/solo-rulebook.pdf"), "—", S("同上", "as above"))]),
    ]
    unit = {"A": S("張", ""), "B": S("張", ""), "C": S("塊", ""), "D": S("個", ""), "E": S("塊", ""), "F": S("本", ""), "G": S("本", "")}
    V = {NEW: S("新增", "New"), AGAIN: S("重印", "Reprint")}
    COL = {NEW: "#d9ead3", AGAIN: "#f6e1c4"}
    h = ""
    for g, name, size, ink, stock, items in G:
        tot = sum(it[3] for it in items)
        h += (f'<tr class="g"><td>{g}</td><td colspan="6"><b>{E(name)}</b>　{E(size)} mm　｜　{E(ink)}　｜　{E(stock)}'
              f'　｜　{E(S("合計", "total"))} <b>{tot}</b> {E(unit[g])}</td></tr>')
        for code, nm, v, n, fr, bk, note in items:
            if code == "B4":
                v_html = f'<td style="background:{COL[AGAIN]};font-weight:700">{V[AGAIN]} 2<br>{V[NEW]} 1</td>'
            else:
                v_html = f'<td style="background:{COL[v]};font-weight:700">{V[v]}</td>'
            h += f'<tr><td>{code}</td><td>{E(nm)}</td>{v_html}<td class="n">{n}</td><td><code>{E(fr)}</code></td><td><code>{E(bk)}</code></td><td>{E(note)}</td></tr>'
    return h


def build(L, d, picked, out_pdf):
    """picked: [(path, pages)] in zip order."""
    z = L.code == "zh"
    S = lambda zh, en: L(zh, en)
    plan = {p["path"]: p for p in json.load(open(os.path.join(d, "press-plan.json")))["files"]}
    V = {NEW: S("新增", "New"), AGAIN: S("重印", "Reprint"), KEEP: S("沿用 V3.2", "Keep V3.2"), SKIP: S("可不印", "Optional")}
    COL = {NEW: "#d9ead3", AGAIN: "#f6e1c4", KEEP: "#e4e4e4", SKIP: "#e4e4e4"}
    tab = "".join(f'<tr><td>{E(a)}</td><td>{E(b)}</td><td>{E(c)}</td><td style="background:{COL[v]};font-weight:700;white-space:nowrap">{V[v]}</td><td>{E(w)}</td><td><code>{E(f)}</code></td></tr>'
                  for a, b, c, v, w, f in rows(L))
    cnt = dict(picked)
    mini = cnt["cards/memory-cards.pdf"] + cnt["cards/mist-cards-fronts.pdf"] + cnt["cards/fate-mist-event-side.pdf"]
    std = cnt["cards/commission-cards.pdf"] + cnt["cards/ending-cards-fronts.pdf"] + cnt["cards/soul-cards.pdf"] + cnt["cards/mantle-cards.pdf"]
    t18, t25 = cnt["tokens/tokens-18mm-fronts.pdf"], cnt["tokens/tokens-25mm-fronts.pdf"]
    tiles = cnt["tiles/bank-tiles-fronts.pdf"]
    html = f"""<!doctype html><html lang="{L.dir}"><head><meta charset="utf-8">{FONTS}<style>
@page {{ size: A4 landscape; margin: 13mm 13mm 14mm }}
body {{ font-family: {FAMILY[L.code]}; font-size: 10pt; line-height: {1.6 if z else 1.45}; color: #222 }}
h1 {{ font-family: {DISPLAY[L.code]}; color: #7a1f2b; font-size: 19pt; margin: 0 0 2mm }}
h2 {{ color: #7a1f2b; font-size: 13.5pt; border-bottom: .3mm solid #c9a45c; margin: 7mm 0 2.5mm; break-after: avoid }}
table {{ border-collapse: collapse; width: 100%; font-size: 8.4pt; line-height: 1.38; margin: 2mm 0 }}
th {{ background: #ece2cc; text-align: left; white-space: nowrap }} th, td {{ border: .25mm solid #cbbd9f; padding: 1mm 1.4mm; vertical-align: top }}
tr {{ break-inside: avoid }} code {{ font-size: .9em; word-break: break-all }} li {{ margin: .8mm 0 }}
.sum {{ display: flex; gap: 3mm; margin: 3mm 0 }} .sum div {{ flex: 1; background: #f6e1c4; border-radius: 2mm; padding: 2.5mm; text-align: center; font-size: 9pt }}
table.pl td.n {{ text-align: right; font-weight: 700; white-space: nowrap }} table.pl tr.g td {{ background: #3b2e1c; color: #f3e9d4; font-size: 9pt }}
.sum b {{ display: block; font-size: 17pt; color: #7a1f2b }}
</style></head><body>
<h1>{E(S("《彼岸花渡》已印 V3.2 的重印手冊", "Netherbloom — Reprint manual for printed V3.2 copies"))}</h1>
<p>{E(S("前提：V3.2 已經印好。這份手冊逐項比對 V3.2 與 V5 的印刷檔（尺寸、張數、卡面文字），列出 V5 因為內容不同而必須「新增」或「重印」的部分，以及可以沿用的 V3.2 配件。要印的檔案都在同一個 zip 裡，已轉 CMYK、含出血與裁切線，頁數已經抽好。",
 "Assumes V3.2 is already printed. This manual compares the V3.2 and V5 print files item by item (size, count, card text) and lists what of V5 must be printed new or again because its content differs, and which V3.2 components to keep. Every file to print is in this zip: CMYK, with bleed and crop marks, already cut down to the pages needed."))}</p>
<h2>1. {E(S("印製清單（只列要印的部分）", "Print list (only what to print)"))}</h2>
<p>{E(S("依印刷工序分組：同一組用同一種紙材與加工，可以併版印刷。「新增」是 V3.2 沒有的配件；「重印」是 V3.2 有、但內容或尺寸不同的配件。檔名後括號為本 zip 內該檔頁數；背面檔與正面同頁序、一頁一張，背面不需鏡像。",
 "Grouped by process: each group shares one stock and finish and can be ganged on one sheet. New: not in V3.2. Reprint: in V3.2 but its content or size differs. The page count of each file in this zip follows its name; back files share the fronts' page order, one piece per page, no mirroring."))}</p>
<table class="pl"><thead><tr><th>{E(S("編號", "No."))}</th><th>{E(S("品項", "Item"))}</th><th>{E(S("新增／重印", "New / reprint"))}</th><th>{E(S("數量", "Qty"))}</th><th>{E(S("正面檔案", "Front file"))}</th><th>{E(S("背面檔案", "Back file"))}</th><th>{E(S("備註", "Notes"))}</th></tr></thead><tbody>{print_list(L, cnt)}</tbody></table>
<h2>2. {E(S("檔案規格", "File specification"))}</h2>
<ul>
<li>{E(S("與完整版相同：成品尺寸加四邊 3 mm 出血；CMYK（Coated FOGRA39）；含裁切線、對位標記、色條與頁面標籤；設定 TrimBox 與 BleedBox。", "As the full set: finished size plus 3 mm bleed; CMYK (Coated FOGRA39); crop marks, registration targets, colour bar and page label; TrimBox and BleedBox set."))}</li>
<li>{E(S("只印部分頁的檔案，zip 裡已經只剩需要的頁：soul-cards 3 頁、mantle-cards 3 頁、card-backs-standard 3 頁（託付卡、亡魂牌、稱號牌背）、指示物正反各 18 mm 7 頁與 25 mm 1 頁。正反面 PDF 頁序相同，背面不需鏡像。",
 "Files printed only in part hold just those pages: soul-cards 3, mantle-cards 3, card-backs-standard 3 (Commission, Soul and Mantle backs), tokens 7 pages at 18 mm and 1 at 25 mm per side. Fronts and backs share page order; backs need no mirroring."))}</li>
<li>{E(S("材質與加工照完整版 MANUAL：迷你牌與標準牌 310 g 黑芯紙；圖板 2 mm 灰紙板裱褙；板塊與指示物 2 mm 灰紙板雙面模切；憶念之書 250 g 騎馬釘；規則書 128 g 騎馬釘。", "Stock as the full MANUAL: 310 gsm black-core cards; boards wrapped on 2 mm greyboard; tiles and tokens die-cut 2 mm greyboard, two sides; Books 250 gsm saddle-stitched; rulebooks 128 gsm saddle-stitched."))}</li>
</ul>
<h2>3. {E(S("印刷前檢查", "Pre-print checklist"))}</h2>
<ol>
<li>{E(S(f"張數：迷你牌 {mini}、標準牌 {std}、板塊 {tiles}、指示物 {t18 + t25}（18 mm {t18}、25 mm {t25}）、圖板 5、憶念之書 5 本、規則書 2 本。", f"Counts: {mini} mini cards, {std} standard cards, {tiles} tiles, {t18 + t25} tokens ({t18} at 18 mm, {t25} at 25 mm), 5 boards, 5 Books, 2 rulebooks."))}</li>
<li>{E(S("新印的指示物與板塊和 V3.2 的混在一起使用，請確認厚度（2 mm）與顏色接近。", "The new tokens are used alongside V3.2's: check the thickness (2 mm) and colour match."))}</li>
<li>{E(S("插畫：花田、寒霜、餘燼、迴聲之岩（板塊）與收割者（稱號牌）目前是已核可的概念草圖。", "Art: Flower Field, Frost, Ember, Echo Rock (tiles) and the Reaper (Mantle) are the approved concept sketches for now."))}</li>
</ol>
<h2 style="break-before:page">{E(S("附錄 A　V3.2 與 V5 逐項對照（給遊戲擁有者參考）", "Appendix A — V3.2 and V5 item by item (for the owner)"))}</h2>
<p>{E(S("新增：V3.2 沒有這個配件。重印：V3.2 有，但內容或尺寸不同，不能沿用。沿用：V3.2 的印刷內容與 V5 相同。可不印：省成本時可以不印。",
 "New: V3.2 has no such component. Reprint: V3.2 has it, but its content or size differs. Keep: V3.2's print matches V5. Optional: can be skipped to save cost."))}</p>
<table><tr><th>{E(S("V5 配件", "V5 component"))}</th><th>{E(S("V5 規格", "V5"))}</th><th>V3.2</th><th>{E(S("判定", "Verdict"))}</th><th>{E(S("原因", "Why"))}</th><th>{E(S("檔案", "File"))}</th></tr>{tab}</table>
<h2>{E(S("附錄 B　V3.2 不再使用的配件", "Appendix B — V3.2 components no longer used"))}</h2>
<p>{E(S("記憶牌 72、迷霧牌 42、信物牌 36、結局牌 19、河岸板塊 20、河流圖板 3、命運織機、渡帳、憶念之書 5 本與透明相角、規則書、玩家輔助卡；亡魂牌（孩子、花環少女、無名渡河）與稱號牌（守魂者、破霧者）各換成新印的版本。",
 "Memory 72, Mist 42, Keepsakes 36, endings 19, bank tiles 20, the 3 river boards, the Loom, the Ledger, the 5 Books and their photo corners, the Rulebook and the Player Aid; the Soul cards (Child, Garland Girl, Open Crossing) and Mantles (Warden, Mistbreaker) are replaced by the new prints."))}</p>
<h2>{E(S("附錄 C　沿用的 V3.2 配件", "Appendix C — Kept from V3.2"))}</h2>
<ul>
<li>{E(S("幽靈牌 12 張與牌背；稱號牌織根者、引花人；亡魂牌渡船上的國王、留在冥府的新娘。", "The 12 Ghost cards and their back; the Rootweaver and Bloombringer Mantles; the King and the Bride Soul cards."))}</li>
<li>{E(S("指示物：根／花 24、怨念 8、黑水 6（再加新印的 1 個）、迴響、船槳、亡魂／幽靈、破浪 4、堅守、護盾、認命。", "Tokens: Root/Bloom 24, Shade 8, Black Water 6 (plus the 1 new), Echo, Oar, Soul/Ghost, Push Through 4, Hold Fast, Shield, Resignation."))}</li>
<li>{E(S("V3 的「結」15 個取 3 個當三條結軌的結標記（每條軌各放 1 個，不需區分）；「光」12 個取 1 個當光標記；「裂痕」3 個取 1 個當裂痕標記。其餘收回盒中。", "Use 3 of V3's 15 Knot tokens as the knot markers (one per track, so they need not differ), 1 of the 12 Light tokens as the Light marker and 1 of the 3 Fracture tokens as the Fracture marker. Box the rest."))}</li>
<li>{E(S("V3 的迴響標記是 18 mm，放在 V5 織機的迴響圈裡一樣可用。", "V3's Echo marker is 18 mm; it works in the V5 Loom's Echo circles."))}</li>
<li>{E(S("盒子（尺寸相同）。", "The box (same size)."))}</li>
</ul>
</body></html>"""
    htm = os.path.join(d, "html", "REPRINT-MANUAL.html")
    open(htm, "w", encoding="utf-8").write(html)
    jobs = os.path.join(d, "reprint-manual-job.json")
    json.dump([{"html": htm, "pdf": out_pdf}], open(jobs, "w"))
    subprocess.run(["node", os.path.join(HERE, "render.cjs"), jobs], check=True)
