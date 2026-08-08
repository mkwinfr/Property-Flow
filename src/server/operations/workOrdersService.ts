import { randomUUID } from "node:crypto";
import type { WorkOrderPriority, WorkOrderStatus, WorkOrderSummary } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import type { AppDatabase } from "../db/database.js";
import { listWorkOrders as listWorkOrdersFromRepo } from "../db/repositories/workOrdersRepository.js";
import { notFound } from "../lib/errors.js";
import { appendActivity, notify, notifyWorkOrderManagers, now, valueOrCurrent } from "./shared.js";

interface WorkOrderRow {
  id: string;
  property_id: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assigned_to_user_id: string | null;
  due_date: string | null;
  title: string;
  description: string | null;
  category: string;
  requested_by: string | null;
}

export function listWorkOrders(propertyId: string, includeFinancials = false, database: AppDatabase = db): WorkOrderSummary[] {
  return listWorkOrdersFromRepo(database, propertyId, includeFinancials);
}

export function createWorkOrder(input: {
  propertyId: string; unitId: string; title: string; description?: string | null; category: string;
  priority: WorkOrderPriority; assignedToUserId?: string | null; dueDate?: string | null; requestedBy?: string | null;
  residentId?: string | null; submissionSource?: "staff" | "portal" | "recurring";
  areas: string[]; permissionToEnter: "permission_given" | "no_permission"; appointmentRequired: boolean;
  appointmentStart?: string | null; appointmentEnd?: string | null; accessNotes?: string | null;
  petInformation?: string | null; securityInstructions?: string | null;
  actorUserId: string;
}): WorkOrderSummary {
  const id = randomUUID();
  const timestamp = now();
  const submissionSource = input.submissionSource ?? "staff";
  db.transaction(() => {
    const unit = db.prepare("SELECT property_id FROM units WHERE id = ?").get(input.unitId) as { property_id: string } | undefined;
    if (!unit || unit.property_id !== input.propertyId) throw notFound("Unit not found at this property");
    db.prepare(
      `INSERT INTO work_orders
       (id, property_id, unit_id, resident_id, title, description, category, status, priority, requested_by,
        submission_source, assigned_to_user_id, due_date, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.propertyId, input.unitId, input.residentId ?? null, input.title, input.description ?? null, input.category,
      input.assignedToUserId ? "assigned" : "open", input.priority, input.requestedBy ?? null, submissionSource,
      input.assignedToUserId ?? null, input.dueDate ?? null, input.actorUserId, timestamp, timestamp);
    db.prepare(
      `INSERT INTO work_order_details
       (work_order_id, areas_json, received_by_user_id, permission_to_enter, appointment_required,
        appointment_start, appointment_end, access_notes, pet_information, security_instructions, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, JSON.stringify(input.areas), input.actorUserId, input.permissionToEnter, Number(input.appointmentRequired),
      input.appointmentStart ?? null, input.appointmentEnd ?? null, input.accessNotes ?? null,
      input.petInformation ?? null, input.securityInstructions ?? null, timestamp);
    appendActivity(input.propertyId, input.actorUserId, "work_order", id, "work_order.created", { title: input.title, submissionSource });
    if (input.assignedToUserId) notify(input.assignedToUserId, "work_order.assigned", "Work order assigned", input.title, "work_order", id);
    if (submissionSource === "portal") {
      const unitNumber = db.prepare("SELECT unit_number FROM units WHERE id = ?").get(input.unitId) as { unit_number: string } | undefined;
      notifyWorkOrderManagers(
        input.propertyId,
        "work_order.portal_submitted",
        "New resident maintenance request",
        `${input.requestedBy ?? "Resident"} · Unit ${unitNumber?.unit_number ?? "?"} · ${input.title}`,
        "work_order",
        id,
      );
    }
  })();
  return listWorkOrders(input.propertyId, false, db).find((item) => item.id === id)!;
}

export function updateWorkOrder(id: string, actorUserId: string, input: {
  status?: WorkOrderStatus; assignedToUserId?: string | null; dueDate?: string | null; priority?: WorkOrderPriority;
  title?: string; description?: string | null; category?: string; requestedBy?: string | null; areas?: string[];
  permissionToEnter?: "permission_given" | "no_permission"; appointmentRequired?: boolean;
  appointmentStart?: string | null; appointmentEnd?: string | null; accessNotes?: string | null;
  petInformation?: string | null; securityInstructions?: string | null; vendorWorkPerformed?: boolean;
  vendorId?: string | null; vendorScope?: string | null; vendorScheduledDate?: string | null; vendorCompletedDate?: string | null;
  completedByUserId?: string | null; completionNotes?: string | null; workPerformed?: string | null;
  residentNotified?: boolean; notificationMethod?: string | null; followUpRequired?: boolean; followUpDate?: string | null;
}): WorkOrderSummary {
  const current = db.prepare("SELECT * FROM work_orders WHERE id = ?").get(id) as WorkOrderRow | undefined;
  if (!current) throw notFound("Work order not found");
  const status = input.status ?? current.status;
  const assignee = input.assignedToUserId === undefined ? current.assigned_to_user_id : input.assignedToUserId;
  db.transaction(() => {
    db.prepare(
      `UPDATE work_orders SET status = ?, assigned_to_user_id = ?, due_date = ?, priority = ?, title = ?, description = ?, category = ?, requested_by = ?,
       completed_at = CASE WHEN ? = 'complete' THEN ? ELSE NULL END, updated_at = ? WHERE id = ?`,
    ).run(status, assignee, input.dueDate === undefined ? current.due_date : input.dueDate,
      input.priority ?? current.priority, input.title ?? current.title, input.description === undefined ? current.description : input.description,
      input.category ?? current.category, input.requestedBy === undefined ? current.requested_by : input.requestedBy,
      status, now(), now(), id);
    const detail = db.prepare("SELECT * FROM work_order_details WHERE work_order_id = ?").get(id) as Record<string, unknown>;
    db.prepare(
      `UPDATE work_order_details SET areas_json = ?, permission_to_enter = ?, appointment_required = ?,
       appointment_start = ?, appointment_end = ?, access_notes = ?, pet_information = ?, security_instructions = ?,
       vendor_work_performed = ?, vendor_id = ?, vendor_scope = ?, vendor_scheduled_date = ?, vendor_completed_date = ?,
       completed_by_user_id = ?, completion_notes = ?, work_performed = ?, resident_notified = ?, notification_method = ?,
       follow_up_required = ?, follow_up_date = ?, updated_at = ? WHERE work_order_id = ?`,
    ).run(input.areas ? JSON.stringify(input.areas) : detail.areas_json, input.permissionToEnter ?? detail.permission_to_enter,
      input.appointmentRequired === undefined ? detail.appointment_required : Number(input.appointmentRequired),
      valueOrCurrent(input.appointmentStart, detail.appointment_start), valueOrCurrent(input.appointmentEnd, detail.appointment_end),
      valueOrCurrent(input.accessNotes, detail.access_notes), valueOrCurrent(input.petInformation, detail.pet_information),
      valueOrCurrent(input.securityInstructions, detail.security_instructions),
      input.vendorWorkPerformed === undefined ? detail.vendor_work_performed : Number(input.vendorWorkPerformed),
      valueOrCurrent(input.vendorId, detail.vendor_id), valueOrCurrent(input.vendorScope, detail.vendor_scope),
      valueOrCurrent(input.vendorScheduledDate, detail.vendor_scheduled_date), valueOrCurrent(input.vendorCompletedDate, detail.vendor_completed_date),
      valueOrCurrent(input.completedByUserId, detail.completed_by_user_id), valueOrCurrent(input.completionNotes, detail.completion_notes),
      valueOrCurrent(input.workPerformed, detail.work_performed), input.residentNotified === undefined ? detail.resident_notified : Number(input.residentNotified),
      valueOrCurrent(input.notificationMethod, detail.notification_method), input.followUpRequired === undefined ? detail.follow_up_required : Number(input.followUpRequired),
      valueOrCurrent(input.followUpDate, detail.follow_up_date), now(), id);
    appendActivity(current.property_id, actorUserId, "work_order", id, "work_order.updated", { status, assignedToUserId: assignee });
    if (assignee && assignee !== current.assigned_to_user_id) notify(assignee, "work_order.assigned", "Work order assigned", current.title, "work_order", id);
  })();
  return listWorkOrders(current.property_id, false, db).find((item) => item.id === id)!;
}

export function updateWorkOrderFinancials(id: string, actorUserId: string, input: {
  vendorInvoiceNumber?: string | null; vendorCost?: number | null; residentResponsible?: boolean;
  residentChargeReason?: string | null; residentChargeEstimate?: number | null; residentChargeFinal?: number | null;
  residentChargeStatus?: "pending" | "approved" | "posted" | "waived" | null;
}): WorkOrderSummary {
  const current = db.prepare("SELECT property_id FROM work_orders WHERE id = ?").get(id) as { property_id: string } | undefined;
  if (!current) throw notFound("Work order not found");
  const detail = db.prepare("SELECT * FROM work_order_details WHERE work_order_id = ?").get(id) as Record<string, unknown>;
  db.prepare(
    `UPDATE work_order_details SET vendor_invoice_number = ?, vendor_cost = ?, resident_responsible = ?,
     resident_charge_reason = ?, resident_charge_estimate = ?, resident_charge_final = ?, resident_charge_status = ?,
     resident_charge_approved_by_user_id = CASE WHEN ? = 'approved' THEN ? ELSE resident_charge_approved_by_user_id END,
     resident_charge_approved_at = CASE WHEN ? = 'approved' THEN ? ELSE resident_charge_approved_at END, updated_at = ?
     WHERE work_order_id = ?`,
  ).run(valueOrCurrent(input.vendorInvoiceNumber, detail.vendor_invoice_number), valueOrCurrent(input.vendorCost, detail.vendor_cost),
    input.residentResponsible === undefined ? detail.resident_responsible : Number(input.residentResponsible),
    valueOrCurrent(input.residentChargeReason, detail.resident_charge_reason), valueOrCurrent(input.residentChargeEstimate, detail.resident_charge_estimate),
    valueOrCurrent(input.residentChargeFinal, detail.resident_charge_final), valueOrCurrent(input.residentChargeStatus, detail.resident_charge_status),
    input.residentChargeStatus, actorUserId, input.residentChargeStatus, now(), now(), id);
  appendActivity(current.property_id, actorUserId, "work_order", id, "work_order.financials_updated", {});
  return listWorkOrders(current.property_id, true, db).find((item) => item.id === id)!;
}

export function softDeleteWorkOrder(id: string, actorUserId: string): void {
  const current = db.prepare("SELECT property_id FROM work_orders WHERE id = ?").get(id) as { property_id: string } | undefined;
  if (!current) throw notFound("Work order not found");
  db.prepare("UPDATE work_order_details SET deleted_by_user_id = ?, deleted_at = ?, updated_at = ? WHERE work_order_id = ?")
    .run(actorUserId, now(), now(), id);
  appendActivity(current.property_id, actorUserId, "work_order", id, "work_order.deleted", {});
}
