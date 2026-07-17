import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const dashboardDist = path.join(
  repoRoot,
  "artifacts",
  "service-dashboard",
  "dist",
  "public",
);
const desktopUiDir = path.join(repoRoot, "artifacts", "desktop", "ui");

if (!process.env.VITE_API_URL?.trim()) {
  console.error(
    "VITE_API_URL is required for desktop builds (e.g. https://your-api.railway.app)",
  );
  process.exit(1);
}

const build = spawnSync(
  "pnpm",
  ["--filter", "@workspace/service-dashboard", "run", "build"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      VITE_APP_TARGET: "desktop",
      BASE_PATH: "./",
    },
  },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

await rm(desktopUiDir, { recursive: true, force: true });
await mkdir(desktopUiDir, { recursive: true });
await cp(dashboardDist, desktopUiDir, { recursive: true });

console.log("Desktop UI bundle copied to artifacts/desktop/ui");
