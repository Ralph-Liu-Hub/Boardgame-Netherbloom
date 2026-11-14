// Live tables, for an admin to watch games as they are played.
//   POST   /api/live            a host reports its table (every 45 s while it is open): code, Soul, seats, who is online;
//                                the answer says {ended: true} once an admin has ended the table, and the host closes it
//   POST   /api/live {end: [CODE, ...]}   (admin) end one or more live tables
//   DELETE /api/live?code=XXXXX the host left its table (it may reopen it); &final=1: the host ended the game for good
//   GET    /api/live            (admin) the tables reported in the last 2.5 minutes
//   GET    /api/live?token=CODE (admin) a pass to watch that table; the host checks it before letting a watcher in
//   GET    /api/live?verify=PASS&code=CODE   (any signed-in host) is this a real pass for my table?
//   GET    /api/live?status=CODE (any signed-in player) is that table still being played, or did an admin end it?
// Online games still run browser to browser: only this summary is kept, in the play log's Blob store (live/CODE.json).
import { COOKIE, readCookie, sessionUser, isAdmin, hmac, safeEqual } from "./_session.js";
import { logging, listAll, readJson, writeJson } from "./_playlog.js";

const FRESH = 150 * 1000;          // a table that has not reported for this long is gone
const PASS_LIFE = 12 * 3600;       // a watch pass lasts 12 hours
const CODE = /^[A-Z2-9]{5}$/;
const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Without a Blob store nothing is kept across requests; the browser tests (and a local run) keep tables in memory.
const memory = () => (globalThis.__nbLive ||= new Map());
const useMemory = () => !logging() && process.env.NB_LIVE_MEMORY === "1";
async function save(code, value) {
  if (useMemory()) { memory().set(code, value); return; }
  if (logging()) await writeJson(`live/${code}.json`, value);
}
async function one(code) {
  if (useMemory()) return memory().get(code) || null;
  if (!logging()) return null;
  return readJson(`live/${code}.json`);
}
async function all() {
  if (useMemory()) return [...memory().values()];
  if (!logging()) return [];
  const files = await listAll("live/", 200);
  return (await Promise.all(files.map(f => readJson(f.pathname, f.url)))).filter(Boolean);
}

const passFor = async (secret, code, exp) => `${exp}.${await hmac(secret, `watch:${code}:${exp}`)}`;
async function passOk(secret, code, pass) {
  const [exp] = String(pass || "").split(".");
  if (!secret || !CODE.test(code) || !(+exp > Date.now() / 1000)) return false;
  return safeEqual(pass, await passFor(secret, code, exp));
}

async function who(request) { return sessionUser(process.env.NB_SECRET, readCookie(request, COOKIE)); }

export async function POST(request) {
  const user = await who(request);
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  let b = {};
  try { b = await request.json(); } catch { /* empty */ }
  if (Array.isArray(b.end)) {   // an admin ends tables: each host hears of it at its next report and closes the table
    if (!isAdmin(process.env, user)) return json({ ok: false, error: "Only an admin account can end tables." }, 403);
    const codes = [...new Set(b.end.map(c => String(c || "").toUpperCase()).filter(c => CODE.test(c)))].slice(0, 50);
    try {
      for (const c of codes) await save(c, { ...((await one(c)) || {}), code: c, at: new Date().toISOString(), ended: true, endedBy: user });
    } catch (e) { return json({ ok: false, error: String(e?.message || e) }, 502); }
    return json({ ok: true, ended: codes });
  }
  const code = String(b.code || "").toUpperCase();
  if (!CODE.test(code)) return json({ ok: false, error: "Bad table code." }, 400);
  const clip = (v, n) => String(v ?? "").slice(0, n);
  const entry = {
    code, by: user, at: new Date().toISOString(), since: clip(b.since, 30),
    soul: clip(b.soul, 20), level: Math.max(0, Math.min(2, +b.level || 0)), players: Math.max(1, Math.min(4, +b.players || 1)),
    names: (Array.isArray(b.names) ? b.names : []).slice(0, 4).map(n => clip(n, 18)),
    online: (Array.isArray(b.online) ? b.online : []).slice(0, 4).map(Boolean),
    watchers: Math.max(0, Math.min(20, +b.watchers || 0)), watchHost: !!b.watchHost, chapter: Math.max(0, Math.min(2, +b.chapter || 0)),
    light: Math.max(0, Math.min(12, +b.light || 0)), forgotten: Math.max(0, Math.min(40, +b.forgotten || 0)), cracks: Math.max(0, Math.min(5, +b.cracks || 0)),
    voice: Math.max(0, Math.min(24, +b.voice || 0)),
  };
  try {
    const was = await one(code);
    if (was?.endedBy) return json({ ok: true, ended: true, endedBy: was.endedBy });   // an admin ended it: it stays ended
    await save(code, entry);
  } catch (e) { return json({ ok: false, error: String(e?.message || e) }, 502); }
  return json({ ok: true });
}

export async function DELETE(request) {
  const user = await who(request);
  if (!user) return json({ ok: false }, 401);
  const code = (new URL(request.url).searchParams.get("code") || "").toUpperCase();
  if (!CODE.test(code)) return json({ ok: false }, 400);
  const final = new URL(request.url).searchParams.get("final") === "1";
  try { await save(code, { code, by: user, at: new Date().toISOString(), ended: true, ...(final ? { final: true } : {}) }); } catch { /* the entry simply goes stale */ }
  return json({ ok: true });
}

export async function GET(request) {
  const user = await who(request);
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  const q = new URL(request.url).searchParams;
  const secret = process.env.NB_SECRET;
  if (q.has("verify")) return json({ ok: await passOk(secret, (q.get("code") || "").toUpperCase(), q.get("verify")) });
  if (q.has("status")) {
    const code = (q.get("status") || "").toUpperCase();
    if (!CODE.test(code)) return json({ ok: false }, 400);
    try {
      const t = await one(code);
      return json({ ok: true, known: !!t, live: !!t && !t.ended && Date.now() - new Date(t.at).getTime() < FRESH, endedByAdmin: !!t?.endedBy, final: !!t?.final });
    } catch { return json({ ok: false }, 502); }
  }
  if (!isAdmin(process.env, user)) return json({ ok: false, error: "Only an admin account can watch tables." }, 403);
  if (q.has("token")) {
    const code = (q.get("token") || "").toUpperCase();
    if (!CODE.test(code)) return json({ ok: false, error: "Bad table code." }, 400);
    return json({ ok: true, code, pass: await passFor(secret, code, Math.floor(Date.now() / 1000) + PASS_LIFE) });
  }
  try {
    const now = Date.now();
    const live = (await all()).filter(t => !t.ended && now - new Date(t.at).getTime() < FRESH).sort((a, b) => String(b.since).localeCompare(String(a.since)));
    return json({ ok: true, store: logging() || useMemory(), live });
  } catch (e) {
    return json({ ok: false, error: `The live table list could not be read: ${e?.message || e}` }, 502);
  }
}
