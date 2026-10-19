// Puts each token's or symbol's icon in front of its name where the Rulebook mentions it: once per paragraph or
// list item, never inside tables, headings or story text, and not where the text already shows that icon.
const CRIMSON = "#D7263D", BONE = "#E6D3A3", CYAN = "#8FD6E1", MIST = "#9A948C";
const THREADS = [["nb-obsession", CRIMSON], ["nb-acceptance", BONE], ["nb-oblivion", CYAN]];

// [pattern, icon, colour]. Longer names first, so "Push Through token" wins over shorter matches.
const TERMS = {
  en: [
    [/\bPush Through tokens?\b/, "nb-tok-push", CRIMSON], [/\bHold Fast token\b/, "nb-tok-hold", CYAN],
    [/\bShield token\b/, "nb-tok-shield", BONE], [/\bResignation token\b/, "nb-tok-resign", BONE],
    [/\bsoul token\b/, "nb-soul", "#EFE7D6"], [/\bOar\b/, "nb-tok-oar", BONE],
    [/\bBook of Remembrance\b/, "nb-seal", BONE], [/\bKey Memory\b/, "nb-seal", CRIMSON],
    [/\bBlack Water\b/, "nb-blackwater", MIST], [/\bGrievances?\b/, "nb-grievance", CYAN],
    [/\bFractures?\b/, "nb-fracture", CRIMSON], [/\bBlooms?\b(?!-)/, "nb-bloom", CRIMSON],
    [/\bRoots?\b(?!-)/, "nb-root", BONE], [/\bLight\b(?! as Ash)/, "nb-light", BONE],
    [/\bEcho\b(?! cards| deck)/, "nb-echo", CYAN], [/\bknots?\b/, "nb-knot", BONE],
    [/\bObsession\b/, ...THREADS[0]], [/\bAcceptance\b/, ...THREADS[1]], [/\bOblivion\b/, ...THREADS[2]],
    [/\bfog\b(?!-)/i, "nb-fog", MIST], [/\bFertile\b/, "nb-fertile", "#6d665e"], [/\bStony\b/, "nb-stony", MIST],
    [/\bMemory Sites?\b/, "nb-memorysite", BONE], [/\bGraves?\b/, "nb-grave", CYAN],
  ],
  zh: [
    [/破浪標記/, "nb-tok-push", CRIMSON], [/堅守標記/, "nb-tok-hold", CYAN], [/護盾標記/, "nb-tok-shield", BONE],
    [/認命標記/, "nb-tok-resign", BONE], [/亡魂標記/, "nb-soul", "#EFE7D6"], [/船槳/, "nb-tok-oar", BONE],
    [/憶念之書/, "nb-seal", BONE], [/關鍵記憶/, "nb-seal", CRIMSON],
    [/黑水/, "nb-blackwater", MIST], [/怨念/, "nb-grievance", CYAN], [/裂痕/, "nb-fracture", CRIMSON],
    [/(?<![彼引])花(?![面環費葉瓣莖])/, "nb-bloom", CRIMSON], [/(?<![織扎])根(?![網面據])/, "nb-root", BONE],
    [/\d+點光|(?<![燈照])光(?![芒線])/, "nb-light", BONE], [/迴響(?!牌)/, "nb-echo", CYAN], [/(?<=[個的])結(?!束)/, "nb-knot", BONE],
    [/執念/, ...THREADS[0]], [/釋懷/, ...THREADS[1]], [/忘卻/, ...THREADS[2]],
    [/(?<![破迷])霧(?!氣)/, "nb-fog", MIST], [/沃土/, "nb-fertile", "#6d665e"], [/石地/, "nb-stony", MIST],
    [/記憶之地/, "nb-memorysite", BONE], [/墳墓/, "nb-grave", CYAN],
  ],
};

const ico = (id, color) => `<svg class="ri" style="color:${color}" aria-hidden="true"><use href="#${id}"/></svg>`;

export function iconize(html, lang) {
  const terms = TERMS[lang];
  let table = 0, quiet = false, seen = new Set();
  return html.split(/(<[^>]+>)/).map(part => {
    if (part.startsWith("<")) {
      if (/^<table/.test(part)) table++;
      else if (/^<\/table/.test(part)) table--;
      else if (/^<(p|li|h[1-6])[\s>]/.test(part)) { seen = new Set(); quiet = /class="(story|lore)"|^<h/.test(part); }
      else if (/^<\/(p|h[1-6])>/.test(part)) quiet = false;
      // an icon already in the text counts as that term's icon
      const used = part.match(/^<use href="#([\w-]+)"/);
      if (used) terms.forEach((t, i) => { if (t[1] === used[1]) seen.add(i); });
      return part;
    }
    if (table || quiet || !part.trim()) return part;
    const hits = [];
    terms.forEach(([re, id, col], i) => {
      if (seen.has(i)) return;
      const m = part.match(re);
      if (!m || hits.some(h => m.index < h.end && m.index + m[0].length > h.at)) return;
      hits.push({ at: m.index, end: m.index + m[0].length, svg: ico(id, col) });
      seen.add(i);
    });
    hits.sort((a, b) => b.at - a.at);
    for (const h of hits) part = part.slice(0, h.at) + h.svg + part.slice(h.at);
    return part;
  }).join("");
}
