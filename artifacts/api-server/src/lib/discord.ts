import { db } from "@workspace/db";
import { discordSyncLogsTable } from "@workspace/db/schema";
import { logger } from "./logger";

const DISCORD_API = "https://discord.com/api/v10";
const RETRY_DELAYS_MS = [500, 1500, 3000];

export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
}

function getGuildId(): string {
  const id = process.env.DISCORD_GUILD_ID;
  if (!id) throw new Error("DISCORD_GUILD_ID is not configured");
  return id;
}

function getVipRoleId(): string {
  const id = process.env.DISCORD_VIP_ROLE_ID;
  if (!id) throw new Error("DISCORD_VIP_ROLE_ID is not configured");
  return id;
}

function getBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN is not configured");
  return token;
}

async function discordBotFetch(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${getBotToken()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) return null;

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Discord API ${response.status} ${response.statusText}: ${body}`);
  }

  return body ? JSON.parse(body) : null;
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<{ result: T; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1] ?? 3000));
      }
    }
  }
  throw lastError;
}

async function logSync(params: {
  userId: number | null;
  discordUserId: string | null;
  action: string;
  stripeEvent: string | null;
  success: boolean;
  errorMessage: string | null;
  attempts: number;
}) {
  try {
    await db.insert(discordSyncLogsTable).values(params);
  } catch (err) {
    logger.error({ err, params }, "Failed to write discord_sync_log");
  }
}

export async function exchangeDiscordCode(code: string): Promise<{
  accessToken: string;
  tokenType: string;
}> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Discord OAuth env vars are not configured (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI)");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await response.json() as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`Discord token exchange failed: ${JSON.stringify(data)}`);
  }

  return {
    accessToken: data["access_token"] as string,
    tokenType: data["token_type"] as string,
  };
}

export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Discord user: ${response.status}`);
  }

  const data = await response.json() as DiscordUser;
  return data;
}

export async function assignVipRole(
  discordUserId: string,
  dbUserId: number | null,
  stripeEvent: string | null,
): Promise<void> {
  const guildId = getGuildId();
  const roleId = getVipRoleId();

  let attempts = 0;
  let errorMessage: string | null = null;
  let success = false;

  try {
    const { attempts: a } = await withRetry(() =>
      discordBotFetch(
        `/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
        { method: "PUT" },
      ),
    );
    attempts = a;
    success = true;
    logger.info({ discordUserId, roleId }, "Discord VIP role assigned");
  } catch (err) {
    attempts = 3;
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ discordUserId, err }, "Failed to assign Discord VIP role");
  }

  await logSync({
    userId: dbUserId,
    discordUserId,
    action: "assign_role",
    stripeEvent,
    success,
    errorMessage,
    attempts,
  });

  if (!success) throw new Error(errorMessage ?? "assignVipRole failed");
}

export async function revokeVipRole(
  discordUserId: string,
  dbUserId: number | null,
  stripeEvent: string | null,
): Promise<void> {
  const guildId = getGuildId();
  const roleId = getVipRoleId();

  let attempts = 0;
  let errorMessage: string | null = null;
  let success = false;

  try {
    const { attempts: a } = await withRetry(() =>
      discordBotFetch(
        `/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
        { method: "DELETE" },
      ),
    );
    attempts = a;
    success = true;
    logger.info({ discordUserId, roleId }, "Discord VIP role revoked");
  } catch (err) {
    attempts = 3;
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ discordUserId, err }, "Failed to revoke Discord VIP role");
  }

  await logSync({
    userId: dbUserId,
    discordUserId,
    action: "revoke_role",
    stripeEvent,
    success,
    errorMessage,
    attempts,
  });

  if (!success) throw new Error(errorMessage ?? "revokeVipRole failed");
}
