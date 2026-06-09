import { Router, type Request, type Response } from "express";
import { requireAuth, requireMemberAccess, requireAdmin, getOrCreateUser } from "../lib/auth";
import { db } from "@workspace/db";
import { reviewsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// Reviews open only AFTER a member has paid for their 2nd month AND been in the
// Discord ~30 days — i.e. an engaged, retained, paying customer (not a trialer).
// ~37 days = 7-day trial + 30 days of month 1 ≈ the 2nd-month charge. For exact
// "2nd month paid" detection, production should also confirm via Stripe invoice
// count (see HANDOFF.md) — this is the no-Stripe-call proxy.
const ELIGIBLE_AFTER_DAYS = 37;
const MAX_BODY = 1000;
const MAX_NAME = 60;
const MAX_RESULT = 80;

function daysSince(d: Date | null): number {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

type EligibilityReason = null | "trialing" | "not_in_discord" | "too_soon";

function checkEligibility(user: {
  subscriptionStatus: string | null;
  discordUserId: string | null;
  createdAt: Date | null;
}): { eligible: boolean; reason: EligibilityReason; daysUntilEligible: number } {
  const tenure = daysSince(user.createdAt);
  const daysUntilEligible = Math.max(0, ELIGIBLE_AFTER_DAYS - tenure);
  // Must be a paying member (renewed past the trial), not trialing.
  if (user.subscriptionStatus !== "active") {
    return { eligible: false, reason: "trialing", daysUntilEligible };
  }
  if (!user.discordUserId) {
    return { eligible: false, reason: "not_in_discord", daysUntilEligible };
  }
  if (tenure < ELIGIBLE_AFTER_DAYS) {
    return { eligible: false, reason: "too_soon", daysUntilEligible };
  }
  return { eligible: true, reason: null, daysUntilEligible: 0 };
}

// ── Public: approved reviews for the landing page ──────────────────────────
router.get("/public/reviews", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: reviewsTable.id,
        authorName: reviewsTable.authorName,
        rating: reviewsTable.rating,
        result: reviewsTable.result,
        body: reviewsTable.body,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "approved"))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(12);
    res.json({ reviews: rows });
  } catch {
    res.json({ reviews: [] });
  }
});

// ── Member: get own review eligibility/status ──────────────────────────────
router.get("/member/review", requireAuth, requireMemberAccess, async (req: Request, res: Response) => {
  try {
    const user = await getOrCreateUser(req.userId!);
    const { eligible, reason, daysUntilEligible } = checkEligibility(user);
    const existing = await db.query.reviewsTable.findFirst({
      where: eq(reviewsTable.userId, user.id),
      orderBy: desc(reviewsTable.createdAt),
    });
    res.json({
      eligible,
      reason,
      daysUntilEligible,
      existing: existing ? { status: existing.status, rating: existing.rating } : null,
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Member: submit a review ────────────────────────────────────────────────
router.post("/member/review", requireAuth, requireMemberAccess, async (req: Request, res: Response) => {
  try {
    const user = await getOrCreateUser(req.userId!);
    if (!checkEligibility(user).eligible) {
      res.status(403).json({ error: "Reviews open once you're a paying member, in the Discord, past your first month." });
      return;
    }
    const existing = await db.query.reviewsTable.findFirst({ where: eq(reviewsTable.userId, user.id) });
    if (existing) {
      res.status(409).json({ error: "You've already submitted a review." });
      return;
    }

    const { rating, body, authorName, result } = req.body as {
      rating?: number;
      body?: string;
      authorName?: string;
      result?: string;
    };
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      res.status(400).json({ error: "Rating must be 1–5." });
      return;
    }
    if (!body?.trim()) {
      res.status(400).json({ error: "Review text is required." });
      return;
    }
    const name = (authorName?.trim() || user.email.split("@")[0] || "Member").slice(0, MAX_NAME);

    await db.insert(reviewsTable).values({
      userId: user.id,
      authorName: name,
      rating: r,
      result: result?.trim()?.slice(0, MAX_RESULT) || null,
      body: body.trim().slice(0, MAX_BODY),
      status: "pending",
    });

    res.json({ ok: true, status: "pending" });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: list reviews for moderation ─────────────────────────────────────
router.get("/admin/reviews", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: reviewsTable.id,
        authorName: reviewsTable.authorName,
        rating: reviewsTable.rating,
        result: reviewsTable.result,
        body: reviewsTable.body,
        status: reviewsTable.status,
        createdAt: reviewsTable.createdAt,
        email: usersTable.email,
      })
      .from(reviewsTable)
      .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .orderBy(desc(reviewsTable.createdAt));
    res.json({ reviews: rows });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: approve / reject a review ───────────────────────────────────────
router.post("/admin/reviews/:id/moderate", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const { action } = req.body as { action?: string };
    if (action !== "approve" && action !== "reject") {
      res.status(400).json({ error: "action must be 'approve' or 'reject'" });
      return;
    }
    await db
      .update(reviewsTable)
      .set({ status: action === "approve" ? "approved" : "rejected" })
      .where(and(eq(reviewsTable.id, id)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
