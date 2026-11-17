# Checks the press-ready V5 PDFs:  python3 print/v5/check.py print/v5/out/zh-TW
#  - every planned file went through press.py and every image in it is CMYK (or grey);
#  - every page of a file has the same media, bleed and trim box, and the trim is the planned size;
#  - fronts and backs of two-sided pieces have the same page count;
#  - the art fills the bleed: no paper white in the 3 mm bleed band (die lines and rulebook pages excepted).
# Exits non-zero on any failure.
import json, os, sys
import numpy as np
import pymupdf

MM = 72 / 25.4
d = sys.argv[1]
plan = json.load(open(os.path.join(d, "press-plan.json")))
fails = []
counts = {}
for f in plan["files"]:
    path = os.path.join(d, f["path"])
    if not os.path.exists(path):
        fails.append(f"{f['path']}: missing"); continue
    doc = pymupdf.open(path)
    counts[f["path"]] = len(doc)
    if (doc.metadata or {}).get("keywords") != "netherbloom-press-v1":
        fails.append(f"{f['path']}: not pressed")
    for x in {i[0] for p in doc for i in p.get_images(full=True)}:
        cs = doc.extract_image(x).get("cs-name", "") if False else pymupdf.Pixmap(doc, x).colorspace
        if cs and cs.name not in ("DeviceCMYK", "DeviceGray"):
            fails.append(f"{f['path']}: image in {cs.name}"); break
    b0 = None
    for i, p in enumerate(doc):
        b = tuple(round(v / MM, 1) for R in (p.mediabox, p.bleedbox, p.trimbox) for v in (R.x0, R.y0, R.x1, R.y1))
        if b0 is None: b0 = b
        elif b != b0: fails.append(f"{f['path']} p.{i+1}: page boxes differ from p.1"); break
    tw, th = (doc[0].trimbox.width / MM, doc[0].trimbox.height / MM)
    if abs(tw - f["trim"][0]) > .2 or abs(th - f["trim"][1]) > .2:
        fails.append(f"{f['path']}: trim {tw:.1f} x {th:.1f}, planned {f['trim']}")
    if "dieline" in f["path"] or f["part"] == "rulebooks":
        continue
    for i in range(0, len(doc), max(1, len(doc) // 6)):
        p = doc[i]
        pix = p.get_pixmap(dpi=100, colorspace=pymupdf.csRGB, clip=p.bleedbox)
        a = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[..., :3][1:-1, 1:-1]   # the outermost pixel is anti-aliasing
        k = max(1, int(2.5 * 100 / 25.4))
        band = np.concatenate([a[:k].reshape(-1, 3), a[-k:].reshape(-1, 3), a[:, :k].reshape(-1, 3), a[:, -k:].reshape(-1, 3)])
        if (band.min(axis=1) > 245).mean() > .02:
            fails.append(f"{f['path']} p.{i+1}: paper white in the bleed"); break
pairs = [("cards/mist-cards-fronts.pdf", "cards/mist-cards-backs.pdf"), ("cards/fate-mist-event-side.pdf", "cards/fate-mist-condition-side.pdf"),
         ("cards/ending-cards-fronts.pdf", "cards/ending-cards-backs.pdf"),         ("tiles/bank-tiles-fronts.pdf", "tiles/bank-tiles-fog-side.pdf"), ("tokens/tokens-18mm-fronts.pdf", "tokens/tokens-18mm-backs.pdf"),
         ("tokens/tokens-25mm-fronts.pdf", "tokens/tokens-25mm-backs.pdf")]
for a, b in pairs:
    if counts.get(a) != counts.get(b):
        fails.append(f"{a} has {counts.get(a)} pages, {b} has {counts.get(b)}")
expect = {"cards/memory-cards.pdf": 72, "cards/mist-cards-fronts.pdf": 56, "cards/fate-mist-event-side.pdf": 60, "cards/commission-cards.pdf": 40,
          "cards/ending-cards-fronts.pdf": 20, "cards/soul-cards.pdf": 5, "cards/mantle-cards.pdf": 5, "cards/ghost-cards.pdf": 12,
          "tiles/bank-tiles-fronts.pdf": 37, "tokens/tokens-18mm-fronts.pdf": 50, "tokens/tokens-25mm-fronts.pdf": 11, "boards/river-boards.pdf": 3}
for k, n in expect.items():
    if counts.get(k) != n:
        fails.append(f"{k}: {counts.get(k)} pages, expected {n}")
for k, n in counts.items():
    if k.startswith("books/") and n != 12: fails.append(f"{k}: {n} pages, expected 12")
    if k in ("rulebook/rulebook.pdf", "rulebook/solo-rulebook.pdf") and n % 4: fails.append(f"{k}: {n} pages, not a multiple of 4")
print(f"{d}: {len(counts)} files, {sum(counts.values())} pages")
for x in fails: print("FAIL", x)
print("OK" if not fails else f"{len(fails)} failures")
sys.exit(1 if fails else 0)
