import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission, type AuthenticatedRequest } from "../auth/session.js";
import { db } from "../db/index.js";
import {
  createAccountingExport,
  createResidentCharge,
  exportRentRollCsv,
  getExecutiveSnapshot,
  getRentRoll,
  listAccountingExports,
  listResidentCharges,
  updateChargeStatus,
} from "./service.js";

const router = Router();
router.use(authenticate);

router.get("/properties/:propertyId/charges", requirePermission("financial:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ charges: listResidentCharges(String(req.params.propertyId)) }));

router.post("/charges", requirePermission("financial:edit", (req) => req.body?.propertyId as string | undefined),
  (req, res, next) => {
    try {
      const input = z.object({
        propertyId: z.string().min(1),
        residentId: z.string().nullable().optional(),
        leaseId: z.string().nullable().optional(),
        unitId: z.string().nullable().optional(),
        description: z.string().trim().min(1).max(240),
        amount: z.number().min(0),
        chargeType: z.enum(["rent", "fee", "damage", "utility", "other"]),
        dueDate: z.iso.date().nullable().optional(),
      }).parse(req.body);
      res.status(201).json({ charge: createResidentCharge(input) });
    } catch (error) { next(error); }
  });

router.patch("/charges/:id/status", requirePermission("financial:edit", (req) =>
  (db.prepare("SELECT property_id FROM resident_charges WHERE id = ?").get(String(req.params.id)) as { property_id: string } | undefined)?.property_id,
), (req, res, next) => {
  try {
    const status = z.object({ status: z.enum(["pending", "posted", "paid", "waived", "void"]) }).parse(req.body).status;
    res.json({ charge: updateChargeStatus(String(req.params.id), status) });
  } catch (error) { next(error); }
});

router.get("/properties/:propertyId/rent-roll", requirePermission("financial:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ rentRoll: getRentRoll(String(req.params.propertyId)) }));

router.get("/properties/:propertyId/rent-roll/export.csv", requirePermission("financial:view", (req) => String(req.params.propertyId)),
  (req, res) => {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="rent-roll-${req.params.propertyId}.csv"`);
    res.send(exportRentRollCsv(String(req.params.propertyId)));
  });

router.get("/properties/:propertyId/executive", requirePermission("financial:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ executive: getExecutiveSnapshot(String(req.params.propertyId)) }));

router.get("/properties/:propertyId/accounting-exports", requirePermission("financial:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ exports: listAccountingExports(String(req.params.propertyId)) }));

router.post("/accounting-exports", requirePermission("financial:edit", (req) => req.body?.propertyId as string | undefined),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const input = z.object({
        propertyId: z.string().min(1),
        exportType: z.enum(["rent_roll", "charges", "vendor_costs", "full_period"]),
        periodStart: z.iso.date(),
        periodEnd: z.iso.date(),
      }).parse(req.body);
      res.status(201).json({ export: createAccountingExport({ ...input, createdByUserId: req.auth!.id }) });
    } catch (error) { next(error); }
  });

export default router;
