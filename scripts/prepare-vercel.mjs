/**
 * Legacy hook kept for older Vercel project settings that still run:
 *   node scripts/prepare-vercel.mjs && pnpm --filter @workspace/service-dashboard run build
 *
 * Vercel-only deployment no longer needs this script — api/index.ts handles the API.
 */
console.log("prepare-vercel: no-op (Vercel-only deployment)");
