"""Makes the web copies of the paintings in art/masters (and art/print) as WebP in web/public/assets/art/.

Run from the repository root: python3 web/tools/build_art.py
Sizes are chosen for how large each painting shows in the browser; the masters stay the source.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MASTERS, PRINT, OUT = ROOT / "art/masters", ROOT / "art/print", ROOT / "web/public/assets/art"

# name -> (longest side in px, quality)
SIZES = {"cover-f": (1800, 72), "tex-water": (2200, 70), "tex-bank": (2200, 70)}
for n in ["back-memory", "back-mist", "back-ghost", "back-soul"]: SIZES[n] = (720, 72)
for n in ["card-obsession", "card-acceptance", "card-oblivion", "card-mist-1", "card-mist-2", "card-mist-3", "card-harsh", "card-ghost",
          "card-mantle-weaver", "card-mantle-warden", "card-mantle-bringer", "card-mantle-breaker"]: SIZES[n] = (720, 72)
for n in ["card-bank-fertile", "card-bank-stony", "card-bank-memory", "card-bank-grave", "card-fog"]: SIZES[n] = (360, 70)
for s in ["child", "garland", "king", "bride", "nameless"]: SIZES[f"soul-{s}"] = (900, 74)
for n in ["child-road", "child-fields", "child-lethe", "garland-brook", "garland-wade", "garland-lethe", "king-field", "king-barge", "king-lake",
          "bride-wedding", "bride-stair", "bride-shore", "nameless-road", "nameless-mourners", "nameless-lethe"]: SIZES[n] = (900, 72)

OUT.mkdir(parents=True, exist_ok=True)
total = 0
for name, (side, q) in SIZES.items():
    src = PRINT / f"{name}.jpg"
    if not src.exists(): src = MASTERS / f"{name}.png"
    im = Image.open(src).convert("RGB")
    im.thumbnail((side, side), Image.LANCZOS)
    dst = OUT / f"{name}.webp"
    im.save(dst, "WEBP", quality=q, method=6)
    total += dst.stat().st_size
    print(f"{name:22} {im.size[0]:5}x{im.size[1]:<5} {dst.stat().st_size // 1024:5} KB")
print(f"total {total // 1024} KB")
