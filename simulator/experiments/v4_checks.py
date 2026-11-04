"""V4.0 checks: the Garland Girl's "give a flower", and whether Lightless Crossing into the dark should cost a Fracture.

    python3 -m experiments.v4_checks --games 200
"""
import argparse
import json
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from experiments.v2_blessing import FINAL, STANDARD, CHILD  # noqa: E402
from experiments.v2_matrix import cell  # noqa: E402

# The full V4.0 rule set, for later runs (add CHILD for the Child; garland_gift only matters for the Garland Girl).
V40 = dict(FINAL, cross_fracture=True, garland_gift=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=200)
    a = ap.parse_args()
    res = {}
    with Pool(4) as pool:
        for name, kw in (("Garland, no special rule", {}), ("Garland, give a flower", {"garland_gift": True})):
            row = {p: cell(pool, "garland", p, g, n, "Standard", a.games, dict(FINAL, **kw))
                   for p, (g, n) in STANDARD.items()}
            res[name] = row
            print(name, {p: round(c["win"] * 100) for p, c in row.items()},
                  "nameless", {p: round(c["nameless"] * 100) for p, c in row.items()}, flush=True)
        for name, kw in (("Crossing: no Fracture", {}), ("Crossing into the dark: 1 Fracture", {"cross_fracture": True})):
            for soul in ("child", "king", "bride", "open"):
                ex = dict(FINAL, **kw, **(CHILD if soul == "child" else {}))
                row = {p: cell(pool, soul, p, g, n, "Standard", a.games, ex) for p, (g, n) in STANDARD.items()}
                res[f"{name}|{soul}"] = row
                print(name, soul, {p: round(c["win"] * 100) for p, c in row.items()}, flush=True)
    with open("reports/v4_checks.json", "w") as f:
        json.dump(res, f, indent=1)


if __name__ == "__main__":
    main()
