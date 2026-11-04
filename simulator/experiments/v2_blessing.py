"""V2 chapter blessing A/B test on the final V2 rules and the Standard setup matrix.

Chapter Blessing (V3.2 §9): mend a Fracture, else remove the nearest Black Water, else the newest forgotten card
returns. Variants differ only in what triggers it (once per page).

    python3 -m experiments.v2_blessing --games 200
"""
import argparse
import json
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from experiments.v2_matrix import cell  # noqa: E402

STANDARD = {4: (2, 3), 3: (2, 2), 2: (1, 2), 1: (2, 1)}
FINAL = {"push_through": "fracture", "push_scope": "none", "push_action": True, "push_once_each": True,
         "light_memory_cost": 1}
CHILD = {"child_harsh": True, "child_limit_bonus": 0, "child_shield": "game"}
VARIANTS = [
    ("no Chapter Blessing", {}),
    ("3 inscribed on a page", {"book_mode": "blessing", "blessing_at": 3, "blessing_trigger": "inscribed"}),
    ("4 inscribed (full page)", {"book_mode": "blessing", "blessing_at": 4, "blessing_trigger": "inscribed"}),
    ("3 lit on a page", {"book_mode": "blessing", "blessing_at": 3, "blessing_trigger": "lit"}),
]
SOULS = ["child", "garland", "king", "bride", "open"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=200)
    a = ap.parse_args()
    res = {}
    with Pool(4) as pool:
        for name, kw in VARIANTS:
            for soul in SOULS:
                ex = dict(FINAL, **kw, **(CHILD if soul == "child" else {}))
                row = {}
                for players, (graves, need) in STANDARD.items():
                    c = cell(pool, soul, players, graves, need, "Standard", a.games, ex)
                    row[players] = c
                res[f"{name}|{soul}"] = row
                print(name, soul, {p: round(c["win"] * 100) for p, c in row.items()}, flush=True)
    with open("reports/v2_blessing.json", "w") as f:
        json.dump(res, f, indent=1)


if __name__ == "__main__":
    main()
