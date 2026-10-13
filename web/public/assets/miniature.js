// The soul's miniature on the river: a small, translucent figure in the character of each Soul, fading
// into a wisp of mist where its feet would be. It faces downstream (right), toward the Far Shore.
// Drawn around (0, 0); the hem dissolves near y = 14, just above the water.

const BONE = "#EFE7D6", GOLD = "#E6D3A3", RED = "#D7263D", CYAN = "#8FD6E1", DARK = "#17161B";

const defs = `
  <defs>
    <linearGradient id="miniBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F7F2E8" stop-opacity=".98"/><stop offset=".55" stop-color="${BONE}" stop-opacity=".82"/>
      <stop offset="1" stop-color="${CYAN}" stop-opacity="0"/></linearGradient>
    <linearGradient id="miniVeil" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${CYAN}" stop-opacity=".55"/><stop offset="1" stop-color="${CYAN}" stop-opacity="0"/></linearGradient>
    <linearGradient id="miniCape" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a5560" stop-opacity=".9"/><stop offset="1" stop-color="#5a5560" stop-opacity="0"/></linearGradient>
    <radialGradient id="miniFlame"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".95"/><stop offset=".45" stop-color="${GOLD}" stop-opacity=".45"/>
      <stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
  </defs>`;

// Mist that trails behind the hem, and the soul's faint reflection on the water.
const wisps = (w = 1) => `
  <g class="mini-wisp" fill="none" stroke="${BONE}" stroke-linecap="round">
    <path d="M${-4 * w} 8 C${-14 * w} 10 ${-20 * w} 6 ${-30 * w} 9" stroke-opacity=".35" stroke-width="1.2"/>
    <path d="M${-2 * w} 12 C${-12 * w} 15 ${-22 * w} 12 ${-34 * w} 15" stroke-opacity=".22" stroke-width="1"/>
  </g>
  <ellipse class="mini-reflect" cy="20" rx="${12 * w}" ry="2.6" fill="${BONE}" opacity=".18"/>`;

const head = (cx, cy, r) => `<path d="M${cx - r * 0.35} ${cy + r * 0.7} L${cx + r * 0.35} ${cy + r * 0.7} L${cx + r * 0.3} ${cy + r * 1.35} L${cx - r * 0.3} ${cy + r * 1.35} Z" fill="#F2ECE0" opacity=".9"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#F2ECE0"/>
  <path d="M${cx + r * 0.85} ${cy - r * 0.15} L${cx + r * 1.22} ${cy + r * 0.12} L${cx + r * 0.8} ${cy + r * 0.3} Z" fill="#F2ECE0"/>
  <circle cx="${cx + r * 0.42}" cy="${cy - r * 0.18}" r="${r * 0.13}" fill="${DARK}" opacity=".6"/>`;
// A small five-petal flower.
const flower = (x, y, r, c = RED) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<ellipse rx="${r * 0.42}" ry="${r * 0.75}" transform="rotate(${a}) translate(0 ${-r * 0.55})" fill="${c}"/>`).join("")}<circle r="${r * 0.32}" fill="${GOLD}"/></g>`;

const FIGURES = {
  // A barefoot child in a too-big shawl, holding up one small flame.
  child: `
    ${wisps(0.7)}
    <path d="M-7 -6 C-8 -12 -6 -16 0 -16 C6 -16 8 -12 7 -6 C9 0 9 6 7 12 C2 13 -3 13 -8 12 C-9 6 -9 0 -7 -6 Z" fill="url(#miniBody)"/>
    <path d="M-8 -12 C-9 -18 -4 -22 1 -21 C6 -20 9 -16 8 -11 C4 -14 -3 -14 -8 -12 Z" fill="${BONE}" opacity=".7"/>
    ${head(1, -22, 5.6)}
    <path d="M-5 -25 C-5 -30 4 -31 7 -26 C3 -27 -1 -26 -3 -21 Z" fill="${BONE}" opacity=".8"/>
    <path d="M5 -10 C9 -12 11 -15 12 -18" stroke="${BONE}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".9"/>
    <g transform="translate(12.5 -22)"><g class="mini-flame">
      <circle r="9" fill="url(#miniFlame)"/>
      <path d="M0 -4.5 C2.2 -2 2 0.5 0 1.6 C-2 0.5 -2.2 -2 0 -4.5 Z" fill="${RED}"/>
    </g></g>`,

  // Slender and tall, long hair loose behind her, flowers woven in, one kept flower held to her chest.
  garland: `
    ${wisps(1)}
    <path d="M-2 -38 C-12 -32 -16 -18 -22 -2 C-14 -8 -8 -18 -4 -28 Z" fill="#C9C0B0" opacity=".55" class="mini-hair"/>
    <path d="M-4 -26 C-6 -14 -9 -2 -12 12 C-4 14 6 14 12 11 C9 0 7 -12 5 -26 C2 -29 -2 -29 -4 -26 Z" fill="url(#miniBody)"/>
    ${head(0, -33, 4.6)}
    <path d="M-4 -36 C-3 -40 3 -40 5 -36" fill="none" stroke="${BONE}" stroke-width="1.4" opacity=".8"/>
    <g fill="${RED}">${[-4, -1.6, 0.9, 3.4].map((x, i) => `<circle cx="${x}" cy="${-37.5 - Math.sin((i + 0.5) / 4 * Math.PI) * 1.4}" r="1.15"/>`).join("")}</g>
    <g fill="${RED}" opacity=".7">${[[-8, 6], [-2, 9], [5, 7]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.9"/>`).join("")}</g>
    <path d="M3 -21 C6 -19 7 -17 6 -15" stroke="${BONE}" stroke-width="1.6" fill="none"/>
    <g class="mini-bloom">${flower(6.5, -20.5, 3)}</g>`,

  // Broad and heavy: a crowned old king in a long robe and torn cape, sword point-down at his side.
  king: `
    ${wisps(1.25)}
    <path d="M-9 -28 C-18 -16 -24 0 -30 12 C-18 10 -10 8 -6 4 Z" fill="url(#miniCape)" class="mini-cape"/>
    <path d="M-10 -28 C-12 -14 -13 0 -14 12 C-4 14 6 14 14 12 C13 0 12 -14 10 -28 C5 -31 -5 -31 -10 -28 Z" fill="url(#miniBody)"/>
    <path d="M-12 -29 C-8 -32 8 -32 12 -29 C10 -26 -10 -26 -12 -29 Z" fill="${BONE}" opacity=".9"/>
    ${head(1, -35, 5.4)}
    <path d="M3 -33 C6 -30 7 -27 4 -26 C2 -28 1 -31 3 -33 Z" fill="${BONE}" opacity=".85"/>
    <path d="M-4 -39 L-3.5 -45 L-1 -41.5 L1 -46 L3 -41.5 L5.5 -45 L6 -39 Z" fill="${GOLD}"/>
    <g class="mini-sword">
      <path d="M15 -20 L15 10" stroke="${BONE}" stroke-width="1.6" opacity=".9"/>
      <path d="M12 -18 L18 -18" stroke="${GOLD}" stroke-width="1.6"/>
      <circle cx="15" cy="-21.5" r="1.4" fill="${GOLD}"/>
    </g>`,

  // A bride in a bell-shaped gown, her long veil trailing far behind, hands closed around a few flowers.
  bride: `
    ${wisps(1.1)}
    <path class="mini-veil" d="M-1 -38 C-12 -34 -22 -20 -38 6 C-28 4 -18 -6 -10 -20 C-6 -26 -3 -32 -1 -34 Z" fill="url(#miniVeil)"/>
    <path d="M-4 -26 C-5 -18 -7 -12 -15 12 C-5 15 7 15 16 12 C8 -12 6 -18 5 -26 C2 -29 -2 -29 -4 -26 Z" fill="url(#miniBody)"/>
    ${head(0, -32, 4.5)}
    <circle cx="-4" cy="-35" r="2.6" fill="${BONE}" opacity=".85"/>
    <path d="M-2 -37.5 C0 -39.5 3 -39.5 4 -37" stroke="${CYAN}" stroke-width="1.2" fill="none" opacity=".8"/>
    <g class="mini-bouquet"><circle cx="5.5" cy="-14" r="1.5" fill="${RED}"/><circle cx="7.5" cy="-15.5" r="1.2" fill="${RED}" opacity=".8"/><circle cx="6.8" cy="-12.6" r="1.1" fill="${GOLD}"/></g>`,

  // A hooded, nameless traveller, a little stooped, carrying a lantern ahead of them.
  open: `
    ${wisps(1)}
    <path d="M-6 -30 C-12 -24 -14 -8 -14 12 C-4 14 6 14 12 12 C11 -4 9 -20 6 -30 C2 -35 -3 -35 -6 -30 Z" fill="url(#miniBody)"/>
    <path d="M-7 -30 C-8 -40 2 -44 7 -38 C9 -34 9 -29 7 -26 C4 -32 -2 -33 -4 -26 Z" fill="${BONE}" opacity=".9"/>
    <path d="M0 -35 C4 -36 6 -33 5.5 -29 C3 -27 0 -28 -1 -31 Z" fill="${DARK}" opacity=".75"/>
    <circle cx="3.6" cy="-32" r=".7" fill="${GOLD}" opacity=".8"/>
    <path d="M6 -16 C10 -15 13 -13 14 -10" stroke="${BONE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <g transform="translate(15 -5)"><g class="mini-lantern">
      <circle r="10" fill="url(#miniFlame)"/>
      <path d="M0 -6 L0 -4 M-3 -4 L3 -4 L3 3 L-3 3 Z" stroke="${GOLD}" stroke-width="1" fill="${GOLD}" fill-opacity=".35"/>
    </g></g>`,
};

export function soulMiniature(soul) {
  return `${defs}<g class="mini mini-${soul in FIGURES ? soul : "open"}">${FIGURES[soul] || FIGURES.open}</g>`;
}
