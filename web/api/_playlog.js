// The play log: who signed in, and each game played (mode, Soul, players, how long, how it ended).
// It is kept in a private Vercel Blob store. Without one connected (no BLOB_READ_WRITE_TOKEN) nothing is
// recorded and the game works as before.
import { put, get, list } from "@vercel/blob";

export const logging = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const opts = { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true };

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
    await put(`logins/${at.toISOString().slice(0, 10)}/${at.getTime()}-${Math.random().toString(36).slice(2, 8)}.json`,
      JSON.stringify({ user, at: at.toISOString(), ...origin(request) }), opts);
  } catch { /* the log is never allowed to stop a login */ }
}

export async function readJson(pathname) {
  try {
    const r = await get(pathname, { access: "private", useCache: false });
    if (!r || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch { return null; }
}
export const writeJson = (pathname, value) => put(pathname, JSON.stringify(value), opts);

// Every file under a prefix, newest first, up to a limit.
export async function listAll(prefix, limit = 1000) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && out.length < limit);
  return out.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, limit);
}
