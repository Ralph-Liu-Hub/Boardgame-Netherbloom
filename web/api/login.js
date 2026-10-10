// POST /api/login {user, pass}. Credentials and the signing secret live in Vercel environment variables.
import { COOKIE, MAX_AGE, makeToken, safeEqual } from "./_session.js";

export async function POST(request) {
  const { NB_USER, NB_PASS, NB_SECRET } = process.env;
  if (!NB_USER || !NB_PASS || !NB_SECRET) return Response.json({ ok: false, error: "Login is not configured." }, { status: 500 });
  let body = {};
  try { body = await request.json(); } catch { /* empty body */ }
  const ok = safeEqual(body.user ?? "", NB_USER) & safeEqual(body.pass ?? "", NB_PASS);
  if (!ok) {
    await new Promise(r => setTimeout(r, 600));
    return Response.json({ ok: false, error: "That account and password do not match." }, { status: 401 });
  }
  const token = await makeToken(NB_SECRET, NB_USER);
  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`, "Cache-Control": "no-store" },
  });
}
