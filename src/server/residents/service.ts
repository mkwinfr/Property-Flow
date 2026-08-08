import { randomUUID } from "node:crypto";
import type { HouseholdSummary, LeaseDetail, LeaseSummary, ResidentDetail, ResidentSummary } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { badRequest, notFound } from "../lib/errors.js";

const now = () => new Date().toISOString();

export function listResidents(propertyId: string): ResidentSummary[] {
  return db.prepare(
    `SELECT r.id, r.property_id AS propertyId, r.first_name AS firstName, r.last_name AS lastName,
            r.email, r.phone, r.preferred_contact AS preferredContact, r.status,
            h.id AS householdId, h.name AS householdName,
            u.unit_number AS currentUnitNumber, l.status AS currentLeaseStatus
     FROM residents r
     LEFT JOIN household_members hm ON hm.resident_id = r.id
     LEFT JOIN households h ON h.id = hm.household_id
     LEFT JOIN leases l ON l.household_id = h.id AND l.status IN ('active', 'notice')
     LEFT JOIN units u ON u.id = l.unit_id
     WHERE r.property_id = ?
     GROUP BY r.id
     ORDER BY r.last_name, r.first_name`,
  ).all(propertyId) as ResidentSummary[];
}

export function getResident(id: string): ResidentDetail {
  const row = db.prepare(
    `SELECT r.id, r.property_id AS propertyId, r.first_name AS firstName, r.last_name AS lastName,
            r.email, r.phone, r.preferred_contact AS preferredContact, r.status, r.notes,
            h.id AS householdId, h.name AS householdName,
            u.unit_number AS currentUnitNumber, l.status AS currentLeaseStatus
     FROM residents r
     LEFT JOIN household_members hm ON hm.resident_id = r.id
     LEFT JOIN households h ON h.id = hm.household_id
     LEFT JOIN leases l ON l.household_id = h.id AND l.status IN ('active', 'notice')
     LEFT JOIN units u ON u.id = l.unit_id
     WHERE r.id = ?`,
  ).get(id) as ResidentDetail | undefined;
  if (!row) throw notFound("Resident not found");
  const leases = listLeases(row.propertyId).filter((lease) =>
    Boolean(db.prepare("SELECT 1 FROM household_members hm WHERE hm.household_id = ? AND hm.resident_id = ?")
      .get(lease.householdId, id)));
  return { ...row, leases };
}

export function createResident(input: {
  propertyId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  preferredContact?: "email" | "phone" | "sms" | null;
  status?: ResidentSummary["status"];
  notes?: string | null;
  householdName?: string | null;
}): ResidentSummary {
  const id = randomUUID();
  const timestamp = now();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO residents (id, property_id, first_name, last_name, email, phone, preferred_contact, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.propertyId, input.firstName, input.lastName, input.email ?? null, input.phone ?? null,
      input.preferredContact ?? null, input.status ?? "active", input.notes ?? null, timestamp, timestamp);
    if (input.householdName) {
      const householdId = randomUUID();
      db.prepare("INSERT INTO households (id, property_id, name, primary_resident_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(householdId, input.propertyId, input.householdName, id, timestamp, timestamp);
      db.prepare("INSERT INTO household_members (household_id, resident_id, relationship, is_leaseholder) VALUES (?, ?, 'primary', 1)")
        .run(householdId, id);
    }
  })();
  return listResidents(input.propertyId).find((resident) => resident.id === id)!;
}

export function listLeases(propertyId: string): LeaseSummary[] {
  return db.prepare(
    `SELECT l.id, l.property_id AS propertyId, l.unit_id AS unitId, u.unit_number AS unitNumber,
            l.household_id AS householdId, h.name AS householdName, l.start_date AS startDate,
            l.end_date AS endDate, l.monthly_rent AS monthlyRent, l.status,
            l.move_in_date AS moveInDate, l.move_out_date AS moveOutDate,
            GROUP_CONCAT(r.first_name || ' ' || r.last_name, ' · ') AS residentNames
     FROM leases l
     JOIN units u ON u.id = l.unit_id
     LEFT JOIN households h ON h.id = l.household_id
     LEFT JOIN household_members hm ON hm.household_id = h.id
     LEFT JOIN residents r ON r.id = hm.resident_id
     WHERE l.property_id = ?
     GROUP BY l.id
     ORDER BY l.status, u.unit_number`,
  ).all(propertyId) as LeaseSummary[];
}

export function getLease(id: string): LeaseDetail {
  const summary = db.prepare(
    `SELECT l.id, l.property_id AS propertyId, l.unit_id AS unitId, u.unit_number AS unitNumber,
            l.household_id AS householdId, h.name AS householdName, l.start_date AS startDate,
            l.end_date AS endDate, l.monthly_rent AS monthlyRent, l.status,
            l.move_in_date AS moveInDate, l.move_out_date AS moveOutDate, l.notes,
            GROUP_CONCAT(r.first_name || ' ' || r.last_name, ' · ') AS residentNames
     FROM leases l JOIN units u ON u.id = l.unit_id
     LEFT JOIN households h ON h.id = l.household_id
     LEFT JOIN household_members hm ON hm.household_id = h.id
     LEFT JOIN residents r ON r.id = hm.resident_id
     WHERE l.id = ? GROUP BY l.id`,
  ).get(id) as (LeaseDetail & { notes: string | null }) | undefined;
  if (!summary) throw notFound("Lease not found");
  const residents = db.prepare(
    `SELECT r.id, r.first_name || ' ' || r.last_name AS name, hm.is_leaseholder AS isLeaseholder
     FROM household_members hm JOIN residents r ON r.id = hm.resident_id
     WHERE hm.household_id = ?`,
  ).all(summary.householdId).map((row) => ({
    id: String((row as { id: string }).id),
    name: String((row as { name: string }).name),
    isLeaseholder: Boolean((row as { isLeaseholder: number }).isLeaseholder),
  }));
  return { ...summary, residents };
}

export function createLease(input: {
  propertyId: string;
  unitId: string;
  householdId?: string | null;
  startDate: string;
  endDate?: string | null;
  monthlyRent: number;
  status?: LeaseSummary["status"];
  moveInDate?: string | null;
  notes?: string | null;
}): LeaseSummary {
  const unit = db.prepare("SELECT property_id, occupancy_status FROM units WHERE id = ?").get(input.unitId) as
    | { property_id: string; occupancy_status: string }
    | undefined;
  if (!unit || unit.property_id !== input.propertyId) throw badRequest("Unit not found at this property");
  const active = db.prepare("SELECT id FROM leases WHERE unit_id = ? AND status IN ('active', 'notice')").get(input.unitId);
  if (active && (input.status ?? "active") === "active") throw badRequest("This unit already has an active lease");
  const id = randomUUID();
  const timestamp = now();
  const status = input.status ?? "active";
  db.transaction(() => {
    db.prepare(
      `INSERT INTO leases (id, property_id, unit_id, household_id, start_date, end_date, monthly_rent, status, move_in_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.propertyId, input.unitId, input.householdId ?? null, input.startDate, input.endDate ?? null,
      input.monthlyRent, status, input.moveInDate ?? null, input.notes ?? null, timestamp, timestamp);
    if (status === "active") {
      db.prepare("UPDATE units SET occupancy_status = 'occupied', updated_at = ? WHERE id = ?").run(timestamp, input.unitId);
    }
  })();
  return listLeases(input.propertyId).find((lease) => lease.id === id)!;
}

export function listHouseholds(propertyId: string): HouseholdSummary[] {
  return db.prepare(
    `SELECT h.id, h.property_id AS propertyId, h.name, h.primary_resident_id AS primaryResidentId,
            COUNT(hm.resident_id) AS memberCount
     FROM households h LEFT JOIN household_members hm ON hm.household_id = h.id
     WHERE h.property_id = ? GROUP BY h.id ORDER BY h.name`,
  ).all(propertyId).map((row) => ({
    ...(row as HouseholdSummary),
    memberCount: Number((row as HouseholdSummary).memberCount),
  }));
}
