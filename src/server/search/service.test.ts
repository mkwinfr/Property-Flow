import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "../db/database.js";
import { searchProperty } from "./service.js";

let database: Database.Database | undefined;
afterEach(() => database?.close());

describe("global property search", () => {
  it("returns only result types covered by the caller's permissions", () => {
    database = openDatabase(":memory:");
    const unit = database.prepare("SELECT property_id, unit_number FROM units LIMIT 1").get() as { property_id: string; unit_number: string };
    const results = searchProperty(unit.property_id, unit.unit_number, new Set(["units:view"]), database);
    expect(results.some((result) => result.type === "unit" && result.title.includes(unit.unit_number))).toBe(true);
    expect(results.some((result) => result.type !== "unit")).toBe(false);
  });

  it("does not search until a useful query is supplied", () => {
    database = openDatabase(":memory:");
    const property = database.prepare("SELECT id FROM properties LIMIT 1").get() as { id: string };
    expect(searchProperty(property.id, "a", new Set(["units:view"]), database)).toEqual([]);
  });

  it("runs every permitted record search without exposing financial fields", () => {
    database = openDatabase(":memory:");
    const property = database.prepare("SELECT id FROM properties LIMIT 1").get() as { id: string };
    const results = searchProperty(property.id, "zz", new Set(["units:view", "turns:view", "workorders:view", "inspections:view", "vendors:view", "inventory:view", "templates:view"]), database);
    expect(results.every((result) => !/\$|invoice|charge/i.test(`${result.title} ${result.subtitle}`))).toBe(true);
  });
});
