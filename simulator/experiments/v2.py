"""V2 proposal (docs/design/V2-proposal.zh-TW.md): add the V2 rules one at a time and measure each step.

    python3 -m experiments.v2 --games 300 --out reports
"""
import argparse
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool
from statistics import mean

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from netherbloom.engine import Config  # noqa: E402
from netherbloom.game import play_game  # noqa: E402

# Each step keeps everything before it.
STEPS = [
    ("V3.2", {}),
    ("no page rewards / blessings", {"book_mode": "none"}),
    ("3/4/5 river", {"layout": "345"}),
    ("no Push Through", {"push_through": "off"}),
    ("light memories (2) + commissions + replace", {"light_memory_cost": 2, "commissions": True, "replace_memories": True}),
    ("deck: Unremember x2, Lightless Crossing, Vigil lights", {"deck_v2": True, "vigil_mode": "kindle"}),
    ("Reach transitions", {"transitions": True}),
    ("Burn inscribes, face-down Light", {"burn_inscribe": True, "facedown_light": True}),
    ("V2 Mantles", {"mantles_v2": True}),
    ("V2 bank tiles", {"tileset": "v2"}),
    ("V2 Mist", {"mist_v2": True}),
    ("never back a Reach", {"back_rule": True}),
]

SOULS = [("child", 1), ("garland", 2), ("king", 2), ("bride", 2), ("open", 2)]


def cfg_for(step_idx, soul, lantern, players, seed, extra=None):
    kw = {}
    for _, d in STEPS[:step_idx + 1]:
        kw.update(d)
    if soul == "open" and kw.get("tileset") == "v2":
        kw["start_light"] = 2          # V2: the Nameless loses the Memory Site Light; it starts with 2
    if extra:
        kw.update(extra)
    return Config(players=players, soul=soul, lantern=lantern, seed=seed, **kw)


def one(args):
    step_idx, soul, lantern, players, seed, extra = args
    s = play_game(cfg_for(step_idx, soul, lantern, players, seed, extra))
    st = s.stats
    return {"win": s.result == "win", "cause": s.cause, "turns": s.turn,
            "r3": st["turns_in_reach"][2], "inscribed": st["inscribed"], "lit": st.get("lit", 0),
            "comm_done": st.get("comm_done"), "light_mem": st.get("light_on_memories", 0),
            "recalls": st.get("light_actions", 0), "summons": st["summons"], "burns": st["burns"],
            "burn_insc": st.get("burn_inscribes", 0), "spring": st.get("spring_inscribes", 0),
            "crossings": st.get("crossings", 0), "stays": st.get("stays", 0), "reaps": st.get("reaps", 0),
            "redraws": st.get("redraws", 0), "replaced": st.get("replaced", 0), "peeled": st.get("peeled", 0),
            "pushed_back": st.get("pushed_back", 0), "fdlight": st.get("facedown_light", 0),
            "max_fract": st["max_fract"], "max_forgotten": st["max_forgotten"]}


def summarize(rows):
    n = len(rows)
    losses = [r for r in rows if not r["win"]]
    causes = Counter(r["cause"] for r in losses)
    out = {"games": n, "win": sum(r["win"] for r in rows) / n,
           "causes": {k: round(v / n, 3) for k, v in causes.most_common()},
           "turns": mean(r["turns"] for r in rows), "r3_turns": mean(r["r3"] for r in rows)}
    for k in ("inscribed", "lit", "light_mem", "recalls", "summons", "burns", "burn_insc", "spring", "crossings",
              "stays", "reaps", "redraws", "replaced", "peeled", "pushed_back", "fdlight"):
        out[k] = round(mean(r[k] for r in rows), 2)
    done = [r["comm_done"] for r in rows if r["comm_done"] is not None]
    out["comm_done_at_shore"] = round(mean(done), 2) if done else None
    return out


def run(jobs, pool):
    return pool.map(one, jobs, chunksize=8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=300)
    ap.add_argument("--out", default="reports")
    ap.add_argument("--part", default="steps", choices=["steps", "players", "lanterns", "blessing"])
    a = ap.parse_args()
    res = {}
    with Pool(4) as pool:
        if a.part == "steps":
            for i, (name, _) in enumerate(STEPS):
                for soul, lan in SOULS:
                    rows = run([(i, soul, lan, 4, seed, None) for seed in range(a.games)], pool)
                    res[f"{i}|{name}|{soul}|L{lan}|4p"] = summarize(rows)
                    print(i, name, soul, round(res[f"{i}|{name}|{soul}|L{lan}|4p"]["win"], 3), flush=True)
        elif a.part == "players":
            last = len(STEPS) - 1
            for players in (1, 2, 3, 4):
                for soul, lan in SOULS:
                    rows = run([(last, soul, lan, players, seed, None) for seed in range(a.games)], pool)
                    res[f"{players}p|{soul}|L{lan}"] = summarize(rows)
                    print(players, soul, round(res[f"{players}p|{soul}|L{lan}"]["win"], 3), flush=True)
    os.makedirs(a.out, exist_ok=True)
    path = os.path.join(a.out, f"v2_{a.part}.json")
    with open(path, "w") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    print("wrote", path)


if __name__ == "__main__":
    main()
