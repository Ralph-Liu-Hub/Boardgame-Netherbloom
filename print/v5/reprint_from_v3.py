# The least a V3.2 owner must print to play V5: the press-ready V5 pages that V3.2 has no usable counterpart for,
# pulled out of the full V5 files into one zip per edition, with a list of what to keep from V3.2.
#   python3 print/v5/reprint_from_v3.py      (after build.py)  ->  Downloads/netherbloom-V5-reprint-from-V3.2-<lang>.zip
#
# Kept from V3.2 (their printed text is the same as V5's, or they do the same job):
#   Ghost cards ×12 and their back; the Rootweaver and Bloombringer Mantles; the King and the Bride Soul cards;
#   tokens: Root/Bloom ×24, Shade ×8, Black Water ×6, Echo, Oar, Soul/Ghost, Push Through ×4, Hold Fast, Shield,
#   Resignation; 3 of the 15 Knot tokens as the knot markers, 1 of the 12 Light tokens as the Light marker, 1 of the
#   3 Fracture tokens as the Fracture marker; the box (same size; every V5 board fits).
import io, json, os, sys, zipfile
import pymupdf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import OUT, ROOT, Lang
import reprint_manual

ALL = "all"
PICK = [  # (file, pages: ALL or 1-based page numbers or a label test)
    ("cards/memory-cards.pdf", ALL), ("cards/card-backs-mini.pdf", ALL),
    ("cards/mist-cards-fronts.pdf", ALL), ("cards/mist-cards-backs.pdf", ALL),
    ("cards/fate-mist-event-side.pdf", ALL), ("cards/fate-mist-condition-side.pdf", ALL),
    ("cards/commission-cards.pdf", ALL), ("cards/ending-cards-fronts.pdf", ALL), ("cards/ending-cards-backs.pdf", ALL),
    ("cards/soul-cards.pdf", [1, 2, 5]),                 # the Child, the Garland Girl, Open Crossing (special rules changed)
    ("cards/mantle-cards.pdf", [2, 4, 5]),               # Spirit Warden, Mistbreaker (changed), Reaper (new)
    ("cards/card-backs-standard.pdf", [1, 2, 4]),        # Commission, Soul and Mantle backs
    ("tiles/bank-tiles-fronts.pdf", ALL), ("tiles/bank-tiles-fog-side.pdf", ALL),
    ("tokens/tokens-18mm-fronts.pdf", lambda l: l.startswith(("scar", "fog", "forgotten", "black-water 1/"))),
    ("tokens/tokens-18mm-backs.pdf", lambda l: l.startswith(("scar", "fog", "forgotten", "black-water 1/"))),
    ("tokens/tokens-25mm-fronts.pdf", lambda l: l.startswith("root-trait")),
    ("tokens/tokens-25mm-backs.pdf", lambda l: l.startswith("root-trait")),
    ("boards/river-boards.pdf", ALL), ("boards/loom-of-the-fates.pdf", ALL), ("boards/the-ledger.pdf", ALL),
    ("books/book-of-remembrance-child.pdf", ALL), ("books/book-of-remembrance-garland.pdf", ALL), ("books/book-of-remembrance-king.pdf", ALL),
    ("books/book-of-remembrance-bride.pdf", ALL), ("books/book-of-remembrance-open.pdf", ALL),
    ("rulebook/rulebook.pdf", ALL), ("rulebook/solo-rulebook.pdf", ALL),
]

README = {
"zh": """《彼岸花渡》V5：已經印好 V3.2 時，最少要印的部分
================================================

這個 zip 只放 V3.2 無法沿用、玩 V5 一定要新增或重印的檔案（已轉 CMYK、含出血與裁切線）。\nMANUAL.pdf 是重印手冊：逐項對照 V3.2 與 V5、判定原因、檔案規格與清單。
其餘配件沿用你手上的 V3.2，或直接放桌上不必印。

一、要印的（本 zip）
- 卡牌（迷你 41 × 63）：記憶牌 72（尺寸與效果都改了，必須放進新的憶念之書）、迷霧牌 56、命運之霧 60；記憶牌背。
- 卡牌（標準 63 × 88）：託付卡 40、結局牌 20（V5 新內容）；亡魂牌 3 張（最後火光的孩子、花環少女、無名渡河：特色規則改了）；
  稱號牌 3 張（守魂者、破霧者：效果改了；收割者：新的）；託付卡背、亡魂牌背、稱號牌背。
  只印部分頁的檔案，頁數已經抽好：soul-cards 3 頁、mantle-cards 3 頁、card-backs-standard 3 頁。
- 河岸板塊 37（V5 有 8 種、霧面印符號，V3 的 20 塊霧面印河段，混用會洩漏資訊）。
- 指示物 8 個：傷疤標記 3、霧標記 2、遺忘標記 1、黑水 1（V3 只有 6 個，溫和要 7 個）、根網特性標記 1（25 mm）。
- 圖板：河流圖板 3 塊、命運織機、渡帳（V3 的格數與軌道不同，無法沿用）。
- 憶念之書 5 本（路線全部改了）。
- 規則書、單人模式規則書。

二、沿用 V3.2
- 幽靈牌 12 張與牌背（文字與 V5 相同）。
- 稱號牌：織根者、引花人（效果與召喚費用與 V5 相同）。
- 亡魂牌：渡船上的國王、留在冥府的新娘（特色規則與 V5 相同）。
- 指示物：根／花 24、怨念 8、黑水 6、迴響、船槳、亡魂／幽靈、破浪 4、堅守、護盾、認命。
  V3 的「結」15 個取 3 個當結標記；「光」12 個取 1 個當光標記；「裂痕」3 個取 1 個當裂痕標記。
- 盒子（尺寸相同，V5 所有圖板都放得下；盒上的配件清單是 V3 的）。

三、可以不印（省成本時）
- 迷霧渡口、供應區兩塊圖板：只是擺放用，牌與指示物可以直接放在桌上。
- 玩家輔助卡：規則書與網頁版都有同樣內容。

四、V3.2 不再使用
- V3 的記憶牌、迷霧牌、信物牌、結局牌、河岸板塊、河流圖板、命運織機、渡帳、憶念之書、規則書與玩家輔助卡。

插畫說明：花田、寒霜、餘燼、迴聲之岩（板塊）與收割者（稱號牌）目前是已核可的概念草圖。
""",
"en": """Netherbloom V5: the least to print if you already own V3.2
=========================================================

This zip holds only the files V3.2 cannot replace: what you must print new or again to play V5 (CMYK, bleed and crop
marks). MANUAL.pdf is the reprint manual: V3.2 and V5 item by item, the reasons, the file spec and list. Everything else comes from your V3.2 copy or can lie on the table unprinted.

1. Print (this zip)
- Mini cards (41 x 63): Memory 72 (new size and effects; they go into the new Books), Mist 56, Fate Mist 60; the Memory back.
- Standard cards (63 x 88): Commission 40, ending 20 (new in V5); 3 Soul cards (the Child of the Last Flame, the Garland
  Girl, Open Crossing: their special rules changed); 3 Mantles (Spirit Warden and Mistbreaker changed, the Reaper is new);
  the Commission, Soul and Mantle backs. Files printed only in part already hold just those pages: soul-cards 3 pages,
  mantle-cards 3 pages, card-backs-standard 3 pages.
- Bank tiles 37 (V5 has 8 kinds and fog-side symbols; the 20 V3 tiles show their Reach on the fog side, and mixing them
  would give information away).
- 8 tokens: Scar 3, Fog 2, forgotten 1, Black Water 1 (V3 has 6; Gentle needs 7), Root trait 1 (25 mm).
- Boards: the 3 river boards, the Loom of the Fates, the Ledger (V3's spaces and tracks differ).
- The 5 Books of Remembrance (every route changed).
- The Rulebook and the Solo Rulebook.

2. Keep from V3.2
- The 12 Ghost cards and their back (same text as V5).
- Mantles: Rootweaver and Bloombringer (same effect and summoning cost as V5).
- Soul cards: the King on the Barge and the Bride Who Stayed Below (same special rule as V5).
- Tokens: Root/Bloom 24, Shade 8, Black Water 6, Echo, Oar, Soul/Ghost, Push Through 4, Hold Fast, Shield, Resignation.
  Use 3 of the 15 Knot tokens as the knot markers, 1 of the 12 Light tokens as the Light marker and 1 of the 3 Fracture
  tokens as the Fracture marker.
- The box (same size; every V5 board fits; the contents list on it is V3's).

3. Skip to save cost
- The Misty Landing and Supply boards: they only hold things; the cards and tokens can lie on the table.
- The Player Aid: the Rulebook and the web table have the same content.

4. No longer used from V3.2
- V3's Memory, Mist, Keepsake and ending cards, bank tiles, river board, Loom, Ledger, Books, Rulebook and Player Aid.

Art: Flower Field, Frost, Ember, Echo Rock (tiles) and the Reaper (Mantle) are the approved concept sketches for now.
""",
}


def labels_of(plan, path):
    for f in plan["files"]:
        if f["path"] == path:
            return f.get("labels") or []
    return []


def main():
    for lang, code in (("zh-TW", "zh"), ("en", "en")):
        d = os.path.join(OUT, lang)
        plan = json.load(open(os.path.join(d, "press-plan.json")))
        z = os.path.join(ROOT, "Downloads", f"netherbloom-V5-reprint-from-V3.2-{lang}.zip")
        root = f"netherbloom-reprint-{lang}"
        counts = {}
        parts = {}
        for path, pages in PICK:
            src = pymupdf.open(os.path.join(d, path))
            if pages == ALL:
                parts[path] = None
                counts[path] = len(src)
                continue
            if callable(pages):
                labs = labels_of(plan, path)
                keep = [i for i, l in enumerate(labs) if pages(l)]
            else:
                keep = [p - 1 for p in pages]
            out = pymupdf.open()
            for i in keep:
                out.insert_pdf(src, from_page=i, to_page=i)
            out.set_metadata(src.metadata)
            buf = io.BytesIO(); out.save(buf, garbage=3, deflate=True)
            parts[path] = buf.getvalue()
            counts[path] = len(keep)
        man = os.path.join(d, "REPRINT-MANUAL.pdf")
        reprint_manual.build(Lang(code), d, list(counts.items()), man)
        with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            zf.writestr(f"{root}/README.txt", README[code])
            zf.write(man, f"{root}/MANUAL.pdf")
            for path, data in parts.items():
                if data is None:
                    zf.write(os.path.join(d, path), f"{root}/{path}")
                else:
                    zf.writestr(f"{root}/{path}", data)
        assert os.path.getsize(z) < 100 * 1000 * 1000
        print(os.path.basename(z), round(os.path.getsize(z) / 1e6, 1), "MB")
        for k, v in counts.items():
            print(f"   {v:3d}  {k}")


if __name__ == "__main__":
    main()
