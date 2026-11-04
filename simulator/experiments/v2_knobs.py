"""V2: which design knobs bring the full V2 game back into range (Lantern: forgotten limit 12)."""
import json
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from experiments.v2 import STEPS, one, summarize  # noqa: E402

LAST = len(STEPS) - 1
BASE = {"forgotten_limit": 12}
KNOBS = [
    ("V2, forgotten limit 12", {}),
    ("commissions: 4p needs 2", {"commission_need": 2}),
    ("lighting costs 1", {"light_memory_cost": 1}),
    ("4/4/3 river", {"layout": "443"}),
    ("soul pushes through on its own", {"push_through": "harsh", "push_action": False}),
    ("V3.2 tile mix", {"tileset": "v32"}),
    ("needs 2 + soul pushes + lighting 1", {"commission_need": 2, "push_through": "harsh", "push_action": False,
                                           "light_memory_cost": 1}),
]
SOULS = [("child", 1), ("garland", 2), ("king", 2), ("bride", 2), ("open", 2)]


def main(games=200):
    res = {}
    with Pool(4) as pool:
        for name, kw in KNOBS:
            ex = dict(BASE, **kw)
            if ex.get("layout") == "443" and ex.get("tileset", "v2") == "v2":
                ex["tileset"] = "v2"
            row = {}
            for soul, lan in SOULS:
                e2 = dict(ex)
                if soul == "child":
                    e2["forgotten_limit"] = ex["forgotten_limit"] + 1
                rows = pool.map(one, [(LAST, soul, lan, 4, s, e2) for s in range(games)], chunksize=8)
                row[soul] = summarize(rows)
            res[name] = row
            print(name, {k: round(v["win"], 2) for k, v in row.items()}, flush=True)
    with open("reports/v2_knobs.json", "w") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
