#!/usr/bin/env node
// Prerender index.html from the built Nitro worker so the app can be
// deployed as a fully static site (e.g. Vercel with no server functions).
// Run AFTER `vite build`:  node scripts/prerender-index.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workerPath = join(root, ".output", "server", "index.mjs");
const outPath = join(root, ".output", "public", "index.html");

const mod = await import(workerPath);
const req = new Request("http://localhost/", { headers: { host: "localhost" } });
const res = await mod.default.fetch(req, {}, { waitUntil() {} });
if (!res.ok) {
  console.error(`prerender failed: HTTP ${res.status}`);
  process.exit(1);
}
const html = await res.text();
writeFileSync(outPath, html);
console.log(`prerendered ${outPath} (${html.length} bytes)`);
