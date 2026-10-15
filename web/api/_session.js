// Signed session cookie shared by the login API and the middleware. Uses Web Crypto, so it runs on Node and Edge.
export const COOKIE = "nb_session";
export const MAX_AGE = 60 * 60 * 24 * 7;

const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function makeToken(secret, user) {
  const body = b64url(enc.encode(JSON.stringify({ u: user, exp: Math.floor(Date.now() / 1000) + MAX_AGE })));
  return `${body}.${await hmac(secret, body)}`;
}

export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function verifyToken(secret, token) {
  if (!secret || !token || !token.includes(".")) return false;
  const [body, sig] = token.split(".");
  if (!safeEqual(sig, await hmac(secret, body))) return false;
  try {
    const { exp } = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    return exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export function readCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

// The account name inside a valid session cookie, or null.
export async function sessionUser(secret, token) {
  if (!(await verifyToken(secret, token))) return null;
  try { return JSON.parse(atob(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"))).u || null; } catch { return null; }
}

// Accounts: NB_USER / NB_PASS, plus any in NB_USERS written "name:password, name2:password2".
export function accounts(env) {
  const list = [];
  if (env.NB_USER && env.NB_PASS) list.push([env.NB_USER, env.NB_PASS]);
  for (const pair of String(env.NB_USERS || "").split(",")) {
    const i = pair.indexOf(":");
    if (i > 0) list.push([pair.slice(0, i).trim(), pair.slice(i + 1).trim()]);
  }
  return list;
}
// Who may open the play dashboard: only the accounts named in NB_ADMINS (comma-separated).
// The shared publisher login is never an admin unless it is named there.
export const isAdmin = (env, user) => !!user && String(env.NB_ADMINS || "").split(",").map(s => s.trim()).filter(Boolean).includes(user);
