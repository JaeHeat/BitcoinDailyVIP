import { Router, type IRouter } from "express";
import healthRouter from "./health";
import checkoutRouter from "./checkout";
import subscriptionRouter from "./subscription";
import discordRouter from "./discord";
import winbackRouter from "./winback";
import adminRouter from "./admin";
import statsRouter from "./stats";
import tradesRouter from "./trades";
import userRouter from "./user";
import openaiRouter from "./openai";
import supportRouter from "./support";
import memberRouter from "./member";

const router: IRouter = Router();

router.use(healthRouter);
router.use(statsRouter);
router.use(tradesRouter);
router.use(userRouter);
router.use(openaiRouter);
router.use(supportRouter);
router.use(checkoutRouter);
router.use(subscriptionRouter);
router.use(discordRouter);
router.use(winbackRouter);
router.use(memberRouter);
router.use(adminRouter);

export default router;
