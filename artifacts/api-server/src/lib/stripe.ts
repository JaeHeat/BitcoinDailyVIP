import Stripe from "stripe";

export function getStripe(): Stripe {
  // BDV_STRIPE_API_KEY is a shared env var (set in .replit) guaranteed identical
  // in dev and production. Falls back to STRIPE_LIVE_API_KEY for compatibility.
  const key = process.env.BDV_STRIPE_API_KEY || process.env.STRIPE_LIVE_API_KEY;
  if (!key) throw new Error("No Stripe API key found (BDV_STRIPE_API_KEY or STRIPE_LIVE_API_KEY)");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}
