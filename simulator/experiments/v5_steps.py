"""V5: add the V5 rules to V4.0 one at a time (values as written in the proposal) and measure each step.

    python3 -m experiments.v5_steps --games 100

Writes reports/v5_steps.json.
"""
import argparse
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from experiments.v5 import one, V5, SOULS  # noqa: E402

ORDER = [
    ("引發共鳴後點亮", "v5_light_after"), ("奮力駛過改自由行動", "v5_push_free"), ("換牌取代焚燒", "v5_swap"),
    ("喚回改為銘刻", "v5_recall"), ("背面打出加結", "v5_facedown_knot"), ("託付提前翻開", "v5_reveal"),
    ("根網特性", "v5_traits"), ("根網所及與斷根", "v5_reach"), ("怨念推進織機", "v5_griev_loom"),
    ("收光／留光（光牆）", "v5_keep"), ("迷霧深度", "v5_depth"), ("傷疤、三級反噬、迷霧加結、結跨河段", "v5_scars"),
    ("霧區與籠罩", "v5_fog"), ("命運之霧", "v5_fate"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=100)
    a = ap.parse_args()
    off = {k: False for k in V5 if k.startswith("v5_")}
    off.update(transitions=False, garland_gift=False)
    res = []
    with Pool(4) as pool:
        def cell(extra, v5):
            rows = pool.map(one, [(s, p, "Standard", sd, extra, v5) for s in SOULS for p in (1, 2, 3, 4)
                                  for sd in range(a.games)], chunksize=10)
            n = len(rows)
            return {"win": round(sum(r["win"] for r in rows) / n, 3),
                    "turns": round(sum(r["turns"] for r in rows) / n, 1),
                    "backlash": round(sum(r["backlash"] for r in rows) / n, 2),
                    "causes": {k: round(v / n, 3) for k, v in Counter(r["cause"] for r in rows if not r["win"]).most_common()}}
        base = cell(None, False)
        res.append(["V4.0", base])
        print("V4.0", base, flush=True)
        cur = dict(off)
        for name, key in ORDER:
            cur[key] = True
            r = cell(dict(cur), True)
            res.append(["＋" + name, r])
            print(name, r, flush=True)
    with open("reports/v5_steps.json", "w") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
