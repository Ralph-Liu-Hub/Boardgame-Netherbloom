"""Rules engine for Netherbloom (GDD v0.4).

The state is plain lists and ints so that the AI can clone it cheaply.
Bank slots are indexed slot = space * 2 + bank for spaces 1..11 (bank 0 left, 1 right; the left bank is drawn above the river).
"""
import random
import sys

from . import cards as C
from .cards import OBS, ACC, OBL, FERTILE, STONY, MEMORY, GRAVE, FLOWER, FROST, EMBER, ECHO_ROCK, SPRING

# River layout. V3.2 is 4/4/3 (spaces 1-11, Far Shore 12); V2 proposes 3/4/5 (spaces 1-12, Far Shore 13).
# These module globals are rebound by set_layout() when a game starts (games in one process run one at a time).
LAYOUTS = {
    "443": {"far": 12, "bounds": [(1, 4), (5, 8), (9, 11)]},
    "345": {"far": 13, "bounds": [(1, 3), (4, 7), (8, 12)]},
    "444": {"far": 13, "bounds": [(1, 4), (5, 8), (9, 12)]},
    "445": {"far": 14, "bounds": [(1, 4), (5, 8), (9, 13)]},
}
FAR = 12            # the Far Shore
LAST = 11           # the last river space
NSLOT = 24          # spaces 0..LAST x 2 banks (space 0 unused)
BOUNDS = LAYOUTS["443"]["bounds"]
NONE, ROOT, BLOOM = 0, 1, 2


def set_layout(name):
    global FAR, LAST, NSLOT, BOUNDS
    lay = LAYOUTS[name]
    FAR, LAST, NSLOT, BOUNDS = lay["far"], lay["far"] - 1, lay["far"] * 2, lay["bounds"]

ALL_CARDS = C.CORE + C.ECHO + [c for pack in C.SOULS.values() for c in pack] + C.V2_CARDS
CARD = {i: c for i, c in enumerate(ALL_CARDS)}
INDEX = {c.cid: i for i, c in CARD.items()}


def reach_of(space):
    return 0 if space <= BOUNDS[0][1] else 1 if space <= BOUNDS[1][1] else 2


class Config:
    """Everything a game needs to know before it starts. Defaults follow GDD v0.4 at the Standard Lantern."""

    def __init__(self, players=3, soul="open", lantern=C.STANDARD_LANTERN, use_book=True, seed=None, **overrides):
        self.players = players
        self.soul = soul                      # "open", "king", "garland", "bride", "child"
        self.lantern = lantern
        self.use_book = use_book
        self.seed = seed
        if overrides.get("lantern_set") == "v2":
            bw, limit, harsh, r3 = C.LANTERN_V2[lantern]
            self.r3_mist_draws = r3
        else:
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
        self.bride_pullback = True   # tuning: the Bride is pulled one space back (False: she only stays, forgetting nothing)
        self.lit_both = False        # tuning: a space is Lit only with Blooms on both banks
        self.burn_forget = 2         # tuning: cards forgotten per Burn
        self.burn_mode = "joint_b"   # "solo": Burn one card (effect x2, forget it and the top card); "joint_a": another player
                                     # adds a same-thread card as fuel, the active player's card doubles, both are forgotten;
                                     # "joint_b": as joint_a, but either card may be the one that doubles. Solo always
                                     # plays the one-card Burn.
        self.burn_limit = "once"     # Burns per turn: "any" (each action may Burn), "once" (one of the two actions),
                                     # "turn" (a Burn is the Answer and ends the turn's actions),
                                     # "answer" (only the Answer may Burn)
        self.extra_mist = 2          # tuning: extra Rising Water / Grievance cards per Reach deck
        self.light_per_bloom = 1     # tuning: Light gained per Bloom passed
        self.ghost_forgets = False   # tuning: the Ghost's Oblivion card forgets 1
        self.push_through = "harsh"  # if Grievances hold both banks ahead, the soul pushes through: "off", "fracture" (+1 Fracture) or "harsh" (+1 Fracture, forget 1)
        self.push_scope = "game"     # the first push per "game" (or "reach") costs the base price; "none": every push costs the base price
        self.push_again = "escalate" # a later push in the same scope: "escalate" (+1 Fracture each time) or "linger" (not allowed)
        self.push_once_each = True   # each player may Push Through only once per game
        self.push_action = True      # push-through is an action a player takes (False: the soul pushes on its own at the Soul Step)
        self.seek = True             # with seek_mode on, one action per turn may be a Seek / Share (that turn's next card cannot Resonate)
        # Playtest options (2026-10): what a Seek does, and how the Book rewards inscriptions
        self.seek_mode = "off"       # "off": no Seek (dropped for the joint Burn); "keep1give" (Share) discard 1, draw 2, keep 1, give the
                                     # other to the next player (solo: bottom of the deck); "classic" discard 1 draw 1;
                                     # "keep1light" draw 2, keep 1, give the other or forget it for +1 Light; "pass" give the card
                                     # to the next player instead of discarding it, then draw 1; "scry" look at the top 3, take 1
        self.book_mode = "pairs"     # "blessing": one Chapter Blessing at blessing_at memories; "pairs": a reward for each
                                     # adjacent pair of slots filled on a page, and the Blessing for a full page
        self.pair_rewards = {        # with "pairs": {page: [Place+Person, Person+Deed, Deed+Feeling]} lists of ops
            0: [[("root", 1, False)], [("bloom", 1)], [("light", 2)]],
            1: [[("banish", 1)], [("drain", 1)], [("release", 1)]],
            2: [[("recall_free",)], [("mend", 1)], [("guide",)]],
        }
        self.full_page_at = 4        # with "pairs": inscribed cards for the page's Chapter Blessing (the Garland Girl: 3)
        self.full_page = ["blessing"]  # with "pairs": what a full page gives (ops; "blessing" = the Chapter Blessing)
        # Light sinks (experiments; off by default)
        self.light_action = "recall" # None, "recall" (the Answer action: spend Light, a forgotten card returns) or
                                     # "kindle" (spend Light for one of: a forgotten card returns, mend a Fracture, drain a Black Water)
        self.light_action_cost = 3
        self.light_action_limit = 99 # times per game
        self.solo_resummon = True    # solo: summon a new Mantle while holding one; the old one is retired; each Mantle once
        self.max_summons = 3         # with solo_resummon: summons per game
        # ---- V2 proposal switches (docs/design/V2-proposal.zh-TW.md). Defaults reproduce V3.2.
        self.layout = "443"          # "443" (V3.2) or "345" (V2: Far Shore on space 13)
        self.tileset = "v32"         # "v32" tile kinds, or "v2" (Memory Spring, Flower Field, Frost, Ember, Echo Rock)
        self.lantern_set = "v32"     # "v32" (4 Lanterns) or "v2" (3 Lanterns, see cards.LANTERN_V2)
        self.r3_mist_draws = 1       # Mist cards revealed per turn in Reach 3
        self.deck_v2 = False         # one Unremember out, Lightless Crossing in
        self.vigil_mode = "mist"     # "mist" (V3.2 Vigil) or "kindle" (V2: light one memory for 1 Light)
        self.light_memory_cost = 0   # V2: Light to light one inscribed memory (0: lighting is off)
        self.commissions = False     # V2: secret commission cards checked at the Far Shore
        self.commission_need = None  # override the cards.COMMISSION_NEED table
        self.commission_redraw = True  # each player may redraw their commission once
        self.graves_r3 = None        # with tileset "pool": Graves placed in Reach 3 (None: the pool default)
        self.graves_r1 = None        # with tileset "pool": Graves placed in Reach 1 (None: the pool default)
        self.child_harsh = False     # the Child also gets harsh Mist (V3.2: she never does)
        self.child_shield = "reach"  # the Child ignores her first Fracture each "reach", once per "game", or "none"
        self.child_drift = False     # the Child can drift (V3.2: she never does)
        self.blessing_trigger = "inscribed"  # with book_mode "blessing": a page's memories "inscribed" or "lit"
        self.garland_gift = False    # V4.0 Garland Girl "give a flower": once per Reach, pass 1 card face down to another player
        self.cross_fracture = False  # Lightless Crossing into a dark space also costs 1 Fracture (as drifting does)
        self.replace_memories = False  # V2: a new memory may replace an unlit, non-key one (the old one is forgotten)
        self.burn_inscribe = False   # V2: the doubled card of a Burn may be inscribed instead of forgotten
        self.facedown_light = False  # V2: a face-down play with nowhere to root gives 1 Light
        self.transitions = False     # V2: entering a new Reach reshapes it from the last page (content + count)
        self.mist_v2 = False         # V2: new Mist cards and harsh Mist
        self.mantles_v2 = False      # V2: Warden "stay", Mist-breaker "see through the mist", the Reaper
        self.back_rule = False       # V2: the soul never returns to an earlier Reach (the Bride included)
        # ---- V5 proposal switches (docs/design/V5-proposal.zh-TW.md). All off by default.
        self.v5_facedown_knot = False  # a face-down play ties a knot on the card's thread
        self.v5_keep = False         # leaving a space: harvest (Blooms wither to Roots, gain Light) or keep a Light Wall
        self.v5_griev_loom = False   # Shades never move; each Shade on the soul's space or the next one ties a knot
                                     # (left bank Obsession, right bank Acceptance, fogged bank Oblivion); Mist Shades land 3 ahead
        self.v5_fog = False          # Mist strength flips banks behind the soul back to fog; both banks of the soul's space
                                     # fogged = shrouded (1 Fracture, the Mist card becomes a mist scar in the Book)
        self.v5_scars = False        # Backlash leaves a scar (threshold -1, Backlash one level higher); knots carry over
                                     # between Reaches and each lit memory of the closed page unties one knot
        self.v5_depth = False        # Mist decks by depth (lit memories 0-2 / 3-5 / 6+) instead of by Reach
        self.v5_reveal = False       # a completed commission may be revealed early: untie 2 knots
        self.v5_fate = False         # fate mist: per Reach one river-condition and one book-condition card
        self.v5_reach = False        # banish / drain / bloom only within reach of the root network connected to the soul
        self.v5_traits = False       # the closed page's lit-memory majority gives the next Reach a root-network trait
        self.v5_recall = False       # Recall: an action, 3 Light, inscribe a forgotten memory into an empty slot (unlit)
        self.v5_push_free = False    # Push Through is a free action
        self.v5_swap = False         # Swap replaces Burn: trade one card with another player and play it face up at once
        self.v5_light_after = False  # lighting memories and revealing commissions come after the two actions
        self.v5_start_knots = 0      # difficulty: knots on each thread at the start
        self.v5_keep_need = 2        # AI: keep a Light Wall when the fog is this many bank flips (or fewer) away
        self.v5_scar_max = 2         # tuning: most scars a thread can carry
        self.v5_feed_range = 1       # tuning: Shades on the soul's space and this many spaces ahead push the Loom
        self.v5_mist_knot = True     # tuning: each Mist card ties a knot on its thread
        self.v5_cap_bonus = 0        # tuning: extra knots before a thread fills (V5 has more knot sources than V4)
        self.v5_fog_scale = 1.0      # tuning: multiplier on printed mist strength
        self.v5_l3_crack = True      # tuning: a level-3 Obsession Backlash also adds a Fracture
        self.v5_carry = True         # tuning: knots carry over between Reaches (False: the Loom empties as in V4)
        self.v5_feed_per_round = False  # tuning: Shades push the Loom once per round (after the last player) instead of every turn
        self.v5_griev_offset = 3     # tuning: how far ahead Mist Shades land
        self.v5_fog_on_stall = False  # tuning: the fog advances only on turns the soul did not move forward
        self.v5_shroud_crack = True  # tuning: being shrouded adds a Fracture (False: only the mist scar)
        self.v5_fate_power = "strong"  # tuning: fate effects. "strong": river = a Shade 3 ahead + a knot, book = the newest
                                       # unlit memory is forgotten; "medium": river = a knot, book = forget the top card;
                                       # "light": as medium, but Reach 1 fate only writes the mist scar
        # ---- V5 revision: story chapters (docs/design/V5-proposal.zh-TW.md, V5-storybooks.zh-TW.md). Off by default.
        self.v5_chapters = False     # the storybook drives the game: chapter pages are route maps, each chapter's
                                     # fate-mist turning point forks the route, reaching the page's exit turns the page
                                     # (deeper Mist deck, next fate cards); the Far Shore opens after chapter 3
        self.v5_turn_knots = "clear_heal"  # at a page turn: "clear_heal" (knots cleared, every 2 lit memories of the page
                                     # heal 1 scar), "lit_free" (untie one knot per lit memory; a thread emptied this way
                                     # heals 1 scar; the rest carry over), "lit_free_base2" (as lit_free after untying 2 per thread),
                                     # "scar1_lit_free" (heal 1 scar, then untie one knot per lit memory; the rest carry over)
        self.v5_wall_mode = "pair"   # light walls: "pair" (both banks bloom; absorbs 2) or "bank" (each bloom absorbs 1 on its bank)
        self.v5_turn_heals = (1, 2, 0)  # with v5_turn_knots "scarN_*": scars healed when chapter 1 / 2 / 3 closes
        self.v5_solo_cap_bonus = 0   # extra knots before a thread fills in solo games
        self.v5_fog_plus = 0         # difficulty: added to the fog strength whenever the fog advances
        self.v5_obs_l2_ahead = 3     # where a level-2+ Obsession Backlash puts its two Shades (spaces ahead)
        self.v5_gate_take = 0.5      # AI: chance to follow a lit gate memory's thread when it differs from the fate card
        self.v5_reveal_rewrite = 0.0  # chance a revealed commission rewrites the chapter's fork instead of untying 2 knots
        self.v5_insc_echo = False    # a face-up card whose thread matches the Echo may be inscribed in either action
        self.v5_fate_skip = False    # when the turning point forks the route, empty slots before it are washed away
        self.v5_fork_eot = True      # the turning point's fork is taken at the end of the turn (so the gate can be lit first)
        self.v5_linger_blank = False  # a Linger that forgets also washes away the next empty memory slot on the route
        self.v5_fog_moving = 0       # fog strength on turns the soul moved forward (from chapter v5_fog_moving_from)
        self.v5_fog_moving_from = 1
        for k, v in overrides.items():
            if not hasattr(self, k):
                raise KeyError(f"unknown config option {k}")
            setattr(self, k, v)
        # Soul twists
        if soul == "king":
            self.mantle_cost = overrides.get("mantle_cost", 2)
        if soul == "garland":
            self.blessing_at = overrides.get("blessing_at", 2)
            self.full_page_at = overrides.get("full_page_at", 3)
        if soul == "bride":
            self.start_light = overrides.get("start_light", 1)
        if soul == "child":
            self.start_light = overrides.get("start_light", 3)
            if not overrides.get("child_drift"):
                self.adrift_at = 99
            self.forgotten_limit = overrides.get("forgotten_limit", self.forgotten_limit + 1)
            if not overrides.get("child_harsh"):
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
        "lit_mem", "order", "comm", "comm_deck", "redrawn", "frost", "dim", "blind", "cold_until", "thunder",
        "gaze", "need_plus", "breaker_ready", "harsh_pool", "spare_tiles", "gifted",
        "fogged", "scars", "lv_bonus", "bscars", "fate", "comm_rev", "trait", "turn_flags",
        "ch", "pg", "walk", "shore_open", "chc", "page_turn", "paths", "fates_ch", "rewrite", "agent",
    )

    # ------------------------------------------------------------- setup
    @classmethod
    def new(cls, cfg):
        s = cls()
        s.cfg = cfg
        set_layout(cfg.layout)
        s.rng = random.Random(cfg.seed)
        s.sim = False
        s.n = cfg.players
        s.cur = 0
        s.turn = 0
        deck = [INDEX[c.cid] for c in C.CORE]
        extra = C.ECHO if cfg.soul == "open" else C.SOULS[cfg.soul]
        deck += [INDEX[c.cid] for c in extra]
        if cfg.deck_v2:
            deck.remove(INDEX["C27"])            # one Unremember out
            deck.append(INDEX["C33"])            # Lightless Crossing in
        s.rng.shuffle(deck)
        s.deck = deck
        s.discard, s.forgotten = [], []
        s.soul = 0
        s.tok = [NONE] * NSLOT
        s.griev = [False] * NSLOT
        s.tile = [FERTILE] * NSLOT
        s.revealed = [True] * NSLOT
        if cfg.tileset == "pool":
            tilesets = {}
            for r, (spaces, pool, graves) in C.TILE_POOLS.items():
                if r == 2 and cfg.graves_r3 is not None:
                    graves = cfg.graves_r3
                if r == 0 and cfg.graves_r1 is not None:
                    graves = cfg.graves_r1
                need = len(spaces) * 2 - graves
                tilesets[r] = (spaces, [GRAVE] * graves + s.rng.sample(pool, need))
        else:
            tilesets = C.TILESETS[(cfg.layout, cfg.tileset)]
        for r, (spaces, mix) in tilesets.items():
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
        harsh_cards = C.HARSH_V2 if cfg.mist_v2 else C.HARSH
        harsh = list(range(len(harsh_cards)))
        s.rng.shuffle(harsh)
        s.mist = []
        for r in range(3):
            d = list(C.MIST[r])
            if cfg.mist_v2:
                d += C.MIST_V2_ADD[r]
            for _ in range(cfg.harsh_per_reach):
                if harsh:
                    d.append(harsh_cards[harsh.pop()])
            for i in range(cfg.extra_mist):
                d.append(("Rising Water", [("bw", 2)]) if i % 2 == 0 else ("Shade Drawn Near", [("grv_near",)]))
            s.rng.shuffle(d)
            s.mist.append(d)
        s.reach = 0
        s.book = [dict(), dict(), dict()]
        s.blessed = [False, False, False]
        s.keepsakes = [0, 0, 0]
        s.harsh_pool = [harsh_cards[i] for i in harsh]   # harsh Mist left for Reach transitions
        s.mantles = {m: -1 for m in (C.MANTLES_V2 if cfg.mantles_v2 else C.MANTLES)}
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
        s.lit_mem = set()        # V2: lit memories (card ids on the Book)
        s.order = []             # V2: inscription order, (page, slot)
        s.frost = [False] * NSLOT
        s.dim = s.blind = s.thunder = False
        s.cold_until = -1
        s.gaze = 0
        s.need_plus = 0
        s.breaker_ready = True
        s.spare_tiles = None
        s.gifted = [False, False, False]
        s.fogged = [False] * NSLOT
        s.scars = [0, 0, 0]
        s.lv_bonus = [0, 0, 0]
        s.bscars = [[], [], []]
        s.fate = []
        s.comm_rev = {}
        s.trait = None
        s.turn_flags = set()
        if cfg.v5_start_knots:
            s.karma = [cfg.v5_start_knots] * 3
        s.comm, s.comm_deck, s.redrawn = [], [], [False] * cfg.players
        s.agent = None
        s.ch = 0                 # V5 chapters: the current chapter (page)
        s.pg = [dict(), dict(), dict()]   # per chapter: node id -> card id, or ("mist", tag) on mist slots / covered slots
        s.walk = [[], [], []]    # per chapter: the route's node ids in order, up to the frontier
        s.shore_open = not cfg.v5_chapters
        s.chc = {}               # per-chapter counters for fate conditions
        s.page_turn = False
        s.paths = [None, None, None]      # per chapter: (fate tag, path tag) once the turning point forks the route
        s.fates_ch = []
        s.rewrite = False
        if cfg.v5_chapters:
            s.fates_ch = s.deal_chapter_fates(0)
            s.start_route(None)
        elif cfg.v5_fate:
            s.fate = s.deal_fate(0)
        if cfg.commissions:
            ks = list(range(len(C.COMMISSIONS[cfg.soul])))
            s.rng.shuffle(ks)
            s.comm = [ks.pop() for _ in range(cfg.players)]
            s.comm_deck = ks
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
        s.tok, s.griev, s.tile, s.revealed = list(self.tok), list(self.griev), list(self.tile), list(self.revealed)
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
        s.lit_mem, s.order = set(self.lit_mem), list(self.order)
        s.comm, s.comm_deck, s.redrawn = list(self.comm), self.comm_deck, list(self.redrawn)
        s.frost = list(self.frost)
        s.dim, s.blind, s.cold_until, s.thunder = self.dim, self.blind, self.cold_until, self.thunder
        s.gaze, s.need_plus, s.breaker_ready = self.gaze, self.need_plus, self.breaker_ready
        s.harsh_pool, s.spare_tiles = self.harsh_pool, self.spare_tiles
        s.gifted = list(self.gifted)
        s.fogged = list(self.fogged)
        s.scars, s.lv_bonus = list(self.scars), list(self.lv_bonus)
        s.bscars = [list(b) for b in self.bscars]
        s.fate = [dict(f) for f in self.fate]
        s.comm_rev = dict(self.comm_rev)
        s.trait = self.trait
        s.turn_flags = set(self.turn_flags)
        s.ch, s.shore_open, s.page_turn, s.rewrite = self.ch, self.shore_open, self.page_turn, self.rewrite
        s.agent = self.agent
        s.pg = [dict(p) for p in self.pg]
        s.walk = [list(w) for w in self.walk]
        s.chc = dict(self.chc)
        s.paths = list(self.paths)
        s.fates_ch = [dict(f) for f in self.fates_ch]
        return s

    # ------------------------------------------------------------- helpers
    def note(self, msg):
        if self.log is not None:
            self.log.append(msg)

    def holder(self, m):
        """Who holds Mantle m (-1: nobody). Blinding Fog switches every Mantle off."""
        if self.blind:
            return -1
        return self.mantles.get(m, -1)

    def lit(self, sp):
        if sp >= FAR:
            return True
        if self.cfg.lit_both:
            return self.tok[sp * 2] == BLOOM and self.tok[sp * 2 + 1] == BLOOM
        return self.tok[sp * 2] == BLOOM or self.tok[sp * 2 + 1] == BLOOM

    def passable(self, sp):
        if sp >= FAR:
            return self.shore_open
        return self.lit(sp) and not self.flooded[sp]

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
        if self.cfg.commissions and self.result is None:
            done = self.final_commissions()
            self.stats["comm_done"] = done
            if done < self.commission_need():
                self.lose("Nameless")
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
                           or (sp < LAST and self.tok[(sp + 1) * 2 + b] != NONE))
                if not touches and self.trait == OBL and self.cfg.v5_traits:
                    touches = ((sp > 2 and self.tok[(sp - 2) * 2 + b] != NONE)
                               or (sp < LAST - 1 and self.tok[(sp + 2) * 2 + b] != NONE))
                if touches:
                    out.append(k)
        return out

    # ------------------------------------------------------------- primitive actions
    def place_root(self, k, stony_ok):
        """Returns True if a Root was placed."""
        if self.fogged[k]:
            # V5: rooting a fogged bank takes it back from the mist (the tile is already known)
            self.fogged[k] = False
            if not self.sim:
                self.stats["fog_reclaimed"] = self.stats.get("fog_reclaimed", 0) + 1
            if self.tile[k] in (GRAVE,) or (self.tile[k] == STONY and not stony_ok):
                return False
            self.tok[k] = ROOT
            return True
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
                self.note("  a Shade rises from the Grave")
                if self.cfg.v5_chapters:
                    self.ch_event("graves")
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
        self.tile_effect(k)
        return True

    def tile_effect(self, k):
        """V2 tiles act when a Root is placed on them."""
        t = self.tile[k]
        if t == FLOWER:
            self.tok[k] = BLOOM
        elif t == FROST:
            self.frost[k] = True
        elif t == EMBER:
            self.light += 1
        elif t == ECHO_ROCK:
            hand = self.hands[self.cur]
            tags = [CARD[c].tag for c in hand if CARD[c].tag != OBL]
            if tags:
                self.echo = max(set(tags), key=tags.count)
        elif t == SPRING and not self.sim:
            cands = [c for c in self.hands[self.cur] if self.can_inscribe(c)]
            if cands and len(self.hands[self.cur]) > 0:
                cid = self.spring_pick(cands)
                self.hands[self.cur].remove(cid)
                if self.inscribe(cid, None):
                    self.stats["spring_inscribes"] = self.stats.get("spring_inscribes", 0) + 1
                else:
                    self.hands[self.cur].append(cid)

    def flip_down(self, k):
        """A Bloom withers back to a Root, unless Frost protects it."""
        if self.tok[k] == BLOOM and not self.frost[k]:
            self.tok[k] = ROOT

    # ------------------------------------------------------------- V2: the Book and the commissions
    def can_inscribe(self, cid):
        if self.cfg.v5_chapters:
            return self.ch_can_inscribe(cid)
        card = CARD[cid]
        if card.tag == OBL or not card.slot or not self.cfg.use_book or self.reach >= 3:
            return False
        page = self.book[self.reach]
        if card.slot not in page:
            return True
        old = page[card.slot]
        return self.cfg.replace_memories and old not in self.lit_mem and not CARD[old].key

    def inscribe(self, cid, chooser):
        """Write a card into the current page. Returns True if it was inscribed."""
        if self.cfg.v5_chapters:
            return self.ch_inscribe(cid, chooser)
        card = CARD[cid]
        if not self.can_inscribe(cid):
            return False
        page = self.book[self.reach]
        if card.slot in page:
            old = page[card.slot]
            if chooser is not None and hasattr(chooser, "want_replace") and not chooser.want_replace(self, old, cid):
                return False
            del page[card.slot]
            self.order = [o for o in self.order if o != (self.reach, card.slot)]
            self.stats["replaced"] = self.stats.get("replaced", 0) + 1
            self.forget_card(old)
        page[card.slot] = cid
        self.order.append((self.reach, card.slot))
        self.stats["inscribed"] += 1
        self.note(f"  inscribed {card.cid} ({card.slot}): {card.band}")
        self.fate_event("inscribed")
        if (self.cfg.book_mode == "blessing" and self.cfg.blessing_trigger == "inscribed"
                and not self.blessed[self.reach] and len(page) >= self.cfg.blessing_at):
            self.blessed[self.reach] = True
            self.stats["blessings"] += 1
            self.blessing(chooser)
        return True

    def commission_need(self):
        need = self.cfg.commission_need or C.COMMISSION_NEED[self.n]
        return min(len(self.comm), need + self.need_plus)

    def comm_matches(self, ci, page, cid):
        k = C.COMMISSIONS[self.cfg.soul][ci]
        card = CARD[cid]
        if k["own"]:
            return card.cid[0] in "KGBL" and card.cid[:1] == {"king": "K", "garland": "G", "bride": "B", "child": "L"}.get(self.cfg.soul, "?")
        return ((k["page"] is None or k["page"] == page) and (k["tag"] is None or k["tag"] == card.tag)
                and (k["slot"] is None or k["slot"] == card.slot))

    def lit_memories(self):
        return [(r, cid) for r in range(3) for cid in self.book[r].values() if cid in self.lit_mem]

    def commissions_done(self, comm=None):
        """Most commissions the lit memories can complete, each memory used once."""
        comm = self.comm if comm is None else comm
        mems = self.lit_memories()

        def best(i, used):
            if i == len(comm):
                return 0
            top = best(i + 1, used)
            for j, (r, cid) in enumerate(mems):
                if j not in used and self.comm_matches(comm[i], r, cid):
                    top = max(top, 1 + best(i + 1, used | {j}))
            return top
        return best(0, frozenset())

    def light_one(self, cid, cost):
        self.light -= cost
        self.lit_mem.add(cid)
        self.stats["lit"] = self.stats.get("lit", 0) + 1
        self.stats["light_on_memories"] = self.stats.get("light_on_memories", 0) + cost
        self.note(f"  lights {CARD[cid].cid}")
        self.fate_event("lit", cid=cid)
        if self.cfg.book_mode == "blessing" and self.cfg.blessing_trigger == "lit":
            r = next((i for i in range(3) if cid in self.book[i].values()), None)
            if r is not None and not self.blessed[r] and sum(c in self.lit_mem for c in self.book[r].values()) >= self.cfg.blessing_at:
                self.blessed[r] = True
                self.stats["blessings"] += 1
                self.blessing(None)

    def spring_pick(self, cands):
        mine = self.comm[self.cur] if self.comm else None
        if mine is not None:
            good = [c for c in cands if self.comm_matches(mine, self.page(), c)]
            if good:
                return good[0]
        return cands[0]

    def bloom_targets(self):
        out = [k for k in range(2 * max(1, self.soul), NSLOT) if self.tok[k] == ROOT and not self.fogged[k]]
        if self.cfg.v5_reach:
            net = self.network()
            out = [k for k in out if k in net]
        return out

    def add_fracture(self):
        if self.shield_until >= self.turn:
            self.shield_until = -1
            self.note("  the Shield holds")
            return
        r = reach_of(max(1, min(LAST, self.soul)))
        if self.cfg.child_shield == "game":
            r = 0
        if self.cfg.child_shield != "none" and self.child_shield[r]:
            self.child_shield[r] = False
            self.note("  (Child) the first Fracture this Reach is ignored")
            return
        self.fract += 1
        self.stats["max_fract"] = max(self.stats["max_fract"], self.fract)
        self.stats["cracks_taken"] = self.stats.get("cracks_taken", 0) + 1
        if not self.sim:
            src = sys._getframe(1).f_code.co_name
            self.stats[f"crack_{src}"] = self.stats.get(f"crack_{src}", 0) + 1
        self.note(f"  Fracture ({self.fract}/{self.cfg.fracture_limit})")
        if self.cfg.soul == "king":
            for m, holder in self.mantles.items():
                if holder == self.cur:
                    self.mantles[m] = -1
                    self.stats["king_titles_lost"] = self.stats.get("king_titles_lost", 0) + 1
        if self.fract >= self.cfg.fracture_limit:
            self.lose("Shattered")
        if self.cfg.v5_chapters:
            self.ch_event("cracks")

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
        sp = min(sp, LAST)
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
            self.flip_down(x * 2 + b)
        self.note(f"  Black Water on space {x} (supply {self.bw_supply})")

    def drain(self, sp):
        if self.flooded[sp]:
            self.flooded[sp] = False
            if self.cfg.bw_returns:
                self.bw_supply += 1

    def place_griev(self, sp, bank):
        sp = max(1, min(sp, LAST))
        order = [(x, b) for x in range(sp, FAR) for b in ((bank, 1 - bank) if x == sp else (bank, 1 - bank))]
        order = [(x, b) for x, b in order if x >= 1]
        if not order or all(self.griev[x * 2 + b] for x, b in order):
            order = [(x, b) for x in range(min(sp, LAST), max(0, self.soul) - 1, -1) for b in (0, 1) if x >= 1]
        for x, b in order:
            k = x * 2 + b
            if not self.griev[k]:
                self.griev[k] = True
                self.tok[k] = NONE
                self.note(f"  Shade at {x}{'ul'[b]}")
                if self.cfg.v5_chapters and x == self.soul:
                    self.ch_event("griev_enter")
                return

    def cap(self, tag):
        """Knots that fill a thread (V5: one fewer per scar)."""
        solo = self.cfg.v5_solo_cap_bonus if self.n == 1 else 0
        return max(1, self.cfg.karma_cap + self.cfg.v5_cap_bonus + solo - (self.scars[tag] if self.cfg.v5_scars else 0))

    def tie_knot(self, tag, src="play"):
        self.karma[tag] += 1
        if self.cfg.v5_scars:
            key = f"knots_{src}"
            self.stats[key] = self.stats.get(key, 0) + 1
        if self.karma[tag] >= self.cap(tag):
            self.karma[tag] = 0
            level = 1
            if self.cfg.v5_scars:
                level = min(3, self.scars[tag] + 1 + self.lv_bonus[tag])
                self.scars[tag] = min(self.cfg.v5_scar_max, self.scars[tag] + 1)
            self.backlash(tag, level)

    def backlash(self, tag, level=1):
        self.stats["backlash"][tag] += 1
        self.stats["backlash_by_reach"][self.reach] += 1
        if self.cfg.v5_scars:
            key = f"backlash_lv{level}"
            self.stats[key] = self.stats.get(key, 0) + 1
        self.note(f"  BACKLASH: {C.TAG_NAMES[tag]} (level {level})")
        if self.cfg.v5_chapters and tag == OBS:
            self.chc["backlash_obs"] = self.chc.get("backlash_obs", 0) + 1
        self.fate_event("backlash")
        if tag == OBS:
            if level == 1:
                k0, k1 = self.soul * 2, self.soul * 2 + 1
                if self.soul >= 1 and not self.griev[k0]:
                    self.place_griev(self.soul, 0)
                elif self.soul >= 1 and not self.griev[k1]:
                    self.place_griev(self.soul, 1)
                else:
                    self.place_griev(self.soul + 1, 0)
            else:
                ahead = self.cfg.v5_obs_l2_ahead
                self.place_griev(self.soul + ahead, 0)
                self.place_griev(self.soul + ahead, 1)
                if level >= 3 and self.cfg.v5_l3_crack:
                    self.add_fracture()
        elif tag == ACC:
            self.stats["resignation_pending"] = 1
            self.stats["resign_extra"] = max(self.stats.get("resign_extra", 0), level - 1)
            if level >= 3:
                self.fog_advance(2)
        else:
            self.place_bw(self.soul + 1)
            if level >= 2:
                self.place_bw(self.soul + 3)
            if level >= 3:
                self.forget_top(1)

    # ------------------------------------------------------------- card effects
    def do_ops(self, ops, chooser):
        for op in ops:
            self.do_op(op, chooser)

    def do_op(self, op, chooser):
        kind = op[0]
        if kind == "root":
            n, stony = op[1], op[2]
            holder_weaver = self.holder("weaver") == self.cur
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
                if self.cfg.v5_traits and self.trait == ACC and "spread" not in self.turn_flags:
                    self.turn_flags.add("spread")
                    for nb in (t ^ 1, t - 2, t + 2):
                        if 2 <= nb < NSLOT and nb // 2 >= self.soul and self.tok[nb] == ROOT and not self.fogged[nb]:
                            self.tok[nb] = BLOOM
                            if not self.sim:
                                self.stats["trait_spreads"] = self.stats.get("trait_spreads", 0) + 1
                            break
        elif kind == "hold":
            self.hold = True
        elif kind == "shield":
            self.shield_until = self.turn + self.n
        elif kind == "mend":
            self.fract = max(0, self.fract - op[1])
        elif kind == "release":
            col = self.fullest(chooser)
            self.karma[col] = max(0, self.karma[col] - op[1])
        elif kind == "guide":
            if self.passable(self.soul + 1):
                self.stats["guides"] += 1
                self.move_soul(1)
        elif kind == "vigil" and self.cfg.vigil_mode == "kindle":
            # V2 Vigil: light one memory for 1 Light
            cid = chooser.light_target(self) if hasattr(chooser, "light_target") else None
            cost = max(0, self.cfg.light_memory_cost - 1)   # one Light less than usual (V2: free at 1 Light)
            if cid is not None and self.light >= cost and not self.dim:
                self.light_one(cid, cost)
                self.stats["vigil_lights"] = self.stats.get("vigil_lights", 0) + 1
        elif kind == "cross":
            # V2 Lightless Crossing: step forward even into the dark or between two Shades (never into Black Water)
            sp = self.soul + 1
            if (sp >= FAR and self.shore_open) or (sp < FAR and not self.flooded[sp]):
                self.stats["crossings"] = self.stats.get("crossings", 0) + 1
                dark = sp < FAR and not self.lit(sp)
                self.move_soul(1, light=False)
                if dark and self.cfg.cross_fracture:
                    self.add_fracture()
        elif kind == "vigil":
            d = self.mist[self.mist_idx()]
            top = d[-3:]  # the player puts them back in any order; the bot puts the mildest first
            top.sort(key=lambda m: -mist_severity(m))  # worst first in the list, so it is drawn last
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
            lo, hi = BOUNDS[self.reach]
            for sp in range(max(2, lo), hi + 1):
                for b in (0, 1):
                    k = sp * 2 + b
                    if not self.revealed[k]:
                        if not self.sim:
                            self.revealed[k] = True
                            if self.tile[k] == GRAVE:
                                self.tile[k] = FERTILE
        elif kind == "unmake":
            col = self.fullest(chooser)
            self.karma[col] = 0
        elif kind == "wash":
            for b in (0, 1):
                if self.soul >= 1:
                    self.griev[self.soul * 2 + b] = False
        elif kind == "lowtide":
            lo, hi = BOUNDS[self.reach]
            for sp in range(lo, hi + 1):
                self.drain(sp)
        elif kind == "extra_karma":
            self.tie_knot(op[1])
        elif kind == "recall_free":
            if self.forgotten:
                self.discard.append(self.forgotten.pop())
        elif kind == "blessing":
            self.blessing(chooser)

    def fullest(self, chooser):
        """The thread with the most knots; on a tie the player chooses."""
        top = max(self.karma)
        tied = [i for i in range(3) if self.karma[i] == top]
        return tied[0] if len(tied) == 1 or not hasattr(chooser, "pick_thread") else chooser.pick_thread(self, tied)

    def urgent_grievance(self):
        best, bu = None, -1
        net = self.network() if self.cfg.v5_reach else None
        for k in range(2 * max(1, self.soul), NSLOT):
            if self.griev[k] and not self.fogged[k] and (net is None or self.near_net(k, net)):
                u = self.griev_urgency(k)
                if u > bu:
                    best, bu = k, u
        return best

    def griev_urgency(self, k):
        d = k // 2 - self.soul
        return 10 - min(d, 9) * 2

    def urgent_water(self):
        net = self.network() if self.cfg.v5_reach else None
        for sp in range(self.soul + 1, FAR):
            if self.flooded[sp] and (net is None or self.near_net(sp * 2, net) or self.near_net(sp * 2 + 1, net)):
                return sp
        return None

    def water_urgency(self, sp):
        d = sp - self.soul
        return 11 - min(d, 9) * 2

    # ------------------------------------------------------------- joint Burn
    def burn_partners(self):
        """The hands a joint Burn's other card can come from: the other players (solo: your own)."""
        return [self.cur] if self.n == 1 else [p for p in range(self.n) if p != self.cur]

    def burn_fuel(self, cid, mode):
        """(hand, card) of the other card in a joint Burn of cid, or None. mode 'burn': cid is the active player's
        card and the fuel comes from a partner; 'burnx': cid is a partner's card and the fuel is the active player's."""
        tag = CARD[cid].tag
        if mode == "burnx":
            mine = [c for c in self.hands[self.cur] if CARD[c].tag == tag]
            owner = next((p for p in self.burn_partners() if cid in self.hands[p]), None)
            return (owner, mine[0]) if mine and owner is not None else None
        for p in self.burn_partners():
            cands = [c for c in self.hands[p] if CARD[c].tag == tag and not (p == self.cur and c == cid)]
            if p == self.cur and cid in self.hands[p] and self.hands[p].count(cid) > 1:
                cands.append(cid)
            if cands:
                return (p, min(cands, key=lambda c: (CARD[c].key, c)))
        return None

    # ------------------------------------------------------------- playing cards
    def play(self, cid, mode, chooser, first):
        """mode: 'up', 'down' or 'burn'. Returns True if the card Resonated."""
        if mode == "recall_ins":
            # V5 Recall: 3 Light, a forgotten memory is inscribed into an empty slot of the current page (unlit)
            self.light -= self.cfg.light_action_cost
            self.turn_flags.add("recalled")
            pick = self.recall_pick()
            if pick is not None:
                self.forgotten.remove(pick)
                if self.inscribe(pick, None):
                    self.stats["recall_inscribes"] = self.stats.get("recall_inscribes", 0) + 1
                    self.fate_event("recall")
                else:
                    self.forgotten.append(pick)
            return False
        if mode == "swapx":
            # V5 Swap: trade one of my cards for another player's card, then play it face up at once
            owner = next(p for p in range(self.n) if p != self.cur and cid in self.hands[p])
            mine = self.hands[self.cur]
            give = min(mine, key=lambda c: (CARD[c].key, CARD[c].tag == self.echo, CARD[c].tag != OBL)) if mine else None
            self.hands[owner].remove(cid)
            if give is not None:
                mine.remove(give)
                self.hands[owner].append(give)
            mine.append(cid)
            self.turn_flags.add("swapped")
            self.stats["swaps"] = self.stats.get("swaps", 0) + 1
            return self.play(cid, "up", chooser, first)
        if mode in ("recall", "mend", "drainl"):
            # Spending Light takes the Answer action and uses no card.
            self.light -= self.cfg.light_action_cost
            self.stats["light_actions"] = self.stats.get("light_actions", 0) + 1
            self.stats[f"la_{mode}"] = self.stats.get(f"la_{mode}", 0) + 1
            if mode == "recall":
                self.discard.append(self.forgotten.pop())
            elif mode == "mend":
                self.fract -= 1
            else:
                self.drain(self.urgent_water())
            return False
        if mode == "push":
            # Push Through: an action that uses no card. Only legal while Grievances hold both banks ahead.
            self.stats["push_actions"] = self.stats.get("push_actions", 0) + 1
            self.stats["pushed"] = 1
            self.stats[f"pushed_p{self.cur}"] = 1
            self.push_through()
            return False
        card = CARD[cid]
        fuel = None
        if mode in ("burn", "burnx"):
            if self.stats.get("burned_turn"):
                self.stats["double_burns"] = self.stats.get("double_burns", 0) + 1
            self.stats["burned_turn"] = 1
        if mode in ("burn", "burnx") and self.cfg.burn_mode != "solo" and self.n > 1:
            # Joint Burn: the doubled card and a same-thread fuel card from another hand (solo: from your own hand).
            fuel = self.burn_fuel(cid, mode)
            if mode == "burnx":
                self.hands[fuel[0]].remove(cid)
                self.hands[self.cur].remove(fuel[1])
            else:
                self.hands[fuel[0]].remove(fuel[1])
                self.hands[self.cur].remove(cid)
            if fuel[0] != self.cur:
                self.draw_up(fuel[0])        # the partner refills at once, so no hand is left empty
            mode = "burn"
        else:
            self.hands[self.cur].remove(cid)
        if mode == "seek":
            # Seek: draw, then discard this one. While planning, the AI cannot see the draw.
            self.stats["sought"] = 1
            self.stats["seeks"] = self.stats.get("seeks", 0) + 1
            sm = self.cfg.seek_mode
            nxt = (self.cur + 1) % self.n
            if sm == "pass" and self.n > 1:
                self.hands[nxt].append(cid)          # the card goes to the next player instead of the discard pile
            else:
                self.discard.append(cid)
            if not self.sim:
                draws = 3 if sm == "scry" else 2 if sm in ("keep1give", "keep1light") else 1
                got = []
                for _ in range(draws):
                    if not self.deck:
                        self.reshuffle()
                    if self.deck:
                        got.append(self.deck.pop())
                if len(got) > 1:
                    keep = chooser.keep_best(self, got)
                    got.remove(keep)
                    self.hands[self.cur].append(keep)
                    if sm == "scry":
                        self.deck[:0] = got                # the rest go to the bottom of the deck
                    else:
                        for other in got:
                            if sm == "keep1light" and chooser.forget_for_light(self, other):
                                self.forget_card(other)
                                self.light += 1
                                self.stats["seek_light"] = self.stats.get("seek_light", 0) + 1
                            elif self.n > 1:
                                self.hands[nxt].append(other)
                                self.stats["seek_gifts"] = self.stats.get("seek_gifts", 0) + 1
                            else:
                                self.deck.insert(0, other)
                else:
                    self.hands[self.cur] += got
            return False
        if mode == "down":
            self.stats["face_down"] += 1
            stony = self.holder("weaver") == self.cur
            if self.cfg.facedown_light and not self.root_targets(stony):
                self.light += 1
                self.stats["facedown_light"] = self.stats.get("facedown_light", 0) + 1
            self.do_op(("root", 1, False), chooser)
            self.discard.append(cid)
            if self.cfg.v5_facedown_knot:
                self.tie_knot(card.tag, "down")
            return False
        echo_before = self.echo
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
            if self.cfg.burn_inscribe and self.can_inscribe(cid) and chooser.want_inscribe(self, cid) and self.inscribe(cid, chooser):
                self.stats["burn_inscribes"] = self.stats.get("burn_inscribes", 0) + 1
            else:
                self.forget_card(cid)
            if fuel is not None:
                self.stats["joint_burns"] = self.stats.get("joint_burns", 0) + 1
                self.forget_card(fuel[1])
                return resonated
            if self.cfg.burn_forget > 1:
                self.forget_top(self.cfg.burn_forget - 1)
            return resonated
        if card.tag == OBL:
            if not self.cfg.mantles_v2 and self.holder("breaker") == self.cur and not self.breaker_used:
                self.breaker_used = True
                self.discard.append(cid)
            else:
                self.forget_card(cid)
            return resonated
        echo_match = self.cfg.v5_insc_echo and echo_before == card.tag
        if ((resonated or echo_match or (card.key and self.cfg.key_any)) and self.can_inscribe(cid)
                and chooser.want_inscribe(self, cid) and self.inscribe(cid, chooser)):
            filled = len(self.book[self.reach])
            if self.cfg.book_mode == "pairs":
                page = self.book[self.reach]
                for i, (a, b) in enumerate((("Place", "Person"), ("Person", "Deed"), ("Deed", "Feeling"))):
                    if card.slot in (a, b) and a in page and b in page:
                        self.stats["pair_rewards"] = self.stats.get("pair_rewards", 0) + 1
                        self.do_ops(self.cfg.pair_rewards[self.reach][i], chooser)
                if filled == self.cfg.full_page_at:
                    self.stats["blessings"] += 1
                    self.do_ops([(op,) if isinstance(op, str) else op for op in self.cfg.full_page], chooser)
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
        for m, h in self.mantles.items():
            if h == self.cur:
                self.mantles[m] = -2          # retired: it can never be summoned again
        self.light -= self.cfg.mantle_cost
        self.hands[self.cur].remove(discard_cid)
        self.discard.append(discard_cid)
        self.mantles[mantle] = self.cur
        self.stats["summons"] += 1
        self.note(f"  P{self.cur + 1} summons the {mantle}")

    # ------------------------------------------------------------- soul movement
    def move_soul(self, steps, light=True):
        for _ in range(steps):
            old = self.soul
            if 1 <= old <= LAST and self.cfg.v5_keep:
                ks = (old * 2, old * 2 + 1)
                wall = all(self.tok[k] == BLOOM and not self.fogged[k] for k in ks)
                if wall and self.want_keep(old):
                    if not self.sim:
                        self.stats["walls_kept"] = self.stats.get("walls_kept", 0) + 1
                    if self.cfg.v5_chapters:
                        self.ch_event("walls")
                else:
                    for k in ks:
                        if self.tok[k] == BLOOM and light:
                            self.light += self.cfg.light_per_bloom
                            self.tok[k] = ROOT
            elif 1 <= old <= LAST:
                for b in (0, 1):
                    k = old * 2 + b
                    if self.tok[k] == BLOOM and light:
                        self.light += self.cfg.light_per_bloom
                    self.tok[k] = NONE
                    self.griev[k] = False
                    self.frost[k] = False
            self.soul += 1
            self.turn_flags.add("moved")
            if self.soul >= FAR:
                self.win()
            if self.cfg.v5_chapters:
                self.reach = reach_of(self.soul)
                if self.soul <= LAST and (self.griev[self.soul * 2] or self.griev[self.soul * 2 + 1]):
                    self.ch_event("griev_enter")
                continue
            nr = reach_of(self.soul)
            if nr != self.reach:
                old_reach = self.reach
                self.reach = nr
                if self.cfg.v5_scars and self.cfg.v5_carry:
                    for cid in self.book[old_reach].values():
                        if cid in self.lit_mem and self.karma[CARD[cid].tag] > 0:
                            self.karma[CARD[cid].tag] -= 1
                            if not self.sim:
                                self.stats["unties_transition"] = self.stats.get("unties_transition", 0) + 1
                else:
                    self.karma = [0, 0, 0]
                if self.cfg.v5_traits:
                    tags = [CARD[c].tag for c in self.book[old_reach].values() if c in self.lit_mem]
                    o, a = tags.count(OBS), tags.count(ACC)
                    self.trait = OBS if o > a else ACC if a > o else None
                    if self.trait is not None and not self.sim:
                        key = f"trait_{C.TAG_NAMES[self.trait]}"
                        self.stats[key] = self.stats.get(key, 0) + 1
                if self.cfg.v5_fate:
                    if not any(f["fired"] for f in self.fate) and self.fate:
                        self.fire_fate(self.fate[0], forced=True, at_reach=old_reach)
                    self.fate = self.deal_fate(nr)
                self.note(f"  the soul enters Reach {nr + 1}")
                if self.cfg.transitions and not self.sim:
                    self.transition(nr)

    def soul_step(self):
        if self.result is not None:
            return
        cfg = self.cfg
        f = len(self.forgotten)
        if self.stats.get("resignation_pending"):
            self.stats["resignation_pending"] = 0
            self.note("  Resignation: the soul sits down")
            self.linger(force=True)
            extra = self.stats.get("resign_extra", 0)
            if extra:
                self.stats["resign_extra"] = 0
                self.forget_top(extra)
            self.feed()
            return
        if (cfg.mantles_v2 and self.holder("warden") >= 0 and self.warden_ready and self.passable(self.soul + 1)
                and self.want_stay()):
            # V2 Spirit Warden "stay": the soul waits where it is, forgetting nothing
            self.warden_ready = False
            self.stats["stays"] = self.stats.get("stays", 0) + 1
            self.note("  the Spirit Warden keeps the soul here a little longer")
        elif self.passable(self.soul + 1):
            self.move_soul(1)
            if f >= cfg.adrift_at:
                if self.passable(self.soul + 1):
                    self.move_soul(1)
                elif self.holder("warden") >= 0 and self.warden_ready:
                    self.warden_ready = False
                    self.note("  the Spirit Warden holds the soul back")
                else:
                    self.stats["exposures"] += 1
                    self.note("  Adrift: the soul drifts into the dark")
                    self.move_soul(1)
                    self.add_fracture()
            elif f >= cfg.ash_at and self.passable(self.soul + 1):
                self.move_soul(1)
        elif self.blocked_by_grievances() and not self.cfg.push_action:
            self.push_through()
        else:
            self.linger()
            if cfg.v5_chapters and self.soul == LAST and not self.shore_open and self.result is None:
                self.gate_force()
        self.feed()

    def want_stay(self):
        """AI rule for the V2 Warden: stay rather than walk into a space a Shade holds, or to light one more memory first."""
        nxt = self.soul + 1
        if nxt <= LAST and (self.griev[nxt * 2] or self.griev[nxt * 2 + 1]) and not (
                self.soul >= 1 and (self.griev[self.soul * 2] or self.griev[self.soul * 2 + 1])):
            return True
        if nxt <= LAST and reach_of(nxt) != self.reach and self.reach < 2:
            # about to leave the Reach: stay one turn if the page is thin
            return len(self.book[self.reach]) < 2
        return False

    def transition(self, nr):
        """V2 §3.5: the page just closed reshapes the Reach the soul enters."""
        page = self.book[nr - 1]
        tags = [CARD[c].tag for c in page.values()]
        obs, acc = tags.count(OBS), tags.count(ACC)
        n = len(page) - self.gaze
        self.gaze = 0
        d = self.mist[nr]
        adds = []
        if page:
            if obs > acc:
                self.swap_tile(nr, (STONY,), FERTILE)
                adds.append(("Shade", [("grv", 1, 0)]))
            elif acc > obs:
                self.swap_tile(nr, (FERTILE,), FLOWER)
                adds.append(("Cold Wind", [("forget", 1)]))
            else:
                self.swap_tile(nr, None, SPRING)
        if n <= 0:
            adds.append(("Undertow Returns", [("back",)]))
            if self.harsh_pool:
                adds.append(self.harsh_pool.pop())
        elif n == 1:
            if self.harsh_pool:
                adds.append(self.harsh_pool.pop())
        elif n >= 3:
            self.swap_tile(nr, None, SPRING)
        d.extend(adds)
        self.rng.shuffle(d)
        self.stats[f"transition_count_{min(max(n, 0), 3)}"] = self.stats.get(f"transition_count_{min(max(n, 0), 3)}", 0) + 1

    def swap_tile(self, r, kinds, new):
        """Replace the nearest unrevealed tile of the given kinds (None: any) in Reach r, left bank first; face up."""
        lo, hi = BOUNDS[r]
        for sp in range(max(lo, self.soul), hi + 1):
            for b in (0, 1):
                k = sp * 2 + b
                if not self.revealed[k] and (kinds is None or self.tile[k] in kinds):
                    self.tile[k] = new
                    self.revealed[k] = True
                    self.stats["tiles_swapped"] = self.stats.get("tiles_swapped", 0) + 1
                    return

    def blocked_by_grievances(self):
        """The next space is dark only because Shades hold both of its banks."""
        sp = self.soul + 1
        return (self.cfg.push_through != "off" and 1 <= sp <= LAST and not self.flooded[sp]
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
        self.note("  the soul pushes through the Shades")
        self.move_soul(1)
        for _ in range(1 + before):   # each push already made in this scope adds another Fracture
            self.add_fracture()
        if self.cfg.push_through == "harsh":
            self.forget_top(1)

    def linger(self, force=False):
        if not force and self.hold:
            self.note("  Hold: the soul waits without forgetting")
            return
        if not force and self.holder("warden") >= 0 and self.warden_ready:
            self.warden_ready = False
            self.note("  the Spirit Warden steadies the soul")
            return
        self.stats["lingers"] += 1
        self.note("  the soul Lingers")
        self.fate_event("linger")
        if self.cfg.linger_rule == "dark" and not force and self.soul >= 1 and self.lit(self.soul):
            self.note("  (beside its own light, the soul waits without forgetting)")
            return
        pulled = any(self.bride_pulled) if self.cfg.bride_once else self.bride_pulled[self.page()]
        at_reach_start = self.cfg.back_rule and self.soul - 1 < BOUNDS[self.reach][0]
        if self.cfg.soul == "bride" and not force and self.soul >= 1 and not pulled and not at_reach_start:
            self.bride_pulled[self.reach] = True
            if self.cfg.bride_pullback:
                self.soul -= 1
            self.note("  (Bride) she is pulled one space back")
            if not self.cfg.bride_forgets:
                return
        self.forget_top(1)
        if self.cfg.v5_chapters and self.cfg.v5_linger_blank and not self.page_turn:
            slots = self.open_slots()
            if slots:
                self.pg[self.ch][slots[0]] = -1
                self.stats["blank_slots"] = self.stats.get("blank_slots", 0) + 1
                self.advance_route()

    def feed(self):
        if 1 <= self.soul <= LAST and (self.griev[self.soul * 2] or self.griev[self.soul * 2 + 1]):
            self.note("  a Shade feeds on the soul")
            self.add_fracture()

    # ------------------------------------------------------------- V5 helpers
    def mist_idx(self):
        """Which Mist deck is drawn: the Reach, or (V5) the depth set by the number of lit memories."""
        if self.cfg.v5_chapters:
            return self.ch
        if not self.cfg.v5_depth:
            return self.reach
        n = len(self.lit_mem)
        t = 0 if n <= 2 else 1 if n <= 5 else 2
        if self.reach == 2:
            t = max(t, 1)
        return t

    def front_mist(self):
        d = self.mist[self.mist_idx()]
        return d[-1] if d else None

    def fog_need(self, upto):
        """Bank flips (wall flowers count one each) the fog still needs to cover space `upto` completely."""
        lo = 1 if self.cfg.v5_chapters else max(1, BOUNDS[self.reach][0])
        need = 0
        for sp in range(lo, min(upto, LAST) + 1):
            ks = (sp * 2, sp * 2 + 1)
            if all(self.tok[k] == BLOOM and not self.fogged[k] for k in ks):
                need += 4          # a wall: two flowers wither, then two banks flip
            else:
                need += sum(not self.fogged[k] for k in ks)
        return need

    def want_keep(self, sp):
        """Rule for keeping a Light Wall when the soul leaves space sp: keep it if the fog is close behind."""
        return self.fog_need(sp - 1) <= self.cfg.v5_keep_need

    def fog_advance(self, n):
        if n <= 0 or not self.cfg.v5_fog or self.soul < 1:
            return
        n += self.cfg.v5_fog_plus
        lo = 1 if self.cfg.v5_chapters else max(1, BOUNDS[self.reach][0])
        for sp in range(lo, min(self.soul, LAST) + 1):
            ks = (sp * 2, sp * 2 + 1)
            if all(self.fogged[k] for k in ks):
                continue
            if self.cfg.v5_wall_mode == "bank":
                held = False
                for k in ks:
                    if n <= 0:
                        return
                    if self.fogged[k]:
                        continue
                    if self.tok[k] == BLOOM:
                        self.tok[k] = ROOT
                        held = True
                        if not self.sim:
                            self.stats["wall_absorbed"] = self.stats.get("wall_absorbed", 0) + 1
                    else:
                        self.fogged[k] = True
                        if not (self.cfg.v5_traits and self.trait == OBS and self.tok[k] == ROOT):
                            self.tok[k] = NONE
                        self.frost[k] = False
                        if not self.sim:
                            self.stats["fog_flips"] = self.stats.get("fog_flips", 0) + 1
                    n -= 1
                if held:
                    return
                continue
            if all(self.tok[k] == BLOOM and not self.fogged[k] for k in ks):
                for k in ks:
                    if n <= 0:
                        return
                    self.tok[k] = ROOT
                    n -= 1
                    if not self.sim:
                        self.stats["wall_absorbed"] = self.stats.get("wall_absorbed", 0) + 1
                return
            for k in ks:
                if n <= 0:
                    return
                if not self.fogged[k]:
                    self.fogged[k] = True
                    if not (self.cfg.v5_traits and self.trait == OBS and self.tok[k] == ROOT):
                        self.tok[k] = NONE
                    self.frost[k] = False
                    n -= 1
                    if not self.sim:
                        self.stats["fog_flips"] = self.stats.get("fog_flips", 0) + 1

    def shrouded(self):
        sp = self.soul
        return 1 <= sp <= LAST and self.fogged[sp * 2] and self.fogged[sp * 2 + 1]

    def shroud(self, tag, mist):
        self.stats["shrouds"] = self.stats.get("shrouds", 0) + 1
        self.stats[f"shrouds_r{self.reach}"] = self.stats.get(f"shrouds_r{self.reach}", 0) + 1
        self.note("  the mist shrouds the soul")
        self.fate_event("shroud")
        self.book_scar(tag)
        if self.cfg.v5_shroud_crack:
            self.add_fracture()

    def book_scar(self, tag, src="mist"):
        """A mist scar enters the current page; its thread's Backlash is rewritten (one level harsher)."""
        r = min(self.reach, 2)
        self.stats[f"scar_src_{src}"] = self.stats.get(f"scar_src_{src}", 0) + 1
        if self.cfg.v5_chapters:
            self.ch_mist_scar(tag)
            return
        if len(self.bscars[r]) < 2:
            self.bscars[r].append(tag)
            self.lv_bonus[tag] = 1
            return
        page = self.book[r]
        for rr, slot in reversed(self.order):
            if rr == r and slot in page and page[slot] not in self.lit_mem:
                cid = page.pop(slot)
                self.order.remove((rr, slot))
                self.stats["scar_covers"] = self.stats.get("scar_covers", 0) + 1
                self.forget_card(cid)
                return
        self.stats["scar_fracture"] = self.stats.get("scar_fracture", 0) + 1
        self.add_fracture()

    def griev_feed(self):
        """V5: Shades on the soul's space and the next one push the Loom by their bank."""
        for sp in range(self.soul, self.soul + 1 + self.cfg.v5_feed_range):
            if 1 <= sp <= LAST:
                for b in (0, 1):
                    k = sp * 2 + b
                    if self.griev[k]:
                        tag = OBL if self.fogged[k] else (OBS if b == 0 else ACC)
                        self.fate_event("fed")
                        self.tie_knot(tag, "griev")
                        if self.result is not None:
                            return

    def network(self):
        """Banks holding a token connected to the soul's space or the next one."""
        start = [k for sp in (self.soul, self.soul + 1) if 1 <= sp <= LAST for k in (sp * 2, sp * 2 + 1)
                 if self.tok[k] != NONE]
        net, todo = set(start), list(start)
        gap = self.cfg.v5_traits and self.trait == OBL
        while todo:
            k = todo.pop()
            nbrs = [k ^ 1, k - 2, k + 2] + ([k - 4, k + 4] if gap else [])
            for nb in nbrs:
                if 2 <= nb < NSLOT and nb not in net and self.tok[nb] != NONE:
                    net.add(nb)
                    todo.append(nb)
        return net

    def near_net(self, k, net):
        sp = k // 2
        if self.soul <= sp <= self.soul + 1:
            return True
        return any(nb in net for nb in (k ^ 1, k - 2, k + 2))

    # fate mist
    RIVER_CONDS = ("linger", "backlash", "shroud", "fed")
    BOOK_CONDS = ("lit", "reveal", "recall", "inscribed")

    def deal_fate(self, r):
        cards = []
        for kind, conds in (("river", self.RIVER_CONDS), ("book", self.BOOK_CONDS)):
            cond = self.rng.choice(conds)
            cards.append({"kind": kind, "cond": cond, "slot": self.rng.choice(C.SLOTS),
                          "tag": self.rng.choice((OBS, ACC, OBL)), "fired": False, "reach": r})
        return cards

    def fate_event(self, ev, cid=None):
        if self.cfg.v5_chapters:
            if self.result is None:
                key = {"linger": "lingers", "backlash": "backlash", "reveal": "reveals"}.get(ev)
                if key:
                    self.chc[key] = self.chc.get(key, 0) + 1
                self.check_fate()
            return
        if not self.cfg.v5_fate or not self.fate or self.result is not None:
            return
        for f in self.fate:
            if f["fired"] or f["cond"] != ev:
                continue
            if ev == "lit" and (cid is None or CARD[cid].slot != f["slot"] or cid not in self.book[min(self.reach, 2)].values()):
                continue
            if ev == "inscribed" and len(self.book[min(self.reach, 2)]) < 3:
                continue
            self.fire_fate(f)

    def fire_fate(self, f, forced=False, at_reach=None):
        f["fired"] = True
        r = f["reach"] if at_reach is None else at_reach
        if not self.sim:
            key = f"fate_r{r}_{'forced' if forced else 'natural'}"
            self.stats[key] = self.stats.get(key, 0) + 1
            self.stats[f"fate_cond_{f['cond']}"] = self.stats.get(f"fate_cond_{f['cond']}", 0) + 1
        both = r >= 1
        river = both or f["kind"] == "river"
        book = both or f["kind"] == "book"
        power = self.cfg.v5_fate_power
        if power == "light" and r == 0:
            river = book = False
        if river:
            if power == "strong":
                self.place_griev(min(LAST, max(1, self.soul) + 3), 0)
            self.tie_knot(f["tag"], "fate")
        if book and self.result is None and power != "strong":
            self.forget_top(1)
            book = False
        if book and self.result is None:
            page = self.book[min(self.reach, 2)]
            for rr, slot in reversed(self.order):
                if rr == min(self.reach, 2) and slot in page and page[slot] not in self.lit_mem:
                    self.forget_card(page.pop(slot))
                    self.order.remove((rr, slot))
                    break
            else:
                self.forget_top(1)
        if self.result is None:
            self.book_scar(f["tag"], src="fate")

    # commissions: early reveal
    def reveal_ready(self, p):
        if p in self.comm_rev or not self.comm:
            return None
        used = set(self.comm_rev.values())
        for r, cid in self.lit_memories():
            if cid not in used and self.comm_matches(self.comm[p], r, cid):
                return cid
        return None

    def reveal(self, p, cid, chooser=None):
        self.comm_rev[p] = cid
        self.stats["reveals"] = self.stats.get("reveals", 0) + 1
        self.stats.setdefault("reveal_reach", []).append(self.page()) if not self.sim else None
        if self.cfg.v5_chapters:
            mists = [x for x, v in self.pg[self.ch].items() if v != -1]
            near = any(self.karma[t] >= self.cap(t) - 2 for t in range(3))
            if self.cfg.v5_reveal_rewrite and self.paths[self.ch] is None and self.rng.random() < self.cfg.v5_reveal_rewrite:
                self.rewrite = True
                self.stats["reveal_rewrite"] = self.stats.get("reveal_rewrite", 0) + 1
                self.fate_event("reveal")
                return
            if mists and not near:
                self.pg[self.ch].pop(mists[0])
                self.stats["reveal_unmist"] = self.stats.get("reveal_unmist", 0) + 1
                self.fate_event("reveal")
                return
        for _ in range(2):
            col = max(range(3), key=lambda t: self.karma[t] / self.cap(t))
            if self.karma[col] > 0:
                self.karma[col] -= 1
        self.fate_event("reveal")

    def final_commissions(self):
        used = set(self.comm_rev.values())
        done = len(self.comm_rev)
        rest = [self.comm[p] for p in range(len(self.comm)) if p not in self.comm_rev]
        mems = [(r, cid) for r, cid in self.lit_memories() if cid not in used]

        def best(i, taken):
            if i == len(rest):
                return 0
            top = best(i + 1, taken)
            for j, (r, cid) in enumerate(mems):
                if j not in taken and self.comm_matches(rest[i], r, cid):
                    top = max(top, 1 + best(i + 1, taken | {j}))
            return top
        return done + best(0, frozenset())

    def recall_pick(self):
        if self.cfg.v5_chapters:
            cands = [c for c in self.forgotten if self.ch_can_inscribe(c)]
            if not cands:
                return None
            mine = self.comm[self.cur] if self.comm else None
            good = [c for c in cands if mine is not None and self.comm_matches(mine, self.ch, c)]
            return (good or cands)[-1]
        page = self.book[min(self.reach, 2)]
        cands = [c for c in self.forgotten if CARD[c].tag != OBL and CARD[c].slot and CARD[c].slot not in page
                 and self.cfg.use_book and self.reach < 3]
        if not cands:
            return None
        mine = self.comm[self.cur] if self.comm else None
        if mine is not None:
            good = [c for c in cands if self.comm_matches(mine, self.reach, c)]
            if good:
                return good[0]
        return cands[-1]

    # ------------------------------------------------------------- V5 chapters: the storybook drives the game
    def page(self):
        """The Book page being written: the chapter (V5 chapters) or the Reach."""
        return self.ch if self.cfg.v5_chapters else self.reach

    def chapter_def(self):
        from .story import BOOKS
        return BOOKS[self.cfg.soul][self.ch]

    def filled(self, nid):
        return nid in self.book[self.ch] or nid in self.pg[self.ch]

    def start_route(self, prev_tag):
        d = self.chapter_def()
        self.walk[self.ch] = [d["starts"].get(prev_tag, d["first"])]
        self.advance_route()

    def advance_route(self):
        """Walk the route as far as it goes: past filled memory slots, mist slots and decided forks."""
        nodes = self.chapter_def()["nodes"]
        w = self.walk[self.ch]
        while True:
            cur = w[-1]
            nd = nodes[cur]
            k = nd["kind"]
            if k in "mg":
                if not self.filled(cur):
                    return
                w.append(nd["next"][0])
            elif k == "x":
                w.append(nd["next"][0])
            elif k == "p":
                chosen = [b for b in nd["next"] if self.filled(b)] or (
                    [self.chc[f"pick_{cur}"]] if f"pick_{cur}" in self.chc else [])
                if not chosen:
                    return
                w.append(chosen[0])
            elif k == "f":
                fate = self.chc.get("fate")
                if fate is None or (self.cfg.v5_fork_eot and not self.chc.get("fork_ok")):
                    return
                if self.paths[self.ch] is None:
                    path = fate
                    gate = next((x for x in reversed(w[:-1]) if nodes[x]["kind"] == "g"), None)
                    gcid = self.book[self.ch].get(gate) if gate else None
                    if self.rewrite:
                        path = self.rng.choice((OBS, ACC, fate))
                    elif gcid is not None and gcid in self.lit_mem and CARD[gcid].tag != fate:
                        if self.rng.random() < self.cfg.v5_gate_take:
                            path = CARD[gcid].tag
                    self.paths[self.ch] = (fate, path)
                w.append(nd["next"][self.paths[self.ch][1]])
            else:
                self.page_turn = True
                return

    def open_slots(self):
        """Empty memory slots on the walked route, plus the branches of an undecided pure fork."""
        nodes = self.chapter_def()["nodes"]
        w = self.walk[self.ch]
        out = [x for x in w if nodes[x]["kind"] in "mg" and not self.filled(x)]
        if nodes[w[-1]]["kind"] == "p":
            out += [b for b in nodes[w[-1]]["next"] if not self.filled(b)]
        return out

    def ch_can_inscribe(self, cid):
        card = CARD[cid]
        if card.tag == OBL or not card.slot or not self.cfg.use_book or self.page_turn:
            return False
        nodes = self.chapter_def()["nodes"]
        if any(nodes[x]["cat"] == card.slot for x in self.open_slots()):
            return True
        return self.cfg.replace_memories and any(
            nodes[x]["cat"] == card.slot and x in self.book[self.ch] and self.book[self.ch][x] not in self.lit_mem
            and not CARD[self.book[self.ch][x]].key for x in self.walk[self.ch])

    def ch_inscribe(self, cid, chooser):
        card = CARD[cid]
        if not self.ch_can_inscribe(cid):
            return False
        nodes = self.chapter_def()["nodes"]
        page = self.book[self.ch]
        slot = next((x for x in self.open_slots() if nodes[x]["cat"] == card.slot), None)
        if slot is None:
            slot = next(x for x in self.walk[self.ch] if nodes[x]["cat"] == card.slot and x in page
                        and page[x] not in self.lit_mem and not CARD[page[x]].key)
            old = page.pop(slot)
            self.order = [o for o in self.order if o != (self.ch, slot)]
            self.stats["replaced"] = self.stats.get("replaced", 0) + 1
            self.forget_card(old)
        page[slot] = cid
        self.order.append((self.ch, slot))
        self.stats["inscribed"] += 1
        self.note(f"  inscribed {card.cid} ({card.slot}) at {slot}: {card.band}")
        self.advance_route()
        self.fate_event("inscribed")
        return True

    def ch_mist_scar(self, tag):
        """A mist card enters the route: the first empty mist slot walked or ahead, else it covers a memory slot."""
        nodes = self.chapter_def()["nodes"]
        w = self.walk[self.ch]
        self.bscars[self.ch].append(tag)
        target = next((x for x in w if nodes[x]["kind"] == "x" and not self.filled(x)), None)
        if target is None:
            cur, seen = w[-1], 0
            while target is None and seen < 12:
                seen += 1
                nd = nodes[cur]
                if nd["kind"] == "x" and not self.filled(cur):
                    target = cur
                elif nd["kind"] == "p":
                    pick = self.chc.get(f"pick_{cur}") or self.rng.choice(nd["next"])
                    self.chc[f"pick_{cur}"] = pick
                    cur = pick
                    continue
                elif nd["kind"] in "fo":
                    break
                cur = nd["next"][0]
        if target is not None:
            self.pg[self.ch][target] = tag
            self.lv_bonus[tag] = 1
            self.advance_route()
            return
        slots = self.open_slots()
        if slots:
            pick = slots[0] if nodes[w[-1]]["kind"] != "p" else self.rng.choice(slots)
            self.pg[self.ch][pick] = tag
            self.lv_bonus[tag] = 1
            self.stats["scar_covers"] = self.stats.get("scar_covers", 0) + 1
            self.advance_route()
            return
        page = self.book[self.ch]
        for rr, slot in reversed(self.order):
            if rr == self.ch and slot in page and page[slot] not in self.lit_mem:
                self.forget_card(page.pop(slot))
                self.order.remove((rr, slot))
                self.pg[self.ch][slot] = tag
                self.stats["scar_covers"] = self.stats.get("scar_covers", 0) + 1
                return
        self.stats["scar_fracture"] = self.stats.get("scar_fracture", 0) + 1
        self.add_fracture()

    def deal_chapter_fates(self, ch):
        from .story import BOOKS
        defs = BOOKS[self.cfg.soul][ch]["fates"]
        out = []
        for kind in ("river", "book"):
            idx = [i for i, f in enumerate(defs) if f["kind"] == kind]
            out.append({"i": self.rng.choice(idx), "fired": False})
        return out

    def cond_met(self, pred, arg):
        c = self.chc
        if pred in ("lingers", "griev_enter", "backlash", "backlash_obs", "cracks", "walls", "graves", "reveals"):
            return c.get(pred, 0) >= arg
        if pred == "fog_near":
            sp = self.soul
            return 1 <= sp <= LAST and (self.fogged[sp * 2] or self.fogged[sp * 2 + 1])
        page = self.book[self.ch]
        if pred == "page_lit":
            return sum(cid in self.lit_mem for cid in page.values()) >= arg
        if pred in ("gate_insc", "gate_lit"):
            nodes = self.chapter_def()["nodes"]
            gates = [x for x in page if nodes[x]["kind"] == "g"]
            return any(pred == "gate_insc" or page[x] in self.lit_mem for x in gates)
        if pred == "forgot":
            return len(self.forgotten) >= arg
        if pred == "own_lit":
            pre = {"king": "K", "garland": "G", "bride": "B", "child": "L"}.get(self.cfg.soul, "?")
            return any(cid in self.lit_mem and CARD[cid].cid[0] == pre for cid in page.values())
        if pred == "prev_lit":
            return sum(cid in self.lit_mem for r in (0, 1) for cid in self.book[r].values()) >= arg
        raise KeyError(pred)

    def check_fate(self):
        if not self.cfg.v5_chapters or self.result is not None or self.chc.get("fate") is not None:
            return
        from .story import BOOKS
        defs = BOOKS[self.cfg.soul][self.ch]["fates"]
        ready = [f for f in self.fates_ch if all(self.cond_met(p, a) for p, a in defs[f["i"]]["conds"])]
        if ready:
            self.fire_chapter_fate(self.rng.choice(ready))

    def fire_chapter_fate(self, f, forced=False):
        from .story import BOOKS
        card = BOOKS[self.cfg.soul][self.ch]["fates"][f["i"]]
        f["fired"] = True
        self.chc["fate"] = card["tag"]
        if not self.sim:
            key = f"fate_ch{self.ch}_{'forced' if forced else card['kind']}"
            self.stats[key] = self.stats.get(key, 0) + 1
            self.stats.setdefault("fate_names", []).append(card["name"])
            self.stats[f"ch_fate_turn{self.ch}"] = self.turn
        self.note(f"  TURNING POINT: {card['name']} ({C.TAG_NAMES[card['tag']]})")
        self.fate_ops(card["ops"])
        if self.cfg.v5_fate_skip and self.result is None:
            nodes = self.chapter_def()["nodes"]
            for _ in range(12):
                w = self.walk[self.ch]
                cur = nodes[w[-1]]
                if cur["kind"] in "fo":
                    break
                slots = self.open_slots()
                if not slots:
                    break
                pick = slots[0] if cur["kind"] != "p" else self.rng.choice(slots)
                self.pg[self.ch][pick] = -1
                self.stats["blank_slots"] = self.stats.get("blank_slots", 0) + 1
                self.advance_route()
        if self.result is None:
            self.advance_route()

    def fate_ops(self, ops):
        ag = self.agent
        for op in ops:
            if self.result is not None:
                return
            k = op[0]
            S = self.soul
            if k == "knots":
                for _ in range(op[2]):
                    self.tie_knot(op[1], "fate")
            elif k == "untie":
                for _ in range(op[1]):
                    col = max(range(3), key=lambda t: self.karma[t] / self.cap(t))
                    self.karma[col] = max(0, self.karma[col] - 1)
            elif k == "untie_all":
                self.karma[op[1]] = 0
            elif k == "forget_unlit":
                page = self.book[self.ch]
                for rr, slot in reversed(self.order):
                    if rr == self.ch and slot in page and page[slot] not in self.lit_mem:
                        self.forget_card(page.pop(slot))
                        self.order.remove((rr, slot))
                        break
                else:
                    self.forget_top(1)
            elif k == "light":
                self.light += op[1]
            elif k == "root" and ag is not None:
                self.do_op(("root", op[1], False), ag)
            elif k == "bloom" and ag is not None:
                self.do_op(("bloom", op[1]), ag)
            elif k == "bloom_here":
                for b in (0, 1):
                    if 1 <= S <= LAST and self.tok[S * 2 + b] == ROOT:
                        self.tok[S * 2 + b] = BLOOM
            elif k == "advance":
                for _ in range(op[1]):
                    if self.passable(self.soul + 1):
                        self.move_soul(1)
            elif k == "advance_dark":
                sp = S + 1
                if (sp < FAR and not self.flooded[sp]) or (sp >= FAR and self.shore_open):
                    self.move_soul(1, light=False)
            elif k == "wither":
                blooms = [x for x in range(NSLOT - 1, 2 * (S + 1) - 1, -1) if self.tok[x] == BLOOM and not self.frost[x]]
                for x in blooms[:op[1]]:
                    self.tok[x] = ROOT
            elif k == "recall_free":
                cid = self.recall_pick()
                if cid is not None:
                    self.forgotten.remove(cid)
                    self.inscribe(cid, None)
            elif k == "forget":
                self.forget_top(op[1])
            elif k == "light_free":
                for _ in range(op[1]):
                    cands = [cid for r in range(3) for cid in self.book[r].values() if cid not in self.lit_mem]
                    if not cands:
                        break
                    good = [c for c in cands if self.comm and any(self.comm_matches(ci, r, c) for ci in self.comm
                                                                   for r in range(3) if c in self.book[r].values())]
                    self.light_one((good or cands)[0], 0)
            elif k == "fog":
                self.fog_advance(op[1])
                if self.shrouded():
                    self.shroud(OBL, None)
            elif k == "key_insc":
                for p in range(self.n):
                    key = next((c for c in self.hands[p] if CARD[c].key), None)
                    if key is not None and self.can_inscribe(key):
                        self.hands[p].remove(key)
                        self.inscribe(key, None)
                        break
            elif k == "mend":
                self.fract = max(0, self.fract - 1)
            elif k == "unscar":
                t = max(range(3), key=lambda x: self.scars[x])
                self.scars[t] = max(0, self.scars[t] - 1)
            elif k == "griev1":
                self.place_griev(min(LAST, max(1, S) + 1), 0)
            elif k == "banish" and ag is not None:
                self.do_op(("banish",), ag)
            elif k == "insc_hand":
                for p in range(self.n):
                    cid = next((c for c in self.hands[p] if self.can_inscribe(c)), None)
                    if cid is not None:
                        self.hands[p].remove(cid)
                        self.inscribe(cid, None)
                        break
            elif k == "bw1":
                self.place_bw(S + 1)
            elif k == "lose_title":
                held = [m for m, h in self.mantles.items() if h >= 0]
                if held:
                    self.mantles[held[0]] = -1
            elif k == "retreat":
                sp = S - 1
                if sp >= 1 and not (self.fogged[sp * 2] and self.fogged[sp * 2 + 1]):
                    self.soul = sp
                    self.stats["fate_retreats"] = self.stats.get("fate_retreats", 0) + 1

    def ch_event(self, ev):
        self.chc[ev] = self.chc.get(ev, 0) + 1
        self.check_fate()

    def gate_force(self):
        """The soul lingers before the Far Shore while the story is unfinished: fate catches up."""
        if self.chc.get("fate") is None:
            self.stats[f"gate_fate_ch{self.ch}"] = self.stats.get(f"gate_fate_ch{self.ch}", 0) + 1
            self.fire_chapter_fate(self.rng.choice(self.fates_ch), forced=True)
        elif not self.page_turn:
            self.stats[f"gate_end_ch{self.ch}"] = self.stats.get(f"gate_end_ch{self.ch}", 0) + 1
            self.page_turn = True

    def chapter_step(self):
        """End of turn: fate conditions that watch the board, then the page turn."""
        if not self.cfg.v5_chapters or self.result is not None:
            return
        self.check_fate()
        if self.chc.get("fate") is not None and not self.chc.get("fork_ok"):
            self.chc["fork_ok"] = True
            self.advance_route()
        if not self.page_turn or self.result is not None:
            return
        self.page_turn = False
        ch = self.ch
        if not self.sim:
            self.stats[f"ch_end_turn{ch}"] = self.turn
        if self.paths[ch] is None:
            fate = self.chc.get("fate")
            self.paths[ch] = (fate, fate)
        lit = [cid for cid in self.book[ch].values() if cid in self.lit_mem]
        if not self.sim:
            self.stats.setdefault("turn_lit", []).append(len(lit))
        mode = self.cfg.v5_turn_knots
        if mode == "clear_heal":
            self.karma = [0, 0, 0]
            for _ in range(len(lit) // 2):
                t = max(range(3), key=lambda x: self.scars[x])
                self.scars[t] = max(0, self.scars[t] - 1)
        elif mode in ("lit_x2", "lit_x3", "lit_exp", "lit_tri"):
            # no healing; untie several knots per lit memory of the page (free choice); the rest carry over
            n = len(lit)
            tri = (0, 3, 6, 10, 15, 21, 28)
            budget = (2 * n if mode == "lit_x2" else 3 * n if mode == "lit_x3"
                      else tri[min(n, 6)] if mode == "lit_tri" else (2 ** n if n else 0))
            for _ in range(budget):
                if not any(self.karma):
                    break
                col = max(range(3), key=lambda x: self.karma[x] / self.cap(x))
                self.karma[col] -= 1
        elif mode in ("scar1_lit_free", "scarN_lit_free", "scarN_clear"):
            # heal scars (one, or by chapter from v5_turn_heals), then untie knots: one per lit memory of the page
            # (free choice, the rest carry over) or all of them ("scarN_clear")
            heals = 1 if mode == "scar1_lit_free" else self.cfg.v5_turn_heals[ch]
            for _ in range(heals):
                t = max(range(3), key=lambda x: self.scars[x])
                self.scars[t] = max(0, self.scars[t] - 1)
            if mode == "scarN_clear":
                self.karma = [0, 0, 0]
            for _ in range(0 if mode == "scarN_clear" else len(lit)):
                if not any(self.karma):
                    break
                col = max(range(3), key=lambda x: self.karma[x] / self.cap(x))
                self.karma[col] -= 1
        else:
            if mode == "lit_free_base2":
                self.karma = [max(0, k - 2) for k in self.karma]
            budget = len(lit)
            for t in sorted(range(3), key=lambda x: (-self.scars[x], self.karma[x])):
                if 0 < self.karma[t] <= budget and self.scars[t] > 0:
                    budget -= self.karma[t]
                    self.karma[t] = 0
                    self.scars[t] -= 1
                    if not self.sim:
                        self.stats["turn_heals"] = self.stats.get("turn_heals", 0) + 1
            while budget > 0 and any(self.karma):
                col = max(range(3), key=lambda x: self.karma[x])
                self.karma[col] -= 1
                budget -= 1
        if self.cfg.v5_traits:
            tags = [CARD[c].tag for c in lit]
            o, a = tags.count(OBS), tags.count(ACC)
            self.trait = OBS if o > a else ACC if a > o else None
            if self.trait is not None and not self.sim:
                key = f"trait_{C.TAG_NAMES[self.trait]}"
                self.stats[key] = self.stats.get(key, 0) + 1
        self.lv_bonus = [0, 0, 0]
        if ch == 2:
            self.shore_open = True
            self.note("  the last page closes: the Far Shore appears")
            return
        prev = self.paths[ch][1]
        self.ch = ch + 1
        self.chc = {}
        self.rewrite = False
        self.fates_ch = self.deal_chapter_fates(self.ch)
        self.note(f"  the page turns: chapter {self.ch + 1}")
        self.start_route(prev)

    def story_ending(self):
        """(ending, defied, hidden) for a won game in chapter mode."""
        from .story import ENDINGS
        paths = [p for p in self.paths if p is not None]
        tags = [p[1] for p in paths]
        top = max(set(tags), key=tags.count) if tags else None
        ending = ENDINGS[self.cfg.soul][top] if top is not None and tags.count(top) >= 2 else ENDINGS[self.cfg.soul]["交織"]
        defied = sum(1 for f, p in paths if f is not None and f != p)
        mist = any(v != -1 for r in range(3) for v in self.pg[r].values())
        key = next((cid for cid, c in CARD.items() if c.key and cid in self.deck + self.discard + self.forgotten
                    + [x for h in self.hands for x in h] + [x for r in range(3) for x in self.book[r].values()]), None)
        where = None
        if key is not None:
            where = next((r for r in range(3) if key in self.book[r].values()), None)
        key_lit = key is not None and key in self.lit_mem
        soul = self.cfg.soul
        hidden = False
        if soul == "child":
            node = next((x for x, c in self.book[2].items() if c == key), None)
            hidden = key_lit and node is not None and not mist and self.stats.get("cracks_taken", 0) == 0
        elif soul in ("garland", "king"):
            nodes = self.chapter_def()["nodes"] if self.ch == 2 else None
            node = next((x for x, c in self.book[2].items() if c == key), None)
            gate = node is not None and nodes is not None and nodes[node]["kind"] == "g"
            hidden = key_lit and gate and not mist and (
                (soul == "garland" and len(tags) == 3 and tags[2] == ACC) or
                (soul == "king" and not self.stats.get("king_titles_lost", 0)))
        elif soul == "bride":
            hidden = key_lit and self.stats["lingers"] == 0
        else:
            from .story import BOOKS
            full = True
            for r in range(3):
                nodes = BOOKS[soul][r]["nodes"]
                for x in self.walk[r]:
                    if nodes[x]["kind"] in "mg" and not (x in self.book[r] and self.book[r][x] in self.lit_mem):
                        full = False
            hidden = full and not mist
        place = "inscribed" if where is not None else "forgotten" if key in self.forgotten else "unspoken"
        return ending, defied, hidden, (place if soul != "open" else None)

    # ------------------------------------------------------------- Mist
    def mist_step(self):
        self.dim = self.blind = False          # "until the next Mist" effects end here
        draws = self.cfg.r3_mist_draws if self.reach == 2 else 1
        if self.thunder:
            self.thunder = False
            draws += 1
        mi = self.mist_idx()
        d = self.mist[mi]
        if not d:
            d.extend(C.MIST[mi])
            self.rng.shuffle(d)
        if self.cfg.mantles_v2 and self.holder("breaker") >= 0 and self.breaker_ready and d:
            # V2 Mist-breaker "see through the mist": look at the top card, may put it at the bottom
            self.breaker_ready = False
            if mist_severity(d[-1]) >= 3:
                d.insert(0, d.pop())
                self.stats["breaker_bottomed"] = self.stats.get("breaker_bottomed", 0) + 1
        for _ in range(draws):
            if self.result is not None:
                return
            self.mist_card()

    def mist_card(self):
        mi = self.mist_idx()
        d = self.mist[mi]
        if not d:
            d.extend(C.MIST[mi])
            self.rng.shuffle(d)
        if self.cfg.v5_depth:
            self.stats[f"mist_depth{mi}"] = self.stats.get(f"mist_depth{mi}", 0) + 1
        name, ops = d.pop()
        self.last_mist = name
        self.note(f"  Mist: {name}")
        S = self.soul
        for op in ops:
            k = op[0]
            if k == "back":
                if self.soul - 1 >= (1 if self.cfg.v5_chapters else BOUNDS[self.reach][0]):
                    self.soul -= 1
                    self.stats["pushed_back"] = self.stats.get("pushed_back", 0) + 1
                else:
                    self.forget_top(1)
            elif k == "peel":
                for r, slot in reversed(self.order):
                    if r == self.page() and slot in self.book[r] and self.book[r][slot] not in self.lit_mem:
                        cid = self.book[r].pop(slot)
                        self.order.remove((r, slot))
                        self.stats["peeled"] = self.stats.get("peeled", 0) + 1
                        self.forget_card(cid)
                        break
            elif k == "flood_page":
                page = self.book[self.page()]
                for slot in [sl for sl, c in page.items() if c not in self.lit_mem]:
                    cid = page.pop(slot)
                    self.order = [o for o in self.order if o != (self.page(), slot)]
                    self.stats["peeled"] = self.stats.get("peeled", 0) + 1
                    self.forget_card(cid)
            elif k == "dim":
                self.dim = True
            elif k == "silence":
                self.stats["silences"] = self.stats.get("silences", 0) + 1   # the AI never talks; no effect to model
            elif k == "uproot":
                for x in range(2 * max(1, S), NSLOT):
                    if self.tok[x] == ROOT:
                        self.tok[x] = NONE
                        break
            elif k == "gaze":
                if self.page() == 2:
                    self.need_plus += 1
                else:
                    self.gaze += 1
            elif k == "blind":
                self.blind = True
            elif k == "cold_night":
                self.cold_until = self.turn + self.n
            elif k == "thunder":
                self.thunder = True
            elif k == "bw_return":
                removed = self.cfg.bw_supply - self.bw_supply - sum(self.flooded)
                if removed > 0:
                    self.bw_supply += 1
            elif k == "bw":
                self.place_bw(S + op[1])
            elif k == "grv" and self.cfg.v5_griev_loom:
                self.place_griev(min(LAST, S + self.cfg.v5_griev_offset), op[2])
            elif k == "grv_near" and self.cfg.v5_griev_loom:
                self.place_griev(min(LAST, S + self.cfg.v5_griev_offset), 0)
            elif k == "grv":
                if S + op[1] <= LAST:
                    self.place_griev(S + op[1], op[2])
                else:
                    self.place_griev(min(LAST, max(1, S)), op[2])
            elif k == "grv_near":
                if S >= 1 and not self.griev[S * 2]:
                    self.place_griev(S, 0)
                elif S >= 1 and not self.griev[S * 2 + 1]:
                    self.place_griev(S, 1)
                else:
                    self.place_griev(min(LAST, S + 1), 0)
            elif k == "wither":
                blooms = [x for x in range(NSLOT - 1, 2 * (S + 1) - 1, -1) if self.tok[x] == BLOOM]
                blooms = [x for x in blooms if not self.frost[x]]
                for x in blooms[:op[1]]:
                    self.tok[x] = ROOT
            elif k == "wither_far":
                for x in range(2 * (S + op[1] + 1), NSLOT):
                    self.flip_down(x)
            elif k == "wither_at":
                sp = S + op[1]
                if sp <= LAST:
                    for b in (0, 1):
                        self.flip_down(sp * 2 + b)
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
        if self.cfg.v5_scars or self.cfg.v5_fog:
            tag = mist_thread((name, ops))
            if tag is not None and self.cfg.v5_scars and self.cfg.v5_mist_knot:
                self.tie_knot(tag, "mist")
            if self.cfg.v5_fog:
                n = int(round(mist_strength((name, ops)) * self.cfg.v5_fog_scale))
                if self.cfg.v5_fog_on_stall and "moved" in self.turn_flags:
                    n = self.cfg.v5_fog_moving if (self.cfg.v5_chapters and self.ch >= self.cfg.v5_fog_moving_from) else 0
                self.fog_advance(n)
                if n > 0 and self.shrouded():
                    self.shroud(tag if tag is not None else OBL, (name, ops))

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
                if 2 <= sp <= LAST - 1 and self.tok[(sp - 1) * 2 + b] == BLOOM and self.tok[(sp + 1) * 2 + b] == BLOOM:
                    self.griev[k] = False
                    self.note(f"  a Shade dissolves in the light at {sp}")

    def draw_up(self, p):
        limit = self.cfg.hand - (1 if self.turn <= self.cold_until else 0)
        while len(self.hands[p]) < limit:
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


def mist_thread(m):
    """V5: the thread printed on a Mist card's back."""
    name, ops = m
    if not ops:
        return ACC
    k = ops[0][0]
    if k == "karma_all":
        return None
    return {"bw": OBL, "forget": OBL, "fog": OBL, "back": OBL, "bw_return": OBL, "thunder": OBL,
            "grv": OBS, "grv_near": OBS, "uproot": OBS, "dark_wind": OBS, "gaze": OBS, "blind": OBS,
            "wither": ACC, "wither_far": ACC, "wither_at": ACC, "sever": ACC, "peel": ACC, "dim": ACC,
            "silence": ACC, "flood_page": ACC, "cold_night": ACC}.get(k, OBL)


def mist_strength(m):
    """V5: the mist strength printed on a Mist card's back (0-2)."""
    name, ops = m
    if not ops:
        return 0
    k = ops[0][0]
    if k in ("fog", "back", "flood_page", "blind", "thunder", "karma_all", "dark_wind", "wither_far"):
        return 2
    if k in ("silence", "dim", "gaze", "cold_night", "bw_return", "sever"):
        return 1
    if len(ops) > 1:
        return 1
    return 1


def light_actions(s):
    """The Light-spending actions open to the current player as their Answer (first) action."""
    cfg = s.cfg
    if cfg.v5_recall:
        if s.light >= cfg.light_action_cost and "recalled" not in s.turn_flags and s.recall_pick() is not None:
            return ["recall_ins"]
        return []
    if not cfg.light_action or s.light < cfg.light_action_cost or s.stats.get("light_actions", 0) >= cfg.light_action_limit:
        return []
    out = []
    if s.forgotten:
        out.append("recall")
    if cfg.light_action == "kindle":
        if s.fract > 0:
            out.append("mend")
        if s.urgent_water() is not None:
            out.append("drainl")
    return out
