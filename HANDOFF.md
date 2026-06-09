# Launch Handoff — Bitcoin Daily VIP

This work was done locally (on Windows) by Claude and **committed + pushed to GitHub** on the
branch **`claude/launch-prep`**. This document tells you (the Replit agent) how to pull it, what
changed, and what still needs doing before public launch.

> ✅ Everything is committed and pushed. No secrets are in the repo (`.env` files are gitignored;
> only `.env.example` with placeholders is committed). The app builds clean; backend typecheck is
> green except 13 known Stripe field-shape errors (see §3, item 1).

---

## 1. How to pull this code from GitHub

The changes are on branch **`claude/launch-prep`** of `https://github.com/JaeHeat/BitcoinDailyVIP`.

### Step 0 — protect any uncommitted Replit changes first
```bash
git status                 # see if the Replit working tree has local edits
git stash -u               # (only if there ARE local changes you want to keep)
```

### Step 1 — fetch the branch
```bash
git fetch origin
git log origin/claude/launch-prep --oneline -5   # review what's incoming
```

### Step 2 — merge it into main
**Option A — via GitHub PR (recommended):** open a PR from `claude/launch-prep` → `main` on
GitHub, review the diff, and merge. Then in Replit:
```bash
git checkout main
git pull origin main
```

**Option B — merge locally:**
```bash
git checkout main
git pull origin main                  # make sure main is current
git merge origin/claude/launch-prep   # merge the work in
# resolve conflicts if any (unlikely — see note below), then:
git push origin main
```

> **Conflict note:** if the Replit project has diverged since this was cloned, you may hit
> conflicts. The biggest-touched files are `artifacts/bitcoin-daily-vip/src/pages/{home,portal,admin}.tsx`.
> Prefer the incoming version for the new features, but re-apply any Replit-only changes by hand.

### Step 3 — after merging, REQUIRED setup
```bash
pnpm install                                   # lockfile + workspace changed
pnpm --filter @workspace/db run push           # creates the new `reviews` table (additive, safe)
pnpm run build                                  # verify it builds
```
- `pnpm-workspace.yaml` had a few `win32-x64` native-binary overrides removed (so it builds on
  Windows). **Harmless on Replit/Linux** — those optional deps don't install on Linux anyway.
- The **dev auth bypass** code is committed but **gated by `NODE_ENV !== "production"`** — it
  cannot activate in prod. Just make sure the production env does NOT set `DEV_AUTH_BYPASS` or
  `VITE_DEV_AUTH_BYPASS`. (Both `.env` files are local-only/gitignored.)

---

## 2. Changelog — what changed in this branch

### New member-facing features
- **"How it works" landing section** — 3 steps (Join & connect Discord → Get the alert → Copy
  entry/stop/target) + a **sample signal card** showing the exact format members receive +
  a "Don't trust us, verify it" TradrX trust band.
- **"What a week looks like"** cadence section + **"Is this for you?"** honest for-you/not-for-you
  qualifier, before pricing.
- **Reusable `SignalCard`** component (`components/signal-card.tsx`) — used as the landing sample
  and (annotated) as a "How to read a signal" reference in Resources.
- **Resources page:** "How to read a signal" reference + a 12-term plain-English glossary.
- **Dashboard:** an adaptive **"Your next step"** banner (Connect Discord → Finish Getting Started
  → Follow setups), a **"Never miss a signal"** notification-setup card, a prominent **"Open
  Discord"** button in the sidebar, and a **"My results"** localStorage trade journal.
- **Getting Started:** overall progress bar + total time estimate.
- **Real review system** (replaces the fabricated testimonials — see below).

### Reviews (replaces fake testimonials — IMPORTANT, was an FTC risk)
- Removed the hardcoded fake testimonials ("Marcus T.", "Sarah K.").
- New `reviews` DB table + `routes/reviews.ts`:
  - `GET /api/public/reviews` — approved reviews for the homepage (section hides when empty).
  - `GET/POST /api/member/review` — eligibility + submission.
  - `GET /api/admin/reviews` + `POST /api/admin/reviews/:id/moderate` — admin approve/reject.
- **Eligibility (gated):** a member sees the review prompt ONLY when they are
  `subscriptionStatus === "active"` (paying, not trialing) **AND** Discord-connected **AND**
  ≥37 days tenure (≈ paid for the 2nd month). Before that they see **nothing** about reviews.
- **Incentive:** approved review → **25% off their NEXT month only** (not a free month).
- Member form in the portal, admin moderation UI in `/admin`, FTC incentive disclosure on the
  landing reviews section.
- Removed the old always-visible Trustpilot "leave a review for a discount" card + the Member
  Journey "Leave a review" step (Journey is now 2 steps).

### Launch hygiene
- **Risk/results disclaimers** added near the performance stats + footer.
- **Analytics scaffold** (`lib/analytics.ts`, Plausible, env-gated, fires a "Checkout Started"
  event) + **error boundary** (`components/error-boundary.tsx`, Sentry-ready). Both no-op without
  keys.
- **SEO:** `public/robots.txt` + `public/sitemap.xml` (member/admin routes excluded). FAQ JSON-LD
  structured data in `index.html`.
- **Perf:** vendor bundle code-split (main entry 1.17MB → ~357KB gz); equity chart lazy-loaded.
- **Accessibility:** all member-facing form inputs properly labelled (calculator, support ticket,
  chat, review form); icon-only buttons given aria-labels.
- **Bug fixes:** admin ChurnChart duplicate-key crash on low data; landing equity-curve sign bug
  (`+$-1,234`); the "On a heater" panel now only shows when genuinely profitable; win-rate stat
  consistency; scroll-to-top on route change.
- **Cleanup:** deleted orphaned `partners.tsx`; backend typecheck green except the 13 Stripe ones.
- **Docs:** added `LOCAL_DEV.md` (how to run locally + dev-bypass toggle).

---

## 3. Still TODO before public launch (needs keys / Stripe / devices / legal)

### 🔴 Blockers
**1. Verify Stripe billing in test mode (HIGHEST PRIORITY).** 13 TS errors remain, all in billing
code, because `apiVersion: "2026-04-22.dahlia"` (`artifacts/api-server/src/lib/stripe.ts`) **moved
fields** the code still reads at the top level:
  - `subscription.current_period_end` → `subscription.items.data[i].current_period_end`
  - `subscription.discount` → `subscription.discounts[]`
  - `promotionCode.coupon` / `PromotionCodeCreateParams.coupon` shape changed

  These are **likely latent runtime bugs** (undefined trial/renewal dates). With an `sk_test_…`
  key, run `pnpm --filter @workspace/api-server run typecheck`, fix each, and verify dates/coupons
  in test mode. Files: `routes/subscription.ts`, `routes/admin.ts`, `routes/webhook.ts`.

**2. Production credentials:** Clerk **production** instance (currently `pk_test`/`sk_test` dev
keys); Stripe **live** keys + webhook endpoint + `STRIPE_WEBHOOK_SECRET` + price IDs; Discord bot
in the real server with `DISCORD_GUILD_ID`/`DISCORD_VIP_ROLE_ID`/etc.; Resend domain verified
(SPF/DKIM); `ADMIN_CLERK_USER_ID` + `CRON_SECRET`. Remove the local dummy
`BDV_STRIPE_API_KEY=sk_test_dummy_dev_only` from any non-local env.

**3. End-to-end payment → VIP role test:** subscribe → `customer.subscription.created` → VIP role
auto-assigned in Discord → cancel → role revoked. The webhook handlers are already comprehensive.

**4. Confirm dev bypass OFF in prod** (NODE_ENV-guarded, but don't set the flags in prod env).

### 🟠 Content / legal
**5. Finish the review discount automation + prompt:** on admin-approve in
`routes/reviews.ts`, apply a **one-time 25% Stripe coupon to the member's NEXT invoice only**
(`percent_off: 25, duration: "once"`). Add a cron/email (reuse `node-cron` + Resend in
`routes/winback.ts`) that prompts members once they hit eligibility. For exact "2nd month paid"
detection, also confirm via Stripe `invoices.list({ status: "paid" })` ≥ 2. The old
`/api/subscription/review-submit` route is now unused (frontend removed) — safe to delete.

**6. Replace placeholder content:** affiliate links on Exchanges/Prop-Firms
(search `BYBIT_REF_LINK`); the **generated placeholder hero image**
(`src/assets/images/hero-bitcoin.png`); confirm the Discord invite URL
(`discord.gg/bitcoindailyvip`); confirm headline stats match live TradrX data; adjust
`SAMPLE_SIGNAL` numbers in `components/signal-card.tsx` if desired.

### 🟡 Polish / post-launch
- Mobile QA on real devices + a Lighthouse pass on the full funnel.
- Rate limiting / abuse protection on the api-server (review against `threat_model.md`) — esp.
  `requireAuth`, checkout, review-submit, support-ticket, discord-connect.
- Confirm welcome/win-back emails land in the inbox (not spam) once the Resend domain is verified.
- Analytics/monitoring: set `VITE_PLAUSIBLE_DOMAIN`; drop the Sentry loader (+DSN) into
  `index.html` — the `ErrorBoundary` already calls `window.Sentry?.captureException`.
- (Optional) Add a Trustpilot **organic** trust widget to the landing — but do NOT tie the 25%
  discount to a Trustpilot review (Trustpilot prohibits incentivized reviews). Keep the incentive
  on the on-site system only.

See `LOCAL_DEV.md` for how to run the stack locally and the dev-bypass toggle.
