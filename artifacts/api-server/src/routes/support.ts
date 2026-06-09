import { Router, type Request, type Response } from "express";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { clerkClient } from "@clerk/express";
import { getUncachableResendClient } from "../lib/resend";
import { db } from "@workspace/db";
import { supportTicketsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const router = Router();

router.post("/support/ticket", requireAuth, async (req: Request, res: Response) => {
  try {
    const clerkId = req.userId!;
    const { subject, message } = req.body as { subject?: string; message?: string };

    if (!subject?.trim() || !message?.trim()) {
      res.status(400).json({ error: "Subject and message are required" });
      return;
    }

    const user = await getOrCreateUser(clerkId);
    const clerkUser = await clerkClient.users.getUser(clerkId);
    const email =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress ||
      "unknown";
    const firstName = clerkUser.firstName ?? "";
    const lastName = clerkUser.lastName ?? "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Member";

    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({ userId: user.id, clerkId, subject: subject.trim(), message: message.trim() })
      .returning();

    try {
      const { client, fromEmail } = await getUncachableResendClient();
      const safeFullName = escapeHtml(fullName);
      const safeEmail = escapeHtml(email);
      const safeClerkId = escapeHtml(clerkId);
      const safeSubject = escapeHtml(subject.trim());
      const safeMessage = escapeHtml(message.trim());
      await client.emails.send({
        from: fromEmail,
        to: "support@bitcoindailyvip.com",
        replyTo: email,
        subject: `[Ticket #${ticket.id}] ${subject.trim()}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0f;color:#f1f5f9;">
            <div style="margin-bottom:24px;">
              <span style="font-size:18px;font-weight:700;color:#F7931A;">&#x20BF; Bitcoin Daily VIP — Support Ticket #${ticket.id}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <tr><td style="padding:8px 0;font-size:13px;color:#9ca3b0;width:100px;">From</td><td style="padding:8px 0;font-size:13px;color:#f1f5f9;">${safeFullName} &lt;${safeEmail}&gt;</td></tr>
              <tr><td style="padding:8px 0;font-size:13px;color:#9ca3b0;">Clerk ID</td><td style="padding:8px 0;font-size:13px;color:#f1f5f9;font-family:monospace;">${safeClerkId}</td></tr>
              <tr><td style="padding:8px 0;font-size:13px;color:#9ca3b0;">Subject</td><td style="padding:8px 0;font-size:13px;color:#f1f5f9;">${safeSubject}</td></tr>
            </table>
            <div style="background:#13131f;border:1px solid #2a2a3e;border-radius:10px;padding:20px;">
              <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:1.7;white-space:pre-wrap;">${safeMessage}</p>
            </div>
            <p style="margin-top:20px;font-size:12px;color:#4b5563;">Reply to this email to respond directly to the member.</p>
          </div>
        `,
      });
    } catch {
      // Email failed but ticket is saved — not fatal
    }

    res.json({ success: true, ticketId: ticket.id });
  } catch (err) {
    console.error("Support ticket error:", err);
    res.status(500).json({ error: "Failed to submit ticket" });
  }
});

router.get("/support/tickets", requireAuth, async (req: Request, res: Response) => {
  try {
    const clerkId = req.userId!;
    const tickets = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.clerkId, clerkId))
      .orderBy(desc(supportTicketsTable.createdAt))
      .limit(20);
    res.json(tickets);
  } catch (err) {
    console.error("Fetch tickets error:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

export default router;
