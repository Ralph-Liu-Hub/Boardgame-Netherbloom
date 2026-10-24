# Factory files (prototype manufacturing)

Print-ready files for every component of Netherbloom, in English and Traditional Chinese (《彼岸花渡》). The card text, Book frames and rules come from the same data as the web game (`web/public/assets/cards.js`, `zh.js`, `rules.js`, `rules_zh.js`), so the printed game always matches the shipped rules. The art comes from `art/masters/`, or from the 4× upscaled copy in `art/print/` where one exists (the box and river board paintings). The Souls' longer tales for the Books are in `stories.mjs`.

```bash
# needs playwright-core and Chromium; ImageMagick (convert) is optional and shrinks the PDFs about 5x
PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs CHROMIUM_PATH=/path/to/chromium node print/factory/build.mjs --png
node print/factory/build.mjs --lang zh --only cards,board     # one language, some components
```

Output goes to `print/out/factory/<en|zh-TW>/`. **Send the factory `MANUAL.pdf`** from the top of that folder: the production manual in that edition's language (bill of materials, stock and finish, which back goes with which front, how double-sided sheets turn over, die lines, box assembly, packing order and a pre-print checklist), generated with the files so its counts and names always match. Every PDF page is the finished size plus **3 mm bleed** on each side; keep text 3 mm inside the trim. With `--png`, every page is also saved as its own **300 dpi PNG**, named after the card or piece. Colours are RGB; ask the factory to convert to CMYK with their profile and send a proof.

## What is in the box

| Component | Count | Finished size | File(s) |
|---|---|---|---|
| Memory cards (32 core, 8 Echo, 4 × 8 Soul packs) | 72 | 63 × 88 mm | `cards/cards-memory.pdf`, back `back-memory` |
| Mist cards (10 + 2 per Reach, 6 Harsh) | 42 | 63 × 88 mm | `cards/cards-mist.pdf`, back `back-mist` |
| Ghost cards (solo) | 12 | 63 × 88 mm | `cards/cards-ghost.pdf`, back `back-ghost` |
| Mantle cards | 4 | 63 × 88 mm | `cards/cards-mantle.pdf`, back `back-mantle` |
| Soul cards | 5 | 63 × 88 mm | `cards/cards-soul.pdf`, back `back-soul` |
| Bank tiles (6 / 8 / 6 for Reaches I / II / III), 2 mm greyboard | 20 | 40 × 40 mm | `tiles/bank-tiles.pdf`: front, back (the fog side, marked with its Reach; mirrored for duplex), die line |
| Card backs | 8 | 63 × 88 mm | `cards/card-backs.pdf` |
| River board panels (one per Reach, joined edge to edge; a Mist deck well and 42 mm tile wells on each) | 3 | 266 × 182 mm (smaller than A4) | `board/river-board.pdf` |
| Loom of the Fates board: three threads with five 22 mm knot circles each (a thread snaps at 4 knots with 2–3 players, 5 solo or with 4), an Echo ring and its Backlash | 1 | A4 landscape, 297 × 210 mm | `loom/loom-of-the-fates.pdf` (page 2 is the trim line) |
| The Ledger board: the forgotten track (numbered, with each Lantern's ✕), three Fracture wells and the Black Water well | 1 | A4 landscape, 297 × 210 mm | `ledger/the-ledger.pdf` (page 2 is the trim line) |
| Punchboard: 9 large discs (25 mm) and 69 small (18 mm) | 1 sheet | 297 × 210 mm | `tokens/punchboard.pdf`: front, back (mirrored for duplex), die line |
| Books of Remembrance, one per Soul, 8 pages saddle-stitched: cover, the Soul's tale, what the Ferrymen know and how to keep the Book, three Reach pages, the Far Shore, back | 5 | A4 | `books/book-of-remembrance-<soul>.pdf`; 48 clear self-adhesive photo corners per Book go on the printed corner marks of pages 4–6 |
| Rulebook, saddle-stitched | 1 | A4 | `rulebook/rulebook.pdf`: pages 2–3 are the Setting up spread, the whole table with every component numbered and labelled; padded with Notes pages to a multiple of 4 |
| Player Aid: the whole game in short, so a table can play from it alone (4 pages in English, 5 in Chinese) | 1 per player (4) | A5 | `rulebook/player-aid.pdf` |
| Box lid wrap (top + four sides, 15 mm turn-ins) | 1 | lid 300 × 300 × 75 mm | `box/box-lid-wrap.pdf`, `box/box-lid-dieline.pdf` |
| Box base wrap (bottom = the box back) | 1 | base 296 × 296 × 73 mm | `box/box-base-wrap.pdf`, `box/box-base-dieline.pdf` |
| Inside-lid and base-floor liners | 2 | 300 × 300, 296 × 296 mm | `box/box-lid-liner.pdf`, `box/box-base-liner.pdf` |

Card PDFs have one card per page, fronts only, in deck order; each deck uses the one back named in the table. Most prototype printers want exactly this: one image per card, plus the back.

## Choices worth checking with the factory

- **Box size.** 300 × 300 × 75 mm is assumed. If the factory's stock size differs, change `LID`, `BASE` and `TURN` at the top of `box.mjs` and rebuild; the art is laid out from those numbers. They will usually supply their own dieline: place the wrap art on it.
- **Tokens.** The print-and-play counts are kept, but Root and Bloom are one double-sided disc (a Root blooms and a Bloom withers by flipping it; the river never holds more than 24). Push Through's back is its spent side, and the Soul's back is the Ghost for solo play. Wooden pieces can replace any of the small discs.
- **Photo corners.** The Book's card wells hold an inscribed card by four clear self-adhesive photo corners per well, stuck on the printed corner marks. Die-cut slits are not used: in the saddle stitch page 4 is printed on the back of page 3, so slits for its wells would cut through page 3.
- **Bank tiles** are 40 mm squares in 42 mm wells on the river board, fog side up, turned over when a Root is placed. Each panel also holds its Reach's Mist deck in a 66 × 91 mm well where the Reach begins.
- **All card and board text is at least 10.5 pt** (14 px).

## Art rules the build enforces

- **A figure's head is never cropped.** `HEADS` in `lib.mjs` records where each Soul painting's head sits (top and bottom, crown or hood included). Whenever a painting is cut down to fit a frame (a card's art window, a Book plate, a cameo), the build shifts it so the whole head and a little headroom stay in view, and shows the painting whole instead if it cannot. Book plates never get wider than 3:2, so a portrait is not sliced into a strip. Add every new figure painting to `HEADS`.

## Parked: story cards and the Nameless Souls module

The Soul Roster v3 and Card Compendium v0.2 also describe components that the rulebook and the web game do not use yet. Their cards are designed and illustrated but **parked**: they are not in the factory files, the manual or the box until they have rules.

| Component | Count | Back |
|---|---|---|
| Keepsakes (9 per named Soul, 3 per Reach) | 36 | Keepsake |
| Chapter cards (3 per named Soul) | 12 | Story |
| Ending cards (A–D per named Soul, and the hidden ending for the King, the Garland Girl and the Bride) | 19 | Story |
| Nameless Soul Memory cards (G01–G24; G17–G24 are the Lives' Key Memories) | 24 | Memory |
| Lives, Wounds, Last Wishes | 8 each | Life, Wound, Last Wish |
| Wish endings (Be Forgotten has no "fulfilled, remembered" ending) | 23 | Story |
| Wish tiles: the Sea and the Waiting Soul | 2 | Fog, Reach III and II |
| Book of Crossings pad sheet (A5) and Ending Gallery (A4) | 1 each | — |

The words are in `data/compendium.json`, parsed from the two docs in both languages; the templates are in `compendium.mjs` and `extras.mjs`. To look at them:

```bash
node print/factory/parked.mjs --lang en      # → print/out/factory/en/parked/
```

