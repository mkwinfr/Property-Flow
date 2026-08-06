import type { DashboardSnapshot, PropertySummary, UnitSummary } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { listTurns } from "../turns/service.js";

export function listProperties(userId: string): PropertySummary[] {
  return db
    .prepare(
      `SELECT p.id, p.name, p.code,
              p.address_line_1 || ', ' || p.city || ', ' || p.state || ' ' || p.postal_code AS address,
              COUNT(DISTINCT u.id) AS unitCount
       FROM properties p
       JOIN role_assignments ra ON ra.user_id = ? AND (ra.property_id IS NULL OR ra.property_id = p.id)
       LEFT JOIN units u ON u.property_id = p.id
       GROUP BY p.id
       ORDER BY p.name`,
    )
    .all(userId) as PropertySummary[];
}

export function listUnits(propertyId: string): UnitSummary[] {
  return db
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

export function getDashboard(propertyId: string): DashboardSnapshot {
  const units = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(occupancy_status = 'occupied') AS occupied,
              SUM(occupancy_status = 'vacant') AS vacant,
              SUM(occupancy_status = 'notice') AS notice,
              SUM(occupancy_status = 'down') AS down
       FROM units WHERE property_id = ?`,
    )
    .get(propertyId) as DashboardSnapshot["units"];
  const turns = db
    .prepare(
      `SELECT SUM(status NOT IN ('complete', 'cancelled')) AS open,
              SUM(priority = 'urgent' AND status NOT IN ('complete', 'cancelled')) AS urgent,
              SUM(target_ready_date < date('now') AND status NOT IN ('complete', 'cancelled')) AS overdue,
              SUM((priority = 'urgent' OR target_ready_date < date('now')) AND status NOT IN ('complete', 'cancelled')) AS attention,
              SUM(status = 'ready_for_review') AS readyForReview
       FROM turns WHERE property_id = ?`,
    )
    .get(propertyId) as DashboardSnapshot["turns"];
  return {
    propertyId,
    units: normalizeCounts(units),
    turns: normalizeCounts(turns),
    recentTurns: listTurns(propertyId).slice(0, 5),
  };
}

function normalizeCounts<T extends Record<string, number>>(record: T): T {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, Number(value ?? 0)])) as T;
}
