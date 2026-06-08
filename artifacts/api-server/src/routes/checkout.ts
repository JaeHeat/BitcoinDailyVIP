import { Router, type Request, type Response } from "express";
import { getStripe } from "../lib/stripe";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { logger } from "../lib/logger";

const router = Router();

function getRequestOrigin(req: Request): string {
  // Prefer the actual host the browser used (set by Replit's proxy) so the
  // Stripe success/cancel URL lands on the same origin as the Clerk session.
  const forwardedHost =
    (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.host || "localhost";
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() ||
    req.protocol;
  return `${proto}://${host}`;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"] as string | undefined;
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.socket?.remoteAddress ?? "unknown";
}

/** Truncate to Stripe's 500-char metadata value limit */
function trunc(s: string, max = 490): string {
  return s.length > max ? s.slice(0, max) : s;
}

const PRICE_ENV_MAP: Record<string, string> = {
  monthly: "BDV_PRICE_MONTHLY",
  yearly: "BDV_PRICE_YEARLY",
  premium: "BDV_PRICE_PREMIUM",
  "premium-yearly": "BDV_PRICE_PREMIUM_YEARLY",
};

router.post(
  "/checkout/session",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const stripe = getStripe();
      const clerkId = req.userId!;
      const user = await getOrCreateUser(clerkId);

      const origin = getRequestOrigin(req);

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { clerkUserId: clerkId },
        });
        customerId = customer.id;
        await db
          .update(usersTable)
          .set({ stripeCustomerId: customerId, updatedAt: new Date() })
          .where(eq(usersTable.clerkId, clerkId));
      }

      const { priceType = "monthly", couponCode } = req.body as { priceType?: string; couponCode?: string };

      // ── Chargeback evidence capture ──────────────────────────────────────
      const clientIp    = getClientIp(req);
      const userAgent   = trunc((req.headers["user-agent"] as string | undefined) ?? "unknown");
      const acceptedAt  = new Date().toISOString();
      logger.info(
        { clerkId, email: user.email, clientIp, priceType, acceptedAt },
        "checkout/session: ToS & refund policy accepted",
      );
      const envVar = PRICE_ENV_MAP[priceType] ?? PRICE_ENV_MAP.monthly;
      const priceId = process.env[envVar];

      if (!priceId) {
        res.status(500).json({
          error: `Price ID for "${priceType}" is not configured (${envVar})`,
        });
        return;
      }

      // VIP plans (monthly + yearly) get a 7-day free trial; premium plans do not.
      // Trial eligibility: user must either have never trialed, OR their last trial
      // started more than 90 days ago (one trial per 90-day rolling window).
      const isVipPlan = priceType === "monthly" || priceType === "yearly";
      const TRIAL_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

      let eligibleForTrial = false;
      if (isVipPlan) {
        const lastTrial = user.trialStartedAt;

        if (!lastTrial) {
          // First-timer: also verify via Stripe in case DB stamp was missed
          const priorSubs = await stripe.subscriptions.list({
            customer: customerId,
            limit: 1,
            status: "all",
          });
          eligibleForTrial = priorSubs.data.length === 0;
        } else {
          // Returning user: eligible once 90 days have passed since last trial
          eligibleForTrial = Date.now() - lastTrial.getTime() >= TRIAL_COOLDOWN_MS;
        }
      }

      const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        allow_promotion_codes: !couponCode,
        success_url: `${origin}/portal?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/portal`,
        // ── Evidence metadata (surfaced in Stripe dispute panel) ─────────
        metadata: {
          clerkUserId:              clerkId,
          priceType,
          user_email:               trunc(user.email ?? ""),
          tos_accepted:             "true",
          tos_accepted_at:          acceptedAt,
          refund_policy_accepted:   "true",
          refund_policy_text:       "Non-refundable after 7-day free trial ends. Member may cancel before trial expires at no charge.",
          client_ip:                clientIp,
          user_agent:               userAgent,
          tos_version:              "2025-01",
        },
        // Also stamp the subscription so evidence is preserved even if session is purged
        ...(eligibleForTrial
          ? {
              subscription_data: {
                trial_period_days: 7,
                metadata: {
                  tos_accepted_at:        acceptedAt,
                  refund_policy_accepted: "true",
                  client_ip:              clientIp,
                  tos_version:            "2025-01",
                },
              },
            }
          : {
              subscription_data: {
                metadata: {
                  tos_accepted_at:        acceptedAt,
                  refund_policy_accepted: "true",
                  client_ip:              clientIp,
                  tos_version:            "2025-01",
                },
              },
            }),
      };

      if (couponCode) {
        // Look up the promo code and apply it
        try {
          const promoCodes = await stripe.promotionCodes.list({ code: couponCode, limit: 1 });
          if (promoCodes.data.length > 0) {
            (sessionParams as Record<string, unknown>).discounts = [{ promotion_code: promoCodes.data[0].id }];
          } else {
            res.status(400).json({ error: `Promo code "${couponCode}" not found or inactive` });
            return;
          }
        } catch {
          res.status(400).json({ error: "Failed to validate promo code" });
          return;
        }
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      res.json({ url: session.url! });
    } catch (err) {
      logger.error({ err }, "checkout/session failed");
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

router.post(
  "/checkout/welcome-email",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        res.json({ ok: true, skipped: "no_api_key" });
        return;
      }
      const clerkId = req.userId!;
      const user = await getOrCreateUser(clerkId);
      if (!user.email) {
        res.json({ ok: true, skipped: "no_email" });
        return;
      }
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: "Bitcoin Daily VIP <noreply@bitcoindailyvip.com>",
        to: user.email,
        subject: "Welcome to Bitcoin Daily VIP 🎉",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
            <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">You're in. Welcome to Bitcoin Daily VIP.</h1>
            <p style="color:#555;margin-bottom:16px;">Here's what to do first:</p>
            <ol style="color:#555;padding-left:20px;line-height:1.8;">
              <li>Head to your <a href="https://bitcoindailyvip.com/portal" style="color:#f7931a;">member portal</a> and connect your Discord account to unlock the VIP channel.</li>
              <li>Check out the <strong>Getting Started</strong> guide — it covers how signals work, risk sizing, and the morning analysis routine.</li>
              <li>Introduce yourself in the Discord — the community is the best part.</li>
            </ol>
            <p style="color:#555;margin-top:20px;">Your 7-day free trial is active. No charge until the trial ends, and you can cancel anytime from the portal.</p>
            <p style="margin-top:24px;">Let's trade — <br/><strong>Bitcoin Daily VIP</strong></p>
          </div>
        `,
      });
      res.json({ ok: true });
    } catch {
      res.json({ ok: true, skipped: "send_error" });
    }
  },
);

export default router;
