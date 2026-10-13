"""Win-rate matrix for every player count × Soul × Lantern under the current rules.
    python -m experiments.matrix [games per cell]        (from simulator/)
Writes reports/win_matrix.json and reports/win_matrix.md."""
import sys, json
from multiprocessing import Pool
from netherbloom.stats import run_batch

SOULS = ["child", "garland", "open", "king", "bride"]
NAMES = {"child": "Child of the Last Flame", "garland": "Garland Girl", "open": "Open Crossing",
         "king": "King on the Barge", "bride": "Bride Who Stayed Below"}
LANS = (1, 2, 3, 4, 5)
HEAD = "| {} | L1 | L2 | L3 | L4 | L5 |\n|---|---|---|---|---|---|"


def job(a):
    p, soul, lan, n = a
    s = run_batch(n, seed0=10_000, players=p, soul=soul, lantern=lan)
    return p, soul, lan, s["win_rate"], s["turns_mean"]


def markdown(rows, n):
    W = {(p, so, la): w for p, so, la, w, t in rows}
    T = {(p, so, la): t for p, so, la, w, t in rows}
    out = ["# Win-rate matrix (current rules: harsh push-through once per game, Seek)", "",
           f"{n} AI games per cell, Echo-following AI. Rows: Soul × player count; columns: Lantern.", ""]
    for so in SOULS:
        out += ["", f"**{NAMES[so]}**", "", HEAD.format("Players")]
        out += [f"| {p} | " + " | ".join(f"{W[p, so, la]:.0%}" for la in LANS) + " |" for p in (1, 2, 3, 4)]
    out += ["", "**Average over all player counts**", "", HEAD.format("Soul")]
    out += [f"| {NAMES[so]} | " + " | ".join(f"{sum(W[p, so, la] for p in (1, 2, 3, 4)) / 4:.0%}" for la in LANS) + " |"
            for so in SOULS]
    out += ["", "**Average over the four Souls other than the Child**", "", HEAD.format("Players")]
    out += [f"| {p} | " + " | ".join(f"{sum(W[p, so, la] for so in SOULS[1:]) / 4:.0%}" for la in LANS) + " |"
            for p in (1, 2, 3, 4)]
    out += ["", "**Average turns per game (all Souls)**", "", HEAD.format("Players")]
    out += [f"| {p} | " + " | ".join(f"{sum(T[p, so, la] for so in SOULS) / 5:.1f}" for la in LANS) + " |"
            for p in (1, 2, 3, 4)]
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    with Pool() as pool:
        rows = pool.map(job, [(p, so, la, n) for p in (1, 2, 3, 4) for so in SOULS for la in LANS])
    json.dump(rows, open("reports/win_matrix.json", "w"))
    open("reports/win_matrix.md", "w").write(markdown(rows, n))
    for p, so, la, w, t in rows:
        print(p, so, la, f"{w:.3f}", f"{t:.1f}")
