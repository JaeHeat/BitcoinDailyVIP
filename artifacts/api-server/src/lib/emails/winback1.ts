/**
 * Win-back Email #1 — Day 3 after cancellation
 * Subject: "Your Bitcoin edge is waiting"
 * Offer: 50% off first month back
 */
export function getWinback1Html(opts: {
  firstName: string;
  clickUrl: string;
  openPixelUrl: string;
}): { subject: string; html: string } {
  const { firstName, clickUrl, openPixelUrl } = opts;
  const subject = "Your Bitcoin edge is waiting";

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
        <tr><td style="background:linear-gradient(135deg,#13131f 0%,#1a1a2e 100%);border:1px solid #2a2a3e;border-radius:16px;padding:48px 40px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#F7931A;text-transform:uppercase;letter-spacing:1px;">We miss you</p>
          <h1 style="margin:0 0 16px;font-size:32px;font-weight:800;color:#ffffff;line-height:1.2;">Your edge is still here, ${firstName}.</h1>
          <p style="margin:0 0 32px;font-size:16px;color:#9ca3b0;line-height:1.6;">
            Since you left, we've closed <strong style="color:#fff;">11 wins in a row</strong> and the track record sits at a <strong style="color:#F7931A;">68% win rate</strong> across 92 public trades.
            The next setup is forming right now.
          </p>

          <!-- Offer box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border:1px solid #F7931A33;border-radius:12px;margin-bottom:32px;">
            <tr><td style="padding:24px 28px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#F7931A;text-transform:uppercase;letter-spacing:1px;">Limited-time offer</p>
              <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#fff;">50% off your first month back</p>
              <p style="margin:0;font-size:14px;color:#9ca3b0;">$49.50 instead of $99. One month. Cancel anytime.</p>
            </td></tr>
          </table>

          <!-- CTA -->
          <a href="${clickUrl}" style="display:inline-block;background:#F7931A;color:#000;font-size:16px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:8px;letter-spacing:-0.2px;">
            Claim 50% Off — Rejoin Now →
          </a>

          <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
            Or <a href="https://tradrx.io/shared/DAD01529995B" style="color:#F7931A;text-decoration:none;">check the live journal</a> — every trade is public.
          </p>
        </td></tr>

        <!-- Stats row -->
        <tr><td style="padding-top:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="background:#13131f;border:1px solid #2a2a3e;border-radius:10px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:22px;font-weight:800;color:#F7931A;">68%</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Win Rate</p>
              </td>
              <td width="4%"></td>
              <td width="33%" style="background:#13131f;border:1px solid #2a2a3e;border-radius:10px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">+5.62%</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Avg / Month</p>
              </td>
              <td width="4%"></td>
              <td width="33%" style="background:#13131f;border:1px solid #2a2a3e;border-radius:10px;padding:16px;text-align:center;">
                <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">2.32</p>
                <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Profit Factor</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:32px;border-top:1px solid #1e1e2e;margin-top:32px;">
          <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6;">
            © ${new Date().getFullYear()} Bitcoin Daily VIP. You're receiving this because you previously subscribed.<br/>
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
