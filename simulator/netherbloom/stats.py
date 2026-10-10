"""Batch runs and summary statistics."""
from collections import Counter
from statistics import mean

from .engine import Config
from .game import play_game, ending


def run_batch(n=500, seed0=0, agent_factory=None, **cfg_kw):
    games = []
    for i in range(n):
        cfg = Config(seed=seed0 + i, **cfg_kw)
        agent = agent_factory(cfg) if agent_factory else None
        games.append(play_game(cfg, agent))
    return summarize(games)


def summarize(games):
    n = len(games)
    wins = [g for g in games if g.result == "win"]
    losses = [g for g in games if g.result == "loss"]
    causes = Counter(g.cause for g in losses)
    cfg = games[0].cfg

    def near_miss(g):
        return (g.stats["max_forgotten"] >= cfg.forgotten_limit - 1 or g.stats["max_fract"] >= cfg.fracture_limit - 1
                or g.stats["min_bw_supply"] <= 0)

    def tension(g):
        """How many of the three loss tracks got at least half way to the end."""
        return sum([g.stats["max_forgotten"] >= cfg.forgotten_limit / 2,
                    g.stats["max_fract"] >= 2,
                    g.stats["min_bw_supply"] <= cfg.bw_supply / 2])

    out = {
        "games": n,
        "win_rate": len(wins) / n,
        "loss_causes": {k: v / max(1, len(losses)) for k, v in causes.items()},
        "turns_mean": mean(g.turn for g in games),
        "turns_win_mean": mean(g.turn for g in wins) if wins else None,
        "turns_by_reach": [round(mean(g.stats["turns_in_reach"][r] for g in games), 1) for r in range(3)],
        "near_miss_wins": (sum(near_miss(g) for g in wins) / len(wins)) if wins else None,
        "tracks_half_full": round(mean(tension(g) for g in games), 2),
        "backlash_per_reach": [round(mean(g.stats["backlash_by_reach"][r] for g in games), 2) for r in range(3)],
        "resonance_rate": mean(g.stats["resonances"] / max(1, g.turn) for g in games),
        "inscriptions": mean(g.stats["inscribed"] for g in games),
        "full_pages": mean(g.stats["pages_full"] for g in games),
        "keepsakes": mean(g.stats["keepsakes"] for g in games),
        "burns": mean(g.stats["burns"] for g in games),
        "lingers": mean(g.stats["lingers"] for g in games),
        "summons": mean(g.stats["summons"] for g in games),
        "oblivion_played": mean(g.stats["oblivion_played"] for g in games),
        "final_forgotten": mean(len(g.forgotten) for g in games),
        "endings": None,
    }
    if cfg.soul != "open" and wins:
        out["endings"] = dict(Counter("/".join(ending(g)) for g in wins))
    return out


def fmt(summary):
    lines = []
    for k, v in summary.items():
        if isinstance(v, float):
            v = round(v, 3)
        if isinstance(v, dict):
            v = {a: round(b, 3) if isinstance(b, float) else b for a, b in v.items()}
        lines.append(f"  {k:20s} {v}")
    return "\n".join(lines)
