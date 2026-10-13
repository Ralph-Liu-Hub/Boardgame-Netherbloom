"""Win-rate matrix for every player count × Soul × Lantern under the current rules.
    python -m experiments.matrix [games per cell]        (from simulator/)"""
import sys, json
from multiprocessing import Pool
from netherbloom.stats import run_batch

SOULS = ["child", "garland", "open", "king", "bride"]


def job(a):
    p, soul, lan, n = a
    s = run_batch(n, seed0=10_000, players=p, soul=soul, lantern=lan)
    return p, soul, lan, s["win_rate"], s["turns_mean"]


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    with Pool() as pool:
        rows = pool.map(job, [(p, so, la, n) for p in (1, 2, 3, 4) for so in SOULS for la in (1, 2, 3, 4, 5)])
    json.dump(rows, open("reports/win_matrix.json", "w"))
    for p, so, la, w, t in rows:
        print(p, so, la, f"{w:.3f}", f"{t:.1f}")
