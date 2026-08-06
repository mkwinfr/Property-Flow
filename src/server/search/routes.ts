import { Router } from "express";
import { z } from "zod";
import { authenticate, userCan, type AuthenticatedRequest } from "../auth/session.js";
import { forbidden } from "../lib/errors.js";
import { searchProperty } from "./service.js";

const router = Router();
router.use(authenticate);

router.get("/properties/:propertyId/search", (req: AuthenticatedRequest, res, next) => {
  try {
    const propertyId = String(req.params.propertyId);
    const query = z.string().trim().max(100).parse(req.query.q ?? "");
    const permissions = ["units:view", "turns:view", "workorders:view", "inspections:view", "vendors:view", "inventory:view", "templates:view"];
    const allowed = new Set(permissions.filter((permission) => userCan(req.auth!.id, permission, propertyId)));
    if (!allowed.size) throw forbidden();
    res.json({ results: searchProperty(propertyId, query, allowed) });
  } catch (error) { next(error); }
});

export default router;
