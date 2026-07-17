import { Router, type IRouter } from "express";
import { requireAuth, formatUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  res.json(formatUser(req.currentUser!));
});

export default router;
