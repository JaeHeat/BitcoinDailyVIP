/**
 * Win-back Email #2 — Day 10 after cancellation
 * Subject: "What our members made this month"
 * Focus: real trade results + social proof
 */
export function getWinback2Html(opts: {
  firstName: string;
  clickUrl: string;
  openPixelUrl: string;
}): { subject: string; html: string } {
  const { firstName, clickUrl, openPixelUrl } = opts;
  const subject = "What our members made this month";

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
          <h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">
            Here's what happened after you left, ${firstName}.
          </h1>
          <p style="margin:0 0 32px;font-size:16px;color:#9ca3b0;line-height:1.6;">
            We've been trading. Here's the real record — every trade verified at
            <a href="https://tradrx.io/shared/DAD01529995B" style="color:#F7931A;text-decoration:none;">tradrx.io</a>.
          </p>

          <!-- Recent trades -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border:1px solid #2a2a3e;border-radius:12px;margin-bottom:24px;overflow:hidden;">
            <tr style="background:#1a1a2e;">
              <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Date</td>
              <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Ticker</td>
              <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">P&amp;L</td>
            </tr>
            <tr style="border-top:1px solid #2a2a3e;">
              <td style="padding:12px 16px;font-size:13px;color:#9ca3b0;">May 4</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#F7931A;">BTC</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#22c55e;">+$720.50</td>
            </tr>
            <tr style="border-top:1px solid #2a2a3e;">
              <td style="padding:12px 16px;font-size:13px;color:#9ca3b0;">Apr 21</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#F7931A;">BTC</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#22c55e;">+$1,122.20</td>
            </tr>
            <tr style="border-top:1px solid #2a2a3e;">
              <td style="padding:12px 16px;font-size:13px;color:#9ca3b0;">Apr 13</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#F7931A;">BTC</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#22c55e;">+$2,270.52</td>
            </tr>
            <tr style="border-top:1px solid #2a2a3e;">
              <td style="padding:12px 16px;font-size:13px;color:#9ca3b0;">Apr 14</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#9ca3b0;">ETH</td>
              <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#22c55e;">+$694.74</td>
            </tr>
          </table>

          <!-- Testimonial -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-left:3px solid #F7931A;border-radius:0 8px 8px 0;margin-bottom:32px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 8px;font-size:15px;color:#d1d5db;line-height:1.6;font-style:italic;">
                "The daily video updates are my edge. It cuts through all the noise. I don't even check Twitter anymore."
              </p>
              <p style="margin:0;font-size:13px;color:#F7931A;font-weight:600;">— Sarah K., full-time trader since '23</p>
            </td></tr>
          </table>

          <!-- CTA -->
          <a href="${clickUrl}" style="display:inline-block;background:#F7931A;color:#000;font-size:16px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:8px;">
            Rejoin Bitcoin Daily VIP →
          </a>
          <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">$99/mo. Cancel anytime. First 7 days free.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:32px;">
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
