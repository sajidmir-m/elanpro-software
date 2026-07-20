import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import uploadsRouter from "./uploads";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import schedulesRouter from "./schedules";
import filtersRouter from "./filters";
import analyticsRouter from "./analytics";
import emailReportsRouter from "./email-reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(uploadsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(schedulesRouter);
router.use(filtersRouter);
router.use(analyticsRouter);
router.use(emailReportsRouter);

export default router;
