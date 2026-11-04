"""V2: the recommended knob set at a few Lantern settings, and by player count."""
import json
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from experiments.v2 import STEPS, one, summarize  # noqa: E402

LAST = len(STEPS) - 1
REC = {"commission_need": 2, "push_through": "harsh", "push_action": False, "light_memory_cost": 1}
SOULS = [("child", 1), ("garland", 2), ("king", 2), ("bride", 2), ("open", 2)]


def main(games=200):
    res = {}
    with Pool(4) as pool:
        for lim in (13, 14):
            row = {}
            for soul, lan in SOULS:
                ex = dict(REC, forgotten_limit=lim + (1 if soul == "child" else 0))
                rows = pool.map(one, [(LAST, soul, lan, 4, s, ex) for s in range(games)], chunksize=8)
                row[soul] = summarize(rows)
            res[f"4p|limit{lim}"] = row
            print("4p limit", lim, {k: round(v["win"], 2) for k, v in row.items()}, flush=True)
        for players in (1, 2, 3):
            row = {}
            for soul, lan in SOULS:
                ex = dict(REC, forgotten_limit=13 + (1 if soul == "child" else 0))
                rows = pool.map(one, [(LAST, soul, lan, players, s, ex) for s in range(games)], chunksize=8)
                row[soul] = summarize(rows)
            res[f"{players}p|limit13"] = row
            print(players, "p limit 13", {k: round(v["win"], 2) for k, v in row.items()},
                  {k: v["causes"].get("Nameless", 0) for k, v in row.items()}, flush=True)
    with open("reports/v2_final.json", "w") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
