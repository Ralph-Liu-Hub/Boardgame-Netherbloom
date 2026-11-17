// Every script the browser loads must parse: a syntax error in one module stops the whole table from starting.
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "assets");
const files = readdirSync(dir).filter(f => f.endsWith(".js"));
for (const f of files) execFileSync(process.execPath, ["--check", join(dir, f)], { stdio: "inherit" });
console.log(`syntax ok (${files.length} scripts)`);
