"""Checks the press-ready factory PDFs: python3 print/factory/checkpress.py print/out/factory/en
  - every planned file went through press.py, and every image in it is CMYK (or grey);
  - every page of a file has the same page, bleed and trim box, and card fronts match card-backs.pdf;
  - the art fills the bleed: no paper white between the bleed edge and the trim (cutting guides excepted);
  - on the die-cut sheets (punchboard, bank tiles) each back, turned over left to right, sits behind its front and
    inside its cut: the art centre of every piece is measured against its cut on the die line.
Exits non-zero on any failure."""
import json, os, sys
import numpy as np
import pymupdf

MM = 72 / 25.4
d = sys.argv[1]
plan = json.load(open(os.path.join(d, "press-plan.json")))
fails, notes = [], []


def boxes(page):
    r = lambda R: tuple(round(v / MM, 2) for v in (R.x0, R.y0, R.x1, R.y1))
    return r(page.mediabox), r(page.bleedbox), r(page.trimbox)


def raster(page, dpi):
    pix = page.get_pixmap(dpi=dpi, colorspace=pymupdf.csRGB)
    return np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[..., :3].astype(int)


def sheet_registration(doc, circle):
    """Pages 1 front, 2 back (mirrored), 3 die. Returns the largest offset (mm) of any piece's art from its cut."""
    dpi = 300
    tb = doc[0].trimbox
    crop = lambda img: img[int(round((tb.y0 - 3 * MM) / 72 * dpi)):int(round((tb.y1 + 3 * MM) / 72 * dpi)),
                           int(round((tb.x0 - 3 * MM) / 72 * dpi)):int(round((tb.x1 + 3 * MM) / 72 * dpi))]
    front, back, die = (crop(raster(doc[i], dpi)) for i in range(3))
    back = back[:, ::-1]
    px = dpi / 25.4
    mag = (die[..., 0] > 180) & (die[..., 1] < 120) & (die[..., 2] > 90)
    H, W = mag.shape
    seen = np.zeros_like(mag)
    shapes = []
    for y0, x0 in zip(*np.nonzero(mag)):
        if seen[y0, x0]: continue
        st, pts = [(y0, x0)], []
        seen[y0, x0] = True
        while st:
            y, x = st.pop(); pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and mag[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True; st.append((yy, xx))
        p = np.array(pts)
        if np.ptp(p[:, 0]) < 10 * px: continue          # the caption text
        shapes.append((p[:, 0].min(), p[:, 0].max(), p[:, 1].min(), p[:, 1].max()))
    # For every cut shape: (1) the art must cover the whole band from the cut out to 1.5 mm past it, on the front
    # and on the turned-over back; (2) the art centre, measured inside the cut only (so neighbouring pieces cannot
    # pull it), must sit on the cut centre.
    worst, cover_min = 0.0, 1.0
    yy, xx = np.mgrid[0:H, 0:W]
    for img in (front, back):
        bg = img[int(px), int(px)]
        art = np.abs(img - bg).sum(-1) > 3
        for (y0, y1, x0, x1) in shapes:
            cy, cx, ry, rx = (y0 + y1) / 2, (x0 + x1) / 2, (y1 - y0) / 2, (x1 - x0) / 2
            pad = int(2.5 * px)
            a0, a1, b0, b1 = max(0, y0 - pad), min(H, y1 + pad + 1), max(0, x0 - pad), min(W, x1 + pad + 1)
            Y, X, A = yy[a0:a1, b0:b1], xx[a0:a1, b0:b1], art[a0:a1, b0:b1]
            if circle:
                d = np.hypot(Y - cy, X - cx); r = (ry + rx) / 2
                band = (d >= r) & (d <= r + 1.5 * px)
                inside = d < r
            else:
                dy, dx = np.abs(Y - cy) - ry, np.abs(X - cx) - rx
                out = np.maximum(dy, dx)
                band = (out >= 0) & (out <= 1.5 * px)
                inside = out < 0
            cover_min = min(cover_min, A[band].mean())
            iy, ix = Y[inside & A], X[inside & A]
            worst = max(worst, np.hypot(iy.mean() - cy, ix.mean() - cx) / px if len(iy) else 99)
    return len(shapes), worst, cover_min


def tile_geometry(html, sheet_w):
    """Bank tiles: their dark art cannot be told from the sheet by colour, so check the drawing itself. Every front art
    rectangle and every back art rectangle (turned over left to right) must be centred on its die-line square and
    reach past it on all four sides. Returns (pieces, largest centre offset mm, smallest art margin mm)."""
    import re
    num = r'([-\d.]+)'
    rect = lambda pat: [tuple(map(float, m)) for m in re.findall(pat, html)]
    fronts = rect(rf'<clipPath id="tc\d+"><rect x="{num}" y="{num}" width="{num}" height="{num}"')
    backs = [(sheet_w - x - w, y, w, h) for x, y, w, h in rect(rf'<clipPath id="tb\d+"><rect x="{num}" y="{num}" width="{num}" height="{num}"')]
    dies = rect(rf'<rect x="{num}" y="{num}" width="{num}" height="{num}" rx="[\d.]+" fill="none" stroke="#ec008c"')
    worst, margin = 0.0, 99.0
    for side in (fronts, backs):
        for (x, y, w, h) in side:
            dx, dy, dw, dh = min(dies, key=lambda d: abs(d[0] + d[2] / 2 - x - w / 2) + abs(d[1] + d[3] / 2 - y - h / 2))
            worst = max(worst, abs(dx + dw / 2 - x - w / 2), abs(dy + dh / 2 - y - h / 2))
            margin = min(margin, dx - x, dy - y, x + w - dx - dw, y + h - dy - dh)
    return len(dies), len(fronts), len(backs), worst, margin


card_boxes = {}
for f in plan["files"]:
    path = os.path.join(d, f["path"])
    if not os.path.exists(path):
        fails.append(f"{f['path']}: missing"); continue
    doc = pymupdf.open(path)
    if (doc.metadata or {}).get("keywords") != "netherbloom-press-v1":
        fails.append(f"{f['path']}: not pressed")
    rgb = [x for p in doc for x in p.get_images(full=True) if x[5] not in ("DeviceCMYK", "DeviceGray", "ICCBased", "Indexed")]
    for p in doc:
        for x in p.get_images(full=True):
            cs = pymupdf.Pixmap(doc, x[0]).colorspace
            if cs and cs.n == 3: rgb.append(x)
    if rgb: fails.append(f"{f['path']}: {len(rgb)} RGB image(s)")
    bx = {boxes(p) for p in doc}
    if len(bx) != 1: fails.append(f"{f['path']}: pages differ in size or boxes: {bx}")
    media, bleed, trim = next(iter(bx))
    tw, th = round(trim[2] - trim[0], 2), round(trim[3] - trim[1], 2)
    if (abs(tw - f["trim"][0]) > .01 or abs(th - f["trim"][1]) > .01): fails.append(f"{f['path']}: trim {tw} x {th}, plan {f['trim']}")
    if round(trim[0] - bleed[0], 2) < 1.5: fails.append(f"{f['path']}: bleed under 1.5 mm")
    if f["path"].startswith("cards/"): card_boxes[f["path"]] = (media, bleed, trim)
    # the art fills the bleed (cutting guides excepted)
    labels = f.get("labels") or []
    for i, p in enumerate(doc):
        if i < len(labels) and labels[i].startswith(("DIE", "TRIM")): continue
        img = raster(p, 40)
        k = 40 / 72
        b0 = [int(round(v * k)) for v in (p.bleedbox.x0, p.bleedbox.y0, p.bleedbox.x1, p.bleedbox.y1)]
        t0 = [int(round(v * k)) for v in (p.trimbox.x0, p.trimbox.y0, p.trimbox.x1, p.trimbox.y1)]
        ring = np.ones(img.shape[:2], bool)
        ring[:b0[1] + 1, :] = ring[b0[3] - 1:, :] = False; ring[:, :b0[0] + 1] = ring[:, b0[2] - 1:] = False
        ring[t0[1]:t0[3], t0[0]:t0[2]] = False
        white = (img[ring] > 250).all(-1).mean() if ring.any() else 0
        if white > .02:
            fails.append(f"{f['path']} p.{i + 1}: {white * 100:.0f}% of the bleed is paper white")
    if f["path"] == "tiles/bank-tiles.pdf":
        n, nf, nb, worst, margin = tile_geometry(open(path[:-4] + ".html").read(), f["trim"][0])
        notes.append(f"{f['path']}: {n} die squares, {nf} fronts, {nb} backs (turned over); every front and back centred on its cut within {worst:.3f} mm; art runs {margin:.2f} mm past every cut")
        if not (n == nf == nb): fails.append(f"{f['path']}: {n} cuts but {nf} fronts and {nb} backs")
        if worst > .01: fails.append(f"{f['path']}: a tile is {worst:.3f} mm off its cut")
        if margin < 1.5: fails.append(f"{f['path']}: art bleed past the cut only {margin:.2f} mm")
    if f["path"] == "tokens/punchboard.pdf":
        n, worst, cover = sheet_registration(doc, f["path"].startswith("tokens"))
        notes.append(f"{f['path']}: {n} pieces; art covers {cover * 100:.1f}% of the 1.5 mm band outside every cut, front and back; art centre within {worst:.3f} mm of every cut centre")
        if cover < .995: fails.append(f"{f['path']}: art covers only {cover * 100:.1f}% of the 1.5 mm band past a cut")
        if worst > .15: fails.append(f"{f['path']}: art centre {worst:.3f} mm off its cut")
    notes.append(f"{f['path']}: {len(doc)} p, trim {tw} x {th} mm, bleed {round(trim[0] - bleed[0], 2)} mm, slug {round(bleed[0] - media[0], 2)} mm, CMYK")
    doc.close()
if len(set(card_boxes.values())) > 1:
    fails.append(f"card fronts and backs differ: {card_boxes}")
else:
    notes.append(f"cards: all {len(card_boxes)} card files (fronts and card-backs.pdf) share one page, bleed and trim box")
print("\n".join(notes))
print("FAIL\n  " + "\n  ".join(fails) if fails else "ALL CHECKS PASSED")
sys.exit(1 if fails else 0)
