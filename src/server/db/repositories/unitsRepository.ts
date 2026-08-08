import type { UnitSummary } from "../../../shared/contracts.js";
import type { RepositoryDatabase } from "./types.js";

export function listUnits(database: RepositoryDatabase, propertyId: string): UnitSummary[] {
  return database
    .prepare(
      `SELECT u.id, u.property_id AS propertyId, u.unit_number AS unitNumber,
              b.name AS buildingName, fp.name AS floorPlanName,
              fp.bedrooms, fp.bathrooms, fp.square_feet AS squareFeet,
              u.occupancy_status AS occupancyStatus,
              t.id AS activeTurnId, t.status AS activeTurnStatus
       FROM units u
       JOIN buildings b ON b.id = u.building_id
       JOIN floor_plans fp ON fp.id = u.floor_plan_id
       LEFT JOIN turns t ON t.id = (
         SELECT t2.id FROM turns t2
         WHERE t2.unit_id = u.id AND t2.status NOT IN ('complete', 'cancelled')
         ORDER BY t2.created_at DESC LIMIT 1
       )
       WHERE u.property_id = ?
       ORDER BY CAST(u.unit_number AS INTEGER), u.unit_number`,
    )
    .all(propertyId) as UnitSummary[];
}

export function findUnitProperty(database: RepositoryDatabase, unitId: string): { property_id: string } | undefined {
  return database.prepare("SELECT property_id FROM units WHERE id = ?").get(unitId) as { property_id: string } | undefined;
}

export function findTurnProperty(database: RepositoryDatabase, turnId: string): { property_id: string } | undefined {
  return database.prepare("SELECT property_id FROM turns WHERE id = ?").get(turnId) as { property_id: string } | undefined;
}

export function findWorkOrderProperty(database: RepositoryDatabase, workOrderId: string): { property_id: string } | undefined {
  return database.prepare("SELECT property_id FROM work_orders WHERE id = ?").get(workOrderId) as { property_id: string } | undefined;
}

const ENTITY_PROPERTY_COLUMNS: Record<string, string> = {
  work_orders: "property_id",
  inventory_items: "property_id",
  inventory_reorders: "property_id",
  move_out_inspections: "property_id",
};

export function findEntityProperty(database: RepositoryDatabase, table: string, id: string): string | null {
  const column = ENTITY_PROPERTY_COLUMNS[table];
  if (!column) return null;
  const row = database.prepare(`SELECT ${column} AS property_id FROM ${table} WHERE id = ?`).get(id) as { property_id: string } | undefined;
  return row?.property_id ?? null;
}
