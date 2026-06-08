import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router = Router();

type Trade = {
  date: string;
  ticker: string;
  direction: string;
  status: string;
  pl: number;
  cumulativePl: number;
  strategy: string;
  timeframe: string;
  rMultiple: number;
};

type TradesCache = {
  trades: Trade[];
  updatedAt: string;
  fetchedAt: number;
};

let cache: TradesCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchTrades(): Promise<{ trades: Trade[]; updatedAt: string }> {
  const apiKey = process.env.TRADRX_API_KEY;
  if (!apiKey) throw new Error("TRADRX_API_KEY not configured");

  const resp = await fetch("https://tradrx.io/api/public/shared/DAD01529995B/trades", {
    headers: { "X-API-Key": apiKey },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) throw new Error(`TradrX returned HTTP ${resp.status}`);

  const contentType = resp.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("TradrX trades endpoint returned non-JSON");
  }

  const data = await resp.json() as { trades: Trade[]; updatedAt: string };
  if (!Array.isArray(data.trades)) throw new Error("Unexpected response shape from TradrX");
  return data;
}

router.get("/public/trades", async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (!cache || now - cache.fetchedAt > CACHE_TTL_MS) {
      const data = await fetchTrades();
      cache = { ...data, fetchedAt: now };
      logger.info("TradrX trades fetched and cached");
    }
    res.json({ trades: cache.trades, updatedAt: cache.updatedAt });
  } catch (err) {
    logger.error({ err }, "Failed to fetch TradrX trades");
    res.status(502).json({ error: "Failed to fetch trades" });
  }
});

export default router;
