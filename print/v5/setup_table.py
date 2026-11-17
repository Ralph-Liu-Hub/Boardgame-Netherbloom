# The Rulebook's set-up figure: the real table after set-up (2 players, The Child of the Last Flame, Gentle), drawn from
# the same boards, cards, tiles and tokens as the print files at true size, with the number of each set-up step where it
# lands. Saved as out/<lang>/setup-table.jpg; rulebooks.py puts it on its own page with the legend after it.
import json, os, random, subprocess
from common import *
import boards, cards, tiles, tokens, books

W, H = 1000, 672         # the table, mm (the Rulebook spread's 426 x 286 with bleed, scaled)
SOUL = "child"
_rot = random.Random(3)


def tilt(a=2.5):
    """A small turn, as a piece laid down by hand."""
    return _rot.uniform(-a, a)


def piece(x, y, w, h, inner, radius=0, shadow=True, turn=0):
    """A printed piece: its page (with bleed) cropped to the trim and laid on the table."""
    sh = "box-shadow:0 1.2mm 3mm rgba(0,0,0,.75);" if shadow else ""
    tr = f"transform:rotate({turn:.2f}deg);" if turn else ""
    return (f'<div class="a" style="{at(x, y, w, h)}overflow:hidden;border-radius:{mm(radius)};{sh}{tr}">'
            f'<div class="a" style="{at(-BLEED, -BLEED, w + 2 * BLEED, h + 2 * BLEED)}">{inner}</div></div>')


def token(x, y, d, icon, turn=True):
    return piece(x - d / 2, y - d / 2, d, d, tokens.face(Lang("zh"), icon, d), d / 2 if tokens.shape(icon) == "round" else d * .19, turn=tilt(8) if turn else 0)


def stack(x, y, w, h, inner, n=3, radius=2.5):
    t = tilt(3)
    return "".join(piece(x + i * .8, y - i * .8, w, h, inner, radius, turn=t + i * .6) for i in range(n))


def badge(n, x, y):
    return (f'<div class="a" style="{at(x - 12, y - 12, 24, 24)}border-radius:50%;background:#e9c46a;border:1.5mm solid #1a1410;'
            f'box-shadow:0 0 0 .9mm #e9c46a,0 1.2mm 3.5mm rgba(0,0,0,.85);display:grid;place-items:center;font:700 14mm/1 Georgia,serif;color:#1a1410;z-index:5">{n}</div>')


def label(x, y, t, w=120, align="left"):
    return f'<div class="a" style="{at(x, y, w)}font-size:{mm(6)};color:#e6d3a3;text-align:{align};text-shadow:0 .4mm 1mm #000;z-index:4">{E(t)}</div>'


def table(L):
    """Everything as it lies after set-up. Left: the Misty Landing and the piles set aside; middle: the Book with the
    river below it (turned to lie across the table); right: the Loom, the Ledger and the Supply; the two ferrymen at
    the near edge, the spare tiles between them."""
    random.seed(7)
    D = DATA
    h = ""
    # ---- boards
    w, hh, p = boards.landing(L); h += piece(8, 8, w, hh, p, 3, turn=-.6)
    BX, BY = 224, 8
    sp = books.chapter_spread(L, SOUL, 0)[0][1]
    h += piece(BX, BY, books.W, books.PH, sp, 2, turn=.3)
    w, hh, p = boards.loom(L); h += piece(714, 8, w, hh, p, 3, turn=.7)
    w, hh, p = boards.ledger(L); h += piece(712, 156, w, hh, p, 3, turn=-.4)
    w, hh, p = boards.supply(L); h += piece(718, 354, w, hh, p, 3, turn=.8)
    # the river: three boards one below the other, the whole river turned to lie across the table
    RXo, RYo = 280, 300                       # top-left of the turned river (372 wide x 256 tall)
    rv = ""
    for r in range(3):
        inner = boards.river(L, r)
        for k in ("wm", "glow0", "glow1", "glow2", "bl", "wt"):
            inner = inner.replace(f'id="{k}"', f'id="{k}r{r}"').replace(f'url(#{k})', f'url(#{k}r{r})')
        rv += piece(0, r * boards.RH, boards.RW, boards.RH,
                    board_page(boards.RW, boards.RH, inner, art("scene-river", 3000), "linear-gradient(rgba(14,12,17,.45),rgba(14,12,17,.62))", f"center {r * 50}%"), 2, shadow=True)
    # tiles, Blooms and the soul, in the river's own coordinates
    pools = []
    for r, pool in enumerate(D["tiles"]["pools"]):
        bag = [k for k, n in pool["pool"].items() for _ in range(n)]
        random.shuffle(bag)
        drawn = bag[:{0: 6, 1: 7, 2: 9}[r]] + (["grave"] if r else [])
        random.shuffle(drawn)
        pools.append(drawn)
    spaces = {0: [2, 3, 4], 1: [5, 6, 7, 8], 2: [9, 10, 11, 12, 13]}
    for r in range(3):
        it = iter(pools[r])
        for n in spaces[r]:
            row = next(i for i, rw in enumerate(boards.ROWS) if n in rw)
            col = boards.ROWS[row].index(n)
            x = boards.C0 + col * boards.P + 2
            for wy in (6, 78):
                kind = next(it)
                rv += piece(x, row * boards.RH + wy, 40, 40, tiles.back(L, kind, ["Ⅰ", "Ⅱ", "Ⅲ"][r] if kind != "grave" else "grave"), 1.5, turn=tilt(1.5))
    x1 = boards.C0 + boards.P + 23
    rv += token(x1, 26, 18, "bloom") + token(x1, 98, 18, "bloom") + token(boards.C0 + 22, 62, 25, "soul")
    rh = 3 * boards.RH
    h += (f'<div class="a" style="{at(RXo, RYo, rh, boards.RW)}"><div class="a" style="{at(0, 0, boards.RW, rh)}transform-origin:0 0;'
          f'transform:translateX({rh}mm) rotate(90deg) rotate(.4deg)">{rv}</div></div>')
    # where a point (x, y) of the upright river lands once turned
    R = lambda x, y: (RXo + rh - y, RYo + x)

    # ---- on the Misty Landing: 4 the Soul card, 9 the two Fate Mist cards, 6 the Pale Mist deck and the Mist ahead
    h += piece(8.5 + 8, 8 + 21, 63, 88, cards.soul_card(L, SOUL), 3, turn=tilt(1.2))
    f1 = [f for f in D["souls"][SOUL]["fates"] if f["chapter"] == 0]
    riv = next(f for f in f1 if f["zh"]["river"]); bk = next(f for f in f1 if not f["zh"]["river"])
    h += piece(8 + 94.5, 8 + 21, 41, 63, cards.fate_back(L, SOUL, riv), 2, turn=tilt(1.5))
    h += piece(8 + 154.5, 8 + 21, 41, 63, cards.fate_back(L, SOUL, bk), 2, turn=tilt(1.5))
    pale = [m for m in D["mist"] if m["deck"] == 0]
    h += stack(8 + 16.5, 8 + 131.5, 41, 63, cards.mist_back(L, pale[3]), 4, 2)
    h += piece(8 + 82.5, 8 + 131.5, 41, 63, cards.mist(L, pale[5]), 2, turn=tilt(1.5))
    # ---- set aside under the Landing: the other Fate Mist, the ending cards, the other Commissions, Thick and Deep Mist
    rest = [f for f in D["souls"][SOUL]["fates"] if f is not riv and f is not bk]
    e0 = D["souls"][SOUL]["endings"][0]
    thick = [m for m in D["mist"] if m["deck"] == 1]; deep = [m for m in D["mist"] if m["deck"] == 2]
    h += stack(12, 232, 63, 88, cards.ending_back(L, SOUL, e0["kind"], e0[L.code]), 4) + label(6, 323, L("結局牌", "Endings"), 75, "center")
    h += stack(82, 232, 63, 88, cards.commission_back(L), 4) + label(76, 323, L("其餘託付卡", "Commissions"), 75, "center")
    h += stack(152, 236, 41, 63, cards.fate(L, SOUL, rest[0]), 4, 2) + label(140, 302, L("命運之霧", "Fate Mist"), 65, "center")
    h += stack(14, 346, 41, 63, cards.mist_back(L, thick[0]), 4, 2) + label(6, 412, L("濃霧", "Thick"), 57, "center")
    h += stack(64, 346, 41, 63, cards.mist_back(L, deep[0]), 4, 2) + label(56, 412, L("深霧", "Deep"), 57, "center")
    # ---- 5 the Memory deck; 10 Black Water, Light, Fracture, forgotten markers (Ledger at 712, 156)
    LX, LY = 712, 156
    h += stack(LX + 4.5, LY + 9, 41, 63, cards.back_memory(L), 5, 2)
    for k in range(1, 8):
        h += token(LX + 150 + ((k - 1) % 4) * 27 + 10, LY + 24 + ((k - 1) // 4) * 28 + 10, 18, "blackwater")
    h += token(LX + 4 + 3 * 19.3 + 8.75, LY + 95.75, 18, "light") + token(LX + 13.75, LY + 129.75, 18, "fracture") + token(LX + 13.75, LY + 165.25, 18, "forgotten")
    # ---- 7 knot markers on 0, Scar markers on 7 (Loom at 714, 8); the Echo marker beside the Loom
    X0, PX, CW = 69, 19.1, 17.4
    for t, kn in enumerate(["knot-obsession", "knot-acceptance", "knot-oblivion"]):
        y = 8 + 19 + t * 37 + 9.5
        h += token(714 + 56.5, y, 18, kn, False) + token(714 + X0 + 6 * PX + CW / 2, y, 18, "scar", False)
    h += token(948, 400, 25, "echo") + label(926, 414, L("迴響標記", "Echo"), 44, "center")
    # ---- 8 the five Mantles, 10 the tokens (Supply at 718, 354)
    SX, SY = 718, 354
    for (x, y), m in zip([(4, 8.5), (71, 8.5), (138, 8.5), (4, 106.5), (71, 106.5)], D["mantles"]):
        h += piece(SX + x + .5, SY + y + .5, 63, 88, cards.mantle(L, m), 3, turn=tilt(1.2))
    for i, ic in enumerate(["root", "shade", "fog", "hold", "shield", "resign"]):
        h += token(SX + 141 + (i % 2) * 32 + 12, SY + 110 + (i // 2) * 30 + 12, 18 if i < 3 else 22, ic)

    # ---- 11 / 12 the two ferrymen at the near edge, the spare tiles between them
    def ferryman(x0, n, oar):
        s = ""
        for i in range(4):
            s += f'<div class="a" style="{at(x0 + i * 22, 570 - abs(i - 1.5) * 2, 41, 63)}transform:rotate({(i - 1.5) * 7}deg);transform-origin:50% 120%">' + piece(0, 0, 41, 63, cards.back_memory(L), 2) + "</div>"
        s += piece(x0 + 122, 566, 63, 88, cards.commission_back(L), 3, turn=tilt(4))
        s += token(x0 + 206, 588, 25, "push")
        if oar:
            s += token(x0 + 206, 624, 25, "oar")
        s += label(x0, 646, L(f"擺渡人 {n}", f"Ferryman {n}") + (L("（起始玩家）", " (first player)") if oar else ""), 230)
        return s
    h += ferryman(130, 1, True) + ferryman(640, 2, False)
    for i, k in enumerate(["field", "field", "fertile", "fertile", "spring", "spring"]):
        h += piece(424 + (i % 3) * 44, 572 + (i // 3) * 44, 40, 40, tiles.front(L, k, "spare"), 1.5, turn=tilt(3))

    # ---- the title, on a card of its own at the far edge
    title = L("遊戲準備完成的桌面", "The table after set-up")
    sub = L("2 人・最後火光的孩子・溫和", "2 players · The Child of the Last Flame · Gentle")
    h += (f'<div class="a" style="{at(14, 446, 230)}font-family:{DISPLAY[L.code]};color:#e6d3a3;text-shadow:0 .5mm 1.5mm #000">'
          f'<div style="font-size:{mm(11 if L.code == "zh" else 9)}">{E(title)}</div><div style="font-size:{mm(6.5)};color:#cfc6b2;margin-top:2mm">{E(sub)}</div></div>')
    # ---- the step numbers (kept clear of the fold in the middle of the spread, x 480-520)
    sx, sy = R(boards.C0 + 2 * boards.P + 22, 4)
    bx, by = R(boards.C0 + boards.P + 23, 26)
    so = R(boards.C0 + 22, 40)
    for n, x, y in [(1, RXo + rh + 22, RYo + 150), (2, sx, sy), (2, 556, 566), (3, bx - 20, by), (3, so[0], so[1]),
                    (4, 40, 26), (5, 736, 166), (6, 44, 136), (6, 70, 344), (7, 740, 20), (7, 948, 384),
                    (8, 760, 360), (9, 600, 22), (9, 134, 26), (9, 172, 232), (10, 880, 176), (10, 900, 470),
                    (11, 284, 562), (11, 118, 230), (12, 140, 560), (12, 650, 560)]:
        h += badge(n, x, y)
    return h


def build_image(L):
    d = os.path.join(OUT, L.dir)
    os.makedirs(os.path.join(d, "html"), exist_ok=True)
    doc = (f'<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>{BASE_CSS}{cards.CSS}'
           f'html,body{{background:#1d1712;width:{W}mm;height:{H}mm;overflow:hidden}} body{{font-family:{FAMILY[L.code]}}} .ttl,.disp{{font-family:{DISPLAY[L.code]}}}</style></head>'
           f'<body>{SYM}<div id="t" style="position:relative;width:{W}mm;height:{H}mm;overflow:hidden;background:radial-gradient(ellipse at 50% 55%,#4a3828,#24190f 70%,#140e09)">'
           f'<div class="a" style="{at(-60, -40, W + 120, H + 80)}background:repeating-linear-gradient(88deg,rgba(255,220,170,.025) 0 3mm,rgba(0,0,0,.04) 3mm 7mm)"></div>'
           f'<div class="a" style="{at(0, 0, W, H)}perspective:2600mm;perspective-origin:50% 120%">'
           f'<div class="a" style="{at(14, 10, W - 28, H - 18)}transform:rotateX(9deg) scale(.985);transform-origin:50% 100%">{table(L)}</div></div>'
           f'</div><script>{FIT_JS}</script></body></html>')
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


MARK = "SETUPSPREADHERE"


def figure_html(L):
    """The legend, on a page of its own; rulebooks.post() puts the table spread next to it (the marker finds the page)."""
    rows = "".join(f'<tr><td class="n">{i + 1}</td><td><b>{E(t)}</b></td><td>{E(d)}</td></tr>' for i, (t, d) in enumerate(LEGEND[L.code]))
    head = L("遊戲準備完成的桌面：編號對照", "The table after set-up: the numbers")
    note = L("下一個跨頁（或前一個跨頁）是 2 人、最後火光的孩子、溫和難度準備完成的真實桌面；圖上的編號就是準備步驟的編號。",
             "The spread next to this page shows the real table after set-up for 2 players, The Child of the Last Flame, Gentle; each number on it is the number of a set-up step.")
    cols = L("<th>編號</th><th>準備步驟</th><th>桌上的樣子</th>", "<th>No.</th><th>Set-up step</th><th>On the table</th>")
    return (f'<div class="legend"><span class="spreadmark">{MARK}</span><h3>{E(head)}</h3><p>{E(note)}</p>'
            f'<table class="lg"><tr>{cols}</tr>{rows}</table></div>')
