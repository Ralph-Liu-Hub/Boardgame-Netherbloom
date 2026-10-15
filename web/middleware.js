// Everything except the login page and login API needs a valid session cookie.
import { COOKIE, readCookie, verifyToken } from "./api/_session.js";

export const config = { matcher: ["/((?!login|api/login|favicon\\.svg|_vercel).*)"] };

export default async function middleware(request) {
  if (await verifyToken(process.env.NB_SECRET, readCookie(request, COOKIE))) return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/assets/")) {
    return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.redirect(new URL("/login", request.url), 307);
}
