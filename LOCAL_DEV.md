# Local Development (Windows)

How to build and run **Bitcoin Daily VIP** locally on Windows. The repo is a Replit
pnpm-workspace monorepo; a few Replit-specific defaults need adjusting for local dev.

## Prerequisites
- Node 24+, pnpm 11+
- A Postgres database (Neon free tier works) for `DATABASE_URL`

## 1. Install
```bash
pnpm install
```
**Windows build fix (already applied in this repo):** Replit's `pnpm-workspace.yaml`
`overrides` strip every platform's native binary except `linux-x64`. The `win32-x64`
binaries for `esbuild`, `rollup`, `@tailwindcss/oxide`, and `lightningcss` have been
re-enabled (those override lines removed), and `@clerk/shared` added to
`onlyBuiltDependencies`. If `pnpm install` ever reports `ERR_PNPM_IGNORED_BUILDS`,
run `pnpm rebuild esbuild @clerk/shared` once.

## 2. Environment
Two `.env` files (gitignored). Copy from the `.env.example` in `artifacts/api-server`.

**`artifacts/api-server/.env`** — required: `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`/`_API_KEY`. Optional per-feature:
Stripe / Discord / Resend / TradrX. See `.env.example` for the full list.

**`artifacts/bitcoin-daily-vip/.env`** — `VITE_CLERK_PUBLISHABLE_KEY` (same pk as the
server). The Vite dev server proxies `/api` → the api-server (default `:8084`,
override with `API_TARGET`).

Push the DB schema once:
```bash
cd lib/db && pnpm run push    # drizzle-kit push
```

## 3. Run
```bash
# api-server (port 8084)
cd artifacts/api-server && pnpm run build && node --enable-source-maps --env-file=.env ./dist/index.mjs

# frontend (port 8083) — PORT is required by vite.config
cd artifacts/bitcoin-daily-vip && set PORT=8083 && pnpm run dev
```
Open http://localhost:8083.

## Dev-only auth bypass
The whole app is gated behind Clerk. To work on the **member portal / admin** without a
real login, set the bypass (dev builds only — fails closed in production):

- `artifacts/api-server/.env`: `DEV_AUTH_BYPASS=1`, `DEV_AUTH_USER_ID=dev_user`
- `artifacts/bitcoin-daily-vip/.env`: `VITE_DEV_AUTH_BYPASS=1`

Restart both servers. `/` redirects to `/portal` as a mock "Dev" user. The dev user is
auto-granted a 1-year manual trial (member access) on first request. To see the
**signed-out landing page**, set `VITE_DEV_AUTH_BYPASS=0` and restart (the bypass makes
`/` redirect to the portal). The implementation is in `src/lib/clerk-compat.tsx`
(frontend shim) and `src/lib/auth.ts` (backend gates).

### Toggling the dev user's membership (to test the upgrade/checkout flow)
```bash
cd lib/db
# non-member (sees the upgrade/sales view):
node -e "import('pg').then(async({default:p})=>{const c=new p.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query(\"UPDATE users SET manual_trial_ends_at=NULL,subscription_status=NULL WHERE clerk_id='dev_user'\");await c.end()})"
# member again (delete the row; it recreates with a fresh 1yr trial on next request):
node -e "import('pg').then(async({default:p})=>{const c=new p.Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query(\"DELETE FROM users WHERE clerk_id='dev_user'\");await c.end()})"
```
(`DATABASE_URL` must be set in the shell.)

## Notes / gotchas
- `vite.config.ts` **throws if `PORT` is unset** (except for `build`). It also reads `BASE_PATH`.
- The api-server `/subscription/status` route constructs a Stripe client up-front, so
  `BDV_STRIPE_API_KEY` must be present even just to read a manual-trial status. A dummy
  `sk_test_...` is fine for local dev — the manual-trial path returns before any real
  Stripe call. Provide a real test key only to exercise actual checkout.
- Typecheck runs from the **repo root** (`pnpm run typecheck`) — it builds the
  `lib/*` project references first. Running `tsc` inside an artifact alone will report
  spurious errors because the lib `dist` isn't built yet.
