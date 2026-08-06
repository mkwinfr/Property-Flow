import { Router } from "express";
import { z } from "zod";
import { authenticate, userCan, type AuthenticatedRequest } from "../auth/session.js";
import { AppError, forbidden } from "../lib/errors.js";
import { askAssistant } from "./service.js";

const router = Router();
router.use(authenticate);
router.post("/properties/:propertyId/assistant", async (req: AuthenticatedRequest, res, next) => {
  try {
    const propertyId = String(req.params.propertyId);
    const question = z.string().trim().min(2).max(500).parse(req.body?.question);
    if (!["units:view", "turns:view", "workorders:view", "inspections:view", "inventory:view"].some((permission) => userCan(req.auth!.id, permission, propertyId))) throw forbidden();
    const result = await askAssistant(req.auth!.id, propertyId, question);
    res.json(result);
  } catch (error) { next(error instanceof Error && error.message.startsWith("The local assistant") ? new AppError(503, "ASSISTANT_UNAVAILABLE", error.message) : error); }
});

export default router;
