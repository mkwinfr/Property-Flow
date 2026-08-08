import { Router } from "express";
import { z } from "zod";
import { authenticate, requirePermission, userCan, type AuthenticatedRequest } from "../auth/session.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import { propertyIdFromTurn } from "../lib/propertyScope.js";
import {
  addTurnItem,
  addTurnVendorJob,
  createTurn,
  getTurn,
  hideTurnFinancials,
  listMyWork,
  listTurnBlockers,
  listTeamWorkload,
  listTemplates,
  listTurns,
  reviewTurnItem,
  resolveTurnBlocker,
  transitionTurn,
  updateTurnExecution,
  updateTurnItem,
  updateTurnVendorJob,
} from "./service.js";
import { recordTurnItemMaterialUsage, reverseTurnItemMaterialUsage } from "./materialService.js";
import { loadMakeReadyPdfRecord, makeReadyPdfFilename, renderMakeReadyPdf } from "./pdf.js";

const router = Router();
router.use(authenticate);

const propertyFromTurn = (turnId: string) => propertyIdFromTurn(turnId);

function canViewFinancials(userId: string, propertyId: string): boolean {
  return userCan(userId, "financial:view", propertyId) || userCan(userId, "turns:review", propertyId);
}

const visibleTurn = (turn: ReturnType<typeof getTurn>, userId: string) =>
  canViewFinancials(userId, turn.propertyId) ? turn : hideTurnFinancials(turn);

router.get(
  "/properties/:propertyId/turn-templates",
  requirePermission("templates:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ templates: listTemplates(String(req.params.propertyId)) }),
);

const executionSchema = z.object({
  leadTechnicianUserId: z.string().min(1).nullable().optional(),
  targetReadyDate: z.iso.date().nullable().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
}).refine((value) => Object.values(value).some((entry) => entry !== undefined), "No changes supplied");

router.patch(
  "/turns/:turnId",
  requirePermission("turns:update", (req) => propertyFromTurn(String(req.params.turnId))),
  (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({ turn: visibleTurn(updateTurnExecution(String(req.params.turnId), req.auth!.id, executionSchema.parse(req.body)), req.auth!.id) });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/properties/:propertyId/turns",
  requirePermission("turns:view", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ turns: listTurns(String(req.params.propertyId)) }),
);

router.get(
  "/properties/:propertyId/my-work",
  requirePermission("turns:view", (req) => String(req.params.propertyId)),
  (req: AuthenticatedRequest, res) => res.json({ turns: listMyWork(String(req.params.propertyId), req.auth!.id) }),
);

router.get(
  "/properties/:propertyId/team-workload",
  requirePermission("turns:review", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ team: listTeamWorkload(String(req.params.propertyId)) }),
);

router.get(
  "/properties/:propertyId/turn-blockers",
  requirePermission("turns:review", (req) => String(req.params.propertyId)),
  (req, res) => res.json({ blockers: listTurnBlockers(String(req.params.propertyId)) }),
);

router.get(
  "/turns/:turnId",
  requirePermission("turns:view", (req) => propertyFromTurn(String(req.params.turnId))),
  (req: AuthenticatedRequest, res) => res.json({ turn: visibleTurn(getTurn(String(req.params.turnId)), req.auth!.id) }),
);

router.get(
  "/turns/:turnId/export.pdf",
  requirePermission("turns:review", (req) => propertyFromTurn(String(req.params.turnId))),
  async (req, res, next) => {
    try {
      const record = loadMakeReadyPdfRecord(String(req.params.turnId));
      const pdf = await renderMakeReadyPdf(record);
      const filename = makeReadyPdfFilename(record);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", String(pdf.length));
      res.setHeader("Cache-Control", "private, no-store");
      res.send(pdf);
    } catch (error) {
      next(error);
    }
  },
);

const createSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().min(1),
  templateVersionId: z.string().min(1),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  moveOutDate: z.iso.date().nullable().optional(),
  targetReadyDate: z.iso.date().nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

router.post(
  "/turns",
  requirePermission("turns:create", (req) => req.body?.propertyId as string | undefined),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const input = createSchema.parse(req.body);
      res.status(201).json({ turn: visibleTurn(createTurn({ ...input, createdByUserId: req.auth!.id }), req.auth!.id) });
    } catch (error) {
      next(error);
    }
  },
);

const itemSchema = z
  .object({
    status: z.enum(["open", "in_progress", "blocked", "complete", "not_applicable"]).optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    blockedReason: z.string().trim().max(1000).nullable().optional(),
    blockerCategory: z.enum(["material", "vendor", "access", "approval", "scheduling", "other"]).optional(),
    responsibleParty: z.string().trim().max(240).nullable().optional(),
    expectedResolutionDate: z.iso.date().nullable().optional(),
    area: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    title: z.string().trim().min(2).max(240).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), "No changes supplied");

const addItemSchema = z.object({
  area: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(120),
  title: z.string().trim().min(2).max(240),
  notes: z.string().trim().max(4000).nullable().optional(),
});

router.post(
  "/turns/:turnId/items",
  requirePermission("turns:update", (req) => propertyFromTurn(String(req.params.turnId))),
  (req: AuthenticatedRequest, res, next) => {
    try {
      res.status(201).json({
        turn: visibleTurn(addTurnItem(String(req.params.turnId), req.auth!.id, addItemSchema.parse(req.body)), req.auth!.id),
      });
    } catch (error) {
      next(error);
    }
  },
);

const vendorJobStatus = z.enum(["proposed", "scheduled", "in_progress", "complete", "cancelled"]);
const vendorPaymentStatus = z.enum(["not_submitted", "pending_approval", "approved", "paid", "disputed", "not_applicable"]);
const vendorJobCreateSchema = z.object({
  vendorId: z.string().min(1),
  scope: z.string().trim().min(2).max(2000),
  status: vendorJobStatus.default("proposed"),
  scheduledDate: z.iso.date().nullable().optional(),
  quoteAmount: z.number().min(0).nullable().optional(),
  approvedAmount: z.number().min(0).nullable().optional(),
  invoiceAmount: z.number().min(0).nullable().optional(),
  invoiceNumber: z.string().trim().max(120).nullable().optional(),
  paymentStatus: vendorPaymentStatus.default("not_submitted"),
});
const vendorJobUpdateSchema = vendorJobCreateSchema.omit({ vendorId: true }).partial()
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), "No changes supplied");

router.post(
  "/turns/:turnId/vendor-jobs",
  requirePermission("turns:update", (req) => propertyFromTurn(String(req.params.turnId))),
  requirePermission("turns:review", (req) => propertyFromTurn(String(req.params.turnId))),
  (req: AuthenticatedRequest, res, next) => {
    try {
      res.status(201).json({ turn: visibleTurn(addTurnVendorJob(String(req.params.turnId), req.auth!.id, vendorJobCreateSchema.parse(req.body)), req.auth!.id) });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/turns/:turnId/vendor-jobs/:vendorJobId",
  requirePermission("turns:update", (req) => propertyFromTurn(String(req.params.turnId))),
  requirePermission("turns:review", (req) => propertyFromTurn(String(req.params.turnId))),
  (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({ turn: visibleTurn(updateTurnVendorJob(String(req.params.turnId), String(req.params.vendorJobId), req.auth!.id, vendorJobUpdateSchema.parse(req.body)), req.auth!.id) });
    } catch (error) {
      next(error);
    }
  },
);

const blockerResolutionSchema = z.object({
  resolutionNotes: z.string().trim().min(2).max(2000),
});

router.post(
  "/turns/:turnId/items/:itemId/blocker/resolve",
  requirePermission("turns:update", (req) => propertyFromTurn(String(req.params.turnId))),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const input = blockerResolutionSchema.parse(req.body);
      res.json({
        turn: visibleTurn(resolveTurnBlocker(
          String(req.params.turnId), String(req.params.itemId), req.auth!.id, input.resolutionNotes,
        ), req.auth!.id),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/turns/:turnId/items/:itemId",
  requirePermission("turns:update", (req) => propertyFromTurn(String(req.params.turnId))),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const input = itemSchema.parse(req.body);
      res.json({ turn: visibleTurn(updateTurnItem(String(req.params.turnId), String(req.params.itemId), req.auth!.id, input), req.auth!.id) });
    } catch (error) {
      next(error);
    }
  },
);

const materialUsageSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.number().finite().positive().max(10000),
});

router.post(
  "/turns/:turnId/items/:itemId/materials",
  requirePermission("turns:update", (req) => propertyFromTurn(String(req.params.turnId))),
  requirePermission("inventory:manage", (req) => propertyFromTurn(String(req.params.turnId))),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const input = materialUsageSchema.parse(req.body);
      recordTurnItemMaterialUsage(
        String(req.params.turnId),
        String(req.params.itemId),
        input.inventoryItemId,
        input.quantity,
        req.auth!.id,
      );
      res.status(201).json({ turn: visibleTurn(getTurn(String(req.params.turnId)), req.auth!.id) });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/turns/:turnId/items/:itemId/materials/:usageId/reverse",
  requirePermission("turns:update", (req) => propertyFromTurn(String(req.params.turnId))),
  requirePermission("inventory:manage", (req) => propertyFromTurn(String(req.params.turnId))),
  (req: AuthenticatedRequest, res, next) => {
    try {
      reverseTurnItemMaterialUsage(
        String(req.params.turnId),
        String(req.params.itemId),
        String(req.params.usageId),
        req.auth!.id,
      );
      res.json({ turn: visibleTurn(getTurn(String(req.params.turnId)), req.auth!.id) });
    } catch (error) {
      next(error);
    }
  },
);

const itemReviewSchema = z.object({
  decision: z.enum(["passed", "rework"]),
  notes: z.string().trim().max(2000).nullable().optional(),
}).superRefine((value, context) => {
  if (value.decision === "rework" && !value.notes?.trim()) {
    context.addIssue({ code: "custom", path: ["notes"], message: "Explain why this item requires rework" });
  }
});

router.post(
  "/turns/:turnId/items/:itemId/review",
  requirePermission("turns:review", (req) => propertyFromTurn(String(req.params.turnId))),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const input = itemReviewSchema.parse(req.body);
      res.json({ turn: visibleTurn(reviewTurnItem(String(req.params.turnId), String(req.params.itemId), req.auth!.id, input.decision, input.notes), req.auth!.id) });
    } catch (error) {
      next(error);
    }
  },
);

const transitionSchema = z.object({
  status: z.enum(["planned", "in_progress", "ready_for_review", "rework", "complete", "cancelled"]),
});

router.post(
  "/turns/:turnId/transitions",
  (req: AuthenticatedRequest, _res, next) => {
    if (!req.auth) return next(unauthorized());
    const reviewAction = req.body?.status === "complete" || req.body?.status === "rework";
    const permission = reviewAction ? "turns:review" : "turns:update";
    const propertyId = propertyFromTurn(String(req.params.turnId));
    if (!userCan(req.auth.id, permission, propertyId)) return next(forbidden());
    next();
  },
  (req: AuthenticatedRequest, res, next) => {
    try {
      const { status } = transitionSchema.parse(req.body);
      res.json({ turn: visibleTurn(transitionTurn(String(req.params.turnId), req.auth!.id, status), req.auth!.id) });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
