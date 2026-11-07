"""11/7 decisions: Oblivion fates on 'first linger', defy once = 逆命, new hidden endings, player-count thresholds,
and whether a 3-slot chapter 1 cuts the forced turning point. Also counts the root/bloom tokens in play.

    cd simulator && python3 experiments/v5_decide_1107.py
"""
import importlib.util
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool
from statistics import mean

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from experiments.v5_chapters import cfg, BASE_EXTRA, SOULS, DECIDED, TUNED_LEVELS  # noqa: E402
from netherbloom import engine as E  # noqa: E402
from netherbloom import story  # noqa: E402
from netherbloom.game import play_game  # noqa: E402
from netherbloom.storybook_data import SOULS as SD  # noqa: E402

OLD = os.environ.get("CH1_OLD")      # storybook_data.py from before chapter 1 was cut to 2 slots
NEW_CH1 = {k: b[0] for k, b in story.BOOKS.items()}
OLD_CH1 = {}
if OLD:
    spec = importlib.util.spec_from_file_location("sbd_old", OLD)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    for s_old, s_new in zip(mod.SOULS, SD):
        ch = dict(s_new["chapters"][0], nodes=s_old["chapters"][0]["nodes"])   # old route, current fate cards
        OLD_CH1[s_new["key"]] = story._chapter(ch)
THREAD_OF = {s["key"]: {v[0]: k for k, v in s["endings"].items()} for s in SD}
PLAYERS = {1: {"v5_solo_cap_bonus": 2}, 4: {"v5_cap_bonus": 2}}   # 11/7: solo +1 (9), 4 players -1 (6)


def run(a):
    soul, p, sd, ex, level, ch1old = a
    for k in story.BOOKS:
        story.BOOKS[k][0] = (OLD_CH1 if ch1old else NEW_CH1)[k]
    extra = dict(BASE_EXTRA, dissolve=-4, **DECIDED)
    extra.update(TUNED_LEVELS[level])
    extra.update(ex)
    if ex.get("_pp"):
        extra.update(PLAYERS.get(p, {}))
    if ex.get("_solo_hand") and p == 1:
        extra["hand"] = ex["_solo_hand"]
    for k in ("_pp", "_solo_hand"):
        extra.pop(k, None)
    if level == "Gentle":
        extra["dissolve"] = -2
    c = cfg(soul, p, "Standard", sd, extra)
    peak = [0]
    orig = E.State.chapter_step

    def hook(self):
        if not self.sim:
            peak[0] = max(peak[0], sum(1 for t in self.tok if t in (E.ROOT, E.BLOOM)))
        return orig(self)
    E.State.chapter_step = hook
    try:
        s = play_game(c)
    finally:
        E.State.chapter_step = orig
    st = s.stats
    row = {"soul": soul, "p": p, "win": s.result == "win", "peak": peak[0],
           "ch": [st.get(f"ch_end_turn{i}") for i in range(3)],
           "forced": sum(st.get(f"gate_fate_ch{i}", 0) + st.get(f"gate_end_ch{i}", 0) for i in range(3)) > 0}
    if row["win"]:
        ending, defied, hidden, _ = s.story_ending()
        row.update(thread=THREAD_OF[soul].get(ending), defied=defied, hidden=hidden)
    return row


def pct(a, b):
    return round(a / b, 3) if b else None


def summarize(label, rows):
    n = len(rows)
    wins = [r for r in rows if r["win"]]
    lens = []
    for i in range(3):
        ds = [r["ch"][i] - (0 if i == 0 else r["ch"][i - 1]) for r in rows if r["ch"][i] and (i == 0 or r["ch"][i - 1])]
        lens.append(round(mean(ds), 1))
    out = {"label": label, "win": pct(len(wins), n), "chapter_turns": lens, "forced": pct(sum(r["forced"] for r in rows), n),
           "by_players": {p: pct(sum(r["win"] for r in rows if r["p"] == p), sum(r["p"] == p for r in rows)) for p in (1, 2, 3, 4)},
           "by_soul": {s: pct(sum(r["win"] for r in rows if r["soul"] == s), sum(r["soul"] == s for r in rows)) for s in SOULS},
           "ending_thread": {k: pct(v, len(wins)) for k, v in Counter(r["thread"] for r in wins).most_common()},
           "obl_by_soul": {s: pct(sum(r["thread"] == "忘卻" for r in wins if r["soul"] == s), sum(r["soul"] == s for r in wins)) for s in SOULS},
           "defied_1plus": pct(sum(r["defied"] >= 1 for r in wins), len(wins)),
           "hidden_by_soul": {s: pct(sum(r["hidden"] for r in wins if r["soul"] == s), sum(r["soul"] == s for r in wins)) for s in SOULS},
           "peak_tokens": {"mean": round(mean(r["peak"] for r in rows), 1), "max": max(r["peak"] for r in rows),
                           "over_24": pct(sum(r["peak"] > 24 for r in rows), n),
                           "p95": sorted(r["peak"] for r in rows)[int(n * .95)]}}
    print(json.dumps(out, ensure_ascii=False), flush=True)
    return out


if __name__ == "__main__":
    SEEDS = int(os.environ.get("SEEDS", 100))
    if os.environ.get("ROUND") == "2":   # 11/7 second round: Oblivion pull and a 5-card solo hand
        runs = [("基準（含人數門檻）", {"_pp": True}, "Standard", False),
                ("忘川的拉力 3／6／9", {"_pp": True, "v5_obl_pull": (3, 6, 9)}, "Standard", False),
                ("忘川的拉力 4／7／10", {"_pp": True, "v5_obl_pull": (4, 7, 10)}, "Standard", False),
                ("單人手牌 5 張", {"_pp": True, "_solo_hand": 5}, "Standard", False)]
        if os.environ.get("HARD_PULL"):
            runs = [(f"忘川的拉力 {a}／{b}／{c}，關口也拉不回", {"_pp": True, "_solo_hand": 5, "v5_obl_pull": (a, b, c),
                     "v5_obl_pull_hard": True}, "Standard", False) for a, b, c in ((4, 7, 10), (5, 8, 11)) + tuple(tuple(int(x) for x in t.split("-")) for t in os.environ.get("PULLS", "").split(",") if t)]
            runs.insert(0, ("基準（人數門檻＋單人 5 張）", {"_pp": True, "_solo_hand": 5}, "Standard", False))
            if os.environ.get("PULLS"):
                runs = runs[3:]
        out = []
        for label, ex, level, old in runs:
            ps = (1,) if ex.get("_solo_hand") and not os.environ.get("HARD_PULL") else (1, 2, 3, 4)
            args = [(s, p, sd, ex, level, old) for s in SOULS for p in ps for sd in range(SEEDS)]
            with Pool(4) as pool:
                rows = pool.map(run, args, chunksize=10)
            out.append(summarize(label, rows))
        json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "reports", os.environ.get("OUT", "v5ch_decide_1107b.json")), "w"),
                  ensure_ascii=False, indent=1)
        sys.exit()
    runs = [("新規則（第一章 2 格）", {}, "Standard", False),
            ("新規則＋人數門檻", {"_pp": True}, "Standard", False)]
    if OLD:
        runs += [("新規則＋人數門檻＋第一章 3 格", {"_pp": True}, "Standard", True),
                 ("新規則＋人數門檻＋第一章 3 格＋轉折洗掉空格", {"_pp": True, "v5_fate_skip": True}, "Standard", True)]
    runs += [("溫和（最終）", {"_pp": True}, "Gentle", False), ("困難（最終）", {"_pp": True}, "Hard", False)]
    out = []
    for label, ex, level, old in runs:
        args = [(s, p, sd, ex, level, old) for s in SOULS for p in (1, 2, 3, 4) for sd in range(SEEDS)]
        with Pool(4) as pool:
            rows = pool.map(run, args, chunksize=10)
        out.append(summarize(label, rows))
    json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "reports", "v5ch_decide_1107.json"), "w"),
              ensure_ascii=False, indent=1)
