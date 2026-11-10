// Writes docs/rules/icons/*.svg: one small picture per token or marker, drawn like the pieces on the web table
// (the same symbol and colours), for the rulebooks' glossary and component list.
//
//     node web/tools/build_icons.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sprite = fs.readFileSync(path.join(ROOT, "web/public/assets/symbols.svg"), "utf8");
const symbol = id => {
  if (id === "nb-rays") {   // the Light marker's rays are drawn in table.js, not in the sprite
    const lines = Array.from({ length: 12 }, (_, i) => {
      const a = i * Math.PI / 6, r1 = i % 2 ? 7 : 6.6, r2 = i % 2 ? 9.6 : 11.4;
      return `<line x1="${(12 + r1 * Math.cos(a)).toFixed(2)}" y1="${(12 + r1 * Math.sin(a)).toFixed(2)}" x2="${(12 + r2 * Math.cos(a)).toFixed(2)}" y2="${(12 + r2 * Math.sin(a)).toFixed(2)}"/>`;
    }).join("");
    return { box: "0 0 24 24", body: `<circle cx="12" cy="12" r="4.4" fill="currentColor"/><g stroke="currentColor" stroke-width="1.9" stroke-linecap="round">${lines}</g>` };
  }
  const m = sprite.match(new RegExp(`<symbol id="${id}" viewBox="([^"]+)">([\\s\\S]*?)</symbol>`));
  if (!m) throw new Error("no symbol " + id);
  return { box: m[1], body: m[2] };
};
// name: [symbol, background, foreground, shape]
const ICONS = {
  soul: ["nb-soul", "#e9e2d0", "#222222", "circle"],
  root: ["nb-root", "#4b3a25", "#d8b98a", "circle"],
  bloom: ["nb-bloom", "#8e1f2a", "#ffd6d0", "circle"],
  shade: ["nb-grievance", "#2c1d33", "#c9a2e0", "circle"],
  fog: ["nb-fog", "#777d84", "#e8ecef", "circle"],
  blackwater: ["nb-blackwater", "#05070a", "#6fa4b3", "circle"],
  fracture: ["nb-fracture", "#3a1015", "#ff9aa0", "circle"],
  light: ["nb-rays", "#e0b84f", "#3a2a00", "circle"],
  echo: ["nb-echo", "#2a4f53", "#cdeff1", "circle"],
  "knot-obsession": ["nb-knot", "#b8323a", "#ffffff", "circle"],
  "knot-acceptance": ["nb-knot", "#e6d3a3", "#3a2e10", "circle"],
  "knot-oblivion": ["nb-knot", "#5fb3b8", "#08292b", "circle"],
  scar: ["nb-fracture", "#241e22", "#e6d3a3", "square"],
  forgotten: ["nb-oblivion", "#1d5f66", "#d9fbfc", "circle"],
  hold: ["nb-tok-hold", "#4b4352", "#f2e8d5", "circle"],
  shield: ["nb-tok-shield", "#4b4352", "#f2e8d5", "circle"],
  resign: ["nb-tok-resign", "#4b4352", "#f2e8d5", "circle"],
  oar: ["nb-tok-oar", "#6d5530", "#f5e2b8", "square"],
  push: ["nb-tok-push", "#2d5160", "#d7f3ff", "circle"],
};
const out = path.join(ROOT, "docs/rules/icons");
fs.mkdirSync(out, { recursive: true });
for (const [name, [id, bg, fg, shape]] of Object.entries(ICONS)) {
  const { box, body } = symbol(id);
  const plate = shape === "square" ? `<rect x="1" y="1" width="46" height="46" rx="9" fill="${bg}" stroke="#000" stroke-width="1.5"/>`
                                   : `<circle cx="24" cy="24" r="23" fill="${bg}" stroke="#000" stroke-width="1.5"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">${plate}` +
    `<svg x="7" y="7" width="34" height="34" viewBox="${box}" color="${fg}" style="color:${fg}">${body}</svg></svg>\n`;
  fs.writeFileSync(path.join(out, name + ".svg"), svg);
}
console.log(Object.keys(ICONS).length, "icons ->", path.relative(ROOT, out));
