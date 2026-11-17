# Shared pieces for the V5 print files: paths, fonts, art, icons, the two languages and the page wrapper.
# Every layout is written in millimetres (CSS `calc(n * var(--k))` with --k = 1mm), and every page is the finished
# size plus 3 mm bleed on each side; the artwork's origin is the top-left corner of the bleed.
import html, json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
MASTERS = os.path.join(ROOT, "art", "masters")
ICONS = os.path.join(ROOT, "docs", "rules", "icons")
CONCEPT = os.path.join(HERE, "art")          # the concept paintings (new tiles, the Reaper) until the final paintings arrive
SYM = open(os.path.join(ROOT, "web", "public", "assets", "symbols.svg"), encoding="utf-8").read()
DATA = json.load(open(os.path.join(OUT, "data.json"), encoding="utf-8"))
BLEED = 3
E = html.escape

FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700'
         '&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=IM+Fell+English+SC&display=block">')
FAMILY = {"zh": '"Noto Serif TC", serif', "en": '"EB Garamond", "Noto Serif TC", serif'}
DISPLAY = {"zh": '"Noto Serif TC", serif', "en": '"IM Fell English SC", "EB Garamond", serif'}


class Lang:
    def __init__(self, code):
        self.code = code
    def __call__(self, zh, en):
        return en if self.code == "en" else zh
    @property
    def dir(self):
        return "en" if self.code == "en" else "zh-TW"


# ---- art: masters (or concept paintings) resized once to what the print needs, as high-quality JPEG
_art_cache = {}
def art(name, maxpx=2400, concept=False):
    key = (name, maxpx)
    if key in _art_cache:
        return _art_cache[key]
    src = os.path.join(CONCEPT if concept else MASTERS, name + ".png")
    if not os.path.exists(src):
        src = os.path.join(CONCEPT if concept else MASTERS, name + ".jpg")
    os.makedirs(os.path.join(OUT, "art"), exist_ok=True)
    dst = os.path.join(OUT, "art", f"{name}-{maxpx}.jpg")
    if not os.path.exists(dst):
        im = Image.open(src).convert("RGB")
        im.thumbnail((maxpx, maxpx), Image.LANCZOS)
        im.save(dst, quality=92, subsampling=0)
    _art_cache[key] = "file://" + dst
    return _art_cache[key]


def ico(name):
    return "file://" + os.path.join(ICONS, name + ".svg")


mm = lambda v: f"{v:.2f}mm"
def at(x, y, w=None, h=None):
    return f"left:{mm(x)};top:{mm(y)};" + (f"width:{mm(w)};" if w is not None else "") + (f"height:{mm(h)};" if h is not None else "")


BASE_CSS = """
:root { --bone: #e6d3a3; --paper: #f2e8d5; --gold: #c9a45c; --mist: #a29c93; --obs: #e0525c; --acc: #f0d9a0; --obl: #5fd0d6; }
* { box-sizing: border-box; margin: 0; padding: 0 }
html, body { background: #0e0c11; color: var(--paper); -webkit-print-color-adjust: exact; print-color-adjust: exact }
.page { position: relative; overflow: hidden; contain: paint; break-after: page; background: #17141b }
.page:last-child { break-after: auto }
.trim { position: absolute }
.bg { position: absolute; inset: 0; background-size: cover; background-position: center }
.shade { position: absolute; inset: 0 }
.a { position: absolute }
.slot { position: absolute; border: .45mm dashed rgba(230,211,163,.8); border-radius: 2.5mm; overflow: hidden;
  background: rgba(14,12,17,.42); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center }
.slot .fill { position: absolute; inset: 0; background-size: cover; background-position: center }
.lab { position: absolute; color: var(--bone); text-shadow: 0 .2mm .4mm #000; line-height: 1.3 }
.ttl { position: absolute; color: var(--gold); font-weight: 700; letter-spacing: .12em; text-shadow: 0 .2mm .6mm #000 }
.cell { position: absolute; border-radius: 2.2mm; border: .4mm solid rgba(230,211,163,.55); background: rgba(14,12,17,.6);
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 1mm; color: var(--paper); line-height: 1 }
.cell small { margin-bottom: auto; margin-top: 1.2mm; opacity: .9 }
.circ { position: absolute; border-radius: 50%; border: .4mm solid rgba(230,211,163,.6); background: rgba(14,12,17,.6); display: grid; place-items: center; color: var(--paper) }
.ico { position: absolute; display: block }
.track { position: absolute; height: 1.6mm; background: rgba(0,0,0,.65); border-radius: 2mm }
svg.sym { width: 1em; height: 1em; vertical-align: -.12em }
"""


# Text boxes marked .fit shrink their font (down to data-min mm) until the words fit; render.cjs calls fitAll() after the
# fonts load and reports any box that still overflows, so no printed text is ever cut off.
FIT_JS = """window.fitAll = () => { const bad = [];
  for (const el of document.querySelectorAll('.fit')) {
    let fs = parseFloat(getComputedStyle(el).fontSize); const min = parseFloat(el.dataset.min || 0) * 96 / 25.4;
    while ((el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && fs > min) { fs *= 0.96; el.style.fontSize = fs + 'px'; }
    if (el.scrollHeight > el.clientHeight + 1) bad.push((el.dataset.id || '') + ' ' + el.textContent.slice(0, 40));
  } return bad; };"""


def document(L, pages, w, h, css=""):
    """One printable document: `pages` are inner HTML strings, each drawn on a (w + 6) x (h + 6) mm page."""
    W, H = w + 2 * BLEED, h + 2 * BLEED
    body = "".join(f'<div class="page" style="width:{mm(W)};height:{mm(H)}">{p}</div>' for p in pages)
    return (f'<!doctype html><html lang="{L.dir}"><head><meta charset="utf-8">{FONTS}<style>@page {{ size: {mm(W)} {mm(H)}; margin: 0 }}'
            f'{BASE_CSS} html, body {{ width: {mm(W)}; overflow: hidden }} body {{ font-family: {FAMILY[L.code]} }} .ttl, .disp {{ font-family: {DISPLAY[L.code]} }} {css}</style></head>'
            f'<body>{SYM}{body}<script>{FIT_JS}</script></body></html>')


def board_page(w, h, inner, bg, shade, bgpos="center"):
    """A board or book page: the painting and its shade run into the bleed; `inner` is laid out in trim coordinates."""
    return (f'<div class="bg" style="background-image:url({bg});background-position:{bgpos}"></div><div class="shade" style="background:{shade}"></div>'
            f'<div class="trim" style="{at(BLEED, BLEED, w, h)}">{inner}</div>')


def lab(x, y, t, size=None, color=None, w=None, align="left", raw=False, extra=""):
    st = at(x, y, w) + (f"font-size:{mm(size)};" if size else "") + (f"color:{color};" if color else "") + f"text-align:{align};" + extra
    return f'<div class="lab" style="{st}">{t if raw else E(t)}</div>'
def icon(name, x, y, d, op=1, extra=""):
    return f'<img class="ico" src="{ico(name)}" style="{at(x, y, d, d)}opacity:{op};{extra}">'
def slot(x, y, w, h, fill=None, op=.9, inner="", extra=""):
    f = f'<div class="fill" style="background-image:url({fill});opacity:{op}"></div>' if fill else ""
    return f'<div class="slot" style="{at(x, y, w, h)}{extra}">{f}{inner}</div>'
def circ(x, y, d, t="", extra=""):
    return f'<div class="circ" style="{at(x, y, d, d)}{extra}">{t}</div>'
def cell(x, y, w, h, n="", small="", extra="", nsize=4, ssize=2.3):
    return f'<div class="cell" style="{at(x, y, w, h)}font-size:{mm(nsize)};{extra}">{f"<small style=font-size:{mm(ssize)}>{E(small)}</small>" if small else ""}{n}</div>'
def sym(name, color, size):
    return f'<svg class="sym" style="color:{color};font-size:{mm(size)}"><use href="#{name}"/></svg>'
