import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const vercelConfigPath = path.join(repoRoot, "vercel.json");

const apiOrigin = process.env.API_ORIGIN?.trim();

if (!apiOrigin) {
  console.log("API_ORIGIN not set — keeping vercel.json rewrites as-is.");
  process.exit(0);
}

const normalizedOrigin = apiOrigin.replace(/\/+$/, "");
const config = JSON.parse(await readFile(vercelConfigPath, "utf8"));

config.rewrites = (config.rewrites ?? []).map((rewrite) => {
  if (rewrite.source === "/api/:path*") {
    return {
      ...rewrite,
      destination: `${normalizedOrigin}/api/:path*`,
    };
  }
  return rewrite;
});

await writeFile(vercelConfigPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Updated vercel.json API proxy to ${normalizedOrigin}`);
