// GET /api/stats : the play log for the dashboard (admin accounts only). GET /api/stats?sid=… : one game's end-of-game record.
import { COOKIE, readCookie, sessionUser, isAdmin } from "./_session.js";
import { logging, listAll, readJson } from "./_playlog.js";

export async function GET(request) {
  const user = await sessionUser(process.env.NB_SECRET, readCookie(request, COOKIE));
  if (!isAdmin(process.env, user)) return Response.json({ ok: false, error: "Only an admin account can see the play log." }, { status: 403 });
  if (!logging()) return Response.json({ ok: true, logging: false, sessions: [], logins: [] });
  // ?sid=<session>: one game's end-of-game record (the table, the hands, the Chronicle)
  const sid = (new URL(request.url).searchParams.get("sid") || "").replace(/[^a-z0-9-]/gi, "").slice(0, 24);
  if (sid) {
    const game = await readJson(`games/${sid}.json`);
    return Response.json(game ? { ok: true, game } : { ok: false, error: "No record was kept for this game." }, { status: game ? 200 : 404, headers: { "Cache-Control": "no-store" } });
  }
  try {
  const [sfiles, lfiles] = await Promise.all([listAll("sessions/", 400), listAll("logins/", 400)]);
  const read = files => Promise.all(files.map(f => readJson(f.pathname, f.url)));
  const [sessions, logins] = await Promise.all([read(sfiles), read(lfiles)]);
  return Response.json({ ok: true, logging: true, sessions: sessions.filter(Boolean), logins: logins.filter(Boolean) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ ok: false, error: `The play log store could not be read: ${e?.message || e}` }, { status: 502 });
  }
}
