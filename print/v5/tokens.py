# Tokens and markers: round, 2 mm greyboard, double-sided. Drawn from the same icons as the rulebook
# (docs/rules/icons), on a disc that runs into the bleed. One token per page; fronts and backs in two PDFs, same order.
import re
from common import *

# (name, count, diameter, front icon, back icon or None for the same face, zh, en)
TOKENS = [
    ("root-bloom", 24, 18, "root", "bloom", "根／花", "Root / Bloom"),
    ("shade", 8, 18, "shade", None, "怨念", "Shade"),
    ("black-water", 7, 18, "blackwater", None, "黑水", "Black Water"),
    ("knot-obsession", 1, 18, "knot-obsession", None, "結標記・執念", "Knot · Obsession"),
    ("knot-acceptance", 1, 18, "knot-acceptance", None, "結標記・釋懷", "Knot · Acceptance"),
    ("knot-oblivion", 1, 18, "knot-oblivion", None, "結標記・忘卻", "Knot · Oblivion"),
    ("scar", 3, 18, "scar", None, "傷疤標記", "Scar"),
    ("light", 1, 18, "light", None, "光標記", "Light"),
    ("fracture", 1, 18, "fracture", None, "裂痕標記", "Fracture"),
    ("forgotten", 1, 18, "forgotten", None, "遺忘標記", "Forgotten"),
    ("fog", 2, 18, "fog", None, "霧標記", "Fog"),
    ("echo", 1, 25, "echo", None, "迴響標記", "Echo"),
    ("oar", 1, 25, "oar", None, "船槳", "Oar"),
    ("soul-ghost", 1, 25, "soul", "soul:ghost", "亡魂／幽靈", "Soul / Ghost"),
    ("push-through", 4, 25, "push", "push:spent", "破浪", "Push Through"),
    ("hold-fast", 1, 25, "hold", None, "堅守", "Hold Fast"),
    ("shield", 1, 25, "shield", None, "護盾", "Shield"),
    ("resignation", 1, 25, "resign", None, "認命", "Resignation"),
    ("root-trait", 1, 25, "trait-deep", "trait-spread", "根網特性（根深／花開蔓延）", "Root trait (Deep Roots / Spreading Bloom)"),
]


def disc(name):
    """The icon's disc colour and the icon without its black edge (the cut is the edge)."""
    s = open(os.path.join(ICONS, name + ".svg"), encoding="utf-8").read()
    m = re.search(r'<(circle|rect)[^>]*fill="([^"]+)"', s)
    fill = m.group(2)
    s = re.sub(r'(<(?:circle|rect)[^>]*?) stroke="#000" stroke-width="[^"]+"', r"\1", s, count=1)
    return fill, "data:image/svg+xml;utf8," + s.replace("#", "%23").replace('"', "'").replace("\n", " ")


def face(L, icon, d):
    variant = None
    if ":" in icon:
        icon, variant = icon.split(":")
    fill, uri = disc(icon)
    S = d * 48 / 46                       # the icon drawn so its disc is exactly the cut
    off = BLEED + d / 2 - S / 2
    filt = "filter:grayscale(1) brightness(.6);" if variant in ("spent", "ghost") else ""
    h = f'<div class="a" style="inset:0;background:{fill};{filt}"></div><img class="ico" src="{uri}" style="{at(off, off, S, S)}{filt}">'
    if variant == "ghost":
        h += f'<div class="lab" style="{at(BLEED, BLEED + d * .7, d)}text-align:center;font-size:{mm(2.4)};color:#e6e6e6">{E(L("幽靈", "Ghost"))}</div>'
    if variant == "spent":
        h += f'<div class="lab" style="{at(BLEED, BLEED + d * .72, d)}text-align:center;font-size:{mm(2.2)};color:#ddd">{E(L("已用", "Spent"))}</div>'
    return h


def shape(icon):
    s = open(os.path.join(ICONS, icon.split(":")[0] + ".svg"), encoding="utf-8").read()
    return "rounded square (corner radius 19 %)" if re.search(r"<svg[^>]*>\s*<rect", s) else "round"


def build(L):
    out = []
    for d in (18, 25):
        items = [t for t in TOKENS if t[2] == d]
        fronts, backs, labels = [], [], []
        for name, n, _, f, b, zh, en in items:
            for i in range(n):
                fronts.append(face(L, f, d)); backs.append(face(L, b or f, d)); labels.append(f"{name} {i + 1}/{n}, {shape(f)} die-cut")
        out.append((f"tokens/tokens-{d}mm-fronts.pdf", d, d, fronts, labels, f"die-cut {d} mm (round, or rounded square where the label says), 2 mm greyboard; backs in tokens-{d}mm-backs.pdf, same order", "html,body{background:#000}"))
        out.append((f"tokens/tokens-{d}mm-backs.pdf", d, d, backs, [l + " back" for l in labels], "backs, same order as the fronts", "html,body{background:#000}"))
    return out
