import { getAuth, clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = auth.userId;
  next();
}

/**
 * Admin-only middleware. Checks DB `is_admin` flag first.
 * If the env var ADMIN_CLERK_USER_ID matches, auto-grants isAdmin in DB
 * (bootstrap path for first-time setup). Fails closed if neither condition holds.
 *
 * Must be used after requireAuth (relies on req.userId being set).
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const clerkId = req.userId!;
    const adminEnvId = process.env.ADMIN_CLERK_USER_ID;

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkId),
    });

    // DB-backed check: user has isAdmin = true
    if (user?.isAdmin) {
      next();
      return;
    }

    // Bootstrap path: env var matches → ensure isAdmin is persisted in DB.
    // Works even if the user row doesn't exist yet (getOrCreateUser creates it).
    if (adminEnvId && clerkId === adminEnvId) {
      const targetUser = user ?? (await getOrCreateUser(clerkId));
      if (!targetUser.isAdmin) {
        await db
          .update(usersTable)
          .set({ isAdmin: true })
          .where(eq(usersTable.id, targetUser.id));
      }
      next();
      return;
    }

    res.status(403).json({ error: "Forbidden" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Member-content middleware. Verifies the requesting user has an active
 * entitlement — either a Stripe subscription in an active status or a valid
 * manual trial that has not yet expired.
 *
 * Must be used after requireAuth (relies on req.userId being set).
 */
const MEMBER_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export async function requireMemberAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const clerkId = req.userId!;
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkId),
    });

    if (user) {
      if (MEMBER_SUBSCRIPTION_STATUSES.has(user.subscriptionStatus ?? "")) {
        next();
        return;
      }
      if (user.manualTrialEndsAt && user.manualTrialEndsAt > new Date()) {
        next();
        return;
      }
    }

    res.status(403).json({ error: "An active membership is required." });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getOrCreateUser(clerkId: string) {
  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });

  if (!user) {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    const email =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress ||
      "";

    const [created] = await db
      .insert(usersTable)
      .values({ clerkId, email })
      .returning();
    user = created;
  }

  return user;
}
