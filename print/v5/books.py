# The Books of Remembrance: one per Soul, 12 pages of 240 x 282 mm, saddle-stitched.
#   p1 cover · p2 how to use the Book · p3 prologue · p4-5, p6-7, p8-9 the three chapters, each a spread laid flat
#   p10-11 the reading at the Far Shore · p12 back cover
# The route maps follow the approved design (web table layout, text at 14 pt or more); slots hold mini cards (41 x 63).
import math, re
from common import *
from booklay import layout, nexts

PW, PH = 240, 282
W = 2 * PW
GUT = 10
MW, MH = 42, 64
TCOL = ["#e0525c", "#f0d9a0", "#5fd0d6"]
F14 = 4.94                     # 14 pt
SLOTS = {"Person": ("nb-slot-person", "人物", "Person"), "Feeling": ("nb-slot-feeling", "感受", "Feeling"),
         "Deed": ("nb-slot-deed", "事蹟", "Deed"), "Place": ("nb-slot-place", "地點", "Place")}
SHADE_SPREAD = "linear-gradient(90deg,rgba(14,12,17,.35) 0,rgba(14,12,17,.66) 30%,rgba(14,12,17,.74) 50%,rgba(14,12,17,.72))"


def spread_pages(inner, bg, shade, bgpos="left center"):
    """A two-page spread, printed as one 480 x 282 page (plus bleed); post() cuts it into its left and right pages."""
    return [("spread", board_page(W, PH, inner, bg, shade, bgpos))]


def colw(ks):
    return 34 if set(ks) == {"p"} else 46 if set(ks) == {"o"} else MW


def chapter_spread(L, soul, ci):
    z = L.code == "zh"
    ch = DATA["souls"][soul]["chapters"][ci][L.code]
    nodes, cols, roots = layout(ch)
    out = []
    for c in cols:
        out += [c[0::2], c[1::2]] if len(c) > 3 else [c]
    cols = out
    widths = [colw([nodes[i]["k"] for i in c]) for c in cols]

    def place(gap, x0):
        xs = []; x = x0
        for w in widths:
            if x < PW + GUT and x + w > PW - GUT:
                x = PW + GUT
            xs.append(x); x += w + gap
        return xs, x - gap

    def spread(x0):
        xs = place(4, x0)[0]
        for g10 in range(40, 600, 5):
            t, end = place(g10 / 10, x0)
            if end <= W - 8: xs = t
        spare = W - 8 - (xs[-1] + widths[-1]); r = [k for k, x in enumerate(xs) if x >= PW]
        if spare > 0 and len(r) > 1:
            for j, k in enumerate(r): xs[k] += spare * j / (len(r) - 1)
        return xs

    LABH = 20; NH = MH + LABH; G3 = (PH - 10 - 3 * NH) / 2
    ent = ch["entry"]
    paras = [ent] if isinstance(ent, str) else [s_ + "　　" for s_ in ent.values()]
    cw = 5.05 if z else 2.45                     # average width of a character at 14 pt

    def text_bottom(tw):
        cpl = max(1, int(tw / cw))
        return 36 + (7.5 if isinstance(ent, dict) else 0) + sum(math.ceil(len(p) / cpl) for p in paras) * F14 * 1.45

    parents = {}
    for n in nodes.values():
        for v, t in nexts(n): parents.setdefault(v, []).append(n["id"])

    def stack(tw):
        tb = text_bottom(tw); ypos = {}
        for k, c in enumerate(cols):
            if k: c.sort(key=lambda i: sum(ypos.get(p, 141) for p in parents.get(i, [])) / max(1, len(parents.get(i, []))))
            tot = len(c) * NH + (len(c) - 1) * G3; top = (PH - tot) / 2; gap = G3
            if xs[k] < 10 + tw + 4:
                if top < tb + 3:
                    top = tb + 3; gap = min(G3, (PH - 5 - top - len(c) * NH) / max(1, len(c) - 1))
                    if gap < 4: return None
            y = top + LABH
            for i in c: ypos[i] = y + MH / 2; y += NH + gap
        return ypos

    ypos = None
    for x0 in range(10, 160, 4):
        xs = spread(x0)
        for textw in range(150, 54, -4):
            ypos = stack(textw)
            if ypos: break
        if ypos: break
    assert ypos, (soul, ci)
    pos = {}
    for k, c in enumerate(cols):
        for i in c: pos[i] = (xs[k], widths[k])
    h = (f'<div class="a" style="{at(PW - .3, 0, .6, PH)}background:rgba(0,0,0,.7)"></div>'
         f'<div class="a" style="{at(PW - 12, 0, 24, PH)}background:linear-gradient(90deg,rgba(0,0,0,0),rgba(0,0,0,.35),rgba(0,0,0,0))"></div>')
    svg = (f'<svg class="a" style="{at(0, 0, W, PH)}" viewBox="0 0 {W} {PH}"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#b8b0a2"/></marker>'
           + "".join(f'<marker id="ar{t}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>' for t, c in enumerate(TCOL)) + "</defs>")
    for i, n in nodes.items():
        x1 = pos[i][0] + pos[i][1]; y1 = ypos[i]
        for v, t in nexts(n):
            if v not in pos: continue
            x2 = pos[v][0] - 1; y2 = ypos[v]; mx = (x1 + x2) / 2
            col = "#b8b0a2" if t is None else TCOL[t]; mk = "ar" if t is None else f"ar{t}"
            svg += f'<path d="M{x1:.1f},{y1:.1f} C{mx + 4:.1f},{y1:.1f} {mx - 4:.1f},{y2:.1f} {x2:.1f},{y2:.1f}" fill="none" stroke="{col}" stroke-width=".45" stroke-opacity=".9" marker-end="url(#{mk})"/>'
    h += svg + "</svg>"
    pull = DATA["pull"][ci] if isinstance(DATA["pull"], list) else "357"[ci]
    room = {}
    rmax = 9 if z else 12
    for k in range(len(cols)):
        gl = xs[k] - (xs[k - 1] + widths[k - 1]) if k else 20
        gr = xs[k + 1] - (xs[k] + widths[k]) if k + 1 < len(cols) else 20
        e = max(0, min(rmax, (min(gl, gr) - 2) / 2))
        for i in cols[k]: room[i] = e
    minf = F14 if z else 4.4
    for i, n in nodes.items():
        x, w = pos[i]; yc = ypos[i]; y = yc - MH / 2; k = n["k"]
        txt = re.sub(r"(＿＿[^＿]?)", r'<span style="white-space:nowrap">\1</span>', E(n.get("text", "")))
        if k in "mgxf":
            if k in "mgx" and txt:
                h += (f'<div class="lab fit" data-min="{minf}" data-id="{soul} ch{ci+1} {i}" style="{at(x - room[i], y - LABH + .5, w + 2 * room[i], LABH - 1.5)}line-height:1.22;font-size:{mm(F14)};'
                      f'color:{"#9fe0e0" if k == "x" else "#f2e8d5"};display:flex;align-items:flex-end;justify-content:center;text-align:center"><div>{txt}</div></div>')
            if k in "mg":
                sy, nz, ne = SLOTS[n["slot"]]
                inner = f'<svg class="sym" style="font-size:{mm(9)};color:#e6d3a3"><use href="#{sy}"/></svg><div style="font-size:{mm(5.2)};color:#e6d3a3;margin-top:1mm">{E(L(nz, ne))}</div>'
                if k == "g": inner += f'<div style="font-size:{mm(F14)};color:#c9a45c;margin-top:.8mm">{E(L("關口", "Gate"))}</div>'
                ext = "border-style:solid;border-color:#c9a45c;background:rgba(60,46,20,.45)" if k == "g" else ""
            elif k == "x":
                inner = f'<div style="font-size:{mm(6)};color:#9fe0e0">⬡</div><div style="font-size:{mm(5.2 if z else F14)};color:#9fe0e0;line-height:1.1">{E(L("迷霧格", "Mist slot"))}</div>'
                ext = "border-color:rgba(95,208,214,.8);background:rgba(40,90,96,.28)"
            else:
                inner = (f'<div style="font-size:{mm(5)};color:#5fd0d6">◆</div><div style="font-size:{mm(5.2 if z else F14)};color:#5fd0d6;line-height:1.1">{E(L("轉折", "Turning point"))}</div>'
                         f'<div style="font-size:{mm(F14 if z else 4.4)};color:#cfc6b2;margin-top:1.2mm;line-height:1.22">{L(f"放命運之霧<br>忘川的拉力<br>遺忘 {pull} 張", f"Fate Mist here<br>Pull of Lethe:<br>{pull} forgotten")}</div>')
                ext = "border-style:solid;border-color:#5fd0d6;background:rgba(20,60,66,.45)"
            h += slot(x, y, w, MH, None, 1, inner, ext)
        elif k == "p":
            h += f'<div class="a" style="{at(x + w / 2 - 4, yc - 4, 8, 8)}border:.4mm solid #e6d3a3;transform:rotate(45deg);background:rgba(14,12,17,.6)"></div>'
            h += f'<div class="lab" style="{at(x - room[i], yc + 6, w + 2 * room[i])}line-height:1.22;font-size:{mm(F14 if z else 4.6)};text-align:center;color:#e6d3a3">{txt}</div>'
        else:
            h += (f'<div class="lab fit" data-min="{minf - .4}" data-id="{soul} exit {i}" style="{at(x, yc - 26, w, 52)}line-height:1.22;font-size:{mm(F14 if z else 4.6)};color:#f2e8d5;border:.35mm solid rgba(230,211,163,.55);'
                  f'border-radius:6mm;padding:1.4mm;display:flex;align-items:center;background:rgba(14,12,17,.55)"><div>⬭&nbsp;{txt}</div></div>')
    tx = 10
    h += lab(tx, 7, L(f"第{'一二三'[ci]}章", f"Chapter {ci + 1}"), 5.2, "#c9a45c") + lab(tx, 14, ch["title"], 9.5, "#f2e8d5", textw, extra=f"font-family:{DISPLAY[L.code]}")
    TN = [L("執念", "Obsession"), L("釋懷", "Acceptance"), L("忘卻", "Oblivion")]
    if isinstance(ent, str):
        et = E(ent)
    else:
        et = "<br>".join(f'<b style="color:{TCOL[int(t)]}">{TN[int(t)]}</b>{"　" if z else " — "}{E(s)}' for t, s in ent.items())
    h += lab(tx, 34, (f'<span style="color:#c9a45c">{E(L("入口（依前一章走的絲線）", "Entry (by the thread the last chapter took)"))}</span><br>' if isinstance(ent, dict) else "") + et,
             F14, "#f2e8d5", textw, raw=True, extra="line-height:1.45")
    return spread_pages(h, art(DATA["soulPaint"][soul][ci], 3000), SHADE_SPREAD)


# ---------------------------------------------------------------- the other pages
def single(inner, bg, shade, bgpos="center"):
    return board_page(PW, PH, inner, bg, shade, bgpos)


def cover(L, soul):
    """The Soul's portrait fills the cover; the words sit in the lower part, clear of the figure's head."""
    S = DATA["souls"][soul]
    p = S["prologue"][L.code]
    h = (f'<div class="a" style="{at(14, 14, PW - 28, PH - 28)}border:.5mm solid rgba(201,164,92,.7);border-radius:3mm"></div>'
         f'<div class="a disp" style="{at(0, 196, PW)}text-align:center;font-size:{mm(12 if L.code == "zh" else 10)};color:#e6d3a3;letter-spacing:.2em">{E(L("憶念之書", "Book of Remembrance"))}</div>'
         f'<div class="a" style="{at(0, 213, PW)}text-align:center;font-size:{mm(7)};color:#f2e8d5">{E(S["name"][L.code])}</div>'
         f'<div class="a" style="{at(30, 230, PW - 60)}text-align:center;font-size:{mm(F14)};font-style:italic;color:#e6d3a3;line-height:1.5">{E(p["motto"])}</div>'
         f'<div class="a disp" style="{at(0, 260, PW)}text-align:center;font-size:{mm(4)};color:#a29c93;letter-spacing:.3em">{E(L("彼岸花渡", "NETHERBLOOM"))}</div>')
    return single(h, art(DATA["soulArt"][soul], 3000), "linear-gradient(rgba(14,12,17,.15),rgba(14,12,17,0) 40%,rgba(14,12,17,.55) 64%,rgba(14,12,17,.9) 78%,rgba(14,12,17,.95))", "center 12%")


def how_to(L, soul):
    z = L.code == "zh"
    S = DATA["souls"][soul]
    items = [("nb-slot-person", "#e6d3a3", L("記憶格", "Memory slot"), L("銘刻：放入一張記憶牌，朗讀格子上方的句子，空格「＿＿」說出牌上的記憶。金框是關口。", "Inscribe: lay a Memory card here, read the sentence above it aloud and fill the blank ＿＿ with the card's memory. A gold frame is a Gate.")),
             (None, "#9fe0e0", L("迷霧格 ⬡", "Mist slot ⬡"), L("放入翻開的迷霧牌，它成為霧痕。", "Lay the revealed Mist card here; it becomes a mist scar.")),
             (None, "#5fd0d6", L("轉折 ◆", "Turning point ◆"), L("放上先達成條件的命運之霧。路線依它的絲線分岔；遺忘堆達到忘川的拉力時，改走忘卻。", "Lay the first Fate Mist whose condition is met here. The route branches by its thread; when the forgotten pile reaches the Pull of Lethe, it takes Oblivion instead.")),
             (None, "#e6d3a3", L("岔路 ◇", "Fork ◇"), L("由玩家選擇往哪一條路。", "The players choose which way to go.")),
             (None, "#f2e8d5", L("出口 ⬭", "Exit ⬭"), L("走到出口時，朗讀出口的文字，翻到下一章。", "At an exit, read its words aloud and turn to the next chapter."))]
    h = f'<div class="ttl" style="{at(20, 20)}font-size:{mm(8)}">{E(L("如何使用這本書", "How to use this Book"))}</div>'
    y = 40
    for sy, col, t, d in items:
        h += f'<div class="lab" style="{at(20, y, 200)}font-size:{mm(F14 + .6)};color:{col}">{E(t)}</div>'
        h += f'<div class="lab" style="{at(20, y + 7.5, 200)}font-size:{mm(F14)};line-height:1.5;color:#f2e8d5">{E(d)}</div>'
        y += 33 if len(d) > (38 if z else 85) else 24
    h += (f'<div class="lab" style="{at(20, y + 4, 200)}font-size:{mm(F14)};line-height:1.5;color:#cfc6b2">'
          f'{E(L("卡牌放進格子時，句子仍然看得見。遊戲結束時，從第一章的入口一路朗讀到第三章的出口。", "The sentences stay visible when a card lies in its slot. When the game ends, read from the first chapter's entry to the third chapter's exit."))}</div>')
    h += (f'<div class="a" style="{at(20, 226, 200, .3)}background:rgba(201,164,92,.6)"></div>'
          f'<div class="lab" style="{at(20, 231, 200)}font-size:{mm(F14)};color:#c9a45c">{E(S["name"][L.code])}</div>'
          f'<div class="lab" style="{at(20, 239, 200)}font-size:{mm(F14)};line-height:1.45;color:#f2e8d5">{E(S["trait"][L.code])}</div>')
    return single(h, art("tex-bank", 3000), "linear-gradient(rgba(14,12,17,.78),rgba(14,12,17,.86))")


def prologue(L, soul):
    z = L.code == "zh"
    S = DATA["souls"][soul]
    p = S["prologue"][L.code]
    paras = "".join('<p style="text-align:center;margin:2mm 0">◇</p>' if t == "—" else f'<p style="text-indent:{"2em" if z else "1.2em"};margin:0 0 {"1.2mm" if z else ".6mm"}">{E(t)}</p>' for t in p["paras"])
    h = (f'<div class="lab" style="{at(20, 16)}font-size:{mm(5.2)};color:#c9a45c">{E(L("序章", "Prologue"))}</div>'
         f'<div class="lab disp" style="{at(20, 23, 200)}font-size:{mm(8)};color:#f2e8d5">{E(S["name"][L.code])}</div>'
         f'<div class="lab" style="{at(20, 36, 200)}font-size:{mm(F14)};font-style:italic;color:#e6d3a3">{E(p["motto"])}</div>'
         f'<div class="lab fit" data-min="4.2" data-id="prologue {soul}" style="{at(20, 48, 200, 222)}font-size:{mm(F14)};line-height:{1.6 if z else 1.38};color:#f2e8d5;text-align:justify">{paras}</div>')
    return single(h, art(DATA["soulPaint"][soul][0], 3000), "linear-gradient(rgba(14,12,17,.8),rgba(14,12,17,.88))")


def far_shore(L, soul):
    z = L.code == "zh"
    S = DATA["souls"][soul]
    named = soul != "open"
    steps = [L("守岸人之問：所有玩家亮出託付卡。完成的張數達到設定表的要求，你們獲勝；否則落敗。", "The keeper's question: everyone shows their Commission card. If enough are complete for the set-up table, you win; otherwise you lose."),
             L("隱憶之約解除：所有玩家可以展示手牌、說出牌上的一切。", "The pact of hidden memories ends: everyone may show their hand and say anything on it."),
             L("朗讀這本書：從第一章的入口讀到第三章的出口。空的記憶格讀作「……但這一段，已經被河水帶走了。」迷霧格只在有霧痕時才讀；已關閉的路不讀。即使落敗也要朗讀。",
               "Read this Book aloud from the first chapter's entry to the third chapter's exit. Read an empty memory slot as \"…but this part the river has carried away.\" Read a mist slot only if it holds a mist scar; skip closed paths. Read it even if you lost."),
             L("結局：只在獲勝時朗讀，依右頁的順序。", "The ending: only if you won, in the order on the right-hand page.")]
    left = f'<div class="ttl" style="{at(20, 18)}font-size:{mm(9)}">{E(L("彼岸", "The Far Shore"))}</div>'
    left += f'<div class="lab" style="{at(20, 33, 196)}font-size:{mm(F14)};color:#cfc6b2">{E(L("亡魂抵達彼岸時，依序：", "When the soul reaches the Far Shore, in order:"))}</div>'
    y = 45
    for i, s in enumerate(steps):
        left += f'<div class="lab" style="{at(20, y, 196)}font-size:{mm(F14)};line-height:1.5;color:#f2e8d5"><b style="color:#c9a45c">{i + 1}.</b> {E(s)}</div>'
        y += (math.ceil(len(s) / (39 if z else 78)) * F14 * 1.5) + 6
    rx = PW + 24
    right = f'<div class="ttl" style="{at(rx, 18)}font-size:{mm(7)}">{E(L("結局的朗讀", "Reading the ending"))}</div>'
    y = 34
    def para(t, color="#f2e8d5", size=F14, italic=False):
        nonlocal right, y
        right += f'<div class="lab" style="{at(rx, y, 192)}font-size:{mm(size)};line-height:1.45;color:{color};{"font-style:italic" if italic else ""}">{E(t)}</div>'
        y += math.ceil(len(t) / ((192 / (size * 1.02)) if z else (192 / (size * .5)))) * size * 1.45 + 2.5
    if named:
        para(L("1. 結局牌：兩章以上走同一條絲線時，朗讀那條絲線的結局牌；三章都不同時，朗讀交織結局。隱藏結局的條件全部符合時，改讀隱藏結局。",
               "1. Ending card: if two or more chapters took the same thread, read that thread's ending card; if all three differ, read the Interwoven ending. If every condition of the hidden ending is met, read it instead."))
    para(L(("2. " if named else "1. ") + "順命或逆命：數一數 ◆ 上的命運之霧和實際走的路不同的章數。", ("2. " if named else "1. ") + "Fate obeyed or defied: count the chapters whose path differs from the Fate Mist on its ◆."))
    fl = S["fatelines"][L.code]
    if fl:
        para(L("從未違抗：", "Never defied: ") + fl[0], "#e6d3a3", italic=True)
        para(L("違抗 1 次以上：", "Defied once or more: ") + fl[1], "#e6d3a3", italic=True)
    kl = S["keylines"][L.code]
    if kl:
        y += 2
        para(L("3. 關鍵記憶的結尾，三選一：", "3. The key memory's last line, one of three:"))
        for lbl, t in zip([L("銘刻在書上：", "Inscribed in the Book: "), L("在遺忘堆中：", "In the forgotten pile: "), L("在其他地方（未曾說出）：", "Anywhere else (never spoken): ")], kl):
            para(lbl + t, "#e6d3a3", italic=True)
        para(L("關鍵記憶永遠不會被河水帶走。", "The key memory is never carried away by the river."), "#a29c93")
    if not named:
        para(L("無名的亡魂沒有結局牌。這本書上你們寫下的一切，就是祂的故事。", "The nameless soul has no ending cards. All that you wrote in this Book is its story."), "#cfc6b2")
    return spread_pages(left + right, art(DATA["soulPaint"][soul][2], 3000), "linear-gradient(90deg,rgba(14,12,17,.82),rgba(14,12,17,.86))", "center")


def back_cover(L, soul):
    S = DATA["souls"][soul]
    h = (f'<div class="a disp" style="{at(0, 120, PW)}text-align:center;font-size:{mm(9 if L.code == "zh" else 8)};color:#e6d3a3;letter-spacing:.25em">{E(L("彼岸花渡", "NETHERBLOOM"))}</div>'
         f'<div class="a" style="{at(0, 136, PW)}text-align:center;font-size:{mm(F14)};color:#cfc6b2">{E(L("憶念之書", "Book of Remembrance"))} · {E(S["name"][L.code])}</div>')
    return single(h, art("back-memory", 3000), "linear-gradient(rgba(14,12,17,.7),rgba(14,12,17,.7))")


def book(L, soul):
    pages = [cover(L, soul), how_to(L, soul), prologue(L, soul)]
    for ci in range(3):
        pages += chapter_spread(L, soul, ci)
    pages += far_shore(L, soul)
    pages.append(back_cover(L, soul))
    return pages            # 3 single pages, 4 spreads, 1 single page = 12 pages


LABELS = ["cover", "how to use the Book", "prologue", "ch1 left", "ch1 right", "ch2 left", "ch2 right", "ch3 left", "ch3 right", "Far Shore left", "Far Shore right", "back cover"]


def build(L):
    out = []
    for soul in DATA["soulOrder"]:
        pages = book(L, soul)
        singles = [p for p in pages if not isinstance(p, tuple)]
        spreads = [p[1] for p in pages if isinstance(p, tuple)]
        out.append((f"books/_parts/{soul}-pages.pdf", PW, PH, singles, [], "part"))
        out.append((f"books/_parts/{soul}-spreads.pdf", W, PH, spreads, [], "part"))
    return out


def post(L, d, plan):
    """Puts each Book together in reading order: cover, how-to, prologue, the spreads cut in two, back cover."""
    import pymupdf, shutil
    MMP = 72 / 25.4
    keep = [p for p in plan if not p["path"].startswith("books/_parts/")]
    for soul in DATA["soulOrder"]:
        a = pymupdf.open(os.path.join(d, f"books/_parts/{soul}-pages.pdf"))
        b = pymupdf.open(os.path.join(d, f"books/_parts/{soul}-spreads.pdf"))
        out = pymupdf.open()
        pw, ph = (PW + 2 * BLEED) * MMP, (PH + 2 * BLEED) * MMP
        def add_single(i):
            p = out.new_page(width=pw, height=ph); p.show_pdf_page(p.rect, a, i, clip=pymupdf.Rect(0, 0, pw, ph))
        def add_half(i, side):
            p = out.new_page(width=pw, height=ph)
            x0 = side * PW * MMP
            p.show_pdf_page(p.rect, b, i, clip=pymupdf.Rect(x0, 0, x0 + pw, ph))
        for i in range(3): add_single(i)
        for i in range(4): add_half(i, 0); add_half(i, 1)
        add_single(3)
        assert len(out) == 12
        f = f"books/book-of-remembrance-{soul}.pdf"
        out.save(os.path.join(d, f), garbage=3, deflate=True)
        nm = DATA["souls"][soul]["name"]["en"]
        keep.append({"path": f, "trim": [PW, PH], "sides": "12 pages, reader order, saddle-stitched", "labels": [f"{nm} p.{i + 1} {t}" for i, t in enumerate(LABELS)], "part": "books"})
    shutil.rmtree(os.path.join(d, "books", "_parts"), ignore_errors=True)
    return keep
