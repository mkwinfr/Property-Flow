import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { attachmentMimeExtensions, portalDocumentMimeTypes, portalPhotoMimeTypes } from "../attachments/shared.js";
import { badRequest, notFound } from "../lib/errors.js";
import { resolveResidentHousehold } from "./service.js";

const PORTAL_UPLOAD_ACTOR = "user-manager";

export function assertPortalWorkOrderAccess(residentId: string, workOrderId: string): { propertyId: string } {
  const row = db.prepare(
    "SELECT property_id AS propertyId FROM work_orders WHERE id = ? AND resident_id = ?",
  ).get(workOrderId, residentId) as { propertyId: string } | undefined;
  if (!row) throw notFound("Maintenance request not found");
  return row;
}

export function resolvePortalLeaseId(residentId: string): string | null {
  const row = db.prepare(
    `SELECT l.id
     FROM leases l JOIN household_members hm ON hm.household_id = l.household_id
     WHERE hm.resident_id = ? AND l.status IN ('active', 'notice')
     ORDER BY l.start_date DESC LIMIT 1`,
  ).get(residentId) as { id: string } | undefined;
  return row?.id ?? null;
}

function assertPortalLeaseAccess(residentId: string, leaseId: string): { propertyId: string } {
  const row = db.prepare(
    `SELECT l.property_id AS propertyId
     FROM leases l JOIN household_members hm ON hm.household_id = l.household_id
     WHERE l.id = ? AND hm.resident_id = ? AND l.status IN ('active', 'notice', 'ended')`,
  ).get(leaseId, residentId) as { propertyId: string } | undefined;
  if (!row) throw notFound("Lease not found");
  return row;
}

export function listPortalMaintenanceAttachments(residentId: string, workOrderId: string) {
  assertPortalWorkOrderAccess(residentId, workOrderId);
  return db.prepare(
    `SELECT id, original_name AS originalName, mime_type AS mimeType, size_bytes AS sizeBytes,
            caption, created_at AS createdAt
     FROM attachments
     WHERE entity_type = 'work_order' AND entity_id = ?
     ORDER BY created_at DESC`,
  ).all(workOrderId);
}

export function listPortalLeaseDocuments(residentId: string) {
  const leaseId = resolvePortalLeaseId(residentId);
  if (!leaseId) return [];
  return db.prepare(
    `SELECT id, original_name AS originalName, mime_type AS mimeType, size_bytes AS sizeBytes,
            caption, created_at AS createdAt
     FROM attachments
     WHERE entity_type = 'lease' AND entity_id = ?
     ORDER BY created_at DESC`,
  ).all(leaseId);
}

export function createPortalMaintenanceAttachment(input: {
  residentId: string;
  workOrderId: string;
  originalName: string;
  mimeType: string;
  dataBase64: string;
  caption?: string | null;
}) {
  const access = assertPortalWorkOrderAccess(input.residentId, input.workOrderId);
  if (!(portalPhotoMimeTypes as readonly string[]).includes(input.mimeType)) {
    throw badRequest("Only JPEG, PNG, and WebP photos are supported");
  }
  const bytes = decodeAttachmentBytes(input.dataBase64);
  if (bytes.length > 5 * 1024 * 1024) throw badRequest("Photos are limited to 5 MB");
  const id = randomUUID();
  const storedName = storeAttachmentFile(id, input.mimeType, bytes);
  const timestamp = new Date().toISOString();
  db.prepare(
    `INSERT INTO attachments
     (id, property_id, entity_type, entity_id, original_name, stored_name, mime_type, size_bytes,
      caption, uploaded_by_user_id, uploaded_by_resident_id, created_at)
     VALUES (?, ?, 'work_order', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    access.propertyId,
    input.workOrderId,
    input.originalName,
    storedName,
    input.mimeType,
    bytes.length,
    input.caption ?? null,
    PORTAL_UPLOAD_ACTOR,
    input.residentId,
    timestamp,
  );
  return listPortalMaintenanceAttachments(input.residentId, input.workOrderId).find((item) => (item as { id: string }).id === id)!;
}

function assertPortalHouseholdAccess(residentId: string, householdId: string): { propertyId: string } {
  const row = db.prepare(
    `SELECT h.property_id AS propertyId
     FROM households h JOIN household_members hm ON hm.household_id = h.id
     WHERE h.id = ? AND hm.resident_id = ?`,
  ).get(householdId, residentId) as { propertyId: string } | undefined;
  if (!row) throw notFound("Household not found");
  return row;
}

export function listPortalHouseholdSubmissions(residentId: string) {
  const { householdId } = resolveResidentHousehold(residentId);
  return db.prepare(
    `SELECT id, original_name AS originalName, mime_type AS mimeType, size_bytes AS sizeBytes,
            caption, created_at AS createdAt
     FROM attachments
     WHERE entity_type = 'household' AND entity_id = ? AND uploaded_by_resident_id IS NOT NULL
     ORDER BY created_at DESC`,
  ).all(householdId);
}

export function createPortalHouseholdSubmission(input: {
  residentId: string;
  originalName: string;
  mimeType: string;
  dataBase64: string;
  caption?: string | null;
}) {
  const { householdId, propertyId } = resolveResidentHousehold(input.residentId);
  if (!(portalDocumentMimeTypes as readonly string[]).includes(input.mimeType)) {
    throw badRequest("Only JPEG, PNG, WebP, and PDF files are supported");
  }
  const bytes = decodeAttachmentBytes(input.dataBase64);
  if (bytes.length > 5 * 1024 * 1024) throw badRequest("Files are limited to 5 MB");
  const id = randomUUID();
  const storedName = storeAttachmentFile(id, input.mimeType, bytes);
  const timestamp = new Date().toISOString();
  db.prepare(
    `INSERT INTO attachments
     (id, property_id, entity_type, entity_id, original_name, stored_name, mime_type, size_bytes,
      caption, uploaded_by_user_id, uploaded_by_resident_id, created_at)
     VALUES (?, ?, 'household', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    propertyId,
    householdId,
    input.originalName,
    storedName,
    input.mimeType,
    bytes.length,
    input.caption ?? null,
    PORTAL_UPLOAD_ACTOR,
    input.residentId,
    timestamp,
  );
  return listPortalHouseholdSubmissions(input.residentId).find((item) => (item as { id: string }).id === id)!;
}

export function getPortalAttachmentContent(residentId: string, attachmentId: string) {
  const row = db.prepare("SELECT * FROM attachments WHERE id = ?").get(attachmentId) as
    | {
        entity_type: "work_order" | "lease" | "household";
        entity_id: string;
        stored_name: string;
        mime_type: string;
        original_name: string;
      }
    | undefined;
  if (!row) throw notFound("Attachment not found");
  if (row.entity_type === "work_order") assertPortalWorkOrderAccess(residentId, row.entity_id);
  else if (row.entity_type === "lease") assertPortalLeaseAccess(residentId, row.entity_id);
  else assertPortalHouseholdAccess(residentId, row.entity_id);
  const filePath = resolveAttachmentPath(row.stored_name);
  return { filePath, mimeType: row.mime_type, originalName: row.original_name };
}

export function listPortalMessages(residentId: string) {
  return db.prepare(
    `SELECT d.id,
            COALESCE(t.subject, c.name) AS subject,
            COALESCE(t.body, 'No message body was provided.') AS body,
            c.name AS campaignName,
            d.sent_at AS sentAt,
            d.read_at AS readAt
     FROM message_deliveries d
     JOIN message_campaigns c ON c.id = d.campaign_id
     LEFT JOIN message_templates t ON t.id = c.template_id
     WHERE d.recipient_type = 'resident'
       AND d.recipient_id = ?
       AND d.channel = 'in_app'
       AND d.status = 'sent'
     ORDER BY d.sent_at DESC
     LIMIT 50`,
  ).all(residentId);
}

export function markPortalMessageRead(residentId: string, deliveryId: string) {
  const row = db.prepare(
    "SELECT id FROM message_deliveries WHERE id = ? AND recipient_type = 'resident' AND recipient_id = ?",
  ).get(deliveryId, residentId);
  if (!row) throw notFound("Message not found");
  const timestamp = new Date().toISOString();
  db.prepare("UPDATE message_deliveries SET read_at = COALESCE(read_at, ?) WHERE id = ?").run(timestamp, deliveryId);
  return listPortalMessages(residentId).find((item) => (item as { id: string }).id === deliveryId)!;
}

export function countPortalUnreadMessages(residentId: string): number {
  const row = db.prepare(
    `SELECT COUNT(*) AS count
     FROM message_deliveries
     WHERE recipient_type = 'resident'
       AND recipient_id = ?
       AND channel = 'in_app'
       AND status = 'sent'
       AND read_at IS NULL`,
  ).get(residentId) as { count: number };
  return row.count;
}

function decodeAttachmentBytes(dataBase64: string): Buffer {
  const bytes = Buffer.from(dataBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (!bytes.length) throw badRequest("The attachment is empty");
  return bytes;
}

function storeAttachmentFile(id: string, mimeType: string, bytes: Buffer): string {
  const extension = attachmentMimeExtensions[mimeType];
  if (!extension) throw badRequest("Unsupported file type");
  fs.mkdirSync(config.attachmentsPath, { recursive: true });
  const storedName = `${id}${extension}`;
  fs.writeFileSync(path.join(config.attachmentsPath, storedName), bytes, { flag: "wx" });
  return storedName;
}

function resolveAttachmentPath(storedName: string): string {
  const filePath = path.resolve(config.attachmentsPath, storedName);
  if (path.dirname(filePath) !== path.resolve(config.attachmentsPath) || !fs.existsSync(filePath)) {
    throw notFound("Attachment file not found");
  }
  return filePath;
}
