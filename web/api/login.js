// POST /api/login {user, pass}. Credentials and the signing secret live in Vercel environment variables:
// NB_USER / NB_PASS for the main account, and optionally NB_USERS ("name:password, name2:password2") for more people.
import { COOKIE, MAX_AGE, makeToken, safeEqual, accounts } from "./_session.js";
import { logLogin } from "./_playlog.js";

export async function POST(request) {
  const { NB_SECRET } = process.env;
  const list = accounts(process.env);
  if (!list.length || !NB_SECRET) return Response.json({ ok: false, error: "Login is not configured." }, { status: 500 });
  let body = {};
  try { body = await request.json(); } catch { /* empty body */ }
  // check every account, so the time taken does not reveal which names exist
  let user = null;
  for (const [u, p] of list) if (safeEqual(body.user ?? "", u) & safeEqual(body.pass ?? "", p)) user = u;
  if (!user) {
    await new Promise(r => setTimeout(r, 600));
    return Response.json({ ok: false, error: "That account and password do not match." }, { status: 401 });
  }
  const token = await makeToken(NB_SECRET, user);
  await logLogin(request, user);
  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`, "Cache-Control": "no-store" },
  });
}
