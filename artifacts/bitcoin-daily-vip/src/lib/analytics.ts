// Privacy-friendly analytics (Plausible — no cookies, GDPR-friendly).
// No-op unless VITE_PLAUSIBLE_DOMAIN is set, so it's safe to ship as-is and
// flip on by setting the env var at deploy time. Swap the src/init for GA,
// PostHog, etc. if you prefer.
declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;
  }
}

const DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
let initialized = false;

export function initAnalytics() {
  if (initialized || !DOMAIN || typeof document === "undefined") return;
  initialized = true;
  const s = document.createElement("script");
  s.defer = true;
  s.setAttribute("data-domain", DOMAIN);
  s.src = "https://plausible.io/js/script.js";
  document.head.appendChild(s);
}

/** Track a custom conversion event (e.g. "Signup CTA", "Checkout Started"). */
export function track(event: string, props?: Record<string, unknown>) {
  try {
    if (typeof window !== "undefined" && window.plausible) {
      window.plausible(event, props ? { props } : undefined);
    }
  } catch {
    /* never let analytics break the app */
  }
}
