# Netherbloom art

Painted illustrations for Netherbloom (《彼岸花渡》): the box, the card backs, the Soul cards, the river board and the Books of Remembrance. They were made with Canva's image generator in one brief: dark gothic ink-and-wash, visible pen lines, Victorian storybook plates. The design system that uses them is at https://claude.ai/artifact/4enQAiKZV2p5heKWbnR58g.

## `masters/`

Lossless PNG exports of every painting at full resolution, which is the size Canva generates at. These are the originals: nothing larger exists. They are also in the Canva design "Blank Netherbloom artwork canvas" (`DAHYIgWAxNo`), one painting per page.

| File | Size (px) | Canva page | Used for |
|---|---|---|---|
| `cover-f.png` | 1264 × 1264 | 2 | Box lid (Cover F · The Crossing); box sides A and C |
| `soul-child.png`, `soul-garland.png`, `soul-king.png`, `soul-bride.png`, `soul-nameless.png` | 1088 × 1456 | 3–7 | Soul cards; Book covers; box side B and bottom |
| `back-memory.png` | 1024 × 1536 | 8 | Memory card back (official) |
| `back-mist.png`, `back-ghost.png`, `back-soul.png` | 1024 × 1536 | 9–11 | Mist, Ghost and Soul card backs |
| `tex-water.png`, `tex-bank.png` | 1776 × 896 | 12–13 | River board water and banks (seen from above); box side B and D; inside the lid and the base |
| `child-road.png`, `child-fields.png`, `child-lethe.png` | 1088 × 1456 | 14–16 | The Child's Book of Remembrance, Reach I–III |
| `garland-brook.png`, `garland-wade.png`, `garland-lethe.png` | 1088 × 1456 | 17–19 | The Garland Girl's Book, Reach I–III |
| `king-field.png`, `king-barge.png`, `king-lake.png` | 1088 × 1456 | 20–22 | The King's Book, Reach I–III |
| `bride-wedding.png`, `bride-stair.png`, `bride-shore.png` | 1088 × 1456 | 23–25 | The Bride's Book, Reach I–III |
| `nameless-road.png`, `nameless-mourners.png`, `nameless-lethe.png` | 1088 × 1456 | 26–28 | Open Crossing's Book, Reach I–III |
| `card-obsession.png`, `card-acceptance.png`, `card-oblivion.png` | 1456 × 1092 | 29–31 | Art window of the core and Echo Memory cards, by thread (Soul-pack cards use their Soul's Book paintings) |
| `card-mist-1.png`, `card-mist-2.png`, `card-mist-3.png`, `card-harsh.png` | 1456 × 1092 | 32–35 | Mist cards of Reach I, II, III and the Harsh Mist |
| `card-ghost.png` | 1456 × 1092 | 36 | Ghost cards (solo) |
| `card-mantle-weaver.png`, `card-mantle-warden.png`, `card-mantle-bringer.png`, `card-mantle-breaker.png` | 1456 × 1092 | 37–40 | The four Mantle cards |
| `card-bank-fertile.png`, `card-bank-stony.png`, `card-bank-memory.png`, `card-bank-grave.png` | 1088 × 1456 | 41–44 | Bank cards (seen from above) |
| `card-fog.png` | 1088 × 1456 | 45 | Bank card back, the fog side |

## Print resolution

At 300 dpi the masters print at these sizes:

| Art | Prints at | Needed for |
|---|---|---|
| Cover F, 1264 px | 107 × 107 mm | Box lid, 300 × 300 mm (3543 px) |
| Soul and Book paintings, 1088 × 1456 px | 92 × 123 mm | Soul card 63 × 88 mm (enough); A4 Book page, 210 × 297 mm (2480 × 3508 px) |
| Card backs, 1024 × 1536 px | 87 × 130 mm | Card 63 × 88 mm plus bleed (enough) |
| River textures, 1776 × 896 px | 150 × 76 mm | A3 river panel, 420 × 297 mm (4961 × 3508 px) |

The card art is print-ready. The box and the river board use the upscaled copies in `print/` (below). Keep these masters as the source.

## `print/`

4× upscaled copies of the paintings that print largest, made with Real-ESRGAN (x4plus) with a faint grain added back to match the paper texture of the originals. Saved as quality-93 JPEG at 300 dpi.

| File | Size (px) | Prints at 300 dpi | Used for |
|---|---|---|---|
| `cover-f.jpg` | 5056 × 5056 | 428 × 428 mm | Box lid (300 mm) and box sides A and C; the rulebook cover |
| `tex-water.jpg` | 7104 × 3584 | 601 × 303 mm | River board water; box side B; inside the lid |
| `tex-bank.jpg` | 7104 × 3584 | 601 × 303 mm | River board banks; box side D, the bottom and the base floor |

The factory build (`print/factory/`) uses these automatically when they exist.

The factory files for every component are built from these masters by `print/factory/` (see its README).

## Web copies

The web game uses WebP copies of these paintings in `web/public/assets/art/`, sized for the screen (about 2.7 MB in all). After changing a master, rebuild them with `python3 web/tools/build_art.py`. Which painting goes where in the game, and the head positions that keep figures uncropped, are in `web/public/assets/art.js`.
