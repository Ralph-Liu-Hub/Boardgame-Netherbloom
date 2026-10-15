// More accounts, the admin gate on the play log, and the tracker with no store connected.
import assert from "node:assert/strict";
process.env.NB_USER = "owner"; process.env.NB_PASS = "pw0"; process.env.NB_SECRET = "s".repeat(32);
process.env.NB_USERS = "alice:pw1, bob:pw2";
for (const k of Object.keys(process.env)) if (k.endsWith("READ_WRITE_TOKEN")) delete process.env[k];
const { POST: login } = await import("../api/login.js");
const { GET: stats } = await import("../api/stats.js");
const { POST: track } = await import("../api/track.js");
const req = body => new Request("https://x.test/api/login", { method: "POST", body: JSON.stringify(body) });
const cookieOf = async (u, p) => (await login(req({ user: u, pass: p }))).headers.get("set-cookie").split(";")[0];

assert.equal((await login(req({ user: "alice", pass: "pw1" }))).status, 200);
assert.equal((await login(req({ user: "alice", pass: "pw2" }))).status, 401);
const owner = await cookieOf("owner", "pw0"), alice = await cookieOf("alice", "pw1");
const get = c => stats(new Request("https://x.test/api/stats", { headers: { cookie: c } }));
assert.equal((await get(alice)).status, 403);                        // not an admin
const o = await (await get(owner)).json();
assert.equal(o.ok, true); assert.equal(o.logging, false);           // admin, but no store yet
process.env.NB_ADMINS = "alice";
assert.equal((await get(alice)).status, 200);
assert.equal((await get(owner)).status, 403);
const t = await (await track(new Request("https://x.test/api/track", { method: "POST", body: "{}", headers: { cookie: alice } }))).json();
assert.equal(t.logging, false);                                     // nothing recorded without a store
console.log("playlog ok");
