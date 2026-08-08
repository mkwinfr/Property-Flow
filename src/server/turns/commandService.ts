import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type {
  TurnDetail,
  TurnBlockerCategory,
  TurnItemStatus,
  TurnPriority,
  TurnStatus,
  TurnVendorJob,
  TurnVendorJobStatus,
} from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { findActiveTurnForUnit } from "../db/repositories/turnsRepository.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { getTurn } from "./queryService.js";
import { appendTurnActivity, notifyPropertyManagers } from "./shared.js";

interface CreateTurnInput {
  propertyId: string;
  unitId: string;
  templateVersionId: string;
  priority: TurnPriority;
  moveOutDate?: string | null;
  targetReadyDate?: string | null;
  notes?: string | null;
  createdByUserId: string;
}

export function createTurn(input: CreateTurnInput): TurnDetail {
  const turnId = randomUUID();
  db.transaction(() => {
    const unit = db
      .prepare("SELECT id, property_id FROM units WHERE id = ?")
      .get(input.unitId) as { id: string; property_id: string } | undefined;
    if (!unit || unit.property_id !== input.propertyId) throw notFound("Unit not found at this property");
    if (findActiveTurnForUnit(db, input.unitId)) throw conflict("This unit already has an active turn");

    const template = db
      .prepare(
        `SELECT tv.id, tv.version, tt.name, tt.property_id AS propertyId
         FROM turn_template_versions tv JOIN turn_templates tt ON tt.id = tv.template_id
         WHERE tv.id = ? AND tt.status = 'active' AND tt.property_id = ?`,
      )
      .get(input.templateVersionId, input.propertyId) as { id: string; version: number; name: string; propertyId: string } | undefined;
    if (!template) throw badRequest("Select a valid published template");
    const templateItems = db
      .prepare(
        `SELECT id, area, category, title, sort_order
         FROM turn_template_items WHERE template_version_id = ? ORDER BY sort_order`,
      )
      .all(template.id) as Array<{
      id: string;
      area: string;
      category: string;
      title: string;
      sort_order: number;
    }>;
    if (templateItems.length === 0) throw conflict("The selected template has no published work items");

    const timestamp = new Date().toISOString();
    db.prepare(
      `INSERT INTO turns
       (id, property_id, unit_id, template_version_id, template_name_snapshot,
        template_version_snapshot, status, priority, move_out_date, target_ready_date,
        notes, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      turnId,
      input.propertyId,
      input.unitId,
      template.id,
      template.name,
      template.version,
      input.priority,
      input.moveOutDate ?? null,
      input.targetReadyDate ?? null,
      input.notes ?? null,
      input.createdByUserId,
      timestamp,
      timestamp,
    );
    const insertItem = db.prepare(
      `INSERT INTO turn_items
       (id, turn_id, source_template_item_id, area, category, title, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
    );
    for (const item of templateItems) {
      insertItem.run(
        randomUUID(),
        turnId,
        item.id,
        item.area,
        item.category,
        item.title,
        item.sort_order,
        timestamp,
        timestamp,
      );
    }
    appendTurnActivity(turnId, input.propertyId, input.createdByUserId, "turn.created", {
      templateVersionId: template.id,
      templateVersion: template.version,
      itemCount: templateItems.length,
    });
  })();
  return getTurn(turnId);
}

export function updateTurnItem(
  turnId: string,
  itemId: string,
  actorUserId: string,
  input: {
    status?: TurnItemStatus; notes?: string | null; blockedReason?: string | null;
    blockerCategory?: TurnBlockerCategory; responsibleParty?: string | null;
    expectedResolutionDate?: string | null; area?: string; category?: string; title?: string;
  },
  database: Database.Database = db,
): TurnDetail {
  database.transaction(() => {
    const context = database
      .prepare(
        `SELECT t.property_id, t.status AS turn_status, t.lead_technician_user_id,
                u.unit_number, ti.status, ti.notes, ti.blocked_reason, ti.review_status,
                ti.area, ti.category, ti.title
         FROM turn_items ti JOIN turns t ON t.id = ti.turn_id JOIN units u ON u.id = t.unit_id
         WHERE ti.id = ? AND ti.turn_id = ?`,
      )
      .get(itemId, turnId) as
      | { property_id: string; turn_status: TurnStatus; lead_technician_user_id: string | null; unit_number: string; status: TurnItemStatus; notes: string | null; blocked_reason: string | null; review_status: string | null; area: string; category: string; title: string }
      | undefined;
    if (!context) throw notFound("Turn item not found");
    if (["complete", "cancelled"].includes(context.turn_status)) throw conflict("Completed or cancelled turns cannot be edited");
    if (context.turn_status === "ready_for_review") throw conflict("Work items cannot be edited during manager review");
    if (context.turn_status === "rework") throw conflict("Resume work before updating returned items");
    if (context.review_status === "passed") throw conflict("This work item already passed the current review round");
    const nextStatus = input.status ?? context.status;
    const nextNotes = input.notes === undefined ? context.notes : input.notes;
    const nextBlockedReason = nextStatus === "blocked"
      ? (input.blockedReason === undefined ? context.blocked_reason : input.blockedReason)
      : null;
    if (nextStatus === "blocked" && !nextBlockedReason?.trim()) throw badRequest("Explain what is blocking this work item");
    const timestamp = new Date().toISOString();
    database.prepare(
      `UPDATE turn_items SET area = ?, category = ?, title = ?, status = ?, notes = ?, blocked_reason = ?,
       started_at = CASE WHEN ? = 'in_progress' AND started_at IS NULL THEN ? WHEN ? = 'open' THEN NULL ELSE started_at END,
       review_status = NULL, review_notes = NULL, reviewed_by_user_id = NULL, reviewed_at = NULL,
       completed_by_user_id = CASE WHEN ? = 'complete' THEN ? ELSE NULL END,
       completed_at = CASE WHEN ? = 'complete' THEN ? ELSE NULL END,
       updated_at = ? WHERE id = ?`,
    ).run(input.area ?? context.area, input.category ?? context.category, input.title ?? context.title,
      nextStatus, nextNotes, nextBlockedReason, nextStatus, timestamp, nextStatus,
      nextStatus, actorUserId, nextStatus, timestamp, timestamp, itemId);
    database.prepare(
      `UPDATE turns SET status = CASE WHEN status = 'planned' THEN 'in_progress' ELSE status END,
       updated_at = ? WHERE id = ?`,
    ).run(timestamp, turnId);
    const activeBlocker = database.prepare(
      "SELECT id FROM turn_item_blockers WHERE turn_item_id = ? AND resolved_at IS NULL",
    ).get(itemId) as { id: string } | undefined;
    if (nextStatus === "blocked") {
      const category = input.blockerCategory ?? "other";
      if (activeBlocker) {
        database.prepare(
          `UPDATE turn_item_blockers SET category = ?, reason = ?, responsible_party = ?,
           expected_resolution_date = ? WHERE id = ?`,
        ).run(category, nextBlockedReason!.trim(), input.responsibleParty ?? null,
          input.expectedResolutionDate ?? null, activeBlocker.id);
      } else {
        database.prepare(
          `INSERT INTO turn_item_blockers
           (id, property_id, turn_id, turn_item_id, category, reason, responsible_party,
            expected_resolution_date, opened_by_user_id, opened_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(randomUUID(), context.property_id, turnId, itemId, category, nextBlockedReason!.trim(),
          input.responsibleParty ?? null, input.expectedResolutionDate ?? null, actorUserId, timestamp);
        notifyPropertyManagers(database, context.property_id, actorUserId, "turn.blocked",
          "Make Ready work blocked",
          `Unit ${context.unit_number}: ${input.title ?? context.title} is blocked — ${nextBlockedReason!.trim()}`,
          turnId, timestamp);
      }
    } else if (activeBlocker) {
      database.prepare(
        `UPDATE turn_item_blockers SET resolved_by_user_id = ?, resolved_at = ?, resolution_notes = ? WHERE id = ?`,
      ).run(actorUserId, timestamp, `Scope item status changed to ${nextStatus.replaceAll("_", " ")}.`, activeBlocker.id);
    }
    appendTurnActivity(turnId, context.property_id, actorUserId, "turn.item.updated", {
      itemId,
      previousStatus: context.status,
      status: nextStatus,
      notesChanged: input.notes !== undefined && input.notes !== context.notes,
      blockedReason: nextBlockedReason,
      scopeChanged: input.area !== undefined || input.category !== undefined || input.title !== undefined,
    }, database);
  })();
  return getTurn(turnId, database);
}

export function resolveTurnBlocker(
  turnId: string,
  itemId: string,
  actorUserId: string,
  resolutionNotes: string,
  database: Database.Database = db,
): TurnDetail {
  database.transaction(() => {
    const context = database.prepare(
      `SELECT t.property_id, t.status AS turn_status, t.lead_technician_user_id,
              u.unit_number, ti.title, blocker.id AS blocker_id
       FROM turns t JOIN units u ON u.id = t.unit_id
       JOIN turn_items ti ON ti.turn_id = t.id
       JOIN turn_item_blockers blocker ON blocker.turn_item_id = ti.id AND blocker.resolved_at IS NULL
       WHERE t.id = ? AND ti.id = ?`,
    ).get(turnId, itemId) as { property_id: string; turn_status: TurnStatus; lead_technician_user_id: string | null; unit_number: string; title: string; blocker_id: string } | undefined;
    if (!context) throw notFound("Active blocker not found");
    if (["complete", "cancelled", "ready_for_review", "rework"].includes(context.turn_status)) {
      throw conflict("This blocker cannot be resolved while the Make Ready is locked");
    }
    const timestamp = new Date().toISOString();
    database.prepare(
      `UPDATE turn_item_blockers SET resolved_by_user_id = ?, resolved_at = ?, resolution_notes = ? WHERE id = ?`,
    ).run(actorUserId, timestamp, resolutionNotes.trim(), context.blocker_id);
    database.prepare(
      `UPDATE turn_items SET status = 'in_progress', blocked_reason = NULL,
       started_at = COALESCE(started_at, ?), updated_at = ? WHERE id = ?`,
    ).run(timestamp, timestamp, itemId);
    database.prepare("UPDATE turns SET status = CASE WHEN status = 'planned' THEN 'in_progress' ELSE status END, updated_at = ? WHERE id = ?")
      .run(timestamp, turnId);
    appendTurnActivity(turnId, context.property_id, actorUserId, "turn.blocker.resolved", {
      itemId, blockerId: context.blocker_id, resolutionNotes: resolutionNotes.trim(),
    }, database);
    if (context.lead_technician_user_id && context.lead_technician_user_id !== actorUserId) {
      database.prepare(
        `INSERT INTO notifications
         (id, user_id, type, title, message, entity_type, entity_id, created_at)
         VALUES (?, ?, 'turn.blocker.resolved', 'Make Ready blocker resolved', ?, 'turn', ?, ?)`,
      ).run(randomUUID(), context.lead_technician_user_id,
        `Unit ${context.unit_number}: ${context.title} can resume. ${resolutionNotes.trim()}`,
        turnId, timestamp);
    }
  })();
  return getTurn(turnId, database);
}

export function updateTurnExecution(turnId: string, actorUserId: string, input: {
  leadTechnicianUserId?: string | null;
  targetReadyDate?: string | null;
  priority?: TurnPriority;
  notes?: string | null;
}): TurnDetail {
  const turn = db.prepare(
    "SELECT property_id, status, lead_technician_user_id, target_ready_date, priority, notes FROM turns WHERE id = ?",
  ).get(turnId) as {
    property_id: string; status: TurnStatus; lead_technician_user_id: string | null;
    target_ready_date: string | null; priority: TurnPriority; notes: string | null;
  } | undefined;
  if (!turn) throw notFound("Turn not found");
  if (["complete", "cancelled"].includes(turn.status)) throw conflict("Completed or cancelled turns cannot be edited");
  const lead = input.leadTechnicianUserId === undefined ? turn.lead_technician_user_id : input.leadTechnicianUserId;
  if (lead) {
    const eligible = db.prepare(
      `SELECT 1 FROM users u JOIN role_assignments ra ON ra.user_id = u.id
       WHERE u.id = ? AND u.status = 'active' AND (ra.property_id IS NULL OR ra.property_id = ?) LIMIT 1`,
    ).get(lead, turn.property_id);
    if (!eligible) throw badRequest("Select an active team member for this property");
  }
  const timestamp = new Date().toISOString();
  db.transaction(() => {
    db.prepare(
      `UPDATE turns SET lead_technician_user_id = ?, target_ready_date = ?, priority = ?, notes = ?, updated_at = ? WHERE id = ?`,
    ).run(lead, input.targetReadyDate === undefined ? turn.target_ready_date : input.targetReadyDate,
      input.priority ?? turn.priority, input.notes === undefined ? turn.notes : input.notes, timestamp, turnId);
    appendTurnActivity(turnId, turn.property_id, actorUserId, "turn.execution.updated", {
      leadTechnicianUserId: lead,
      targetReadyDate: input.targetReadyDate === undefined ? turn.target_ready_date : input.targetReadyDate,
      priority: input.priority ?? turn.priority,
    });
    if (lead && lead !== turn.lead_technician_user_id) {
      db.prepare(
        `INSERT INTO notifications
         (id, user_id, type, title, message, entity_type, entity_id, created_at)
         VALUES (?, ?, 'turn.assigned', 'Make Ready assigned', ?, 'turn', ?, ?)`,
      ).run(randomUUID(), lead, "You are the lead technician for this Make Ready.", turnId, timestamp);
    }
  })();
  return getTurn(turnId);
}

export function addTurnVendorJob(turnId: string, actorUserId: string, input: {
  vendorId: string; scope: string; status: TurnVendorJobStatus; scheduledDate?: string | null;
  quoteAmount?: number | null; approvedAmount?: number | null; invoiceAmount?: number | null;
  invoiceNumber?: string | null; paymentStatus?: TurnVendorJob["paymentStatus"];
}): TurnDetail {
  const turn = db.prepare("SELECT property_id, unit_id, status FROM turns WHERE id = ?").get(turnId) as
    | { property_id: string; unit_id: string; status: TurnStatus }
    | undefined;
  if (!turn) throw notFound("Turn not found");
  if (["complete", "cancelled"].includes(turn.status)) throw conflict("Completed or cancelled turns cannot be edited");
  const vendor = db.prepare("SELECT name FROM vendors WHERE id = ? AND property_id = ? AND status = 'active'")
    .get(input.vendorId, turn.property_id) as { name: string } | undefined;
  if (!vendor) throw badRequest("Select an active vendor for this property");
  const timestamp = new Date().toISOString();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO vendor_jobs
     (id, vendor_id, unit_id, status, scope, scheduled_date, completed_date, invoice_amount,
      invoice_number, created_at, updated_at, turn_id, quote_amount, approved_amount, payment_status, paid_at)
     VALUES (?, ?, ?, ?, ?, ?, CASE WHEN ? = 'complete' THEN date('now') ELSE NULL END, ?, ?, ?, ?, ?, ?, ?, ?,
       CASE WHEN ? = 'paid' THEN ? ELSE NULL END)`,
  ).run(id, input.vendorId, turn.unit_id, input.status, input.scope, input.scheduledDate ?? null,
    input.status, input.invoiceAmount ?? null, input.invoiceNumber ?? null, timestamp, timestamp, turnId,
    input.quoteAmount ?? null, input.approvedAmount ?? null, input.paymentStatus ?? "not_submitted",
    input.paymentStatus ?? "not_submitted", timestamp);
  appendTurnActivity(turnId, turn.property_id, actorUserId, "turn.vendor.added", {
    vendorJobId: id, vendorId: input.vendorId, vendorName: vendor.name, status: input.status, scope: input.scope,
  });
  return getTurn(turnId);
}

export function updateTurnVendorJob(turnId: string, vendorJobId: string, actorUserId: string, input: {
  status?: TurnVendorJobStatus; scope?: string; scheduledDate?: string | null;
  quoteAmount?: number | null; approvedAmount?: number | null; invoiceAmount?: number | null;
  invoiceNumber?: string | null; paymentStatus?: TurnVendorJob["paymentStatus"];
}): TurnDetail {
  const current = db.prepare(
    `SELECT vj.*, t.property_id, t.status AS turn_status FROM vendor_jobs vj
     JOIN turns t ON t.id = vj.turn_id WHERE vj.id = ? AND vj.turn_id = ?`,
  ).get(vendorJobId, turnId) as Record<string, unknown> | undefined;
  if (!current) throw notFound("Vendor support job not found");
  if (["complete", "cancelled"].includes(String(current.turn_status))) throw conflict("Completed or cancelled turns cannot be edited");
  const status = (input.status ?? current.status) as TurnVendorJobStatus;
  const paymentStatus = (input.paymentStatus ?? current.payment_status) as TurnVendorJob["paymentStatus"];
  const timestamp = new Date().toISOString();
  db.prepare(
    `UPDATE vendor_jobs SET status = ?, scope = ?, scheduled_date = ?,
     completed_date = CASE WHEN ? = 'complete' THEN COALESCE(completed_date, date('now')) ELSE NULL END,
     quote_amount = ?, approved_amount = ?, invoice_amount = ?, invoice_number = ?, payment_status = ?,
     paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, ?) ELSE NULL END,
     updated_at = ? WHERE id = ?`,
  ).run(status, input.scope ?? current.scope,
    input.scheduledDate === undefined ? current.scheduled_date : input.scheduledDate,
    status, input.quoteAmount === undefined ? current.quote_amount : input.quoteAmount,
    input.approvedAmount === undefined ? current.approved_amount : input.approvedAmount,
    input.invoiceAmount === undefined ? current.invoice_amount : input.invoiceAmount,
    input.invoiceNumber === undefined ? current.invoice_number : input.invoiceNumber,
    paymentStatus, paymentStatus, timestamp, timestamp, vendorJobId);
  appendTurnActivity(turnId, String(current.property_id), actorUserId, "turn.vendor.updated", {
    vendorJobId, status, paymentStatus,
  });
  return getTurn(turnId);
}

export function addTurnItem(
  turnId: string,
  actorUserId: string,
  input: { area: string; category: string; title: string; notes?: string | null },
): TurnDetail {
  db.transaction(() => {
    const turn = db.prepare("SELECT property_id, status, lead_technician_user_id FROM turns WHERE id = ?").get(turnId) as
      | { property_id: string; status: TurnStatus; lead_technician_user_id: string | null }
      | undefined;
    if (!turn) throw notFound("Turn not found");
    if (["complete", "cancelled"].includes(turn.status)) throw conflict("Completed or cancelled turns cannot be edited");
    if (["ready_for_review", "rework"].includes(turn.status)) throw conflict("Resume active work before adding scope items");
    const order = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS value FROM turn_items WHERE turn_id = ?")
      .get(turnId) as { value: number };
    const itemId = randomUUID();
    const timestamp = new Date().toISOString();
    db.prepare(
      `INSERT INTO turn_items
       (id, turn_id, area, category, title, status, notes, sort_order, created_at, updated_at, origin)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, 'make_ready')`,
    ).run(itemId, turnId, input.area, input.category, input.title, input.notes ?? null, order.value, timestamp, timestamp);
    db.prepare("UPDATE turns SET status = CASE WHEN status = 'planned' THEN 'in_progress' ELSE status END, updated_at = ? WHERE id = ?")
      .run(timestamp, turnId);
    appendTurnActivity(turnId, turn.property_id, actorUserId, "turn.item.added", {
      itemId, area: input.area, category: input.category, title: input.title, origin: "make_ready",
    });
  })();
  return getTurn(turnId);
}

export function reviewTurnItem(
  turnId: string,
  itemId: string,
  reviewerUserId: string,
  decision: "passed" | "rework",
  notes?: string | null,
): TurnDetail {
  return db.transaction(() => {
    const context = db.prepare(
      `SELECT t.property_id, t.status AS turn_status, t.review_round, ti.status AS item_status
       FROM turns t JOIN turn_items ti ON ti.turn_id = t.id
       WHERE t.id = ? AND ti.id = ?`,
    ).get(turnId, itemId) as { property_id: string; turn_status: TurnStatus; review_round: number; item_status: TurnItemStatus } | undefined;
    if (!context) throw notFound("Make Ready work item not found");
    if (context.turn_status !== "ready_for_review") throw conflict("This Make Ready is not awaiting review");
    if (context.item_status !== "complete") throw conflict("Only completed work requires manager review");
    if (decision === "rework" && !notes?.trim()) throw badRequest("Explain why this item requires rework");
    const timestamp = new Date().toISOString();
    db.prepare(
      `UPDATE turn_items SET review_status = ?, review_notes = ?, reviewed_by_user_id = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ? AND turn_id = ?`,
    ).run(decision, notes?.trim() || null, reviewerUserId, timestamp, timestamp, itemId, turnId);
    db.prepare(
      `INSERT INTO turn_item_reviews
       (id, turn_id, turn_item_id, review_round, decision, notes, reviewed_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(randomUUID(), turnId, itemId, context.review_round, decision, notes?.trim() || null, reviewerUserId, timestamp);
    appendTurnActivity(turnId, context.property_id, reviewerUserId, `turn.item.review.${decision}`, {
      itemId, reviewRound: context.review_round, decision, notes: notes?.trim() || null,
    });
    return getTurn(turnId);
  })();
}

const allowedTransitions: Record<TurnStatus, TurnStatus[]> = {
  planned: ["in_progress", "cancelled"],
  in_progress: ["ready_for_review", "cancelled"],
  ready_for_review: ["complete", "rework"],
  rework: ["in_progress", "ready_for_review"],
  complete: [],
  cancelled: [],
};

export function transitionTurn(turnId: string, actorUserId: string, nextStatus: TurnStatus): TurnDetail {
  db.transaction(() => {
    const turn = db.prepare("SELECT property_id, status, lead_technician_user_id FROM turns WHERE id = ?").get(turnId) as
      | { property_id: string; status: TurnStatus; lead_technician_user_id: string | null }
      | undefined;
    if (!turn) throw notFound("Turn not found");
    if (!allowedTransitions[turn.status].includes(nextStatus)) {
      throw conflict(`A ${turn.status.replaceAll("_", " ")} turn cannot move to ${nextStatus.replaceAll("_", " ")}`);
    }
    const timestamp = new Date().toISOString();
    if (nextStatus === "ready_for_review") {
      const incomplete = db
        .prepare(
          "SELECT COUNT(*) AS count FROM turn_items WHERE turn_id = ? AND status NOT IN ('complete', 'not_applicable')",
        )
        .get(turnId) as { count: number };
      if (incomplete.count > 0) throw conflict("Complete or mark all work items not applicable before review");
      db.prepare(
        `UPDATE turns SET review_round = review_round + 1, submitted_for_review_at = ?, updated_at = ? WHERE id = ?`,
      ).run(timestamp, timestamp, turnId);
      db.prepare(
        `UPDATE turn_items SET review_status = CASE
           WHEN status = 'complete' AND review_status = 'passed' THEN 'passed'
           WHEN status = 'complete' THEN 'pending'
           ELSE NULL END,
         review_notes = CASE WHEN status = 'complete' AND review_status = 'passed' THEN review_notes ELSE NULL END,
         reviewed_by_user_id = CASE WHEN status = 'complete' AND review_status = 'passed' THEN reviewed_by_user_id ELSE NULL END,
         reviewed_at = CASE WHEN status = 'complete' AND review_status = 'passed' THEN reviewed_at ELSE NULL END
         WHERE turn_id = ?`,
      ).run(turnId);
    }
    if (nextStatus === "complete") {
      const review = db.prepare(
        `SELECT SUM(status = 'complete' AND COALESCE(review_status, 'pending') = 'pending') AS pending,
                SUM(status = 'complete' AND review_status = 'rework') AS rework
         FROM turn_items WHERE turn_id = ?`,
      ).get(turnId) as { pending: number | null; rework: number | null };
      if (Number(review.pending) > 0) throw conflict("Review every completed work item before approval");
      if (Number(review.rework) > 0) throw conflict("Send failed work items back for rework before approval");
    }
    if (nextStatus === "rework") {
      const review = db.prepare(
        `SELECT SUM(status = 'complete' AND review_status = 'pending') AS pending,
                SUM(status = 'complete' AND review_status = 'rework') AS rework
         FROM turn_items WHERE turn_id = ?`,
      ).get(turnId) as { pending: number | null; rework: number | null };
      if (Number(review.pending) > 0) throw conflict("Review every completed work item before sending rework");
      if (Number(review.rework) === 0) throw conflict("Mark at least one completed item for rework");
      db.prepare(
        `UPDATE turn_items SET status = 'open', completed_by_user_id = NULL, completed_at = NULL,
         blocked_reason = NULL, updated_at = ? WHERE turn_id = ? AND review_status = 'rework'`,
      ).run(timestamp, turnId);
    }
    db.prepare(
      `UPDATE turns SET status = ?, actual_ready_date = CASE WHEN ? = 'complete' THEN date('now') ELSE actual_ready_date END,
       approved_by_user_id = CASE WHEN ? = 'complete' THEN ? ELSE approved_by_user_id END,
       approved_at = CASE WHEN ? = 'complete' THEN ? ELSE approved_at END,
       updated_at = ? WHERE id = ?`,
    ).run(nextStatus, nextStatus, nextStatus, actorUserId, nextStatus, timestamp, timestamp, turnId);
    appendTurnActivity(turnId, turn.property_id, actorUserId, "turn.status.changed", {
      previousStatus: turn.status,
      status: nextStatus,
    });
    if (nextStatus === "rework" && turn.lead_technician_user_id) {
      db.prepare(
        `INSERT INTO notifications
         (id, user_id, type, title, message, entity_type, entity_id, created_at)
         VALUES (?, ?, 'turn.rework', 'Make Ready returned for rework',
          'A manager returned one or more scope items. Open My Work to review the notes.', 'turn', ?, ?)`,
      ).run(randomUUID(), turn.lead_technician_user_id, turnId, timestamp);
    }
  })();
  return getTurn(turnId);
}
