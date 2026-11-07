"""Final difficulty check with every 11/7 decision (pull of Lethe 3/5/7 taking 2 cards, solo hand 5, player-count loom).

    cd simulator && python3 experiments/v5_final_levels.py
"""
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool
from statistics import mean

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from experiments.v5_chapters import cfg, BASE_EXTRA, SOULS, DECIDED, PLAYER_DECIDED, TUNED_LEVELS  # noqa: E402
from netherbloom.game import play_game  # noqa: E402
from netherbloom.storybook_data import SOULS as SD  # noqa: E402

THREAD_OF = {s["key"]: {v[0]: k for k, v in s["endings"].items()} for s in SD}
DISSOLVE = {"Gentle": -2, "Standard": -4, "Hard": -4}   # 14 / 12 / 12


def run(a):
    soul, p, sd, level = a
    extra = dict(BASE_EXTRA, **DECIDED)
    extra.update(TUNED_LEVELS[level])
    extra.update(PLAYER_DECIDED.get(p, {}))
    extra["dissolve"] = DISSOLVE[level]
    s = play_game(cfg(soul, p, "Standard", sd, extra))
    st = s.stats
    row = {"soul": soul, "p": p, "win": s.result == "win", "cause": s.cause,
           "ch": [st.get(f"ch_end_turn{i}") for i in range(3)], "turns": s.turn}
    if row["win"]:
        ending, defied, hidden, _ = s.story_ending()
        row.update(thread=THREAD_OF[soul].get(ending), defied=defied, hidden=hidden)
    return row


def pct(a, b):
    return round(a / b, 3) if b else None


if __name__ == "__main__":
    seeds = int(os.environ.get("SEEDS", 100))
    out = []
    for level in ("Gentle", "Standard", "Hard"):
        args = [(s, p, sd, level) for s in SOULS for p in (1, 2, 3, 4) for sd in range(seeds)]
        with Pool(4) as pool:
            rows = pool.map(run, args, chunksize=10)
        n = len(rows)
        wins = [r for r in rows if r["win"]]
        lens = []
        for i in range(3):
            ds = [r["ch"][i] - (0 if i == 0 else r["ch"][i - 1]) for r in rows if r["ch"][i] and (i == 0 or r["ch"][i - 1])]
            lens.append(round(mean(ds), 1))
        res = {"level": level, "win": pct(len(wins), n), "turns": round(mean(r["turns"] for r in rows), 1), "chapter_turns": lens,
               "by_players": {p: pct(sum(r["win"] for r in rows if r["p"] == p), sum(r["p"] == p for r in rows)) for p in (1, 2, 3, 4)},
               "by_soul": {s: pct(sum(r["win"] for r in rows if r["soul"] == s), sum(r["soul"] == s for r in rows)) for s in SOULS},
               "ending_thread": {k: pct(v, len(wins)) for k, v in Counter(r["thread"] for r in wins).most_common()},
               "defied_1plus": pct(sum(r["defied"] >= 1 for r in wins), len(wins)),
               "hidden_by_soul": {s: pct(sum(r["hidden"] for r in wins if r["soul"] == s), sum(r["soul"] == s for r in wins)) for s in SOULS},
               "loss_causes": {k: pct(v, n) for k, v in Counter(r["cause"] for r in rows if not r["win"]).most_common()}}
        print(json.dumps(res, ensure_ascii=False), flush=True)
        out.append(res)
    json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "reports", "v5ch_final_levels.json"), "w"),
              ensure_ascii=False, indent=1)
