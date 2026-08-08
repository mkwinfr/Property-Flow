import { randomUUID } from "node:crypto";
import type {
  PortalApplicationStatus,
  PortalCharge,
  PortalLeaseSummary,
  PortalMaintenanceRequest,
  PortalPet,
} from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { isModuleEnabled } from "../portfolio/service.js";
import { createWorkOrder } from "../operations/workOrdersService.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";

export function listPortalMaintenance(residentId: string): PortalMaintenanceRequest[] {
  return db.prepare(
    `SELECT wo.id, wo.title, wo.description, wo.category, wo.status, wo.priority,
            wo.created_at AS createdAt, wo.updated_at AS updatedAt, u.unit_number AS unitNumber,
            wod.permission_to_enter AS permissionToEnter, wod.appointment_required AS appointmentRequired
     FROM work_orders wo
     JOIN units u ON u.id = wo.unit_id
     LEFT JOIN work_order_details wod ON wod.work_order_id = wo.id
     WHERE wo.resident_id = ? AND wod.deleted_at IS NULL
     ORDER BY wo.created_at DESC LIMIT 30`,
  ).all(residentId).map((row) => ({
    ...(row as Omit<PortalMaintenanceRequest, "appointmentRequired"> & { appointmentRequired: number | null }),
    appointmentRequired: Boolean((row as { appointmentRequired: number | null }).appointmentRequired),
  })) as PortalMaintenanceRequest[];
}

export function getPortalMaintenance(residentId: string, workOrderId: string): PortalMaintenanceRequest {
  const row = db.prepare(
    `SELECT wo.id, wo.title, wo.description, wo.category, wo.status, wo.priority,
            wo.created_at AS createdAt, wo.updated_at AS updatedAt, u.unit_number AS unitNumber,
            wod.permission_to_enter AS permissionToEnter, wod.appointment_required AS appointmentRequired
     FROM work_orders wo
     JOIN units u ON u.id = wo.unit_id
     LEFT JOIN work_order_details wod ON wod.work_order_id = wo.id
     WHERE wo.id = ? AND wo.resident_id = ? AND wod.deleted_at IS NULL`,
  ).get(workOrderId, residentId) as (Omit<PortalMaintenanceRequest, "appointmentRequired"> & { appointmentRequired: number | null }) | undefined;
  if (!row) throw notFound("Maintenance request not found");
  return { ...row, appointmentRequired: Boolean(row.appointmentRequired) };
}

export function submitPortalMaintenance(input: {
  residentId: string;
  propertyId: string;
  unitId: string;
  title: string;
  description: string;
  category: string;
  permissionToEnter: "permission_given" | "no_permission";
  appointmentRequired: boolean;
}): PortalMaintenanceRequest {
  if (!isModuleEnabled(input.propertyId, "portal")) throw forbidden("The resident portal is not enabled for this property");
  const resident = db.prepare(
    "SELECT first_name AS firstName, last_name AS lastName FROM residents WHERE id = ?",
  ).get(input.residentId) as { firstName: string; lastName: string } | undefined;
  const residentName = resident ? `${resident.firstName} ${resident.lastName}` : "Resident";
  const workOrder = createWorkOrder({
    propertyId: input.propertyId,
    unitId: input.unitId,
    title: input.title,
    description: input.description,
    category: input.category,
    priority: "normal",
    requestedBy: residentName,
    residentId: input.residentId,
    submissionSource: "portal",
    areas: ["Resident reported area"],
    permissionToEnter: input.permissionToEnter,
    appointmentRequired: input.appointmentRequired,
    actorUserId: "user-manager",
  });
  return listPortalMaintenance(input.residentId).find((item) => item.id === workOrder.id)!;
}

export function listPortalCharges(residentId: string): PortalCharge[] {
  return db.prepare(
    `SELECT id, description, amount, status, due_date AS dueDate
     FROM resident_charges WHERE resident_id = ? ORDER BY due_date DESC, created_at DESC`,
  ).all(residentId) as PortalCharge[];
}

export function getPortalLease(residentId: string): PortalLeaseSummary | null {
  const row = db.prepare(
    `SELECT l.id, u.unit_number AS unitNumber, l.monthly_rent AS monthlyRent, l.start_date AS startDate,
            l.end_date AS endDate, l.status, l.move_in_date AS moveInDate
     FROM leases l JOIN units u ON u.id = l.unit_id
     JOIN household_members hm ON hm.household_id = l.household_id
     WHERE hm.resident_id = ? AND l.status IN ('active', 'notice')
     ORDER BY l.start_date DESC LIMIT 1`,
  ).get(residentId) as PortalLeaseSummary | undefined;
  return row ?? null;
}

export function getPortalApplication(residentId: string): PortalApplicationStatus | null {
  const prospect = db.prepare(
    "SELECT id FROM prospects WHERE email = (SELECT email FROM residents WHERE id = ?) LIMIT 1",
  ).get(residentId) as { id: string } | undefined;
  if (!prospect) return null;
  const row = db.prepare(
    `SELECT a.id, a.status, u.unit_number AS unitNumber, a.submitted_at AS submittedAt, a.decision_at AS decisionAt
     FROM applications a LEFT JOIN units u ON u.id = a.unit_id
     WHERE a.prospect_id = ? ORDER BY a.submitted_at DESC LIMIT 1`,
  ).get(prospect.id) as PortalApplicationStatus | undefined;
  return row ?? null;
}

export function resolveResidentHousehold(residentId: string): { householdId: string; propertyId: string } {
  const row = db.prepare(
    `SELECT hm.household_id AS householdId, h.property_id AS propertyId
     FROM household_members hm JOIN households h ON h.id = hm.household_id
     WHERE hm.resident_id = ? LIMIT 1`,
  ).get(residentId) as { householdId: string; propertyId: string } | undefined;
  if (!row) throw badRequest("No household is linked to this resident account");
  return row;
}

function mapPet(row: {
  id: string; householdId: string; name: string; species: string; breed: string | null; color: string | null;
  weightLbs: number | null; isServiceAnimal: number; vaccinationExpires: string | null; notes: string | null; updatedAt: string;
}): PortalPet {
  return {
    id: row.id,
    householdId: row.householdId,
    name: row.name,
    species: row.species,
    breed: row.breed,
    color: row.color,
    weightLbs: row.weightLbs,
    isServiceAnimal: Boolean(row.isServiceAnimal),
    vaccinationExpires: row.vaccinationExpires,
    notes: row.notes,
    updatedAt: row.updatedAt,
  };
}

export function listPortalPets(residentId: string): PortalPet[] {
  const { householdId } = resolveResidentHousehold(residentId);
  return db.prepare(
    `SELECT id, household_id AS householdId, name, species, breed, color, weight_lbs AS weightLbs,
            is_service_animal AS isServiceAnimal, vaccination_expires AS vaccinationExpires, notes, updated_at AS updatedAt
     FROM household_pets WHERE household_id = ? ORDER BY name`,
  ).all(householdId).map((row) => mapPet(row as Parameters<typeof mapPet>[0]));
}

export function createPortalPet(residentId: string, input: {
  name: string;
  species: string;
  breed?: string | null;
  color?: string | null;
  weightLbs?: number | null;
  isServiceAnimal?: boolean;
  vaccinationExpires?: string | null;
  notes?: string | null;
}): PortalPet {
  const { householdId, propertyId } = resolveResidentHousehold(residentId);
  if (!isModuleEnabled(propertyId, "portal")) throw forbidden("The resident portal is not enabled for this property");
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  db.prepare(
    `INSERT INTO household_pets
     (id, household_id, property_id, name, species, breed, color, weight_lbs, is_service_animal, vaccination_expires, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, householdId, propertyId, input.name, input.species, input.breed ?? null, input.color ?? null,
    input.weightLbs ?? null, input.isServiceAnimal ? 1 : 0, input.vaccinationExpires ?? null, input.notes ?? null, timestamp, timestamp);
  return listPortalPets(residentId).find((pet) => pet.id === id)!;
}

export function updatePortalPet(residentId: string, petId: string, input: Partial<{
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  weightLbs: number | null;
  isServiceAnimal: boolean;
  vaccinationExpires: string | null;
  notes: string | null;
}>): PortalPet {
  const { householdId } = resolveResidentHousehold(residentId);
  const existing = db.prepare("SELECT id FROM household_pets WHERE id = ? AND household_id = ?").get(petId, householdId);
  if (!existing) throw notFound("Pet not found");
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, column] of [
    ["name", "name"], ["species", "species"], ["breed", "breed"], ["color", "color"],
    ["weightLbs", "weight_lbs"], ["isServiceAnimal", "is_service_animal"],
    ["vaccinationExpires", "vaccination_expires"], ["notes", "notes"],
  ] as const) {
    const value = input[key as keyof typeof input];
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      values.push(key === "isServiceAnimal" ? (value ? 1 : 0) : value);
    }
  }
  fields.push("updated_at = ?");
  values.push(new Date().toISOString(), petId);
  db.prepare(`UPDATE household_pets SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return listPortalPets(residentId).find((pet) => pet.id === petId)!;
}

export function deletePortalPet(residentId: string, petId: string): void {
  const { householdId } = resolveResidentHousehold(residentId);
  const result = db.prepare("DELETE FROM household_pets WHERE id = ? AND household_id = ?").run(petId, householdId);
  if (!result.changes) throw notFound("Pet not found");
}

export function resolveResidentUnit(residentId: string): { unitId: string; propertyId: string } {
  const lease = db.prepare(
    `SELECT l.unit_id AS unitId, l.property_id AS propertyId
     FROM leases l JOIN household_members hm ON hm.household_id = l.household_id
     WHERE hm.resident_id = ? AND l.status IN ('active', 'notice')
     ORDER BY l.start_date DESC LIMIT 1`,
  ).get(residentId) as { unitId: string; propertyId: string } | undefined;
  if (!lease) throw badRequest("No active lease found for maintenance requests");
  return lease;
}

export function ensurePortalAccount(residentId: string, email: string, passwordHash: string): void {
  const existing = db.prepare("SELECT id FROM resident_accounts WHERE resident_id = ? OR email = ?").get(residentId, email);
  if (existing) return;
  const timestamp = new Date().toISOString();
  db.prepare(
    "INSERT INTO resident_accounts (id, resident_id, email, password_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)",
  ).run(randomUUID(), residentId, email, passwordHash, timestamp, timestamp);
}
