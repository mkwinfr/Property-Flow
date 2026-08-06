import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission, userCan, type AuthenticatedRequest } from "../auth/session.js";
import { db } from "../db/index.js";
import { renderWorkOrderPdf } from "./workOrderPdf.js";
import {
  adjustInventory,
  completeInspection,
  createInventoryReorder,
  createInspection,
  createPoolLog,
  createVendor,
  createWorkOrder,
  generateTurnFromInspection,
  getInspection,
  getOperationsSnapshot,
  listAppliances,
  listInspections,
  listInventory,
  listInventoryReorders,
  listPoolLogs,
  listTeam,
  listVendors,
  listWorkOrders,
  saveAppliance,
  updateInspectionItem,
  updateInventoryReorder,
  updateWorkOrder,
  updateWorkOrderFinancials,
  softDeleteWorkOrder,
} from "./service.js";

const router = Router();
router.use(authenticate);

const propertyFrom = (table: string, id: string): string | null => {
  const allowed: Record<string, string> = {
    work_orders: "property_id",
    inventory_items: "property_id",
    inventory_reorders: "property_id",
    move_out_inspections: "property_id",
  };
  const column = allowed[table];
  if (!column) return null;
  const row = db.prepare(`SELECT ${column} AS property_id FROM ${table} WHERE id = ?`).get(id) as { property_id: string } | undefined;
  return row?.property_id ?? null;
};
const propertyFromUnit = (unitId: string): string | null => {
  const row = db.prepare("SELECT property_id FROM units WHERE id = ?").get(unitId) as { property_id: string } | undefined;
  return row?.property_id ?? null;
};

router.get("/properties/:propertyId/operations", requirePermission("dashboard:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ operations: getOperationsSnapshot(String(req.params.propertyId)) }));
router.get("/properties/:propertyId/team", requirePermission("workorders:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ team: listTeam(String(req.params.propertyId)) }));

router.get("/properties/:propertyId/work-orders", requirePermission("workorders:view", (req) => String(req.params.propertyId)),
  (req: AuthenticatedRequest, res) => {
    const propertyId = String(req.params.propertyId);
    res.json({ workOrders: listWorkOrders(propertyId, userCan(req.auth!.id, "turns:review", propertyId)) });
  });

const workOrderCreateSchema = z.object({
  propertyId: z.string().min(1), unitId: z.string().min(1), title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).nullable().optional(), category: z.string().trim().min(2).max(80),
  priority: z.enum(["low", "normal", "high", "emergency"]), assignedToUserId: z.string().nullable().optional(),
  dueDate: z.iso.date().nullable().optional(), requestedBy: z.string().trim().max(160).nullable().optional(),
  areas: z.array(z.string().trim().min(1).max(80)).min(1).max(20), permissionToEnter: z.enum(["permission_given", "no_permission"]),
  appointmentRequired: z.boolean(), appointmentStart: z.string().max(40).nullable().optional(), appointmentEnd: z.string().max(40).nullable().optional(),
  accessNotes: z.string().trim().max(2000).nullable().optional(), petInformation: z.string().trim().max(1000).nullable().optional(),
  securityInstructions: z.string().trim().max(1000).nullable().optional(),
}).superRefine((input, context) => {
  if (input.permissionToEnter === "no_permission" && !input.appointmentRequired) context.addIssue({ code: "custom", path: ["appointmentRequired"], message: "An appointment is required when entry permission was not given" });
});
router.post("/work-orders", requirePermission("workorders:manage", (req) => req.body?.propertyId as string | undefined),
  (req: AuthenticatedRequest, res, next) => { try { const input = workOrderCreateSchema.parse(req.body); res.status(201).json({ workOrder: createWorkOrder({ ...input, actorUserId: req.auth!.id }) }); } catch (error) { next(error); } });

const workOrderUpdateSchema = z.object({ status: z.enum(["open", "assigned", "in_progress", "on_hold", "complete", "cancelled"]).optional(),
  priority: z.enum(["low", "normal", "high", "emergency"]).optional(), assignedToUserId: z.string().nullable().optional(), dueDate: z.iso.date().nullable().optional(),
  title: z.string().trim().min(3).max(160).optional(), description: z.string().trim().max(4000).nullable().optional(), category: z.string().trim().min(2).max(80).optional(),
  requestedBy: z.string().trim().max(160).nullable().optional(), areas: z.array(z.string().trim().min(1).max(80)).min(1).max(20).optional(),
  permissionToEnter: z.enum(["permission_given", "no_permission"]).optional(), appointmentRequired: z.boolean().optional(),
  appointmentStart: z.string().max(40).nullable().optional(), appointmentEnd: z.string().max(40).nullable().optional(), accessNotes: z.string().trim().max(2000).nullable().optional(),
  petInformation: z.string().trim().max(1000).nullable().optional(), securityInstructions: z.string().trim().max(1000).nullable().optional(),
  vendorWorkPerformed: z.boolean().optional(), vendorId: z.string().nullable().optional(), vendorScope: z.string().trim().max(3000).nullable().optional(),
  vendorScheduledDate: z.iso.date().nullable().optional(), vendorCompletedDate: z.iso.date().nullable().optional(), completedByUserId: z.string().nullable().optional(),
  completionNotes: z.string().trim().max(4000).nullable().optional(), workPerformed: z.string().trim().max(4000).nullable().optional(), residentNotified: z.boolean().optional(),
  notificationMethod: z.string().trim().max(100).nullable().optional(), followUpRequired: z.boolean().optional(), followUpDate: z.iso.date().nullable().optional() });
router.patch("/work-orders/:id", requirePermission("workorders:manage", (req) => propertyFrom("work_orders", String(req.params.id))),
  (req: AuthenticatedRequest, res, next) => { try { res.json({ workOrder: updateWorkOrder(String(req.params.id), req.auth!.id, workOrderUpdateSchema.parse(req.body)) }); } catch (error) { next(error); } });

const workOrderFinancialSchema = z.object({ vendorInvoiceNumber: z.string().trim().max(120).nullable().optional(), vendorCost: z.number().min(0).max(1000000).nullable().optional(),
  residentResponsible: z.boolean().optional(), residentChargeReason: z.string().trim().max(2000).nullable().optional(), residentChargeEstimate: z.number().min(0).max(1000000).nullable().optional(),
  residentChargeFinal: z.number().min(0).max(1000000).nullable().optional(), residentChargeStatus: z.enum(["pending", "approved", "posted", "waived"]).nullable().optional() });
router.patch("/work-orders/:id/financials", requirePermission("turns:review", (req) => propertyFrom("work_orders", String(req.params.id))),
  (req: AuthenticatedRequest, res, next) => { try { res.json({ workOrder: updateWorkOrderFinancials(String(req.params.id), req.auth!.id, workOrderFinancialSchema.parse(req.body)) }); } catch (error) { next(error); } });
router.delete("/work-orders/:id", requirePermission("turns:review", (req) => propertyFrom("work_orders", String(req.params.id))),
  (req: AuthenticatedRequest, res, next) => { try { softDeleteWorkOrder(String(req.params.id), req.auth!.id); res.status(204).end(); } catch (error) { next(error); } });
router.get("/work-orders/:id/export.pdf", requirePermission("workorders:view", (req) => propertyFrom("work_orders", String(req.params.id))),
  async (req, res, next) => { try { const pdf = await renderWorkOrderPdf(String(req.params.id)); res.type("application/pdf"); res.setHeader("Content-Disposition", `attachment; filename="${pdf.filename}"`); res.send(pdf.buffer); } catch (error) { next(error); } });

router.get("/units/:unitId/appliances", requirePermission("units:view", (req) => propertyFromUnit(String(req.params.unitId))),
  (req, res) => res.json({ appliances: listAppliances(String(req.params.unitId)) }));
const applianceSchema = z.object({ type: z.string().trim().min(2).max(80), brand: z.string().trim().max(100).nullable(),
  model: z.string().trim().max(120).nullable(), serialNumber: z.string().trim().max(160).nullable(),
  installDate: z.iso.date().nullable(), warrantyExpiry: z.iso.date().nullable(), notes: z.string().trim().max(3000).nullable() });
router.post("/units/:unitId/appliances", requirePermission("units:update", (req) => propertyFromUnit(String(req.params.unitId))),
  (req, res, next) => { try { res.status(201).json({ appliance: saveAppliance(String(req.params.unitId), applianceSchema.parse(req.body)) }); } catch (error) { next(error); } });
router.put("/units/:unitId/appliances/:id", requirePermission("units:update", (req) => propertyFromUnit(String(req.params.unitId))),
  (req, res, next) => { try { res.json({ appliance: saveAppliance(String(req.params.unitId), applianceSchema.parse(req.body), String(req.params.id)) }); } catch (error) { next(error); } });

router.get("/properties/:propertyId/inventory", requirePermission("inventory:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ inventory: listInventory(String(req.params.propertyId)) }));
const inventoryAdjustSchema = z.object({ quantityDelta: z.number().finite().refine((value) => value !== 0), reason: z.string().trim().min(3).max(300) });
router.post("/inventory/:id/adjustments", requirePermission("inventory:manage", (req) => propertyFrom("inventory_items", String(req.params.id))),
  (req: AuthenticatedRequest, res, next) => { try { const input = inventoryAdjustSchema.parse(req.body); res.json({ item: adjustInventory(String(req.params.id), req.auth!.id, input.quantityDelta, input.reason) }); } catch (error) { next(error); } });
router.get("/properties/:propertyId/inventory-reorders", requirePermission("turns:review", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ reorders: listInventoryReorders(String(req.params.propertyId)) }));
const inventoryReorderCreateSchema = z.object({ inventoryItemId: z.string().min(1), quantity: z.number().finite().positive().max(100000), supplier: z.string().trim().max(160).nullable().optional() });
router.post("/properties/:propertyId/inventory-reorders", requirePermission("inventory:manage", (req) => String(req.params.propertyId)),
  requirePermission("turns:review", (req) => String(req.params.propertyId)),
  (req: AuthenticatedRequest, res, next) => { try { const input = inventoryReorderCreateSchema.parse(req.body); res.status(201).json({ reorder: createInventoryReorder(String(req.params.propertyId), input.inventoryItemId, req.auth!.id, input.quantity, input.supplier) }); } catch (error) { next(error); } });
const inventoryReorderStatusSchema = z.object({ status: z.enum(["ordered", "received", "cancelled"]) });
router.patch("/inventory-reorders/:id", requirePermission("inventory:manage", (req) => propertyFrom("inventory_reorders", String(req.params.id))),
  requirePermission("turns:review", (req) => propertyFrom("inventory_reorders", String(req.params.id))),
  (req: AuthenticatedRequest, res, next) => { try { const input = inventoryReorderStatusSchema.parse(req.body); res.json({ reorder: updateInventoryReorder(String(req.params.id), req.auth!.id, input.status) }); } catch (error) { next(error); } });

router.get("/properties/:propertyId/vendors", requirePermission("vendors:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ vendors: listVendors(String(req.params.propertyId)) }));
const vendorSchema = z.object({ name: z.string().trim().min(2).max(160), contactName: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(), email: z.email().nullable().optional(),
  specialties: z.array(z.string().trim().min(1).max(80)).max(20), rating: z.number().min(1).max(5).nullable().optional() });
router.post("/properties/:propertyId/vendors", requirePermission("vendors:manage", (req) => String(req.params.propertyId)),
  (req, res, next) => { try { res.status(201).json({ vendor: createVendor(String(req.params.propertyId), vendorSchema.parse(req.body)) }); } catch (error) { next(error); } });

router.get("/properties/:propertyId/inspections", requirePermission("inspections:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ inspections: listInspections(String(req.params.propertyId)) }));
const inspectionCreateSchema = z.object({ propertyId: z.string().min(1), unitId: z.string().min(1),
  type: z.enum(["pre_move_out", "final", "other"]), inspectionDate: z.iso.date(), notes: z.string().trim().max(4000).nullable().optional() });
router.post("/inspections", requirePermission("inspections:manage", (req) => req.body?.propertyId as string | undefined),
  (req: AuthenticatedRequest, res, next) => { try { const input = inspectionCreateSchema.parse(req.body); res.status(201).json({ inspection: createInspection({ ...input, inspectorUserId: req.auth!.id }) }); } catch (error) { next(error); } });
router.get("/inspections/:id", requirePermission("inspections:view", (req) => propertyFrom("move_out_inspections", String(req.params.id))),
  (req, res, next) => { try { res.json({ inspection: getInspection(String(req.params.id)) }); } catch (error) { next(error); } });
const inspectionItemSchema = z.object({ condition: z.enum(["not_inspected", "good", "wear", "damage", "missing"]),
  responsibility: z.enum(["owner", "resident", "undetermined"]), notes: z.string().trim().max(3000).nullable().optional(),
  costEstimate: z.number().min(0).max(100000).nullable().optional(), severity: z.number().int().min(1).max(5).nullable().optional() });
router.patch("/inspections/:id/items/:itemId", requirePermission("inspections:manage", (req) => propertyFrom("move_out_inspections", String(req.params.id))),
  (req: AuthenticatedRequest, res, next) => { try { res.json({ inspection: updateInspectionItem(String(req.params.id), String(req.params.itemId), req.auth!.id, inspectionItemSchema.parse(req.body)) }); } catch (error) { next(error); } });
const inspectionCompleteSchema = z.object({ confirmWithoutDamagePhotos: z.boolean().default(false) });
router.post("/inspections/:id/complete", requirePermission("inspections:manage", (req) => propertyFrom("move_out_inspections", String(req.params.id))),
  (req: AuthenticatedRequest, res, next) => { try { const input = inspectionCompleteSchema.parse(req.body ?? {}); res.json({ inspection: completeInspection(String(req.params.id), req.auth!.id, input.confirmWithoutDamagePhotos) }); } catch (error) { next(error); } });
router.post("/inspections/:id/generate-turn", requirePermission("turns:create", (req) => propertyFrom("move_out_inspections", String(req.params.id))),
  (req: AuthenticatedRequest, res, next) => { try { res.json({ inspection: generateTurnFromInspection(String(req.params.id), req.auth!.id) }); } catch (error) { next(error); } });

router.get("/properties/:propertyId/pool-logs", requirePermission("pool:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ poolLogs: listPoolLogs(String(req.params.propertyId)) }));
const nullableReading = z.number().finite().nullable();
const poolSchema = z.object({ logDate: z.iso.date(), freeChlorine: nullableReading, totalChlorine: nullableReading,
  ph: nullableReading, alkalinity: nullableReading, hardness: nullableReading, cyanuricAcid: nullableReading,
  waterTempF: nullableReading, weatherSummary: z.string().trim().max(200).nullable().optional(), notes: z.string().trim().max(3000).nullable().optional() });
router.post("/properties/:propertyId/pool-logs", requirePermission("pool:manage", (req) => String(req.params.propertyId)),
  (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ poolLog: createPoolLog(String(req.params.propertyId), req.auth!.id, poolSchema.parse(req.body)) }); } catch (error) { next(error); } });

export default router;
