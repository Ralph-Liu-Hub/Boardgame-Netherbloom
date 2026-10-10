import { COOKIE } from "./_session.js";

export function GET() {
  return new Response(null, {
    status: 303,
    headers: { Location: "/login", "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`, "Cache-Control": "no-store" },
  });
}
