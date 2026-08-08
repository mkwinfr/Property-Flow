import type Database from "better-sqlite3";
import type {
  TurnDetail,
  TurnBlockerQueueItem,
  MyWorkTurn,
  TeamWorkloadMember,
  TurnSummary,
  TurnTemplateSummary,
  TurnVendorJob,
} from "../../shared/contracts.js";
import { db } from "../db/index.js";
import {
  countTurnItemProgress,
  findTurnNotes,
  findTurnSummary,
  listTurnBlockers as listTurnBlockersFromRepo,
  listTurnSummaries,
  listTurnTemplates,
} from "../db/repositories/turnsRepository.js";
import { notFound } from "../lib/errors.js";
import { listTurnItemMaterials } from "./materialService.js";

export function listTemplates(propertyId: string): TurnTemplateSummary[] {
  return listTurnTemplates(db, propertyId);
}

export function listTurns(propertyId: string, database: Database.Database = db): TurnSummary[] {
  return listTurnSummaries(database, propertyId);
}

export function listMyWork(propertyId: string, userId: string, database: Database.Database = db): MyWorkTurn[] {
  const assigned = listTurnSummaries(database, propertyId).filter((turn) =>
    turn.leadTechnicianUserId === userId && !["complete", "cancelled"].includes(turn.status));
  return assigned.map((turn) => {
    const counts = countTurnItemProgress(database, turn.id);
    return {
      ...turn,
      openItems: Number(counts.openItems ?? 0),
      inProgressItems: Number(counts.inProgressItems ?? 0),
      blockedItems: Number(counts.blockedItems ?? 0),
      reworkItems: Number(counts.reworkItems ?? 0),
    };
  });
}

export function listTeamWorkload(propertyId: string, database: Database.Database = db): TeamWorkloadMember[] {
  const team = database.prepare(
    `SELECT u.id AS userId, u.name, GROUP_CONCAT(DISTINCT r.name) AS roles,
            COUNT(DISTINCT CASE WHEN t.status NOT IN ('complete', 'cancelled') THEN t.id END) AS activeTurns,
            COUNT(DISTINCT CASE WHEN t.priority = 'urgent' AND t.status NOT IN ('complete', 'cancelled') THEN t.id END) AS urgentTurns,
            COUNT(DISTINCT CASE WHEN t.target_ready_date < date('now') AND t.status NOT IN ('complete', 'cancelled') THEN t.id END) AS overdueTurns,
            COUNT(DISTINCT CASE WHEN t.status = 'rework' THEN t.id END) AS reworkTurns,
            COUNT(DISTINCT CASE WHEN ti.status = 'blocked' AND t.status NOT IN ('complete', 'cancelled') THEN ti.id END) AS blockedItems
     FROM users u
     JOIN role_assignments ra ON ra.user_id = u.id AND (ra.property_id IS NULL OR ra.property_id = ?)
     JOIN roles r ON r.id = ra.role_id
     LEFT JOIN turns t ON t.lead_technician_user_id = u.id AND t.property_id = ?
     LEFT JOIN turn_items ti ON ti.turn_id = t.id
     WHERE u.status = 'active'
     GROUP BY u.id, u.name
     ORDER BY activeTurns DESC, overdueTurns DESC, u.name`,
  ).all(propertyId, propertyId).map((row) => {
    const item = row as Record<string, string | number | null>;
    return {
      userId: String(item.userId),
      name: String(item.name),
      roles: String(item.roles ?? "Team member").replaceAll(",", " · "),
      activeTurns: Number(item.activeTurns ?? 0),
      urgentTurns: Number(item.urgentTurns ?? 0),
      overdueTurns: Number(item.overdueTurns ?? 0),
      reworkTurns: Number(item.reworkTurns ?? 0),
      blockedItems: Number(item.blockedItems ?? 0),
    };
  });
  const unassigned = database.prepare(
    `SELECT COUNT(DISTINCT CASE WHEN t.status NOT IN ('complete', 'cancelled') THEN t.id END) AS activeTurns,
            COUNT(DISTINCT CASE WHEN t.priority = 'urgent' AND t.status NOT IN ('complete', 'cancelled') THEN t.id END) AS urgentTurns,
            COUNT(DISTINCT CASE WHEN t.target_ready_date < date('now') AND t.status NOT IN ('complete', 'cancelled') THEN t.id END) AS overdueTurns,
            COUNT(DISTINCT CASE WHEN t.status = 'rework' THEN t.id END) AS reworkTurns,
            COUNT(DISTINCT CASE WHEN ti.status = 'blocked' AND t.status NOT IN ('complete', 'cancelled') THEN ti.id END) AS blockedItems
     FROM turns t LEFT JOIN turn_items ti ON ti.turn_id = t.id
     WHERE t.property_id = ? AND t.lead_technician_user_id IS NULL`,
  ).get(propertyId) as Record<string, number | null>;
  if (Number(unassigned.activeTurns ?? 0) > 0) {
    team.unshift({
      userId: "unassigned",
      name: "Unassigned",
      roles: "Needs assignment",
      activeTurns: Number(unassigned.activeTurns ?? 0),
      urgentTurns: Number(unassigned.urgentTurns ?? 0),
      overdueTurns: Number(unassigned.overdueTurns ?? 0),
      reworkTurns: Number(unassigned.reworkTurns ?? 0),
      blockedItems: Number(unassigned.blockedItems ?? 0),
    });
  }
  return team;
}

export function listTurnBlockers(propertyId: string, database: Database.Database = db): TurnBlockerQueueItem[] {
  return listTurnBlockersFromRepo(database, propertyId);
}

export function hideTurnFinancials(turn: TurnDetail): TurnDetail {
  return {
    ...turn,
    costSummary: null,
    items: turn.items.map((item) => ({
      ...item,
      materialCost: null,
      materials: item.materials.map((material) => ({ ...material, unitCost: null, totalCost: null })),
    })),
    vendorJobs: turn.vendorJobs.map((job) => ({
      ...job,
      quoteAmount: null,
      approvedAmount: null,
      invoiceAmount: null,
      invoiceNumber: null,
      paymentStatus: null,
      paidAt: null,
    })),
  };
}

export function getTurn(turnId: string, database: Database.Database = db): TurnDetail {
  const base = findTurnSummary(database, turnId);
  if (!base) throw notFound("Turn not found");
  const notes = findTurnNotes(database, turnId);
  const items = database
    .prepare(
      `SELECT ti.id, ti.area, ti.category, ti.title, ti.status, ti.notes,
              ti.blocked_reason AS blockedReason, ti.started_at AS startedAt,
              ti.completed_at AS completedAt, completed.name AS completedByName,
              ti.review_status AS reviewStatus, ti.review_notes AS reviewNotes,
              reviewer.name AS reviewedByName, ti.reviewed_at AS reviewedAt,
              ti.sort_order AS sortOrder, ti.origin,
              ti.source_inspection_item_id AS sourceInspectionItemId,
              ti.inspection_condition AS inspectionCondition,
              ti.inspection_responsibility AS inspectionResponsibility,
              ti.inspection_cost_estimate AS inspectionCostEstimate,
              (SELECT COUNT(*) FROM attachments a WHERE a.entity_type = 'turn_item' AND a.entity_id = ti.id) AS attachmentCount
       FROM turn_items ti
       LEFT JOIN users completed ON completed.id = ti.completed_by_user_id
       LEFT JOIN users reviewer ON reviewer.id = ti.reviewed_by_user_id
       WHERE ti.turn_id = ? ORDER BY ti.sort_order, ti.area, ti.title`,
    )
    .all(turnId) as TurnDetail["items"];
  const reviewRows = database.prepare(
    `SELECT tir.id, tir.turn_item_id AS turnItemId, tir.review_round AS reviewRound,
            tir.decision, tir.notes, reviewer.name AS reviewedByName, tir.created_at AS createdAt
     FROM turn_item_reviews tir JOIN users reviewer ON reviewer.id = tir.reviewed_by_user_id
     WHERE tir.turn_id = ? ORDER BY tir.review_round DESC, tir.created_at DESC`,
  ).all(turnId) as Array<TurnDetail["items"][number]["reviews"][number] & { turnItemId: string }>;
  const blockerRows = database.prepare(
    `SELECT blocker.id, blocker.turn_item_id AS turnItemId, blocker.category, blocker.reason,
            blocker.responsible_party AS responsibleParty,
            blocker.expected_resolution_date AS expectedResolutionDate,
            opened.name AS openedByName, blocker.opened_at AS openedAt
     FROM turn_item_blockers blocker
     JOIN users opened ON opened.id = blocker.opened_by_user_id
     WHERE blocker.turn_id = ? AND blocker.resolved_at IS NULL`,
  ).all(turnId) as Array<NonNullable<TurnDetail["items"][number]["blocker"]> & { turnItemId: string }>;
  const blockersByItem = new Map(blockerRows.map(({ turnItemId, ...blocker }) => [turnItemId, blocker]));
  const reviewsByItem = new Map<string, TurnDetail["items"][number]["reviews"]>();
  for (const review of reviewRows) {
    const { turnItemId, ...entry } = review;
    reviewsByItem.set(turnItemId, [...(reviewsByItem.get(turnItemId) ?? []), entry]);
  }
  const materialsByItem = listTurnItemMaterials(turnId, database);
  const vendorJobs = database.prepare(
    `SELECT vj.id, vj.vendor_id AS vendorId, v.name AS vendorName, vj.status, vj.scope,
            vj.scheduled_date AS scheduledDate, vj.completed_date AS completedDate,
            vj.quote_amount AS quoteAmount, vj.approved_amount AS approvedAmount,
            vj.invoice_amount AS invoiceAmount, vj.invoice_number AS invoiceNumber,
            vj.payment_status AS paymentStatus, vj.paid_at AS paidAt
     FROM vendor_jobs vj JOIN vendors v ON v.id = vj.vendor_id
     WHERE vj.turn_id = ? ORDER BY
       CASE vj.status WHEN 'in_progress' THEN 1 WHEN 'scheduled' THEN 2 WHEN 'proposed' THEN 3 WHEN 'complete' THEN 4 ELSE 5 END,
       COALESCE(vj.scheduled_date, '9999-12-31'), v.name`,
  ).all(turnId) as TurnVendorJob[];
  const lowStockItems = database.prepare(
    `SELECT DISTINCT inventory.id AS inventoryItemId, inventory.name, inventory.sku,
            inventory.quantity_on_hand AS quantityOnHand, inventory.reorder_level AS reorderLevel,
            (SELECT reorder.status FROM inventory_reorders reorder
             WHERE reorder.inventory_item_id = inventory.id AND reorder.status IN ('requested', 'ordered')
             ORDER BY reorder.requested_at DESC LIMIT 1) AS activeReorderStatus
     FROM inventory_transactions usage
     JOIN inventory_items inventory ON inventory.id = usage.inventory_item_id
     LEFT JOIN inventory_transactions reversal ON reversal.reverses_transaction_id = usage.id
     WHERE usage.turn_item_id IN (SELECT id FROM turn_items WHERE turn_id = ?)
       AND usage.quantity_delta < 0 AND usage.reverses_transaction_id IS NULL
       AND reversal.id IS NULL AND inventory.quantity_on_hand <= inventory.reorder_level
     ORDER BY inventory.name`,
  ).all(turnId) as NonNullable<TurnDetail["costSummary"]>["lowStockItems"];
  const activityRows = database
    .prepare(
      `SELECT ae.id, ae.action, u.name AS actorName, ae.details_json AS detailsJson,
              ae.created_at AS createdAt
       FROM activity_events ae
       LEFT JOIN users u ON u.id = ae.actor_user_id
       WHERE ae.entity_type = 'turn' AND ae.entity_id = ?
       ORDER BY ae.created_at DESC`,
    )
    .all(turnId) as Array<{
    id: string;
    action: string;
    actorName: string | null;
    detailsJson: string;
    createdAt: string;
  }>;
  const detailItems = items.map((item) => {
    const materials = materialsByItem.get(item.id) ?? [];
    return {
      ...item,
      attachmentCount: Number(item.attachmentCount),
      blocker: blockersByItem.get(item.id) ?? null,
      reviews: reviewsByItem.get(item.id) ?? [],
      materials,
      materialCost: materials.reduce((total, usage) => total + (usage.totalCost ?? 0), 0),
    };
  });
  const materialCost = detailItems.reduce((total, item) => total + (item.materialCost ?? 0), 0);
  const vendorCost = vendorJobs
    .filter((job) => job.status !== "cancelled")
    .reduce((total, job) => total + (job.invoiceAmount ?? job.approvedAmount ?? job.quoteAmount ?? 0), 0);
  const estimatedResidentCharge = detailItems.reduce((total, item) =>
    total + (item.inspectionResponsibility === "resident" ? (item.inspectionCostEstimate ?? 0) : 0), 0);
  const grossCost = materialCost + vendorCost;
  return {
    ...base,
    notes,
    items: detailItems,
    vendorJobs,
    costSummary: {
      materialCost,
      vendorCost,
      grossCost,
      estimatedResidentCharge,
      projectedPropertyExpense: Math.max(0, grossCost - estimatedResidentCharge),
      lowStockItems,
    },
    activity: activityRows.map(({ detailsJson, ...activity }) => ({
      ...activity,
      details: JSON.parse(detailsJson) as Record<string, unknown>,
    })),
  };
}
