// GET /api/me : who is signed in, and whether that account is an admin (it may see the play log and host a table without playing).
import { COOKIE, readCookie, sessionUser, isAdmin } from "./_session.js";

export async function GET(request) {
  const user = await sessionUser(process.env.NB_SECRET, readCookie(request, COOKIE));
  return Response.json({ ok: !!user, user, admin: isAdmin(process.env, user) }, { headers: { "Cache-Control": "no-store" } });
}
