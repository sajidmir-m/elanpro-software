import { unlinkSync } from "node:fs";

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.includes("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  try {
    unlinkSync(lockfile);
  } catch {
    // ignore missing files
  }
}
