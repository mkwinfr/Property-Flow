import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission, type AuthenticatedRequest } from "../auth/session.js";
import { db } from "../db/index.js";
import { createCampaign, createTemplate, listCampaigns, listDeliveries, listTemplates, sendCampaign } from "./service.js";

const router = Router();
router.use(authenticate);

const propertyFromCampaign = (id: string) =>
  (db.prepare("SELECT property_id FROM message_campaigns WHERE id = ?").get(id) as { property_id: string } | undefined)?.property_id;

router.get("/properties/:propertyId/message-templates", requirePermission("communications:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ templates: listTemplates(String(req.params.propertyId)) }));

router.post("/message-templates", requirePermission("communications:manage", (req) => req.body?.propertyId as string | undefined),
  (req, res, next) => {
    try {
      const input = z.object({
        propertyId: z.string().min(1),
        name: z.string().trim().min(1).max(120),
        channel: z.enum(["email", "sms", "in_app"]),
        subject: z.string().trim().max(200).nullable().optional(),
        body: z.string().trim().min(1).max(8000),
      }).parse(req.body);
      res.status(201).json({ template: createTemplate(input) });
    } catch (error) { next(error); }
  });

router.get("/properties/:propertyId/campaigns", requirePermission("communications:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ campaigns: listCampaigns(String(req.params.propertyId)) }));

router.post("/campaigns", requirePermission("communications:manage", (req) => req.body?.propertyId as string | undefined),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const input = z.object({
        propertyId: z.string().min(1),
        name: z.string().trim().min(1).max(120),
        templateId: z.string().nullable().optional(),
        audienceType: z.enum(["all_residents", "active_leases", "prospects", "custom"]),
        audienceFilter: z.record(z.string(), z.unknown()).optional(),
        scheduledAt: z.string().nullable().optional(),
      }).parse(req.body);
      res.status(201).json({ campaign: createCampaign({ ...input, createdByUserId: req.auth!.id }) });
    } catch (error) { next(error); }
  });

router.post("/campaigns/:id/send", requirePermission("communications:manage", (req) => propertyFromCampaign(String(req.params.id))),
  (req: AuthenticatedRequest, res) => res.json({ campaign: sendCampaign(String(req.params.id), req.auth!.id) }));

router.get("/campaigns/:id/deliveries", requirePermission("communications:view", (req) => propertyFromCampaign(String(req.params.id))),
  (req, res) => res.json({ deliveries: listDeliveries(String(req.params.id)) }));

export default router;
