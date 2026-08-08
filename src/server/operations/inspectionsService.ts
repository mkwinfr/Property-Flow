import { randomUUID } from "node:crypto";
import type {
  InspectionCondition,
  InspectionDetail,
  InspectionResponsibility,
  InspectionSummary,
} from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { createTurn } from "../turns/service.js";
import { conflict, notFound } from "../lib/errors.js";
import { appendActivity, now } from "./shared.js";

export function listInspections(propertyId: string): InspectionSummary[] {
  return db.prepare(
    `SELECT mi.id, mi.property_id AS propertyId, mi.unit_id AS unitId, u.unit_number AS unitNumber,
            mi.type, mi.status, mi.inspection_date AS inspectionDate, inspector.name AS inspectorName,
            SUM(ii.condition != 'not_inspected') AS assessedItems, COUNT(ii.id) AS totalItems,
            SUM(ii.condition IN ('damage', 'missing')) AS damageItems,
            SUM(CASE WHEN ii.responsibility = 'resident' THEN COALESCE(ii.cost_estimate, 0) ELSE 0 END) AS estimatedCharges,
            mi.generated_turn_id AS generatedTurnId, mi.template_version_id AS templateVersionId,
            mi.template_name_snapshot AS templateName, mi.template_version_snapshot AS templateVersion
     FROM move_out_inspections mi JOIN units u ON u.id = mi.unit_id
     LEFT JOIN users inspector ON inspector.id = mi.inspector_user_id
     LEFT JOIN inspection_items ii ON ii.inspection_id = mi.id
     WHERE mi.property_id = ? GROUP BY mi.id ORDER BY mi.inspection_date DESC, u.unit_number`,
  ).all(propertyId).map((row) => {
    const typed = row as InspectionSummary;
    return {
      ...typed,
      assessedItems: Number(typed.assessedItems),
      totalItems: Number(typed.totalItems),
      damageItems: Number(typed.damageItems),
      estimatedCharges: Number(typed.estimatedCharges),
    };
  });
}

export function createInspection(input: {
  propertyId: string;
  unitId: string;
  type: InspectionSummary["type"];
  inspectionDate: string;
  notes?: string | null;
  inspectorUserId: string;
}): InspectionDetail {
  const id = randomUUID();
  const timestamp = now();
  db.transaction(() => {
    const unit = db.prepare(
      `SELECT u.property_id, fp.id AS floor_plan_id, fp.bedrooms, fp.bathrooms
       FROM units u JOIN floor_plans fp ON fp.id = u.floor_plan_id WHERE u.id = ?`,
    ).get(input.unitId) as { property_id: string; floor_plan_id: string; bedrooms: number; bathrooms: number } | undefined;
    if (!unit || unit.property_id !== input.propertyId) throw notFound("Unit not found at this property");
    const template = db.prepare(
      `SELECT tt.name, tv.id AS versionId, tv.version
       FROM turn_templates tt
       JOIN turn_template_versions tv ON tv.id = (
         SELECT tv2.id FROM turn_template_versions tv2 WHERE tv2.template_id = tt.id ORDER BY tv2.version DESC LIMIT 1)
       WHERE tt.property_id = ? AND tt.status = 'active' AND (
         EXISTS (SELECT 1 FROM turn_template_floor_plans tfp WHERE tfp.template_id = tt.id AND tfp.floor_plan_id = ?)
         OR (NOT EXISTS (SELECT 1 FROM turn_template_floor_plans assigned WHERE assigned.template_id = tt.id) AND tt.match_bedrooms = ?)
       )
       ORDER BY CASE WHEN EXISTS (SELECT 1 FROM turn_template_floor_plans exact_match WHERE exact_match.template_id = tt.id AND exact_match.floor_plan_id = ?) THEN 0
         WHEN tt.match_bathrooms = ? THEN 1 WHEN tt.match_bathrooms IS NULL THEN 2 ELSE 3 END
       LIMIT 1`,
    ).get(input.propertyId, unit.floor_plan_id, unit.bedrooms, unit.floor_plan_id, unit.bathrooms) as { name: string; versionId: string; version: number } | undefined;
    if (!template) throw conflict("No published scope template matches this unit's floor plan");
    db.prepare(
      `INSERT INTO move_out_inspections
       (id, property_id, unit_id, type, status, inspection_date, inspector_user_id, notes,
        template_version_id, template_name_snapshot, template_version_snapshot, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.propertyId, input.unitId, input.type, input.inspectionDate, input.inspectorUserId,
      input.notes ?? null, template.versionId, template.name, template.version, timestamp, timestamp);
    const insert = db.prepare(
      `INSERT INTO inspection_items
       (id, inspection_id, template_key, source_template_item_id, room, category, label,
        condition, responsibility, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'not_inspected', 'undetermined', ?, ?)`,
    );
    const scopeItems = db.prepare(
      `SELECT id, item_key, area, category, title, sort_order
       FROM turn_template_items WHERE template_version_id = ? ORDER BY sort_order`,
    ).all(template.versionId) as Array<{ id: string; item_key: string; area: string; category: string; title: string; sort_order: number }>;
    if (!scopeItems.length) throw conflict("The matching scope template has no published items");
    scopeItems.forEach((item) => insert.run(
      randomUUID(), id, item.item_key, item.id, item.area, item.category, item.title, item.sort_order, timestamp,
    ));
    appendActivity(input.propertyId, input.inspectorUserId, "inspection", id, "inspection.created", { unitId: input.unitId });
  })();
  return getInspection(id);
}

export function getInspection(id: string): InspectionDetail {
  const summary = db.prepare(
    `SELECT mi.id, mi.property_id AS propertyId, mi.unit_id AS unitId, u.unit_number AS unitNumber,
            mi.type, mi.status, mi.inspection_date AS inspectionDate, inspector.name AS inspectorName,
            SUM(ii.condition != 'not_inspected') AS assessedItems, COUNT(ii.id) AS totalItems,
            SUM(ii.condition IN ('damage', 'missing')) AS damageItems,
            SUM(CASE WHEN ii.responsibility = 'resident' THEN COALESCE(ii.cost_estimate, 0) ELSE 0 END) AS estimatedCharges,
            mi.generated_turn_id AS generatedTurnId, mi.template_version_id AS templateVersionId,
            mi.template_name_snapshot AS templateName, mi.template_version_snapshot AS templateVersion, mi.notes
     FROM move_out_inspections mi JOIN units u ON u.id = mi.unit_id
     LEFT JOIN users inspector ON inspector.id = mi.inspector_user_id
     LEFT JOIN inspection_items ii ON ii.inspection_id = mi.id WHERE mi.id = ? GROUP BY mi.id`,
  ).get(id) as (InspectionSummary & { notes: string | null }) | undefined;
  if (!summary) throw notFound("Inspection not found");
  const items = db.prepare(
    `SELECT ii.id, ii.source_template_item_id AS sourceTemplateItemId, ii.template_key AS templateKey,
            ii.room, ii.category, ii.label, ii.condition, ii.responsibility, ii.notes,
            ii.cost_estimate AS costEstimate, ii.severity,
            EXISTS(SELECT 1 FROM attachments a WHERE a.entity_type = 'inspection_item' AND a.entity_id = ii.id) AS hasAttachments
     FROM inspection_items ii
     WHERE inspection_id = ? ORDER BY sort_order`,
  ).all(id).map((item) => ({
    ...(item as Omit<InspectionDetail["items"][number], "hasAttachments"> & { hasAttachments: number }),
    hasAttachments: Boolean((item as { hasAttachments: number }).hasAttachments),
  }));
  return {
    ...summary,
    assessedItems: Number(summary.assessedItems),
    totalItems: Number(summary.totalItems),
    damageItems: Number(summary.damageItems),
    estimatedCharges: Number(summary.estimatedCharges),
    items,
  };
}

export function updateInspectionItem(
  inspectionId: string,
  itemId: string,
  actorUserId: string,
  input: {
    condition: InspectionCondition;
    responsibility: InspectionResponsibility;
    notes?: string | null;
    costEstimate?: number | null;
    severity?: number | null;
  },
): InspectionDetail {
  const inspection = db.prepare("SELECT property_id, status FROM move_out_inspections WHERE id = ?").get(inspectionId) as { property_id: string; status: string } | undefined;
  if (!inspection) throw notFound("Inspection not found");
  if (inspection.status !== "draft") throw conflict("Completed inspections are locked");
  const result = db.prepare(
    `UPDATE inspection_items SET condition = ?, responsibility = ?, notes = ?, cost_estimate = ?, severity = ?, updated_at = ?
     WHERE id = ? AND inspection_id = ?`,
  ).run(input.condition, input.responsibility, input.notes ?? null, input.costEstimate ?? null, input.severity ?? null, now(), itemId, inspectionId);
  if (!result.changes) throw notFound("Inspection item not found");
  appendActivity(inspection.property_id, actorUserId, "inspection", inspectionId, "inspection.item.assessed", { itemId, condition: input.condition });
  return getInspection(inspectionId);
}

export function completeInspection(inspectionId: string, actorUserId: string, confirmWithoutDamagePhotos = false): InspectionDetail {
  const detail = getInspection(inspectionId);
  if (detail.status !== "draft") throw conflict("Only draft inspections can be completed");
  if (detail.assessedItems !== detail.totalItems) throw conflict("Assess every inspection item before completion");
  const missingDamagePhotos = detail.items.filter((item) => item.condition === "damage" && !item.hasAttachments);
  if (missingDamagePhotos.length && !confirmWithoutDamagePhotos) {
    throw conflict("Confirm that you want to complete this inspection without photos for every damaged item");
  }
  db.prepare("UPDATE move_out_inspections SET status = 'complete', updated_at = ? WHERE id = ?").run(now(), inspectionId);
  appendActivity(detail.propertyId, actorUserId, "inspection", inspectionId, "inspection.completed", { damageItems: detail.damageItems });
  return getInspection(inspectionId);
}

export function generateTurnFromInspection(inspectionId: string, actorUserId: string): InspectionDetail {
  return db.transaction(() => {
    const inspection = getInspection(inspectionId);
    if (inspection.status === "draft") throw conflict("Complete the inspection before generating a turn");
    if (inspection.generatedTurnId) return inspection;
    const match = inspection.templateVersionId
      ? { version_id: inspection.templateVersionId }
      : db.prepare(
          `SELECT tv.id AS version_id
           FROM units u JOIN floor_plans fp ON fp.id = u.floor_plan_id
           JOIN turn_templates tt ON tt.match_bedrooms = fp.bedrooms AND tt.status = 'active' AND tt.property_id = u.property_id
           JOIN turn_template_versions tv ON tv.id = (
             SELECT tv2.id FROM turn_template_versions tv2 WHERE tv2.template_id = tt.id ORDER BY version DESC LIMIT 1)
           WHERE u.id = ? ORDER BY CASE WHEN tt.match_bathrooms = fp.bathrooms THEN 0 ELSE 1 END LIMIT 1`,
        ).get(inspection.unitId) as { version_id: string } | undefined;
    if (!match) throw conflict("No published turn template matches this unit");
    const turn = createTurn({
      propertyId: inspection.propertyId,
      unitId: inspection.unitId,
      templateVersionId: match.version_id,
      priority: inspection.damageItems >= 3 ? "high" : "normal",
      moveOutDate: inspection.inspectionDate,
      targetReadyDate: null,
      notes: `Generated from ${inspection.type.replaceAll("_", " ")} inspection.`,
      createdByUserId: actorUserId,
    });
    const turnItems = db.prepare(
      "SELECT id, source_template_item_id FROM turn_items WHERE turn_id = ?",
    ).all(turn.id) as Array<{ id: string; source_template_item_id: string | null }>;
    const byTemplateItem = new Map(turnItems.map((item) => [item.source_template_item_id, item.id]));
    const updateCarriedItem = db.prepare(
      `UPDATE turn_items SET status = ?, notes = ?, origin = 'inspection', source_inspection_item_id = ?,
       inspection_condition = ?, inspection_responsibility = ?, inspection_cost_estimate = ?, updated_at = ?
       WHERE id = ?`,
    );
    const insertLegacyFinding = db.prepare(
      `INSERT INTO turn_items
       (id, turn_id, area, category, title, status, notes, sort_order, created_at, updated_at,
        origin, source_inspection_item_id, inspection_condition, inspection_responsibility, inspection_cost_estimate)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, 'inspection', ?, ?, ?, ?)`,
    );
    let legacyOrder = 1000;
    for (const item of inspection.items) {
      const turnItemId = item.sourceTemplateItemId ? byTemplateItem.get(item.sourceTemplateItemId) : undefined;
      const status = item.condition === "good" ? "not_applicable" : "open";
      if (turnItemId) {
        updateCarriedItem.run(status, item.notes, item.id, item.condition, item.responsibility,
          item.costEstimate, now(), turnItemId);
      } else if (item.condition === "damage" || item.condition === "missing" || item.condition === "wear") {
        insertLegacyFinding.run(randomUUID(), turn.id, item.room, item.category, item.label, item.notes,
          legacyOrder++, now(), now(), item.id, item.condition, item.responsibility, item.costEstimate);
      }
    }
    db.prepare("UPDATE move_out_inspections SET generated_turn_id = ?, status = 'locked', updated_at = ? WHERE id = ?").run(turn.id, now(), inspectionId);
    appendActivity(inspection.propertyId, actorUserId, "inspection", inspectionId, "inspection.turn.generated", {
      turnId: turn.id,
      actionableItemCount: inspection.items.filter((item) => item.condition !== "good").length,
      scopeItemCount: inspection.items.length,
    });
    return getInspection(inspectionId);
  })();
}
