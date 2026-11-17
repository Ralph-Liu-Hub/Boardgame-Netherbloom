# The production manual (MANUAL.pdf, A4) for the factory, in the edition's language, written from the same print plan
# as the files, so its counts and names always match them.
#   python3 print/v5/manual.py   (after build.py)
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import OUT, HERE, Lang, FONTS, FAMILY, DISPLAY, E
import pymupdf


def bom(L):
    T = lambda zh, en: L(zh, en)
    return [
        (T("記憶牌", "Memory cards"), 72, "41 × 63", T("310 g 黑芯紙、霧面、圓角 2 mm", "310 gsm black-core, matte, 2 mm corners"), "cards/memory-cards.pdf + card-backs-mini.pdf p.1"),
        (T("迷霧牌", "Mist cards"), 56, "41 × 63", T("同上；每張背面不同", "as above; every back differs"), "cards/mist-cards-fronts.pdf + mist-cards-backs.pdf"),
        (T("命運之霧", "Fate Mist cards"), 60, "41 × 63", T("同上；雙面各不同", "as above; both sides differ"), "cards/fate-mist-event-side.pdf + fate-mist-condition-side.pdf"),
        (T("託付卡", "Commission cards"), 40, "63 × 88", T("310 g 黑芯紙、霧面、圓角 3 mm", "310 gsm black-core, matte, 3 mm corners"), "cards/commission-cards.pdf + card-backs-standard.pdf p.1"),
        (T("結局牌", "Ending cards"), 20, "63 × 88", T("同上；每張背面不同", "as above; every back differs"), "cards/ending-cards-fronts.pdf + ending-cards-backs.pdf"),
        (T("亡魂牌", "Soul cards"), 5, "63 × 88", T("同上", "as above"), "cards/soul-cards.pdf + card-backs-standard.pdf p.2"),
        (T("稱號牌", "Mantle cards"), 5, "63 × 88", T("同上；背面共用", "as above; one shared back"), "cards/mantle-cards.pdf + card-backs-standard.pdf p.4"),
        (T("幽靈牌（單人）", "Ghost cards (solo)"), 12, "63 × 88", T("同上", "as above"), "cards/ghost-cards.pdf + card-backs-standard.pdf p.3"),
        (T("河流圖板", "River boards"), 3, "256 × 124", T("2 mm 灰紙板裱褙、霧面、單面、圓角 3 mm", "2 mm greyboard, wrapped, matte, one side, 3 mm corners"), "boards/river-boards.pdf"),
        (T("命運織機", "Loom of the Fates"), 1, "262 × 138", T("同上", "as above"), "boards/loom-of-the-fates.pdf"),
        (T("渡帳", "The Ledger"), 1, "262 × 190", T("同上", "as above"), "boards/the-ledger.pdf"),
        (T("迷霧渡口", "Misty Landing"), 1, "206 × 204", T("同上", "as above"), "boards/misty-landing.pdf"),
        (T("供應區", "Supply"), 1, "206 × 204", T("同上", "as above"), "boards/supply.pdf"),
        (T("憶念之書", "Books of Remembrance"), 5, T("每頁 240 × 282，12 頁", "page 240 × 282, 12 pages"), T("內頁 250 g 霧面銅版、騎馬釘", "250 gsm matte art paper, saddle-stitched"), "books/book-of-remembrance-*.pdf"),
        (T("河岸板塊", "Bank tiles"), 37, "40 × 40", T("2 mm 灰紙板、雙面、模切", "2 mm greyboard, two sides, die-cut"), "tiles/bank-tiles-fronts.pdf + bank-tiles-fog-side.pdf"),
        (T("指示物 18 mm", "Tokens 18 mm"), 50, "Ø18", T("2 mm 灰紙板、雙面、模切", "2 mm greyboard, two sides, die-cut"), "tokens/tokens-18mm-fronts.pdf + backs"),
        (T("指示物 25 mm", "Tokens 25 mm"), 11, "Ø25", T("同上", "as above"), "tokens/tokens-25mm-fronts.pdf + backs"),
        (T("規則書", "Rulebook"), 1, "210 × 280", T("128 g 霧面銅版、騎馬釘", "128 gsm matte art paper, saddle-stitched"), "rulebook/rulebook.pdf"),
        (T("單人模式規則書", "Solo Rulebook"), 1, "210 × 280", T("同上", "as above"), "rulebook/solo-rulebook.pdf"),
        (T("玩家輔助卡", "Player Aid"), 4, "A5 148 × 210", T("300 g 卡紙、雙面", "300 gsm card, two sides"), "rulebook/player-aid.pdf"),
        (T("盒子（天地蓋）", "Box (lid and base)"), 1, T("盒蓋 300 × 300 × 75；盒底 296 × 296 × 73", "lid 300 × 300 × 75; base 296 × 296 × 73"), T("灰紙板裱 157 g 銅版、霧面上光、反摺 15 mm", "greyboard wrapped in 157 gsm art paper, matte laminate, 15 mm turn-ins"), "box/box-lid-wrap.pdf, box-base-wrap.pdf, die lines"),
    ]


def page_count(d, f):
    try:
        return len(pymupdf.open(os.path.join(d, f)))
    except Exception:
        return "—"


def manual(L):
    d = os.path.join(OUT, L.dir)
    plan = json.load(open(os.path.join(d, "press-plan.json")))["files"]
    z = L.code == "zh"
    rows = "".join(f"<tr><td>{E(a)}</td><td>{b}</td><td>{E(c)}</td><td>{E(s)}</td><td><code>{E(f)}</code></td></tr>" for a, b, c, s, f in bom(L))
    files = "".join(f"<tr><td><code>{E(p['path'])}</code></td><td>{page_count(d, p['path'])}</td><td>{p['trim'][0]} × {p['trim'][1]}</td><td>{E(p['sides'])}</td></tr>" for p in sorted(plan, key=lambda p: p["path"]))
    S = lambda zh, en: L(zh, en)
    html = f"""<!doctype html><html lang="{L.dir}"><head><meta charset="utf-8">{FONTS}<style>
@page {{ size: A4; margin: 16mm 15mm 18mm }}
body {{ font-family: {FAMILY[L.code]}; font-size: 10pt; line-height: {1.6 if z else 1.45}; color: #222 }}
h1 {{ font-family: {DISPLAY[L.code]}; color: #7a1f2b; font-size: 20pt; margin: 0 0 2mm }}
h2 {{ color: #7a1f2b; font-size: 13.5pt; border-bottom: .3mm solid #c9a45c; margin: 7mm 0 2.5mm; break-after: avoid }}
table {{ border-collapse: collapse; width: 100%; font-size: 8.6pt; line-height: 1.35; margin: 2mm 0 }}
th {{ background: #ece2cc; text-align: left }} th, td {{ border: .25mm solid #cbbd9f; padding: 1mm 1.5mm; vertical-align: top }}
tr {{ break-inside: avoid }} code {{ font-size: .92em; word-break: break-all }} li {{ margin: .8mm 0 }}
</style></head><body>
<h1>{E(S("《彼岸花渡》Netherbloom — 印刷生產手冊", "Netherbloom — Production manual"))}</h1>
<p>{E(S("這份手冊與印刷檔一起由同一份印刷計畫產生，張數、尺寸與檔名都與檔案一致。版本：正體中文。", "This manual is generated with the files from the same print plan, so its counts, sizes and file names match them. Edition: English."))}</p>
<h2>1. {E(S("配件總表", "Bill of materials"))}</h2>
<table><tr><th>{E(S("配件", "Component"))}</th><th>{E(S("數量", "Qty"))}</th><th>{E(S("成品尺寸（mm）", "Finished size (mm)"))}</th><th>{E(S("材質與加工", "Stock and finish"))}</th><th>{E(S("檔案", "File"))}</th></tr>{rows}</table>
<h2>2. {E(S("檔案規格", "File specification"))}</h2>
<ul>
<li>{E(S("每一頁都是成品尺寸加四邊各 3 mm 出血；文字與重要圖案都在裁切線內 2.5 mm 以上。", "Every page is the finished size plus 3 mm bleed on each side; text and key art stay at least 2.5 mm inside the trim."))}</li>
<li>{E(S("已轉為 CMYK（Coated FOGRA39，總墨量 330%），每頁外加 10 mm 出血外框，含裁切線、出血線、對位標記、色條與頁面標籤，並設定 TrimBox 與 BleedBox。請以貴廠的色彩設定打樣確認。", "Converted to CMYK (Coated FOGRA39, 330% total ink), with a 10 mm slug holding crop marks, bleed marks, registration targets, a colour bar and a page label; TrimBox and BleedBox are set. Please send a proof with your colour settings."))}</li>
<li>{E(S("卡牌：一頁一張，依牌組順序。共用牌背的牌組，牌背在 card-backs-mini.pdf 或 card-backs-standard.pdf；牌背各不相同的牌組（迷霧牌、命運之霧、結局牌）另有一份背面 PDF，第 n 頁就是正面第 n 頁的背面。", "Cards: one per page, in deck order. Decks with one shared back have it in card-backs-mini.pdf or card-backs-standard.pdf; decks whose backs differ (Mist, Fate Mist, ending) have a backs PDF whose page n is the back of front page n."))}</li>
<li>{E(S("河岸板塊與指示物：正反面 PDF 頁序相同，背面不需鏡像（一頁一個）。指示物多為圓形，少數為圓角方形（見頁面標籤）。", "Bank tiles and tokens: fronts and backs share page order; backs need no mirroring (one piece per page). Most tokens are round, a few are rounded squares (see the page labels)."))}</li>
<li>{E(S("憶念之書：12 頁，依閱讀順序；第 4–5、6–7、8–9、10–11 頁是跨頁，圖案跨過裝訂線，裝訂線兩側 10 mm 內沒有牌格與文字。", "Books of Remembrance: 12 pages in reading order; pages 4–5, 6–7, 8–9 and 10–11 are spreads whose art runs across the fold; nothing important lies within 10 mm of the fold."))}</li>
<li>{E(S("規則書與單人規則書：騎馬釘，頁數已補到 4 的倍數（最後為筆記頁）。玩家輔助卡：A5 雙面。", "Rulebook and Solo Rulebook: saddle-stitched, padded with Notes pages to a multiple of 4. Player Aid: A5, two sides."))}</li>
<li>{E(S("盒子：天地蓋，盒蓋 300 × 300 × 75、盒底 296 × 296 × 73；包紙為攤平的一整張（面＋四側＋反摺），刀模圖另附，不需印刷。", "Box: lid 300 × 300 × 75, base 296 × 296 × 73; each wrap is one flat sheet (face, four walls, turn-ins), with its die line in a separate file that is not printed."))}</li>
</ul>
<h2>3. {E(S("檔案清單", "File list"))}</h2>
<table><tr><th>{E(S("檔案", "File"))}</th><th>{E(S("頁數", "Pages"))}</th><th>{E(S("成品（mm）", "Trim (mm)"))}</th><th>{E(S("印刷說明", "How to print"))}</th></tr>{files}</table>
<h2>4. {E(S("尚待替換的插畫", "Paintings still to come"))}</h2>
<p>{E(S("下列插畫目前是已核可的概念草圖，正式繪製完成後替換同名檔案（print/v5/art/）即可重新產生：花田、寒霜、餘燼、迴聲之岩（河岸板塊），以及收割者（稱號牌與供應區）。其餘插畫皆為既有原畫。", "These paintings are the approved concept sketches for now; when the final paintings are done, replace the files of the same name in print/v5/art/ and rebuild: Flower Field, Frost, Ember and Echo Rock (bank tiles) and the Reaper (Mantle card and Supply). All other art is finished."))}</p>
<p>{E(S("部分章節插畫的原始解析度約 1456 px 寬，用在 480 mm 的書頁跨頁時低於 300 dpi；畫面加了深色遮罩，打樣時請確認效果。", "Some chapter paintings are about 1456 px wide, below 300 dpi across a 480 mm Book spread; they sit under a dark shade, so please check them on the proof."))}</p>
<h2>5. {E(S("印刷前檢查", "Pre-print checklist"))}</h2>
<ol>
<li>{E(S("張數：迷你牌 188、標準牌 82、板塊 37、指示物 61。", "Counts: 188 mini cards, 82 standard cards, 37 tiles, 61 tokens."))}</li>
<li>{E(S("所有配件平放不超過 285 × 285 mm（盒底內徑 296 mm）。", "Every flat component lies within 285 × 285 mm (the base is 296 mm inside)."))}</li>
<li>{E(S("正反面套準：板塊與指示物以中心對位。", "Front and back registration: tiles and tokens are centred."))}</li>
<li>{E(S("請先寄送數位樣與實體樣（卡牌、一塊圖板、一本憶念之書）確認顏色與裁切。", "Please send a digital proof and a physical proof (cards, one board, one Book) to check colour and cutting."))}</li>
</ol>
</body></html>"""
    htm = os.path.join(d, "html", "MANUAL.html")
    open(htm, "w", encoding="utf-8").write(html)
    jobs = os.path.join(d, "manual-job.json")
    json.dump([{"html": htm, "pdf": os.path.join(d, "MANUAL.pdf")}], open(jobs, "w"))
    subprocess.run(["node", os.path.join(HERE, "render.cjs"), jobs], check=True)


if __name__ == "__main__":
    for code in sys.argv[1:] or ["zh", "en"]:
        manual(Lang(code))
