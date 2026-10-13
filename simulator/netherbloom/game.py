"""Runs one complete game of Netherbloom."""
from .engine import State, GameOver, Config, CARD
from .agent import EchoAgent

TURN_LIMIT = 120


def play_game(cfg, agent=None, record=False):
    agent = agent or EchoAgent(use_book=cfg.use_book)
    s = State.new(cfg)
    if not record:
        s.log = None
    else:
        s.snaps = [s.snapshot([], None)]
    s.last_mist = None
    plays_txt = []
    try:
        while True:
            p = s.cur
            s.turn += 1
            s.hold = False
            s.weaver_used = s.bringer_used = s.breaker_used = False
            s.stats["sought"] = 0
            if s.mantles["warden"] == p:
                s.warden_ready = True
            s.stats["turns_in_reach"][s.reach] += 1
            s.note(f"T{s.turn} P{p + 1} soul@{s.soul} forgotten {len(s.forgotten)} fract {s.fract} "
                   f"bw {s.bw_supply} light {s.light} loom {s.karma} echo {s.echo}")
            agent.maybe_summon(s)
            plays = agent.choose(s)
            s.last_mist = None
            plays_txt = [f"{CARD[cid].cid} {CARD[cid].name} ({mode})" for cid, mode in plays]
            if plays and plays[0][1] == "seek":
                # Seek first: draw, then choose the one remaining card with the new hand (it cannot Resonate).
                s.note(f"  seeks, discarding {CARD[plays[0][0]].cid}")
                s.play(plays[0][0], "seek", agent, first=True)
                second = agent.choose_second(s)
                plays = plays[:1] + ([second] if second else [])
                plays_txt = [f"{CARD[cid].cid} {CARD[cid].name} ({mode})" for cid, mode in plays]
                if second:
                    s.play(second[0], second[1], agent, first=False)
            else:
                for i, (cid, mode) in enumerate(plays):
                    s.note(f"  plays {CARD[cid].cid} {CARD[cid].name} [{mode}]")
                    s.play(cid, mode, agent, first=(i == 0))
            if s.mantles["bringer"] == p and not s.bringer_used:
                s.bringer_used = True
                t = agent.bloom_target(s)
                if t is not None:
                    s.tok[t] = 2
            if s.cfg.step_every == "turn" or p == s.n - 1:
                s.soul_step()
            s.mist_step()
            s.end_of_turn_checks()
            s.draw_up(p)
            if s.n == 1:
                s.ghost_turn(agent)
                s.end_of_turn_checks()
            if s.snaps is not None:
                s.snaps.append(s.snapshot(plays_txt, s.last_mist))
            s.cur = (p + 1) % s.n
            if s.turn >= TURN_LIMIT:
                s.lose("Stalled")
    except GameOver:
        if s.snaps is not None:
            s.snaps.append(s.snapshot(plays_txt, s.last_mist))
    return s


def ending(s):
    """Where the Key Memory ended up, for story-mode endings."""
    if s.cfg.soul == "open":
        return None
    key = next((cid for cid, c in CARD.items() if c.key and c.cid[0] == {"king": "K", "garland": "G",
                                                                       "bride": "B", "child": "L"}[s.cfg.soul]
                and (s.cfg.soul != "garland" or c.cid.startswith("G-"))), None)
    if any(key in page.values() for page in s.book):
        place = "inscribed"
    elif key in s.forgotten:
        place = "forgotten"
    else:
        place = "unspoken"
    tier = "low" if len(s.forgotten) <= 7 else "high"
    return place, tier
