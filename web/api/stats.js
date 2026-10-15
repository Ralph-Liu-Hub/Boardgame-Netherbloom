// GET /api/stats : the play log for the dashboard (admin accounts only).
import { COOKIE, readCookie, sessionUser, isAdmin } from "./_session.js";
import { logging, listAll, readJson } from "./_playlog.js";

export async function GET(request) {
  const user = await sessionUser(process.env.NB_SECRET, readCookie(request, COOKIE));
  if (!isAdmin(process.env, user)) return Response.json({ ok: false, error: "Only an admin account can see the play log." }, { status: 403 });
  if (!logging()) return Response.json({ ok: true, logging: false, sessions: [], logins: [] });
  try {
  const [sfiles, lfiles] = await Promise.all([listAll("sessions/", 400), listAll("logins/", 400)]);
  const read = files => Promise.all(files.map(f => readJson(f.pathname, f.url)));
  const [sessions, logins] = await Promise.all([read(sfiles), read(lfiles)]);
  return Response.json({ ok: true, logging: true, sessions: sessions.filter(Boolean), logins: logins.filter(Boolean) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ ok: false, error: `The play log store could not be read: ${e?.message || e}` }, { status: 502 });
  }
}
