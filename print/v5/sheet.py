# Contact sheet of chosen PDF pages:  python3 print/v5/sheet.py out.png dpi file:page [file:page ...]
import sys, pymupdf
from PIL import Image
out, dpi = sys.argv[1], int(sys.argv[2]); ims = []
for spec in sys.argv[3:]:
    f, p = spec.rsplit(":", 1); d = pymupdf.open(f); pm = d[int(p) - 1].get_pixmap(dpi=dpi)
    ims.append(Image.frombytes("RGB", (pm.width, pm.height), pm.samples))
W = sum(i.width for i in ims) + 6 * len(ims); H = max(i.height for i in ims)
c = Image.new("RGB", (W, H), "white"); x = 0
for i in ims: c.paste(i, (x, 0)); x += i.width + 6
c.save(out)
