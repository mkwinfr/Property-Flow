import { Router } from "express";
import { z } from "zod";
import type { PropertyModuleSetting } from "../../shared/contracts.js";
import { authenticate, requirePermission, type AuthenticatedRequest } from "../auth/session.js";
import { getDashboard, getPortfolioSummary, getPropertyModules, listProperties, listUnits, updatePropertyModules } from "./service.js";

const router = Router();
router.use(authenticate);

router.get("/properties", requirePermission("units:view"), (req: AuthenticatedRequest, res) => {
  res.json({ properties: listProperties(req.auth!.id) });
});

router.get("/portfolio/summary", requirePermission("dashboard:view"), (req: AuthenticatedRequest, res) => {
  res.json({ portfolio: getPortfolioSummary(req.auth!.id) });
});

router.get(
  "/properties/:propertyId/modules",
  requirePermission("dashboard:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ modules: getPropertyModules(String(req.params.propertyId)) }),
);

router.put(
  "/properties/:propertyId/modules",
  requirePermission("properties:manage", (req) => String(req.params.propertyId)),
  (req, res, next) => {
    try {
      const modules = (req.body?.modules as PropertyModuleSetting[]) ?? [];
      res.json({ modules: updatePropertyModules(String(req.params.propertyId), modules) });
    } catch (error) { next(error); }
  },
);

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
