"""Rules engine for Netherbloom (GDD v0.4).

The state is plain lists and ints so that the AI can clone it cheaply.
Bank slots are indexed slot = space * 2 + bank for spaces 1..11 (bank 0 upper, 1 lower).
"""
import random

from . import cards as C
from .cards import OBS, ACC, OBL, FERTILE, STONY, MEMORY, GRAVE

FAR = 12            # the Far Shore
NSLOT = 24          # spaces 0..11 x 2 banks (space 0 unused)
NONE, ROOT, BLOOM = 0, 1, 2

ALL_CARDS = C.CORE + C.ECHO + [c for pack in C.SOULS.values() for c in pack]
CARD = {i: c for i, c in enumerate(ALL_CARDS)}
INDEX = {c.cid: i for i, c in CARD.items()}


def reach_of(space):
    return 0 if space <= 4 else 1 if space <= 8 else 2


class Config:
    """Everything a game needs to know before it starts. Defaults follow GDD v0.4 at the Standard Lantern."""

    def __init__(self, players=3, soul="open", lantern=C.STANDARD_LANTERN, use_book=True, seed=None, **overrides):
        self.players = players
        self.soul = soul                      # "open", "king", "garland", "bride", "child"
        self.lantern = lantern
        self.use_book = use_book
        self.seed = seed
        bw, limit, harsh = C.LANTERN[lantern]
        self.bw_supply = bw
        self.forgotten_limit = limit
        self.harsh_per_reach = harsh
        self.fracture_limit = 3
        self.karma_cap = {1: 5, 2: 4, 3: 4, 4: 5}[players]
        self.ash_at = 6
        self.adrift_at = 9
        self.mantle_cost = 3
        self.hand = {1: 4, 2: 3, 3: 3, 4: 3}[players]
        self.cards_per_turn = 2
        self.blessing_at = 3
        self.start_light = 0
        self.linger_rule = "dark"  # tuning: "always" forget on Linger, or "dark" only if the soul's own space is unlit
        self.step_every = "turn"     # tuning: Soul Step every "turn" or once per "round"
        self.drink = "root"          # tuning: roots drink a flood when both banks hold a "root" (or bloom), or only "bloom"
        self.bw_returns = False      # tuning: drained Black Water returns to the supply (False: it leaves the game)
        self.key_any = True          # tuning: a Key Memory may be inscribed whenever played face up
        self.bride_once = True       # tuning: the Bride is pulled back only once per game
        self.bride_forgets = False   # tuning: the Bride still forgets when pulled back
        self.lit_both = False        # tuning: a space is Lit only with Blooms on both banks
        self.burn_forget = 2         # tuning: cards forgotten per Burn
        self.extra_mist = 2          # tuning: extra Rising Water / Grievance cards per Reach deck
        self.light_per_bloom = 1     # tuning: Light gained per Bloom passed
        self.ghost_forgets = False   # tuning: the Ghost's Oblivion card forgets 1
        self.push_through = "harsh"  # if Grievances hold both banks ahead, the soul pushes through: "off", "fracture" (+1 Fracture) or "harsh" (+1 Fracture, forget 1)
        self.push_scope = "game"     # the first push per "game" (or "reach") costs the base price; "none": every push costs the base price
        self.push_again = "escalate" # a later push in the same scope: "escalate" (+1 Fracture each time) or "linger" (not allowed)
        self.seek = True             # one action per turn may be Seek: discard a card and draw one (that turn's next card cannot Resonate)
        for k, v in overrides.items():
            if not hasattr(self, k):
                raise KeyError(f"unknown config option {k}")
            setattr(self, k, v)
        # Soul twists
        if soul == "king":
            self.mantle_cost = overrides.get("mantle_cost", 2)
        if soul == "garland":
            self.blessing_at = overrides.get("blessing_at", 2)
        if soul == "child":
            self.start_light = overrides.get("start_light", 3)
            self.adrift_at = 99
            self.forgotten_limit = overrides.get("forgotten_limit", self.forgotten_limit + 1)
            self.harsh_per_reach = 0


class GameOver(Exception):
    pass


class State:
    __slots__ = (
        "cfg", "rng", "sim", "n", "cur", "turn", "hands", "deck", "discard", "forgotten",
        "soul", "tok", "griev", "tile", "revealed", "flooded", "bw_supply", "fract", "light",
        "karma", "echo", "mist", "reach", "book", "blessed", "keepsakes", "mantles",
        "warden_ready", "hold", "shield_until", "weaver_used", "bringer_used", "breaker_used",
        "bride_pulled", "child_shield", "ghost", "result", "cause", "log", "stats", "snaps", "last_mist",
    )

    # ------------------------------------------------------------- setup
    @classmethod
    def new(cls, cfg):
        s = cls()
        s.cfg = cfg
        s.rng = random.Random(cfg.seed)
        s.sim = False
        s.n = cfg.players
        s.cur = 0
        s.turn = 0
        deck = [INDEX[c.cid] for c in C.CORE]
        extra = C.ECHO if cfg.soul == "open" else C.SOULS[cfg.soul]
        deck += [INDEX[c.cid] for c in extra]
        s.rng.shuffle(deck)
        s.deck = deck
        s.discard, s.forgotten = [], []
        s.soul = 0
        s.tok = [NONE] * NSLOT
        s.griev = [False] * NSLOT
        s.tile = [FERTILE] * NSLOT
        s.revealed = [True] * NSLOT
        for r, (spaces, mix) in C.TILES.items():
            mix = list(mix)
            s.rng.shuffle(mix)
            for i, sp in enumerate(spaces):
                for b in (0, 1):
                    k = sp * 2 + b
                    s.tile[k] = mix[i * 2 + b]
                    s.revealed[k] = False
        s.tok[2] = s.tok[3] = BLOOM           # both banks of space 1
        s.flooded = [False] * (FAR + 1)
        s.bw_supply = cfg.bw_supply
        s.fract = 0
        s.light = cfg.start_light
        s.karma = [0, 0, 0]
        s.echo = -1
        harsh = list(range(len(C.HARSH)))
        s.rng.shuffle(harsh)
        s.mist = []
        for r in range(3):
            d = list(C.MIST[r])
            for _ in range(cfg.harsh_per_reach):
                if harsh:
                    d.append(C.HARSH[harsh.pop()])
            for i in range(cfg.extra_mist):
                d.append(("Rising Water", [("bw", 2)]) if i % 2 == 0 else ("Grievance Drawn Near", [("grv_near",)]))
            s.rng.shuffle(d)
            s.mist.append(d)
        s.reach = 0
        s.book = [dict(), dict(), dict()]
        s.blessed = [False, False, False]
        s.keepsakes = [0, 0, 0]
        s.mantles = {m: -1 for m in C.MANTLES}
        s.warden_ready = True
        s.hold = False
        s.shield_until = -1
        s.weaver_used = s.bringer_used = s.breaker_used = False
        s.bride_pulled = [False, False, False]
        s.child_shield = [True, True, True] if cfg.soul == "child" else [False] * 3
        s.ghost = None
        if cfg.players == 1:
            g = list(C.GHOST)
            s.rng.shuffle(g)
            s.ghost = g
        s.hands = [[] for _ in range(cfg.players)]
        for p in range(cfg.players):
            for _ in range(cfg.hand):
                s.hands[p].append(s.deck.pop())
        s.result = None          # "win" / "loss"
        s.cause = None           # "Faded" / "Shattered" / "Deluge"
        s.log = []
        s.snaps = None
        s.stats = dict(backlash=[0, 0, 0], backlash_by_reach=[0, 0, 0], resonances=0, plays_up=0,
                       inscribed=0, pages_full=0, blessings=0, burns=0, summons=0, lingers=0,
                       exposures=0, turns_in_reach=[0, 0, 0], max_forgotten=0, max_fract=0,
                       min_bw_supply=cfg.bw_supply, keepsakes=0, oblivion_played=0,
                       face_down=0, guides=0, ghost_turns=0)
        return s

    def clone(self):
        s = State.__new__(State)
        s.cfg, s.rng, s.sim = self.cfg, random.Random(0), True
        s.n, s.cur, s.turn = self.n, self.cur, self.turn
        s.hands = [list(h) for h in self.hands]
        s.deck, s.discard, s.forgotten = list(self.deck), list(self.discard), list(self.forgotten)
        s.soul = self.soul
        s.tok, s.griev, s.tile, s.revealed = list(self.tok), list(self.griev), self.tile, list(self.revealed)
        s.flooded = list(self.flooded)
        s.bw_supply, s.fract, s.light = self.bw_supply, self.fract, self.light
        s.karma, s.echo = list(self.karma), self.echo
        s.mist, s.reach = self.mist, self.reach
        s.book = [dict(b) for b in self.book]
        s.blessed, s.keepsakes = list(self.blessed), list(self.keepsakes)
        s.mantles = dict(self.mantles)
        s.warden_ready, s.hold, s.shield_until = self.warden_ready, self.hold, self.shield_until
        s.weaver_used, s.bringer_used, s.breaker_used = self.weaver_used, self.bringer_used, self.breaker_used
        s.bride_pulled, s.child_shield = list(self.bride_pulled), list(self.child_shield)
        s.ghost = self.ghost
        s.result, s.cause = self.result, self.cause
        s.log = None
        s.snaps = None
        s.stats = {k: (list(v) if isinstance(v, list) else v) for k, v in self.stats.items()}
        return s

    # ------------------------------------------------------------- helpers
    def note(self, msg):
        if self.log is not None:
            self.log.append(msg)

    def lit(self, sp):
        if sp >= FAR:
            return True
        if self.cfg.lit_both:
            return self.tok[sp * 2] == BLOOM and self.tok[sp * 2 + 1] == BLOOM
        return self.tok[sp * 2] == BLOOM or self.tok[sp * 2 + 1] == BLOOM

    def passable(self, sp):
        return sp >= FAR or (self.lit(sp) and not self.flooded[sp])

    def snapshot(self, plays, mist):
        """A JSON-ready picture of the board, for the replay viewer."""
        slots = []
        for k in range(2, NSLOT):
            slots.append({"space": k // 2, "bank": k % 2, "token": ["", "root", "bloom"][self.tok[k]],
                          "grievance": self.griev[k],
                          "tile": C.TILE_NAMES[self.tile[k]] if self.revealed[k] else "fog"})
        book = [{slot: CARD[cid].band for slot, cid in page.items()} for page in self.book]
        return {"turn": self.turn, "player": self.cur + 1, "soul": min(self.soul, FAR), "slots": slots,
                "flooded": [sp for sp in range(1, FAR) if self.flooded[sp]],
                "forgotten": len(self.forgotten), "fractures": self.fract, "bw_supply": self.bw_supply,
                "light": self.light, "karma": list(self.karma), "echo": self.echo, "plays": plays,
                "mist": mist, "book": book, "result": self.result, "cause": self.cause,
                "mantles": {m: h + 1 for m, h in self.mantles.items() if h >= 0}}

    def lose(self, cause):
        if self.result is None:
            self.result, self.cause = "loss", cause
            self.note(f"LOSS: {cause}")
        raise GameOver

    def win(self):
        if self.result is None:
            self.result = "win"
            self.note("WIN: the soul reaches the Far Shore")
        raise GameOver

    def root_targets(self, stony_ok):
        """Empty, un-haunted bank slots from the soul's space onward that touch the network.
        The banks beside the soul always count as part of the network."""
        out = []
        for sp in range(max(1, self.soul), FAR):
            for b in (0, 1):
                k = sp * 2 + b
                if self.tok[k] != NONE or self.griev[k]:
                    continue
                if self.revealed[k] and (self.tile[k] == GRAVE or (self.tile[k] == STONY and not stony_ok)):
                    continue
                touches = (sp <= self.soul + 1 or self.tok[k ^ 1] != NONE
                           or (sp > 1 and self.tok[(sp - 1) * 2 + b] != NONE)
                           or (sp < 11 and self.tok[(sp + 1) * 2 + b] != NONE))
                if touches:
                    out.append(k)
        return out

    # ------------------------------------------------------------- primitive actions
    def place_root(self, k, stony_ok):
        """Returns True if a Root was placed."""
        if not self.revealed[k]:
            if self.sim:
                # The AI cannot see under the fog: it assumes Fertile while planning.
                self.tok[k] = ROOT
                return True
            self.revealed[k] = True
            t = self.tile[k]
            self.note(f"  reveal {C.TILE_NAMES[t]} at {k // 2}{'ul'[k % 2]}")
            if t == GRAVE:
                self.griev[k] = True
                self.note("  a Grievance rises from the Grave")
                return False
            if t == STONY and not stony_ok:
                return False
            if t == MEMORY:
                self.stats["keepsakes"] += 1
                self.keepsakes[reach_of(k // 2)] += 1
                if self.cfg.soul == "open":
                    self.light += 2
        else:
            if self.tile[k] == STONY and not stony_ok:
                return False
            if self.tile[k] == GRAVE:
                return False
        self.tok[k] = ROOT
        return True

    def bloom_targets(self):
        return [k for k in range(2 * max(1, self.soul), NSLOT) if self.tok[k] == ROOT]

    def add_fracture(self):
        if self.shield_until >= self.turn:
            self.shield_until = -1
            self.note("  the Shield holds")
            return
        r = reach_of(max(1, min(11, self.soul)))
        if self.child_shield[r]:
            self.child_shield[r] = False
            self.note("  (Child) the first Fracture this Reach is ignored")
            return
        self.fract += 1
        self.stats["max_fract"] = max(self.stats["max_fract"], self.fract)
        self.note(f"  Fracture ({self.fract}/{self.cfg.fracture_limit})")
        if self.cfg.soul == "king":
            for m, holder in self.mantles.items():
                if holder == self.cur:
                    self.mantles[m] = -1
        if self.fract >= self.cfg.fracture_limit:
            self.lose("Shattered")

    def forget_top(self, n=1):
        for _ in range(n):
            if not self.deck:
                self.reshuffle()
            if not self.deck:
                return
            self.forgotten.append(self.deck.pop())
            self.check_faded()

    def forget_card(self, cid):
        self.forgotten.append(cid)
        self.check_faded()

    def check_faded(self):
        f = len(self.forgotten)
        self.stats["max_forgotten"] = max(self.stats["max_forgotten"], f)
        if f >= self.cfg.forgotten_limit:
            self.lose("Faded")

    def reshuffle(self):
        if self.discard:
            self.deck = self.discard
            self.discard = []
            self.rng.shuffle(self.deck)

    def place_bw(self, sp):
        # first open river space at or after sp, else nearest behind (never the soul's own space)
        sp = min(sp, 11)
        cand = [x for x in range(sp, FAR) if not self.flooded[x] and x != self.soul and x >= 1]
        if not cand:
            cand = [x for x in range(sp - 1, self.soul, -1) if not self.flooded[x] and x >= 1]
        if not cand:
            return
        if self.bw_supply <= 0:
            self.lose("Deluge")
        x = cand[0]
        self.flooded[x] = True
        self.bw_supply -= 1
        self.stats["min_bw_supply"] = min(self.stats["min_bw_supply"], self.bw_supply)
        for b in (0, 1):
            if self.tok[x * 2 + b] == BLOOM:
                self.tok[x * 2 + b] = ROOT
        self.note(f"  Black Water on space {x} (supply {self.bw_supply})")

    def drain(self, sp):
        if self.flooded[sp]:
            self.flooded[sp] = False
            if self.cfg.bw_returns:
                self.bw_supply += 1

    def place_griev(self, sp, bank):
        sp = max(1, min(sp, 11))
        order = [(x, b) for x in range(sp, FAR) for b in ((bank, 1 - bank) if x == sp else (bank, 1 - bank))]
        order = [(x, b) for x, b in order if x >= 1]
        if not order or all(self.griev[x * 2 + b] for x, b in order):
            order = [(x, b) for x in range(min(sp, 11), max(0, self.soul) - 1, -1) for b in (0, 1) if x >= 1]
        for x, b in order:
            k = x * 2 + b
            if not self.griev[k]:
                self.griev[k] = True
                self.tok[k] = NONE
                self.note(f"  Grievance at {x}{'ul'[b]}")
                return

    def tie_knot(self, tag):
        self.karma[tag] += 1
        if self.karma[tag] >= self.cfg.karma_cap:
            self.karma[tag] = 0
            self.backlash(tag)

    def backlash(self, tag):
        self.stats["backlash"][tag] += 1
        self.stats["backlash_by_reach"][self.reach] += 1
        self.note(f"  BACKLASH: {C.TAG_NAMES[tag]}")
        if tag == OBS:
            k0, k1 = self.soul * 2, self.soul * 2 + 1
            if self.soul >= 1 and not self.griev[k0]:
                self.place_griev(self.soul, 0)
            elif self.soul >= 1 and not self.griev[k1]:
                self.place_griev(self.soul, 1)
            else:
                self.place_griev(self.soul + 1, 0)
        elif tag == ACC:
            self.stats["resignation_pending"] = 1
        else:
            self.place_bw(self.soul + 1)

    # ------------------------------------------------------------- card effects
    def do_ops(self, ops, chooser):
        for op in ops:
            self.do_op(op, chooser)

    def do_op(self, op, chooser):
        kind = op[0]
        if kind == "root":
            n, stony = op[1], op[2]
            holder_weaver = self.mantles["weaver"] == self.cur
            if holder_weaver:
                stony = True
                if not self.weaver_used:
                    self.weaver_used = True
                    n += 1
            for _ in range(n):
                t = chooser.root_target(self, stony)
                if t is None:
                    break
                self.place_root(t, stony)
        elif kind == "bloom":
            for _ in range(op[1]):
                t = chooser.bloom_target(self)
                if t is None:
                    break
                self.tok[t] = BLOOM
        elif kind == "hold":
            self.hold = True
        elif kind == "shield":
            self.shield_until = self.turn + self.n
        elif kind == "mend":
            self.fract = max(0, self.fract - op[1])
        elif kind == "release":
            col = max(range(3), key=lambda i: self.karma[i])
            self.karma[col] = max(0, self.karma[col] - op[1])
        elif kind == "guide":
            if self.passable(self.soul + 1):
                self.stats["guides"] += 1
                self.move_soul(1)
        elif kind == "vigil":
            d = self.mist[self.reach]
            top = d[-3:]
            top.sort(key=lambda m: -mist_severity(m))  # worst first, so it is drawn last
            d[-3:] = top
        elif kind == "banish_or_drain":
            g, w = self.urgent_grievance(), self.urgent_water()
            if g is not None and (w is None or self.griev_urgency(g) >= self.water_urgency(w)):
                self.griev[g] = False
            elif w is not None:
                self.drain(w)
        elif kind == "banish":
            g = self.urgent_grievance()
            if g is not None:
                self.griev[g] = False
        elif kind == "drain":
            w = self.urgent_water()
            if w is not None:
                self.drain(w)
        elif kind == "light":
            self.light += op[1]
        elif kind == "reveal_reach":
            spaces = C.TILES[self.reach][0]
            for sp in spaces:
                for b in (0, 1):
                    k = sp * 2 + b
                    if not self.revealed[k]:
                        if not self.sim:
                            self.revealed[k] = True
                            if self.tile[k] == GRAVE:
                                self.tile[k] = FERTILE
        elif kind == "unmake":
            col = max(range(3), key=lambda i: self.karma[i])
            self.karma[col] = 0
        elif kind == "wash":
            for b in (0, 1):
                if self.soul >= 1:
                    self.griev[self.soul * 2 + b] = False
        elif kind == "lowtide":
            lo, hi = {0: (1, 4), 1: (5, 8), 2: (9, 11)}[self.reach]
            for sp in range(lo, hi + 1):
                self.drain(sp)
        elif kind == "extra_karma":
            self.tie_knot(op[1])

    def urgent_grievance(self):
        best, bu = None, -1
        for k in range(2 * max(1, self.soul), NSLOT):
            if self.griev[k]:
                u = self.griev_urgency(k)
                if u > bu:
                    best, bu = k, u
        return best

    def griev_urgency(self, k):
        d = k // 2 - self.soul
        return 10 - min(d, 9) * 2

    def urgent_water(self):
        for sp in range(self.soul + 1, FAR):
            if self.flooded[sp]:
                return sp
        return None

    def water_urgency(self, sp):
        d = sp - self.soul
        return 11 - min(d, 9) * 2

    # ------------------------------------------------------------- playing cards
    def play(self, cid, mode, chooser, first):
        """mode: 'up', 'down' or 'burn'. Returns True if the card Resonated."""
        card = CARD[cid]
        self.hands[self.cur].remove(cid)
        if mode == "seek":
            # Seek: draw a card, then discard this one. While planning, the AI cannot see the draw.
            self.stats["sought"] = 1
            self.stats["seeks"] = self.stats.get("seeks", 0) + 1
            if not self.sim:
                if not self.deck:
                    self.reshuffle()
                if self.deck:
                    self.hands[self.cur].append(self.deck.pop())
            self.discard.append(cid)
            return False
        if mode == "down":
            self.stats["face_down"] += 1
            self.do_op(("root", 1, False), chooser)
            self.discard.append(cid)
            return False
        resonated = first and self.echo == card.tag
        self.stats["plays_up"] += 1
        if card.tag == OBL:
            self.stats["oblivion_played"] += 1
        reps = 2 if mode == "burn" else 1
        for _ in range(reps):
            if resonated and card.res_replaces:
                self.do_ops(card.res, chooser)
            else:
                self.do_ops(card.effect, chooser)
        if resonated:
            self.stats["resonances"] += 1
            if not card.res_replaces:
                self.do_ops(card.res, chooser)
        self.tie_knot(card.tag)
        self.echo = card.tag
        if mode == "burn":
            self.stats["burns"] += 1
            self.forget_card(cid)
            if self.cfg.burn_forget > 1:
                self.forget_top(self.cfg.burn_forget - 1)
            return resonated
        if card.tag == OBL:
            if self.mantles["breaker"] == self.cur and not self.breaker_used:
                self.breaker_used = True
                self.discard.append(cid)
            else:
                self.forget_card(cid)
            return resonated
        if ((resonated or (card.key and self.cfg.key_any)) and self.cfg.use_book and card.slot and self.reach < 3
                and card.slot not in self.book[self.reach] and chooser.want_inscribe(self, cid)):
            self.book[self.reach][card.slot] = cid
            self.stats["inscribed"] += 1
            self.note(f"  inscribed {card.cid} ({card.slot}): {card.band}")
            filled = len(self.book[self.reach])
            if not self.blessed[self.reach] and filled >= self.cfg.blessing_at:
                self.blessed[self.reach] = True
                self.stats["blessings"] += 1
                self.blessing(chooser)
            if filled == 4:
                self.stats["pages_full"] += 1
            return resonated
        self.discard.append(cid)
        return resonated

    def blessing(self, chooser):
        if self.fract > 0:
            self.fract -= 1
            self.note("  Chapter Blessing: mend a Fracture")
        elif any(self.flooded[1:FAR]):
            self.drain(self.urgent_water() or next(i for i in range(1, FAR) if self.flooded[i]))
            self.note("  Chapter Blessing: drain Black Water")
        elif self.forgotten:
            self.discard.append(self.forgotten.pop())
            self.note("  Chapter Blessing: a memory returns")

    def summon(self, mantle, discard_cid):
        self.light -= self.cfg.mantle_cost
        self.hands[self.cur].remove(discard_cid)
        self.discard.append(discard_cid)
        self.mantles[mantle] = self.cur
        self.stats["summons"] += 1
        self.note(f"  P{self.cur + 1} summons the {mantle}")

    # ------------------------------------------------------------- soul movement
    def move_soul(self, steps):
        for _ in range(steps):
            old = self.soul
            if 1 <= old <= 11:
                for b in (0, 1):
                    k = old * 2 + b
                    if self.tok[k] == BLOOM:
                        self.light += self.cfg.light_per_bloom
                    self.tok[k] = NONE
                    self.griev[k] = False
            self.soul += 1
            if self.soul >= FAR:
                self.win()
            nr = reach_of(self.soul)
            if nr != self.reach:
                self.reach = nr
                self.karma = [0, 0, 0]
                self.note(f"  the soul enters Reach {nr + 1}")

    def soul_step(self):
        if self.result is not None:
            return
        cfg = self.cfg
        f = len(self.forgotten)
        if self.stats.get("resignation_pending"):
            self.stats["resignation_pending"] = 0
            self.note("  Resignation: the soul sits down")
            self.linger(force=True)
            self.feed()
            return
        if self.passable(self.soul + 1):
            self.move_soul(1)
            if f >= cfg.adrift_at:
                if self.passable(self.soul + 1):
                    self.move_soul(1)
                elif self.mantles["warden"] >= 0 and self.warden_ready:
                    self.warden_ready = False
                    self.note("  the Spirit Warden holds the soul back")
                else:
                    self.stats["exposures"] += 1
                    self.note("  Adrift: the soul drifts into the dark")
                    self.move_soul(1)
                    self.add_fracture()
            elif f >= cfg.ash_at and self.passable(self.soul + 1):
                self.move_soul(1)
        elif self.blocked_by_grievances():
            self.push_through()
        else:
            self.linger()
        self.feed()

    def blocked_by_grievances(self):
        """The next space is dark only because Grievances hold both of its banks."""
        sp = self.soul + 1
        return (self.cfg.push_through != "off" and 1 <= sp <= 11 and not self.flooded[sp]
                and self.griev[sp * 2] and self.griev[sp * 2 + 1])

    def pushes_in_scope(self):
        scope = self.cfg.push_scope
        if scope == "none":
            return 0
        key = f"pushes_r{self.reach}" if scope == "reach" else "pushes"
        return self.stats.get(key, 0)

    def push_through(self):
        before = self.pushes_in_scope()
        if before and self.cfg.push_again == "linger":
            self.linger()
            return
        sp = self.soul + 1
        self.griev[sp * 2] = self.griev[sp * 2 + 1] = False
        self.stats["pushes"] = self.stats.get("pushes", 0) + 1
        self.stats[f"pushes_r{self.reach}"] = self.stats.get(f"pushes_r{self.reach}", 0) + 1
        if before:
            self.stats["repushes"] = self.stats.get("repushes", 0) + 1
        self.note("  the soul pushes through the Grievances")
        self.move_soul(1)
        for _ in range(1 + before):   # each push already made in this scope adds another Fracture
            self.add_fracture()
        if self.cfg.push_through == "harsh":
            self.forget_top(1)

    def linger(self, force=False):
        if not force and self.hold:
            self.note("  Hold: the soul waits without forgetting")
            return
        if not force and self.mantles["warden"] >= 0 and self.warden_ready:
            self.warden_ready = False
            self.note("  the Spirit Warden steadies the soul")
            return
        self.stats["lingers"] += 1
        self.note("  the soul Lingers")
        if self.cfg.linger_rule == "dark" and not force and self.soul >= 1 and self.lit(self.soul):
            self.note("  (beside its own light, the soul waits without forgetting)")
            return
        pulled = any(self.bride_pulled) if self.cfg.bride_once else self.bride_pulled[self.reach]
        if self.cfg.soul == "bride" and not force and self.soul >= 1 and not pulled:
            self.bride_pulled[self.reach] = True
            self.soul -= 1
            self.note("  (Bride) she is pulled one space back")
            if not self.cfg.bride_forgets:
                return
        self.forget_top(1)

    def feed(self):
        if 1 <= self.soul <= 11 and (self.griev[self.soul * 2] or self.griev[self.soul * 2 + 1]):
            self.note("  a Grievance feeds on the soul")
            self.add_fracture()

    # ------------------------------------------------------------- Mist
    def mist_step(self):
        d = self.mist[self.reach]
        if not d:
            d.extend(C.MIST[self.reach])
            self.rng.shuffle(d)
        name, ops = d.pop()
        self.last_mist = name
        self.note(f"  Mist: {name}")
        S = self.soul
        for op in ops:
            k = op[0]
            if k == "bw":
                self.place_bw(S + op[1])
            elif k == "grv":
                if S + op[1] <= 11:
                    self.place_griev(S + op[1], op[2])
                else:
                    self.place_griev(min(11, max(1, S)), op[2])
            elif k == "grv_near":
                if S >= 1 and not self.griev[S * 2]:
                    self.place_griev(S, 0)
                elif S >= 1 and not self.griev[S * 2 + 1]:
                    self.place_griev(S, 1)
                else:
                    self.place_griev(min(11, S + 1), 0)
            elif k == "wither":
                blooms = [x for x in range(NSLOT - 1, 2 * (S + 1) - 1, -1) if self.tok[x] == BLOOM]
                for x in blooms[:op[1]]:
                    self.tok[x] = ROOT
            elif k == "wither_far":
                for x in range(2 * (S + op[1] + 1), NSLOT):
                    if self.tok[x] == BLOOM:
                        self.tok[x] = ROOT
            elif k == "wither_at":
                sp = S + op[1]
                if sp <= 11:
                    for b in (0, 1):
                        if self.tok[sp * 2 + b] == BLOOM:
                            self.tok[sp * 2 + b] = ROOT
            elif k == "fog":
                n = op[1]
                for x in range(NSLOT - 1, 2 * (S + 1) - 1, -1):
                    if n and self.revealed[x] and self.tok[x] == NONE and not self.griev[x] and x >= 4:
                        self.revealed[x] = False
                        n -= 1
            elif k == "forget":
                self.forget_top(op[1])
            elif k == "sever":
                self.echo = -1
            elif k == "karma_all":
                for t in (0, 1, 2):
                    self.tie_knot(t)
            elif k == "dark_wind":
                if self.light >= 2:
                    self.light -= 2
                else:
                    self.add_fracture()

    def end_of_turn_checks(self):
        # Roots drink the flood
        for sp in range(1, FAR):
            need = BLOOM if self.cfg.drink == "bloom" else ROOT
            if self.flooded[sp] and self.tok[sp * 2] >= need and self.tok[sp * 2 + 1] >= need:
                self.drain(sp)
                self.note(f"  roots drink the flood at {sp}")
        # Trapped in light
        for k in range(2, NSLOT):
            if self.griev[k]:
                sp, b = k // 2, k % 2
                if 2 <= sp <= 10 and self.tok[(sp - 1) * 2 + b] == BLOOM and self.tok[(sp + 1) * 2 + b] == BLOOM:
                    self.griev[k] = False
                    self.note(f"  a Grievance dissolves in the light at {sp}")

    def draw_up(self, p):
        while len(self.hands[p]) < self.cfg.hand:
            if not self.deck:
                self.reshuffle()
            if not self.deck:
                break
            self.hands[p].append(self.deck.pop())

    # ------------------------------------------------------------- Ghost (solo)
    def ghost_turn(self, chooser):
        if not self.ghost:
            g = list(C.GHOST)
            self.rng.shuffle(g)
            self.ghost = g
        tag, act = self.ghost.pop()
        self.stats["ghost_turns"] += 1
        self.note(f" Ghost: {C.TAG_NAMES[tag]} / {act}")
        if act == "root_far" or act == "root_near":
            ts = self.root_targets(False)
            if ts:
                self.place_root(max(ts) if act == "root_far" else min(ts), False)
        elif act == "bloom_near" or act == "bloom_far":
            ts = self.bloom_targets()
            if ts:
                self.tok[min(ts) if act == "bloom_near" else max(ts)] = BLOOM
        elif act == "banish_forget":
            g = self.urgent_grievance()
            if g is not None:
                self.griev[g] = False
            else:
                w = self.urgent_water()
                if w is not None:
                    self.drain(w)
            if self.cfg.ghost_forgets:
                self.forget_top(1)
        self.tie_knot(tag)
        self.echo = tag


def mist_severity(m):
    name, ops = m
    s = 0
    for op in ops:
        s += {"bw": 3, "grv": 3, "grv_near": 4, "wither": 2, "wither_far": 3, "wither_at": 2,
              "fog": 1, "forget": 2, "sever": 1, "karma_all": 3, "dark_wind": 2}.get(op[0], 0)
    return s
