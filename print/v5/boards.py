# The boards: three river panels, the Loom of the Fates, the Ledger, the Misty Landing and the Supply.
# Laid out exactly as the approved design sketches (v6), in millimetres, in both languages.
import math
from common import *

SW, SH = 64, 89        # standard card frame (63 x 88 card)
MW, MH = 42, 64        # mini card frame (41 x 63 card)
TCOL = ["var(--obs)", "var(--acc)", "var(--obl)"]
TSYM = ["nb-obsession", "nb-acceptance", "nb-oblivion"]
KNOT = ["knot-obsession", "knot-acceptance", "knot-oblivion"]

# ---------------------------------------------------------------- river
RW, RH, C0, P = 256, 124, 18, 44
ROWS = [[0, 1, 2, 3, 4], [9, 8, 7, 6, 5], [10, 11, 12, 13, 14]]
reach = lambda n: 0 if n <= 4 else (1 if n <= 8 else 2)
GLOW = ["255,214,140", "236,140,150", "120,214,210"]


def wave(x):
    t = (x - 30) / 196
    return 3.2 * math.sin(4 * math.pi * t) * math.sin(math.pi * t) if 0 <= t <= 1 else 0


def river_path():
    yc = lambda r: r * RH + 62
    arc = lambda cx, cy, r, a0, a1: [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / 24)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / 24))) for i in range(25)]
    pts = [(x, yc(0) + wave(x)) for x in range(-8, 227)]
    pts += arc(226, yc(0) + 20, 20, -90, 0) + [(246, yc(0) + 20 + i) for i in range(0, RH - 39, 2)] + arc(226, yc(0) + RH - 20, 20, 0, 90)
    pts += [(x, yc(1) + wave(x)) for x in range(226, 29, -1)]
    pts += arc(30, yc(1) + 20, 20, 270, 180) + [(10, yc(1) + 20 + i) for i in range(0, RH - 39, 2)] + arc(30, yc(1) + RH - 20, 20, 180, 90)
    pts += [(x, yc(2) + wave(x)) for x in range(30, 222)]
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in pts)


RPATH = river_path()
SYMBOLS = [("earth", ("土紋", "Earth-grain"), [("fertile", 0), ("field", 0), ("ember", 0), ("echo", 0)]),
           ("rock", ("岩紋", "Rock-grain"), [("stony", 0), ("frost", 0)]),
           ("flame", ("魂火", "Soul-flame"), [("spring", 0), ("grave", 0)])]
SYM_OF = {k: s for s, _, ks in SYMBOLS for k, _ in ks}


def fog_symbol_svg(kind, size, color="rgba(230,211,163,.95)"):
    """The symbol printed on a tile's fog side, and in the river board's key."""
    s = SYM_OF[kind]
    c = size / 2
    if s == "earth":     # three furrows
        g = "".join(f'<path d="M{c - size*.32},{c + d} q{size*.16},{-size*.12} {size*.32},0 t{size*.32},0" fill="none" stroke="{color}" stroke-width="{size*.06}" stroke-linecap="round"/>' for d in (-size*.2, 0, size*.2))
    elif s == "rock":    # a cracked stone
        g = (f'<path d="M{c - size*.34},{c + size*.22} L{c - size*.2},{c - size*.26} L{c + size*.22},{c - size*.3} L{c + size*.36},{c + size*.18} Z" fill="none" stroke="{color}" stroke-width="{size*.06}" stroke-linejoin="round"/>'
             f'<path d="M{c - size*.04},{c - size*.28} L{c + size*.04},{c - size*.02} L{c - size*.06},{c + size*.2}" fill="none" stroke="{color}" stroke-width="{size*.05}"/>')
    else:                # a soul-flame
        g = (f'<path d="M{c},{c - size*.38} C{c + size*.3},{c - size*.08} {c + size*.26},{c + size*.32} {c},{c + size*.36} C{c - size*.26},{c + size*.32} {c - size*.3},{c - size*.08} {c},{c - size*.38} Z" fill="none" stroke="{color}" stroke-width="{size*.06}"/>'
             f'<circle cx="{c}" cy="{c + size*.12}" r="{size*.09}" fill="{color}"/>')
    return f'<svg viewBox="0 0 {size} {size}" width="{mm(size)}" height="{mm(size)}">{g}</svg>'


def ripple(cx, cy, n, rgb):
    rings = "".join(f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{r*.72:.2f}" fill="none" stroke="rgba({rgb},{op})" stroke-width="{sw}"/>'
                    for r, op, sw in [(12.5, .18, .35), (10.2, .32, .4), (7.8, .5, .45), (5.6, .7, .5)])
    return (f'<ellipse cx="{cx}" cy="{cy}" rx="13" ry="9.5" fill="url(#glow{reach(n)})"/>{rings}'
            f'<text x="{cx}" y="{cy + 1.75}" text-anchor="middle" font-size="5" font-weight="700" fill="rgb({rgb})" style="font-family:serif">{n}</text>')


def key_block(L, x, y, w, title, counts=None):
    """The fog-side key: each symbol and what it may hide; with `counts`, how many of each this Reach has."""
    K = DATA["tiles"]["kinds"]
    h = lab(x, y, title, 2.9, "#e6d3a3", w, "center")
    for i, (s, nm, kinds) in enumerate(SYMBOLS):
        yy = y + 5.2 + i * 12.6
        h += f'<div class="a" style="{at(x, yy, 9, 9)}">{fog_symbol_svg(kinds[0][0], 9)}</div>'
        if counts:
            n = counts[s]
            txt = L(nm[0], nm[1]) + (f" {n}" if n else "")
            sub = "、".join if L.code == "zh" else ", ".join
            parts = sub(f"{L(K[k]['zh'], K[k]['en'])} {c}" for k, c in counts[s + "_kinds"])
        else:
            txt = L(nm[0], nm[1])
            parts = ("、" if L.code == "zh" else ", ").join(L(K[k]["zh"], K[k]["en"]) for k, _ in kinds)
        h += lab(x + 10, yy - .4, txt, 2.7, "#f2e8d5", w - 10) + lab(x + 10, yy + 3.4, parts, 2.25, "#cfc6b2", w - 10, extra="line-height:1.2")
    return h


def reach_counts(r):
    pool = DATA["tiles"]["pools"][r]["pool"]
    out = {}
    for s, _, kinds in SYMBOLS:
        ks = [(k, pool[k]) for k, _ in kinds if pool.get(k)]
        if s == "flame" and r > 0:
            ks.append(("grave", "1" if r == 1 else "1–2"))
        out[s + "_kinds"] = ks
        out[s] = sum(c for k, c in ks if isinstance(c, int)) + (0 if s != "flame" or r == 0 else 1)
        if s == "flame" and r == 2:
            out[s] = f"{out[s]}–{out[s] + 1}"
    return out


def river(L, row):
    y0 = row * RH
    defs = "".join(f'<radialGradient id="glow{i}"><stop offset="0" stop-color="rgba({g},.55)"/><stop offset=".55" stop-color="rgba({g},.16)"/><stop offset="1" stop-color="rgba({g},0)"/></radialGradient>' for i, g in enumerate(GLOW))
    water = art("tex-water", 3000)
    svg = (f'<svg class="a" style="{at(-BLEED, -BLEED, RW + 2*BLEED, RH + 2*BLEED)}" viewBox="{-BLEED} {y0 - BLEED} {RW + 2*BLEED} {RH + 2*BLEED}"><defs>{defs}'
           f'<pattern id="wt" patternUnits="userSpaceOnUse" width="90" height="45"><image href="{water}" width="90" height="45" preserveAspectRatio="xMidYMid slice"/></pattern>'
           f'<filter id="bl"><feGaussianBlur stdDeviation="1.6"/></filter>'
           f'<filter id="wtx" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.09 0.35" numOctaves="3" seed="7"/>'
           f'<feColorMatrix values="0 0 0 0 .78  0 0 0 0 .9  0 0 0 0 .95  0 0 0 1.6 -.75"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>'
           f'<path d="{RPATH}" fill="none" stroke="rgba(0,0,0,.75)" stroke-width="27" stroke-linecap="round" filter="url(#bl)"/>'
           f'<path d="{RPATH}" fill="none" stroke="rgba(170,200,205,.45)" stroke-width="21" stroke-linecap="round"/>'
           f'<path d="{RPATH}" fill="none" stroke="#1b3542" stroke-width="19.4" stroke-linecap="round"/>'
           f'<path d="{RPATH}" fill="none" stroke="url(#wt)" stroke-width="19.4" stroke-linecap="round" opacity=".55"/>'
           f'<path d="{RPATH}" fill="none" stroke="#fff" stroke-width="19.4" stroke-linecap="round" filter="url(#wtx)" opacity=".26"/>'
           f'<path d="{RPATH}" fill="none" stroke="rgba(200,230,240,.22)" stroke-width="1.2" transform="translate(0,-7.6)" filter="url(#bl)"/>')
    h = ""
    fog = art("card-fog", 900)
    bank = art("tex-bank", 900)
    for i, n in enumerate(ROWS[row]):
        x = C0 + i * P; cx = x + 22; cy = y0 + 62 + wave(cx)
        if n == 14:
            svg += f'<ellipse cx="{cx}" cy="{cy}" rx="21" ry="15" fill="url(#glow0)"/>'
        svg += ripple(cx, cy, n, GLOW[reach(n)])
        if 1 <= n <= 13:
            for wy in (5, 77):
                if n == 1:
                    inner = (f'<img src="{ico("bloom")}" style="width:{mm(17)};height:{mm(17)}">'
                             f'<div style="font-size:{mm(2.5)};color:var(--bone);margin-top:{mm(1.2)}">{E(L("準備：放 1 朵花", "Set-up: 1 Bloom"))}</div>')
                    h += slot(x + 1, wy, 42, 42, bank, .55, inner, "border-style:solid;border-color:rgba(201,164,92,.85)")
                else:
                    h += slot(x + 1, wy, 42, 42, fog, .62, "", "border-color:rgba(201,164,92,.8)")
        elif n == 0:
            h += lab(x, 22, L("此岸", "Near Shore"), 5 if L.code == "zh" else 4.2, "#c9a45c", 44, "center", extra=f"font-family:{DISPLAY[L.code]}")
            h += lab(x, 30, L("亡魂從這裡出發", "The soul sets out here"), 2.6, "#cfc6b2", 44, "center")
            h += key_block(L, x + 1, 76, 42, L("霧面符號", "Fog-side symbols"))
        else:
            h += lab(x, 33, L("彼岸", "Far Shore"), 5 if L.code == "zh" else 4.2, "#ffd68c", 44, "center", extra=f"font-family:{DISPLAY[L.code]}")
            h += lab(x, 40, L("抵達即勝利", "Reach it and win"), 2.6, "#cfc6b2", 44, "center")
    svg += "</svg>"
    names = [L("第一河段・日光蘭之路（1–4）", "Reach 1 · The Asphodel Road (1–4)"), L("第二河段・哀悼之野（5–8）", "Reach 2 · The Fields of Mourning (5–8)"),
             L("第三河段・忘川之岸（9–13）", "Reach 3 · The Banks of Lethe (9–13)")]
    pos = [(RW - 16, 4, 52), (RW - 16, 66, 55), (2, 66, 55)][row]          # the free half of a side strip
    h += (f'<div class="lab fit" data-min="1.9" data-id="reach name {row}" style="{at(pos[0], pos[1], 14, pos[2])}font-size:{mm(2.9)};color:rgb({GLOW[row]});'
          f'writing-mode:vertical-rl;letter-spacing:.06em;overflow:hidden">{E(names[row])}</div>')
    if row == 1:
        h += lab(C0, 49.5, L("第三河段", "Reach 3"), 2.4, f"rgb({GLOW[2]})", 44, "center")
    if row == 2:   # what each Reach's fog hides, under the Far Shore
        cx = C0 + 4 * P
        for r, yy in ((0, -1), (1, 0), (2, 1)):
            pass
        h += reach_key_table(L, cx + 1, 76)
    return svg + h


def reach_key_table(L, x, y):
    """Under the Far Shore: how many of each fog symbol each Reach holds."""
    w = 42
    h = lab(x, y - .5, L("各河段的霧面", "Fog in each Reach"), 2.6, "#e6d3a3", w, "center")
    cols = [x + 13, x + 23, x + 33]
    for j, (s, nm, kinds) in enumerate(SYMBOLS):
        h += f'<div class="a" style="{at(cols[j] - 1, y + 3.6, 7, 7)}">{fog_symbol_svg(kinds[0][0], 7)}</div>'
    for r in range(3):
        c = reach_counts(r)
        yy = y + 12 + r * 9.5
        h += lab(x, yy, L(["第一", "第二", "第三"][r], ["Reach 1", "Reach 2", "Reach 3"][r]), 2.5, f"rgb({GLOW[r]})", 13)
        for j, (s, _, _) in enumerate(SYMBOLS):
            h += lab(cols[j] - 2, yy - .3, str(c[s]), 3, "#f2e8d5", 9, "center")
        if r:
            h += lab(x, yy + 3.6, L("含墳墓", "incl. Grave") + (" 1" if r == 1 else " 1–2"), 2, "#a29c93", 42)
    return h


# ---------------------------------------------------------------- Loom of the Fates
def loom(L):
    W, H = 262, 138
    TN = [L("執念", "Obsession"), L("釋懷", "Acceptance"), L("忘卻", "Oblivion")]
    BL = DATA["backlash"]["zh" if L.code == "zh" else "en"]
    h = f'<div class="ttl" style="{at(4, 2.5)}font-size:{mm(5.4)}">{E(L("命運織機", "Loom of the Fates"))}</div>'
    h += lab(25, 9.5, L("迴響", "Echo"), 2.8, "#cfc6b2", 19, "center") + lab(46, 9.5, L("結", "Knot"), 2.8, "#cfc6b2", 19, "center")
    X0, PX, CW = 69, 19.1, 17.4
    for t in range(3):
        c = TCOL[t]; y = 19 + t * 37
        h += lab(2, y + 3, sym(TSYM[t], c, 6), 6, c, 22, "center", raw=True)
        h += lab(1, y + 11.5, TN[t], 4 if L.code == "zh" else 3, c, 24, "center")
        h += circ(26, y, 19, "", f"border-style:dashed;border-color:{c};background:rgba(14,12,17,.4)") + icon("echo", 29.5, y + 3.5, 12, .5)
        h += f'<div class="track" style="{at(56, y + 8.7, X0 + 9 * PX + CW - 56)}"></div>'
        h += circ(46.5, y - .5, 20, "", f"border-color:{c}") + icon(KNOT[t], 47.5, y + .5, 18, .95)
        for k in range(1, 11):
            x = X0 + (k - 1) * PX
            if k in (5, 6, 7): bg, sm = "rgba(208,69,79,.38);border-color:rgba(240,120,130,.8)", L(f"傷疤{7-k}", f"Scar {7-k}")
            elif k in (8, 9, 10): bg, sm = "rgba(79,179,160,.36);border-color:rgba(120,220,200,.8)", L(f"傷疤{10-k}", f"Scar {10-k}")
            else: bg, sm = "rgba(14,12,17,.72)", ""
            h += cell(x, y, CW, 19, str(k), sm, f"background:{bg}", ssize=2.3 if L.code == "zh" else 2.1)
        h += icon("scar", X0 + 6 * PX + 2.2, y + 3.6, 13, .35) + icon("scar", X0 + 9 * PX + 2.2, y + 3.6, 13, .35)
        def bx(k0, k1, txt, col):
            return (f'<div class="a" style="{at(X0 + (k0-1)*PX + 2, y - 3.2, (k1-k0)*PX + CW - 4, 2.2)}border:.3mm solid {col};border-bottom:none"></div>'
                    + lab(X0 + (k0-1)*PX, y - 7.6, txt, 2.6, col, (k1-k0+1)*PX - 2, "center"))
        h += bx(5, 7, L("2–4 人", "2–4 players"), "#e88a92") + bx(8, 10, L("單人", "Solo"), "#7fd8c6")
        sep = "　" if L.code == "zh" else "   "
        h += lab(X0, y + 20.3, L("反噬", "Backlash") + sep + sep.join(f"{'ⅠⅡⅢ'[i]} {BL[t][i]}" for i in range(3)), 2.55 if L.code == "zh" else 2.45, "#d8cfbb", 192)
    notes = L("① 打出（正面）或焚燒一張牌：那條絲線的結標記往右走 1 格。　"
              "② 結標記走到傷疤標記那一格＝打滿：立即反噬（第幾級＝傷疤數，本章路線上有同絲線霧痕再升一級），然後傷疤標記往左移 1 格、結標記回到 0。　"
              "③ 傷疤標記的起點：2–4 人放在紅格 7，單人放在藍綠格 10。　"
              "④ 迴響標記放進最後一張正面打出或焚燒的牌那條絲線的圈；回應打出同絲線的牌就共鳴。",
              "① Play a card face up, or burn one: that thread's knot marker moves 1 space right.  "
              "② When the knot marker reaches the Scar marker, the thread snaps: Backlash at once (level = its Scars, +1 for a mist scar of that thread on this chapter's route); "
              "then move the Scar marker 1 space left and the knot marker back to 0.  "
              "③ Scar markers start on the red 7 with 2–4 players, on the teal 10 solo.  "
              "④ The Echo marker sits in the ring of the thread of the last card played face up or burned; a response of the same thread resonates.")
    h += lab(4, 119.5, notes, 2.55 if L.code == "zh" else 2.4, "#cfc6b2", 254)
    return W, H, board_page(W, H, h, art("card-oblivion", 2400), "linear-gradient(rgba(14,12,17,.8),rgba(14,12,17,.88))")


# ---------------------------------------------------------------- the Ledger
def ledger(L):
    W, H = 262, 190
    h = f'<div class="ttl" style="{at(160, 2)}font-size:{mm(5.4)}">{E(L("渡帳", "The Ledger"))}</div>'
    back = art("back-memory", 1000)
    for i, (n, op, sub) in enumerate([(L("記憶牌庫", "Memory deck"), .95, L("面朝下", "face down")), (L("棄牌堆", "Discard"), .32, L("面朝上", "face up")),
                                       (L("遺忘堆", "Forgotten"), .32, L("被遺忘的牌", "forgotten cards"))]):
        x = 4 + i * 48
        h += lab(x - 3, 3, n, 3, "#e6d3a3", MW + 6, "center") + slot(x, 8.5, MW, MH, back, op) + lab(x - 3, 74.5, sub, 2.4, "#a29c93", MW + 6, "center")
    h += lab(150, 13.5, L("黑水供應：依難度放滿到標示的格子，其餘放回盒中", "Black Water supply: fill up to your difficulty's space; the rest go back in the box"), 2.7, "#cfc6b2", 108)
    lvb = {5: L("困難", "Hard"), 6: L("標準", "Standard"), 7: L("溫和", "Gentle")}
    for k in range(1, 8):
        x, y = 150 + ((k - 1) % 4) * 27, 24 + ((k - 1) // 4) * 28
        h += circ(x, y, 20, "", "border-color:rgba(160,200,220,.6);background:rgba(6,10,16,.7)") + icon("blackwater", x + 1, y + 1, 18, .5)
        h += lab(x - 3, y + 20.3, str(k) + (f" · {lvb[k]}" if k in lvb else ""), 2.5, "#9fc4d6" if k in lvb else "#a29c93", 26, "center")
    h += lab(4, 82, L("光（最多 12）", "Light (at most 12)"), 3)
    h += f'<div class="track" style="{at(10, 95.2, 246)}"></div>'
    h += circ(4, 86, 19.5, "", "border-color:#ffd68c;background:rgba(60,46,20,.8)") + icon("light", 5, 87, 17.5)
    h += "".join(circ(4 + k * 19.3, 87, 17.5, str(k), f"border-color:rgba(255,214,140,.55);font-size:{mm(4)}") for k in range(1, 13))
    h += lab(4, 109, L("裂痕（標記到達所選難度那一格，亡魂破碎）", "Fracture (when the marker reaches your difficulty's space, the soul shatters)"), 3)
    h += f'<div class="track" style="{at(10, 129.2, 105)}"></div>'
    h += circ(4, 120, 19.5, "", "border-color:#e0525c;background:rgba(60,14,20,.8)") + icon("fracture", 5, 121, 17.5)
    lv = {3: L("困難", "Hard"), 4: L("標準", "Standard"), 5: L("溫和", "Gentle")}
    for k in range(1, 6):
        x = 4 + k * 21
        h += circ(x, 121, 17.5, str(k), f"border-color:rgba(224,82,92,.75);font-size:{mm(4)}")
        if k in lv: h += lab(x - 2, 116.2, lv[k], 2.4, "#e88a92", 21.5, "center")
    h += lab(134, 115, L("起始：光依亡魂牌，裂痕 0，遺忘 0。<br>遺忘堆每多 1 張，遺忘標記就前進 1 格。",
                         "Start: Light as the Soul card says, Fracture 0, forgotten 0.<br>Each card added to the forgotten pile moves the forgotten marker 1 space."), 2.6, "#a29c93", 124, raw=True)
    h += lab(4, 145, L("遺忘（遺忘堆有幾張，標記就在第幾格）", "Forgotten (the marker shows how many cards are in the forgotten pile)"), 3)
    h += f'<div class="track" style="{at(10, 164.2, 246)}"></div>'
    h += circ(4, 155.5, 19.5, "", "border-color:#5fd0d6;background:rgba(14,40,46,.85)") + icon("forgotten", 5, 156.5, 17.5)
    marks = {3: "teal", 5: "teal", 7: "teal", 6: "gold", 9: "gold", 11: "red", 12: "red", 14: "red"}
    top = {11: L("困難", "Hard"), 12: L("標準", "Std."), 14: L("溫和", "Gentle"), 6: L("灰燼", "Ash"), 9: L("漂離", "Adrift"),
           3: L("拉力一", "Pull 1"), 5: L("拉力二", "Pull 2"), 7: L("拉力三", "Pull 3")}
    for k in range(1, 15):
        x = 6.5 + k * 16.75
        st = {"teal": "border:.45mm dashed #5fd0d6", "gold": "border-color:#e6b85c", "red": "border-color:#e0525c;background:rgba(80,16,24,.75)"}.get(marks.get(k), "")
        h += cell(x, 157, 15.2, 17, str(k), "", st + ";justify-content:center;padding:0", nsize=3.6)
        if k in top: h += lab(x - 3, 151.8, top[k], 2.25, {"teal": "#7fd8de", "gold": "#e6b85c", "red": "#e88a92"}[marks[k]], 21.6, "center")
    h += lab(4, 178, L("6 輕如灰燼・9 漂離・3／5／7 第一／二／三章忘川的拉力・11／12／14 消散（困難／標準／溫和）",
                       "6 Light as Ash · 9 Adrift · 3 / 5 / 7 the Pull of Lethe in chapters 1 / 2 / 3 · 11 / 12 / 14 Fade (Hard / Standard / Gentle)"), 2.6, "#a29c93", 254)
    return W, H, board_page(W, H, h, art("tex-bank", 3000), "linear-gradient(rgba(14,12,17,.66),rgba(14,12,17,.8))")


# ---------------------------------------------------------------- the Misty Landing
def landing(L):
    W, H = 206, 204
    note = lambda t: f'<div style="font-size:{mm(2.4)};color:var(--mist);position:relative;padding:0 1mm">{E(t)}</div>'
    h = f'<div class="ttl" style="{at(0, 3.5, W)}text-align:center;font-size:{mm(5.4)}">{E(L("迷霧渡口", "The Misty Landing"))}</div>'
    h += f'<div class="a" style="{at(22, 7.6, 52, .3)}background:linear-gradient(90deg,transparent,#c9a45c)"></div><div class="a" style="{at(132, 7.6, 52, .3)}background:linear-gradient(90deg,#c9a45c,transparent)"></div>'
    h += lab(6, 15, L("亡魂牌", "Soul card"), 2.9, "#e6d3a3", SW + 4, "center") + slot(8, 20.5, SW, SH, art("back-soul", 1000), .95)
    fx1, fx2, fy = 94, 154, 20.5
    h += lab(fx1 - 7, 15, L("命運之霧・河流", "Fate Mist · River"), 2.6, "#e6d3a3", MW + 14, "center") + slot(fx1, fy, MW, MH, None, 1, note(L("條件面朝上", "condition side up")))
    h += lab(fx2 - 7, 15, L("命運之霧・書上", "Fate Mist · Book"), 2.6, "#e6d3a3", MW + 14, "center") + slot(fx2, fy, MW, MH, None, 1, note(L("條件面朝上", "condition side up")))
    cx = (fx1 + MW + fx2) / 2
    h += circ(cx - 11, 88, 22, "", "border-color:#c9a45c") + icon("trait-deep", cx - 9.5, 89.5, 19, .55)
    h += lab(cx - 33, 89, L("根網特性", "Root trait"), 2.6, "#e6d3a3", 20, "right") + lab(cx + 13, 89, L("翻頁時<br>翻到本章那面", "turn it at<br>each page turn"), 2.2, "#a29c93", 24, raw=True)
    h += lab(fx1 - 4, 112, L("先達成條件的那張，放到書上的 ◆ 轉折", "The first one whose condition is met goes onto the Book's ◆ turning point"), 2.3, "#a29c93", fx2 + MW - fx1 + 8, "center")
    h += f'<div class="a" style="{at(10, 120, W - 20, .3)}background:linear-gradient(90deg,transparent,rgba(201,164,92,.7),transparent)"></div>'
    ys = 131; xs = [16, 82, 148]
    for x, (t, a_, sub) in zip(xs, [(L("迷霧牌庫・本章", "Mist deck · this chapter"), art("back-mist", 1000), ""), (L("前方的霧", "The Mist ahead"), None, L("翻開的一張", "the card turned up")),
                                     (L("迷霧棄牌", "Mist discard"), None, "")]):
        h += lab(x - 9, ys - 5.5, t, 2.7, "#e6d3a3", MW + 18, "center") + slot(x, ys, MW, MH, a_, .95, note(sub) if sub else "")
    gap = xs[1] - xs[0] - MW
    for x, t in [(xs[0] + MW, L("翻開", "turn up")), (xs[1] + MW, L("結算後", "when done"))]:
        h += lab(x, ys + MH / 2 - 6, "→", 6, "rgba(230,211,163,.75)", gap, "center") + lab(x, ys + MH / 2 + 3, t, 2.3, "#a29c93", gap, "center")
    h += lab(6, 197, L("託付卡、結局牌與其他章的迷霧牌庫放在旁邊", "Commission cards, ending cards and the other chapters' Mist decks go beside this board"), 2.4, "#a29c93", W - 12, "center")
    return W, H, board_page(W, H, h, art("scene-river", 2400), "linear-gradient(rgba(14,12,17,.6),rgba(14,12,17,.78))")


# ---------------------------------------------------------------- the Supply
def supply(L):
    W, H = 206, 204
    TH = [L("執念", "Obsession"), L("釋懷", "Acceptance"), L("忘卻", "Oblivion")]
    arts = {"weaver": art("card-mantle-weaver", 1200), "warden": art("card-mantle-warden", 1200), "bringer": art("card-mantle-bringer", 1200),
            "breaker": art("card-mantle-breaker", 1200), "reaper": art("reaper", 1200, concept=True)}
    pos = [(4, 8.5), (71, 8.5), (138, 8.5), (4, 106.5), (71, 106.5)]
    h = ""
    for (x, y), m in zip(pos, DATA["mantles"]):
        h += lab(x - 3, y - 5.5, f"{L(m['zh'], m['en'])} · {TH[m['th']]}", 2.8 if L.code == "zh" else 2.6, "#e6d3a3", SW + 6, "center") + slot(x, y, SW, SH, arts[m["key"]], .38)
    h += f'<div class="ttl" style="{at(140, 99)}font-size:{mm(5.4 if L.code == "zh" else 4.6)}">{E(L("供應區", "Supply"))}</div>'
    toks = [("root", L("根／花", "Root / Bloom"), "bloom"), ("shade", L("怨念", "Shade"), None), ("fog", L("霧", "Fog"), None),
            ("hold", L("堅守", "Hold Fast"), None), ("shield", L("護盾", "Shield"), None), ("resign", L("認命", "Resignation"), None)]
    for i, (ic, n, ic2) in enumerate(toks):
        x, y = 141 + (i % 2) * 32, 110 + (i // 2) * 30
        h += circ(x, y, 24, "", "border-color:rgba(230,211,163,.65)") + icon(ic, x + 2, y + 2, 20, .55)
        if ic2: h += icon(ic2, x + 14, y + 13, 11, .75)
        h += lab(x - 4, y + 24.2, n, 2.5, "#cfc6b2", 32, "center")
    return W, H, board_page(W, H, h, art("tex-bank", 3000), "linear-gradient(rgba(14,12,17,.62),rgba(14,12,17,.8))")


def build(L):
    """[(file, trim w, trim h, [pages], label list)]"""
    rv = []
    for r in range(3):
        rv.append(board_page(RW, RH, river(L, r), art("scene-river", 3000), "linear-gradient(rgba(14,12,17,.45),rgba(14,12,17,.62))", f"center {r*50}%"))
    out = [("boards/river-boards.pdf", RW, RH, rv, [L(f"河流圖板 {i+1}／3（第 {a}–{b} 格）", f"River board {i+1}/3 (spaces {a}-{b})") for i, (a, b) in enumerate([(0, 4), (5, 9), (10, 14)])])]
    for name, fn, label in [("loom-of-the-fates", loom, L("命運織機", "Loom of the Fates")), ("the-ledger", ledger, L("渡帳", "The Ledger")),
                            ("misty-landing", landing, L("迷霧渡口", "Misty Landing")), ("supply", supply, L("供應區", "Supply"))]:
        w, h, p = fn(L)
        out.append((f"boards/{name}.pdf", w, h, [p], [label]))
    return out
