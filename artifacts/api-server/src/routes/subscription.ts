import { Router, type Request, type Response } from "express";
import { getStripe } from "../lib/stripe";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { db } from "@workspace/db";
import { usersTable, cancellationSurveysTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type Stripe from "stripe";
import { getPlanTier, getPlanTierFromSub } from "../lib/plan-tiers";
import { getUncachableResendClient } from "../lib/resend";

const router = Router();

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// How many days a pause lasts before billing automatically resumes
const PAUSE_DURATION_DAYS = 30;

function getRequestOrigin(req: Request): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const primary = domains.split(",")[0].trim();
    return `https://${primary}`;
  }
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)
      ?.split(",")[0]
      ?.trim() || req.protocol;
  const host = req.headers.host || "localhost";
  return `${proto}://${host}`;
}

/**
 * Extract current_period_end from a Stripe Subscription at runtime.
 * Stripe v2026 removed it from the TypeScript type surface but still
 * returns it in the JSON response, so we read it safely via unknown.
 * In some API versions the field moved to subscription items.
 */
function getPeriodEnd(sub: Stripe.Subscription): number | null {
  const raw = sub as unknown as Record<string, unknown>;
  // Top-level (v2024 and earlier Stripe API versions)
  if (typeof raw["current_period_end"] === "number") return raw["current_period_end"] as number;
  // Subscription item level (some v2025+ API versions)
  const items = raw["items"] as { data: Array<Record<string, unknown>> } | undefined;
  const firstItem = items?.data?.[0];
  if (firstItem && typeof firstItem["current_period_end"] === "number") return firstItem["current_period_end"] as number;
  // For trialing subs: trial_end is when billing kicks in
  if (typeof raw["trial_end"] === "number") return raw["trial_end"] as number;
  return null;
}

function buildStatusResponse(
  user: typeof usersTable.$inferSelect,
  stripeSubscription?: Stripe.Subscription,
) {
  const pauseCollection = stripeSubscription?.pause_collection ?? null;
  const paused = !!pauseCollection;

  // resumes_at is epoch seconds provided by Stripe when a scheduled resume exists
  const resumeAt = pauseCollection?.resumes_at ?? null;
  const resumeDate = resumeAt
    ? new Date(resumeAt * 1000).toISOString()
    : null;

  const periodEnd = stripeSubscription ? getPeriodEnd(stripeSubscription) : null;

  // Derive authoritative status from Stripe when available; fall back to DB
  const status = stripeSubscription
    ? paused
      ? "paused"
      : stripeSubscription.status
    : (user.subscriptionStatus ?? "none");

  return {
    subscriptionId: user.subscriptionId ?? null,
    status,
    planTier: user.planTier ?? null,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    resumeDate,
    cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end ?? false,
    paused,
    reviewDiscountClaimed: !!user.reviewLeftAt,
    reviewPending: !!user.reviewSubmissionUrl && !user.reviewLeftAt,
  };
}

const EMPTY_STATUS = {
  subscriptionId: null,
  status: "none",
  planTier: null,
  currentPeriodEnd: null,
  resumeDate: null,
  cancelAtPeriodEnd: false,
  paused: false,
  reviewDiscountClaimed: false,
  reviewPending: false,
} as const;

// GET /subscription/status
router.get(
  "/subscription/status",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const stripe = getStripe();
      let user = await getOrCreateUser(req.userId!);

      // If a checkout session_id is provided, look it up directly from Stripe
      // so we don't depend on the webhook having fired yet.
      const sessionId = req.query.session_id as string | undefined;
      if (sessionId && !user.subscriptionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["subscription"],
          });
          // Security: only trust this session if it was created for the current user.
          // Prevents session ID replay attacks where a paid session from account A is
          // submitted by account B to clone paid status.
          const sessionOwner = session.metadata?.clerkUserId;
          const customerMatches =
            !user.stripeCustomerId ||
            !session.customer ||
            session.customer === user.stripeCustomerId ||
            (typeof session.customer === "object" && (session.customer as { id: string }).id === user.stripeCustomerId);
          if (
            sessionOwner === req.userId! &&
            customerMatches &&
            session.subscription &&
            typeof session.subscription === "object"
          ) {
            const sub = session.subscription as Stripe.Subscription;
            // Resolve plan tier from session metadata or price ID
            const planTier = session.metadata?.priceType
              ? (session.metadata.priceType as ReturnType<typeof getPlanTier>)
              : getPlanTierFromSub(sub);
            // Persist to DB so subsequent requests don't need the session_id
            await db
              .update(usersTable)
              .set({
                subscriptionId: sub.id,
                subscriptionStatus: sub.status,
                planTier,
                ...(sub.status === "trialing" ? { trialStartedAt: new Date() } : {}),
                updatedAt: new Date(),
              })
              .where(eq(usersTable.clerkId, req.userId!));
            const updatedUser = { ...user, subscriptionId: sub.id, subscriptionStatus: sub.status, planTier };
            res.json(buildStatusResponse(updatedUser, sub));
            return;
          }
        } catch {
          // Fall through to normal flow if session lookup fails
        }
      }

      if (!user.subscriptionId) {
        // Check for an admin-granted manual trial
        if (user.manualTrialEndsAt && user.manualTrialEndsAt > new Date()) {
          res.json({
            ...EMPTY_STATUS,
            status: "trialing",
            currentPeriodEnd: user.manualTrialEndsAt.toISOString(),
          });
          return;
        }

        // Fallback: look up by email in Stripe for users who were manually added
        // or whose webhook couldn't link them (no clerkUserId in customer metadata).
        if (user.email) {
          try {
            const customers = await stripe.customers.list({ email: user.email, limit: 5 });
            for (const cust of customers.data) {
              const activeSubs = await stripe.subscriptions.list({
                customer: cust.id,
                status: "all",
                limit: 5,
              });
              const liveSub = activeSubs.data.find((s) =>
                ["trialing", "active", "past_due"].includes(s.status),
              );
              if (liveSub) {
                const planTier = getPlanTierFromSub(liveSub);
                // Persist the link so future calls don't need to search Stripe
                await db
                  .update(usersTable)
                  .set({
                    stripeCustomerId: user.stripeCustomerId ?? cust.id,
                    subscriptionId: liveSub.id,
                    subscriptionStatus: liveSub.status,
                    planTier,
                    ...(liveSub.status === "trialing" ? { trialStartedAt: new Date() } : {}),
                    updatedAt: new Date(),
                  })
                  .where(eq(usersTable.clerkId, req.userId!));
                const updatedUser = {
                  ...user,
                  stripeCustomerId: user.stripeCustomerId ?? cust.id,
                  subscriptionId: liveSub.id,
                  subscriptionStatus: liveSub.status,
                  planTier,
                };
                res.json(buildStatusResponse(updatedUser, liveSub));
                return;
              }
            }
          } catch {
            // Stripe lookup failed — fall through to EMPTY_STATUS
          }
        }

        res.json(EMPTY_STATUS);
        return;
      }
      let subscription: Stripe.Subscription;
      try {
        subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
      } catch (stripeErr: unknown) {
        // Subscription no longer exists in Stripe (deleted, or test/live key mismatch).
        // Clear the stale ID so future requests don't repeat this lookup.
        const stripeCode = (stripeErr as { code?: string })?.code;
        if (stripeCode === "resource_missing" || stripeCode === "subscription_not_found") {
          await db
            .update(usersTable)
            .set({ subscriptionId: null, subscriptionStatus: null, updatedAt: new Date() })
            .where(eq(usersTable.clerkId, req.userId!));
        }
        res.json(EMPTY_STATUS);
        return;
      }

      // Backfill planTier if it's missing or a legacy value (e.g. old hardcoded "vip")
      const knownTiers = new Set(["monthly", "yearly", "premium", "premium-yearly"]);
      if (!user.planTier || !knownTiers.has(user.planTier)) {
        const derived = getPlanTierFromSub(subscription);
        if (derived) {
          await db
            .update(usersTable)
            .set({ planTier: derived, updatedAt: new Date() })
            .where(eq(usersTable.clerkId, req.userId!));
          user = { ...user, planTier: derived };
        }
      }

      const statusResponse = buildStatusResponse(user, subscription);

      // Detect a scheduled plan change (downgrade via subscription schedule)
      let scheduledPlanChange: { planTier: string | null; date: string } | null = null;
      if (subscription.schedule && typeof subscription.schedule === "string") {
        try {
          const sched = await stripe.subscriptionSchedules.retrieve(subscription.schedule);
          if (sched.status === "active" && sched.phases.length > 1) {
            const nextPhase = sched.phases[1]!;
            const rawPrice = nextPhase.items[0]?.price;
            const priceId = typeof rawPrice === "string" ? rawPrice : (rawPrice as { id?: string })?.id ?? null;
            if (priceId && nextPhase.start_date) {
              scheduledPlanChange = {
                planTier: getPlanTier(priceId) ?? null,
                date: new Date(nextPhase.start_date * 1000).toISOString(),
              };
            }
          }
        } catch {
          // swallow — schedule data is best-effort
        }
      }

      // If period end is still null (field moved in newer Stripe API versions),
      // fall back to the upcoming invoice which always carries the billing date.
      if (!statusResponse.currentPeriodEnd) {
        try {
          const preview = await stripe.invoices.createPreview({ subscription: user.subscriptionId! });
          const raw = preview as unknown as Record<string, unknown>;
          const previewPeriodEnd = raw["period_end"] ?? raw["next_payment_attempt"];
          if (typeof previewPeriodEnd === "number") {
            res.json({ ...statusResponse, currentPeriodEnd: new Date(previewPeriodEnd * 1000).toISOString(), scheduledPlanChange });
            return;
          }
        } catch {
          // swallow — period end just stays null
        }
      }

      res.json({ ...statusResponse, scheduledPlanChange });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// POST /subscription/pause
router.post(
  "/subscription/pause",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateUser(req.userId!);
      if (!user.subscriptionId) {
        res.status(400).json({ error: "No active subscription" });
        return;
      }

      // Schedule billing to auto-resume after PAUSE_DURATION_DAYS
      const resumesAt = Math.floor(Date.now() / 1000) + PAUSE_DURATION_DAYS * 86400;

      const stripe = getStripe();
      const subscription = (await stripe.subscriptions.update(
        user.subscriptionId,
        { pause_collection: { behavior: "void", resumes_at: resumesAt } },
      ));

      await db
        .update(usersTable)
        .set({ subscriptionStatus: "paused", updatedAt: new Date() })
        .where(eq(usersTable.clerkId, req.userId!));

      res.json(buildStatusResponse(user, subscription));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// POST /subscription/resume
router.post(
  "/subscription/resume",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateUser(req.userId!);
      if (!user.subscriptionId) {
        res.status(400).json({ error: "No subscription found" });
        return;
      }

      const stripe = getStripe();
      // null clears pause_collection and immediately resumes billing
      const subscription = (await stripe.subscriptions.update(
        user.subscriptionId,
        { pause_collection: null } as Stripe.SubscriptionUpdateParams,
      ));

      await db
        .update(usersTable)
        .set({ subscriptionStatus: subscription.status, updatedAt: new Date() })
        .where(eq(usersTable.clerkId, req.userId!));

      res.json(buildStatusResponse(user, subscription));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// POST /subscription/cancel
router.post(
  "/subscription/cancel",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateUser(req.userId!);
      if (!user.subscriptionId) {
        res.status(400).json({ error: "No active subscription" });
        return;
      }

      const stripe = getStripe();
      const subscription = (await stripe.subscriptions.update(
        user.subscriptionId,
        { cancel_at_period_end: true },
      ));

      await db
        .update(usersTable)
        .set({ updatedAt: new Date() })
        .where(eq(usersTable.clerkId, req.userId!));

      res.json(buildStatusResponse(user, subscription));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// POST /subscription/reactivate
router.post(
  "/subscription/reactivate",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateUser(req.userId!);
      if (!user.subscriptionId) {
        res.status(400).json({ error: "No subscription found" });
        return;
      }
      const stripe = getStripe();
      const subscription = (await stripe.subscriptions.update(
        user.subscriptionId,
        { cancel_at_period_end: false },
      ));
      res.json(buildStatusResponse(user, subscription));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// POST /subscription/portal
router.post(
  "/subscription/portal",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateUser(req.userId!);
      if (!user.stripeCustomerId) {
        res.status(400).json({ error: "No billing account found" });
        return;
      }

      const stripe = getStripe();
      const origin = getRequestOrigin(req);
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${origin}/portal`,
      });

      res.json({ url: session.url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// POST /subscription/change-plan
router.post(
  "/subscription/change-plan",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateUser(req.userId!);
      if (!user.subscriptionId) {
        res.status(400).json({ error: "No active subscription to change" });
        return;
      }

      const { priceType } = req.body as { priceType: string };
      const PRICE_ENV_MAP: Record<string, string> = {
        monthly: "BDV_PRICE_MONTHLY",
        yearly: "BDV_PRICE_YEARLY",
        premium: "BDV_PRICE_PREMIUM",
        "premium-yearly": "BDV_PRICE_PREMIUM_YEARLY",
      };
      const envVar = PRICE_ENV_MAP[priceType];
      if (!envVar) {
        res.status(400).json({ error: `Unknown plan type: ${priceType}` });
        return;
      }
      const newPriceId = process.env[envVar];
      if (!newPriceId) {
        res.status(500).json({ error: `Price not configured for plan: ${priceType}` });
        return;
      }

      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);

      const currentItem = subscription.items.data[0];
      if (!currentItem) {
        res.status(400).json({ error: "Could not find subscription item to update" });
        return;
      }
      const currentPriceId = currentItem.price.id;
      const currentItemId = currentItem.id;

      // Determine upgrade vs downgrade by comparing monthly-equivalent rates
      const [currentPrice, newPrice] = await Promise.all([
        stripe.prices.retrieve(currentPriceId),
        stripe.prices.retrieve(newPriceId),
      ]);

      const monthlyRate = (p: Stripe.Price) => {
        const amount = p.unit_amount ?? 0;
        return p.recurring?.interval === "year" ? amount / 12 : amount;
      };

      const isDowngrade = monthlyRate(newPrice) < monthlyRate(currentPrice);
      const newPlanTier = getPlanTier(newPriceId);

      const PLAN_NAMES: Record<string, string> = {
        monthly: "VIP",
        yearly: "VIP Yearly",
        premium: "VIP Premium",
        "premium-yearly": "VIP Premium Yearly",
      };
      const planName = PLAN_NAMES[newPlanTier ?? ""] ?? newPlanTier ?? "your new plan";

      if (isDowngrade) {
        // ── Downgrade: schedule the change at the end of the current billing period ──
        const periodEnd = getPeriodEnd(subscription);
        if (!periodEnd) {
          res.status(400).json({ error: "Cannot schedule downgrade: current period end is unknown" });
          return;
        }

        // Create or reuse a subscription schedule so Phase 1 keeps current plan
        // and Phase 2 switches to the new (cheaper) plan at period end.
        let scheduleId: string;
        let phaseStart: number;

        if (subscription.schedule && typeof subscription.schedule === "string") {
          const existing = await stripe.subscriptionSchedules.retrieve(subscription.schedule);
          scheduleId = existing.id;
          phaseStart = existing.current_phase?.start_date ?? existing.phases[0]!.start_date;
        } else {
          const created = await stripe.subscriptionSchedules.create({
            from_subscription: user.subscriptionId,
          });
          scheduleId = created.id;
          phaseStart = created.current_phase?.start_date ?? created.phases[0]!.start_date;
        }

        await stripe.subscriptionSchedules.update(scheduleId, {
          end_behavior: "release",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          phases: [
            { start_date: phaseStart, end_date: periodEnd, items: [{ price: currentPriceId }] },
            { start_date: periodEnd, items: [{ price: newPriceId }] },
          ] as any,
        });

        // DB plan tier stays unchanged — it still reflects the current active plan
        const switchDate = new Date(periodEnd * 1000).toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        });

        if (user.email) {
          getUncachableResendClient()
            .then(({ client, fromEmail }) =>
              client.emails.send({
                from: fromEmail,
                to: user.email!,
                subject: `Plan change scheduled — switching to ${planName} on ${switchDate}`,
                html: `
                  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
                    <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;">Plan change scheduled ✓</h1>
                    <p style="color:#555;margin-bottom:12px;">Your plan will switch to <strong>${planName}</strong> on <strong>${switchDate}</strong>.</p>
                    <p style="color:#555;margin-bottom:12px;">Until then, you keep full access on your current plan — nothing changes today.</p>
                    <p style="color:#555;margin-bottom:20px;">You can manage your plan anytime from the <a href="https://bitcoindailyvip.com/portal" style="color:#f7931a;">member portal</a>.</p>
                    <p style="margin-top:24px;">— Bitcoin Daily VIP</p>
                  </div>
                `,
              }),
            )
            .catch(() => {});
        }

        const refreshedSub = await stripe.subscriptions.retrieve(user.subscriptionId);
        res.json({
          ...buildStatusResponse(user, refreshedSub),
          scheduledPlanChange: {
            planTier: newPlanTier,
            date: new Date(periodEnd * 1000).toISOString(),
          },
        });
        return;
      }

      // ── Upgrade: apply immediately with prorations ────────────────────────────
      const updated = await stripe.subscriptions.update(user.subscriptionId, {
        items: [{ id: currentItemId, price: newPriceId }],
        proration_behavior: "create_prorations",
      });

      await db
        .update(usersTable)
        .set({ planTier: newPlanTier, updatedAt: new Date() })
        .where(eq(usersTable.clerkId, req.userId!));

      const updatedUser = { ...user, planTier: newPlanTier };

      if (user.email) {
        const periodEnd = updated.current_period_end
          ? new Date(updated.current_period_end * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
          : null;

        getUncachableResendClient()
          .then(({ client, fromEmail }) =>
            client.emails.send({
              from: fromEmail,
              to: user.email!,
              subject: `You've switched to ${planName}`,
              html: `
                <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
                  <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;">Plan updated ✓</h1>
                  <p style="color:#555;margin-bottom:12px;">You're now on <strong>${planName}</strong>.</p>
                  ${periodEnd ? `<p style="color:#555;margin-bottom:12px;">Your next billing date is <strong>${periodEnd}</strong>. Stripe will prorate any difference on that invoice.</p>` : ""}
                  <p style="color:#555;margin-bottom:20px;">You can manage your plan anytime from the <a href="https://bitcoindailyvip.com/portal" style="color:#f7931a;">member portal</a>.</p>
                  <p style="margin-top:24px;">— Bitcoin Daily VIP</p>
                </div>
              `,
            }),
          )
          .catch(() => {});
      }

      res.json(buildStatusResponse(updatedUser, updated));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// POST /subscription/cancel-survey
router.post(
  "/subscription/cancel-survey",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { reason, offerAccepted } = req.body as {
        reason: string;
        offerAccepted: boolean;
      };

      const user = await getOrCreateUser(req.userId!);

      // Enforce permanent one-time eligibility BEFORE recording the survey row.
      // Checking first (rather than after insert) ensures the just-inserted row
      // isn't mistakenly found by the query, while still preventing repeat claims
      // after a prior discount has expired.
      if (offerAccepted) {
        const priorOffer = await db.query.cancellationSurveysTable.findFirst({
          where: and(
            eq(cancellationSurveysTable.userId, user.id),
            eq(cancellationSurveysTable.offerAccepted, true),
          ),
        });
        if (priorOffer) {
          res.status(409).json({ error: "Retention offer has already been used on this account" });
          return;
        }
      }

      await db.insert(cancellationSurveysTable).values({
        userId: user.id,
        reason,
        offerAccepted,
      });

      if (!user.subscriptionId) {
        res.json(EMPTY_STATUS);
        return;
      }

      const stripe = getStripe();

      if (offerAccepted) {
        const coupon = await stripe.coupons.create({
          percent_off: 20,
          duration: "repeating",
          duration_in_months: 2,
        });
        const subscription = (await stripe.subscriptions.update(
          user.subscriptionId,
          { discounts: [{ coupon: coupon.id }] },
        ));
        res.json(buildStatusResponse(user, subscription));
      } else {
        const subscription = (await stripe.subscriptions.update(
          user.subscriptionId,
          { cancel_at_period_end: true },
        ));
        res.json(buildStatusResponse(user, subscription));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// GET /user/progress — returns completed Getting Started module IDs
router.get(
  "/user/progress",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateUser(req.userId!);
      const completed = user.gettingStartedCompleted
        ? (JSON.parse(user.gettingStartedCompleted) as string[])
        : [];
      res.json({ completed });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// POST /subscription/review-submit — member submits proof-of-review URL for manual admin verification
router.post(
  "/subscription/review-submit",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateUser(req.userId!);

      if (user.reviewLeftAt) {
        res.status(409).json({ error: "Review discount already applied to your account" });
        return;
      }

      if (user.reviewSubmissionUrl) {
        res.status(409).json({ error: "Review already submitted and pending verification" });
        return;
      }

      const { reviewUrl } = req.body as { reviewUrl?: string };
      if (!reviewUrl?.trim()) {
        res.status(400).json({ error: "Review URL is required" });
        return;
      }

      // Basic sanity check — must be a Trustpilot review URL
      let parsed: URL;
      try { parsed = new URL(reviewUrl.trim()); } catch {
        res.status(400).json({ error: "Invalid URL" });
        return;
      }
      const hostname = parsed.hostname.toLowerCase();
      const isTrustpilot =
        parsed.protocol === "https:" &&
        (hostname === "trustpilot.com" || hostname.endsWith(".trustpilot.com"));
      if (!isTrustpilot) {
        res.status(400).json({ error: "Please submit your Trustpilot review link" });
        return;
      }

      await db
        .update(usersTable)
        .set({ reviewSubmissionUrl: reviewUrl.trim(), updatedAt: new Date() })
        .where(eq(usersTable.clerkId, req.userId!));

      // Notify support so they can verify and approve
      try {
        const { client, fromEmail } = await getUncachableResendClient();
        const origin = getRequestOrigin(req);
        const safeEmail = escapeHtml(user.email ?? "");
        const safeReviewUrl = escapeHtml(reviewUrl.trim());
        await client.emails.send({
          from: fromEmail,
          to: "support@bitcoindailyvip.com",
          subject: "[Action needed] Review submission awaiting approval",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
              <h2 style="font-size:18px;">New review submission</h2>
              <table style="border-collapse:collapse;width:100%;font-size:14px;">
                <tr><td style="padding:6px 12px 6px 0;color:#666;">Email</td><td style="padding:6px 0;">${safeEmail}</td></tr>
                <tr><td style="padding:6px 12px 6px 0;color:#666;">Review URL</td><td style="padding:6px 0;"><a href="${safeReviewUrl}">${safeReviewUrl}</a></td></tr>
              </table>
              <p style="margin-top:20px;">
                <a href="${origin}/admin" style="background:#F7931A;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700;">
                  Go to Admin Panel &#x2192; Reviews tab
                </a>
              </p>
            </div>
          `,
        });
      } catch { /* non-fatal — submission is saved regardless */ }

      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// NOTE: The review-discount self-service endpoint has been intentionally removed.
// Review discounts are applied exclusively by admins after verifying the submitted
// review URL. Use POST /admin/users/:userId/approve-review (admin-only) instead.

// POST /user/progress — saves completed module IDs
router.post(
  "/user/progress",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { completed } = req.body as { completed: string[] };
      await db
        .update(usersTable)
        .set({
          gettingStartedCompleted: JSON.stringify(completed),
          updatedAt: new Date(),
        })
        .where(eq(usersTable.clerkId, req.userId!));
      res.json({ completed });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
