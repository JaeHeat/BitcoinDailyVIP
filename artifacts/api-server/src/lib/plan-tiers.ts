/**
 * Maps Stripe price IDs to internal plan tier strings.
 * Reads from BDV_PRICE_* env vars at call time so the mapping stays
 * consistent even if env vars are updated without a restart.
 */
export type PlanTier = "monthly" | "yearly" | "premium" | "premium-yearly";

const PLAN_ENV_MAP: Record<string, PlanTier> = {
  BDV_PRICE_MONTHLY:        "monthly",
  BDV_PRICE_YEARLY:         "yearly",
  BDV_PRICE_PREMIUM:        "premium",
  BDV_PRICE_PREMIUM_YEARLY: "premium-yearly",
};

/**
 * Returns the plan tier for a given Stripe price ID.
 * Falls back to "monthly" if the price ID isn't recognised.
 */
export function getPlanTier(priceId: string): PlanTier {
  for (const [envKey, tier] of Object.entries(PLAN_ENV_MAP)) {
    if (process.env[envKey] === priceId) return tier;
  }
  return "monthly";
}

/**
 * Convenience: resolve a plan tier from a Stripe Subscription object.
 * Uses the first line-item's price ID.
 */
export function getPlanTierFromSub(sub: { items?: { data?: Array<{ price?: { id?: string } }> } }): PlanTier {
  const priceId = sub.items?.data?.[0]?.price?.id;
  return priceId ? getPlanTier(priceId) : "monthly";
}
