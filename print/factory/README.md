# Factory files (prototype manufacturing)

Print-ready files for every component of Netherbloom, in English and Traditional Chinese (《彼岸花渡》). The card text, Book frames and rules come from the same data as the web game (`web/public/assets/cards.js`, `zh.js`, `rules.js`, `rules_zh.js`), so the printed game always matches the shipped rules. The art comes from `art/masters/`.

```bash
# needs playwright-core and Chromium; ImageMagick (convert) is optional and shrinks the PDFs about 5x
PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs CHROMIUM_PATH=/path/to/chromium node print/factory/build.mjs --png
node print/factory/build.mjs --lang zh --only cards,board     # one language, some components
```

Output goes to `print/out/factory/<en|zh-TW>/`. Every PDF page is the finished size plus **3 mm bleed** on each side; keep text 3 mm inside the trim. With `--png`, every page is also saved as its own **300 dpi PNG**, named after the card or piece. Colours are RGB; ask the factory to convert to CMYK with their profile and send a proof.

## What is in the box

| Component | Count | Finished size | File(s) |
|---|---|---|---|
| Memory cards (32 core, 8 Echo, 4 × 8 Soul packs) | 72 | 63 × 88 mm | `cards/cards-memory.pdf`, back `back-memory` |
| Mist cards (10 + 2 per Reach, 6 Harsh) | 42 | 63 × 88 mm | `cards/cards-mist.pdf`, back `back-mist` |
| Ghost cards (solo) | 12 | 63 × 88 mm | `cards/cards-ghost.pdf`, back `back-ghost` |
| Mantle cards | 4 | 63 × 88 mm | `cards/cards-mantle.pdf`, back `back-mantle` |
| Soul cards | 5 | 63 × 88 mm | `cards/cards-soul.pdf`, back `back-soul` |
| Bank cards (6 / 8 / 6 for Reaches I / II / III) | 20 | 63 × 88 mm | `cards/cards-bank.pdf`, back `back-bank-1`, `-2`, `-3` by Reach (the fog side) |
| Card backs | 8 | 63 × 88 mm | `cards/card-backs.pdf` |
| River board panels (one per Reach, joined edge to edge) | 3 | A3, 420 × 297 mm | `board/river-board.pdf` |
| Punchboard: 9 large discs (25 mm) and 69 small (18 mm) | 1 sheet | 297 × 210 mm | `tokens/punchboard.pdf`: front, back (mirrored for duplex), die line |
| Books of Remembrance, one per Soul, 8 pages saddle-stitched | 5 | A4 | `books/book-of-remembrance-<soul>.pdf`, last page is the die line for the photo-corner slits on pages 4–6 |
| Rulebook, saddle-stitched | 1 | A4 | `rulebook/rulebook.pdf` (padded with Notes pages to a multiple of 4) |
| Player Aid, two-sided | 4 | A5 | `rulebook/player-aid.pdf` |
| Box lid wrap (top + four sides, 15 mm turn-ins) | 1 | lid 300 × 300 × 75 mm | `box/box-lid-wrap.pdf`, `box/box-lid-dieline.pdf` |
| Box base wrap (bottom = the box back) | 1 | base 296 × 296 × 73 mm | `box/box-base-wrap.pdf`, `box/box-base-dieline.pdf` |
| Inside-lid and base-floor liners | 2 | 300 × 300, 296 × 296 mm | `box/box-lid-liner.pdf`, `box/box-base-liner.pdf` |

Card PDFs have one card per page, fronts only, in deck order; each deck uses the one back named in the table (bank cards use the back for their Reach). Most prototype printers want exactly this: one image per card, plus the back.

## Choices worth checking with the factory

- **Box size.** 300 × 300 × 75 mm is assumed. If the factory's stock size differs, change `LID`, `BASE` and `TURN` at the top of `box.mjs` and rebuild; the art is laid out from those numbers. They will usually supply their own dieline: place the wrap art on it.
- **Tokens.** The print-and-play counts are kept, but Root and Bloom are one double-sided disc (a Root blooms and a Bloom withers by flipping it; the river never holds more than 24). Push Through's back is its spent side, and the Soul's back is the Ghost for solo play. Wooden pieces can replace any of the small discs.
- **Photo corners.** The Book's card wells hold an inscribed card by four die-cut slits per well. A cheaper prototype can skip the die cut and print the corners only; the cards then rest in the wells.
- **Bank cards** replace the print-and-play tiles: they sit in the 66 × 91 mm wells on the river board, fog side up, and are turned over when a Root is placed.
