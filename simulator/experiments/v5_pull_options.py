"""The pull of Lethe: does a chapter-1 pull lock in Oblivion? Compares the whole-pile rule with
option 1 (count only this chapter's forgetting) and option 2 (the river takes 3 forgotten cards).

    cd simulator && python3 experiments/v5_pull_options.py
"""
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool
from statistics import mean

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from experiments.v5_chapters import cfg, BASE_EXTRA, SOULS, DECIDED, PLAYER_DECIDED  # noqa: E402
from netherbloom.cards import OBL  # noqa: E402
from netherbloom.game import play_game  # noqa: E402
from netherbloom.storybook_data import SOULS as SD  # noqa: E402

THREAD_OF = {s["key"]: {v[0]: k for k, v in s["endings"].items()} for s in SD}
VARIANTS = [
    ("現行：整個遺忘堆 3／5／7", {}),
    ("選項 1：只算本章遺忘 2／2／3", {"v5_obl_pull_mode": "chapter", "v5_obl_pull": (2, 2, 3)}),
    ("選項 1：只算本章遺忘 2／3／3", {"v5_obl_pull_mode": "chapter", "v5_obl_pull": (2, 3, 3)}),
    ("選項 1：只算本章遺忘 3／3／4", {"v5_obl_pull_mode": "chapter", "v5_obl_pull": (3, 3, 4)}),
    ("選項 2：河水帶走 3 張（移出遊戲）3／5／7", {"v5_obl_pull_take": 3, "v5_obl_pull_take_to": "box"}),
    ("選項 2：河水帶走 3 張（回棄牌堆）3／5／7", {"v5_obl_pull_take": 3, "v5_obl_pull_take_to": "discard"}),
    ("選項 2：河水帶走 2 張（移出遊戲）3／5／7（11/7 決定）", {"v5_obl_pull_take": 2, "v5_obl_pull_take_to": "box"}),
]
if os.environ.get("ONLY"):
    VARIANTS = [v for v in VARIANTS if os.environ["ONLY"] in v[0]]


def run(a):
    soul, p, sd, ex = a
    extra = dict(BASE_EXTRA, dissolve=-4, **DECIDED)
    extra.update(PLAYER_DECIDED.get(p, {}))
    extra.update(ex)
    s = play_game(cfg(soul, p, "Standard", sd, extra))
    st = s.stats
    row = {"soul": soul, "p": p, "win": s.result == "win", "cause": s.cause,
           "pull": [st.get(f"obl_pull_ch{i}", 0) for i in range(3)],
           "obl": [None if x is None else x[1] == OBL for x in s.paths], "taken": st.get("obl_taken", 0)}
    if row["win"]:
        ending, defied, hidden, _ = s.story_ending()
        row.update(thread=THREAD_OF[soul].get(ending), defied=defied)
    return row


def pct(a, b):
    return round(a / b, 3) if b else None


def summarize(label, rows):
    n = len(rows)
    wins = [r for r in rows if r["win"]]
    c1 = [r for r in rows if r["pull"][0]]
    c1r2 = [r for r in c1 if r["obl"][1] is not None]
    c1w = [r for r in c1 if r["win"]]
    rest = [r for r in rows if not r["pull"][0] and r["obl"][1] is not None]
    out = {"label": label, "win": pct(len(wins), n),
           "by_players": {p: pct(sum(r["win"] for r in rows if r["p"] == p), sum(r["p"] == p for r in rows)) for p in (1, 2, 3, 4)},
           "ending_thread": {k: pct(v, len(wins)) for k, v in Counter(r["thread"] for r in wins).most_common()},
           "defied_1plus": pct(sum(r["defied"] >= 1 for r in wins), len(wins)),
           "pulled_any": pct(sum(any(r["pull"]) for r in rows), n),
           "ch1_pulled": pct(len(c1), n),
           "ch2_pulled_after_ch1": pct(sum(r["pull"][1] for r in c1r2), len(c1r2)),
           "ch2_pulled_otherwise": pct(sum(r["pull"][1] for r in rest), len(rest)),
           "ch2_obl_after_ch1": pct(sum(r["obl"][1] for r in c1r2), len(c1r2)),
           "obl_ending_after_ch1_pull": pct(sum(r["thread"] == "忘卻" for r in c1w), len(c1w)),
           "taken_per_game": round(mean(r["taken"] for r in rows), 2), "loss_causes": {k: pct(v, n) for k, v in Counter(r["cause"] for r in rows if not r["win"]).most_common()}}
    print(json.dumps(out, ensure_ascii=False), flush=True)
    return out


if __name__ == "__main__":
    seeds = int(os.environ.get("SEEDS", 100))
    out = []
    for label, ex in VARIANTS:
        args = [(s, p, sd, ex) for s in SOULS for p in (1, 2, 3, 4) for sd in range(seeds)]
        with Pool(4) as pool:
            rows = pool.map(run, args, chunksize=10)
        out.append(summarize(label, rows))
    json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "reports", os.environ.get("OUT", "v5ch_pull_options.json")), "w"),
              ensure_ascii=False, indent=1)
