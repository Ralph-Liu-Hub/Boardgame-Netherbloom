# Factory files V5

Print-ready files for every component of Netherbloom V5 (《彼岸花渡》), in Traditional Chinese and English, laid out as the
approved component design sketches. Card, Book and rule text come from the same data as the web table
(`web/public/assets/*.js`, `docs/rules`), so the printed game matches the game online.

```bash
node print/v5/export_data.mjs        # card, tile and Book text from the web table's data -> print/v5/out/data.json
python3 print/v5/build.py            # every component, both languages; --lang zh|en, --only boards,cards,... , --no-press
python3 print/v5/manual.py           # MANUAL.pdf (production manual) from the print plan
python3 print/v5/package.py          # the Downloads zips
python3 print/v5/reprint_from_v3.py  # the least a V3.2 owner must print for V5, with what to keep from V3.2
```

Needs Chromium with Playwright (pre-installed here), Python with Pillow, Markdown and PyMuPDF, and Ghostscript for the
press step (`print/factory/press.py`, reused from V3.2: CMYK Coated FOGRA39, a 10 mm slug with crop and bleed marks,
registration targets, a colour bar, page labels, TrimBox and BleedBox). Fonts are Noto Serif TC, EB Garamond and
IM Fell English SC from Google Fonts. Output: `print/v5/out/<zh-TW|en>/`.

| Module | Component | Finished size (mm) |
|---|---|---|
| `boards.py` | River boards ×3 (one river across all three; fog-symbol key), Loom of the Fates, Ledger, Misty Landing, Supply | 256 × 124, 262 × 138, 262 × 190, 206 × 204, 206 × 204 |
| `cards.py` | Memory 72, Mist 56, Fate Mist 60 (mini); Commission 40, ending 20, Soul 5, Mantle 5, Ghost 12 (standard) | 41 × 63, 63 × 88 |
| `books.py` | Books of Remembrance ×5, 12 pages, saddle-stitched; chapter route maps as the web table, text 14 pt or more | page 240 × 282 |
| `tiles.py` | Bank tiles 37, front and fog side (symbol and pool) | 40 × 40 |
| `tokens.py` | Tokens 50 + 11 | Ø18, Ø25 |
| `box.py` | Lid and base wraps with die lines (V3.2 box kept) | 300 × 300 × 75, 296 × 296 × 73 |
| `rulebooks.py` | Rulebook, Solo Rulebook (saddle-stitched, padded to 4n pages), Player Aid | 210 × 280, A5 |
| `setup_table.py` | The Rulebook's set-up spread: the real table after set-up (2 players, The Child of the Last Flame, Gentle), drawn from the print files at true size with a slight camera angle, numbered by set-up step; rulebooks.py puts it on two facing pages next to its legend | two facing pages |

Every page is the finished size plus 3 mm bleed. Text boxes marked `.fit` shrink only if their words would not fit,
and the render reports any that still overflow (none do). `preview.py` and `sheet.py` save page images for a quick look.

The paintings in `art/` (Flower Field, Frost, Ember, Echo Rock, the Reaper) are the approved concept sketches; replace
them with the final paintings under the same names and rebuild.
