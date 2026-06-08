import { Router, type Request, type Response } from "express";
import { createHmac } from "crypto";
import { requireAuth, requireAdmin, getOrCreateUser } from "../lib/auth";
import { exchangeDiscordCode, getDiscordUser, assignVipRole, revokeVipRole } from "../lib/discord";
import { db } from "@workspace/db";
import { usersTable, discordSyncLogsTable } from "@workspace/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

// ---------------------------------------------------------------------------
// State token helpers — signs the Clerk userId so the OAuth callback can
// safely identify which user initiated the flow without a server-side session.
// Uses CLERK_SECRET_KEY when available, falls back to DISCORD_CLIENT_SECRET
// (always set in production) so the endpoint never crashes on a missing key.
// ---------------------------------------------------------------------------
function getStateSigningKey(): string {
  const key = process.env.CLERK_SECRET_KEY ?? process.env.DISCORD_CLIENT_SECRET;
  if (!key) throw new Error("No signing key available (CLERK_SECRET_KEY and DISCORD_CLIENT_SECRET are both unset)");
  return key;
}

function createOAuthState(userId: string): string {
  const key = getStateSigningKey();
  const sig = createHmac("sha256", key).update(userId).digest("hex").slice(0, 16);
  return Buffer.from(`${userId}:${sig}`).toString("base64url");
}

function verifyOAuthState(state: string): string | null {
  try {
    const key = process.env.CLERK_SECRET_KEY ?? process.env.DISCORD_CLIENT_SECRET;
    if (!key) return null; // fail closed — don't accept any state without a key
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const colonIdx = decoded.lastIndexOf(":");
    if (colonIdx === -1) return null;
    const userId = decoded.slice(0, colonIdx);
    const sig = decoded.slice(colonIdx + 1);
    const expected = createHmac("sha256", key).update(userId).digest("hex").slice(0, 16);
    return sig === expected ? userId : null;
  } catch {
    return null;
  }
}

function getDiscordClientId(): string {
  const id = process.env.DISCORD_CLIENT_ID;
  if (!id) throw new Error("DISCORD_CLIENT_ID is not configured");
  return id;
}

function getRedirectUri(): string {
  const uri = process.env.DISCORD_REDIRECT_URI;
  if (!uri) throw new Error("DISCORD_REDIRECT_URI is not configured");
  return uri;
}

// GET /discord/oauth/url — returns the Discord OAuth authorization URL (JSON)
router.get(
  "/discord/oauth/url",
  requireAuth,
  (req: Request, res: Response) => {
    try {
      const state = createOAuthState(req.userId!);
      const params = new URLSearchParams({
        client_id: getDiscordClientId(),
        redirect_uri: getRedirectUri(),
        response_type: "code",
        scope: "identify",
        state,
      });
      res.json({ url: `https://discord.com/oauth2/authorize?${params}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      logger.error({ err }, "Discord OAuth URL generation failed");
      res.status(500).json({ error: message });
    }
  },
);

// GET /discord/oauth/redirect — server-side 302 redirect to Discord OAuth
// NOT in OpenAPI (browser redirect, not a JSON API)
// The browser navigates here directly (with session cookie) so no JS fetch
// is needed — works reliably on all mobile browsers.
router.get(
  "/discord/oauth/redirect",
  requireAuth,
  (req: Request, res: Response) => {
    try {
      const state = createOAuthState(req.userId!);
      const params = new URLSearchParams({
        client_id: getDiscordClientId(),
        redirect_uri: getRedirectUri(),
        response_type: "code",
        scope: "identify",
        state,
      });
      res.redirect(`https://discord.com/oauth2/authorize?${params}`);
    } catch (err) {
      logger.error({ err }, "Discord OAuth redirect failed");
      const basePath = process.env.DISCORD_PORTAL_BASE_PATH ?? "";
      res.redirect(`${basePath}/portal?discord=error`);
    }
  },
);

// GET /discord/oauth/callback — browser redirect from Discord after authorization
// NOT in OpenAPI (redirect endpoint, not a JSON API)
router.get(
  "/discord/oauth/callback",
  async (req: Request, res: Response) => {
    const { code, state, error } = req.query as Record<string, string>;

    const basePath = process.env.DISCORD_PORTAL_BASE_PATH ?? "";
    const portalUrl = `${basePath}/portal`;

    if (error || !code || !state) {
      logger.warn({ error, code: !!code, state: !!state }, "Discord OAuth denied or missing params");
      res.redirect(`${portalUrl}?discord=error`);
      return;
    }

    const clerkId = verifyOAuthState(state);
    if (!clerkId) {
      logger.warn({ state }, "Discord OAuth: invalid state");
      res.redirect(`${portalUrl}?discord=error`);
      return;
    }

    try {
      const { accessToken } = await exchangeDiscordCode(code);
      const discordUser = await getDiscordUser(accessToken);

      await db
        .update(usersTable)
        .set({
          discordUserId: discordUser.id,
          discordUsername: discordUser.global_name ?? discordUser.username,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.clerkId, clerkId));

      // If they already have an active subscription, grant role immediately
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.clerkId, clerkId),
      });

      if (user && ACTIVE_STATUSES.has(user.subscriptionStatus ?? "")) {
        assignVipRole(discordUser.id, user.id, "discord.connected").catch((err) => {
          logger.error({ err, discordUserId: discordUser.id }, "Failed to assign role on Discord connect");
        });
      }

      res.redirect(`${portalUrl}?discord=connected`);
    } catch (err) {
      logger.error({ err, clerkId }, "Discord OAuth callback error");
      res.redirect(`${portalUrl}?discord=error`);
    }
  },
);

// GET /discord/status — current user's Discord connection
router.get(
  "/discord/status",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = await getOrCreateUser(req.userId!);
      res.json({
        connected: !!user.discordUserId,
        discordUserId: user.discordUserId ?? null,
        username: user.discordUsername ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// GET /discord/sync-logs — admin-only view of Discord sync attempts
router.get(
  "/discord/sync-logs",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(String(req.query["limit"] ?? "100"), 10) || 100, 500);
      const failuresOnly = req.query["failuresOnly"] === "true";

      const logsQuery = failuresOnly
        ? db
            .select()
            .from(discordSyncLogsTable)
            .where(eq(discordSyncLogsTable.success, false))
            .orderBy(desc(discordSyncLogsTable.createdAt))
            .limit(limit)
        : db
            .select()
            .from(discordSyncLogsTable)
            .orderBy(desc(discordSyncLogsTable.createdAt))
            .limit(limit);

      // Two separate counts — avoids incorrect conditional-aggregate syntax
      const [rows, [{ total }], [{ failures }]] = await Promise.all([
        logsQuery,
        db.select({ total: count() }).from(discordSyncLogsTable),
        db
          .select({ failures: count() })
          .from(discordSyncLogsTable)
          .where(eq(discordSyncLogsTable.success, false)),
      ]);

      res.json({
        logs: rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
        failureCount: Number(failures ?? 0),
        totalCount: Number(total ?? 0),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

// POST /discord/disconnect — revoke VIP role then unlink Discord account.
// Role revocation happens before clearing the stored Discord ID so that
// subsequent webhook-driven revocations can still target the account.
router.post(
  "/discord/disconnect",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.clerkId, req.userId!),
      });

      if (user?.discordUserId) {
        try {
          await revokeVipRole(user.discordUserId, user.id, "discord.disconnected");
        } catch (err) {
          // Revocation failure is already recorded in discord_sync_logs.
          // Proceed with unlinking regardless — the user explicitly chose to disconnect.
          logger.warn(
            { err, discordUserId: user.discordUserId },
            "Role revocation failed during disconnect; proceeding with unlink",
          );
        }
      }

      await db
        .update(usersTable)
        .set({ discordUserId: null, discordUsername: null, updatedAt: new Date() })
        .where(eq(usersTable.clerkId, req.userId!));

      res.json({ connected: false, discordUserId: null, username: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
