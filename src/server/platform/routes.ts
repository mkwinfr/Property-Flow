import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission, type AuthenticatedRequest } from "../auth/session.js";
import {
  deleteSavedView,
  listAuditEvents,
  listNotificationPreferences,
  listSavedViews,
  saveNotificationPreferences,
  saveSavedView,
} from "./service.js";

const router = Router();
router.use(authenticate);

router.get("/properties/:propertyId/saved-views", (req: AuthenticatedRequest, res) => {
  const module = String(req.query.module ?? "work_orders");
  res.json({ views: listSavedViews(req.auth!.id, String(req.params.propertyId), module as "work_orders") });
});

const savedViewSchema = z.object({
  id: z.string().optional(),
  propertyId: z.string().min(1),
  module: z.enum(["work_orders", "turns", "inspections", "units"]),
  name: z.string().trim().min(1).max(80),
  filters: z.record(z.string(), z.unknown()).default({}),
  sort: z.record(z.string(), z.unknown()).default({}),
  isDefault: z.boolean().optional(),
});

router.post("/saved-views", (req: AuthenticatedRequest, res, next) => {
  try {
    const input = savedViewSchema.parse(req.body);
    res.status(201).json({ view: saveSavedView(req.auth!.id, input) });
  } catch (error) { next(error); }
});

router.delete("/saved-views/:id", (req: AuthenticatedRequest, res) => {
  deleteSavedView(req.auth!.id, String(req.params.id));
  res.status(204).end();
});

router.get("/properties/:propertyId/audit", requirePermission("audit:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ events: listAuditEvents(String(req.params.propertyId)) }));

router.get("/notification-preferences", (req: AuthenticatedRequest, res) => {
  res.json({ preferences: listNotificationPreferences(req.auth!.id) });
});

router.put("/notification-preferences", (req: AuthenticatedRequest, res, next) => {
  try {
    const preferences = z.array(z.object({
      notificationType: z.string().min(1),
      channel: z.enum(["in_app", "email", "sms"]),
      enabled: z.boolean(),
    })).parse(req.body.preferences);
    res.json({ preferences: saveNotificationPreferences(req.auth!.id, preferences) });
  } catch (error) { next(error); }
});

export default router;
