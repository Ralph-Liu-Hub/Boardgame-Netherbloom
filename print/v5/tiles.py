# Bank tiles: 37 squares of 40 x 40 mm, 2 mm greyboard. Fronts in one PDF, fog sides in another, same order.
# Each tile carries its pool (Reach I / II / III, Grave, or spare) on both sides so the pools can be sorted at set-up;
# the fog side shows its symbol (earth-grain, rock-grain, soul-flame), whose make-up each river board prints.
from common import *
from boards import fog_symbol_svg

SIZE = 40
ART = {"fertile": ("card-bank-fertile", False), "stony": ("card-bank-stony", False), "spring": ("card-bank-memory", False), "grave": ("card-bank-grave", False),
       "field": ("flower-field", True), "frost": ("frost", True), "ember": ("ember", True), "echo": ("echo-rock", True)}
ICON = {"fertile": "root", "stony": None, "spring": "root", "grave": "shade", "field": "bloom", "frost": "fog", "ember": "light", "echo": "echo"}


def tiles():
    T = DATA["tiles"]
    out = []
    for r, p in enumerate(T["pools"]):
        for k, n in p["pool"].items():
            out += [(k, ["Ⅰ", "Ⅱ", "Ⅲ"][r])] * n
    out += [("grave", "grave")] * T["graves"]
    for k, n in T["spares"].items():
        out += [(k, "spare")] * n
    return out


def pool_mark(L, pool):
    return {"grave": L("墳墓", "Grave"), "spare": L("備用", "Spare")}.get(pool, pool)


def front(L, kind, pool):
    z = L.code == "zh"
    K = DATA["tiles"]["kinds"][kind]
    a, c = ART[kind]
    s = SIZE
    return (f'<div class="bg" style="background-image:url({art(a, 900, concept=c)})"></div>'
            f'<div class="a" style="{at(0, 0, s + 2*BLEED, s + 2*BLEED)}background:linear-gradient(rgba(14,12,17,.15) 30%,rgba(14,12,17,.9) 62%)"></div>'
            f'<div class="trim" style="{at(BLEED, BLEED, s, s)}">'
            f'<div class="a" style="{at(1.8, 1.8, s - 3.6, s - 3.6)}border:.3mm solid rgba(201,164,92,.6);border-radius:1.5mm"></div>'
            f'<div class="lab" style="{at(2.6, 2.4, 12)}font-size:{mm(2.3)};color:#c9a45c">{E(pool_mark(L, pool))}</div>'
            f'<div class="lab disp" style="{at(2.5, 19.5, s - 5)}text-align:center;font-size:{mm(3.5 if z else 3.1)};font-weight:700;color:#f2e8d5">{E(L(K["zh"], K["en"]))}</div>'
            f'<div class="lab fit" data-min="1.7" data-id="tile {kind}" style="{at(3, 24.5, s - 6, 12.5)}text-align:center;font-size:{mm(2.4 if z else 2.15)};line-height:1.25;color:#e6d3a3">{E(L(K["tz"], K["te"]))}</div></div>')


def back(L, kind, pool):
    s = SIZE
    return (f'<div class="bg" style="background-image:url({art("card-fog", 900)})"></div>'
            f'<div class="a" style="{at(0, 0, s + 2*BLEED, s + 2*BLEED)}background:radial-gradient(rgba(14,12,17,.65) 25%,rgba(14,12,17,.2) 70%)"></div>'
            f'<div class="trim" style="{at(BLEED, BLEED, s, s)}">'
            f'<div class="a" style="{at(1.8, 1.8, s - 3.6, s - 3.6)}border:.3mm dashed rgba(201,164,92,.6);border-radius:1.5mm"></div>'
            f'<div class="a" style="{at(s/2 - 9, s/2 - 10, 18, 18)}">{fog_symbol_svg(kind, 18)}</div>'
            f'<div class="lab" style="{at(0, 30.5, s)}text-align:center;font-size:{mm(2.6)};color:#e6d3a3">{E(pool_mark(L, pool))}</div></div>')


def build(L):
    t = tiles()
    assert len(t) == 37, len(t)
    labels = [f"{k} ({pool})" for k, pool in t]
    return [("tiles/bank-tiles-fronts.pdf", SIZE, SIZE, [front(L, k, p) for k, p in t], labels, "fronts; fog sides in bank-tiles-fog-side.pdf, same order; die-cut 40 x 40, 2 mm greyboard"),
            ("tiles/bank-tiles-fog-side.pdf", SIZE, SIZE, [back(L, k, p) for k, p in t], [l + " fog side" for l in labels], "fog sides, same order as the fronts")]
