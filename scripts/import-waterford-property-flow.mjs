import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";

const APPLY = process.argv.includes("--apply");
const LEGACY_BACKEND = process.env.PROPERTY_FLOW_BACKEND_DIR
  ?? "C:\\Users\\Server\\Property-Flow\\Property Flow Backend";
const TARGET_DB = process.env.PROPERTY_SUITE_DB
  ?? "C:\\PropertySuite\\data\\property-suite.db";
const REVIEW_FLOOR_PLAN = "UNASSIGNED - REVIEW REQUIRED";

const legacyRequire = createRequire(path.join(LEGACY_BACKEND, "package.json"));
legacyRequire("dotenv").config({ path: path.join(LEGACY_BACKEND, ".env"), quiet: true });
const { PrismaClient } = legacyRequire("@prisma/client");

const legacy = new PrismaClient();

function mapStatus(status) {
  const statuses = {
    OCCUPIED: "occupied",
    NOTICE: "notice",
    VACANT: "vacant",
    DOWN: "down",
  };
  const mapped = statuses[status];
  if (!mapped) throw new Error(`Unsupported legacy occupancy status: ${status}`);
  return mapped;
}

function rentNote(unit) {
  if (unit.minRent == null && unit.maxRent == null) return null;
  const minimum = unit.minRent == null ? "unknown" : `$${unit.minRent.toFixed(2)}`;
  const maximum = unit.maxRent == null ? "unknown" : `$${unit.maxRent.toFixed(2)}`;
  return `Legacy Property Flow rent at migration: ${minimum} - ${maximum}.`;
}

const sourceProperty = await legacy.property.findFirst({
  where: { name: "Waterford Landings" },
  include: {
    buildings: { orderBy: { buildingNumber: "asc" } },
    apartments: { include: { floorPlan: true }, orderBy: { unitNumber: "asc" } },
  },
});
const sourceFloorPlans = await legacy.floorPlan.findMany({ orderBy: { name: "asc" } });
await legacy.$disconnect();

if (!sourceProperty) throw new Error("Waterford Landings was not found in the Property Flow database.");
if (sourceProperty.buildings.length !== 17) {
  throw new Error(`Expected 17 legacy buildings, found ${sourceProperty.buildings.length}.`);
}
if (sourceProperty.apartments.length !== 384) {
  throw new Error(`Expected 384 legacy units, found ${sourceProperty.apartments.length}.`);
}
if (sourceFloorPlans.length !== 18) {
  throw new Error(`Expected 18 legacy floor plans, found ${sourceFloorPlans.length}.`);
}

const sourceBuildingIds = new Set(sourceProperty.buildings.map((building) => building.id));
const sourceFloorPlanIds = new Set(sourceFloorPlans.map((floorPlan) => floorPlan.id));
for (const unit of sourceProperty.apartments) {
  if (!sourceBuildingIds.has(unit.buildingId)) {
    throw new Error(`Unit ${unit.unitNumber} references an unknown legacy building.`);
  }
  if (unit.floorPlanId != null && !sourceFloorPlanIds.has(unit.floorPlanId)) {
    throw new Error(`Unit ${unit.unitNumber} references an unknown legacy floor plan.`);
  }
}

const incompleteUnits = sourceProperty.apartments.filter((unit) => unit.floorPlanId == null);
const db = new Database(TARGET_DB);
db.pragma("foreign_keys = ON");

const targets = db.prepare(
  "SELECT * FROM properties WHERE lower(name) = lower(?) OR code = ? ORDER BY created_at",
).all("Waterford Landings", "WAT");
if (targets.length !== 1) {
  db.close();
  throw new Error(`Expected exactly one target Waterford property, found ${targets.length}.`);
}
const target = targets[0];
const existing = {
  buildings: db.prepare("SELECT COUNT(*) AS count FROM buildings WHERE property_id = ?").get(target.id).count,
  floorPlans: db.prepare("SELECT COUNT(*) AS count FROM floor_plans WHERE property_id = ?").get(target.id).count,
  units: db.prepare("SELECT COUNT(*) AS count FROM units WHERE property_id = ?").get(target.id).count,
};
if (existing.units !== 0) {
  db.close();
  throw new Error(`Refusing to replace Waterford because it already has ${existing.units} units.`);
}

const plan = {
  mode: APPLY ? "apply" : "dry-run",
  target: {
    id: target.id,
    name: target.name,
    code: target.code,
    address: `${target.address_line_1}, ${target.city}, ${target.state} ${target.postal_code}`,
  },
  replacing: existing,
  importing: {
    buildings: sourceProperty.buildings.length,
    floorPlans: sourceFloorPlans.length,
    reviewFloorPlans: incompleteUnits.length > 0 ? 1 : 0,
    units: sourceProperty.apartments.length,
    incompleteUnits: incompleteUnits.map((unit) => unit.unitNumber),
  },
};

if (!APPLY) {
  console.log(JSON.stringify(plan, null, 2));
  db.close();
  process.exit(0);
}

const migrate = db.transaction(() => {
  db.prepare("DELETE FROM floor_plans WHERE property_id = ?").run(target.id);
  db.prepare("DELETE FROM buildings WHERE property_id = ?").run(target.id);

  const insertBuilding = db.prepare(
    "INSERT INTO buildings (id, property_id, name, sort_order) VALUES (?, ?, ?, ?)",
  );
  const buildingIds = new Map();
  [...sourceProperty.buildings]
    .sort((a, b) => Number(a.buildingNumber) - Number(b.buildingNumber))
    .forEach((building, index) => {
      const id = randomUUID();
      buildingIds.set(building.id, id);
      insertBuilding.run(id, target.id, building.name || `Building ${building.buildingNumber}`, index);
    });

  const insertFloorPlan = db.prepare(
    "INSERT INTO floor_plans (id, property_id, name, bedrooms, bathrooms, square_feet) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const floorPlanIds = new Map();
  for (const floorPlan of sourceFloorPlans) {
    const id = randomUUID();
    floorPlanIds.set(floorPlan.id, id);
    insertFloorPlan.run(
      id,
      target.id,
      floorPlan.name,
      floorPlan.bedrooms,
      floorPlan.bathrooms,
      floorPlan.sqFt,
    );
  }
  let reviewFloorPlanId = null;
  if (incompleteUnits.length > 0) {
    reviewFloorPlanId = randomUUID();
    insertFloorPlan.run(reviewFloorPlanId, target.id, REVIEW_FLOOR_PLAN, 0, 0, 0);
  }

  const insertUnit = db.prepare(`
    INSERT INTO units (
      id, property_id, building_id, floor_plan_id, unit_number, floor,
      occupancy_status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const timestamp = new Date().toISOString();
  for (const unit of sourceProperty.apartments) {
    const needsReview = unit.floorPlanId == null;
    const notes = [
      needsReview
        ? "MIGRATION REVIEW REQUIRED: Legacy Property Flow unit had no floor-plan or rent assignment."
        : rentNote(unit),
      unit.inlineNote,
    ].filter(Boolean).join(" ") || null;
    insertUnit.run(
      randomUUID(),
      target.id,
      buildingIds.get(unit.buildingId),
      needsReview ? reviewFloorPlanId : floorPlanIds.get(unit.floorPlanId),
      unit.unitNumber,
      unit.floor,
      mapStatus(unit.status),
      notes,
      timestamp,
      timestamp,
    );
  }

  db.prepare(`
    INSERT INTO activity_events (
      id, property_id, actor_user_id, entity_type, entity_id, action, details_json, created_at
    ) VALUES (?, ?, NULL, 'property', ?, 'property.legacy_data_imported', ?, ?)
  `).run(
    randomUUID(),
    target.id,
    target.id,
    JSON.stringify({
      source: "Property Flow",
      buildings: sourceProperty.buildings.length,
      floorPlans: sourceFloorPlans.length,
      units: sourceProperty.apartments.length,
      reviewRequired: incompleteUnits.map((unit) => unit.unitNumber),
      preservedAddress: true,
      unsupportedFloorPlanMetadata: sourceFloorPlans.map((floorPlan) => ({
        name: floorPlan.name,
        type: floorPlan.type,
        marketRent: floorPlan.marketRent,
        requiredDeposit: floorPlan.requiredDeposit,
        maxOccupancy: floorPlan.maxOccupancy,
      })),
    }),
    timestamp,
  );
});

migrate();

const verification = {
  buildings: db.prepare("SELECT COUNT(*) AS count FROM buildings WHERE property_id = ?").get(target.id).count,
  floorPlans: db.prepare("SELECT COUNT(*) AS count FROM floor_plans WHERE property_id = ?").get(target.id).count,
  units: db.prepare("SELECT COUNT(*) AS count FROM units WHERE property_id = ?").get(target.id).count,
  reviewRequired: db.prepare(
    "SELECT COUNT(*) AS count FROM units WHERE property_id = ? AND notes LIKE 'MIGRATION REVIEW REQUIRED:%'",
  ).get(target.id).count,
  integrity: db.pragma("integrity_check", { simple: true }),
  foreignKeyViolations: db.pragma("foreign_key_check").length,
};
db.close();

console.log(JSON.stringify({ ...plan, verification }, null, 2));
