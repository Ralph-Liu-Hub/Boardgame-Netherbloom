"""Card, tile and Mist data for Netherbloom (GDD v0.4, Card Compendium v0.2, Soul Roster v3).

Effects are lists of ops. Each op is a tuple whose first item names it:
    ("root", n, stony_ok)   place n Roots
    ("bloom", n)            flip n Roots to Blooms
    ("hold",)               the soul does not Linger this turn
    ("shield",)             prevent the next Fracture before your next turn
    ("mend", n)             remove n Fractures
    ("release", n)          remove n knots from one thread
    ("guide",)              the soul moves 1 now if the next space is Lit and not Flooded
    ("vigil",)              look at the top 3 Mist cards, put them back in any order
    ("banish_or_drain",)    remove 1 Grievance or 1 Black Water
    ("banish", n) ("drain", n)
    ("light", n)            add n Light
    ("reveal_reach",)       reveal all fog in the current Reach; Graves become Fertile
    ("unmake",)             empty one thread with no Backlash
    ("wash",)               remove all Grievances beside the soul
    ("lowtide",)            drain all Black Water in the current Reach
    ("extra_karma", tag)    tie one extra knot (Overreach)
"""

OBS, ACC, OBL = 0, 1, 2
TAG_NAMES = ("Obsession", "Acceptance", "Oblivion")
SLOTS = ("Place", "Person", "Deed", "Feeling")


class Card:
    __slots__ = ("cid", "name", "tag", "effect", "res", "res_replaces", "slot", "band", "key")

    def __init__(self, cid, name, tag, effect, res, slot=None, band="", key=False, res_replaces=False):
        self.cid, self.name, self.tag = cid, name, tag
        self.effect, self.res, self.res_replaces = effect, res, res_replaces
        self.slot, self.band, self.key = slot, band, key

    def __repr__(self):
        return f"{self.cid}"


# Shared effect shapes
ROOT2 = ([("root", 2, False)], [("root", 1, False)])
STUBBORN = ([("root", 1, True)], [("root", 1, True)])
HOLD = ([("hold",)], [("root", 1, False)])
OVERREACH = ([("root", 3, False), ("extra_karma", OBS)], [("bloom", 1)])
VIGIL = ([("vigil",)], [("root", 1, False)])
SHIELD = ([("shield",)], [("root", 1, False)])
OPENHAND = ([("bloom", 1), ("root", 1, False)], [("bloom", 1)])
FULLBLOOM = ([("bloom", 2)], [("light", 1)])
MEND = ([("mend", 1)], [("bloom", 1)])
LETGO = ([("release", 2)], [("release", 1)])
GUIDE = ([("guide",)], [("bloom", 1)])
REKINDLE = ([("bloom", 1), ("light", 1)], [("bloom", 1)])
UNREMEMBER = ([("banish_or_drain",)], [("banish", 1), ("drain", 1)])
WASH = ([("wash",)], [("light", 1)])
LOWTIDE = ([("lowtide",)], [("banish", 1)])
LETHE = ([("light", 3)], [("bloom", 1)])
UNMAKE = ([("unmake",)], [("light", 1)])


def _c(cid, name, tag, shape, slot=None, band="", key=False):
    eff, res = shape
    return Card(cid, name, tag, eff, res, slot, band, key, res_replaces=(shape is UNREMEMBER))


CORE = [
    _c("C01", "Deep Roots", OBS, ROOT2, "Place", "the gate I swore never to leave"),
    _c("C02", "Deep Roots", OBS, ROOT2, "Place", "the hill where I buried my anger"),
    _c("C03", "Deep Roots", OBS, ROOT2, "Person", "the friend who sold my name"),
    _c("C04", "Stubborn Root", OBS, STUBBORN, "Place", "a road I walked a thousand times"),
    _c("C05", "Stubborn Root", OBS, STUBBORN, "Deed", "kept a promise long after it stopped mattering"),
    _c("C06", "Hold Fast", OBS, HOLD, "Feeling", "a debt I swore to repay"),
    _c("C07", "Hold Fast", OBS, HOLD, "Deed", "refused to bow when bowing would have saved me"),
    _c("C08", "Overreach", OBS, OVERREACH, "Place", "the house that should have been mine"),
    _c("C09", "Overreach", OBS, OVERREACH, "Feeling", "a fist I never unclenched"),
    _c("C10", "Vigil", OBS, VIGIL, "Person", "a rival I could never forgive"),
    _c("C11", "Hold the Line", OBS, SHIELD, "Person", "the teacher I needed to impress"),
    _c("C12", "Hold the Line", OBS, SHIELD, "Deed", "counted every coin I was owed"),
    _c("C13", "Old Oath", OBS, ([("light", 2)], [("light", 1)]), "Feeling", "a name I kept repeating in the dark"),
    _c("C14", "Open Hand", ACC, OPENHAND, "Place", "a kitchen that smelled of bread and woodsmoke"),
    _c("C15", "Open Hand", ACC, OPENHAND, "Person", "my mother, humming at the loom"),
    _c("C16", "Open Hand", ACC, OPENHAND, "Feeling", "the warmth of an evening with nothing left to do"),
    _c("C17", "Full Bloom", ACC, FULLBLOOM, "Place", "the river where we washed our feet in summer"),
    _c("C18", "Full Bloom", ACC, FULLBLOOM, "Person", "a stranger who shared his rain hat"),
    _c("C19", "Mend", ACC, MEND, "Deed", "forgave my brother at the ferry landing"),
    _c("C20", "Mend", ACC, MEND, "Feeling", "a quiet I finally stopped fearing"),
    _c("C21", "Let Go", ACC, LETGO, "Deed", "let the apple blossoms fall without counting them"),
    _c("C22", "Guide", ACC, GUIDE, "Person", "the child who called me by the wrong name"),
    _c("C23", "Guide", ACC, GUIDE, "Deed", "planted a tree I knew I would never sit beneath"),
    _c("C24", "Rekindle", ACC, REKINDLE, "Feeling", "the first warm evening of spring"),
    _c("C25", "Unremember", OBL, UNREMEMBER),
    _c("C26", "Unremember", OBL, UNREMEMBER),
    _c("C27", "Unremember", OBL, UNREMEMBER),
    _c("C28", "Blank Fog", OBL, ([("reveal_reach",)], [("light", 2)])),
    _c("C29", "Unmake", OBL, UNMAKE),
    _c("C30", "Wash Away", OBL, WASH),
    _c("C31", "Low Tide", OBL, LOWTIDE),
    _c("C32", "Lethe's Gift", OBL, LETHE),
]

ECHO = [
    _c("E01", "Echo", OBS, ROOT2, "Place", "a lantern left burning in a window"),
    _c("E02", "Echo", OBS, HOLD, "Feeling", "an anger I mistook for strength"),
    _c("E03", "Echo", OBS, VIGIL, "Person", "the ferryman who would not take my coin"),
    _c("E04", "Echo", ACC, OPENHAND, "Deed", "carried water for someone I never thanked"),
    _c("E05", "Echo", ACC, FULLBLOOM, "Person", "an old woman selling chestnuts in the snow"),
    _c("E06", "Echo", ACC, MEND, "Place", "a bridge I crossed every morning"),
    _c("E07", "Echo", OBL, UNREMEMBER),
    _c("E08", "Echo", OBL, LETHE),
]

SOULS = {
    "king": [
        _c("K01", "King", OBS, ROOT2, "Place", "the field where my last army fell"),
        _c("K02", "King", OBS, HOLD, "Deed", "held the line long after the line was lost"),
        _c("K03", "King", OBS, OVERREACH, "Feeling", "a crown that grew heavier every year"),
        _c("K04", "King", ACC, OPENHAND, "Person", "the hand that rose from the lake to give me a sword", key=True),
        _c("K05", "King", ACC, FULLBLOOM, "Person", "the friend who loved my queen more honestly than I did"),
        _c("K06", "King", ACC, GUIDE, "Deed", "forgave them both, too late to tell them"),
        _c("K07", "King", OBL, UNREMEMBER),
        _c("K08", "King", OBL, WASH),
    ],
    "garland": [
        _c("G-01", "Garland", OBS, ROOT2, "Person", "the man who promised and then pretended not to know me"),
        _c("G-02", "Garland", OBS, VIGIL, "Feeling", "a song I could not stop singing"),
        _c("G-03", "Garland", OBS, STUBBORN, "Deed", "wove a flower for every person I ever loved"),
        _c("G-04", "Garland", ACC, REKINDLE, "Feeling", "the one flower I kept for myself", key=True),
        _c("G-05", "Garland", ACC, FULLBLOOM, "Place", "the willow that leaned over the brook"),
        _c("G-06", "Garland", ACC, OPENHAND, "Person", "my father, who taught me the names of herbs"),
        _c("G-07", "Garland", OBL, LOWTIDE),
        _c("G-08", "Garland", OBL, UNREMEMBER),
    ],
    "bride": [
        _c("B01", "Bride", OBS, HOLD, "Deed", "followed his footsteps up through the dark without a word"),
        _c("B02", "Bride", OBS, STUBBORN, "Place", "the narrow stair between the dead and the living"),
        _c("B03", "Bride", OBS, ROOT2, "Feeling", "the anger of being almost saved"),
        _c("B04", "Bride", ACC, GUIDE, "Person", "his face, the instant he turned to look at me", key=True),
        _c("B05", "Bride", ACC, OPENHAND, "Place", "the meadow where we were married at noon"),
        _c("B06", "Bride", ACC, FULLBLOOM, "Feeling", "the warmth of his hand, just before it let go"),
        _c("B07", "Bride", OBL, UNREMEMBER),
        _c("B08", "Bride", OBL, UNMAKE),
    ],
    "child": [
        _c("L01", "Child", OBS, ROOT2, "Place", "a doorway on the coldest night of the year"),
        _c("L02", "Child", OBS, HOLD, "Feeling", "a hunger that would not let me sleep"),
        _c("L03", "Child", OBS, STUBBORN, "Deed", "struck one more little light, then one more"),
        _c("L04", "Child", ACC, MEND, "Person", "the one who used to hold me before she was gone", key=True),
        _c("L05", "Child", ACC, FULLBLOOM, "Place", "a warm kitchen glimpsed through a frosted window"),
        _c("L06", "Child", ACC, OPENHAND, "Feeling", "the smell of roast apples from a house that was not mine"),
        _c("L07", "Child", OBL, UNREMEMBER),
        _c("L08", "Child", OBL, LETHE),
    ],
}

# ---------------------------------------------------------------- Mist
# Placement ops are relative to S, the soul's space.
#   ("bw", k)                 Black Water on S+k
#   ("grv", k, bank)          Grievance on S+k, bank 0 (left) / 1 (right)
#   ("grv_near",)             Grievance on the nearest empty bank slot beside the soul
#   ("wither", n)             flip the n furthest Blooms ahead to Roots
#   ("wither_far", d)         every Bloom more than d spaces ahead becomes a Root
#   ("wither_at", k)          flip Blooms on S+k to Roots
#   ("fog", n)                n revealed empty tiles ahead become fog again
#   ("forget", n)
#   ("sever",)                the Echo leaves the Loom
#   ("karma_all",)            +1 knot on each thread
#   ("dark_wind",)            -2 Light, or +1 Fracture if you cannot pay
MIST = {
    0: [("Rising Water", [("bw", 2)]), ("Rising Water", [("bw", 3)]),
        ("Grievance", [("grv", 1, 0)]), ("Grievance", [("grv", 2, 1)]),
        ("Grievance Drawn Near", [("grv_near",)]), ("Withering", [("wither", 2)]),
        ("Fog Returns", [("fog", 1)]), ("Cold Wind", [("forget", 1)]),
        ("The Mist Parts", []), ("The Mist Parts", [])],
    1: [("Rising Water", [("bw", 1)]), ("Rising Water", [("bw", 2)]),
        ("Grievance", [("grv", 1, 0)]), ("Grievance", [("grv", 2, 1)]),
        ("Grievance Drawn Near", [("grv_near",)]), ("Withering", [("wither", 2)]),
        ("Withering", [("wither", 2)]), ("Fog Returns", [("fog", 2)]),
        ("Cold Wind", [("forget", 1)]), ("Echo Severed", [("sever",)])],
    2: [("Rising Water", [("bw", 1)]), ("Rising Water", [("bw", 2)]),
        ("Undertow", [("bw", 2), ("wither_at", 1)]), ("Grievance Drawn Near", [("grv_near",)]),
        ("Twin Grievances", [("grv", 2, 0), ("grv", 2, 1)]), ("Withering", [("wither", 2)]),
        ("Great Withering", [("wither", 3)]), ("Cold Wind", [("forget", 1)]),
        ("Bitter Wind", [("forget", 2)]), ("Echo Severed", [("sever",)])],
}
HARSH = [("Flood Surge", [("bw", 1), ("bw", 3)]), ("Grievance Host", [("grv", 1, 0), ("grv", 1, 1)]),
         ("Wither Storm", [("wither_far", 2)]), ("Deep Cold", [("forget", 2)]),
         ("Karma Surge", [("karma_all",)]), ("Dark Wind", [("dark_wind",)])]

# ---------------------------------------------------------------- Tiles
FERTILE, STONY, MEMORY, GRAVE = 0, 1, 2, 3
TILE_NAMES = ("Fertile", "Stony", "Memory Site", "Grave")
TILES = {  # per Reach: spaces covered and tile mix (spaces 2-4, 5-8, 9-11)
    0: ([2, 3, 4], [FERTILE] * 3 + [STONY] + [MEMORY] * 2),
    1: ([5, 6, 7, 8], [FERTILE] * 3 + [STONY] * 2 + [MEMORY] * 2 + [GRAVE]),
    2: ([9, 10, 11], [FERTILE] * 2 + [STONY] + [MEMORY] * 2 + [GRAVE]),
}

# ---------------------------------------------------------------- Lantern difficulty
LANTERN = {  # (black water supply, forgotten limit, harsh cards per reach); Standard is the intended game
    1: (6, 14, 0), 2: (5, 10, 2), 3: (4, 9, 3), 4: (3, 8, 3),   # retuned 2026-10 for the Offer and the Book pair rewards
}
LANTERN_NAMES = {1: "Gentle", 2: "Standard", 3: "Hard", 4: "Heroic"}
STANDARD_LANTERN = 2

# ---------------------------------------------------------------- Ghost deck (solo)
GHOST = ([(OBS, "root_far")] * 3 + [(OBS, "root_near")] * 2 + [(ACC, "bloom_near")] * 2
         + [(ACC, "bloom_far")] * 2 + [(OBL, "banish_forget")] * 2 + [(OBL, "none")])

MANTLES = {"weaver": OBS, "warden": OBS, "bringer": ACC, "breaker": OBL}

BOOK_FRAMES = [
    "I was born near {Place}. I loved {Person}. I once {Deed}, and ever since I have carried {Feeling}.",
    "At {Place}, before {Person}, I {Deed}. The price was {Feeling}.",
    "I go now, leaving {Place}, forgiving {Person}, unable to undo the day I {Deed}, holding only {Feeling}.",
]
FALLBACK = "…but this, the river has taken"
