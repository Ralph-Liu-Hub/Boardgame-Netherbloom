"""Writes the Screentop setup guide (print/out/screentop/<lang>/SCREENTOP-SETUP.md) with copy-paste bulk-update
functions built from the manifest, and zips the assets beside it. Run after manifest.mjs and sheets.py."""
import json, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LANG = sys.argv[1] if len(sys.argv) > 1 else "en"
OUT = ROOT / "print/out/screentop" / LANG
M = json.loads((ROOT / "print/out/screentop/manifest.json").read_text())
CELLS = json.loads((OUT / "token-cells.json").read_text())
U = 2  # Screentop units per millimetre

def js_list(items):
    return "[\n" + "".join(f"  {json.dumps(x, ensure_ascii=False)},\n" for x in items) + "]"

def fn(body):
    return f"```js\n{body}\n```"

def names_fn(names, front_asset, back_asset, back_index, extra=""):
    return fn(f"""const NAMES = {js_list(names)};

export default function(variant, index) {{
  return {{
    name: NAMES[index - 1],
    frontAsset: "{front_asset}",
    frontAssetIndex: index,
    backAsset: "{back_asset}",
    backAssetIndex: {back_index},{extra}
  }};
}}""")

cell = lambda label: CELLS.index(label) + 1
big = [("Oar", 1), ("Push Through", 4), ("Hold Fast", 1), ("Shield", 1), ("Resignation", 1), ("Soul / Ghost", 1)]
small = [("Root / Bloom", 24), ("Shade", 8), ("Black Water", 6), ("Fracture", 3), ("Light", 12), ("Knot", 15), ("Echo", 1)]
def token_rows(spec):
    rows = []
    for name, n in spec:
        f = cell(f"{name} (front)")
        b = cell(f"{name} (back)") if f"{name} (back)" in CELLS else f
        rows += [[f"{name} {i + 1}" if n > 1 else name, f, b] for i in range(n)]
    return rows
def token_fn(rows):
    return fn(f"""// [name, front image, back image] in the Tokens asset
const TOKENS = {js_list(rows)};

export default function(variant, index) {{
  const [name, front, back] = TOKENS[index - 1];
  return {{ name, frontAsset: "Tokens", frontAssetIndex: front, backAsset: "Tokens", backAssetIndex: back }};
}}""")

bank_backs = [21 + c["reach"] for c in M["bank"]]
mist_reach = [c["reach"] for c in M["mist"]]
bank_reach = [c["reach"] for c in M["bank"]]
BOOKS = ["Child of the Last Flame", "The Garland Girl", "The King on the Barge", "The Bride Who Stayed Below", "The Open Crossing"]
book_names = [f"{b} · page {p}" for b in BOOKS for p in range(1, 9)]
CARD_W, CARD_H = 63 * U, 88 * U

md = f"""# Netherbloom on Screentop: setup guide

This guide builds the whole game in the Screentop editor (https://screentop.gg/@ralphlauxie/Netherbloom/edit/main),
following Screentop's own concepts (Assets → Components → Variants → Objects). Everything is sized at **{U} units per
millimetre**, so cards, boards and tokens keep their real proportions (a card is {CARD_W} × {CARD_H}).

Where a step says **Bulk update**, select all the variants (or objects) named, click **Update** in the top menu,
replace the function with the one given here, check the JSON preview and click **Save**.

## 1. Assets (upload the images)

Upload each file from the `assets` folder in **Assets → New asset**, with exactly this name, Rows and Columns:

| Asset name | File | Rows | Columns | What is in it |
|---|---|---|---|---|
| Memory Cards | memory-cards.jpg | 8 | 10 | 72 Memory cards (1–72), card back (73) |
| Mist Cards | mist-cards.jpg | 7 | 7 | 42 Mist cards (1–42), back (43) |
| Ghost Cards | ghost-cards.jpg | 3 | 5 | 12 Ghost cards (1–12), back (13) |
| Bank Cards | bank-cards.jpg | 4 | 6 | 20 bank cards (1–20), fog backs for Reach I, II, III (21–23) |
| Soul and Mantle Cards | soul-mantle-cards.jpg | 3 | 4 | 5 Souls (1–5), Soul back (6), 4 Mantles (7–10), Mantle back (11) |
| Tokens | tokens.png | 4 | 4 | {len(CELLS)} token faces (transparent corners) |
| River Panel 1 | river-panel-1.jpg | 1 | 1 | Reach I |
| River Panel 2 | river-panel-2.jpg | 1 | 1 | Reach II |
| River Panel 3 | river-panel-3.jpg | 1 | 1 | Reach III |
| Loom | loom-of-the-fates.jpg | 1 | 1 | Loom of the Fates |
| Ledger | the-ledger.jpg | 1 | 1 | The Ledger |
| Book Child | book-child.jpg | 2 | 4 | 8 pages |
| Book Garland | book-garland.jpg | 2 | 4 | 8 pages |
| Book King | book-king.jpg | 2 | 4 | 8 pages |
| Book Bride | book-bride.jpg | 2 | 4 | 8 pages |
| Book Open | book-open.jpg | 2 | 4 | 8 pages |

## 2. Card components

For each card component: **Components → New → Blank Tile**, Shape **Rectangle**, Width **{CARD_W}**, Height **{CARD_H}**,
Corner **8**. Then in its **Variants** section, clone Variant 1 until there are as many variants as listed, select
them all and run the bulk update.

### 2a. Memory Card — 72 variants
One component for all Memory cards, so the deck can be shuffled together (Screentop only shuffles objects of one
component). Names start with the pack: **Core**, **Echo** (the Open Crossing) or the Soul's name.

{names_fn([c["name"] for c in M["memory"]], "Memory Cards", "Memory Cards", 73)}

### 2b. Mist Card — 42 variants
One component, so harsh Mist cards can be shuffled into a Reach's deck.

{names_fn([c["name"] for c in M["mist"]], "Mist Cards", "Mist Cards", 43)}

### 2c. Ghost Card — 12 variants (solo)

{names_fn([c["name"] for c in M["ghost"]], "Ghost Cards", "Ghost Cards", 13)}

### 2d. Bank Card — 20 variants
Each card's back is its Reach's fog side.

{fn(f'''const NAMES = {js_list([c["name"] for c in M["bank"]])};
const BACKS = {json.dumps(bank_backs)};

export default function(variant, index) {{
  return {{
    name: NAMES[index - 1],
    frontAsset: "Bank Cards",
    frontAssetIndex: index,
    backAsset: "Bank Cards",
    backAssetIndex: BACKS[index - 1],
  }};
}}''')}

### 2e. Soul Card — 5 variants

{names_fn([c["name"] for c in M["souls"]], "Soul and Mantle Cards", "Soul and Mantle Cards", 6)}

### 2f. Mantle Card — 4 variants

{fn(f'''const NAMES = {js_list([c["name"] for c in M["mantles"]])};

export default function(variant, index) {{
  return {{
    name: NAMES[index - 1],
    frontAsset: "Soul and Mantle Cards",
    frontAssetIndex: index + 6,
    backAsset: "Soul and Mantle Cards",
    backAssetIndex: 11,
  }};
}}''')}

## 3. Tokens

Two **Blank Tile** components with Shape **Circle**: one variant per physical token, so **Select All → Create**
in the Chest puts out the whole supply. Two-sided tokens (Root/Bloom, Push Through, Soul/Ghost) flip with **F**.

### 3a. Large Token — Diameter {25 * U}, {sum(n for _, n in big)} variants

{token_fn(token_rows(big))}

### 3b. Small Token — Diameter {18 * U}, {sum(n for _, n in small)} variants

{token_fn(token_rows(small))}

## 4. Boards

You make **three components** here: **River Panel** (with 3 variants, one per Reach), **Loom** and **Ledger**.
A board is just a big picture card that never needs flipping, so its front and back use the same image.
Do them one at a time.

### 4a. River Panel (3 variants)

1. Go to **Components** and click **New → Blank Tile**.
2. Set **Name**: `River Panel`.
3. Under **Shape** set **Kind**: Rectangle, **Width**: `{420 * U}`, **Height**: `{297 * U}`, **Corner**: `8`.
4. Open this component's **Variants** section. There is already one variant, **Variant 1**. Click it and set:
   - **Front Asset**: `River Panel 1`, **Front Asset Index**: `1`
   - **Back Asset**: `River Panel 1`, **Back Asset Index**: `1`
   - (optional) **Name**: `Reach I`
5. Open Variant 1's item menu (the ⋯ beside it) and choose **Clone...** twice, so you have **3 variants**.
6. Click **Variant 2** and change both assets to `River Panel 2` (indexes stay `1`); optional name `Reach II`.
7. Click **Variant 3** and change both assets to `River Panel 3` (indexes stay `1`); optional name `Reach III`.

### 4b. Loom (1 variant)

1. **Components → New → Blank Tile**, **Name**: `Loom`.
2. **Shape**: Rectangle, **Width**: `{297 * U}`, **Height**: `{210 * U}`, **Corner**: `8`.
3. In **Variants**, click **Variant 1** and set Front Asset `Loom`, index `1`; Back Asset `Loom`, index `1`.

### 4c. Ledger (1 variant)

Same as the Loom, with **Name**: `Ledger` and both assets set to `Ledger`, index `1`.

### Check

Open the **Chest** in the main view, pick **River Panel**, **Select All**, **Create**: three river panels appear.
Do the same for Loom and Ledger. You will arrange and lock them in step 7, so it is fine if they overlap now.

## 5. Books of Remembrance — Book Page, 40 variants

**Blank Tile**, Rectangle, Width **{210 * U}**, Height **{297 * U}**, Corner **4**. Each Soul's Book is 8 pages; at the
table, put out the chosen Soul's pages 4–6 (the three Reach pages) and slide inscribed cards onto their wells.

{fn(f'''const BOOKS = ["Book Child", "Book Garland", "Book King", "Book Bride", "Book Open"];
const NAMES = {js_list(book_names)};

export default function(variant, index) {{
  const asset = BOOKS[Math.floor((index - 1) / 8)];
  const page = ((index - 1) % 8) + 1;
  return {{ name: NAMES[index - 1], frontAsset: asset, frontAssetIndex: page, backAsset: asset, backAssetIndex: page }};
}}''')}

## 6. Hands (hidden from the other players)

**Components → New → Blank Container**, name **Hand**, Rectangle, Width **640**, Height **220**, Radius **16**.
In its **Dropzones**, add an **Anchor** dropzone with Components: **Memory Card**, and give it a **Line** anchor.
In its **Objects**, create 4 objects on Surface 1 (Hand #1 … #4) and set for each: **Seats: Seat N** (its own seat)
and **View Policy: Allow Seats**. Cards in a Hand are then hidden from everyone else.

## 7. Lay out the table (objects)

Open the **Chest** (top right of the main view) and create, for each component, **Select All → Create**. Then select
all objects of a component (Control + A) and run the matching **bulk update on objects** to put them in place.
Coordinates are in units from the centre of Surface 1; adjust freely.

Boards (River Panel, Loom, Ledger), in the order they were created:

{fn(f'''// River Panel #1..3: side by side across the middle of the table
export default function(object, index) {{
  return {{ x: (index - 2) * {420 * U}, y: 0 }};
}}''')}

{fn(f'''// Loom (below Reach I/II) — and use x: {297 * U // 2 + 30} for the Ledger
export default function(object, index) {{
  return {{ x: -{297 * U // 2 + 30}, y: {297 * U // 2 + 210 * U // 2 + 40} }};
}}''')}

Mist cards: three Reach piles above the river, harsh cards in a fourth pile to the right.

{fn(f'''const REACH = {json.dumps(mist_reach)};

export default function(object, index) {{
  const r = REACH[index - 1];
  return {{ x: r < 3 ? (r - 1) * {420 * U} : {int(1.5 * 420 * U + 120)}, y: -{297 * U // 2 + CARD_H // 2 + 40} }};
}}''')}

Bank cards: one fog pile per Reach, just left of each Mist pile.

{fn(f'''const REACH = {json.dumps(bank_reach)};

export default function(object, index) {{
  return {{ x: (REACH[index - 1] - 1) * {420 * U} - {CARD_W + 30}, y: -{297 * U // 2 + CARD_H // 2 + 40} }};
}}''')}

Memory deck, Soul and Mantle cards, Ghost deck: to the left of the river.

{fn(f'''// Memory Card: one pile (shuffle it with Z after removing the packs not in play)
export default function(object, index) {{
  return {{ x: -{int(1.5 * 420 * U + CARD_W)}, y: -{CARD_H // 2 + 20} }};
}}''')}

{fn(f'''// Mantle Card: a row under the Memory deck. (Soul Card: same with y: {CARD_H + 240}; Ghost Card: x: -{int(1.5 * 420 * U + CARD_W * 2 + 40)}, y: 0)
export default function(object, index) {{
  return {{ x: -{int(1.5 * 420 * U + CARD_W)} + (index - 1) * {CARD_W + 16} - {int(1.5 * (CARD_W + 16))}, y: {CARD_H + 40} }};
}}''')}

Tokens: a supply to the right of the river, one pile per kind.

{fn(f'''// Small Token: Root/Bloom, Shade, Black Water, Fracture, Light, Knot, Echo in piles
const KINDS = ["Root / Bloom", "Shade", "Black Water", "Fracture", "Light", "Knot", "Echo"];

export default function(object, index) {{
  const counts = [24, 8, 6, 3, 12, 15, 1];
  let k = 0, n = index;
  while (n > counts[k]) {{ n -= counts[k]; k++; }}
  return {{ x: {int(1.5 * 420 * U + 120)} + (k % 2) * 60, y: -120 + Math.floor(k / 2) * 70 }};
}}''')}

Hands: along the bottom edge.

{fn(f'''export default function(object, index) {{
  return {{ x: (index - 2.5) * 680, y: {297 * U // 2 + 210 * U + 260} }};
}}''')}

Books: keep them on **Surface 2** (drag with 2 pressed) and bring the chosen Soul's pages over at setup.

## 8. Setting up a game at the table

Follow section 2 of the Rulebook. On Screentop:
- **Memory deck**: delete or set aside the packs not in play (keep Core + the chosen Soul's 8, or Core + Echo for the
  Open Crossing), multiselect the rest and press **Z** to shuffle, **F** to turn them face down.
- **Mist decks**: per Reach, its 12 cards plus the Lantern's number of harsh cards chosen at random, then **Z**.
- **Bank cards**: shuffle each Reach's pile (fog side up) and place them on the banks of its spaces.
- **Black Water**: put only the Lantern's number in the Ledger's Black Water well; put the rest away on Surface 2.
- Deal 3 cards into each Hand (4 in solo).

## 9. Test

Return to the game's profile page and click **Play**: it opens a room with a code you can share.
"""
(OUT / "SCREENTOP-SETUP.md").write_text(md)
with zipfile.ZipFile(OUT / f"netherbloom-screentop-{LANG}.zip", "w", zipfile.ZIP_STORED) as z:
    for f in sorted((OUT / "assets").iterdir()):
        z.write(f, f"assets/{f.name}")
    z.write(OUT / "SCREENTOP-SETUP.md", "SCREENTOP-SETUP.md")
print("ok", len(md))
