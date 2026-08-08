import { randomUUID } from "node:crypto";
import type { AccountingExport, ExecutiveSnapshot, RentRollEntry, ResidentCharge } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { notFound } from "../lib/errors.js";

const now = () => new Date().toISOString();

export function listResidentCharges(propertyId: string): ResidentCharge[] {
  return db.prepare(
    `SELECT c.id, c.property_id AS propertyId, c.resident_id AS residentId,
            r.first_name || ' ' || r.last_name AS residentName, c.lease_id AS leaseId,
            c.unit_id AS unitId, u.unit_number AS unitNumber, c.description, c.amount,
            c.charge_type AS chargeType, c.status, c.due_date AS dueDate, c.posted_at AS postedAt
     FROM resident_charges c
     LEFT JOIN residents r ON r.id = c.resident_id
     LEFT JOIN units u ON u.id = c.unit_id
     WHERE c.property_id = ? ORDER BY c.due_date DESC, c.created_at DESC`,
  ).all(propertyId) as ResidentCharge[];
}

export function createResidentCharge(input: {
  propertyId: string;
  residentId?: string | null;
  leaseId?: string | null;
  unitId?: string | null;
  description: string;
  amount: number;
  chargeType: ResidentCharge["chargeType"];
  dueDate?: string | null;
}): ResidentCharge {
  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO resident_charges
     (id, property_id, resident_id, lease_id, unit_id, description, amount, charge_type, status, due_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
  ).run(id, input.propertyId, input.residentId ?? null, input.leaseId ?? null, input.unitId ?? null,
    input.description, input.amount, input.chargeType, input.dueDate ?? null, timestamp, timestamp);
  return listResidentCharges(input.propertyId).find((charge) => charge.id === id)!;
}

export function updateChargeStatus(id: string, status: ResidentCharge["status"]): ResidentCharge {
  const current = db.prepare("SELECT property_id FROM resident_charges WHERE id = ?").get(id) as { property_id: string } | undefined;
  if (!current) throw notFound("Charge not found");
  const timestamp = now();
  db.prepare(
    "UPDATE resident_charges SET status = ?, posted_at = CASE WHEN ? = 'posted' THEN COALESCE(posted_at, ?) ELSE posted_at END, updated_at = ? WHERE id = ?",
  ).run(status, status, timestamp, timestamp, id);
  return listResidentCharges(current.property_id).find((charge) => charge.id === id)!;
}

export function getRentRoll(propertyId: string): RentRollEntry[] {
  return db.prepare(
    `SELECT u.id AS unitId, u.unit_number AS unitNumber, fp.name AS floorPlanName, u.occupancy_status AS occupancyStatus,
            h.name AS householdName,
            GROUP_CONCAT(DISTINCT r.first_name || ' ' || r.last_name) AS residentNames,
            COALESCE(l.status, 'vacant') AS leaseStatus,
            COALESCE(l.monthly_rent, 0) AS monthlyRent,
            l.move_in_date AS moveInDate, l.move_out_date AS moveOutDate,
            COALESCE((SELECT SUM(amount) FROM resident_charges rc WHERE rc.lease_id = l.id AND rc.status = 'pending'), 0) AS pendingCharges
     FROM units u
     JOIN floor_plans fp ON fp.id = u.floor_plan_id
     LEFT JOIN leases l ON l.unit_id = u.id AND l.status IN ('active', 'notice')
     LEFT JOIN households h ON h.id = l.household_id
     LEFT JOIN household_members hm ON hm.household_id = h.id
     LEFT JOIN residents r ON r.id = hm.resident_id
     WHERE u.property_id = ?
     GROUP BY u.id
     ORDER BY u.unit_number`,
  ).all(propertyId).map((row) => ({
    ...(row as RentRollEntry),
    monthlyRent: Number((row as RentRollEntry).monthlyRent),
    pendingCharges: Number((row as RentRollEntry).pendingCharges),
  }));
}

export function getExecutiveSnapshot(propertyId: string): ExecutiveSnapshot {
  const units = db.prepare(
    `SELECT COUNT(*) AS total, SUM(occupancy_status = 'occupied') AS occupied FROM units WHERE property_id = ?`,
  ).get(propertyId) as { total: number; occupied: number | null };
  const leases = db.prepare(
    "SELECT COUNT(*) AS activeLeases, COALESCE(SUM(monthly_rent), 0) AS monthlyRentPotential FROM leases WHERE property_id = ? AND status IN ('active', 'notice')",
  ).get(propertyId) as { activeLeases: number; monthlyRentPotential: number | null };
  const charges = db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS collectedRent,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pendingCharges
     FROM resident_charges WHERE property_id = ?`,
  ).get(propertyId) as { collectedRent: number | null; pendingCharges: number | null };
  const ops = db.prepare(
    `SELECT
      (SELECT COUNT(*) FROM work_orders WHERE property_id = ? AND status NOT IN ('complete', 'cancelled')) AS openWorkOrders,
      (SELECT COUNT(*) FROM turns WHERE property_id = ? AND status NOT IN ('complete', 'cancelled')) AS openTurns,
      (SELECT COUNT(*) FROM prospects WHERE property_id = ? AND stage NOT IN ('lost', 'leased')) AS prospectPipeline,
      (SELECT COUNT(*) FROM tours WHERE property_id = ? AND scheduled_at >= date('now', '-7 days') AND status = 'scheduled') AS toursThisWeek`,
  ).get(propertyId, propertyId, propertyId, propertyId) as {
    openWorkOrders: number; openTurns: number; prospectPipeline: number; toursThisWeek: number;
  };
  const total = Number(units.total ?? 0);
  const occupied = Number(units.occupied ?? 0);
  return {
    propertyId,
    occupancyRate: total ? Math.round((occupied / total) * 100) : 0,
    activeLeases: Number(leases.activeLeases ?? 0),
    monthlyRentPotential: Number(leases.monthlyRentPotential ?? 0),
    collectedRent: Number(charges.collectedRent ?? 0),
    pendingCharges: Number(charges.pendingCharges ?? 0),
    openWorkOrders: Number(ops.openWorkOrders ?? 0),
    openTurns: Number(ops.openTurns ?? 0),
    prospectPipeline: Number(ops.prospectPipeline ?? 0),
    toursThisWeek: Number(ops.toursThisWeek ?? 0),
  };
}

export function createAccountingExport(input: {
  propertyId: string;
  exportType: AccountingExport["exportType"];
  periodStart: string;
  periodEnd: string;
  createdByUserId: string;
}): AccountingExport {
  const id = randomUUID();
  const timestamp = now();
  let summary: Record<string, unknown> = {};
  let rowCount = 0;
  if (input.exportType === "rent_roll") {
    const rentRoll = getRentRoll(input.propertyId);
    rowCount = rentRoll.length;
    summary = { totalRent: rentRoll.reduce((sum, row) => sum + row.monthlyRent, 0), occupiedUnits: rentRoll.filter((row) => row.leaseStatus === "active").length };
  } else if (input.exportType === "charges") {
    const charges = listResidentCharges(input.propertyId);
    rowCount = charges.length;
    summary = { totalAmount: charges.reduce((sum, row) => sum + row.amount, 0), pending: charges.filter((row) => row.status === "pending").length };
  } else {
    summary = { ...(getExecutiveSnapshot(input.propertyId) as unknown as Record<string, unknown>) };
    rowCount = 1;
  }
  db.prepare(
    `INSERT INTO accounting_exports
     (id, property_id, export_type, period_start, period_end, status, summary_json, row_count, created_by_user_id, created_at)
     VALUES (?, ?, ?, ?, ?, 'ready', ?, ?, ?, ?)`,
  ).run(id, input.propertyId, input.exportType, input.periodStart, input.periodEnd, JSON.stringify(summary), rowCount, input.createdByUserId, timestamp);
  return {
    id,
    propertyId: input.propertyId,
    exportType: input.exportType,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    status: "ready",
    rowCount,
    summary,
    createdAt: timestamp,
  };
}

export function listAccountingExports(propertyId: string): AccountingExport[] {
  return db.prepare(
    `SELECT id, property_id AS propertyId, export_type AS exportType, period_start AS periodStart,
            period_end AS periodEnd, status, summary_json AS summaryJson, row_count AS rowCount, created_at AS createdAt
     FROM accounting_exports WHERE property_id = ? ORDER BY created_at DESC LIMIT 50`,
  ).all(propertyId).map((row) => {
    const item = row as AccountingExport & { summaryJson: string };
    const { summaryJson, ...rest } = item;
    return { ...rest, summary: JSON.parse(summaryJson) as Record<string, unknown> };
  });
}

export function exportRentRollCsv(propertyId: string): string {
  const rows = getRentRoll(propertyId);
  const headers = ["Unit", "Floor plan", "Occupancy", "Household", "Residents", "Lease status", "Monthly rent", "Move in", "Move out", "Pending charges"];
  const data = rows.map((row) => [
    row.unitNumber, row.floorPlanName, row.occupancyStatus, row.householdName ?? "",
    row.residentNames ?? "", row.leaseStatus ?? "", row.monthlyRent, row.moveInDate ?? "",
    row.moveOutDate ?? "", row.pendingCharges,
  ]);
  return [headers, ...data].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}
