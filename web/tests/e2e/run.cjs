// Browser tests for the manual table. Needs Playwright with Chromium (`npx playwright install chromium` if missing).
//   cd web && npm run test:e2e
// Serves web/public on :8765 and, for the online test, a local PeerJS server on :9000 (needs the dev packages
// `peer` and `peerjs`: npm i -D peer peerjs). Without them the online test is skipped.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".json": "application/json" };
const site = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(ROOT, url === "/" ? "index.html" : url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

let peerServer = null;
function startPeer() {
  try {
    const express = require("express");
    const { ExpressPeerServer } = require("peer");
    require.resolve("peerjs/dist/peerjs.min.js");
    const app = express();
    peerServer = http.createServer(app);
    app.use("/", ExpressPeerServer(peerServer, { path: "/" }));
    return new Promise(ok => peerServer.listen(9000, "127.0.0.1", () => ok(true)));
  } catch { return Promise.resolve(false); }
}

(async () => {
  await new Promise(ok => site.listen(8765, "127.0.0.1", ok));
  const havePeer = await startPeer();
  const tests = ["table.e2e.cjs", "touch.e2e.cjs", "pinch.e2e.cjs", ...(havePeer ? ["online.e2e.cjs"] : [])];
  if (!havePeer) console.log("online.e2e.cjs skipped: install the dev packages peer and peerjs to run it");
  let failed = 0;
  for (const t of tests) {
    console.log(`\n== ${t}`);
    // asynchronous: this process also serves the site the test is loading
    const status = await new Promise(ok => spawn(process.execPath, [path.join(__dirname, t)], { stdio: "inherit", env: { ...process.env, BASE: "http://127.0.0.1:8765" } }).on("exit", ok));
    if (status !== 0) { failed++; console.log(`FAILED ${t}`); }
  }
  site.close(); peerServer?.close();
  console.log(failed ? `\n${failed} browser test file(s) failed` : "\nall browser tests passed");
  process.exit(failed ? 1 : 0);
})();
