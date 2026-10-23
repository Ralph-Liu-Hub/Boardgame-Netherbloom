# Print & Play components

`build_pnp.mjs` builds the Traditional Chinese print-and-play sheets from the same data the web game uses
(`web/public/assets/cards.js`, `zh.js`, `rules_zh.js`), so the printed cards always match the shipped edition.

```bash
node print/build_pnp.mjs          # HTML only → print/out/netherbloom-pnp.zh-TW.html
PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs CHROMIUM_PATH=/path/to/chromium node print/build_pnp.mjs --pdf
cp print/out/netherbloom-pnp.zh-TW.pdf web/public/downloads/   # publish with the web preview (behind the sign-in)
```

Contents (39 A4 pages): 72 memory cards, 42 Mist cards (12 per Reach plus 6 harsh), 12 Ghost cards, 4 Mantle and 5 Soul cards — each sheet followed
by its back sheet for long-edge duplex printing — plus river tiles and fog backs, tokens, the Ledger, the Lantern table with the Player
Aid, and a Book of Remembrance record sheet. Cards are 63 × 88 mm, nine to a page.
