# Saves page images of built PDFs for a quick look:  python3 print/v5/preview.py <pdf> [dpi] [first last]
import sys, os, pymupdf
f = sys.argv[1]; dpi = int(sys.argv[2]) if len(sys.argv) > 2 else 60
doc = pymupdf.open(f)
a = int(sys.argv[3]) if len(sys.argv) > 3 else 0; b = int(sys.argv[4]) if len(sys.argv) > 4 else min(len(doc), a + 1)
os.makedirs("/tmp/claude-0/-home-user-Boardgame-Netherbloom/c5f90575-5a2f-55cd-bbe0-cc232afec415/scratchpad/pv", exist_ok=True)
for i in range(a, b):
    p = doc[i].get_pixmap(dpi=dpi)
    out = f"/tmp/claude-0/-home-user-Boardgame-Netherbloom/c5f90575-5a2f-55cd-bbe0-cc232afec415/scratchpad/pv/{os.path.basename(f)[:-4]}-{i+1}.png"
    p.save(out); print(out, doc[i].rect.width / 72 * 25.4, doc[i].rect.height / 72 * 25.4)
