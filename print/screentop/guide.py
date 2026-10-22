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

## 6. Hands (cards only their owner can see)

A Hand is a tray that hides its cards from everyone except the seat it belongs to. You make **one Hand component**,
then **4 Hand objects** (one per seat).

### 6a. Make the Hand component

1. Go to **Components** and click **New → Blank Container** (a Container, not a Tile).
2. Set **Name**: `Hand`.
3. Under **Shape** set **Kind**: Rectangle, **Width**: `640`, **Height**: `220`, **Radius**: `16`.

### 6b. Tell it which cards it holds

1. Open this component's **Dropzones** section and click **New → Anchor**.
2. In the new dropzone, set **Components**: `Memory Card` (so only Memory cards snap into a hand).
3. Open that dropzone's **Anchors** section and click **New → Line**. Leave its settings as they are: the cards
   will spread out evenly along the line.

### 6c. Make the 4 hands and give each one an owner

1. Open the Hand component's **Objects** section and click **New** to create an object on **Surface 1**.
   It is called **Hand #1**.
2. Click **Hand #1** and set:
   - **Seats**: `Seat 1`
   - **View Policy**: `Allow Seats` (only the seats listed above can see inside)
3. Repeat for **Hand #2** (Seats: `Seat 2`), **Hand #3** (`Seat 3`) and **Hand #4** (`Seat 4`).

### Check

In the main view, click **Join** and take **Seat 1**. Drag a Memory card into Hand #1: you can see it. Leave the
seat (or join as Seat 2): the card in Hand #1 is now hidden.

## 7. Lay out the table

Now put everything out once, in its starting place. Screentop saves where objects are, so every new game starts
from this layout.

1. In the main view, open the **Chest** (top right). For each component in turn (Memory Card, Mist Card,
   Ghost Card, Bank Card, Soul Card, Mantle Card, Large Token, Small Token, River Panel, Loom, Ledger), pick it,
   click **Select All**, then **Create**. (The Hands already exist from step 6. Leave the Book Pages for step 7c.)
2. Drag things into place. A simple layout that works:

```
                 [Mist I + Bank I]   [Mist II + Bank II]   [Mist III + Bank III]   [Harsh Mist]
 [Memory deck]   [ River Panel I  ]  [ River Panel II   ]  [ River Panel III   ]   [Token supply]
 [Soul cards]
 [Mantle cards]                      [  Loom  ]  [ Ledger ]
 [Ghost deck]
                 [ Hand 1 ]  [ Hand 2 ]  [ Hand 3 ]  [ Hand 4 ]
```

   - **River panels**: side by side, I on the left, III on the right, so the river runs 1 to 12.
   - **Mist cards**: sort them into piles by the start of their name (`Reach I`, `Reach II`, `Reach III`,
     `Harsh`). Hover a card, or hold **Space** to inspect it, to see its name.
   - **Bank cards**: sort into three piles by Reach the same way (fog side up: select and press **F** to flip).
   - **Tokens**: drag them into small piles by kind. Holding **right-click** while dragging stacks objects neatly.
3. Select each board (River Panel, Loom, Ledger) and press **L** to lock it, so cards slide over it without
   moving it.
4. Turn the card piles face down: select a pile (Control + A selects all of that component) and press **F**.

### 7c. The Books of Remembrance (Surface 2)

1. Press **2** to switch to Surface 2.
2. Open the **Chest**, pick **Book Page**, click **Select All**, then **Create**: the five Books (8 pages each)
   go on Surface 2, out of the way.
3. Press **1** to return to the table. When you play, bring over the chosen Soul's pages 4, 5 and 6
   (the three Reach pages): while dragging a page, press **1** to carry it to the table.

### Optional: place things with a script instead of dragging

If you prefer, select all objects of one component and use **Update** with a script like the ones below. They put
the objects at x, y (units from the middle of the table). They are optional: dragging by hand gives the same result.

{fn(f'''// River Panel: three panels side by side across the middle of the table
export default function(object, index) {{
  return {{ x: (index - 2) * {420 * U}, y: 0 }};
}}''')}

{fn(f'''// Mist Card: three Reach piles above the river, harsh cards in a fourth pile to the right
const REACH = {json.dumps(mist_reach)};

export default function(object, index) {{
  const r = REACH[index - 1];
  return {{ x: r < 3 ? (r - 1) * {420 * U} : {int(1.5 * 420 * U + 120)}, y: -{297 * U // 2 + CARD_H // 2 + 40} }};
}}''')}

## 8. Before each game

Follow section 2 of the Rulebook. On Screentop:

1. **Memory deck**: keep the 32 Core cards plus the chosen Soul's 8 (or Core + Echo for the Open Crossing). Move
   the other packs away (to Surface 2: drag and press **2**). Select the deck, press **Z** to shuffle and **F** to
   turn it face down.
2. **Mist decks**: each Reach pile gets the Lantern's number of Harsh cards, picked at random; then shuffle each
   pile with **Z**.
3. **Bank cards**: shuffle each Reach's pile (**Z**) and deal them fog side up onto that Reach's banks.
4. **Black Water**: put only the Lantern's number into the Ledger's Black Water well; move the rest to Surface 2.
5. **Hands**: deal 3 cards into each player's Hand (4 in solo).

## 9. Play

Go back to the game's profile page and click **Play**. Screentop opens a room with a code (like #abcd); send the
link to the other players. Each player clicks **Join** and takes their own seat, so they see only their own Hand.
"""
(OUT / "SCREENTOP-SETUP.md").write_text(md)
with zipfile.ZipFile(OUT / f"netherbloom-screentop-{LANG}.zip", "w", zipfile.ZIP_STORED) as z:
    for f in sorted((OUT / "assets").iterdir()):
        z.write(f, f"assets/{f.name}")
    z.write(OUT / "SCREENTOP-SETUP.md", "SCREENTOP-SETUP.md")
print("ok", len(md))
