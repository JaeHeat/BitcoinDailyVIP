import { randomUUID } from "crypto";
import express, { Router, type Request, type Response } from "express";
import { getStripe } from "../lib/stripe";
import { assignVipRole, revokeVipRole } from "../lib/discord";
import { db } from "@workspace/db";
import { usersTable, emailJobsTable } from "@workspace/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { logger } from "../lib/logger";
import { getPlanTier, getPlanTierFromSub } from "../lib/plan-tiers";
import { getUncachableResendClient } from "../lib/resend";

const router = Router();

// past_due is included so members keep Discord access during Stripe's retry window.
// Discord is only revoked when the subscription is fully deleted (all retries exhausted).
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

// Days after cancellation to send each win-back email
const WINBACK_SCHEDULE_DAYS = [3, 10, 30] as const;
const WINBACK_TYPES = ["winback_1", "winback_2", "winback_3"] as const;

/**
 * HTML email for invoice.payment_failed — sent on each retry attempt.
 * Includes a direct Stripe billing portal link so the member can update their card immediately.
 */
function buildPaymentFailedEmail({
  displayName,
  attemptCount,
  nextAttemptStr,
  portalUrl,
}: {
  displayName: string;
  attemptCount: number;
  nextAttemptStr: string | null;
  portalUrl: string;
}): string {
  const headline =
    attemptCount === 1 ? "Your payment didn't go through" : `Payment attempt ${attemptCount} failed`;

  const retryNote = nextAttemptStr
    ? `<p style="color:#555;margin:0 0 20px 0;">We'll automatically try again on <strong>${nextAttemptStr}</strong>. To avoid any gap in your access, please update your payment method before then.</p>`
    : `<p style="color:#555;margin:0 0 20px 0;">This was our final retry. Please update your payment method to keep your Bitcoin Daily VIP access.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Payment failed</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#0f0f0f;padding:28px 40px;text-align:center;">
            <span style="color:#f7931a;font-size:22px;font-weight:bold;letter-spacing:-0.5px;">&#8383; Bitcoin Daily VIP</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#111;font-size:22px;margin:0 0 20px 0;">${headline}</h2>
            <p style="color:#555;margin:0 0 16px 0;">Hey ${displayName},</p>
            <p style="color:#555;margin:0 0 20px 0;">We weren't able to charge your Bitcoin Daily VIP subscription. Your access remains active for now — but please update your billing details so there's no interruption.</p>
            ${retryNote}
            <!-- CTA button -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td style="background:#f7931a;border-radius:6px;text-align:center;">
                  <a href="${portalUrl}" style="display:inline-block;padding:14px 32px;color:#fff;font-weight:bold;font-size:16px;text-decoration:none;">Update Payment Method</a>
                </td>
              </tr>
            </table>
            <p style="color:#aaa;font-size:12px;margin:0 0 6px 0;">If the button doesn't work, copy and paste this link:</p>
            <p style="font-size:12px;word-break:break-all;margin:0 0 28px 0;"><a href="${portalUrl}" style="color:#f7931a;">${portalUrl}</a></p>
            <hr style="border:none;border-top:1px solid #eee;margin:28px 0;">
            <p style="color:#888;font-size:13px;margin:0;">Questions? Reply to this email or visit <a href="https://bitcoindaily.vip" style="color:#f7931a;">bitcoindaily.vip</a>.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 40px;text-align:center;">
            <p style="color:#bbb;font-size:12px;margin:0;">Bitcoin Daily VIP &middot; <a href="https://bitcoindaily.vip/portal" style="color:#bbb;text-decoration:none;">Manage subscription</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Schedule a 3-email win-back sequence for a cancelled user.
 * Email 1 (day 3) includes a 50% off promo code; emails 2 and 3 do not.
 */
async function scheduleWinbackEmails(user: typeof usersTable.$inferSelect): Promise<void> {
  if (!user.email) return;

  const stripe = getStripe();

  // Create a 50% off promo code for email 1, restricted to this customer if possible
  let promoCodeId: string | null = null;
  try {
    {
      const coupon = await stripe.coupons.create({
        percent_off: 50,
        duration: "once",
        name: "Win-back 50% off",
        max_redemptions: 1,
      });
      const promoCodeParams: Stripe.PromotionCodeCreateParams = {
        coupon: coupon.id,
        max_redemptions: 1,
      };
      if (user.stripeCustomerId) {
        promoCodeParams.customer = user.stripeCustomerId;
      }
      const promoCode = await stripe.promotionCodes.create(promoCodeParams);
      promoCodeId = promoCode.id;
    }
  } catch (err) {
    logger.warn({ err, userId: user.id }, "Win-back: failed to create promo code, scheduling without it");
  }

  // Idempotency: skip scheduling if this user already has pending (unsent, uncancelled) jobs.
  // Guards against Stripe re-delivering customer.subscription.deleted and creating duplicates.
  const existingJob = await db.query.emailJobsTable.findFirst({
    where: and(
      eq(emailJobsTable.userId, user.id),
      eq(emailJobsTable.cancelled, false),
      isNull(emailJobsTable.sentAt),
    ),
  });
  if (existingJob) {
    logger.info({ userId: user.id }, "Win-back: sequence already scheduled, skipping duplicate");
    return;
  }

  const now = new Date();
  for (let i = 0; i < WINBACK_SCHEDULE_DAYS.length; i++) {
    const sendAt = new Date(now.getTime() + WINBACK_SCHEDULE_DAYS[i] * 86_400_000);
    await db.insert(emailJobsTable).values({
      userId: user.id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId ?? null,
      jobType: WINBACK_TYPES[i],
      token: randomUUID(), // cryptographically random — used in public tracking URLs instead of integer ID
      sendAt,
      // Attach the same promo code to all 3 jobs so every click link leads to discounted checkout.
      // The code has max_redemptions: 1 so it can only be used once regardless.
      stripePromoCode: promoCodeId,
    });
  }

  logger.info({ userId: user.id, email: user.email }, "Win-back: scheduled 3-email sequence");
}

/**
 * Cancel all pending (unsent) win-back emails for a user who has re-subscribed.
 */
async function cancelPendingWinbackEmails(userId: number): Promise<void> {
  const result = await db
    .update(emailJobsTable)
    .set({ cancelled: true })
    .where(
      and(
        eq(emailJobsTable.userId, userId),
        eq(emailJobsTable.cancelled, false),
        isNull(emailJobsTable.sentAt),
      ),
    )
    .returning({ id: emailJobsTable.id });

  if (result.length > 0) {
    logger.info({ userId, cancelledCount: result.length }, "Win-back: cancelled pending emails (user re-subscribed)");
  }
}

/**
 * Look up a user by Stripe customer ID and trigger Discord role sync.
 * Silently no-ops if the user has no Discord account linked yet (they will
 * get the role assigned when they connect Discord via OAuth).
 */
async function syncDiscordRole(
  customerId: string,
  action: "assign" | "revoke",
  stripeEvent: string,
): Promise<void> {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.stripeCustomerId, customerId),
  });

  if (!user) {
    logger.warn({ customerId, stripeEvent }, "Discord sync: no user found for customer");
    return;
  }

  if (!user.discordUserId) {
    logger.info({ customerId, stripeEvent }, "Discord sync: user has no Discord account linked, skipping");
    return;
  }

  try {
    if (action === "assign") {
      await assignVipRole(user.discordUserId, user.id, stripeEvent);
    } else {
      await revokeVipRole(user.discordUserId, user.id, stripeEvent);
    }
  } catch (err) {
    // Errors are already logged and stored in discord_sync_logs by the helpers
    logger.error({ err, action, stripeEvent, discordUserId: user.discordUserId }, "Discord sync failed");
  }
}

router.post(
  "/checkout/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      res.status(500).json({ error: "Webhook secret not configured" });
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Webhook signature verification failed";
      res.status(400).json({ error: `Webhook Error: ${message}` });
      return;
    }

    try {
      const stripe = getStripe();

      switch (event.type) {
        case "checkout.session.completed": {
          // Fired when a Stripe Checkout session is paid. Retrieve the subscription
          // to get canonical state, then store it and assign Discord role.
          const session = event.data.object as Stripe.Checkout.Session;
          const clerkUserId = session.metadata?.clerkUserId;
          if (clerkUserId && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string,
            );
            // Resolve plan tier from session metadata (set at checkout) or price ID
            const planTier = session.metadata?.priceType
              ? (session.metadata.priceType as ReturnType<typeof getPlanTier>)
              : getPlanTierFromSub(subscription);
            await db
              .update(usersTable)
              .set({
                subscriptionId: subscription.id,
                subscriptionStatus: subscription.status,
                planTier,
                ...(subscription.status === "trialing" ? { trialStartedAt: new Date() } : {}),
                updatedAt: new Date(),
              })
              .where(eq(usersTable.clerkId, clerkUserId));

            // $1 card verification hold: confirm the card is valid and funded
            // before the trial ends, then immediately release the authorization.
            // This matches the behaviour users recognise from Whop.
            if (subscription.status === "trialing") {
              const paymentMethodId =
                typeof subscription.default_payment_method === "string"
                  ? subscription.default_payment_method
                  : subscription.default_payment_method?.id;

              if (paymentMethodId && session.customer) {
                try {
                  const pi = await stripe.paymentIntents.create({
                    amount: 100,
                    currency: subscription.currency || "cad",
                    customer: session.customer as string,
                    payment_method: paymentMethodId,
                    capture_method: "manual",
                    confirm: true,
                    off_session: true,
                    error_on_requires_action: true,
                    description: "Card verification hold (released immediately)",
                    metadata: { subscriptionId: subscription.id },
                  });
                  await stripe.paymentIntents.cancel(pi.id);
                  logger.info(
                    { piId: pi.id, customerId: session.customer },
                    "Card verification: $1 auth created and released",
                  );
                } catch (err) {
                  // Non-critical — card may require 3DS or be exempt from auth.
                  logger.warn(
                    { err, customerId: session.customer },
                    "Card verification: $1 auth skipped",
                  );
                }
              }
            }

            if (session.customer) {
              await syncDiscordRole(
                session.customer as string,
                "assign",
                "checkout.session.completed",
              );
            }
          }
          break;
        }

        case "customer.subscription.created": {
          // Fired when a new subscription is created (including after checkout).
          // Upsert subscription state, assign Discord role, and cancel any
          // pending win-back emails (user re-subscribed).
          const sub = event.data.object as Stripe.Subscription;
          const customer = (await stripe.customers.retrieve(
            sub.customer as string,
          )) as Stripe.Customer;
          const clerkUserId = customer.metadata?.clerkUserId;
          if (clerkUserId) {
            await db
              .update(usersTable)
              .set({
                subscriptionId: sub.id,
                subscriptionStatus: sub.status,
                planTier: getPlanTierFromSub(sub),
                // Stamp trial start when the subscription begins in trialing status
                ...(sub.status === "trialing" ? { trialStartedAt: new Date() } : {}),
                updatedAt: new Date(),
              })
              .where(eq(usersTable.clerkId, clerkUserId));

            // Cancel any pending win-back emails for the returning user
            const user = await db.query.usersTable.findFirst({
              where: eq(usersTable.clerkId, clerkUserId),
            });
            if (user) await cancelPendingWinbackEmails(user.id);
          }

          if (ACTIVE_STATUSES.has(sub.status)) {
            await syncDiscordRole(sub.customer as string, "assign", "customer.subscription.created");
          }
          break;
        }

        case "customer.subscription.updated": {
          // Fired on any subscription change: pause, resume, cancel scheduling,
          // discount application, or payment method update.
          const sub = event.data.object as Stripe.Subscription;
          const customer = (await stripe.customers.retrieve(
            sub.customer as string,
          )) as Stripe.Customer;
          const clerkUserId = customer.metadata?.clerkUserId;
          if (clerkUserId) {
            await db
              .update(usersTable)
              .set({
                subscriptionStatus: sub.status,
                updatedAt: new Date(),
              })
              .where(eq(usersTable.clerkId, clerkUserId));
          }

          // pause_collection present → subscription is paused → revoke access
          const isPaused = !!(sub as Stripe.Subscription & { pause_collection?: unknown }).pause_collection;
          if (isPaused || !ACTIVE_STATUSES.has(sub.status)) {
            await syncDiscordRole(sub.customer as string, "revoke", "customer.subscription.updated");
          } else {
            // Unpaused or still active — (re)assign role
            await syncDiscordRole(sub.customer as string, "assign", "customer.subscription.updated");
          }
          break;
        }

        case "customer.subscription.deleted": {
          // Fired when a subscription is fully cancelled.
          // Revoke Discord role, update DB, and schedule win-back email sequence.
          const sub = event.data.object as Stripe.Subscription;
          const customer = (await stripe.customers.retrieve(
            sub.customer as string,
          )) as Stripe.Customer;
          const clerkUserId = customer.metadata?.clerkUserId;
          if (clerkUserId) {
            await db
              .update(usersTable)
              .set({
                subscriptionStatus: "canceled",
                subscriptionId: null,
                updatedAt: new Date(),
              })
              .where(eq(usersTable.clerkId, clerkUserId));

            // Schedule win-back email sequence
            const user = await db.query.usersTable.findFirst({
              where: eq(usersTable.clerkId, clerkUserId),
            });
            if (user) {
              await scheduleWinbackEmails(user).catch((err) =>
                logger.error({ err, clerkUserId }, "Win-back scheduling failed"),
              );
            }
          }

          await syncDiscordRole(sub.customer as string, "revoke", "customer.subscription.deleted");
          break;
        }

        case "invoice.payment_failed": {
          // Fired on every failed renewal attempt.
          // We do NOT revoke Discord here — members keep access during Stripe's retry window.
          // Discord is revoked only when customer.subscription.deleted fires (all retries exhausted).
          const invoice = event.data.object as Stripe.Invoice;
          const stripeCustomerId = invoice.customer as string | null;
          if (!stripeCustomerId) break;

          // Find member in DB
          const [user] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.stripeCustomerId, stripeCustomerId))
            .limit(1);

          if (user) {
            // Mark as past_due in our DB so the portal UI shows the right state
            await db
              .update(usersTable)
              .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
              .where(eq(usersTable.id, user.id));

            // Send "update your card" email with a direct Stripe billing portal link
            if (user.email) {
              try {
                const stripe = getStripe();

                // Create a one-click portal URL so they land directly on the payment method page
                let portalUrl = "https://bitcoindaily.vip/portal";
                try {
                  const portalSession = await stripe.billingPortal.sessions.create({
                    customer: stripeCustomerId,
                    return_url: "https://bitcoindaily.vip/portal",
                  });
                  portalUrl = portalSession.url;
                } catch (e) {
                  logger.warn({ e }, "Could not create billing portal session for payment-failed email; using fallback URL");
                }

                const { client, fromEmail } = await getUncachableResendClient();
                const attemptCount = invoice.attempt_count ?? 1;
                const nextAttempt = invoice.next_payment_attempt;
                const nextAttemptStr = nextAttempt
                  ? new Date(nextAttempt * 1000).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })
                  : null;

                const localPart = user.email.split("@")[0].split(".")[0] ?? "there";
                const displayName =
                  localPart.charAt(0).toUpperCase() + localPart.slice(1);

                await client.emails.send({
                  from: fromEmail,
                  to: user.email,
                  subject:
                    attemptCount === 1
                      ? "Action required: Your Bitcoin Daily VIP payment failed"
                      : `Payment attempt ${attemptCount} failed — please update your card`,
                  html: buildPaymentFailedEmail({ displayName, attemptCount, nextAttemptStr, portalUrl }),
                });

                logger.info(
                  { email: user.email, attemptCount },
                  "Payment-failed email sent",
                );
              } catch (err) {
                logger.error({ err, stripeCustomerId }, "Failed to send payment-failed email");
              }
            }
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
