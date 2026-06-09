import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { emailJobsTable, usersTable } from "@workspace/db/schema";
import { eq, lte, isNull, and, sql } from "drizzle-orm";
import { getUncachableResendClient } from "../lib/resend";
import { getWinback1Html } from "../lib/emails/winback1";
import { getWinback2Html } from "../lib/emails/winback2";
import { getWinback3Html } from "../lib/emails/winback3";
import { requireAuth, requireAdmin } from "../lib/auth";
import { getStripe } from "../lib/stripe";
import { logger } from "../lib/logger";

const router = Router();

// 1x1 transparent PNG (base64)
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

function getAppOrigin(req: Request): string {
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
 * Build tracking URLs using the job's random token — NOT its integer ID.
 * This prevents IDOR / enumeration on public unauthenticated endpoints.
 */
function buildEmailUrls(req: Request, token: string) {
  const origin = getAppOrigin(req);
  return {
    clickUrl: `${origin}/api/winback/click/${token}`,
    openPixelUrl: `${origin}/api/winback/open/${token}`,
  };
}

/**
 * POST /winback/cron
 * Secured by X-Cron-Secret header matching CRON_SECRET env var.
 * Processes all due, unsent, uncancelled win-back email jobs.
 */
router.post("/winback/cron", async (req: Request, res: Response) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers["x-cron-secret"] !== cronSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const now = new Date();

  const dueJobs = await db.query.emailJobsTable.findMany({
    where: and(
      lte(emailJobsTable.sendAt, now),
      isNull(emailJobsTable.sentAt),
      eq(emailJobsTable.cancelled, false),
    ),
  });

  let processed = 0;
  let failed = 0;

  for (const job of dueJobs) {
    // Atomically claim the job by setting sentAt before sending.
    // If another concurrent cron run already claimed it, the UPDATE returns 0 rows — skip.
    const claimedAt = new Date();
    const claimed = await db
      .update(emailJobsTable)
      .set({ sentAt: claimedAt })
      .where(and(eq(emailJobsTable.id, job.id), isNull(emailJobsTable.sentAt)))
      .returning({ id: emailJobsTable.id });

    if (claimed.length === 0) {
      logger.info({ jobId: job.id }, "Win-back cron: job already claimed by another worker, skipping");
      continue;
    }

    try {
      const { client, fromEmail } = await getUncachableResendClient();

      // Derive first name from email local-part
      const localPart = job.email.split("@")[0].split(".")[0];
      const displayName = localPart.charAt(0).toUpperCase() + localPart.slice(1);

      // Use the random token in tracking URLs — never the integer ID
      const { clickUrl, openPixelUrl } = buildEmailUrls(req, job.token);

      let subject: string;
      let html: string;

      if (job.jobType === "winback_1") {
        ({ subject, html } = getWinback1Html({ firstName: displayName, clickUrl, openPixelUrl }));
      } else if (job.jobType === "winback_2") {
        ({ subject, html } = getWinback2Html({ firstName: displayName, clickUrl, openPixelUrl }));
      } else {
        ({ subject, html } = getWinback3Html({ firstName: displayName, clickUrl, openPixelUrl }));
      }

      await client.emails.send({
        from: fromEmail,
        to: job.email,
        subject,
        html,
      });

      processed++;
      logger.info({ jobId: job.id, jobType: job.jobType, email: job.email }, "Win-back email sent");
    } catch (err) {
      failed++;
      // Release the claim so a future cron run can retry
      await db
        .update(emailJobsTable)
        .set({ sentAt: null })
        .where(eq(emailJobsTable.id, job.id))
        .catch((e) => logger.error({ e, jobId: job.id }, "Failed to release win-back job claim"));
      logger.error({ err, jobId: job.id }, "Failed to send win-back email");
    }
  }

  res.json({ processed, failed });
});

/**
 * GET /winback/open/:token
 * Unauthenticated. Validates the random token, records open event, returns 1x1 tracking pixel.
 * Token is a UUID (36 chars) — not the integer job ID, so enumeration is not possible.
 */
router.get("/winback/open/:token", async (req: Request, res: Response) => {
  const token = String(req.params.token);

  // Validate token looks like a UUID before touching the DB
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    db.update(emailJobsTable)
      .set({ openedAt: new Date() })
      .where(and(eq(emailJobsTable.token, token), isNull(emailJobsTable.openedAt)))
      .catch((err) => logger.error({ err, token }, "Failed to record email open"));
  }

  // Always return the pixel — do not leak whether the token was valid
  res.set("Content-Type", "image/png");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.send(PIXEL_PNG);
});

/**
 * GET /winback/click/:token
 * Unauthenticated. Validates the random token, records click, creates a Stripe Checkout
 * session with the stored promo code pre-applied, and redirects.
 */
router.get("/winback/click/:token", async (req: Request, res: Response) => {
  const token = String(req.params.token);

  // Validate token format before touching the DB
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const job = await db.query.emailJobsTable.findFirst({
    where: eq(emailJobsTable.token, token),
  });

  if (!job) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Stale-link guard: don't create a checkout for cancelled jobs
  if (job.cancelled) {
    res.redirect(302, `${getAppOrigin(req)}/sign-up?ref=winback`);
    return;
  }

  // Record click (fire and forget — don't block the redirect)
  db.update(emailJobsTable)
    .set({ clickedAt: new Date() })
    .where(and(eq(emailJobsTable.token, token), isNull(emailJobsTable.clickedAt)))
    .catch((err) => logger.error({ err, token }, "Failed to record email click"));

  const origin = getAppOrigin(req);
  const priceId = process.env.BDV_PRICE_MONTHLY || process.env.STRIPE_VIP_PRICE_ID;

  // All win-back emails redirect to a Stripe Checkout session.
  // Email 1 pre-applies the 50% off promo code; emails 2 and 3 go to standard checkout.
  if (priceId) {
    try {
      const stripe = getStripe();

      type SessionParams = Parameters<typeof stripe.checkout.sessions.create>[0];
      const params: SessionParams = {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/portal?winback=success`,
        cancel_url: `${origin}/`,
      };

      // Attach existing customer when available so fields are pre-filled
      if (job.stripeCustomerId) {
        params.customer = job.stripeCustomerId;
      }

      // Apply promo code only to Email 1 (the explicit 50% off offer)
      if (job.stripePromoCode) {
        params.discounts = [{ promotion_code: job.stripePromoCode }];
      }

      const session = await stripe.checkout.sessions.create(params);
      res.redirect(302, session.url!);
      return;
    } catch (err) {
      logger.error({ err, token }, "Failed to create win-back checkout session — falling back");
    }
  }

  // Fallback only if Stripe price ID is not configured
  res.redirect(302, `${origin}/sign-up?ref=winback`);
});

/**
 * GET /winback/stats
 * Admin-protected. Returns aggregate win-back stats for the analytics dashboard.
 * "rejoined" = users who had a win-back sequence AND have an active subscription now.
 */
router.get(
  "/winback/stats",
  requireAuth,
  requireAdmin,
  async (_req: Request, res: Response) => {
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

      const totals = {
        total: rows.reduce((s, r) => s + r.total, 0),
        sent: rows.reduce((s, r) => s + r.sent, 0),
        opened: rows.reduce((s, r) => s + r.opened, 0),
        clicked: rows.reduce((s, r) => s + r.clicked, 0),
        cancelled: 0,
        rejoined: 0,
        byType: rows,
      };

      // Count cancelled jobs
      const [cancelledRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(emailJobsTable)
        .where(eq(emailJobsTable.cancelled, true));
      totals.cancelled = cancelledRow?.count ?? 0;

      // Count distinct users with cancelled win-back sequences AND an active subscription
      // (strong proxy for "rejoined via win-back")
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
      totals.rejoined = rejoinedRow?.count ?? 0;

      res.json(totals);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
