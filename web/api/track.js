// POST /api/track : the game reports a session as it goes, so the play log knows who played what and for how long.
// Body: { sid, ev: "start" | "beat" | "end", mode, players, soul, lantern, names, turn, result, cause }.
// One file per game session (sessions/<sid>.json), updated in place.
import { COOKIE, readCookie, sessionUser } from "./_session.js";
import { logging, origin, readJson, writeJson } from "./_playlog.js";

const clean = (v, n = 40) => String(v ?? "").slice(0, n);

export async function POST(request) {
  if (!logging()) return Response.json({ ok: true, logging: false });
  const user = await sessionUser(process.env.NB_SECRET, readCookie(request, COOKIE));
  if (!user) return new Response("Unauthorized", { status: 401 });
  let b = {};
  try { b = JSON.parse(await request.text()); } catch { /* sendBeacon sends text */ }
  const sid = clean(b.sid, 24).replace(/[^a-z0-9-]/gi, "");
  if (!sid) return Response.json({ ok: false }, { status: 400 });
  const path = `sessions/${sid}.json`;
  const now = new Date().toISOString();
  const old = (await readJson(path)) || { sid, user, start: now, ...origin(request) };
  const rec = {
    ...old,
    user: old.user || user,
    last: now,
    mode: clean(b.mode ?? old.mode, 10),
    players: Number(b.players ?? old.players) || old.players || null,
    soul: clean(b.soul ?? old.soul, 20),
    lantern: Number(b.lantern ?? old.lantern) || old.lantern || null,
    names: Array.isArray(b.names) ? b.names.slice(0, 4).map(n => clean(n, 18)) : old.names || [],
    table: clean(b.table ?? old.table, 8),
    turn: Number(b.turn ?? old.turn) || old.turn || 0,
    result: b.ev === "end" || b.result === "left" ? clean(b.result, 8) : old.result || "",
    cause: b.ev === "end" ? clean(b.cause, 20) : old.cause || "",
  };
  try { await writeJson(path, rec); } catch (e) { console.error("play log: session not recorded", e?.message); return Response.json({ ok: false }, { status: 502 }); }
  return Response.json({ ok: true });
}
