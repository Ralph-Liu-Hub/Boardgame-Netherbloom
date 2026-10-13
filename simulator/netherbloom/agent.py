"""Echo-following AI player.

Each turn the player looks at its own hand and the public board (never at other hands,
because the game is silent), tries its cards in each mode, simulates the result up to the
Soul Step and keeps the best pair of plays. It favours answering the Echo the previous
player left, and tries to leave an Echo the next player can safely follow.
"""
from .cards import OBS, ACC, OBL
from . import engine as E
from .engine import CARD, GameOver, FAR, BLOOM, ROOT, NONE


class Weights:
    def __init__(self, **kw):
        self.progress = 12.0
        self.path = 8.0
        self.root_ahead = 3.0
        self.forgotten = 4.0
        self.forgotten_crunch = 6.0
        self.fracture = 22.0
        self.griev_beside = 14.0
        self.griev_next = 6.0
        self.flood = 7.0
        self.supply_low = 12.0
        self.karma_hot = 8.0
        self.light = 1.5
        self.inscribe = 3.0
        self.echo_follow = 2.0     # bonus for answering the Echo
        self.echo_leave = 1.5      # bonus for leaving a safe Echo for the next player
        self.seek_value = 1.0      # expected worth of the unseen card a Seek draws (higher makes the AI over-seek and lose more)
        for k, v in kw.items():
            setattr(self, k, v)


class EchoAgent:
    def __init__(self, beam=4, weights=None, use_book=True, allow_burn=True):
        self.beam = beam
        self.w = weights or Weights()
        self.use_book = use_book
        self.allow_burn = allow_burn

    # ------------------------------------------------------------ targeting (shared with the engine)
    def root_target(self, s, stony_ok):
        ts = s.root_targets(stony_ok)
        if not ts:
            return None
        best, bv = None, -1e9
        for k in ts:
            sp = k // 2
            v = 0.0
            if s.lit(sp):
                v -= 20
            elif s.tok[k ^ 1] == ROOT:
                v -= 8                   # already has a Root waiting to bloom
            v += 100 - (sp - s.soul) * 6
            if s.revealed[k]:
                v += 2
            if s.flooded[sp] and s.tok[k ^ 1] != NONE:
                v += 10                  # completes the pair that drinks the flood
            if s.griev[k ^ 1]:
                v -= 3
            if v > bv:
                best, bv = k, v
        return best

    def bloom_target(self, s):
        roots = s.bloom_targets()
        if not roots:
            return None
        best, bv = None, -1e9
        for k in roots:
            sp = k // 2
            v = 100 - (sp - s.soul) * 6
            if s.lit(sp):
                v -= 25
            if s.flooded[sp]:
                v -= 15
            if v > bv:
                best, bv = k, v
        return best

    def want_inscribe(self, s, cid):
        return self.use_book

    # ------------------------------------------------------------ evaluation
    def evaluate(self, s):
        if s.result == "win":
            return 1e5 - s.turn
        if s.result == "loss":
            return -1e5
        w, cfg = self.w, s.cfg
        v = s.soul * w.progress
        for sp in range(s.soul + 1, min(FAR, s.soul + 4)):
            if s.passable(sp):
                v += w.path * (1.0 if sp == s.soul + 1 else 0.6)
            else:
                break
        for sp in range(s.soul + 1, min(FAR, s.soul + 4)):
            for b in (0, 1):
                t = s.tok[sp * 2 + b]
                if t == ROOT:
                    v += w.root_ahead
                elif t == BLOOM:
                    v += 1
        f = len(s.forgotten)
        v -= f * w.forgotten + max(0, f - (cfg.forgotten_limit - 4)) ** 2 * w.forgotten_crunch
        v -= s.fract * w.fracture + (25 if s.fract >= cfg.fracture_limit - 1 else 0)
        if s.soul >= 1:
            v -= (s.griev[s.soul * 2] + s.griev[s.soul * 2 + 1]) * w.griev_beside
        if s.soul + 1 <= 11:
            v -= (s.griev[(s.soul + 1) * 2] + s.griev[(s.soul + 1) * 2 + 1]) * w.griev_next
        v -= sum(s.flooded[s.soul + 1:FAR]) * w.flood
        if s.bw_supply == 0:
            v -= 40
        elif s.bw_supply == 1:
            v -= w.supply_low
        for k in s.karma:
            if k >= cfg.karma_cap - 1:
                v -= w.karma_hot
            elif k == cfg.karma_cap - 2:
                v -= 2
        if s.stats.get("resignation_pending"):
            v -= 10
        v += min(s.light, 6) * w.light
        v += s.stats["inscribed"] * w.inscribe
        # Leave the next player an Echo that is safe to follow
        if s.echo >= 0 and s.karma[s.echo] <= cfg.karma_cap - 3:
            v += w.echo_leave
        return v

    def _after_step(self, s):
        try:
            s.soul_step()
        except GameOver:
            pass
        return self.evaluate(s)

    # ------------------------------------------------------------ choices
    def options(self, s, seek=False):
        hand = s.hands[s.cur]
        seen, out = set(), []
        if s.cfg.push_action and not s.stats.get("pushed") and s.blocked_by_grievances():
            out.append((None, "push"))
        if seek and s.cfg.seek and not s.stats.get("sought") and len(hand) > 1:
            out += [(cid, "seek") for cid in dict.fromkeys(hand)]
        for cid in hand:
            key = CARD[cid].cid
            if key in seen:
                continue
            seen.add(key)
            out.append((cid, "up"))
            out.append((cid, "down"))
            if self.allow_burn:
                out.append((cid, "burn"))
        return out

    def _apply(self, s, cid, mode, first):
        try:
            s.play(cid, mode, self, first)
        except GameOver:
            pass

    def choose(self, s):
        firsts = []
        for cid, mode in self.options(s, seek=True):
            c = s.clone()
            res = mode not in ("down", "seek", "push") and c.echo == CARD[cid].tag
            self._apply(c, cid, mode, True)
            bonus = (self.w.echo_follow if res else 0) + (self.w.seek_value if mode == "seek" else 0)
            score = self._after_step(c.clone()) + bonus
            firsts.append((score, cid, mode, c, res, bonus))
        firsts.sort(key=lambda x: -x[0])
        best, bv = None, -1e18
        n_cards = min(s.cfg.cards_per_turn, len(s.hands[s.cur]))
        if n_cards == 1:
            for sc, cid, mode, c, res, bonus in firsts:
                if mode not in ("seek", "push"):
                    return [(cid, mode)]
        for sc1, cid1, mode1, c1, res, bonus in firsts[:self.beam]:
            if c1.result is not None:
                v = self.evaluate(c1)
                if v > bv:
                    best, bv = [(cid1, mode1)], v
                continue
            for cid2, mode2 in self.options(c1):
                c2 = c1.clone()
                self._apply(c2, cid2, mode2, False)
                v = self._after_step(c2) + bonus
                if v > bv:
                    best, bv = [(cid1, mode1), (cid2, mode2)], v
        return best

    def choose_second(self, s):
        """After a Seek: the best single card with the new hand (it cannot Resonate)."""
        best, bv = None, -1e18
        for cid, mode in self.options(s):
            c = s.clone()
            self._apply(c, cid, mode, False)
            v = self._after_step(c)
            if v > bv:
                best, bv = (cid, mode), v
        return best

    def maybe_summon(self, s):
        cost = s.cfg.mantle_cost
        if s.light < cost or len(s.hands[s.cur]) < s.cfg.cards_per_turn + 1:
            return
        if any(h == s.cur for h in s.mantles.values()):
            return
        order = ["bringer", "weaver", "breaker", "warden"]
        if len(s.forgotten) >= s.cfg.adrift_at - 2:
            order = ["warden", "bringer", "weaver", "breaker"]
        from .cards import MANTLES
        for m in order:
            if s.mantles[m] != -1:
                continue
            tag = MANTLES[m]
            matching = [cid for cid in s.hands[s.cur] if CARD[cid].tag == tag]
            if matching:
                s.summon(m, matching[0])
                return
