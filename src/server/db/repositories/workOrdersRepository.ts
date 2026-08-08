import type { WorkOrderSummary } from "../../../shared/contracts.js";
import type { RepositoryDatabase } from "./types.js";

const WORK_ORDER_LIST_SQL = `
  SELECT wo.id, wo.property_id AS propertyId, wo.unit_id AS unitId, u.unit_number AS unitNumber,
         wo.title, wo.description, wo.category, wo.status, wo.priority,
         wo.requested_by AS requestedBy, wo.resident_id AS residentId,
         TRIM(r.first_name || ' ' || r.last_name) AS residentName,
         wo.submission_source AS submissionSource,
         wo.assigned_to_user_id AS assignedToUserId,
         assignee.name AS assignedToName, wo.due_date AS dueDate,
         wo.created_at AS createdAt, wo.updated_at AS updatedAt,
         wod.areas_json AS areasJson, wod.received_by_user_id AS receivedByUserId,
         receiver.name AS receivedByName, wod.permission_to_enter AS permissionToEnter,
         wod.appointment_required AS appointmentRequired, wod.appointment_start AS appointmentStart,
         wod.appointment_end AS appointmentEnd, wod.access_notes AS accessNotes,
         wod.pet_information AS petInformation, wod.security_instructions AS securityInstructions,
         wod.vendor_work_performed AS vendorWorkPerformed, wod.vendor_id AS vendorId,
         vendor.name AS vendorName, wod.vendor_scope AS vendorScope,
         wod.vendor_scheduled_date AS vendorScheduledDate, wod.vendor_completed_date AS vendorCompletedDate,
         wod.vendor_invoice_number AS vendorInvoiceNumber, wod.vendor_cost AS vendorCost,
         wod.resident_responsible AS residentResponsible, wod.resident_charge_reason AS residentChargeReason,
         wod.resident_charge_estimate AS residentChargeEstimate, wod.resident_charge_final AS residentChargeFinal,
         wod.resident_charge_status AS residentChargeStatus,
         wod.completed_by_user_id AS completedByUserId, completer.name AS completedByName,
         wod.completion_notes AS completionNotes, wod.work_performed AS workPerformed,
         wod.resident_notified AS residentNotified, wod.notification_method AS notificationMethod,
         wod.follow_up_required AS followUpRequired, wod.follow_up_date AS followUpDate
  FROM work_orders wo JOIN units u ON u.id = wo.unit_id
  LEFT JOIN residents r ON r.id = wo.resident_id
  LEFT JOIN users assignee ON assignee.id = wo.assigned_to_user_id
  LEFT JOIN work_order_details wod ON wod.work_order_id = wo.id
  LEFT JOIN users receiver ON receiver.id = wod.received_by_user_id
  LEFT JOIN users completer ON completer.id = wod.completed_by_user_id
  LEFT JOIN vendors vendor ON vendor.id = wod.vendor_id
`;

function numberOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

export function mapWorkOrderRow(row: Record<string, unknown>, includeFinancials: boolean): WorkOrderSummary {
  return {
    ...row,
    submissionSource: (row.submissionSource as WorkOrderSummary["submissionSource"] | null) ?? "staff",
    areas: JSON.parse(String(row.areasJson ?? "[]")) as string[],
    appointmentRequired: Boolean(row.appointmentRequired),
    vendorWorkPerformed: Boolean(row.vendorWorkPerformed),
    residentResponsible: Boolean(row.residentResponsible),
    residentNotified: Boolean(row.residentNotified),
    followUpRequired: Boolean(row.followUpRequired),
    vendorCost: includeFinancials ? numberOrNull(row.vendorCost) : null,
    residentChargeEstimate: includeFinancials ? numberOrNull(row.residentChargeEstimate) : null,
    residentChargeFinal: includeFinancials ? numberOrNull(row.residentChargeFinal) : null,
    residentChargeReason: includeFinancials ? row.residentChargeReason : null,
    residentChargeStatus: includeFinancials ? row.residentChargeStatus : null,
  } as WorkOrderSummary;
}

export function listWorkOrders(database: RepositoryDatabase, propertyId: string, includeFinancials = false): WorkOrderSummary[] {
  const rows = database.prepare(
    `${WORK_ORDER_LIST_SQL}
     WHERE wo.property_id = ? AND wod.deleted_at IS NULL
     ORDER BY CASE wo.priority WHEN 'emergency' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
              CASE wo.status WHEN 'open' THEN 1 WHEN 'assigned' THEN 2 WHEN 'in_progress' THEN 3 WHEN 'on_hold' THEN 4 ELSE 5 END,
              COALESCE(wo.due_date, '9999-12-31')`,
  ).all(propertyId) as Array<Record<string, unknown>>;
  return rows.map((row) => mapWorkOrderRow(row, includeFinancials));
}

export function getWorkOrderSnapshot(database: RepositoryDatabase, propertyId: string) {
  return database.prepare(
    `SELECT SUM(status NOT IN ('complete', 'cancelled')) AS open,
            SUM(priority = 'emergency' AND status NOT IN ('complete', 'cancelled')) AS emergency,
            SUM(due_date < date('now') AND status NOT IN ('complete', 'cancelled')) AS overdue
     FROM work_orders wo LEFT JOIN work_order_details wod ON wod.work_order_id = wo.id
     WHERE wo.property_id = ? AND wod.deleted_at IS NULL`,
  ).get(propertyId) as Record<string, number | null>;
}
