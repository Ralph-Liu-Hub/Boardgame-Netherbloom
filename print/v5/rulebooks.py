# The Rulebook and the Solo Rulebook (210 x 280 mm, saddle-stitched) and the Player Aid (A5), from the same Markdown as
# the web table's rule drawer (docs/rules). The text flows over as many pages as it needs; post() numbers the pages and
# pads each saddle-stitched book with Notes pages to a multiple of 4.
import os, re, base64
import markdown
from common import *

SRC = {"zh": {"rulebook": ("zh-TW", "V5", "Rulebook.md"), "solo": ("zh-TW", "V5", "Solo-Rulebook.md"), "aid": ("zh-TW", "Player-Aid.md")},
       "en": {"rulebook": ("en", "Rulebook.md"), "solo": ("en", "Solo-Rulebook.md"), "aid": ("en", "Player-Aid.md")}}
SIZES = {"rulebook": (210, 280), "solo": (210, 280), "aid": (148, 210)}


def slug(value, separator="-"):
    value = re.sub(r"[^\w\s-]", "", value.strip().lower())
    return re.sub(r"\s", separator, value)


def icon_src(m):
    svg = open(os.path.join(ICONS, m.group(1) + ".svg"), "rb").read()
    return 'src="data:image/svg+xml;base64,' + base64.b64encode(svg).decode() + '"'


def html_of(path):
    src = open(os.path.join(ROOT, "docs", "rules", *path), encoding="utf-8").read()
    src = re.sub(r"^> (設計理由|This is the English edition).*?\n\n", "", src, flags=re.S | re.M)
    src = re.sub(r"```mermaid\n.*?```\n", "", src, flags=re.S)
    src = re.sub(r'src="(?:\.\./)+icons/([\w-]+)\.svg"', icon_src, src)
    h = markdown.markdown(src, extensions=["tables", "sane_lists", "toc", "md_in_html"], extension_configs={"toc": {"slugify": slug}})
    return h.replace("<img ", '<img class="tok" ')


def css(L, w, h, kind):
    z = L.code == "zh"
    small = kind == "aid"
    m = (12, 12, 14, 12) if small else (17, 16, 20, 16)        # top, outer, bottom, inner (inside the trim)
    return f"""
@page {{ size: {w + 2 * BLEED}mm {h + 2 * BLEED}mm; margin: {m[0] + BLEED}mm {m[1] + BLEED}mm {m[2] + BLEED}mm {m[3] + BLEED}mm }}
* {{ box-sizing: border-box }}
html, body {{ margin: 0; background: #fbf7ee; color: #241f1a; -webkit-print-color-adjust: exact; print-color-adjust: exact }}
body {{ font-family: {FAMILY[L.code]}; font-size: {9.5 if small else 10.5}pt; line-height: {1.62 if z else 1.45}; text-align: justify }}
h1 {{ font-family: {DISPLAY[L.code]}; font-size: {17 if small else 22}pt; color: #7a1f2b; margin: 0 0 4mm; line-height: 1.25; text-align: left }}
h2 {{ font-family: {DISPLAY[L.code]}; font-size: {13 if small else 15.5}pt; color: #7a1f2b; margin: 7mm 0 2.5mm; border-bottom: .3mm solid #c9a45c; padding-bottom: 1mm; break-after: avoid; text-align: left }}
h3 {{ font-size: {11 if small else 12}pt; color: #3b2e1c; margin: 4.5mm 0 1.5mm; break-after: avoid; text-align: left }}
h4 {{ font-size: 10.5pt; margin: 3mm 0 1mm; break-after: avoid }}
p {{ margin: 0 0 2mm; orphans: 2; widows: 2 }}
ul, ol {{ margin: 0 0 2.5mm; padding-left: 6mm }}
li {{ margin: .6mm 0 }}
table {{ border-collapse: collapse; width: 100%; margin: 2mm 0 3.5mm; font-size: {8.5 if small else 9.2}pt; line-height: 1.4; break-inside: auto; text-align: left }}
tr {{ break-inside: avoid }}
th {{ background: #ece2cc; color: #3b2e1c; font-weight: 700 }}
th, td {{ border: .25mm solid #cbbd9f; padding: 1mm 1.6mm; vertical-align: top }}
blockquote {{ margin: 2mm 0 3mm; padding: 2mm 4mm; background: #f1e9d8; border-left: 1mm solid #c9a45c; font-style: italic }}
img.tok {{ width: 1.25em; height: 1.25em; vertical-align: -.25em }}
.figure {{ margin: 3mm 0; break-inside: avoid; color: #3b2e1c }}
.figure svg {{ max-width: 100% !important; height: auto }}
a {{ color: inherit; text-decoration: none }}
hr {{ border: 0; border-top: .3mm solid #c9a45c; margin: 4mm 0 }}
code {{ font-family: inherit }}
"""


def flow_doc(L, kind):
    w, h = SIZES[kind]
    body = html_of(SRC[L.code][kind])
    return f'<!doctype html><html lang="{L.dir}"><head><meta charset="utf-8">{FONTS}<style>{css(L, w, h, kind)}</style></head><body>{body}</body></html>'


NAMES = {"rulebook": ("rulebook/rulebook.pdf", "規則書", "Rulebook"), "solo": ("rulebook/solo-rulebook.pdf", "單人模式規則書", "Solo Rulebook"),
         "aid": ("rulebook/player-aid.pdf", "玩家輔助卡", "Player Aid")}


def build(L):
    out = []
    for kind in ("rulebook", "solo", "aid"):
        f, zh, en = NAMES[kind]
        w, h = SIZES[kind]
        sides = "saddle-stitched, pages in reading order" if kind != "aid" else "A5, both sides; print 4 (one per player)"
        out.append((f, w, h, flow_doc(L, kind), [], sides))
    return out


def post(L, d, plan):
    """Page numbers in the footer; saddle-stitched books padded with Notes pages to a multiple of 4."""
    import pymupdf
    MMP = 72 / 25.4
    font = pymupdf.Font(fontfile=_font_file()) if L.code == "zh" else None
    for p in plan:
        if p["part"] != "rulebooks":
            continue
        path = os.path.join(d, p["path"])
        doc = pymupdf.open(path)
        w, h = p["trim"]
        kind = "aid" if p["path"].endswith("player-aid.pdf") else "book"
        if kind == "book":
            while len(doc) % 4:
                pg = doc.new_page(width=(w + 2 * BLEED) * MMP, height=(h + 2 * BLEED) * MMP)
                pg.draw_rect(pg.rect, color=None, fill=(0.984, 0.969, 0.933))
                t = L("筆記", "Notes")
                _text(pg, pymupdf.Point((BLEED + 16) * MMP, (BLEED + 24) * MMP), t, 15, font, (0.478, 0.122, 0.169))
                for i in range(20):
                    y = (BLEED + 36 + i * 11) * MMP
                    pg.draw_line(pymupdf.Point((BLEED + 16) * MMP, y), pymupdf.Point((BLEED + w - 16) * MMP, y), color=(0.8, 0.74, 0.62), width=.4)
        if kind == "aid" and len(doc) % 2:      # double-sided A5: an even number of pages
            pg = doc.new_page(width=(w + 2 * BLEED) * MMP, height=(h + 2 * BLEED) * MMP)
            pg.draw_rect(pg.rect, color=None, fill=(0.984, 0.969, 0.933))
        n = len(doc)
        for i, pg in enumerate(doc):
            if i == 0 and kind == "book":
                continue
            s = str(i + 1)
            x = ((BLEED + w - 14) if i % 2 == 0 else (BLEED + 12)) * MMP
            _text(pg, pymupdf.Point(x, (BLEED + h - 9) * MMP), s, 9, font, (0.48, 0.42, 0.33))
        p["labels"] = [f"{p['path'].split('/')[-1]} page {i + 1} of {n}" for i in range(n)]
        doc.save(path + ".tmp", garbage=3, deflate=True); doc.close(); os.replace(path + ".tmp", path)
    return plan


def _font_file():
    for f in ("/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc", "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"):
        if os.path.exists(f):
            return f


def _text(pg, pt, s, size, font, color):
    if font is None:
        pg.insert_text(pt, s, fontsize=size, fontname="tiro", color=color)
    else:
        tw = pymupdf.TextWriter(pg.rect, color=color)
        tw.append(pt, s, font=font, fontsize=size)
        tw.write_text(pg)


import pymupdf  # noqa: E402  (used by _text)
