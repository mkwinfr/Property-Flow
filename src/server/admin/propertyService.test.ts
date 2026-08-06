import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import type { PropertyOnboardingInput } from "../../shared/contracts.js";
import { openDatabase } from "../db/database.js";
import { getAdminPropertyStructure, onboardProperty, updateAdminUnit } from "./propertyService.js";

let database: Database.Database | undefined;
afterEach(() => database?.close());

const input: PropertyOnboardingInput = {
  name: "Oak Terrace",
  code: "OAK",
  addressLine1: "100 Oak Street",
  city: "Austin",
  state: "TX",
  postalCode: "78701",
  timezone: "America/Chicago",
  buildings: [{ name: "North" }, { name: "South" }],
  floorPlans: [
    { name: "A1", bedrooms: 1, bathrooms: 1, squareFeet: 700 },
    { name: "B1", bedrooms: 2, bathrooms: 2, squareFeet: 980 },
  ],
  units: [
    { unitNumber: "101", buildingName: "North", floorPlanName: "A1", floor: 1, occupancyStatus: "vacant" },
    { unitNumber: "201", buildingName: "South", floorPlanName: "B1", floor: 2, occupancyStatus: "occupied" },
  ],
};

describe("property onboarding", () => {
  it("creates the complete property structure and audit event atomically", () => {
    database = openDatabase(":memory:");
    const property = onboardProperty(input, "user-manager", database);

    expect(property.name).toBe("Oak Terrace");
    expect(property.buildingCount).toBe(2);
    expect(property.floorPlanCount).toBe(2);
    expect(property.unitCount).toBe(2);
    const audit = database.prepare(
      "SELECT action, details_json FROM activity_events WHERE property_id = ? AND entity_type = 'property'",
    ).get(property.id) as { action: string; details_json: string };
    expect(audit.action).toBe("property.onboarded");
    expect(JSON.parse(audit.details_json)).toEqual({ buildings: 2, floorPlans: 2, units: 2, scopeTemplates: 3 });
  });

  it("rejects invalid structure references without creating partial records", () => {
    database = openDatabase(":memory:");
    const before = database.prepare("SELECT COUNT(*) AS count FROM properties").get() as { count: number };
    const invalid = {
      ...input,
      code: "BAD",
      units: [{ ...input.units[0]!, buildingName: "Missing building" }],
    };

    expect(() => onboardProperty(invalid, "user-manager", database!)).toThrow("unknown building");
    const after = database.prepare("SELECT COUNT(*) AS count FROM properties").get() as { count: number };
    expect(after.count).toBe(before.count);
  });

  it("gives the primary manager global property administration access", () => {
    database = openDatabase(":memory:");
    const access = database.prepare(
      `SELECT ra.property_id AS propertyId
       FROM role_assignments ra
       JOIN role_permissions rp ON rp.role_id = ra.role_id
       WHERE ra.user_id = 'user-manager' AND rp.permission_key = 'properties:manage'`,
    ).get() as { propertyId: string | null };
    expect(access.propertyId).toBeNull();
  });

  it("lists flagged units and resolves one with a property-scoped, audited update", () => {
    database = openDatabase(":memory:");
    const property = onboardProperty(input, "user-manager", database);
    const unit = database.prepare(
      "SELECT id FROM units WHERE property_id = ? AND unit_number = '101'",
    ).get(property.id) as { id: string };
    const reviewFloorPlanId = "fp-review";
    database.prepare(
      `INSERT INTO floor_plans (id, property_id, name, bedrooms, bathrooms, square_feet)
       VALUES (?, ?, 'UNASSIGNED - REVIEW REQUIRED', 0, 0, 0)`,
    ).run(reviewFloorPlanId, property.id);
    database.prepare(
      `UPDATE units SET floor_plan_id = ?, notes = ? WHERE id = ?`,
    ).run(
      reviewFloorPlanId,
      "MIGRATION REVIEW REQUIRED: Legacy Property Flow unit had no floor-plan or rent assignment.",
      unit.id,
    );

    const structure = getAdminPropertyStructure(property.id, database);
    expect(structure.reviewUnits).toHaveLength(1);
    expect(structure.reviewUnits[0]?.unitNumber).toBe("101");
    const completedFloorPlan = structure.floorPlans.find((plan) => plan.name === "A1")!;

    const updated = updateAdminUnit(property.id, unit.id, {
      floorPlanId: completedFloorPlan.id,
      floor: 1,
      occupancyStatus: "occupied",
      notes: "Confirmed against the rent roll.",
      resolveReview: true,
    }, "user-manager", database);

    expect(updated.reviewRequired).toBe(false);
    expect(updated.floorPlanName).toBe("A1");
    expect(getAdminPropertyStructure(property.id, database).reviewUnits).toHaveLength(0);
    const event = database.prepare(
      "SELECT action FROM activity_events WHERE entity_id = ? ORDER BY created_at DESC LIMIT 1",
    ).get(unit.id) as { action: string };
    expect(event.action).toBe("unit.administration_updated");
  });

  it("does not resolve a unit into the review placeholder", () => {
    database = openDatabase(":memory:");
    const property = onboardProperty(input, "user-manager", database);
    const unit = database.prepare("SELECT id FROM units WHERE property_id = ? LIMIT 1").get(property.id) as { id: string };
    database.prepare(
      `INSERT INTO floor_plans (id, property_id, name, bedrooms, bathrooms, square_feet)
       VALUES ('fp-review', ?, 'UNASSIGNED - REVIEW REQUIRED', 0, 0, 0)`,
    ).run(property.id);

    expect(() => updateAdminUnit(property.id, unit.id, {
      floorPlanId: "fp-review",
      floor: null,
      occupancyStatus: "occupied",
      notes: null,
      resolveReview: true,
    }, "user-manager", database!)).toThrow("Choose a completed floor plan");
  });
});
