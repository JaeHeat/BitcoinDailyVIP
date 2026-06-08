import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { tradrxStatsCacheTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const FALLBACK = {
  winRate: 70,
  avgMonthlyReturnMin: 5,
  avgMonthlyReturnMax: 10,
  tradesPerMonth: 20,
  profitFactor: 2.32,
  bestStreak: 11,
  totalTrades: null as number | null,
  instruments: [
    { ticker: "BTC", winRate: 63 },
    { ticker: "ETH", winRate: 79 },
    { ticker: "SOL", winRate: 80 },
  ],
  updatedAt: null as string | null,
  source: "fallback" as const,
};

export async function refreshTradrxStats(): Promise<{ ok: boolean; message: string }> {
  const apiKey = process.env.TRADRX_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "TRADRX_API_KEY not configured" };
  }

  const resp = await fetch("https://tradrx.io/api/public/shared/DAD01529995B/stats", {
    headers: { "X-API-Key": apiKey },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    throw new Error(`TradrX returned HTTP ${resp.status}`);
  }

  const contentType = resp.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("TradrX endpoint not yet deployed (returned HTML, expected JSON)");
  }

  const data = await resp.json() as Record<string, unknown>;

  const instruments = Array.isArray(data.instruments)
    ? (data.instruments as { ticker: string; winRate: number }[])
    : [];

  const round = (v: unknown) => typeof v === "number" ? Math.round(v) : undefined;

  await db.insert(tradrxStatsCacheTable).values({
    winRate: round(data.winRate),
    avgMonthlyReturnMin: round(data.avgMonthlyReturnMin),
    avgMonthlyReturnMax: round(data.avgMonthlyReturnMax),
    tradesPerMonth: round(data.tradesPerMonth),
    profitFactor: typeof data.profitFactor === "number" ? data.profitFactor : undefined,
    bestStreak: round(data.bestStreak),
    totalTrades: round(data.totalTrades),
    btcWinRate: round(instruments.find((i) => i.ticker === "BTC")?.winRate),
    ethWinRate: round(instruments.find((i) => i.ticker === "ETH")?.winRate),
    solWinRate: round(instruments.find((i) => i.ticker === "SOL")?.winRate),
    updatedAt: new Date(),
  });

  logger.info("TradrX stats refreshed and cached");
  return { ok: true, message: "Stats refreshed from TradrX" };
}

router.get("/public/stats", async (_req: Request, res: Response) => {
  try {
    const [row] = await db
      .select()
      .from(tradrxStatsCacheTable)
      .orderBy(desc(tradrxStatsCacheTable.updatedAt))
      .limit(1);

    if (!row) {
      res.json({ ...FALLBACK });
      return;
    }

    res.json({
      winRate: row.winRate ?? FALLBACK.winRate,
      avgMonthlyReturnMin: row.avgMonthlyReturnMin ?? FALLBACK.avgMonthlyReturnMin,
      avgMonthlyReturnMax: row.avgMonthlyReturnMax ?? FALLBACK.avgMonthlyReturnMax,
      tradesPerMonth: row.tradesPerMonth ?? FALLBACK.tradesPerMonth,
      profitFactor: row.profitFactor ?? FALLBACK.profitFactor,
      bestStreak: row.bestStreak ?? FALLBACK.bestStreak,
      totalTrades: row.totalTrades,
      instruments: [
        { ticker: "BTC", winRate: row.btcWinRate ?? 63 },
        { ticker: "ETH", winRate: row.ethWinRate ?? 79 },
        { ticker: "SOL", winRate: row.solWinRate ?? 80 },
      ],
      updatedAt: row.updatedAt,
      source: "live",
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch stats cache, using fallback");
    res.json({ ...FALLBACK });
  }
});

router.post("/stats/cron", async (req: Request, res: Response) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers["x-cron-secret"] !== cronSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const result = await refreshTradrxStats();
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Stats cron failed");
    res.status(502).json({ ok: false, message: String(err) });
  }
});

export default router;
