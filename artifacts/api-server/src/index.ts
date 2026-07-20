import app from "./app";
import { logger } from "./lib/logger";
import { getCachedEnrichedTickets, getCachedTableRows } from "./lib/data-cache";

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Warm ticket snapshots in the background so the first dashboard hit is fast.
  void (async () => {
    const started = Date.now();
    try {
      await Promise.all([
        getCachedEnrichedTickets("active_tickets"),
        getCachedEnrichedTickets("closed_tickets"),
        getCachedTableRows("mrf_data"),
        getCachedTableRows("sales_data"),
      ]);
      logger.info({ ms: Date.now() - started }, "Data cache warmed");
    } catch (warmErr) {
      logger.warn({ err: warmErr }, "Data cache warm-up failed (will load on first request)");
    }
  })();
});
