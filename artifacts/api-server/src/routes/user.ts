import { Router, type Request, type Response } from "express";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/user/progress — return completed Getting Started module IDs
router.get("/user/progress", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getOrCreateUser(req.userId!);
    const completed: string[] = user.gettingStartedCompleted
      ? (JSON.parse(user.gettingStartedCompleted) as string[])
      : [];
    res.json({ completed });
  } catch {
    res.json({ completed: [] });
  }
});

// POST /api/user/progress — save completed Getting Started module IDs
router.post("/user/progress", requireAuth, async (req: Request, res: Response) => {
  try {
    const { completed } = req.body as { completed: string[] };
    if (!Array.isArray(completed)) {
      res.status(400).json({ error: "completed must be an array" });
      return;
    }
    await db
      .update(usersTable)
      .set({ gettingStartedCompleted: JSON.stringify(completed), updatedAt: new Date() })
      .where(eq(usersTable.clerkId, req.userId!));
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// POST /api/user/mark-review — record that the user left a review
router.post("/user/mark-review", requireAuth, async (req: Request, res: Response) => {
  try {
    await db
      .update(usersTable)
      .set({ reviewLeftAt: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.clerkId, req.userId!));
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// GET /api/user/journey — aggregated journey state for the portal tracker
router.get("/user/journey", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getOrCreateUser(req.userId!);
    const gsModules: string[] = user.gettingStartedCompleted
      ? (JSON.parse(user.gettingStartedCompleted) as string[])
      : [];
    res.json({
      gsCompleted: gsModules.length,
      discordConnected: !!user.discordUserId,
      reviewLeft: !!user.reviewLeftAt,
    });
  } catch {
    res.json({ gsCompleted: 0, discordConnected: false, reviewLeft: false });
  }
});

export default router;
