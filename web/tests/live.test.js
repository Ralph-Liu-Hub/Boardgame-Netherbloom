// Checks the live-table API without a server: who may list tables and get a pass, and that a pass only opens its table.
import assert from "node:assert/strict";
process.env.NB_SECRET = "s".repeat(32); process.env.NB_USERS = "boss:pw,pat:pw"; process.env.NB_ADMINS = "boss"; process.env.NB_LIVE_MEMORY = "1";
const { makeToken, COOKIE } = await import("../api/_session.js");
const { GET, POST, DELETE } = await import("../api/live.js");
const as = async u => `${COOKIE}=${await makeToken(process.env.NB_SECRET, u)}`;
const req = async (u, path, init = {}) => new Request("https://x.test/api/live" + path, { ...init, headers: { cookie: u ? await as(u) : "" } });

// nobody signed in: nothing
assert.equal((await GET(await req(null, ""))).status, 401);
assert.equal((await POST(await req(null, "", { method: "POST", body: "{}" }))).status, 401);
// a player reports a table; only an admin can list it or get a pass
assert.equal((await POST(await req("pat", "", { method: "POST", body: JSON.stringify({ code: "ABCDE", soul: "child", players: 2, names: ["Pat", "Bea"], online: [true, false] }) }))).status, 200);
assert.equal((await POST(await req("pat", "", { method: "POST", body: JSON.stringify({ code: "bad!" }) }))).status, 400);
assert.equal((await GET(await req("pat", ""))).status, 403);
assert.equal((await GET(await req("pat", "?token=ABCDE"))).status, 403);
const list = await (await GET(await req("boss", ""))).json();
assert.equal(list.live.length, 1);
assert.deepEqual([list.live[0].code, list.live[0].by, list.live[0].names[1], list.live[0].online[1]], ["ABCDE", "pat", "Bea", false]);
// a pass opens its own table only, and cannot be forged
const { pass } = await (await GET(await req("boss", "?token=ABCDE"))).json();
const verify = async (code, p) => (await (await GET(await req("pat", `?verify=${encodeURIComponent(p)}&code=${code}`))).json()).ok;
assert.equal(await verify("ABCDE", pass), true);
assert.equal(await verify("ZZZZZ", pass), false);
assert.equal(await verify("ABCDE", pass.slice(0, -2) + "xx"), false);
assert.equal(await verify("ABCDE", `${Math.floor(Date.now() / 1000) - 10}.${pass.split(".")[1]}`), false);
// a closed table leaves the list
await DELETE(await req("pat", "?code=ABCDE", { method: "DELETE" }));
assert.equal((await (await GET(await req("boss", ""))).json()).live.length, 0);
// an admin ends tables (one or more); a player cannot; the host hears it at its next report and the table stays ended
const report = (u, code) => req(u, "", { method: "POST", body: JSON.stringify({ code, soul: "child", players: 2, names: ["Pat", "Bea"] }) });
await POST(await report("pat", "FGHJK")); await POST(await report("pat", "MNPQR"));
const status = async c => (await (await GET(await req("pat", `?status=${c}`))).json());
assert.deepEqual(await status("FGHJK"), { ok: true, known: true, live: true, endedByAdmin: false, final: false });
assert.equal((await POST(await req("pat", "", { method: "POST", body: JSON.stringify({ end: ["FGHJK"] }) }))).status, 403);
const ended = await (await POST(await req("boss", "", { method: "POST", body: JSON.stringify({ end: ["FGHJK", "MNPQR", "bad!"] }) }))).json();
assert.deepEqual(ended.ended, ["FGHJK", "MNPQR"]);
assert.deepEqual(await status("FGHJK"), { ok: true, known: true, live: false, endedByAdmin: true, final: false });
assert.deepEqual(await (await POST(await report("pat", "FGHJK"))).json(), { ok: true, ended: true, endedBy: "boss" });
assert.equal((await (await GET(await req("boss", ""))).json()).live.length, 0);
assert.deepEqual(await status("ZZZZZ"), { ok: true, known: false, live: false, endedByAdmin: false, final: false });
// a host who steps away leaves the table reopenable; ending the game marks it final
await POST(await report("pat", "STUVW"));
await DELETE(await req("pat", "?code=STUVW", { method: "DELETE" }));
assert.deepEqual(await status("STUVW"), { ok: true, known: true, live: false, endedByAdmin: false, final: false });
await DELETE(await req("pat", "?code=STUVW&final=1", { method: "DELETE" }));
assert.deepEqual(await status("STUVW"), { ok: true, known: true, live: false, endedByAdmin: false, final: true });
console.log("live ok");
