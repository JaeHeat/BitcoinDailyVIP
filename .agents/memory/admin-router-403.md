---
name: Admin router 403 trap
description: adminRouter uses router.use(requireAuth, requireAdmin) which runs for every request passing through it, not just /admin/* routes — any router registered after adminRouter will have its routes intercepted and rejected with 403 for non-admin users.
---

## The Rule
Register `userRouter` (and any other per-user route groups) **before** `adminRouter` in `routes/index.ts`.

**Why:** `adminRouter` applies `router.use(requireAuth, requireAdmin)` globally inside the router — Express runs this for every request that reaches the router, regardless of whether any route inside actually matches. Non-admin requests get 403 before reaching downstream routers.

**How to apply:** In `artifacts/api-server/src/routes/index.ts`, always place `router.use(userRouter)` (and other non-admin routers) above `router.use(adminRouter)`. Any new authenticated-user route file must be added before the adminRouter line.
