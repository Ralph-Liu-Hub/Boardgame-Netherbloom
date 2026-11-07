import sys, json
sys.path.insert(0, ".")
from collections import Counter
from multiprocessing import Pool
from experiments.v5_chapters import cfg, BASE_EXTRA, SOULS, DECIDED
from netherbloom.game import play_game
from netherbloom import agent as A
from netherbloom.engine import CARD
from netherbloom.cards import OBL

def classify(s):
    if not s.cfg.use_book or s.page_turn: return None
    nodes = s.chapter_def()["nodes"]; w = s.walk[s.ch]; cur = w[-1]; k = nodes[cur]["kind"]
    if k == "f": return "fate"
    if k == "o": return None
    slots = s.open_slots()
    if not slots: return None
    cats = {nodes[x]["cat"] for x in slots}
    have = any(CARD[c].tag != OBL and CARD[c].slot in cats for h in s.hands for c in h)
    return ("fork" if k == "p" else "slot") + ("_ok" if have else "_none")

def run(args):
    soul, p, sd, ex = args
    c = cfg(soul, p, "Standard", sd, dict(BASE_EXTRA, dissolve=-4, **DECIDED, **ex))
    log = []
    orig = A.EchoAgent.maybe_summon
    def hook(self, s):
        log.append(classify(s)); return orig(self, s)
    A.EchoAgent.maybe_summon = hook
    try: g = play_game(c)
    finally: A.EchoAgent.maybe_summon = orig
    # stall runs: consecutive turns in the same blocked class
    runs = {"fork_none": [], "slot_none": [], "fate": []}
    prev, n = None, 0
    for x in log + [None]:
        key = x if x in runs else None
        if key == prev and key: n += 1
        else:
            if prev: runs[prev].append(n)
            prev, n = key, 1 if key else 0
    st = g.stats
    info = {"win": g.result == "win", "paid": st.get("fate_paid", 0),
            "gate": sum(st.get(f"gate_fate_ch{i}", 0) + st.get(f"gate_end_ch{i}", 0) for i in range(3)) > 0,
            "ch": [st.get(f"ch_end_turn{i}") for i in range(3)],
            "defy": sum(1 for p in g.paths if p and p[0] != p[1])}
    return Counter(log), runs, len(log), info

if __name__ == "__main__":
    from statistics import mean
    out = []
    for label, ex in (("目前", {}), ("付 1 光", {"v5_fate_pay": 1}), ("付 2 光", {"v5_fate_pay": 2})):
        args = [(s, p, sd, ex) for s in SOULS for p in (1, 2, 3, 4) for sd in range(80)]
        with Pool(4) as pool: res = pool.map(run, args, chunksize=8)
        tot = Counter(); T = 0; R = {"fork_none": [], "slot_none": [], "fate": []}
        for c, r, n, _ in res:
            tot += c; T += n
            for k in R: R[k] += r[k]
        infos = [x[3] for x in res]; N = len(infos)
        lens = []
        for i in range(3):
            ds = [f["ch"][i] - (0 if i == 0 else f["ch"][i-1]) for f in infos if f["ch"][i] and (i == 0 or f["ch"][i-1])]
            lens.append(round(mean(ds), 1))
        row = {"label": label, "win": round(sum(f["win"] for f in infos)/N, 3), "chapters": lens,
               "gate": round(sum(f["gate"] for f in infos)/N, 3), "paid": round(mean(f["paid"] for f in infos), 2),
               "defy": round(mean(f["defy"] for f in infos), 2),
               "share": {k: round(v / T, 3) for k, v in tot.items()}}
        for k, v in R.items():
            d = Counter(min(x, 4) for x in v)
            row[k] = {"runs": round(len(v)/N, 2), "mean": round(sum(v)/max(1, len(v)), 2),
                      "dist": {i: round(d[i]/max(1, len(v)), 2) for i in sorted(d)}}
        out.append(row); print(row, flush=True)
    json.dump(out, open("reports/v5ch_stall.json", "w"), ensure_ascii=False, indent=1)
