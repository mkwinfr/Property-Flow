import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../auth/session.js";
import { db } from "../db/index.js";
import { createLease, createResident, getLease, getResident, listHouseholds, listLeases, listResidents } from "./service.js";

const router = Router();
router.use(authenticate);

const propertyFromResident = (id: string) =>
  (db.prepare("SELECT property_id FROM residents WHERE id = ?").get(id) as { property_id: string } | undefined)?.property_id;
const propertyFromLease = (id: string) =>
  (db.prepare("SELECT property_id FROM leases WHERE id = ?").get(id) as { property_id: string } | undefined)?.property_id;

router.get("/properties/:propertyId/residents", requirePermission("residents:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ residents: listResidents(String(req.params.propertyId)) }));

router.get("/residents/:id", requirePermission("residents:view", (req) => propertyFromResident(String(req.params.id))),
  (req, res) => res.json({ resident: getResident(String(req.params.id)) }));

router.post("/residents", requirePermission("residents:manage", (req) => req.body?.propertyId as string | undefined),
  (req, res, next) => {
    try {
      const input = z.object({
        propertyId: z.string().min(1),
        firstName: z.string().trim().min(1).max(80),
        lastName: z.string().trim().min(1).max(80),
        email: z.string().email().nullable().optional(),
        phone: z.string().trim().max(40).nullable().optional(),
        preferredContact: z.enum(["email", "phone", "sms"]).nullable().optional(),
        status: z.enum(["active", "former", "applicant"]).optional(),
        notes: z.string().trim().max(4000).nullable().optional(),
        householdName: z.string().trim().max(120).nullable().optional(),
      }).parse(req.body);
      res.status(201).json({ resident: createResident(input) });
    } catch (error) { next(error); }
  });

router.get("/properties/:propertyId/leases", requirePermission("leases:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ leases: listLeases(String(req.params.propertyId)) }));

router.get("/leases/:id", requirePermission("leases:view", (req) => propertyFromLease(String(req.params.id))),
  (req, res) => res.json({ lease: getLease(String(req.params.id)) }));

router.post("/leases", requirePermission("leases:manage", (req) => req.body?.propertyId as string | undefined),
  (req, res, next) => {
    try {
      const input = z.object({
        propertyId: z.string().min(1),
        unitId: z.string().min(1),
        householdId: z.string().nullable().optional(),
        startDate: z.iso.date(),
        endDate: z.iso.date().nullable().optional(),
        monthlyRent: z.number().min(0),
        status: z.enum(["draft", "active", "notice", "ended", "cancelled"]).optional(),
        moveInDate: z.iso.date().nullable().optional(),
        notes: z.string().trim().max(4000).nullable().optional(),
      }).parse(req.body);
      res.status(201).json({ lease: createLease(input) });
    } catch (error) { next(error); }
  });

router.get("/properties/:propertyId/households", requirePermission("residents:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ households: listHouseholds(String(req.params.propertyId)) }));

export default router;
