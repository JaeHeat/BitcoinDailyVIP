import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { refreshTradrxStats } from "./routes/stats";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

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

  // Log Stripe key diagnostics at startup (safe — only length and last 6 chars)
  // BDV_STRIPE_API_KEY is the preferred key (set as shared env var); STRIPE_LIVE_API_KEY is the fallback.
  const activeKey = process.env.BDV_STRIPE_API_KEY ?? process.env.STRIPE_LIVE_API_KEY ?? "";
  logger.info(
    {
      activeKeyLen: activeKey.length,
      activeKeySuffix: activeKey.slice(-6) || "(empty)",
      source: process.env.BDV_STRIPE_API_KEY ? "BDV_STRIPE_API_KEY" : "STRIPE_LIVE_API_KEY",
    },
    "Stripe key loaded"
  );

  // Refresh TradrX stats daily at 12:30pm Eastern Time (after trading day)
  cron.schedule(
    "30 12 * * *",
    async () => {
      logger.info("TradrX stats refresh cron triggered");
      try {
        const result = await refreshTradrxStats();
        logger.info(result, "TradrX stats refresh complete");
      } catch (err) {
        logger.error({ err }, "TradrX stats refresh failed");
      }
    },
    { timezone: "America/New_York" },
  );

  logger.info("TradrX stats cron scheduled for 12:30pm ET daily");
});
