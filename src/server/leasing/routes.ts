import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission, type AuthenticatedRequest } from "../auth/session.js";
import { db } from "../db/index.js";
import {
  createApplication,
  createProspect,
  createTour,
  getProspect,
  listApplications,
  listProspects,
  listTours,
  updateApplicationStatus,
  updateProspectStage,
} from "./service.js";

const router = Router();
router.use(authenticate);

const propertyFromProspect = (id: string) =>
  (db.prepare("SELECT property_id FROM prospects WHERE id = ?").get(id) as { property_id: string } | undefined)?.property_id;

router.get("/properties/:propertyId/prospects", requirePermission("leasing:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ prospects: listProspects(String(req.params.propertyId)) }));

router.get("/prospects/:id", requirePermission("leasing:view", (req) => propertyFromProspect(String(req.params.id))),
  (req, res) => res.json({ prospect: getProspect(String(req.params.id)) }));

router.post("/prospects", requirePermission("leasing:manage", (req) => req.body?.propertyId as string | undefined),
  (req, res, next) => {
    try {
      const input = z.object({
        propertyId: z.string().min(1),
        firstName: z.string().trim().min(1).max(80),
        lastName: z.string().trim().min(1).max(80),
        email: z.string().email().nullable().optional(),
        phone: z.string().trim().max(40).nullable().optional(),
        source: z.string().trim().max(80).nullable().optional(),
        stage: z.enum(["inquiry", "contacted", "tour_scheduled", "tour_completed", "application", "approved", "leased", "lost"]).optional(),
        desiredMoveIn: z.iso.date().nullable().optional(),
        budgetMax: z.number().nullable().optional(),
        notes: z.string().trim().max(4000).nullable().optional(),
        assignedToUserId: z.string().nullable().optional(),
      }).parse(req.body);
      res.status(201).json({ prospect: createProspect(input) });
    } catch (error) { next(error); }
  });

router.patch("/prospects/:id/stage", requirePermission("leasing:manage", (req) => propertyFromProspect(String(req.params.id))),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const body = z.object({ stage: z.enum(["inquiry", "contacted", "tour_scheduled", "tour_completed", "application", "approved", "leased", "lost"]), notes: z.string().nullable().optional() }).parse(req.body);
      res.json({ prospect: updateProspectStage(String(req.params.id), body.stage, req.auth!.id, body.notes) });
    } catch (error) { next(error); }
  });

router.get("/properties/:propertyId/tours", requirePermission("leasing:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ tours: listTours(String(req.params.propertyId)) }));

router.post("/tours", requirePermission("leasing:manage", (req) => req.body?.propertyId as string | undefined),
  (req, res, next) => {
    try {
      const input = z.object({
        propertyId: z.string().min(1),
        prospectId: z.string().min(1),
        unitId: z.string().nullable().optional(),
        scheduledAt: z.string().min(1),
        guideUserId: z.string().nullable().optional(),
        notes: z.string().trim().max(2000).nullable().optional(),
      }).parse(req.body);
      res.status(201).json({ tour: createTour(input) });
    } catch (error) { next(error); }
  });

router.get("/properties/:propertyId/applications", requirePermission("leasing:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ applications: listApplications(String(req.params.propertyId)) }));

router.post("/applications", requirePermission("leasing:manage", (req) => req.body?.propertyId as string | undefined),
  (req, res, next) => {
    try {
      const input = z.object({
        propertyId: z.string().min(1),
        prospectId: z.string().min(1),
        unitId: z.string().nullable().optional(),
        monthlyIncome: z.number().nullable().optional(),
      }).parse(req.body);
      res.status(201).json({ application: createApplication(input) });
    } catch (error) { next(error); }
  });

router.patch("/applications/:id/status", requirePermission("leasing:manage", (req) => {
  const row = db.prepare("SELECT property_id FROM applications WHERE id = ?").get(String(req.params.id)) as { property_id: string } | undefined;
  return row?.property_id;
}), (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(["submitted", "screening", "approved", "denied", "withdrawn", "leased"]),
      decisionNotes: z.string().nullable().optional(),
    }).parse(req.body);
    res.json({ application: updateApplicationStatus(String(req.params.id), body.status, body.decisionNotes) });
  } catch (error) { next(error); }
});

export default router;
