# The Rulebook's set-up figure: the real table after set-up (2 players, The Child of the Last Flame, Gentle), drawn from
# the same boards, cards, tiles and tokens as the print files at true size, with the number of each set-up step where it
# lands. Saved as out/<lang>/setup-table.jpg; rulebooks.py puts it on its own page with the legend after it.
import json, os, random, subprocess
from common import *
import boards, cards, tiles, tokens, books

W, H = 955, 815          # the table, mm
SOUL = "child"


def piece(x, y, w, h, inner, radius=0, shadow=True):
    """A printed piece: its page (with bleed) cropped to the trim and laid on the table."""
    sh = "box-shadow:0 1.2mm 3mm rgba(0,0,0,.75);" if shadow else ""
    return (f'<div class="a" style="{at(x, y, w, h)}overflow:hidden;border-radius:{mm(radius)};{sh}">'
            f'<div class="a" style="{at(-BLEED, -BLEED, w + 2 * BLEED, h + 2 * BLEED)}">{inner}</div></div>')


def token(x, y, d, icon, label_round=True):
    return piece(x - d / 2, y - d / 2, d, d, tokens.face(Lang("zh"), icon, d), d / 2 if tokens.shape(icon) == "round" else d * .19)


def stack(x, y, w, h, inner, n=3, radius=2.5):
    return "".join(piece(x + i * .8, y - i * .8, w, h, inner, radius) for i in range(n))


def badge(n, x, y):
    return (f'<div class="a" style="{at(x - 11, y - 11, 22, 22)}border-radius:50%;background:#e9c46a;border:1.4mm solid #1a1410;'
            f'box-shadow:0 0 0 .8mm #e9c46a,0 1mm 3mm rgba(0,0,0,.8);display:grid;place-items:center;font:700 13mm/1 Georgia,serif;color:#1a1410;z-index:5">{n}</div>')


def label(x, y, t, w=120, align="left"):
    return f'<div class="a" style="{at(x, y, w)}font-size:{mm(6)};color:#e6d3a3;text-align:{align};text-shadow:0 .4mm 1mm #000;z-index:4">{E(t)}</div>'


def table(L):
    random.seed(7)
    D = DATA
    h = ""
    # ---- boards
    LX, LY = 0, 0
    w, hh, p = boards.landing(L); h += piece(LX, LY, w, hh, p, 3)
    w, hh, p = boards.loom(L); h += piece(0, 224, w, hh, p, 3)
    w, hh, p = boards.ledger(L); h += piece(0, 382, w, hh, p, 3)
    w, hh, p = boards.supply(L); h += piece(0, 592, w, hh, p, 3)
    RX, RY = 432, 302
    for r in range(3):
        inner = boards.river(L, r)
        for k in ("wm", "glow0", "glow1", "glow2", "bl", "wt"):
            inner = inner.replace(f'id="{k}"', f'id="{k}r{r}"').replace(f'url(#{k})', f'url(#{k}r{r})')
        h += piece(RX, RY + r * boards.RH, boards.RW, boards.RH,
                   board_page(boards.RW, boards.RH, inner, art("scene-river", 3000), "linear-gradient(rgba(14,12,17,.45),rgba(14,12,17,.62))", f"center {r * 50}%"), 2)
    sp = books.chapter_spread(L, SOUL, 0)[0][1]
    h += piece(432, 0, books.W, books.PH, sp, 2)
    h += f'<div class="a" style="{at(432 + books.PW - .4, 0, .8, books.PH)}background:rgba(0,0,0,.6)"></div>'
    # play area (an empty stretch of table)
    h += (f'<div class="a" style="{at(712, 302, 230, 150)}border:.8mm dashed rgba(230,211,163,.45);border-radius:4mm"></div>'
          + label(712, 360, L("出牌區（桌面空位）", "Play area (empty table)"), 230, "center"))

    # ---- 1 / 2 / 3: tiles fog side up, the first Blooms and the soul
    pools = []
    for r, pool in enumerate(D["tiles"]["pools"]):
        bag = [k for k, n in pool["pool"].items() for _ in range(n)]
        random.shuffle(bag)
        need = {0: 6, 1: 7, 2: 9}[r]
        drawn = bag[:need] + (["grave"] if r else [])
        random.shuffle(drawn)
        pools.append(drawn)
    spaces = {0: [2, 3, 4], 1: [5, 6, 7, 8], 2: [9, 10, 11, 12, 13]}
    for r in range(3):
        it = iter(pools[r])
        for n in spaces[r]:
            row = next(i for i, rw in enumerate(boards.ROWS) if n in rw)
            col = boards.ROWS[row].index(n)
            x = RX + boards.C0 + col * boards.P + 2
            for wy in (6, 78):
                kind = next(it)
                h += piece(x, RY + row * boards.RH + wy, 40, 40, tiles.back(L, kind, ["Ⅰ", "Ⅱ", "Ⅲ"][r] if kind != "grave" else "grave"), 1.5)
    x1 = RX + boards.C0 + 1 * boards.P + 23
    h += token(x1, RY + 26, 18, "bloom") + token(x1, RY + 98, 18, "bloom")
    x0 = RX + boards.C0 + 22
    h += token(x0, RY + 62, 25, "soul")
    # spare tiles, face up, beside the river
    for i, k in enumerate(["field", "field", "fertile", "fertile", "spring", "spring"]):
        h += piece(282 + (i % 3) * 44, 640 + (i // 3) * 44, 40, 40, tiles.front(L, k, "spare"), 1.5)
    h += label(282, 728, L("備用板塊（面朝上）", "Spare tiles (face up)"), 140)

    # ---- 4: the Soul card; 9: the two Fate Mist cards of chapter 1, condition side up
    h += piece(LX + 8.5, LY + 21, 63, 88, cards.soul_card(L, SOUL), 3)
    f1 = [f for f in D["souls"][SOUL]["fates"] if f["chapter"] == 0]
    riv = next(f for f in f1 if f["zh"]["river"]); bk = next(f for f in f1 if not f["zh"]["river"])
    h += piece(LX + 94.5, LY + 21, 41, 63, cards.fate_back(L, SOUL, riv), 2)
    h += piece(LX + 154.5, LY + 21, 41, 63, cards.fate_back(L, SOUL, bk), 2)
    # ---- 6: the Pale Mist deck in the Mist well, the Mist ahead turned up; the other decks beside
    pale = [m for m in D["mist"] if m["deck"] == 0]
    h += stack(LX + 16.5, LY + 131.5, 41, 63, cards.mist_back(L, pale[3]), 4, 2)
    h += piece(LX + 82.5, LY + 131.5, 41, 63, cards.mist(L, pale[5]), 2)
    thick = [m for m in D["mist"] if m["deck"] == 1]; deep = [m for m in D["mist"] if m["deck"] == 2]
    h += stack(222, 112, 41, 63, cards.mist_back(L, thick[0]), 4, 2) + label(214, 180, L("濃霧", "Thick Mist"), 57, "center")
    h += stack(272, 112, 41, 63, cards.mist_back(L, deep[0]), 4, 2) + label(264, 180, L("深霧", "Deep Mist"), 57, "center")
    # beside the Landing: the other Fate Mist cards, the ending cards, the other Commission cards
    rest = [f for f in D["souls"][SOUL]["fates"] if f is not riv and f is not bk]
    h += stack(222, 14, 41, 63, cards.fate(L, SOUL, rest[0]), 4, 2) + label(208, 82, L("其餘命運之霧", "Other Fate Mist"), 70, "center")
    e0 = D["souls"][SOUL]["endings"][0]
    h += stack(282, 10, 63, 88, cards.ending_back(L, SOUL, e0["kind"], e0[L.code]), 4) + label(272, 102, L("結局牌", "Ending cards"), 83, "center")
    h += stack(354, 112, 63, 88, cards.commission_back(L), 4) + label(344, 204, L("其餘託付卡", "Other Commissions"), 83, "center")

    # ---- 5: the Memory deck; 10: Black Water, Light, Fracture, forgotten markers
    h += stack(4.5, 382 + 9, 41, 63, cards.back_memory(L), 5, 2)
    for k in range(1, 8):
        bx, by = 150 + ((k - 1) % 4) * 27 + 10, 382 + 24 + ((k - 1) // 4) * 28 + 10
        h += token(bx, by, 18, "blackwater")
    h += token(4 + 3 * 19.3 + 8.75, 382 + 95.75, 18, "light")
    h += token(13.75, 382 + 129.75, 18, "fracture")
    h += token(13.75, 382 + 165.25, 18, "forgotten")
    # ---- 7: knot markers on 0, Scar markers on 7, the Echo marker beside the Loom
    X0, PX, CW = 69, 19.1, 17.4
    for t, kn in enumerate(["knot-obsession", "knot-acceptance", "knot-oblivion"]):
        y = 224 + 19 + t * 37 + 9.5
        h += token(56.5, y, 18, kn) + token(X0 + 6 * PX + CW / 2, y, 18, "scar")
    h += token(290, 260, 25, "echo") + label(268, 276, L("迴響標記", "Echo marker"), 44, "center")
    # ---- 8: the five Mantles; 10: tokens in the Supply
    for (x, y), m in zip([(4, 8.5), (71, 8.5), (138, 8.5), (4, 106.5), (71, 106.5)], D["mantles"]):
        h += piece(x + .5, 592 + y + .5, 63, 88, cards.mantle(L, m), 3)
    for i, ic in enumerate(["root", "shade", "fog", "hold", "shield", "resign"]):
        cx, cy = 141 + (i % 2) * 32 + 12, 592 + 110 + (i // 2) * 30 + 12
        d = 18 if ic in ("root", "shade", "fog") else 25
        h += token(cx, cy, d, ic) if d == 18 else token(cx, cy, 22, ic)

    # ---- 11 / 12: the two ferrymen
    def ferryman(x0, n, oar):
        s = ""
        for i in range(4):
            s += f'<div class="a" style="{at(x0 + i * 22, 712 - abs(i - 1.5) * 2, 41, 63)}transform:rotate({(i - 1.5) * 6}deg);transform-origin:50% 120%">' + piece(0, 0, 41, 63, cards.back_memory(L), 2) + "</div>"
        s += piece(x0 + 118, 710, 63, 88, cards.commission_back(L), 3)
        s += token(x0 + 200, 722, 25, "push")
        if oar:
            s += token(x0 + 200, 754, 25, "oar")
        s += label(x0, 790, L(f"擺渡人 {n}", f"Ferryman {n}") + (L("（起始玩家）", " (first player)") if oar else ""), 220)
        return s
    h += ferryman(440, 1, True) + ferryman(700, 2, False)

    # ---- the step numbers
    for n, x, y in [(1, RX + boards.RW + 14, RY + 186), (2, RX + boards.C0 + 2 * boards.P + 22, RY + 5), (2, 282 + 66, 632),
                    (3, x1 + 14, RY + 26), (3, x0, RY + 44), (4, LX + 40, LY + 16), (5, 25, 382 + 5), (6, LX + 37, LY + 126), (6, 268, 106),
                    (7, 50, 224 + 6), (7, 290, 244), (8, 104, 592 + 6), (9, 672, 12), (9, 145, LY + 16), (9, 242, 10),
                    (10, 186, 382 + 20), (10, 188, 592 + 102), (11, 440 + 150, 702), (11, 386, 108), (12, 440 + 40, 700), (12, 700 + 40, 700)]:
        h += badge(n, x, y)
    return h


def build_image(L):
    d = os.path.join(OUT, L.dir)
    os.makedirs(os.path.join(d, "html"), exist_ok=True)
    doc = (f'<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>{BASE_CSS}{cards.CSS}'
           f'html,body{{background:#1d1712;width:{W}mm;height:{H}mm;overflow:hidden}} body{{font-family:{FAMILY[L.code]}}} .ttl,.disp{{font-family:{DISPLAY[L.code]}}}</style></head>'
           f'<body>{SYM}<div id="t" style="position:relative;width:{W}mm;height:{H}mm;background:radial-gradient(ellipse at 45% 40%,#3a2d22,#1b1510 75%)">'
           f'<div class="a" style="{at(8, 8, W - 16, H - 16)}">{table(L)}</div></div><script>{FIT_JS}</script></body></html>')
    htm = os.path.join(d, "html", "setup-table.html")
    open(htm, "w", encoding="utf-8").write(doc)
    out = os.path.join(d, "setup-table.png")
    js = os.path.join(d, "setup-shot.json")
    json.dump({"html": htm, "out": out, "w": W, "h": H}, open(js, "w"))
    subprocess.run(["node", os.path.join(HERE, "shot.cjs"), js], check=True)
    from PIL import Image
    Image.open(out).convert("RGB").save(out[:-4] + ".jpg", quality=90)
    return out[:-4] + ".jpg"


# the legend after the figure: the same numbers as the set-up steps
LEGEND = {
    "zh": [("河流圖板", "3 塊由上而下拼成一條河：第 0–4 格、第 5–9 格、第 10–14 格。"),
           ("河岸板塊", "第 2–13 格兩岸放滿板塊，霧面朝上（第二、第三河段各含 1 塊墳墓，2 人局）。備用板塊 6 塊面朝上放在旁邊。"),
           ("最初的花與亡魂", "第 1 格兩岸各 1 朵花；亡魂標記放在此岸（第 0 格）。"),
           ("亡魂牌", "最後火光的孩子，面朝上放在迷霧渡口的亡魂牌格。"),
           ("記憶牌庫", "基本 32 張與孩子的 8 張洗混，面朝下放在渡帳的牌庫框。"),
           ("迷霧牌庫", "淺霧放進迷霧槽，翻開 1 張成為前方的霧；濃霧與深霧面朝下放在一旁。"),
           ("命運織機", "三條絲線的結標記在 0、傷疤標記在 7（2 人）；迴響標記放在織機旁。"),
           ("稱號", "5 張稱號牌面朝上放在供應區的稱號格。"),
           ("憶念之書", "翻到第一章；第一章的河流條件與書上條件各 1 張，條件面朝上放在迷霧渡口；其餘命運之霧與結局牌面朝下放在一旁。"),
           ("渡帳與供應區", "黑水 7 個（溫和）；光標記在 3（孩子的起始光）；裂痕與遺忘標記在 0。根／花、怨念、霧、堅守、護盾、認命放在供應區。"),
           ("託付卡", "每人秘密抽 1 張，面朝下放在自己面前；其餘 6 張面朝下放在一旁。"),
           ("擺渡人", "每人 4 張手牌、1 個破浪標記；起始玩家拿船槳。")],
    "en": [("River boards", "The 3 boards laid one below the other as one river: spaces 0–4, 5–9 and 10–14."),
           ("Bank tiles", "Tiles fog side up on both banks of spaces 2–13 (Reaches 2 and 3 each include 1 Grave with 2 players). The 6 spare tiles lie face up beside them."),
           ("First Blooms and the soul", "1 Bloom on each bank of space 1; the soul marker on the Near Shore (space 0)."),
           ("Soul card", "The Child of the Last Flame, face up in the Soul card frame of the Misty Landing."),
           ("Memory deck", "The 32 basic cards and the Child's 8, shuffled, face down in the Ledger's deck frame."),
           ("Mist decks", "Pale Mist in the Mist well with 1 card turned up as the Mist ahead; Thick and Deep Mist face down to one side."),
           ("Loom of the Fates", "Each thread's knot marker on 0 and Scar marker on 7 (2 players); the Echo marker beside the Loom."),
           ("Mantles", "The 5 Mantle cards face up in the Supply's Mantle frames."),
           ("Book of Remembrance", "Open at chapter 1; one River and one Book condition of chapter 1, condition side up, on the Misty Landing; the other Fate Mist cards and the ending cards face down to one side."),
           ("Ledger and Supply", "7 Black Water (Gentle); the Light marker on 3 (the Child's starting Light); Fracture and forgotten markers on 0. Roots/Blooms, Shades, Fog, Hold Fast, Shield and Resignation in the Supply."),
           ("Commission cards", "Each player draws 1 in secret and keeps it face down in front of them; the other 6 face down to one side."),
           ("Ferrymen", "4 cards in hand and 1 Push Through token each; the first player takes the Oar.")],
}


def figure_html(L, img):
    rows = "".join(f'<tr><td class="n">{i + 1}</td><td><b>{E(t)}</b></td><td>{E(d)}</td></tr>' for i, (t, d) in enumerate(LEGEND[L.code]))
    title = L("遊戲準備完成的桌面（2 人・最後火光的孩子・溫和）", "The table after set-up (2 players · The Child of the Last Flame · Gentle)")
    head = L("編號對照", "The numbers")
    cols = L("<th>編號</th><th>準備步驟</th><th>桌上的樣子</th>", "<th>No.</th><th>Set-up step</th><th>On the table</th>")
    return (f'<div class="setupfig"><div class="cap">{E(title)}</div><img src="file://{img}"></div>'
            f'<div class="legend"><h3>{E(head)}</h3><table class="lg"><tr>{cols}</tr>{rows}</table></div>')
