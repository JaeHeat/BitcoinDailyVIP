import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../lib/auth";
import { db } from "@workspace/db";
import { conversations, messages, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// Subscription statuses that are allowed to use the AI support chat.
const ALLOWED_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

// Maximum characters accepted in a single user message.
const MAX_MESSAGE_LENGTH = 1000;

// Maximum number of historical messages sent to OpenAI per request (keeps costs bounded
// even as the stored conversation grows).
const MAX_HISTORY_MESSAGES = 20;

// Per-user rate limit: at most MAX_MESSAGES_PER_WINDOW AI messages per window.
const MAX_MESSAGES_PER_WINDOW = 10;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// In-memory sliding-window store: clerkId → array of timestamps.
const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(clerkId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(clerkId) ?? []).filter(
    (t) => now - t < WINDOW_MS
  );
  if (timestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    rateLimitStore.set(clerkId, timestamps);
    return false;
  }
  timestamps.push(now);
  rateLimitStore.set(clerkId, timestamps);
  return true;
}

// Middleware: gate all OpenAI routes behind an active paid subscription.
async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clerkId = req.userId!;
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkId),
    });
    if (!user || !ALLOWED_SUBSCRIPTION_STATUSES.has(user.subscriptionStatus ?? "")) {
      res.status(403).json({ error: "An active subscription is required to use AI support chat." });
      return;
    }
    next();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

const SYSTEM_PROMPT = `You are a helpful support assistant for Bitcoin Daily VIP — a premium crypto trading signals service.

Your role is to help VIP members with questions about:
- How to use the platform and member portal
- Understanding their subscription (plans, billing, upgrades/downgrades, cancellations)
- Joining and using the Discord community
- Understanding Bitcoin Daily VIP's trading signals and strategy
- Technical issues with the portal or Discord integration

Keep answers concise, friendly, and accurate.

When you cannot resolve an issue — for example: account-specific billing problems, refund requests, technical issues you can't diagnose, or anything that requires a human to look at their account — tell the user to open a support ticket directly on the site. Say something like: "I can't sort that out from here — click 'open a ticket' just below this chat and the team will get back to you by email."

Do not make up specific trade results, performance numbers, or promises about returns. Stick to general information about how the service works.`;

// GET /api/openai/support-conversation — get or create the user's support conversation
router.get(
  "/openai/support-conversation",
  requireAuth,
  requireActiveSubscription,
  async (req: Request, res: Response) => {
    try {
      const clerkId = req.userId!;

      const existing = await db.query.conversations.findFirst({
        where: eq(conversations.userClerkId, clerkId),
      });

      if (existing) {
        const existingMessages = await db.query.messages.findMany({
          where: eq(messages.conversationId, existing.id),
          orderBy: (m, { asc }) => [asc(m.createdAt)],
        });
        res.json({
          id: existing.id,
          title: existing.title,
          createdAt: existing.createdAt,
          messages: existingMessages,
        });
        return;
      }

      const [created] = await db
        .insert(conversations)
        .values({ userClerkId: clerkId, title: "Support Chat" })
        .returning();

      res.json({ id: created!.id, title: created!.title, createdAt: created!.createdAt, messages: [] });
    } catch (err) {
      console.error("support-conversation GET error", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /api/openai/conversations/:id/messages — send a message, stream the reply
router.post(
  "/openai/conversations/:id/messages",
  requireAuth,
  requireActiveSubscription,
  async (req: Request, res: Response) => {
    try {
      const clerkId = req.userId!;
      const conversationId = parseInt(req.params.id!, 10);
      const { content } = req.body as { content?: string };

      if (!content?.trim()) {
        res.status(400).json({ error: "content is required" });
        return;
      }

      if (content.trim().length > MAX_MESSAGE_LENGTH) {
        res.status(400).json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` });
        return;
      }

      if (!checkRateLimit(clerkId)) {
        res.status(429).json({
          error: `Too many messages. You can send at most ${MAX_MESSAGES_PER_WINDOW} messages every 10 minutes.`,
        });
        return;
      }

      const convo = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.userClerkId, clerkId)
        ),
      });

      if (!convo) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      await db.insert(messages).values({
        conversationId,
        role: "user",
        content: content.trim(),
      });

      const history = await db.query.messages.findMany({
        where: eq(messages.conversationId, conversationId),
        orderBy: (m, { asc }) => [asc(m.createdAt)],
      });

      // Only include the most recent MAX_HISTORY_MESSAGES to bound per-request token cost.
      const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);

      const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...recentHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullResponse = "";

      const stream = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 512,
        messages: chatMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: fullResponse,
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      console.error("messages POST error", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
        res.end();
      }
    }
  }
);

// DELETE /api/openai/conversations/:id — clear the conversation history
router.delete(
  "/openai/conversations/:id",
  requireAuth,
  requireActiveSubscription,
  async (req: Request, res: Response) => {
    try {
      const clerkId = req.userId!;
      const conversationId = parseInt(req.params.id!, 10);

      const convo = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.userClerkId, clerkId)
        ),
      });

      if (!convo) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      await db.delete(messages).where(eq(messages.conversationId, conversationId));

      res.status(204).end();
    } catch (err) {
      console.error("conversation DELETE error", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
