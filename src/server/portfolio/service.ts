import type {
  DashboardSnapshot,
  PortfolioSummary,
  PropertyModuleKey,
  PropertyModuleSetting,
  PropertySummary,
  UnitSummary,
} from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { listUnits as listUnitsFromRepo } from "../db/repositories/unitsRepository.js";
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
  return listUnitsFromRepo(db, propertyId);
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

const ALL_MODULES: PropertyModuleKey[] = [
  "make_ready", "operations", "pool", "residents", "leasing", "communications", "financial", "portal",
];

export function getPropertyModules(propertyId: string): PropertyModuleSetting[] {
  const rows = db.prepare(
    "SELECT module_key AS moduleKey, enabled FROM property_modules WHERE property_id = ?",
  ).all(propertyId) as Array<{ moduleKey: PropertyModuleKey; enabled: number }>;
  if (!rows.length) {
    return ALL_MODULES.map((moduleKey) => ({ moduleKey, enabled: true }));
  }
  const enabledByKey = new Map(rows.map((row) => [row.moduleKey, Boolean(row.enabled)]));
  return ALL_MODULES.map((moduleKey) => ({
    moduleKey,
    enabled: enabledByKey.get(moduleKey) ?? true,
  }));
}

export function isModuleEnabled(propertyId: string, moduleKey: PropertyModuleKey): boolean {
  const row = db.prepare(
    "SELECT enabled FROM property_modules WHERE property_id = ? AND module_key = ?",
  ).get(propertyId, moduleKey) as { enabled: number } | undefined;
  return row ? Boolean(row.enabled) : true;
}

export function updatePropertyModules(propertyId: string, modules: PropertyModuleSetting[]): PropertyModuleSetting[] {
  db.transaction(() => {
    const upsert = db.prepare(
      "INSERT INTO property_modules (property_id, module_key, enabled) VALUES (?, ?, ?) ON CONFLICT(property_id, module_key) DO UPDATE SET enabled = excluded.enabled",
    );
    for (const module of modules) {
      upsert.run(propertyId, module.moduleKey, module.enabled ? 1 : 0);
    }
  })();
  return getPropertyModules(propertyId);
}

export function getPortfolioSummary(userId: string): PortfolioSummary {
  const properties = listProperties(userId);
  const propertyIds = properties.map((property) => property.id);
  if (!propertyIds.length) {
    return {
      propertyCount: 0,
      units: { total: 0, occupied: 0, vacant: 0, notice: 0, down: 0 },
      turns: { open: 0, urgent: 0, overdue: 0, readyForReview: 0 },
      workOrders: { open: 0, emergency: 0, overdue: 0 },
      properties: [],
    };
  }
  const placeholders = propertyIds.map(() => "?").join(", ");
  const units = db.prepare(
    `SELECT COUNT(*) AS total,
            SUM(occupancy_status = 'occupied') AS occupied,
            SUM(occupancy_status = 'vacant') AS vacant,
            SUM(occupancy_status = 'notice') AS notice,
            SUM(occupancy_status = 'down') AS down
     FROM units WHERE property_id IN (${placeholders})`,
  ).get(...propertyIds) as PortfolioSummary["units"];
  const turns = db.prepare(
    `SELECT SUM(status NOT IN ('complete', 'cancelled')) AS open,
            SUM(priority = 'urgent' AND status NOT IN ('complete', 'cancelled')) AS urgent,
            SUM(target_ready_date < date('now') AND status NOT IN ('complete', 'cancelled')) AS overdue,
            SUM(status = 'ready_for_review') AS readyForReview
     FROM turns WHERE property_id IN (${placeholders})`,
  ).get(...propertyIds) as PortfolioSummary["turns"];
  const workOrders = db.prepare(
    `SELECT SUM(status NOT IN ('complete', 'cancelled')) AS open,
            SUM(priority = 'emergency' AND status NOT IN ('complete', 'cancelled')) AS emergency,
            SUM(due_date < date('now') AND status NOT IN ('complete', 'cancelled')) AS overdue
     FROM work_orders WHERE property_id IN (${placeholders})`,
  ).get(...propertyIds) as PortfolioSummary["workOrders"];
  const perProperty = db.prepare(
    `SELECT p.id, p.name, p.code,
            COUNT(DISTINCT u.id) AS unitCount,
            SUM(u.occupancy_status = 'occupied') AS occupied,
            (SELECT COUNT(*) FROM turns t WHERE t.property_id = p.id AND t.status NOT IN ('complete', 'cancelled')) AS openTurns,
            (SELECT COUNT(*) FROM work_orders wo WHERE wo.property_id = p.id AND wo.status NOT IN ('complete', 'cancelled')) AS openWorkOrders
     FROM properties p
     LEFT JOIN units u ON u.property_id = p.id
     WHERE p.id IN (${placeholders})
     GROUP BY p.id ORDER BY p.name`,
  ).all(...propertyIds).map((row) => {
    const item = row as {
      id: string; name: string; code: string; unitCount: number; occupied: number;
      openTurns: number; openWorkOrders: number;
    };
    const unitCount = Number(item.unitCount ?? 0);
    return {
      id: item.id,
      name: item.name,
      code: item.code,
      unitCount,
      occupancyRate: unitCount ? Math.round((Number(item.occupied ?? 0) / unitCount) * 100) : 0,
      openTurns: Number(item.openTurns ?? 0),
      openWorkOrders: Number(item.openWorkOrders ?? 0),
    };
  });
  return {
    propertyCount: properties.length,
    units: normalizeCounts(units),
    turns: normalizeCounts(turns),
    workOrders: normalizeCounts(workOrders),
    properties: perProperty,
  };
}
