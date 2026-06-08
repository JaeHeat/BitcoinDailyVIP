import { Router, type Request, type Response } from "express";
import { requireAuth, requireMemberAccess } from "../lib/auth";
import { GETTING_STARTED_MODULES } from "../content/getting-started";
import { RESOURCE_CATEGORIES } from "../content/resources";

const router = Router();

router.get("/member/getting-started", requireAuth, requireMemberAccess, (_req: Request, res: Response) => {
  res.json(GETTING_STARTED_MODULES);
});

router.get("/member/resources", requireAuth, requireMemberAccess, (_req: Request, res: Response) => {
  res.json(RESOURCE_CATEGORIES);
});

export default router;
