"""Builds the Screentop image sheets from the factory PNGs (node print/factory/build.mjs --lang en --png) and the
manifest (node print/screentop/manifest.mjs). Writes print/out/screentop/assets/*. Usage: python3 print/screentop/sheets.py [en|zh-TW]"""
import json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
LANG = sys.argv[1] if len(sys.argv) > 1 else "en"
SRC = ROOT / "print/out/factory" / LANG
OUT = ROOT / "print/out/screentop" / LANG / "assets"
OUT.mkdir(parents=True, exist_ok=True)
M = json.loads((ROOT / "print/out/screentop/manifest.json").read_text())
BLEED = 3.0
CARD = (400, 560)  # 63 x 88 mm


def trim(path, w_mm, h_mm, bleed=BLEED):
    """Cut the printer's bleed off a factory PNG."""
    im = Image.open(path).convert("RGB")
    ppm = im.width / (w_mm + 2 * bleed)
    b = round(bleed * ppm)
    return im.crop((b, b, im.width - b, im.height - b))


def sheet(name, files, cols, rows, size=CARD, w_mm=63, h_mm=88, bleed=BLEED):
    """A Screentop asset: cells of equal size, filled left to right, top to bottom (asset index 1, 2, ...)."""
    assert len(files) <= cols * rows, (name, len(files))
    out = Image.new("RGB", (cols * size[0], rows * size[1]), (14, 12, 17))
    for i, f in enumerate(files):
        im = trim(SRC / f, w_mm, h_mm, bleed).resize(size, Image.LANCZOS)
        out.paste(im, ((i % cols) * size[0], (i // cols) * size[1]))
    out.save(OUT / f"{name}.jpg", quality=86, optimize=True)
    print(f"{name}.jpg  {cols}x{rows}  {len(files)} images  {out.size}")


backs = "cards/card-backs_png/"
sheet("memory-cards", [c["file"] for c in M["memory"]] + [backs + "back-memory.png"], 10, 8)
sheet("mist-cards", [c["file"] for c in M["mist"]] + [backs + "back-mist.png"], 7, 7)
sheet("ghost-cards", [c["file"] for c in M["ghost"]] + [backs + "back-ghost.png"], 5, 3)
# Bank tiles: 40 mm squares, already trimmed (one per page, no bleed).
sheet("bank-tiles", [c["file"] for c in M["bank"]] + [f"tiles/bank-tile-singles_png/tile-back-{r}.png" for r in (1, 2, 3)], 6, 4, size=(320, 320), w_mm=40, h_mm=40, bleed=0)
sheet("soul-mantle-cards", [c["file"] for c in M["souls"]] + [backs + "back-soul.png"] + [c["file"] for c in M["mantles"]] + [backs + "back-mantle.png"], 4, 3)

# Boards: one image each, 4 pixels per millimetre.
for name, f, w, h in [("river-panel-1", "board/river-board_png/river-panel-1.png", 266, 182), ("river-panel-2", "board/river-board_png/river-panel-2.png", 266, 182),
                      ("river-panel-3", "board/river-board_png/river-panel-3.png", 266, 182), ("loom-of-the-fates", "loom/loom-of-the-fates_png/loom-of-the-fates.png", 297, 210),
                      ("the-ledger", "ledger/the-ledger_png/the-ledger.png", 297, 210)]:
    im = trim(SRC / f, w, h).resize((w * 4, h * 4), Image.LANCZOS)
    im.save(OUT / f"{name}.jpg", quality=86, optimize=True)
    print(f"{name}.jpg  1x1  {im.size}")

# Books of Remembrance: one sheet per Soul, 8 pages in a 4 x 2 grid.
for k in ["child", "garland", "king", "bride", "open"]:
    pages = sorted((SRC / f"books/book-of-remembrance-{k}_png").glob("*.png"))
    sheet(f"book-{k}", [p.relative_to(SRC).as_posix() for p in pages], 4, 2, size=(735, 1040), w_mm=210, h_mm=297)

# Tokens: cut each disc from the punchboard (the back side is mirrored left to right), on a transparent sheet.
front = Image.open(SRC / "tokens/punchboard_png/punchboard-front.png").convert("RGBA")
back = Image.open(SRC / "tokens/punchboard_png/punchboard-back.png").convert("RGBA")
ppm = front.width / (297 + 2 * BLEED)
T = 256
cells = []
for t in M["tokenTypes"]:
    for side, im, cx in [("front", front, t["cx"]), ("back", back, 297 - t["cx"])][: 2 if t["twoSided"] else 1]:
        r = t["d"] / 2
        box = [round((cx - r + BLEED) * ppm), round((t["cy"] - r + BLEED) * ppm), round((cx + r + BLEED) * ppm), round((t["cy"] + r + BLEED) * ppm)]
        disc = im.crop(box).resize((T, T), Image.LANCZOS)
        mask = Image.new("L", (T * 4, T * 4), 0)
        ImageDraw.Draw(mask).ellipse((2, 2, T * 4 - 3, T * 4 - 3), fill=255)
        disc.putalpha(mask.resize((T, T), Image.LANCZOS))
        cells.append((t["name"], side, disc))
cols = 4
rows = math.ceil(len(cells) / cols)
tok = Image.new("RGBA", (cols * T, rows * T), (0, 0, 0, 0))
for i, (_, _, d) in enumerate(cells):
    tok.paste(d, ((i % cols) * T, (i // cols) * T))
tok.save(OUT / "tokens.png", optimize=True)
(OUT.parent / "token-cells.json").write_text(json.dumps([f"{n} ({s})" for n, s, _ in cells], indent=1))
print(f"tokens.png  {cols}x{rows}  {len(cells)} images")
