import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type {
  AdminPropertyStructure,
  AdminPropertySummary,
  AdminUnitRecord,
  AdminUnitUpdateInput,
  PropertyOnboardingInput,
} from "../../shared/contracts.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";

const normalized = (value: string) => value.trim().toLocaleLowerCase();
const reviewFloorPlanName = "UNASSIGNED - REVIEW REQUIRED";
const reviewNotePrefix = "MIGRATION REVIEW REQUIRED:";

export function listAdminProperties(database: Database.Database): AdminPropertySummary[] {
  return database.prepare(
    `SELECT p.id, p.name, p.code, p.address_line_1 AS addressLine1,
            p.address_line_1 || ', ' || p.city || ', ' || p.state || ' ' || p.postal_code AS address,
            p.city, p.state, p.postal_code AS postalCode, p.timezone, p.created_at AS createdAt,
            (SELECT COUNT(*) FROM buildings b WHERE b.property_id = p.id) AS buildingCount,
            (SELECT COUNT(*) FROM floor_plans fp WHERE fp.property_id = p.id) AS floorPlanCount,
            (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id) AS unitCount,
            (SELECT COUNT(*) FROM units u JOIN floor_plans fp ON fp.id = u.floor_plan_id
             WHERE u.property_id = p.id
               AND (u.notes LIKE 'MIGRATION REVIEW REQUIRED:%' OR fp.name = 'UNASSIGNED - REVIEW REQUIRED')) AS reviewUnitCount,
            (SELECT COUNT(DISTINCT ra.user_id) FROM role_assignments ra
             WHERE ra.property_id = p.id OR ra.property_id IS NULL) AS staffCount
     FROM properties p
     ORDER BY p.name`,
  ).all() as AdminPropertySummary[];
}

export function getAdminPropertyStructure(
  propertyId: string,
  database: Database.Database,
): AdminPropertyStructure {
  const property = database.prepare(
    "SELECT id, name, code FROM properties WHERE id = ?",
  ).get(propertyId) as AdminPropertyStructure["property"] | undefined;
  if (!property) throw notFound("Property not found");

  const buildings = database.prepare(
    "SELECT id, name FROM buildings WHERE property_id = ? ORDER BY sort_order, name",
  ).all(propertyId) as AdminPropertyStructure["buildings"];
  const floorPlans = database.prepare(
    `SELECT id, name, bedrooms, bathrooms, square_feet AS squareFeet,
            CASE WHEN name = ? THEN 1 ELSE 0 END AS reviewPlaceholder
     FROM floor_plans WHERE property_id = ? ORDER BY reviewPlaceholder, name`,
  ).all(reviewFloorPlanName, propertyId).map((floorPlan) => ({
    ...(floorPlan as Omit<AdminPropertyStructure["floorPlans"][number], "reviewPlaceholder"> & { reviewPlaceholder: number }),
    reviewPlaceholder: Boolean((floorPlan as { reviewPlaceholder: number }).reviewPlaceholder),
  }));
  const reviewUnits = database.prepare(
    `SELECT u.id, u.property_id AS propertyId, u.unit_number AS unitNumber,
            u.building_id AS buildingId, b.name AS buildingName,
            u.floor_plan_id AS floorPlanId, fp.name AS floorPlanName,
            u.floor, u.occupancy_status AS occupancyStatus, u.notes,
            1 AS reviewRequired, u.updated_at AS updatedAt
     FROM units u
     JOIN buildings b ON b.id = u.building_id
     JOIN floor_plans fp ON fp.id = u.floor_plan_id
     WHERE u.property_id = ?
       AND (u.notes LIKE 'MIGRATION REVIEW REQUIRED:%' OR fp.name = ?)
     ORDER BY CAST(u.unit_number AS INTEGER), u.unit_number`,
  ).all(propertyId, reviewFloorPlanName).map((unit) => ({
    ...(unit as Omit<AdminUnitRecord, "reviewRequired"> & { reviewRequired: number }),
    reviewRequired: true,
  }));

  return { property, buildings, floorPlans, reviewUnits };
}

export function updateAdminUnit(
  propertyId: string,
  unitId: string,
  input: AdminUnitUpdateInput,
  actorUserId: string,
  database: Database.Database,
): AdminUnitRecord {
  const unit = database.prepare(
    `SELECT u.*, fp.name AS floor_plan_name
     FROM units u JOIN floor_plans fp ON fp.id = u.floor_plan_id
     WHERE u.id = ? AND u.property_id = ?`,
  ).get(unitId, propertyId) as Record<string, unknown> | undefined;
  if (!unit) throw notFound("Unit not found at this property");

  const floorPlan = database.prepare(
    "SELECT id, name FROM floor_plans WHERE id = ? AND property_id = ?",
  ).get(input.floorPlanId, propertyId) as { id: string; name: string } | undefined;
  if (!floorPlan) throw badRequest("Floor plan does not belong to this property");
  if (input.resolveReview && floorPlan.name === reviewFloorPlanName) {
    throw badRequest("Choose a completed floor plan before resolving this unit");
  }

  let notes = input.notes?.trim() || null;
  if (input.resolveReview && notes?.startsWith(reviewNotePrefix)) {
    notes = notes.replace(/^MIGRATION REVIEW REQUIRED:[^.]*\.\s*/, "").trim() || null;
  }
  const timestamp = new Date().toISOString();
  database.transaction(() => {
    database.prepare(
      `UPDATE units SET floor_plan_id = ?, floor = ?, occupancy_status = ?, notes = ?, updated_at = ?
       WHERE id = ? AND property_id = ?`,
    ).run(input.floorPlanId, input.floor, input.occupancyStatus, notes, timestamp, unitId, propertyId);
    database.prepare(
      `INSERT INTO activity_events
       (id, property_id, actor_user_id, entity_type, entity_id, action, details_json, created_at)
       VALUES (?, ?, ?, 'unit', ?, 'unit.administration_updated', ?, ?)`,
    ).run(
      randomUUID(), propertyId, actorUserId, unitId,
      JSON.stringify({
        previous: {
          floorPlanId: unit.floor_plan_id,
          floor: unit.floor,
          occupancyStatus: unit.occupancy_status,
          notes: unit.notes,
        },
        next: { ...input, notes },
      }),
      timestamp,
    );
  })();

  const updated = database.prepare(
    `SELECT u.id, u.property_id AS propertyId, u.unit_number AS unitNumber,
            u.building_id AS buildingId, b.name AS buildingName,
            u.floor_plan_id AS floorPlanId, fp.name AS floorPlanName,
            u.floor, u.occupancy_status AS occupancyStatus, u.notes,
            CASE WHEN u.notes LIKE 'MIGRATION REVIEW REQUIRED:%' OR fp.name = ? THEN 1 ELSE 0 END AS reviewRequired,
            u.updated_at AS updatedAt
     FROM units u JOIN buildings b ON b.id = u.building_id JOIN floor_plans fp ON fp.id = u.floor_plan_id
     WHERE u.id = ? AND u.property_id = ?`,
  ).get(reviewFloorPlanName, unitId, propertyId) as Omit<AdminUnitRecord, "reviewRequired"> & { reviewRequired: number };
  return { ...updated, reviewRequired: Boolean(updated.reviewRequired) };
}

export function onboardProperty(
  input: PropertyOnboardingInput,
  actorUserId: string,
  database: Database.Database,
): AdminPropertySummary {
  const buildingNames = new Set<string>();
  for (const building of input.buildings) {
    const key = normalized(building.name);
    if (buildingNames.has(key)) throw badRequest(`Building name is duplicated: ${building.name}`);
    buildingNames.add(key);
  }

  const floorPlanNames = new Set<string>();
  for (const floorPlan of input.floorPlans) {
    const key = normalized(floorPlan.name);
    if (floorPlanNames.has(key)) throw badRequest(`Floor plan name is duplicated: ${floorPlan.name}`);
    floorPlanNames.add(key);
  }

  const unitNumbers = new Set<string>();
  for (const unit of input.units) {
    const unitKey = normalized(unit.unitNumber);
    if (unitNumbers.has(unitKey)) throw badRequest(`Unit number is duplicated: ${unit.unitNumber}`);
    unitNumbers.add(unitKey);
    if (!buildingNames.has(normalized(unit.buildingName))) {
      throw badRequest(`Unit ${unit.unitNumber} references unknown building: ${unit.buildingName}`);
    }
    if (!floorPlanNames.has(normalized(unit.floorPlanName))) {
      throw badRequest(`Unit ${unit.unitNumber} references unknown floor plan: ${unit.floorPlanName}`);
    }
  }

  const existing = database.prepare("SELECT id FROM properties WHERE code = ? COLLATE NOCASE").get(input.code);
  if (existing) throw conflict(`Property code ${input.code} is already in use`);

  const propertyId = randomUUID();
  const timestamp = new Date().toISOString();
  database.transaction(() => {
    database.prepare(
      `INSERT INTO properties
       (id, name, code, address_line_1, city, state, postal_code, timezone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      propertyId,
      input.name,
      input.code,
      input.addressLine1,
      input.city,
      input.state,
      input.postalCode,
      input.timezone,
      timestamp,
      timestamp,
    );

    const buildingIds = new Map<string, string>();
    const insertBuilding = database.prepare(
      "INSERT INTO buildings (id, property_id, name, sort_order) VALUES (?, ?, ?, ?)",
    );
    input.buildings.forEach((building, index) => {
      const id = randomUUID();
      buildingIds.set(normalized(building.name), id);
      insertBuilding.run(id, propertyId, building.name, index);
    });

    const floorPlanIds = new Map<string, string>();
    const insertFloorPlan = database.prepare(
      `INSERT INTO floor_plans
       (id, property_id, name, bedrooms, bathrooms, square_feet) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    input.floorPlans.forEach((floorPlan) => {
      const id = randomUUID();
      floorPlanIds.set(normalized(floorPlan.name), id);
      insertFloorPlan.run(
        id,
        propertyId,
        floorPlan.name,
        floorPlan.bedrooms,
        floorPlan.bathrooms,
        floorPlan.squareFeet,
      );
    });

    const insertUnit = database.prepare(
      `INSERT INTO units
       (id, property_id, building_id, floor_plan_id, unit_number, floor, occupancy_status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    );
    for (const unit of input.units) {
      insertUnit.run(
        randomUUID(),
        propertyId,
        buildingIds.get(normalized(unit.buildingName)),
        floorPlanIds.get(normalized(unit.floorPlanName)),
        unit.unitNumber,
        unit.floor,
        unit.occupancyStatus,
        timestamp,
        timestamp,
      );
    }

    const baselineTemplates = database.prepare(
      `SELECT tt.id, tt.name, tt.description, tt.match_bedrooms, tt.match_bathrooms, tv.id AS version_id
       FROM turn_templates tt
       JOIN turn_template_versions tv ON tv.id = (
         SELECT tv2.id FROM turn_template_versions tv2 WHERE tv2.template_id = tt.id ORDER BY tv2.version DESC LIMIT 1)
       WHERE tt.property_id = 'prop-demo' AND tt.status = 'active'`,
    ).all() as Array<{ id: string; name: string; description: string; match_bedrooms: number | null; match_bathrooms: number | null; version_id: string }>;
    const baselineItems = database.prepare(
      `SELECT item_key, area, category, title, sort_order, is_required, photo_recommended
       FROM turn_template_items WHERE template_version_id = ? ORDER BY sort_order`,
    );
    const insertTemplate = database.prepare(
      `INSERT INTO turn_templates
       (id, property_id, name, description, match_bedrooms, match_bathrooms, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    );
    const insertVersion = database.prepare(
      `INSERT INTO turn_template_versions (id, template_id, version, published_at, published_by_user_id)
       VALUES (?, ?, 1, ?, ?)`,
    );
    const insertScopeItem = database.prepare(
      `INSERT INTO turn_template_items
       (id, template_version_id, item_key, area, category, title, sort_order, is_required, photo_recommended)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const baseline of baselineTemplates) {
      const templateId = randomUUID();
      const versionId = randomUUID();
      insertTemplate.run(templateId, propertyId, baseline.name, baseline.description, baseline.match_bedrooms,
        baseline.match_bathrooms, timestamp, timestamp);
      insertVersion.run(versionId, templateId, timestamp, actorUserId);
      const items = baselineItems.all(baseline.version_id) as Array<{
        item_key: string; area: string; category: string; title: string; sort_order: number;
        is_required: number; photo_recommended: number;
      }>;
      for (const item of items) {
        insertScopeItem.run(randomUUID(), versionId, item.item_key, item.area, item.category, item.title,
          item.sort_order, item.is_required, item.photo_recommended);
      }
    }

    database.prepare(
      `INSERT INTO activity_events
       (id, property_id, actor_user_id, entity_type, entity_id, action, details_json, created_at)
       VALUES (?, ?, ?, 'property', ?, 'property.onboarded', ?, ?)`,
    ).run(
      randomUUID(),
      propertyId,
      actorUserId,
      propertyId,
      JSON.stringify({
        buildings: input.buildings.length,
        floorPlans: input.floorPlans.length,
        units: input.units.length,
        scopeTemplates: baselineTemplates.length,
      }),
      timestamp,
    );
  })();

  return listAdminProperties(database).find((property) => property.id === propertyId)!;
}
