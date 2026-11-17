# The box (the V3.2 set-up box, kept): lid 300 x 300 x 75 mm, base 296 x 296 x 73 mm, 15 mm turn-ins.
# Each wrap is one flat sheet: the face in the middle, the four walls round it, the turn-ins beyond; the die line PDF
# has the same geometry (cut in magenta, folds in cyan dashes) and is not printed.
from common import *

LID = (300, 75)
BASE = (296, 73)
TURN = 15


def wrap_size(L_, D):
    return L_ + 2 * (D + TURN)


def walls(L_, D, inner):
    """Positions (in trim coordinates) of the face and the four walls of a wrap."""
    o = D + TURN
    return {"face": (o, o, L_, L_), "top": (o, TURN, L_, D), "bottom": (o, o + L_, L_, D), "left": (TURN, o, D, L_), "right": (o + L_, o, D, L_)}


def wall_band(L, x, y, w, h, rot, text, sub):
    return (f'<div class="a" style="{at(x, y, w, h)}display:flex;align-items:center;justify-content:center">'
            f'<div style="transform:rotate({rot}deg);white-space:nowrap;text-align:center"><div class="disp" style="font-size:{mm(13 if L.code == "zh" else 12)};color:#e6d3a3;letter-spacing:.25em">{E(text)}</div>'
            f'<div style="font-size:{mm(4.2)};color:#cfc6b2;margin-top:2mm;letter-spacing:.1em">{E(sub)}</div></div></div>')


def facts(L):
    return L("1–4 人 · 45–60 分鐘 · 14 歲以上", "1–4 players · 45–60 min · ages 14+")


def lid(L):
    L_, D = LID
    S = wrap_size(L_, D)
    w = walls(L_, D, None)
    x, y, fw, fh = w["face"]
    title = L("彼岸花渡", "Netherbloom")
    h = (f'<div class="a" style="{at(x - 2, y - 2, fw + 4, fh + 4)}background-image:url({art("cover-f", 4000)});background-size:cover;background-position:center"></div>'
         f'<div class="a" style="{at(x, y, fw, fh)}background:linear-gradient(rgba(14,12,17,.55),rgba(14,12,17,0) 35%,rgba(14,12,17,0) 70%,rgba(14,12,17,.75))"></div>'
         f'<div class="a disp" style="{at(x, y + 22, fw)}text-align:center;font-size:{mm(28 if L.code == "zh" else 24)};color:#e6d3a3;letter-spacing:.2em">{E(title)}</div>'
         f'<div class="a" style="{at(x, y + 56, fw)}text-align:center;font-size:{mm(7)};color:#f2e8d5">{E(L("Netherbloom", "彼岸花渡"))}</div>'
         f'<div class="a" style="{at(x, y + fh - 30, fw)}text-align:center;font-size:{mm(6)};font-style:italic;color:#e6d3a3">{E(L("讓亡魂渡過忘川，記得祂曾經是誰。", "Ferry the soul across the river of forgetting, and remember who it was."))}</div>'
         f'<div class="a" style="{at(x, y + fh - 16, fw)}text-align:center;font-size:{mm(4.6)};color:#cfc6b2;letter-spacing:.1em">{E(facts(L))}</div>')
    for side, rot in (("top", 180), ("bottom", 0), ("left", 90), ("right", -90)):
        bx, by, bw, bh = w[side]
        h += wall_band(L, bx, by, bw, bh, rot, title, facts(L))
    return S, S, board_page(S, S, h, art("tex-bank", 4000), "linear-gradient(rgba(14,12,17,.72),rgba(14,12,17,.72))")


def base(L):
    L_, D = BASE
    S = wrap_size(L_, D)
    w = walls(L_, D, None)
    x, y, fw, fh = w["face"]
    souls = "　".join(DATA["souls"][s]["name"][L.code] for s in DATA["soulOrder"]) if L.code == "zh" else " · ".join(DATA["souls"][s]["name"]["en"] for s in DATA["soulOrder"])
    blurb = L("一個亡魂站在忘川的此岸，手裡只剩幾段記憶。你們是擺渡人：在河岸種下根、讓花綻放照亮前路，一格一格把祂渡到彼岸。"
              "但迷霧會吞沒河岸，黑水會漫上來，每一張打出的牌都可能被河水帶走。你們不能說出手牌上的記憶，只能把它們銘刻進憶念之書，"
              "在旅程的最後，一起朗讀祂的一生。",
              "A soul stands on the near shore of the river of forgetting, holding only a few memories. You are the ferrymen: plant roots on the banks, "
              "make them bloom to light the way, and carry the soul across, space by space. But the mist swallows the banks, Black Water rises, and any card you play "
              "may be carried away by the river. You may not speak the memories in your hand; you can only inscribe them in the Book of Remembrance, "
              "and at the journey's end read the soul's life aloud together.")
    comps = L("72 張記憶牌、56 張迷霧牌、60 張命運之霧（迷你牌）· 40 張託付卡、20 張結局牌、5 張亡魂牌、5 張稱號牌、12 張幽靈牌 · "
              "3 塊河流圖板、命運織機、渡帳、迷霧渡口、供應區 · 5 本憶念之書 · 37 塊河岸板塊 · 61 個指示物 · 規則書、單人規則書、4 張玩家輔助卡",
              "72 Memory cards, 56 Mist cards, 60 Fate Mist cards (mini cards) · 40 Commission cards, 20 ending cards, 5 Soul cards, 5 Mantle cards, 12 Ghost cards · "
              "3 river boards, the Loom of the Fates, the Ledger, the Misty Landing, the Supply · 5 Books of Remembrance · 37 bank tiles · 61 tokens · Rulebook, Solo Rulebook, 4 Player Aids")
    h = (f'<div class="a" style="{at(x - 2, y - 2, fw + 4, 120)}background-image:url({art("scene-river", 3000)});background-size:cover;background-position:center 60%"></div>'
         f'<div class="a" style="{at(x - 2, y - 2, fw + 4, 122)}background:linear-gradient(rgba(14,12,17,.2),rgba(14,12,17,.95))"></div>'
         f'<div class="a disp" style="{at(x + 18, y + 14, fw - 36)}font-size:{mm(13 if L.code == "zh" else 11)};color:#e6d3a3;letter-spacing:.15em">{E(L("彼岸花渡", "Netherbloom"))}</div>'
         f'<div class="lab" style="{at(x + 18, y + 96, fw - 36)}font-size:{mm(4.6 if L.code == "zh" else 4.3)};line-height:1.6;color:#f2e8d5">{E(blurb)}</div>'
         f'<div class="lab" style="{at(x + 18, y + 158, fw - 36)}font-size:{mm(4.2)};color:#c9a45c">{E(L("五位亡魂", "Five souls"))}</div>'
         f'<div class="lab" style="{at(x + 18, y + 165, fw - 36)}font-size:{mm(4.2)};color:#f2e8d5;line-height:1.5">{E(souls)}</div>'
         f'<div class="lab" style="{at(x + 18, y + 186, fw - 36)}font-size:{mm(4.2)};color:#c9a45c">{E(L("盒內配件", "In the box"))}</div>'
         f'<div class="lab" style="{at(x + 18, y + 193, fw - 36)}font-size:{mm(3.8)};color:#cfc6b2;line-height:1.55">{E(comps)}</div>'
         f'<div class="a" style="{at(x + 18, y + fh - 40, fw - 36, .3)}background:rgba(201,164,92,.6)"></div>'
         f'<div class="a" style="{at(x + 18, y + fh - 33, fw - 36)}display:flex;justify-content:space-around;text-align:center;color:#e6d3a3">'
         + "".join(f'<div><div class="disp" style="font-size:{mm(9)}">{a}</div><div style="font-size:{mm(3.8)};color:#cfc6b2">{E(b)}</div></div>'
                   for a, b in [("1–4", L("人", "players")), ("45–60", L("分鐘", "minutes")), ("14+", L("歲以上", "ages"))]) + "</div>")
    for side, rot in (("top", 180), ("bottom", 0), ("left", 90), ("right", -90)):
        bx, by, bw, bh = w[side]
        h += wall_band(L, bx, by, bw, bh, rot, L("彼岸花渡", "Netherbloom"), L("Netherbloom", "彼岸花渡"))
    return S, S, board_page(S, S, h, art("tex-bank", 4000), "linear-gradient(rgba(14,12,17,.75),rgba(14,12,17,.75))")


def dieline(L_, D, name):
    S = wrap_size(L_, D)
    o = D + TURN
    cut = [(TURN, o), (o, o), (o, TURN), (o + L_, TURN), (o + L_, o), (S - TURN, o), (S - TURN, o + L_), (o + L_, o + L_), (o + L_, S - TURN), (o, S - TURN), (o, o + L_), (TURN, o + L_)]
    # outer edge with the turn-ins, corners notched to the wall depth
    outer = [(0, o), (o - 3, o), (o - 3, 0), (o + L_ + 3, 0), (o + L_ + 3, o - 3) if False else (o + L_ + 3, 0)]
    pts = [(0, o), (o, o), (o, 0), (o + L_, 0), (o + L_, o), (S, o), (S, o + L_), (o + L_, o + L_), (o + L_, S), (o, S), (o, o + L_), (0, o + L_)]
    cutpath = "M" + " L".join(f"{x + BLEED},{y + BLEED}" for x, y in pts) + " Z"
    folds = "".join(f'<path d="M{a + BLEED},{b + BLEED} L{c + BLEED},{d + BLEED}"/>' for a, b, c, d in [
        (o, o, o + L_, o), (o, o + L_, o + L_, o + L_), (o, o, o, o + L_), (o + L_, o, o + L_, o + L_),
        (o, TURN, o + L_, TURN), (o, S - TURN, o + L_, S - TURN), (TURN, o, TURN, o + L_), (S - TURN, o, S - TURN, o + L_)])
    W = S + 2 * BLEED
    return (S, S, f'<div class="a" style="inset:0;background:#fff"></div><svg class="a" style="{at(0, 0, W, W)}" viewBox="0 0 {W} {W}">'
            f'<path d="{cutpath}" fill="none" stroke="#ec008c" stroke-width=".3"/><g fill="none" stroke="#00aeef" stroke-width=".3" stroke-dasharray="3 2">{folds}</g>'
            f'<text x="{BLEED + 4}" y="{BLEED + 8}" font-size="4" fill="#ec008c" font-family="monospace">DIE LINE (do not print) · {name} · {L_} x {L_} x {D} mm · turn-in {TURN} mm · cut magenta, fold cyan dashed</text></svg>')


def build(L):
    out = []
    S, _, p = lid(L)
    out.append(("box/box-lid-wrap.pdf", S, S, [p], [L("盒蓋包紙（上蓋＋四側＋反摺）", "Lid wrap (top, four walls, turn-ins)")], f"lid {LID[0]} x {LID[0]} x {LID[1]} mm"))
    S, _, d = dieline(*LID, "lid")
    out.append(("box/box-lid-dieline.pdf", S, S, [d], ["DIE LINE lid"], "cutting guide, do not print"))
    S, _, p = base(L)
    out.append(("box/box-base-wrap.pdf", S, S, [p], [L("盒底包紙（盒背＋四側＋反摺）", "Base wrap (box back, four walls, turn-ins)")], f"base {BASE[0]} x {BASE[0]} x {BASE[1]} mm"))
    S, _, d = dieline(*BASE, "base")
    out.append(("box/box-base-dieline.pdf", S, S, [d], ["DIE LINE base"], "cutting guide, do not print"))
    return out
