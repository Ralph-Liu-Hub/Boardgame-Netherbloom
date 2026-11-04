"""V2 setup matrix: Graves in Reach 3 and commissions needed, by player count, Soul and Lantern.

Rules: every V2 step, 4/4/5 river, the tile pool, lighting at 1 Light and the soul pushing through two Shades on
its own (the recommended set). Lanterns are (forgotten limit, black water, harsh Mist per Reach, Mist draws in Reach 3).

    python3 -m experiments.v2_matrix --part standard
    python3 -m experiments.v2_matrix --part lanterns
"""
import argparse
import json
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from experiments.v2 import STEPS, cfg_for  # noqa: E402
from netherbloom.game import play_game  # noqa: E402

LAST = len(STEPS) - 1
BASE = {"layout": "445", "tileset": "pool", "push_through": "harsh", "push_action": False, "light_memory_cost": 1}
LANTERNS = {"Gentle": (16, 6, 0, 1), "Standard": (14, 5, 2, 1), "Hard": (12, 4, 3, 1), "Hard2": (12, 4, 3, 2)}
SOULS = ["child", "garland", "king", "bride", "open"]


def one(args):
    soul, players, graves, need, lantern, seed = args
    lim, bw, harsh, r3 = LANTERNS[lantern]
    ex = dict(BASE, graves_r3=graves, commission_need=need, forgotten_limit=lim + (1 if soul == "child" else 0),
              bw_supply=bw, harsh_per_reach=0 if soul == "child" else harsh, r3_mist_draws=r3)
    s = play_game(cfg_for(LAST, soul, 2, players, seed, ex))
    return s.result == "win", s.cause


def cell(pool, soul, players, graves, need, lantern, games):
    rows = pool.map(one, [(soul, players, graves, need, lantern, s) for s in range(games)], chunksize=10)
    return {"win": sum(r[0] for r in rows) / games,
            "nameless": sum(r[1] == "Nameless" for r in rows) / games}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=200)
    ap.add_argument("--part", default="standard", choices=["standard", "lanterns"])
    ap.add_argument("--matrix", default=None, help="JSON {players: [graves, need]} for --part lanterns")
    a = ap.parse_args()
    res = {}
    with Pool(4) as pool:
        if a.part == "standard":
            combos = [(4, 2, n) for n in (1, 2, 3)] + [(3, g, n) for g in (1, 2) for n in (1, 2, 3)] \
                + [(2, 1, 2), (2, 2, 2), (2, 1, 1)] + [(1, g, 1) for g in (1, 2)]
            for players, graves, need in combos:
                row = {soul: cell(pool, soul, players, graves, need, "Standard", a.games) for soul in SOULS}
                res[f"{players}p|graves{graves}|need{need}"] = row
                print(players, "p graves", graves, "need", need,
                      {k: round(v["win"] * 100) for k, v in row.items()}, flush=True)
        else:
            matrix = json.loads(a.matrix)   # {lantern: {players: [graves, need]}}
            for lantern, by_players in matrix.items():
                for players, (graves, need) in by_players.items():
                    row = {soul: cell(pool, soul, int(players), graves, need, lantern, a.games) for soul in SOULS}
                    res[f"{lantern}|{players}p|graves{graves}|need{need}"] = row
                    print(lantern, players, "p", {k: round(v["win"] * 100) for k, v in row.items()}, flush=True)
    with open(f"reports/v2_matrix_{a.part}.json", "w") as f:
        json.dump(res, f, indent=1)


if __name__ == "__main__":
    main()
