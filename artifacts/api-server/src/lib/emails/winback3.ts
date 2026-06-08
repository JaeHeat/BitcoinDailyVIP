/**
 * Win-back Email #3 — Day 30 after cancellation
 * Subject: "Last message from us"
 * Focus: low-pressure, door-is-open
 */
export function getWinback3Html(opts: {
  firstName: string;
  clickUrl: string;
  openPixelUrl: string;
}): { subject: string; html: string } {
  const { firstName, clickUrl, openPixelUrl } = opts;
  const subject = "Last message from us, " + firstName;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:700;color:#F7931A;letter-spacing:-0.5px;">₿ Bitcoin Daily VIP</span>
        </td></tr>

        <!-- Hero -->
        <tr><td style="background:#13131f;border:1px solid #2a2a3e;border-radius:16px;padding:48px 40px;">
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">
            This is our last email, ${firstName}.
          </h1>
          <p style="margin:0 0 20px;font-size:16px;color:#9ca3b0;line-height:1.6;">
            No pressure. No hard sell. We know timing matters.
          </p>
          <p style="margin:0 0 20px;font-size:16px;color:#9ca3b0;line-height:1.6;">
            We've posted <strong style="color:#fff;">92 verified trades</strong> with a <strong style="color:#F7931A;">68% win rate</strong> and an average of <strong style="color:#F7931A;">+5.62% per month</strong> since we started. Every single trade is public at
            <a href="https://tradrx.io/shared/DAD01529995B" style="color:#F7931A;text-decoration:none;">tradrx.io</a>.
          </p>
          <p style="margin:0 0 32px;font-size:16px;color:#9ca3b0;line-height:1.6;">
            If you're ever ready to trade with a real edge, the door is open.
          </p>

          <!-- CTA -->
          <a href="${clickUrl}" style="display:inline-block;background:#F7931A;color:#000;font-size:16px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:8px;">
            Come Back to Bitcoin Daily VIP →
          </a>

          <p style="margin:24px 0 0;font-size:14px;color:#4b5563;line-height:1.6;">
            We won't email you again. But the record will keep growing.<br/>
            <a href="https://tradrx.io/shared/DAD01529995B" style="color:#F7931A;text-decoration:none;">Check the journal anytime.</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:32px;">
          <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6;">
            © ${new Date().getFullYear()} Bitcoin Daily VIP.<br/>
            Trading cryptocurrencies involves significant risk. Past performance does not guarantee future results.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
  <img src="${openPixelUrl}" width="1" height="1" style="display:block;opacity:0;" alt="" />
</body>
</html>`;

  return { subject, html };
}
