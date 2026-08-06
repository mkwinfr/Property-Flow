import { Router } from "express";
import { authenticate, requirePermission, type AuthenticatedRequest } from "../auth/session.js";
import { getDashboard, listProperties, listUnits } from "./service.js";

const router = Router();
router.use(authenticate);

router.get("/properties", requirePermission("units:view"), (req: AuthenticatedRequest, res) => {
  res.json({ properties: listProperties(req.auth!.id) });
});

router.get(
  "/properties/:propertyId/units",
  requirePermission("units:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ units: listUnits(String(req.params.propertyId)) }),
);

router.get(
  "/properties/:propertyId/dashboard",
  requirePermission("dashboard:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ dashboard: getDashboard(String(req.params.propertyId)) }),
);

export default router;
