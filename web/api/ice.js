// GET /api/ice : the ICE servers (STUN, and TURN relays when configured) for online play.
// Browser-to-browser links fail on strict routers and mobile networks unless a TURN relay is offered, so the
// credentials come from Vercel environment variables (never from the page). Any one of these is enough:
//   CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN   short-lived credentials from Cloudflare's TURN service
//   METERED_DOMAIN + METERED_API_KEY                      credentials from a Metered TURN account
//   TURN_URLS (comma-separated) + TURN_USERNAME + TURN_CREDENTIAL   a fixed TURN server
const STUN = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];

async function relays(env) {
  if (env.CLOUDFLARE_TURN_KEY_ID && env.CLOUDFLARE_TURN_API_TOKEN) {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.CLOUDFLARE_TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_TURN_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 86400 }),
    });
    if (r.ok) return (await r.json()).iceServers || [];
  }
  if (env.METERED_DOMAIN && env.METERED_API_KEY) {
    const r = await fetch(`https://${env.METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${encodeURIComponent(env.METERED_API_KEY)}`);
    if (r.ok) return await r.json();
  }
  if (env.TURN_URLS && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
    return [{ urls: env.TURN_URLS.split(",").map(s => s.trim()).filter(Boolean), username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL }];
  }
  return [];
}

export async function GET() {
  let turn = [];
  try { turn = await relays(process.env); } catch { /* the relay service is down: fall back to direct links */ }
  const list = Array.isArray(turn) ? turn : [turn];
  return Response.json({ iceServers: [...STUN, ...list], relay: list.length > 0 }, { headers: { "Cache-Control": "no-store" } });
}
