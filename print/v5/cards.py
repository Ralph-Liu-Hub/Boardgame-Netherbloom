# The cards. Memory, Mist and Fate Mist cards are mini cards (41 x 63 mm) because they go into the Book of
# Remembrance; Commission, ending, Soul, Mantle and Ghost cards are standard (63 x 88 mm).
# One card per page in deck order. A deck with one shared back has it in card-backs-*.pdf; a deck whose backs differ
# (Mist, Fate Mist, ending, Mantle) has a backs PDF in the same order as its fronts.
from common import *

MINI = (41, 63)
STD = (63, 88)
TC = ["#e0525c", "#f0d9a0", "#5fd0d6"]
TSYM = ["nb-obsession", "nb-acceptance", "nb-oblivion"]

CSS = """
.card { position: absolute; inset: 0; background: #16131a; }
.card .art { position: absolute; left: 0; right: 0; top: 0; background-size: cover; background-position: center 30%; }
.card .art::after { content: ""; position: absolute; inset: 0; background: linear-gradient(rgba(22,19,26,0) 55%, #16131a); }
.card .body { position: absolute; display: flex; flex-direction: column; overflow: hidden; }
.card .title { display: flex; align-items: center; gap: .9mm; font-weight: 700; color: var(--paper); line-height: 1.1 }
.card .meta { display: flex; align-items: center; gap: .8mm; color: var(--bone); opacity: .9; line-height: 1.2 }
.card .quote { font-style: italic; color: #d9cdb4; line-height: 1.3 }
.card .eff { color: var(--paper); line-height: 1.32 }
.card .res { color: var(--paper); line-height: 1.3; border-top: .25mm solid rgba(230,211,163,.35); }
.card .res b { display: block; font-weight: 700; letter-spacing: .05em }
.card .key { margin-left: auto; font-size: .8em; color: #16131a; background: var(--gold); border-radius: 1mm; padding: .1mm .9mm; font-weight: 700 }
.card .frame { position: absolute; border: .3mm solid rgba(201,164,92,.55); border-radius: 2mm; pointer-events: none }
.back { position: absolute; inset: 0; background-size: cover; background-position: center; }
.backtxt { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--paper) }
"""


def card_page(size, art_url, art_h, thread, body, art_pos="center 30%"):
    """A card face: the painting runs into the bleed at the top; `body` is laid out inside the 2.6 mm safe area."""
    w, h = size
    col = TC[thread] if thread is not None else "#c9a45c"
    s = 2.6
    return (f'<div class="card"><div class="art" style="height:{mm(art_h + BLEED)};background-image:url({art_url});background-position:{art_pos}"></div>'
            f'<div class="a" style="{at(0, art_h + BLEED - .2, w + 2*BLEED, .5)}background:{col};opacity:.85"></div>'
            f'<div class="frame" style="{at(BLEED + 1.4, BLEED + 1.4, w - 2.8, h - 2.8)}"></div>'
            f'<div class="body" style="{at(BLEED + s, BLEED + art_h + 1.2, w - 2*s, h - art_h - 1.2 - s)}">{body}</div></div>')


def T(L, d, key):
    return d[key][L.code] if isinstance(d[key], dict) else d[key]


# ---------------------------------------------------------------- Memory (mini)
def memory(L, c):
    z = L.code == "zh"
    th = DATA["threads"][c["tag"]]; slot = DATA["slots"].get(c["slot"]) if c["slot"] else None
    title = f'<div class="title" style="font-size:{mm(3.3 if z else 3)}">{sym(TSYM[c["tag"]], TC[c["tag"]], 3.4)}<span>{E(T(L, c, "name"))}</span>' + \
            (f'<span class="key">{E(L("關鍵", "Key"))}</span>' if c["key"] else "") + "</div>"
    meta = f'<div class="meta" style="font-size:{mm(2.4)};margin-top:.6mm">' + (sym(slot["icon"], "#e6d3a3", 2.8) + E(L(slot["zh"], slot["en"])) if slot else E(L("無欄位", "No slot"))) + \
           f'<span style="margin-left:auto;color:{TC[c["tag"]]}">{E(L(th["zh"], th["en"]))}</span></div>'
    band = T(L, c, "band")
    quote = f'<div class="quote" style="font-size:{mm(2.35 if z else 2.25)};margin-top:.8mm">「{E(band)}」</div>' if band and z else (f'<div class="quote" style="font-size:{mm(2.25)};margin-top:.8mm">“{E(band)}”</div>' if band else "")
    res_label = L("共鳴", "Resonance") + (L("（改為）", " (instead)") if c["rr"] else "")
    body = (title + meta + quote +
            f'<div class="fit" data-min="1.9" data-id="{c["id"]}" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;font-size:{mm(2.75 if z else 2.5)};min-height:0">'
            f'<div class="eff">{E(T(L, c, "eff"))}</div>'
            f'<div class="res" style="margin-top:1mm;padding-top:.8mm"><b style="color:{TC[c["tag"]]};font-size:.85em">{E(res_label)}</b>{E(T(L, c, "res"))}</div></div>')
    return card_page(MINI, art(c["art"], 900), 24, c["tag"], body)


def back_memory(L):
    return f'<div class="back" style="background-image:url({art("back-memory", 900)})"></div>'


# ---------------------------------------------------------------- Mist (mini, every back different)
def mist(L, m):
    z = L.code == "zh"
    th = m["th"]
    name = L(m["zh"], m["en"])
    deck = L("凶霧", "Harsh Mist") if m["harsh"] else L(DATA["deckNames"][m["deck"]]["zh"], DATA["deckNames"][m["deck"]]["en"])
    a = art("card-harsh", 900) if m["harsh"] else art(f"card-mist-{m['deck'] + 1}", 900)
    title = f'<div class="title" style="font-size:{mm(3.3 if z else 3)}">' + (sym(TSYM[th], TC[th], 3.4) if th is not None else '<span style="color:#c9a45c">◇</span>') + f'<span>{E(name)}</span></div>'
    meta = (f'<div class="meta" style="font-size:{mm(2.4)};margin-top:.6mm"><span>{E(L("霧勢", "Fog"))} <b style="font-size:1.3em">{m["fog"]}</b></span>'
            f'<span style="margin-left:auto;{"color:#e0525c" if m["harsh"] else ""}">{E(deck)}</span></div>')
    body = title + meta + f'<div class="fit eff" data-min="1.9" data-id="{m["key"]}" style="flex:1;margin-top:1.4mm;font-size:{mm(2.8 if z else 2.55)}">{E(L(m["tz"], m["te"]))}</div>'
    return card_page(MINI, a, 26, th, body)


def mist_back(L, m):
    th = m["th"]
    mark = sym(TSYM[th], TC[th], 9) if th is not None else '<span style="font-size:8mm;color:#c9a45c">◇</span>'
    w, h = MINI
    return (f'<div class="back" style="background-image:url({art("back-mist", 900)})"></div>'
            f'<div class="backtxt" style="{at(BLEED + 8, BLEED + 18, w - 16, 27)}background:radial-gradient(rgba(10,12,16,.85) 40%,rgba(10,12,16,0) 72%);border-radius:50%">'
            f'{mark}<b style="font-size:{mm(7)};line-height:1;margin-top:.6mm">{m["fog"]}</b><small style="font-size:{mm(2.3)};color:#cfc6b2">{E(L("霧勢", "fog"))}</small></div>')


# ---------------------------------------------------------------- Fate Mist (mini, two different sides)
def fate(L, soul, f):
    z = L.code == "zh"
    d = f[L.code]; th = d["thread"]
    a = art(DATA["soulPaint"][soul][f["chapter"]], 900)
    title = f'<div class="title" style="font-size:{mm(3.1 if z else 2.8)}">{sym(TSYM[th], TC[th], 3.2)}<span>{E(d["name"])}</span></div>'
    eff = "<br>".join(E(e) for e in d["effects"])
    body = (title + f'<div class="fit" data-min="1.8" data-id="fate {soul}" style="flex:1;display:flex;flex-direction:column;font-size:{mm(2.6 if z else 2.3)};margin-top:1mm;min-height:0">'
            f'<div class="quote">{E(d["event"])}</div><div class="eff" style="margin-top:1mm">{eff}</div>'
            f'<div class="res" style="margin-top:auto;padding-top:.8mm"><b style="color:{TC[th]};display:inline;font-size:.9em">{E(L("分岔指向", "Points to"))}</b> {E(L(DATA["threads"][th]["zh"], DATA["threads"][th]["en"]))}</div></div>')
    return card_page(MINI, a, 20, th, body)


def fate_back(L, soul, f):
    z = L.code == "zh"
    d = f[L.code]; w, h = MINI
    kind = (L("河流條件", "River condition") if d["river"] else L("書上條件", "Book condition")) + " · " + L(f"第{'一二三'[f['chapter']]}章", f"Chapter {f['chapter'] + 1}")
    nm = DATA["souls"][soul]["name"][L.code]
    return (f'<div class="back" style="background-image:url({art(DATA["soulPaint"][soul][f["chapter"]], 900)});filter:brightness(.42) saturate(.6)"></div>'
            f'<div class="a" style="{at(BLEED + 1.4, BLEED + 1.4, w - 2.8, h - 2.8)}border:.3mm solid rgba(95,208,214,.6);border-radius:2mm"></div>'
            f'<div class="backtxt" style="{at(BLEED + 3, BLEED + 3, w - 6, h - 6)}justify-content:flex-start">'
            f'<div style="font-size:{mm(2.2)};color:#9fe0e0;letter-spacing:.04em">{E(L("命運之霧", "Fate Mist"))}</div>'
            f'<div style="font-size:{mm(2.3)};color:#cfc6b2;margin-top:.5mm">{E(kind)}</div>'
            f'<div class="fit" data-min="2" data-id="fate back {soul}" style="flex:1;display:flex;flex-direction:column;justify-content:center;font-size:{mm(3.2 if z else 2.8)};min-height:0;width:100%">'
            f'<div style="font-weight:700;color:var(--paper);line-height:1.3">{E(d["cond"])}</div>'
            f'<div style="font-style:italic;color:#d9cdb4;font-size:.78em;margin-top:2mm;line-height:1.3">{E(d["omen"])}</div></div>'
            f'<div style="font-size:{mm(2)};color:#a29c93">{E(nm)}</div></div>')


# ---------------------------------------------------------------- Commission (standard, shared back per Soul)
def commission(L, soul, k):
    z = L.code == "zh"
    d = k[L.code]
    nm = DATA["souls"][soul]["name"][L.code]
    q = f"「{d['text']}」" if z else f"“{d['text']}”"
    body = (f'<div class="title" style="font-size:{mm(4 if z else 3.6)}">{E(L("託付", "Commission"))}<span style="margin-left:auto;font-size:.6em;color:#cfc6b2;font-weight:400">{E(nm)}</span></div>'
            f'<div class="fit" data-min="2.2" data-id="comm" style="flex:1;display:flex;flex-direction:column;font-size:{mm(3.3 if z else 3)};min-height:0;margin-top:2mm">'
            f'<div class="quote" style="font-size:1.05em">{E(q)}</div>'
            f'<div class="res" style="margin-top:auto;padding-top:1.2mm"><b style="color:#c9a45c;font-size:.85em">{E(L("條件", "Condition"))}</b>{E(d["cond"])}</div></div>')
    return card_page(STD, art(DATA["soulArt"][soul], 1400), 48, None, body, "center 18%")


def commission_back(L):
    w, h = STD
    return (f'<div class="back" style="background-image:url({art("card-wish", 1400)});filter:brightness(.55)"></div>'
            f'<div class="a" style="{at(BLEED + 2, BLEED + 2, w - 4, h - 4)}border:.4mm solid rgba(201,164,92,.75);border-radius:2.5mm"></div>'
            f'<div class="backtxt disp" style="{at(BLEED, BLEED + 30, w, 28)}"><div style="font-size:{mm(8 if L.code == "zh" else 6.5)};color:#e6d3a3;letter-spacing:.2em;text-shadow:0 0 2mm #000">{E(L("託付", "Commission"))}</div>'
            f'<div style="font-size:{mm(2.6)};color:#cfc6b2;margin-top:1.5mm;text-shadow:0 0 1mm #000">{E(L("面朝下放在你面前", "Keep it face down in front of you"))}</div></div>')


# ---------------------------------------------------------------- Endings (standard, every back different)
ELABEL = lambda L, b: L("隱藏結局", "Hidden ending") if b == "hidden" else L("交織", "Interwoven") if b == "mix" else L(DATA["threads"][int(b)]["zh"], DATA["threads"][int(b)]["en"])


def ending(L, soul, b, e):
    z = L.code == "zh"
    th = int(b) if b not in ("mix", "hidden") else None
    body = (f'<div class="title" style="font-size:{mm(3.8 if z else 3.4)}">{E(e["title"])}</div>'
            f'<div class="meta" style="font-size:{mm(2.5)};margin-top:.6mm;color:{TC[th] if th is not None else "#c9a45c"}">{E(ELABEL(L, b))}</div>'
            f'<div class="fit quote" data-min="2" data-id="ending {soul} {b}" style="flex:1;font-style:normal;color:var(--paper);font-size:{mm(3 if z else 2.7)};margin-top:1.5mm;line-height:1.45">{E(e["text"])}</div>')
    return card_page(STD, art(DATA["soulPaint"][soul][2], 1400), 38, th, body)


def ending_back(L, soul, b, e):
    w, h = STD
    inner = f'<div class="disp" style="font-size:{mm(6.5 if L.code == "zh" else 5.5)};color:#e6d3a3;letter-spacing:.15em">{E(L("結局", "Ending"))}</div>'
    if b == "hidden":
        conds = "".join(f'<li>{E(c)}</li>' for c in e["conds"])
        inner += (f'<div style="font-size:{mm(2.6)};color:#c9a45c;margin-top:1mm">{E(L("隱藏結局：以下全部符合時朗讀", "Hidden ending: read it when all of these are true"))}</div>'
                  f'<ul class="fit" data-min="2" data-id="hidden {soul}" style="text-align:left;font-size:{mm(2.9 if L.code == "zh" else 2.6)};line-height:1.35;margin-top:2mm;padding-left:4mm;max-height:{mm(48)};overflow:hidden">{conds}</ul>')
    else:
        inner += f'<div style="font-size:{mm(3)};color:#cfc6b2;margin-top:1.5mm">{E(ELABEL(L, b))}</div>'
    nm = DATA["souls"][soul]["name"][L.code]
    return (f'<div class="back" style="background-image:url({art("back-soul", 1400)});filter:brightness(.5)"></div>'
            f'<div class="a" style="{at(BLEED + 2, BLEED + 2, w - 4, h - 4)}border:.4mm solid rgba(201,164,92,.75);border-radius:2.5mm"></div>'
            f'<div class="backtxt" style="{at(BLEED + 5, BLEED + 8, w - 10, h - 16)}background:radial-gradient(rgba(14,12,17,.88) 55%,rgba(14,12,17,0) 80%)">{inner}'
            f'<div style="font-size:{mm(2.2)};color:#a29c93;margin-top:2mm">{E(nm)}</div></div>')


# ---------------------------------------------------------------- Soul, Mantle, Ghost (standard)
def soul_card(L, s):
    z = L.code == "zh"
    S = DATA["souls"][s]
    key = S["keymem"][L.code]
    body = (f'<div class="title disp" style="font-size:{mm(4 if z else 3.6)}">{E(S["name"][L.code])}</div>'
            f'<div class="meta" style="font-size:{mm(2.5)};margin-top:.6mm">{E(L("亡魂", "Soul"))}<span style="margin-left:auto">{E(L("起始光", "Starting Light"))} {S["startLight"]}</span></div>'
            f'<div class="fit" data-min="2" data-id="soul {s}" style="flex:1;display:flex;flex-direction:column;font-size:{mm(2.9 if z else 2.6)};margin-top:1.5mm;min-height:0">'
            f'<div class="eff">{E(S["trait"][L.code])}</div>' +
            (f'<div class="res" style="margin-top:auto;padding-top:1mm"><b style="color:#c9a45c;font-size:.85em">{E(L("關鍵記憶", "Key memory"))}</b>{E(key)}</div>' if key else "") + "</div>")
    return card_page(STD, art(DATA["soulArt"][s], 1600), 50, None, body, "center 12%")


def back_soul(L):
    return f'<div class="back" style="background-image:url({art("back-soul", 1400)})"></div>'


MART = {"weaver": ("card-mantle-weaver", False), "warden": ("card-mantle-warden", False), "bringer": ("card-mantle-bringer", False),
        "breaker": ("card-mantle-breaker", False), "reaper": ("reaper", True)}


def appendix_mantles(L):
    """The Mantle texts as Appendix B of the Rulebook prints them: {name: (effect, when)}."""
    import re
    md = open(os.path.join(ROOT, "docs", "rules", *(("zh-TW", "V5", "Rulebook.md") if L.code == "zh" else ("en", "Rulebook.md"))), encoding="utf-8").read()
    sec = md[md.index("### 稱號牌" if L.code == "zh" else "### Mantle cards"):]
    sec = sec[:sec.index("\n### ", 5)]
    out = {}
    for row in re.findall(r"^\| \*\*(.+?)\*\*.*?\| (.+?) \| (.+?) \|$", sec, flags=re.M):
        out[row[0]] = (row[1], row[2])
    return out


def mantle(L, m):
    z = L.code == "zh"
    th = m["th"]
    a, c = MART[m["key"]]
    eff, when = appendix_mantles(L)[L(m["zh"], m["en"])]
    tn = L(DATA["threads"][th]["zh"], DATA["threads"][th]["en"])
    summon = L(f"召喚：支付 3 點光（國王的局 2 點），並棄 1 張{tn}手牌。", f"Summon: pay 3 Light (2 in the King's game) and discard 1 {tn} card from your hand.")
    body = (f'<div class="title disp" style="font-size:{mm(4 if z else 3.6)}">{sym(TSYM[th], TC[th], 4)}<span>{E(L(m["zh"], m["en"]))}</span></div>'
            f'<div class="meta" style="font-size:{mm(2.5)};margin-top:.6mm">{E(L("稱號", "Mantle"))}<span style="margin-left:auto;color:{TC[th]}">{E(tn)}</span></div>'
            f'<div class="fit" data-min="2" data-id="mantle {m["key"]}" style="flex:1;display:flex;flex-direction:column;font-size:{mm(2.9 if z else 2.6)};margin-top:1.6mm;min-height:0">'
            f'<div class="eff">{E(eff)}</div>'
            f'<div style="color:#cfc6b2;font-size:.85em;margin-top:1mm"><b style="color:{TC[th]}">{E(L("時機", "When"))}</b> {E(when)}</div>'
            f'<div class="res" style="margin-top:auto;padding-top:1mm;font-size:.88em">{E(summon)}</div></div>')
    return card_page(STD, art(a, 1600, concept=c), 44, th, body)


def back_mantle(L):
    """The Mantles' shared back (a used Mantle is turned sideways, not over)."""
    w, h = STD
    return (f'<div class="back" style="background-image:url({art("card-mantle-warden", 1600)});filter:grayscale(.6) brightness(.38)"></div>'
            f'<div class="a" style="{at(BLEED + 2, BLEED + 2, w - 4, h - 4)}border:.4mm solid rgba(201,164,92,.7);border-radius:2.5mm"></div>'
            f'<div class="backtxt disp" style="{at(BLEED, BLEED + 32, w, 24)}"><div style="font-size:{mm(8 if L.code == "zh" else 6.5)};color:#e6d3a3;letter-spacing:.2em;text-shadow:0 0 2mm #000">{E(L("稱號", "Mantle"))}</div></div>')


def ghost(L, g):
    z = L.code == "zh"
    th = g["th"]
    body = (f'<div class="title disp" style="font-size:{mm(4 if z else 3.6)}">{sym(TSYM[th], TC[th], 4)}<span>{E(L("幽靈", "Ghost"))}</span></div>'
            f'<div class="meta" style="font-size:{mm(2.5)};margin-top:.6mm">{E(L("單人模式", "Solo"))}<span style="margin-left:auto;color:{TC[th]}">{E(L(DATA["threads"][th]["zh"], DATA["threads"][th]["en"]))}</span></div>'
            f'<div class="fit eff" data-min="2.4" data-id="ghost" style="flex:1;font-size:{mm(3.6 if z else 3.3)};margin-top:3mm">{E(L(g["zh"], g["en"]))}</div>'
            f'<div style="font-size:{mm(2.4)};color:#a29c93">{E(L("然後在這條絲線打 1 個結，並把迴響標記移到這條絲線。", "Then knot this thread once and move the Echo marker to it."))}</div>')
    return card_page(STD, art("card-ghost", 1400), 48, th, body)


def back_ghost(L):
    return f'<div class="back" style="background-image:url({art("back-ghost", 1400)})"></div>'


def build(L):
    D = DATA
    out = []
    mem = D["memory"]
    out.append(("cards/memory-cards.pdf", *MINI, [memory(L, c) for c in mem], [f'{c["id"]} {c["name"][L.code]}' for c in mem], "fronts; one shared back (card-backs-mini.pdf p.1)", CSS))
    ms = D["mist"]
    out.append(("cards/mist-cards-fronts.pdf", *MINI, [mist(L, m) for m in ms], [f'{i+1:02d} {m[L.code]}' for i, m in enumerate(ms)], "fronts; backs in mist-cards-backs.pdf, same order", CSS))
    out.append(("cards/mist-cards-backs.pdf", *MINI, [mist_back(L, m) for m in ms], [f'{i+1:02d} back of {m["en"]}' for i, m in enumerate(ms)], "backs, same order as the fronts", CSS))
    fates = [(s, f) for s in D["soulOrder"] for f in D["souls"][s]["fates"]]
    out.append(("cards/fate-mist-event-side.pdf", *MINI, [fate(L, s, f) for s, f in fates], [f'{s} ch{f["chapter"]+1} {f[L.code]["name"]}' for s, f in fates], "event sides; condition sides in fate-mist-condition-side.pdf, same order", CSS))
    out.append(("cards/fate-mist-condition-side.pdf", *MINI, [fate_back(L, s, f) for s, f in fates], [f'{s} ch{f["chapter"]+1} condition' for s, f in fates], "condition sides, same order", CSS))
    out.append(("cards/card-backs-mini.pdf", *MINI, [back_memory(L)], [L("記憶牌背（72 張共用）", "Memory card back (all 72)")], "the Memory deck's back", CSS))
    comms = [(s, k) for s in D["soulOrder"] for k in D["souls"][s]["commissions"]]
    out.append(("cards/commission-cards.pdf", *STD, [commission(L, s, k) for s, k in comms], [f'{s} commission {i % 8 + 1}' for i, (s, k) in enumerate(comms)], "fronts; one shared back (card-backs-standard.pdf p.1)", CSS))
    ends = [(s, e["kind"], e[L.code]) for s in D["soulOrder"] if s != "open" for e in D["souls"][s]["endings"]] + \
           [(s, "hidden", D["souls"][s]["hidden"][L.code]) for s in D["soulOrder"] if s != "open" and D["souls"][s]["hidden"]]
    ends.sort(key=lambda x: D["soulOrder"].index(x[0]))
    out.append(("cards/ending-cards-fronts.pdf", *STD, [ending(L, s, b, e) for s, b, e in ends], [f'{s} ending {b}' for s, b, e in ends], "fronts; backs in ending-cards-backs.pdf, same order", CSS))
    out.append(("cards/ending-cards-backs.pdf", *STD, [ending_back(L, s, b, e) for s, b, e in ends], [f'{s} ending {b} back' for s, b, e in ends], "backs, same order", CSS))
    out.append(("cards/soul-cards.pdf", *STD, [soul_card(L, s) for s in D["soulOrder"]], [f"soul {s}" for s in D["soulOrder"]], "fronts; one shared back (card-backs-standard.pdf p.2)", CSS))
    out.append(("cards/mantle-cards.pdf", *STD, [mantle(L, m) for m in D["mantles"]], [f'mantle {m["key"]}' for m in D["mantles"]], "fronts; one shared back (card-backs-standard.pdf p.4)", CSS))
    out.append(("cards/ghost-cards.pdf", *STD, [ghost(L, g) for g in D["ghost"]], [f"ghost {i+1}" for i in range(len(D["ghost"]))], "fronts; one shared back (card-backs-standard.pdf p.3)", CSS))
    out.append(("cards/card-backs-standard.pdf", *STD, [commission_back(L), back_soul(L), back_ghost(L), back_mantle(L)],
                [L("託付卡背（40 張共用）", "Commission back (all 40)"), L("亡魂牌背（5 張共用）", "Soul back (all 5)"), L("幽靈牌背（12 張共用）", "Ghost back (all 12)"),
                 L("稱號牌背（5 張共用）", "Mantle back (all 5)")], "shared backs", CSS))
    return out
