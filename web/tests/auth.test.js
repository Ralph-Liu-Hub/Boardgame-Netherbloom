// Checks the login API and the middleware gate without a server.
import assert from "node:assert/strict";
process.env.NB_USER = "u_test"; process.env.NB_PASS = "p_test"; process.env.NB_SECRET = "s".repeat(32);
const { POST } = await import("../api/login.js");
const { default: mw } = await import("../middleware.js");
const req = body => new Request("https://x.test/api/login", { method: "POST", body: JSON.stringify(body) });

const bad = await POST(req({ user: "u_test", pass: "nope" }));
assert.equal(bad.status, 401);
const good = await POST(req({ user: "u_test", pass: "p_test" }));
assert.equal(good.status, 200);
const cookie = good.headers.get("set-cookie").split(";")[0];
assert.match(good.headers.get("set-cookie"), /HttpOnly/);

const page = await mw(new Request("https://x.test/"));
assert.equal(page.status, 307);
assert.equal(page.headers.get("location"), "https://x.test/login");
const asset = await mw(new Request("https://x.test/assets/app.js"));
assert.equal(asset.status, 401);
assert.equal(await mw(new Request("https://x.test/", { headers: { cookie } })), undefined);
const forged = cookie.slice(0, -3) + "abc";
assert.equal((await mw(new Request("https://x.test/", { headers: { cookie: forged } }))).status, 307);
console.log("auth ok");
