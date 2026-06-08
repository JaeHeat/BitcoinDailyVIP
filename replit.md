# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Bitcoin Daily VIP — Membership Platform

Landing page artifact at `artifacts/bitcoin-daily-vip` (previewPath `/`).

### Workflow Note (Platform Bug)
The artifact-managed workflow `artifacts/bitcoin-daily-vip: web` has a broken `openPorts` tracking
due to its path-style artifact ID. A standalone workflow named **"Bitcoin Daily VIP"** was created
instead (same command, PORT=8082), which starts successfully. Always use `restart_workflow` with
name `"Bitcoin Daily VIP"` (not the artifact-managed one).

### Frontend Stack
- React + Vite + Tailwind v4 + framer-motion + wouter (routing) + shadcn/ui
- Dark-only theme: background `222 47% 5%`, primary Bitcoin orange `#F7931A` (HSL 33 93% 52%)
- Inter font via Google Fonts

### Pages
- `/` — Home landing page (`src/pages/home.tsx`): hero, features, pricing, testimonials, FAQ, CTA
- `/signup` — Checkout placeholder (`src/pages/signup.tsx`)

### Pending Tasks
- **Task #2**: Stripe checkout integration ($99/mo VIP subscription)
- **Task #3**: Discord OAuth + auto role assignment on successful payment
- **Task #4**: Churn reduction features (pause subscription, win-back emails)
- **Task #5**: Analytics dashboard (MRR, churn, cohort retention)
