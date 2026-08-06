import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { authenticate, userCan, type AuthenticatedRequest } from "../auth/session.js";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";

const router = Router();
router.use(authenticate);

const entityTypes = ["turn", "turn_item", "work_order", "inspection", "inspection_item", "appliance"] as const;
const mimeExtensions: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf",
};

function entityPermission(entityType: typeof entityTypes[number], write: boolean): string {
  if (entityType === "turn") return "turns:review";
  if (entityType === "turn_item") return write ? "turns:update" : "turns:view";
  if (entityType === "work_order") return write ? "workorders:manage" : "workorders:view";
  if (entityType.startsWith("inspection")) return write ? "inspections:manage" : "inspections:view";
  return write ? "units:update" : "units:view";
}

function validateAccess(req: AuthenticatedRequest, propertyId: string, entityType: typeof entityTypes[number], write: boolean) {
  if (!userCan(req.auth!.id, entityPermission(entityType, write), propertyId)) throw forbidden();
}

function entityProperty(entityType: typeof entityTypes[number], entityId: string): string {
  const queries: Record<typeof entityTypes[number], string> = {
    turn: "SELECT property_id AS propertyId FROM turns WHERE id = ?",
    turn_item: "SELECT t.property_id AS propertyId FROM turn_items ti JOIN turns t ON t.id = ti.turn_id WHERE ti.id = ?",
    work_order: "SELECT property_id AS propertyId FROM work_orders WHERE id = ?",
    inspection: "SELECT property_id AS propertyId FROM move_out_inspections WHERE id = ?",
    inspection_item: "SELECT mi.property_id AS propertyId FROM inspection_items ii JOIN move_out_inspections mi ON mi.id = ii.inspection_id WHERE ii.id = ?",
    appliance: "SELECT u.property_id AS propertyId FROM appliances a JOIN units u ON u.id = a.unit_id WHERE a.id = ?",
  };
  const row = db.prepare(queries[entityType]).get(entityId) as { propertyId: string } | undefined;
  if (!row) throw notFound("Attachment target not found");
  return row.propertyId;
}

const uploadSchema = z.object({
  propertyId: z.string().min(1), entityType: z.enum(entityTypes), entityId: z.string().min(1),
  originalName: z.string().trim().min(1).max(240), mimeType: z.string().refine((value) => value in mimeExtensions, "Unsupported file type"),
  dataBase64: z.string().min(1), caption: z.string().trim().max(500).nullable().optional(),
});

router.post("/attachments", (req: AuthenticatedRequest, res, next) => {
  try {
    const input = uploadSchema.parse(req.body);
    if (entityProperty(input.entityType, input.entityId) !== input.propertyId) throw notFound("Attachment target not found at this property");
    validateAccess(req, input.propertyId, input.entityType, true);
    const bytes = Buffer.from(input.dataBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
    if (!bytes.length) throw badRequest("The attachment is empty");
    if (bytes.length > 5 * 1024 * 1024) throw badRequest("Attachments are limited to 5 MB");
    fs.mkdirSync(config.attachmentsPath, { recursive: true });
    const id = randomUUID();
    const storedName = `${id}${mimeExtensions[input.mimeType]}`;
    fs.writeFileSync(path.join(config.attachmentsPath, storedName), bytes, { flag: "wx" });
    db.prepare(
      `INSERT INTO attachments
       (id, property_id, entity_type, entity_id, original_name, stored_name, mime_type, size_bytes,
        caption, uploaded_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.propertyId, input.entityType, input.entityId, input.originalName, storedName, input.mimeType,
      bytes.length, input.caption ?? null, req.auth!.id, new Date().toISOString());
    res.status(201).json({ attachment: { id, originalName: input.originalName, mimeType: input.mimeType, sizeBytes: bytes.length, caption: input.caption ?? null } });
  } catch (error) { next(error); }
});

router.get("/attachments", (req: AuthenticatedRequest, res, next) => {
  try {
    const entityType = z.enum(entityTypes).parse(req.query.entityType);
    const entityId = z.string().min(1).parse(req.query.entityId);
    const propertyId = entityProperty(entityType, entityId);
    validateAccess(req, propertyId, entityType, false);
    const rows = db.prepare(
      `SELECT id, property_id AS propertyId, original_name AS originalName, mime_type AS mimeType,
              size_bytes AS sizeBytes, caption, created_at AS createdAt
       FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC`,
    ).all(entityType, entityId) as Array<{ propertyId: string }>;
    res.json({ attachments: rows });
  } catch (error) { next(error); }
});

router.get("/attachments/:id/content", (req: AuthenticatedRequest, res, next) => {
  try {
    const row = db.prepare("SELECT * FROM attachments WHERE id = ?").get(String(req.params.id)) as
      | { property_id: string; entity_type: typeof entityTypes[number]; stored_name: string; mime_type: string; original_name: string }
      | undefined;
    if (!row) throw notFound("Attachment not found");
    validateAccess(req, row.property_id, row.entity_type, false);
    const filePath = path.resolve(config.attachmentsPath, row.stored_name);
    if (path.dirname(filePath) !== path.resolve(config.attachmentsPath) || !fs.existsSync(filePath)) throw notFound("Attachment file not found");
    res.type(row.mime_type);
    res.setHeader("Content-Disposition", `inline; filename="${row.original_name.replaceAll('"', "")}"`);
    res.sendFile(filePath);
  } catch (error) { next(error); }
});

export default router;
