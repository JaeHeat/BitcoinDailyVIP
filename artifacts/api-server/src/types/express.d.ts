import "express";

// Routes that need `req.userId` must type their handler as (req: Request, res:
// Response) with Request imported from "express" so this augmentation applies.
declare module "express" {
  interface Request {
    userId?: string;
  }
}
