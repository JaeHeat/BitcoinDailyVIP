# Threat Model

## Project Overview

Bitcoin Daily VIP is a publicly deployed subscription membership platform. It uses a React + Vite frontend in `artifacts/bitcoin-daily-vip`, an Express 5 API in `artifacts/api-server`, Clerk for authentication, Stripe for billing, PostgreSQL via Drizzle for state, Discord OAuth plus role assignment for community access, Resend for transactional email, and OpenAI-backed support chat. Production deployment is public (`https://bitcoindaily.vip`). Per platform assumptions, TLS is handled by the platform, `NODE_ENV` is `production` in production, and the mockup sandbox artifact is not production-reachable.

## Assets

- **User accounts and sessions** — Clerk identities, browser session cookies, and authenticated API access. Compromise lets an attacker act as a member or admin.
- **Subscription and billing state** — Stripe customer IDs, subscription IDs, discounts, refunds, and trial status. Abuse can grant paid access without payment or cause unauthorized charges/refunds.
- **Member-only community access** — Discord account linkage and VIP role assignment. Incorrect authorization grants private community access to non-paying users.
- **Proprietary member content** — paid training guides, onboarding material, calculators, and strategy explanations. Public exposure undermines the subscription paywall and leaks business-sensitive content.
- **Customer data** — member email addresses, support tickets, cancellation survey responses, review submissions, and conversation history. Exposure leaks PII and sensitive account context.
- **Operational secrets** — Clerk secret, Stripe keys, Discord bot credentials, DB connection string, cron secret, connector tokens. Leakage could enable account takeover, billing abuse, or backend compromise.
- **Cost-bearing integrations** — OpenAI and email sending. Abuse can create denial-of-wallet or support workflow abuse.

## Trust Boundaries

- **Browser to API** — all client input is untrusted. The API must authenticate and authorize every protected route and validate user-controlled input before using it in Stripe, Discord, email, and database operations.
- **API to PostgreSQL** — the server can read and modify all business state. Query scoping and authorization mistakes directly expose or corrupt member/admin data.
- **API to Stripe** — the server can create checkout sessions, apply discounts, issue refunds, and process webhooks. Webhook authenticity and account-to-subscription binding are critical.
- **API to Discord** — the server can grant and revoke VIP roles. Incorrect linkage or authorization can give non-members private access.
- **API to Clerk** — Clerk authenticates users and synchronizes account identity into the local database. User identity must not be spoofed or mixed across accounts.
- **API to OpenAI / Resend / connector host** — expensive or privileged third-party actions happen server-side. Abuse can leak data or incur cost.
- **Application to staff operational channels** — review approvals and support tickets flow into admin pages and support email inboxes. User-controlled content crossing into these trusted channels must be validated and safely rendered.
- **Public / authenticated / admin surfaces** — public stats/trades and webhook-ish endpoints are internet-reachable; most member APIs require auth; admin APIs must enforce admin role server-side.
- **Production / dev-only boundary** — `artifacts/mockup-sandbox`, screenshots, attached assets, and other mockup-only materials are out of scope unless proven production-reachable.

## Scan Anchors

- **Production entry points**: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/bitcoin-daily-vip/src/main.tsx`, `artifacts/bitcoin-daily-vip/src/App.tsx`
- **Highest-risk code areas**: `artifacts/api-server/src/routes/{checkout,subscription,webhook,discord,admin,openai,support,winback}.ts`, `artifacts/api-server/src/lib/{auth,discord,resend,stripe}.ts`
- **Public surfaces**: `/healthz`, `/api/public/*`, `/api/checkout/webhook`, `/api/winback/open/:token`, `/api/winback/click/:token`, cron-secret endpoints
- **Authenticated member surfaces**: subscription management, support tickets, Discord connect/disconnect, AI chat, progress/journey APIs
- **Admin surfaces**: `/api/admin/*`, `/api/discord/sync-logs`, frontend `/admin*` pages (client-side only; server protection is authoritative)
- **Usually ignore as dev-only**: `artifacts/mockup-sandbox/**`, screenshots, attached assets, generated dist output unless validating a build artifact issue

## Threat Categories

### Spoofing

The application relies on Clerk for identity, Stripe webhooks for billing truth, and Discord OAuth for account linking. The system must validate Clerk-authenticated requests on every protected route, verify Stripe webhook signatures before mutating account state, and bind Discord OAuth callbacks to the initiating member so one user's external account cannot be linked to another user's profile.

### Tampering

Members can trigger billing, cancellation, support, review, and profile-update flows from the browser. The server must not trust client-supplied subscription status, discount eligibility, plan changes, refund targets, or review-reward claims. All Stripe operations and privilege-bearing state transitions must be derived from server-side authorization and canonical Stripe data.

### Information Disclosure

The API returns member profile, support, Discord, analytics, and conversation data. These responses must be scoped to the authenticated user or an authorized admin, and logs/emails must avoid exposing secrets or privileged data. Public endpoints must not leak internal state beyond intended marketing statistics and public trade history.

### Denial of Service

The app exposes cost-bearing and potentially expensive operations including OpenAI streaming chat, email sending, Stripe calls, and cron-triggered jobs. These endpoints must resist abuse through authentication, secret validation, bounded inputs, and rate-aware design so attackers cannot drive excessive compute, token, or third-party API usage.

### Elevation of Privilege

The highest-impact project-specific risk is unauthorized access to paid/member/admin capabilities: getting member benefits without paying, granting oneself Discord VIP access, issuing admin billing actions, or abusing weak account-to-subscription linking. Admin routes must be enforced server-side, paid-state transitions must be bound to the correct user, and public/tokenized flows must not let attackers upgrade privileges through leaked tokens, crafted links, or parameter manipulation.
