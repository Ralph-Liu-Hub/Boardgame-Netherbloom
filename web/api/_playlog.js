// The play log: who signed in, and each game played (mode, Soul, players, how long, how it ended).
// It is kept in a Vercel Blob store connected to the project. Vercel names the store's token after the
// prefix chosen when connecting it (BLOB_READ_WRITE_TOKEN by default, e.g. netherbloom_READ_WRITE_TOKEN),
// so any *_READ_WRITE_TOKEN of a Blob store is used. Without one nothing is recorded and the game works as before.
import { put, get, list } from "@vercel/blob";

const token = () => process.env.BLOB_READ_WRITE_TOKEN
  || Object.entries(process.env).find(([k, v]) => /READ_WRITE_TOKEN$/.test(k) && /^vercel_blob_rw_/.test(v || ""))?.[1] || "";
export const logging = () => !!token();

// The store is either private (preferred: only this site can read the log) or public. Try private first and
// remember which one the store accepts.
let access = "private";
async function store(pathname, body) {
  const opts = a => ({ access: a, token: token(), contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
  try { return await put(pathname, body, opts(access)); }
  catch (e) {
    if (access !== "private" || !/access|private|public/i.test(String(e?.message))) throw e;
    access = "public";
    return put(pathname, body, opts(access));
  }
}

// Where a request came from, as Vercel reports it, and what kind of device sent it. No IP address is kept.
export function origin(request) {
  const h = request.headers;
  const ua = h.get("user-agent") || "";
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "phone" : "computer";
  const city = h.get("x-vercel-ip-city");
  return { country: h.get("x-vercel-ip-country") || "", city: city ? decodeURIComponent(city) : "", device };
}

export async function logLogin(request, user) {
  if (!logging()) return;
  const at = new Date();
  try {
    await store(`logins/${at.toISOString().slice(0, 10)}/${at.getTime()}-${Math.random().toString(36).slice(2, 8)}.json`,
      JSON.stringify({ user, at: at.toISOString(), ...origin(request) }));
  } catch (e) { console.error("play log: login not recorded", e?.message); }   // the log never stops a login
}

export async function readJson(pathname, url) {
  for (const a of [access, access === "private" ? "public" : "private"]) {
    try {
      if (a === "public" && url) { const r = await fetch(url, { cache: "no-store" }); if (r.ok) return await r.json(); continue; }
      const r = await get(pathname, { access: a, token: token(), useCache: false });
      if (r?.stream) return JSON.parse(await new Response(r.stream).text());
    } catch { /* try the other access type */ }
  }
  return null;
}
export const writeJson = (pathname, value) => store(pathname, JSON.stringify(value));

// Every file under a prefix, newest first, up to a limit.
export async function listAll(prefix, limit = 1000) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000, token: token() });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && out.length < limit);
  return out.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, limit);
}
