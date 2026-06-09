import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  cancellationSurveysTable,
  discordSyncLogsTable,
  emailJobsTable,
} from "@workspace/db/schema";
import { requireAuth, requireAdmin } from "../lib/auth";
import { getStripe } from "../lib/stripe";
import {
  eq,
  sql,
  gte,
  and,
  ilike,
  desc,
  isNotNull,
  isNull,
} from "drizzle-orm";

const router = Router();

router.use(requireAuth, requireAdmin);

/**
 * GET /admin/stats
 * Full business metrics: volume, MRR, subscriber counts, trials, churn.
 */
router.get("/admin/stats", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startOfMonthUnix = Math.floor(startOfMonth.getTime() / 1000);

    // ── DB queries (run in parallel) ──────────────────────────────────────────
    const [
      statusCounts,
      churnedRow,
      newSubscribersRow,
      newUsersRow,
      newTrialsRow,
      totalTrialedRow,
      convertedTrialsRow,
      discordFailRow,
      totalRow,
    ] = await Promise.all([
      // Subscription status breakdown
      db
        .select({
          status: usersTable.subscriptionStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(usersTable)
        .where(isNotNull(usersTable.subscriptionStatus))
        .groupBy(usersTable.subscriptionStatus),

      // Churned this month
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.subscriptionStatus, "canceled"),
            gte(usersTable.updatedAt, startOfMonth),
          ),
        ),

      // New paid subscribers this month (active, created this month)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(
          and(
            gte(usersTable.createdAt, startOfMonth),
            eq(usersTable.subscriptionStatus, "active"),
          ),
        ),

      // New users this month (any status)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(gte(usersTable.createdAt, startOfMonth)),

      // New trials started this month
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(gte(usersTable.trialStartedAt, startOfMonth)),

      // All users who ever trialed
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(isNotNull(usersTable.trialStartedAt)),

      // Trials that converted to active
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(
          and(
            isNotNull(usersTable.trialStartedAt),
            eq(usersTable.subscriptionStatus, "active"),
          ),
        ),

      // Discord sync failures in last 24 h
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(discordSyncLogsTable)
        .where(
          and(
            eq(discordSyncLogsTable.success, false),
            gte(discordSyncLogsTable.createdAt, last24h),
          ),
        ),

      // Total subscribers ever
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(isNotNull(usersTable.subscriptionStatus)),
    ]);

    const getCount = (status: string) =>
      statusCounts.find((r) => r.status === status)?.count ?? 0;

    const activeSubscribers = getCount("active");
    const pausedSubscribers = getCount("paused");
    const churnedThisMonth = churnedRow[0]?.count ?? 0;
    const newSubscribersThisMonth = newSubscribersRow[0]?.count ?? 0;
    const newUsersThisMonth = newUsersRow[0]?.count ?? 0;
    const newTrialsThisMonth = newTrialsRow[0]?.count ?? 0;
    const totalTrialed = totalTrialedRow[0]?.count ?? 0;
    const convertedTrials = convertedTrialsRow[0]?.count ?? 0;
    const discordSyncFailures = discordFailRow[0]?.count ?? 0;
    const totalSubscribers = totalRow[0]?.count ?? 0;

    const trialConversionRate =
      totalTrialed > 0
        ? Math.round((convertedTrials / totalTrialed) * 100)
        : 0;

    const churnBase = activeSubscribers + churnedThisMonth;
    const churnRate =
      churnBase > 0
        ? parseFloat(((churnedThisMonth / churnBase) * 100).toFixed(1))
        : 0;

    // ── Stripe volume (gross & net for current month) ─────────────────────────
    let grossVolume = 0;
    let netVolume = 0;
    try {
      const stripe = getStripe();
      const [chargesRes, refundsRes] = await Promise.all([
        stripe.charges.list({ created: { gte: startOfMonthUnix }, limit: 100 }),
        stripe.refunds.list({ created: { gte: startOfMonthUnix }, limit: 100 }),
      ]);
      grossVolume = chargesRes.data
        .filter((c) => c.status === "succeeded")
        .reduce((sum, c) => sum + c.amount, 0);
      const refundTotal = refundsRes.data.reduce((sum, r) => sum + r.amount, 0);
      netVolume = grossVolume - refundTotal;
    } catch {
      // Stripe not configured or quota exceeded — degrade gracefully
    }

    res.json({
      mrr: activeSubscribers * 99,
      grossVolume: Math.round(grossVolume / 100), // dollars
      netVolume: Math.round(netVolume / 100),     // dollars
      activeSubscribers,
      pausedSubscribers,
      newUsersThisMonth,
      newSubscribersThisMonth,
      newTrialsThisMonth,
      trialConversionRate,
      churnedThisMonth,
      churnRate,
      discordSyncFailures,
      totalSubscribers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /admin/subscribers
 * Paginated list with optional status/search filters.
 */
router.get("/admin/subscribers", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];

    if (status && status !== "all") {
      conditions.push(eq(usersTable.subscriptionStatus, status));
    }

    if (search && search.trim()) {
      conditions.push(ilike(usersTable.email, `%${search.trim()}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(where);

    const rows = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        subscriptionStatus: usersTable.subscriptionStatus,
        planTier: usersTable.planTier,
        discordUserId: usersTable.discordUserId,
        discordUsername: usersTable.discordUsername,
        joinedAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(where)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      subscribers: rows.map((r) => ({
        id: r.id,
        email: r.email,
        subscriptionStatus: r.subscriptionStatus ?? "none",
        planTier: r.planTier ?? null,
        discordConnected: !!r.discordUserId,
        discordUsername: r.discordUsername ?? null,
        joinedAt: r.joinedAt.toISOString(),
      })),
      total: countRow?.count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /admin/churn-chart
 * Daily new-subscriber and cancellation counts for the last N days.
 */
router.get("/admin/churn-chart", async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const newByDay = await db
      .select({
        date: sql<string>`DATE_TRUNC('day', ${usersTable.createdAt})::text`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(usersTable)
      .where(gte(usersTable.createdAt, startDate))
      .groupBy(sql`DATE_TRUNC('day', ${usersTable.createdAt})`)
      .orderBy(sql`DATE_TRUNC('day', ${usersTable.createdAt})`);

    const churnByDay = await db
      .select({
        date: sql<string>`DATE_TRUNC('day', ${usersTable.updatedAt})::text`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.subscriptionStatus, "canceled"),
          gte(usersTable.updatedAt, startDate),
        ),
      )
      .groupBy(sql`DATE_TRUNC('day', ${usersTable.updatedAt})`)
      .orderBy(sql`DATE_TRUNC('day', ${usersTable.updatedAt})`);

    const dateMap = new Map<string, { newSubscribers: number; churned: number }>();
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dateMap.set(d.toISOString().slice(0, 10), { newSubscribers: 0, churned: 0 });
    }

    for (const row of newByDay) {
      const key = row.date.slice(0, 10);
      const entry = dateMap.get(key);
      if (entry) entry.newSubscribers = row.count;
    }

    for (const row of churnByDay) {
      const key = row.date.slice(0, 10);
      const entry = dateMap.get(key);
      if (entry) entry.churned = row.count;
    }

    res.json({
      days,
      data: Array.from(dateMap.entries()).map(([date, vals]) => ({ date, ...vals })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /admin/winback-stats
 * Win-back email aggregate stats — admin-namespaced alias.
 */
router.get("/admin/winback-stats", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        jobType: emailJobsTable.jobType,
        total: sql<number>`count(*)::int`,
        sent: sql<number>`count(case when ${emailJobsTable.sentAt} is not null then 1 end)::int`,
        opened: sql<number>`count(case when ${emailJobsTable.openedAt} is not null then 1 end)::int`,
        clicked: sql<number>`count(case when ${emailJobsTable.clickedAt} is not null then 1 end)::int`,
      })
      .from(emailJobsTable)
      .groupBy(emailJobsTable.jobType);

    const [cancelledRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailJobsTable)
      .where(eq(emailJobsTable.cancelled, true));

    const [rejoinedRow] = await db
      .select({ count: sql<number>`count(distinct ${emailJobsTable.userId})::int` })
      .from(emailJobsTable)
      .innerJoin(usersTable, eq(emailJobsTable.userId, usersTable.id))
      .where(
        and(
          eq(usersTable.subscriptionStatus, "active"),
          eq(emailJobsTable.cancelled, true),
        ),
      );

    res.json({
      total: rows.reduce((s, r) => s + r.total, 0),
      sent: rows.reduce((s, r) => s + r.sent, 0),
      opened: rows.reduce((s, r) => s + r.opened, 0),
      clicked: rows.reduce((s, r) => s + r.clicked, 0),
      cancelled: cancelledRow?.count ?? 0,
      rejoined: rejoinedRow?.count ?? 0,
      byType: rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /admin/survey-results
 * Cancellation survey breakdown by reason.
 */
router.get("/admin/survey-results", async (_req: Request, res: Response) => {
  try {
    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cancellationSurveysTable);

    const [offerRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cancellationSurveysTable)
      .where(eq(cancellationSurveysTable.offerAccepted, true));

    const reasonRows = await db
      .select({
        reason: cancellationSurveysTable.reason,
        count: sql<number>`count(*)::int`,
      })
      .from(cancellationSurveysTable)
      .groupBy(cancellationSurveysTable.reason)
      .orderBy(desc(sql`count(*)`));

    const total = totalRow?.count ?? 0;

    res.json({
      total,
      offerAcceptedCount: offerRow?.count ?? 0,
      reasons: reasonRows.map((r) => ({
        reason: r.reason,
        count: r.count,
        percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// GET /admin/members/:id — full member profile + Stripe charge history
router.get("/admin/members/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "Member not found" }); return; }

    let charges: Array<{
      id: string; amount: number; currency: string; status: string;
      created: string; refunded: boolean; amountRefunded: number;
      receiptUrl: string | null; description: string | null;
    }> = [];

    if (user.stripeCustomerId) {
      try {
        const stripe = getStripe();
        const stripeCharges = await stripe.charges.list({
          customer: user.stripeCustomerId,
          limit: 50,
        });
        charges = stripeCharges.data.map((c) => ({
          id: c.id,
          amount: c.amount,
          currency: c.currency,
          status: c.status,
          created: new Date(c.created * 1000).toISOString(),
          refunded: c.refunded,
          amountRefunded: c.amount_refunded,
          receiptUrl: c.receipt_url ?? null,
          description: c.description ?? null,
        }));
      } catch { /* Stripe not configured */ }
    }

    let liveSubscription: {
      trialEnd: string | null;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      cancelAt: string | null;
      paused: boolean;
      discountId: string | null;
      discountName: string | null;
      discountPercentOff: number | null;
      discountAmountOff: number | null;
      currentPriceId: string | null;
      currentPriceAmount: number | null;
      currentPriceCurrency: string | null;
      currentPriceInterval: string | null;
    } | null = null;

    if (user.subscriptionId) {
      try {
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(user.subscriptionId, {
          expand: ["discount.coupon"],
        });
        const paused = !!(sub as unknown as { pause_collection?: unknown }).pause_collection;
        const discount = sub.discount?.coupon as (typeof sub.discount.coupon & { percent_off?: number | null; amount_off?: number | null }) | null | undefined;
        const item = sub.items.data[0];
        liveSubscription = {
          trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
          paused,
          discountId: discount?.id ?? null,
          discountName: discount?.name ?? null,
          discountPercentOff: discount?.percent_off ?? null,
          discountAmountOff: discount?.amount_off ?? null,
          currentPriceId: item?.price.id ?? null,
          currentPriceAmount: item?.price.unit_amount ?? null,
          currentPriceCurrency: item?.price.currency ?? null,
          currentPriceInterval: item?.price.recurring?.interval ?? null,
        };
      } catch { /* Stripe not configured or sub deleted */ }
    }

    res.json({
      id: user.id,
      email: user.email,
      subscriptionStatus: user.subscriptionStatus ?? null,
      planTier: user.planTier ?? null,
      discordConnected: !!user.discordUserId,
      discordUsername: user.discordUsername ?? null,
      joinedAt: user.createdAt.toISOString(),
      manualTrialEndsAt: user.manualTrialEndsAt?.toISOString() ?? null,
      stripeCustomerId: user.stripeCustomerId ?? null,
      subscriptionId: user.subscriptionId ?? null,
      charges,
      liveSubscription,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// POST /admin/members/:id/add-days
router.post("/admin/members/:id/add-days", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { days } = req.body as { days: number };
    if (!days || days < 1 || days > 365) {
      res.status(400).json({ error: "days must be between 1 and 365" }); return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "Member not found" }); return; }

    const base = user.manualTrialEndsAt && user.manualTrialEndsAt > new Date()
      ? user.manualTrialEndsAt
      : new Date();
    const trialEndsAt = new Date(base);
    trialEndsAt.setDate(trialEndsAt.getDate() + days);

    await db.update(usersTable)
      .set({ manualTrialEndsAt: trialEndsAt, updatedAt: new Date() })
      .where(eq(usersTable.id, id));

    res.json({
      success: true,
      message: `${days} day(s) added for ${user.email}. Access through ${trialEndsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`,
      trialEndsAt: trialEndsAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// POST /admin/members/:id/refund
router.post("/admin/members/:id/refund", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { chargeId, amount } = req.body as { chargeId: string; amount?: number };
    if (!chargeId) { res.status(400).json({ error: "chargeId is required" }); return; }

    const stripe = getStripe();
    const refundParams: Parameters<typeof stripe.refunds.create>[0] = { charge: chargeId };
    if (amount && amount > 0) refundParams.amount = amount;

    const refund = await stripe.refunds.create(refundParams);

    res.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      message: `Refund of $${(refund.amount / 100).toFixed(2)} issued successfully.`,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// POST /admin/members/:id/cancel
router.post("/admin/members/:id/cancel", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { immediately } = req.body as { immediately: boolean };

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "Member not found" }); return; }
    if (!user.subscriptionId) { res.status(400).json({ error: "No active subscription found" }); return; }

    const stripe = getStripe();
    if (immediately) {
      await stripe.subscriptions.cancel(user.subscriptionId);
      await db.update(usersTable)
        .set({ subscriptionStatus: "canceled", subscriptionId: null, updatedAt: new Date() })
        .where(eq(usersTable.id, id));
      res.json({ success: true, message: "Subscription cancelled immediately." });
    } else {
      await stripe.subscriptions.update(user.subscriptionId, { cancel_at_period_end: true });
      res.json({ success: true, message: "Subscription scheduled to cancel at end of billing period." });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// POST /admin/members/:id/resume  (undo cancel-at-period-end OR unpause)
router.post("/admin/members/:id/resume", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "Member not found" }); return; }
    if (!user.subscriptionId) { res.status(400).json({ error: "No subscription found" }); return; }

    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(user.subscriptionId);
    const isPaused = !!(sub as unknown as { pause_collection?: unknown }).pause_collection;

    if (isPaused) {
      await stripe.subscriptions.update(user.subscriptionId, {
        pause_collection: "" as unknown as Parameters<typeof stripe.subscriptions.update>[1]["pause_collection"],
      });
      res.json({ success: true, message: "Subscription resumed from pause." });
    } else if (sub.cancel_at_period_end) {
      await stripe.subscriptions.update(user.subscriptionId, { cancel_at_period_end: false });
      res.json({ success: true, message: "Scheduled cancellation removed. Subscription will continue." });
    } else {
      res.json({ success: true, message: "Subscription is already active with no pending cancellation." });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// POST /admin/members/:id/pause
router.post("/admin/members/:id/pause", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "Member not found" }); return; }
    if (!user.subscriptionId) { res.status(400).json({ error: "No active subscription found" }); return; }

    const stripe = getStripe();
    await stripe.subscriptions.update(user.subscriptionId, {
      pause_collection: { behavior: "void" },
    });
    res.json({ success: true, message: "Subscription paused. No further charges until resumed." });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// POST /admin/members/:id/reset-trial
router.post("/admin/members/:id/reset-trial", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "Member not found" }); return; }

    const stripe = getStripe();
    if (user.subscriptionId) {
      try { await stripe.subscriptions.cancel(user.subscriptionId); } catch { /* already gone */ }
    }

    await db.update(usersTable)
      .set({
        subscriptionId: null,
        subscriptionStatus: null,
        planTier: null,
        trialStartedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id));

    res.json({ success: true, message: `Trial reset for ${user.email}. They can now start a fresh 7-day trial.` });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// POST /admin/members/:id/change-plan
router.post("/admin/members/:id/change-plan", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { priceType } = req.body as { priceType: string };

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "Member not found" }); return; }
    if (!user.subscriptionId) { res.status(400).json({ error: "No active subscription to change" }); return; }

    const PRICE_ENV_MAP: Record<string, string> = {
      monthly: "BDV_PRICE_MONTHLY",
      yearly: "BDV_PRICE_YEARLY",
      premium: "BDV_PRICE_PREMIUM",
      "premium-yearly": "BDV_PRICE_PREMIUM_YEARLY",
    };
    const envVar = PRICE_ENV_MAP[priceType];
    if (!envVar) { res.status(400).json({ error: `Unknown plan: ${priceType}` }); return; }
    const newPriceId = process.env[envVar];
    if (!newPriceId) { res.status(500).json({ error: `Price not configured for plan: ${priceType}` }); return; }

    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(user.subscriptionId);
    const item = sub.items.data[0];
    if (!item) { res.status(400).json({ error: "No subscription item found" }); return; }

    await stripe.subscriptions.update(user.subscriptionId, {
      items: [{ id: item.id, price: newPriceId }],
      proration_behavior: "create_prorations",
    });

    await db.update(usersTable)
      .set({ planTier: priceType, updatedAt: new Date() })
      .where(eq(usersTable.id, id));

    res.json({ success: true, message: `Plan changed to ${priceType} with prorations applied.` });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// POST /admin/members/:id/apply-coupon
router.post("/admin/members/:id/apply-coupon", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { couponId } = req.body as { couponId: string };
    if (!couponId) { res.status(400).json({ error: "couponId is required" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "Member not found" }); return; }
    if (!user.subscriptionId) { res.status(400).json({ error: "No active subscription found" }); return; }

    const stripe = getStripe();
    await stripe.subscriptions.update(
      user.subscriptionId,
      { discounts: [{ coupon: couponId }] } as Parameters<typeof stripe.subscriptions.update>[1],
    );

    res.json({ success: true, message: "Coupon applied to subscription." });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// POST /admin/members/:id/remove-discount
router.post("/admin/members/:id/remove-discount", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) { res.status(404).json({ error: "Member not found" }); return; }
    if (!user.subscriptionId) { res.status(400).json({ error: "No active subscription found" }); return; }

    const stripe = getStripe();
    await stripe.subscriptions.deleteDiscount(user.subscriptionId);

    res.json({ success: true, message: "Discount removed from subscription." });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// GET /admin/coupons — list Stripe coupons
router.get("/admin/coupons", async (_req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    const [coupons, promoCodes] = await Promise.all([
      stripe.coupons.list({ limit: 100 }),
      stripe.promotionCodes.list({ limit: 100, active: true }),
    ]);

    const promoByCode = new Map<string, string>();
    for (const p of promoCodes.data) {
      if (typeof p.coupon === "object" && p.coupon && "id" in p.coupon) {
        promoByCode.set(p.coupon.id as string, p.code);
      }
    }

    res.json({
      coupons: coupons.data.map((c) => ({
        id: c.id,
        name: c.name ?? null,
        percentOff: c.percent_off ?? null,
        amountOff: c.amount_off ?? null,
        currency: c.currency ?? null,
        duration: c.duration,
        durationInMonths: c.duration_in_months ?? null,
        valid: c.valid,
        timesRedeemed: c.times_redeemed,
        maxRedemptions: c.max_redemptions ?? null,
        promoCode: promoByCode.get(c.id) ?? null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// POST /admin/coupons — create a Stripe coupon (optionally with a promo code)
router.post("/admin/coupons", async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    const { name, percentOff, amountOff, currency, duration, durationInMonths, maxRedemptions, code } =
      req.body as {
        name: string; percentOff?: number; amountOff?: number; currency?: string;
        duration: "once" | "repeating" | "forever"; durationInMonths?: number;
        maxRedemptions?: number; code?: string;
      };

    if (!name || !duration) {
      res.status(400).json({ error: "name and duration are required" }); return;
    }
    if (!percentOff && !amountOff) {
      res.status(400).json({ error: "Either percentOff or amountOff is required" }); return;
    }

    const couponParams: Parameters<typeof stripe.coupons.create>[0] = { name, duration };
    if (percentOff) couponParams.percent_off = percentOff;
    if (amountOff) { couponParams.amount_off = amountOff; couponParams.currency = currency ?? "usd"; }
    if (duration === "repeating" && durationInMonths) couponParams.duration_in_months = durationInMonths;
    if (maxRedemptions) couponParams.max_redemptions = maxRedemptions;

    const coupon = await stripe.coupons.create(couponParams);

    let promoCodeStr: string | null = null;
    if (code) {
      const promo = await stripe.promotionCodes.create({ coupon: coupon.id, code });
      promoCodeStr = promo.code;
    }

    res.json({
      id: coupon.id,
      name: coupon.name ?? null,
      percentOff: coupon.percent_off ?? null,
      amountOff: coupon.amount_off ?? null,
      currency: coupon.currency ?? null,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months ?? null,
      valid: coupon.valid,
      timesRedeemed: coupon.times_redeemed,
      maxRedemptions: coupon.max_redemptions ?? null,
      promoCode: promoCodeStr,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
});

// POST /admin/grant-trial
router.post("/admin/grant-trial", async (req: Request, res: Response) => {
  try {
    const { email, days } = req.body as { email: string; days: number };

    if (!email || !days || days < 1 || days > 365) {
      res.status(400).json({ error: "Valid email and days (1–365) are required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(usersTable)
      .where(ilike(usersTable.email, normalizedEmail))
      .limit(1);

    if (!user) {
      res.status(404).json({
        error: `No account found for ${email}. The user must sign up first.`,
      });
      return;
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + days);

    await db
      .update(usersTable)
      .set({ manualTrialEndsAt: trialEndsAt, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));

    res.json({
      success: true,
      message: `${days}-day trial granted to ${email}. Expires ${trialEndsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`,
      trialEndsAt: trialEndsAt.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// GET /admin/review-submissions — list pending review submissions awaiting approval
router.get("/admin/review-submissions", async (_req: Request, res: Response) => {
  try {
    const pending = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        reviewSubmissionUrl: usersTable.reviewSubmissionUrl,
        subscriptionId: usersTable.subscriptionId,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(
        and(
          isNotNull(usersTable.reviewSubmissionUrl),
          isNull(usersTable.reviewLeftAt),
        ),
      )
      .orderBy(desc(usersTable.createdAt));

    res.json({ submissions: pending });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// POST /admin/review-approve/:userId — approve a review submission and apply 25% coupon
router.post("/admin/review-approve/:userId", async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    const userId = parseInt(String(req.params.userId), 10);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.reviewLeftAt) { res.status(409).json({ error: "Already approved" }); return; }
    if (!user.reviewSubmissionUrl) { res.status(400).json({ error: "No review submission found" }); return; }
    if (!user.subscriptionId) { res.status(400).json({ error: "User has no active subscription" }); return; }

    const coupon = await stripe.coupons.create({
      percent_off: 25,
      duration: "once",
      name: "25% off — thank you for your review",
      max_redemptions: 1,
    });

    await stripe.subscriptions.update(
      user.subscriptionId,
      { discounts: [{ coupon: coupon.id }] } as Parameters<typeof stripe.subscriptions.update>[1],
    );

    await db
      .update(usersTable)
      .set({ reviewLeftAt: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    res.json({ success: true, email: user.email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
