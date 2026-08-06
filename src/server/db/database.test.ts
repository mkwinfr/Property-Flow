import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "./database.js";
import { seedDevelopmentData } from "./seed.js";
import { seedOperationsData } from "./seedOperations.js";

let database: Database.Database | undefined;
afterEach(() => database?.close());

describe("local database bootstrap", () => {
  it("applies migrations and creates published template versions once", () => {
    database = openDatabase(":memory:");
    const initial = database
      .prepare("SELECT COUNT(*) AS count FROM turn_template_versions")
      .get() as { count: number };
    const users = database.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };

    seedDevelopmentData(database);
    const afterSecondSeed = database
      .prepare("SELECT COUNT(*) AS count FROM turn_template_versions")
      .get() as { count: number };

    expect(initial.count).toBe(3);
    expect(users.count).toBe(3);
    expect(afterSecondSeed.count).toBe(initial.count);
  });

  it("keeps turn items as snapshots linked to a published version", () => {
    database = openDatabase(":memory:");
    const result = database
      .prepare(
        `SELECT COUNT(*) AS items,
                COUNT(DISTINCT t.template_version_id) AS versions
         FROM turns t JOIN turn_items ti ON ti.turn_id = t.id`,
      )
      .get() as { items: number; versions: number };

    expect(result.items).toBeGreaterThan(30);
    expect(result.versions).toBe(1);
  });

  it("applies the operational-domain migration and seed idempotently", () => {
    database = openDatabase(":memory:");
    const migration = database.prepare("SELECT name FROM schema_migrations WHERE version = 2").get() as { name: string };
    const before = database.prepare("SELECT COUNT(*) AS count FROM work_orders").get() as { count: number };

    seedOperationsData(database);
    const after = database.prepare("SELECT COUNT(*) AS count FROM work_orders").get() as { count: number };
    const permissions = database.prepare("SELECT COUNT(*) AS count FROM permissions WHERE key IN ('inspections:manage', 'inventory:manage', 'vendors:manage')").get() as { count: number };

    expect(migration.name).toBe("operational_domains");
    expect(before.count).toBeGreaterThan(0);
    expect(after.count).toBe(before.count);
    expect(permissions.count).toBe(3);
  });

  it("creates each move-out inspection from the centralized checklist", () => {
    database = openDatabase(":memory:");
    const inspections = database.prepare(
      `SELECT mi.id, COUNT(ii.id) AS itemCount
       FROM move_out_inspections mi
       LEFT JOIN inspection_items ii ON ii.inspection_id = mi.id
       GROUP BY mi.id`,
    ).all() as Array<{ id: string; itemCount: number }>;
    const duplicateKeys = database.prepare(
      `SELECT inspection_id, template_key, COUNT(*) AS count
       FROM inspection_items GROUP BY inspection_id, template_key HAVING COUNT(*) > 1`,
    ).all();

    expect(inspections.length).toBeGreaterThan(0);
    expect(inspections.every((inspection) => inspection.itemCount === 12)).toBe(true);
    expect(duplicateKeys).toHaveLength(0);
  });

  it("preserves operational ownership and non-negative stock constraints", () => {
    database = openDatabase(":memory:");
    const scopedRows = database.prepare(
      `SELECT COUNT(*) AS count FROM work_orders wo
       JOIN units u ON u.id = wo.unit_id
       WHERE wo.property_id != u.property_id`,
    ).get() as { count: number };

    expect(scopedRows.count).toBe(0);
    expect(() => database!.prepare("UPDATE inventory_items SET quantity_on_hand = -1 WHERE id = (SELECT id FROM inventory_items LIMIT 1)").run()).toThrow();
  });

  it("supports one Make Ready lead with item execution and vendor support", () => {
    database = openDatabase(":memory:");
    const migration = database.prepare("SELECT name FROM schema_migrations WHERE version = 7").get() as { name: string };
    const turnColumns = database.prepare("PRAGMA table_info(turns)").all() as Array<{ name: string }>;
    const itemColumns = database.prepare("PRAGMA table_info(turn_items)").all() as Array<{ name: string }>;
    const vendorColumns = database.prepare("PRAGMA table_info(vendor_jobs)").all() as Array<{ name: string }>;

    expect(migration.name).toBe("make_ready_execution_controls");
    expect(turnColumns.some((column) => column.name === "lead_technician_user_id")).toBe(true);
    expect(itemColumns.some((column) => column.name === "blocked_reason")).toBe(true);
    expect(itemColumns.some((column) => column.name === "started_at")).toBe(true);
    expect(vendorColumns.some((column) => column.name === "turn_id")).toBe(true);
  });

  it("retains item-level Make Ready quality review rounds", () => {
    database = openDatabase(":memory:");
    const migration = database.prepare("SELECT name FROM schema_migrations WHERE version = 8").get() as { name: string };
    const reviewTable = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'turn_item_reviews'").get();
    const turnColumns = database.prepare("PRAGMA table_info(turns)").all() as Array<{ name: string }>;
    const itemColumns = database.prepare("PRAGMA table_info(turn_items)").all() as Array<{ name: string }>;

    expect(migration.name).toBe("make_ready_quality_review");
    expect(reviewTable).toBeTruthy();
    expect(turnColumns.some((column) => column.name === "review_round")).toBe(true);
    expect(turnColumns.some((column) => column.name === "approved_by_user_id")).toBe(true);
    expect(itemColumns.some((column) => column.name === "review_status")).toBe(true);
  });

  it("links auditable material corrections to their original scope-item usage", () => {
    database = openDatabase(":memory:");
    const migration = database.prepare("SELECT name FROM schema_migrations WHERE version = 9").get() as { name: string };
    const transactionColumns = database.prepare("PRAGMA table_info(inventory_transactions)").all() as Array<{ name: string }>;
    const indexes = database.prepare("PRAGMA index_list(inventory_transactions)").all() as Array<{ name: string }>;

    expect(migration.name).toBe("turn_item_material_usage");
    expect(transactionColumns.some((column) => column.name === "reverses_transaction_id")).toBe(true);
    expect(indexes.some((index) => index.name === "idx_inventory_transactions_reversal")).toBe(true);
    expect(indexes.some((index) => index.name === "idx_inventory_transactions_turn_item")).toBe(true);
  });

  it("supports Make Ready vendor financials and inventory reorder workflows", () => {
    database = openDatabase(":memory:");
    const migration = database.prepare("SELECT name FROM schema_migrations WHERE version = 10").get() as { name: string };
    const vendorColumns = database.prepare("PRAGMA table_info(vendor_jobs)").all() as Array<{ name: string }>;
    const reorderTable = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'inventory_reorders'").get();
    const reorderIndexes = database.prepare("PRAGMA index_list(inventory_reorders)").all() as Array<{ name: string }>;

    expect(migration.name).toBe("make_ready_financials_and_inventory_reorders");
    expect(vendorColumns.map((column) => column.name)).toEqual(expect.arrayContaining([
      "quote_amount", "approved_amount", "payment_status", "paid_at",
    ]));
    expect(reorderTable).toBeTruthy();
    expect(reorderIndexes.some((index) => index.name === "idx_inventory_reorders_one_active")).toBe(true);
  });

  it("retains auditable Make Ready blocker episodes", () => {
    database = openDatabase(":memory:");
    const migration = database.prepare("SELECT name FROM schema_migrations WHERE version = 11").get() as { name: string };
    const blockerTable = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'turn_item_blockers'").get();
    const indexes = database.prepare("PRAGMA index_list(turn_item_blockers)").all() as Array<{ name: string }>;

    expect(migration.name).toBe("make_ready_blocker_coordination");
    expect(blockerTable).toBeTruthy();
    expect(indexes.some((index) => index.name === "idx_turn_item_blockers_active")).toBe(true);
    expect(indexes.some((index) => index.name === "idx_turn_item_blockers_property_active")).toBe(true);
  });

  it("supports durable template drafts and exact floor-plan assignments", () => {
    database = openDatabase(":memory:");
    const migration = database.prepare("SELECT name FROM schema_migrations WHERE version = 12").get() as { name: string };
    expect(migration.name).toBe("template_center");
    expect(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='turn_template_drafts'").get()).toBeTruthy();
    expect(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='turn_template_floor_plans'").get()).toBeTruthy();
  });

  it("supports detailed work-order intake, access, financial, and completion records", () => {
    database = openDatabase(":memory:");
    const migration = database.prepare("SELECT name FROM schema_migrations WHERE version = 13").get() as { name: string };
    const columns = database.prepare("PRAGMA table_info(work_order_details)").all() as Array<{ name: string }>;
    const details = database.prepare("SELECT COUNT(*) AS count FROM work_order_details").get() as { count: number };
    const workOrders = database.prepare("SELECT COUNT(*) AS count FROM work_orders").get() as { count: number };
    expect(migration.name).toBe("detailed_work_orders");
    expect(columns.map((column) => column.name)).toEqual(expect.arrayContaining(["areas_json", "permission_to_enter", "vendor_cost", "completion_notes", "deleted_at"]));
    expect(details.count).toBe(workOrders.count);
  });
});
