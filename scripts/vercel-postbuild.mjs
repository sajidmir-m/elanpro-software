import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const uiSource = path.join(
  repoRoot,
  "artifacts",
  "service-dashboard",
  "dist",
  "public",
);
const uiTarget = path.join(repoRoot, "public");
const apiSource = path.join(repoRoot, "artifacts", "api-server", "dist", "app.mjs");
const apiTarget = path.join(repoRoot, "api", "app.mjs");

await rm(uiTarget, { recursive: true, force: true });
await mkdir(uiTarget, { recursive: true });
await cp(uiSource, uiTarget, { recursive: true });

await mkdir(path.dirname(apiTarget), { recursive: true });
await cp(apiSource, apiTarget);

console.log(`Synced UI: ${uiSource} → ${uiTarget}`);
console.log(`Synced API: ${apiSource} → ${apiTarget}`);
