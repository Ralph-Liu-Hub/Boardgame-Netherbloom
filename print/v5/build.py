# Builds the V5 factory files for one or both languages.
#   node print/v5/export_data.mjs              # the card and Book text, from the web table's data
#   python3 print/v5/build.py [--lang zh|en] [--only boards,cards,...] [--no-press]
# Output: print/v5/out/<zh-TW|en>/ ... one PDF per component, each page the finished size plus 3 mm bleed.
# Then press.py (from print/factory) converts every PDF to CMYK FOGRA39 with crop marks, and checkpress.py checks them.
import argparse, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import OUT, HERE, ROOT, Lang, document, BLEED
import boards, books, cards, tiles, tokens, box, rulebooks

PARTS = {"boards": boards, "books": books, "cards": cards, "tiles": tiles, "tokens": tokens, "box": box, "rulebooks": rulebooks}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=["zh", "en"], action="append")
    ap.add_argument("--only", default="")
    ap.add_argument("--no-press", action="store_true")
    a = ap.parse_args()
    only = [s for s in a.only.split(",") if s] or list(PARTS)
    for code in a.lang or ["zh", "en"]:
        L = Lang(code)
        d = os.path.join(OUT, L.dir)
        jobs, plan = [], []
        for part in only:
            for item in PARTS[part].build(L):
                f, w, h, pages, labels = item[:5]
                sides = item[5] if len(item) > 5 else "single-sided"
                css = item[6] if len(item) > 6 else ""
                htm = os.path.join(d, "html", f.replace("/", "__").replace(".pdf", ".html"))
                os.makedirs(os.path.dirname(htm), exist_ok=True)
                open(htm, "w", encoding="utf-8").write(pages if isinstance(pages, str) else document(L, pages, w, h, css))   # a str is a finished, flowing document
                jobs.append({"html": htm, "pdf": os.path.join(d, f)})
                plan.append({"path": f, "trim": [w, h], "sides": sides, "labels": labels, "part": part})
        json.dump(jobs, open(os.path.join(d, "jobs.json"), "w"), ensure_ascii=False, indent=1)
        subprocess.run(["node", os.path.join(HERE, "render.cjs"), os.path.join(d, "jobs.json")], check=True)
        # parts that put their PDFs together after printing (the Books' spreads), and saddle-stitched rulebooks padded to 4n pages
        for part in only:
            if hasattr(PARTS[part], "post"):
                plan = PARTS[part].post(L, d, plan)
        old = {}
        pp = os.path.join(d, "press-plan.json")
        if os.path.exists(pp):
            old = {f["path"]: f for f in json.load(open(pp))["files"]}
        for p in plan:
            old[p["path"]] = p
        json.dump({"bleed": BLEED, "slug": 10, "files": list(old.values())}, open(pp, "w"), ensure_ascii=False, indent=1)
        if not a.no_press:
            subprocess.run([sys.executable, os.path.join(ROOT, "print", "factory", "press.py"), d], check=True)


if __name__ == "__main__":
    main()
