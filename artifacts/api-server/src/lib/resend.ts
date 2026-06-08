/**
 * Resend email client via Replit Connectors integration.
 * WARNING: Never cache this client — tokens expire. Always call getUncachableResendClient() fresh.
 */
import { Resend } from "resend";

async function getCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Resend: Replit connector environment not available");
  }

  const data = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    },
  )
    .then((r) => r.json())
    .then((d: { items?: Array<{ settings: { api_key?: string; from_email?: string } }> }) => d.items?.[0]);

  if (!data?.settings?.api_key) {
    throw new Error("Resend not connected — please connect the Resend integration in Replit");
  }

  return {
    apiKey: data.settings.api_key,
    fromEmail: data.settings.from_email ?? "noreply@bitcoindailyvip.com",
  };
}

export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}
