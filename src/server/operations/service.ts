import { randomUUID } from "node:crypto";
import type {
  ApplianceRecord,
  InspectionCondition,
  InspectionDetail,
  InspectionResponsibility,
  InspectionSummary,
  InventoryRecord,
  InventoryReorder,
  InventoryReorderStatus,
  OperationsSnapshot,
  PoolLogRecord,
  VendorRecord,
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderSummary,
} from "../../shared/contracts.js";
import { db } from "../db/index.js";
import type { AppDatabase } from "../db/database.js";
import { createTurn } from "../turns/service.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";

const now = () => new Date().toISOString();

export function getOperationsSnapshot(propertyId: string): OperationsSnapshot {
  const workOrders = db.prepare(
    `SELECT SUM(status NOT IN ('complete', 'cancelled')) AS open,
            SUM(priority = 'emergency' AND status NOT IN ('complete', 'cancelled')) AS emergency,
            SUM(due_date < date('now') AND status NOT IN ('complete', 'cancelled')) AS overdue
     FROM work_orders wo LEFT JOIN work_order_details wod ON wod.work_order_id = wo.id
     WHERE wo.property_id = ? AND wod.deleted_at IS NULL`,
  ).get(propertyId) as Record<string, number | null>;
  const inspections = db.prepare(
    `SELECT COUNT(DISTINCT CASE WHEN mi.status = 'draft' THEN mi.id END) AS draft,
            COUNT(DISTINCT CASE WHEN ii.condition IN ('damage', 'missing') THEN mi.id END) AS damageFound
     FROM move_out_inspections mi LEFT JOIN inspection_items ii ON ii.inspection_id = mi.id
     WHERE mi.property_id = ?`,
  ).get(propertyId) as Record<string, number | null>;
  const inventory = db.prepare(
    `SELECT SUM(quantity_on_hand <= reorder_level) AS lowStock,
            SUM(quantity_on_hand * unit_cost) AS totalValue
     FROM inventory_items WHERE property_id = ?`,
  ).get(propertyId) as Record<string, number | null>;
  const latestPool = db.prepare(
    `SELECT * FROM pool_logs WHERE property_id = ? ORDER BY log_date DESC, logged_at DESC LIMIT 1`,
  ).get(propertyId) as PoolRow | undefined;
  return {
    workOrders: numeric(workOrders) as OperationsSnapshot["workOrders"],
    inspections: numeric(inspections) as OperationsSnapshot["inspections"],
    inventory: numeric(inventory) as OperationsSnapshot["inventory"],
    pool: { latestLogDate: latestPool?.log_date ?? null, exceptions: latestPool ? poolExceptions(latestPool).length : 0 },
  };
}

function numeric(record: Record<string, number | null>) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, Number(value ?? 0)]));
}

export function listTeam(propertyId: string): Array<{ id: string; name: string; roles: string }> {
  return db.prepare(
    `SELECT u.id, u.name, GROUP_CONCAT(DISTINCT r.name) AS roles
     FROM users u JOIN role_assignments ra ON ra.user_id = u.id
     JOIN roles r ON r.id = ra.role_id
     WHERE u.status = 'active' AND (ra.property_id IS NULL OR ra.property_id = ?)
     GROUP BY u.id ORDER BY u.name`,
  ).all(propertyId) as Array<{ id: string; name: string; roles: string }>;
}

export function listWorkOrders(propertyId: string, includeFinancials = false): WorkOrderSummary[] {
  const rows = db.prepare(
    `SELECT wo.id, wo.property_id AS propertyId, wo.unit_id AS unitId, u.unit_number AS unitNumber,
            wo.title, wo.description, wo.category, wo.status, wo.priority,
            wo.requested_by AS requestedBy, wo.assigned_to_user_id AS assignedToUserId,
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
     LEFT JOIN users assignee ON assignee.id = wo.assigned_to_user_id
     LEFT JOIN work_order_details wod ON wod.work_order_id = wo.id
     LEFT JOIN users receiver ON receiver.id = wod.received_by_user_id
     LEFT JOIN users completer ON completer.id = wod.completed_by_user_id
     LEFT JOIN vendors vendor ON vendor.id = wod.vendor_id
     WHERE wo.property_id = ? AND wod.deleted_at IS NULL
     ORDER BY CASE wo.priority WHEN 'emergency' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
              CASE wo.status WHEN 'open' THEN 1 WHEN 'assigned' THEN 2 WHEN 'in_progress' THEN 3 WHEN 'on_hold' THEN 4 ELSE 5 END,
              COALESCE(wo.due_date, '9999-12-31')`,
  ).all(propertyId) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    ...row,
    areas: JSON.parse(String(row.areasJson ?? "[]")) as string[],
    appointmentRequired: Boolean(row.appointmentRequired), vendorWorkPerformed: Boolean(row.vendorWorkPerformed),
    residentResponsible: Boolean(row.residentResponsible), residentNotified: Boolean(row.residentNotified),
    followUpRequired: Boolean(row.followUpRequired),
    vendorCost: includeFinancials ? numberOrNull(row.vendorCost) : null,
    residentChargeEstimate: includeFinancials ? numberOrNull(row.residentChargeEstimate) : null,
    residentChargeFinal: includeFinancials ? numberOrNull(row.residentChargeFinal) : null,
    residentChargeReason: includeFinancials ? row.residentChargeReason : null,
    residentChargeStatus: includeFinancials ? row.residentChargeStatus : null,
  })) as unknown as WorkOrderSummary[];
}

export function createWorkOrder(input: {
  propertyId: string; unitId: string; title: string; description?: string | null; category: string;
  priority: WorkOrderPriority; assignedToUserId?: string | null; dueDate?: string | null; requestedBy?: string | null;
  areas: string[]; permissionToEnter: "permission_given" | "no_permission"; appointmentRequired: boolean;
  appointmentStart?: string | null; appointmentEnd?: string | null; accessNotes?: string | null;
  petInformation?: string | null; securityInstructions?: string | null;
  actorUserId: string;
}): WorkOrderSummary {
  const id = randomUUID();
  const timestamp = now();
  db.transaction(() => {
    const unit = db.prepare("SELECT property_id FROM units WHERE id = ?").get(input.unitId) as { property_id: string } | undefined;
    if (!unit || unit.property_id !== input.propertyId) throw notFound("Unit not found at this property");
    db.prepare(
      `INSERT INTO work_orders
       (id, property_id, unit_id, title, description, category, status, priority, requested_by,
        assigned_to_user_id, due_date, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.propertyId, input.unitId, input.title, input.description ?? null, input.category,
      input.assignedToUserId ? "assigned" : "open", input.priority, input.requestedBy ?? null,
      input.assignedToUserId ?? null, input.dueDate ?? null, input.actorUserId, timestamp, timestamp);
    db.prepare(
      `INSERT INTO work_order_details
       (work_order_id, areas_json, received_by_user_id, permission_to_enter, appointment_required,
        appointment_start, appointment_end, access_notes, pet_information, security_instructions, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, JSON.stringify(input.areas), input.actorUserId, input.permissionToEnter, Number(input.appointmentRequired),
      input.appointmentStart ?? null, input.appointmentEnd ?? null, input.accessNotes ?? null,
      input.petInformation ?? null, input.securityInstructions ?? null, timestamp);
    appendActivity(input.propertyId, input.actorUserId, "work_order", id, "work_order.created", { title: input.title });
    if (input.assignedToUserId) notify(input.assignedToUserId, "work_order.assigned", "Work order assigned", input.title, "work_order", id);
  })();
  return listWorkOrders(input.propertyId).find((item) => item.id === id)!;
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
  return listWorkOrders(current.property_id).find((item) => item.id === id)!;
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
  return listWorkOrders(current.property_id, true).find((item) => item.id === id)!;
}

export function softDeleteWorkOrder(id: string, actorUserId: string): void {
  const current = db.prepare("SELECT property_id FROM work_orders WHERE id = ?").get(id) as { property_id: string } | undefined;
  if (!current) throw notFound("Work order not found");
  db.prepare("UPDATE work_order_details SET deleted_by_user_id = ?, deleted_at = ?, updated_at = ? WHERE work_order_id = ?")
    .run(actorUserId, now(), now(), id);
  appendActivity(current.property_id, actorUserId, "work_order", id, "work_order.deleted", {});
}

const valueOrCurrent = <T>(value: T | undefined, current: unknown): T | unknown => value === undefined ? current : value;
const numberOrNull = (value: unknown): number | null => value === null || value === undefined ? null : Number(value);

export function listAppliances(unitId: string): ApplianceRecord[] {
  return db.prepare(
    `SELECT id, unit_id AS unitId, type, brand, model, serial_number AS serialNumber,
            install_date AS installDate, warranty_expiry AS warrantyExpiry, notes
     FROM appliances WHERE unit_id = ? ORDER BY type`,
  ).all(unitId) as ApplianceRecord[];
}

export function saveAppliance(unitId: string, input: Omit<ApplianceRecord, "id" | "unitId">, id?: string): ApplianceRecord {
  const timestamp = now();
  const applianceId = id ?? randomUUID();
  if (id) {
    const result = db.prepare(
      `UPDATE appliances SET type = ?, brand = ?, model = ?, serial_number = ?, install_date = ?,
       warranty_expiry = ?, notes = ?, updated_at = ? WHERE id = ? AND unit_id = ?`,
    ).run(input.type, input.brand, input.model, input.serialNumber, input.installDate, input.warrantyExpiry, input.notes, timestamp, id, unitId);
    if (!result.changes) throw notFound("Appliance not found");
  } else {
    db.prepare(
      `INSERT INTO appliances
       (id, unit_id, type, brand, model, serial_number, install_date, warranty_expiry, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(applianceId, unitId, input.type, input.brand, input.model, input.serialNumber, input.installDate, input.warrantyExpiry, input.notes, timestamp, timestamp);
  }
  return listAppliances(unitId).find((item) => item.id === applianceId)!;
}

export function listInventory(propertyId: string): InventoryRecord[] {
  return db.prepare(
    `SELECT id, property_id AS propertyId, sku, name, category, quantity_on_hand AS quantityOnHand,
            reorder_level AS reorderLevel, unit_cost AS unitCost, supplier,
            MAX(1, reorder_level * 2 - quantity_on_hand) AS suggestedReorderQuantity,
            (SELECT ir.status FROM inventory_reorders ir
             WHERE ir.inventory_item_id = inventory_items.id AND ir.status IN ('requested', 'ordered')
             ORDER BY ir.requested_at DESC LIMIT 1) AS activeReorderStatus
     FROM inventory_items WHERE property_id = ? ORDER BY category, name`,
  ).all(propertyId) as InventoryRecord[];
}

export function listInventoryReorders(propertyId: string, database: AppDatabase = db): InventoryReorder[] {
  return database.prepare(
    `SELECT ir.id, ir.property_id AS propertyId, ir.inventory_item_id AS inventoryItemId,
            item.sku, item.name AS itemName, ir.quantity, ir.supplier, ir.status,
            item.unit_cost AS unitCost, ir.quantity * item.unit_cost AS estimatedTotal,
            requester.name AS requestedByName, ir.requested_at AS requestedAt,
            ir.ordered_at AS orderedAt, ir.received_at AS receivedAt
     FROM inventory_reorders ir
     JOIN inventory_items item ON item.id = ir.inventory_item_id
     JOIN users requester ON requester.id = ir.requested_by_user_id
     WHERE ir.property_id = ?
     ORDER BY CASE ir.status WHEN 'requested' THEN 1 WHEN 'ordered' THEN 2 WHEN 'received' THEN 3 ELSE 4 END,
              ir.requested_at DESC`,
  ).all(propertyId) as InventoryReorder[];
}

export function createInventoryReorder(
  propertyId: string,
  inventoryItemId: string,
  actorUserId: string,
  quantity: number,
  supplier?: string | null,
  database: AppDatabase = db,
): InventoryReorder {
  const item = database.prepare(
    "SELECT id, name, supplier FROM inventory_items WHERE id = ? AND property_id = ?",
  ).get(inventoryItemId, propertyId) as { id: string; name: string; supplier: string | null } | undefined;
  if (!item) throw notFound("Inventory item not found at this property");
  const active = database.prepare(
    "SELECT id FROM inventory_reorders WHERE inventory_item_id = ? AND status IN ('requested', 'ordered')",
  ).get(inventoryItemId);
  if (active) throw conflict("This inventory item already has an active reorder");
  const id = randomUUID();
  const timestamp = now();
  database.transaction(() => {
    database.prepare(
      `INSERT INTO inventory_reorders
       (id, property_id, inventory_item_id, quantity, supplier, status, requested_by_user_id,
        requested_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?)`,
    ).run(id, propertyId, inventoryItemId, quantity, supplier ?? item.supplier, actorUserId, timestamp, timestamp, timestamp);
    appendActivity(propertyId, actorUserId, "inventory_reorder", id, "inventory.reorder.requested", {
      inventoryItemId, itemName: item.name, quantity,
    }, database);
  })();
  return listInventoryReorders(propertyId, database).find((record) => record.id === id)!;
}

export function updateInventoryReorder(
  reorderId: string,
  actorUserId: string,
  status: InventoryReorderStatus,
  database: AppDatabase = db,
): InventoryReorder {
  const reorder = database.prepare(
    `SELECT ir.*, item.name AS item_name, item.unit_cost
     FROM inventory_reorders ir JOIN inventory_items item ON item.id = ir.inventory_item_id
     WHERE ir.id = ?`,
  ).get(reorderId) as Record<string, unknown> | undefined;
  if (!reorder) throw notFound("Inventory reorder not found");
  const current = String(reorder.status) as InventoryReorderStatus;
  const allowed: Record<InventoryReorderStatus, InventoryReorderStatus[]> = {
    requested: ["ordered", "cancelled"],
    ordered: ["received", "cancelled"],
    received: [],
    cancelled: [],
  };
  if (!allowed[current].includes(status)) throw badRequest(`A ${current} reorder cannot move to ${status}`);
  const timestamp = now();
  database.transaction(() => {
    database.prepare(
      `UPDATE inventory_reorders SET status = ?,
       ordered_at = CASE WHEN ? = 'ordered' THEN ? ELSE ordered_at END,
       received_at = CASE WHEN ? = 'received' THEN ? ELSE received_at END,
       received_by_user_id = CASE WHEN ? = 'received' THEN ? ELSE received_by_user_id END,
       updated_at = ? WHERE id = ?`,
    ).run(status, status, timestamp, status, timestamp, status, actorUserId, timestamp, reorderId);
    if (status === "received") {
      database.prepare("UPDATE inventory_items SET quantity_on_hand = quantity_on_hand + ?, updated_at = ? WHERE id = ?")
        .run(reorder.quantity, timestamp, reorder.inventory_item_id);
      database.prepare(
        `INSERT INTO inventory_transactions
         (id, inventory_item_id, quantity_delta, unit_cost_snapshot, reason, created_by_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(randomUUID(), reorder.inventory_item_id, reorder.quantity, reorder.unit_cost,
        `Received reorder for ${String(reorder.item_name)}`, actorUserId, timestamp);
    }
    appendActivity(String(reorder.property_id), actorUserId, "inventory_reorder", reorderId, `inventory.reorder.${status}`, {
      inventoryItemId: reorder.inventory_item_id, quantity: reorder.quantity,
    }, database);
  })();
  return listInventoryReorders(String(reorder.property_id), database).find((record) => record.id === reorderId)!;
}

export function adjustInventory(itemId: string, actorUserId: string, quantityDelta: number, reason: string): InventoryRecord {
  const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(itemId) as InventoryRow | undefined;
  if (!item) throw notFound("Inventory item not found");
  if (item.quantity_on_hand + quantityDelta < 0) throw conflict("This adjustment would make stock negative");
  db.transaction(() => {
    db.prepare("UPDATE inventory_items SET quantity_on_hand = quantity_on_hand + ?, updated_at = ? WHERE id = ?")
      .run(quantityDelta, now(), itemId);
    db.prepare(
      `INSERT INTO inventory_transactions
       (id, inventory_item_id, quantity_delta, unit_cost_snapshot, reason, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(randomUUID(), itemId, quantityDelta, item.unit_cost, reason, actorUserId, now());
    appendActivity(item.property_id, actorUserId, "inventory", itemId, "inventory.adjusted", { quantityDelta, reason });
  })();
  return listInventory(item.property_id).find((record) => record.id === itemId)!;
}

export function listVendors(propertyId: string): VendorRecord[] {
  const rows = db.prepare(
    `SELECT v.id, v.property_id AS propertyId, v.name, v.contact_name AS contactName, v.phone, v.email,
            v.specialties_json AS specialtiesJson, v.status, v.rating,
            SUM(CASE WHEN vj.status NOT IN ('complete', 'cancelled') THEN 1 ELSE 0 END) AS openJobs
     FROM vendors v LEFT JOIN vendor_jobs vj ON vj.vendor_id = v.id
     WHERE v.property_id = ? GROUP BY v.id ORDER BY v.status, v.name`,
  ).all(propertyId) as Array<Omit<VendorRecord, "specialties"> & { specialtiesJson: string }>;
  return rows.map(({ specialtiesJson, ...row }) => ({ ...row, openJobs: Number(row.openJobs), specialties: JSON.parse(specialtiesJson) as string[] }));
}

export function createVendor(propertyId: string, input: {
  name: string; contactName?: string | null; phone?: string | null; email?: string | null; specialties: string[]; rating?: number | null;
}): VendorRecord {
  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO vendors
     (id, property_id, name, contact_name, phone, email, specialties_json, status, rating, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
  ).run(id, propertyId, input.name, input.contactName ?? null, input.phone ?? null, input.email ?? null,
    JSON.stringify(input.specialties), input.rating ?? null, timestamp, timestamp);
  return listVendors(propertyId).find((vendor) => vendor.id === id)!;
}

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
    return { ...typed, assessedItems: Number(typed.assessedItems), totalItems: Number(typed.totalItems), damageItems: Number(typed.damageItems), estimatedCharges: Number(typed.estimatedCharges) };
  });
}

export function createInspection(input: { propertyId: string; unitId: string; type: InspectionSummary["type"]; inspectionDate: string; notes?: string | null; inspectorUserId: string }): InspectionDetail {
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
  return { ...summary, assessedItems: Number(summary.assessedItems), totalItems: Number(summary.totalItems), damageItems: Number(summary.damageItems), estimatedCharges: Number(summary.estimatedCharges), items };
}

export function updateInspectionItem(inspectionId: string, itemId: string, actorUserId: string, input: {
  condition: InspectionCondition; responsibility: InspectionResponsibility; notes?: string | null; costEstimate?: number | null; severity?: number | null;
}): InspectionDetail {
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
    const match = inspection.templateVersionId ? { version_id: inspection.templateVersionId } : db.prepare(
      `SELECT tv.id AS version_id
       FROM units u JOIN floor_plans fp ON fp.id = u.floor_plan_id
       JOIN turn_templates tt ON tt.match_bedrooms = fp.bedrooms AND tt.status = 'active' AND tt.property_id = u.property_id
       JOIN turn_template_versions tv ON tv.id = (
         SELECT tv2.id FROM turn_template_versions tv2 WHERE tv2.template_id = tt.id ORDER BY version DESC LIMIT 1)
       WHERE u.id = ? ORDER BY CASE WHEN tt.match_bathrooms = fp.bathrooms THEN 0 ELSE 1 END LIMIT 1`,
    ).get(inspection.unitId) as { version_id: string } | undefined;
    if (!match) throw conflict("No published turn template matches this unit");
    const turn = createTurn({ propertyId: inspection.propertyId, unitId: inspection.unitId, templateVersionId: match.version_id,
      priority: inspection.damageItems >= 3 ? "high" : "normal", moveOutDate: inspection.inspectionDate,
      targetReadyDate: null, notes: `Generated from ${inspection.type.replaceAll("_", " ")} inspection.`, createdByUserId: actorUserId });
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

export function listPoolLogs(propertyId: string): PoolLogRecord[] {
  const rows = db.prepare(
    `SELECT pl.*, u.name AS created_by_name FROM pool_logs pl JOIN users u ON u.id = pl.created_by_user_id
     WHERE pl.property_id = ? ORDER BY pl.log_date DESC, pl.logged_at DESC LIMIT 90`,
  ).all(propertyId) as PoolRow[];
  return rows.map(toPoolLog);
}

export function createPoolLog(propertyId: string, actorUserId: string, input: PoolInput): PoolLogRecord {
  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO pool_logs
     (id, property_id, log_date, logged_at, free_chlorine, total_chlorine, ph, alkalinity,
      hardness, cyanuric_acid, water_temp_f, weather_summary, notes, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, propertyId, input.logDate, timestamp, input.freeChlorine, input.totalChlorine, input.ph,
    input.alkalinity, input.hardness, input.cyanuricAcid, input.waterTempF, input.weatherSummary ?? null,
    input.notes ?? null, actorUserId, timestamp, timestamp);
  const row = db.prepare(
    "SELECT pl.*, u.name AS created_by_name FROM pool_logs pl JOIN users u ON u.id = pl.created_by_user_id WHERE pl.id = ?",
  ).get(id) as PoolRow;
  const record = toPoolLog(row);
  if (record.exceptions.length) notifyPropertyManagers(propertyId, "pool.exception", "Pool reading needs attention", record.exceptions.join(" · "), "pool_log", id);
  return record;
}

interface PoolInput {
  logDate: string; freeChlorine: number | null; totalChlorine: number | null; ph: number | null;
  alkalinity: number | null; hardness: number | null; cyanuricAcid: number | null; waterTempF: number | null;
  weatherSummary?: string | null; notes?: string | null;
}
interface PoolRow { id: string; property_id: string; log_date: string; logged_at: string; free_chlorine: number | null;
  total_chlorine: number | null; ph: number | null; alkalinity: number | null; hardness: number | null;
  cyanuric_acid: number | null; water_temp_f: number | null; weather_summary: string | null; notes: string | null; created_by_name?: string; }

function poolExceptions(row: PoolRow): string[] {
  const checks: Array<[number | null, number, number, string]> = [
    [row.free_chlorine, 1, 4, "Free chlorine"], [row.ph, 7.2, 7.8, "pH"],
    [row.alkalinity, 80, 120, "Alkalinity"], [row.hardness, 200, 400, "Hardness"],
    [row.cyanuric_acid, 30, 50, "Cyanuric acid"],
  ];
  return checks.flatMap(([value, min, max, label]) => value !== null && (value < min || value > max) ? [`${label} ${value} (target ${min}–${max})`] : []);
}

function toPoolLog(row: PoolRow): PoolLogRecord {
  return { id: row.id, propertyId: row.property_id, logDate: row.log_date, loggedAt: row.logged_at,
    freeChlorine: row.free_chlorine, totalChlorine: row.total_chlorine, ph: row.ph,
    alkalinity: row.alkalinity, hardness: row.hardness, cyanuricAcid: row.cyanuric_acid,
    waterTempF: row.water_temp_f, weatherSummary: row.weather_summary, notes: row.notes,
    createdByName: row.created_by_name ?? "Unknown", exceptions: poolExceptions(row) };
}

function appendActivity(propertyId: string, actorUserId: string, entityType: string, entityId: string, action: string, details: Record<string, unknown>, database: AppDatabase = db) {
  database.prepare(
    `INSERT INTO activity_events (id, property_id, actor_user_id, entity_type, entity_id, action, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), propertyId, actorUserId, entityType, entityId, action, JSON.stringify(details), now());
}

function notify(userId: string, type: string, title: string, message: string, entityType: string | null, entityId: string | null) {
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), userId, type, title, message, entityType, entityId, now());
}

function notifyPropertyManagers(propertyId: string, type: string, title: string, message: string, entityType: string, entityId: string) {
  const users = db.prepare(
    `SELECT DISTINCT ra.user_id FROM role_assignments ra JOIN role_permissions rp ON rp.role_id = ra.role_id
     WHERE rp.permission_key = 'pool:manage' AND (ra.property_id IS NULL OR ra.property_id = ?)`,
  ).all(propertyId) as Array<{ user_id: string }>;
  for (const user of users) notify(user.user_id, type, title, message, entityType, entityId);
}

interface WorkOrderRow { id: string; property_id: string; status: WorkOrderStatus; priority: WorkOrderPriority; assigned_to_user_id: string | null; due_date: string | null; title: string; description: string | null; category: string; requested_by: string | null; }
interface InventoryRow { id: string; property_id: string; quantity_on_hand: number; unit_cost: number; }
