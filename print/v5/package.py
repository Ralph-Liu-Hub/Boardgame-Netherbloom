# Zips the press-ready V5 files into Downloads/, one set per language, each zip under 100 MB (GitHub's file limit),
# and writes SHA256SUMS.txt.   python3 print/v5/package.py
import hashlib, os, sys, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import OUT, ROOT

DL = os.path.join(ROOT, "Downloads")
PARTS = [("part1-cards-tiles-tokens", ["MANUAL.pdf", "cards", "tiles", "tokens"]),
         ("part2-boards-box", ["MANUAL.pdf", "boards", "box"]),
         ("part3-books", ["MANUAL.pdf", "books"]),
         ("part4-rulebooks", ["MANUAL.pdf", "rulebook"])]
LIMIT = 99 * 1000 * 1000


def files(base, items):
    for it in items:
        p = os.path.join(base, it)
        if os.path.isfile(p):
            yield it
        else:
            for r, _, fs in os.walk(p):
                for f in sorted(fs):
                    if f.endswith(".pdf"):
                        yield os.path.relpath(os.path.join(r, f), base)


def main():
    made = []
    for lang in ("zh-TW", "en"):
        base = os.path.join(OUT, lang)
        for name, items in PARTS:
            fl = list(files(base, items))
            chunks, cur, size = [], [], 0
            for f in fl:                      # split further only if a part would pass the limit
                s = os.path.getsize(os.path.join(base, f))
                if cur and size + s > LIMIT * .97 and f != "MANUAL.pdf":
                    chunks.append(cur); cur, size = ["MANUAL.pdf"], os.path.getsize(os.path.join(base, "MANUAL.pdf"))
                cur.append(f); size += s
            chunks.append(cur)
            for i, ch in enumerate(chunks):
                suffix = "" if len(chunks) == 1 else chr(ord("a") + i)
                z = os.path.join(DL, f"netherbloom-factory-{lang}-V5-{name}{suffix}.zip")
                with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
                    for f in ch:
                        zf.write(os.path.join(base, f), os.path.join(f"netherbloom-factory-{lang}-V5", f))
                assert os.path.getsize(z) < 100 * 1000 * 1000, z
                made.append(z)
                print(os.path.basename(z), round(os.path.getsize(z) / 1e6, 1), "MB")
    with open(os.path.join(DL, "SHA256SUMS.txt"), "w") as out:
        for z in made:
            out.write(hashlib.sha256(open(z, "rb").read()).hexdigest() + "  " + os.path.basename(z) + "\n")


if __name__ == "__main__":
    main()
