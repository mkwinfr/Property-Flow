import type { OperationsSnapshot } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { getWorkOrderSnapshot } from "../db/repositories/workOrdersRepository.js";
import { numeric } from "./shared.js";
import { poolExceptions, type PoolRow } from "./poolService.js";

export function getOperationsSnapshot(propertyId: string): OperationsSnapshot {
  const workOrders = getWorkOrderSnapshot(db, propertyId);
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

export function listTeam(propertyId: string): Array<{ id: string; name: string; roles: string }> {
  return db.prepare(
    `SELECT u.id, u.name, GROUP_CONCAT(DISTINCT r.name) AS roles
     FROM users u JOIN role_assignments ra ON ra.user_id = u.id
     JOIN roles r ON r.id = ra.role_id
     WHERE u.status = 'active' AND (ra.property_id IS NULL OR ra.property_id = ?)
     GROUP BY u.id ORDER BY u.name`,
  ).all(propertyId) as Array<{ id: string; name: string; roles: string }>;
}
