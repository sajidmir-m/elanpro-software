import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const source = path.join(
  repoRoot,
  "artifacts",
  "service-dashboard",
  "dist",
  "public",
);
const target = path.join(repoRoot, "public");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

console.log(`Synced Vercel output: ${source} → ${target}`);
