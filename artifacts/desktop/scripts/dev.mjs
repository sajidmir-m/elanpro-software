import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import waitOn from "wait-on";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const dashboardDir = path.join(repoRoot, "artifacts", "service-dashboard");
const desktopDir = path.join(repoRoot, "artifacts", "desktop");

const dashboardDev = spawn(
  "pnpm",
  ["--filter", "@workspace/service-dashboard", "run", "dev"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      VITE_APP_TARGET: "desktop",
    },
  },
);

dashboardDev.on("error", (error) => {
  console.error("Failed to start dashboard dev server:", error);
  process.exit(1);
});

await waitOn({
  resources: ["http://localhost:5173"],
  timeout: 120_000,
});

const electron = spawn("electron", ["."], {
  cwd: desktopDir,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    DASHBOARD_DEV_URL: "http://localhost:5173",
  },
});

const shutdown = () => {
  dashboardDev.kill();
  electron.kill();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

electron.on("exit", (code) => {
  dashboardDev.kill();
  process.exit(code ?? 0);
});
