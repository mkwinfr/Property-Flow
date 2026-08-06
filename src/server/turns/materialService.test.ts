import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "../db/database.js";
import {
  listTurnItemMaterials,
  recordTurnItemMaterialUsage,
  reverseTurnItemMaterialUsage,
} from "./materialService.js";

let database: Database.Database | null = null;
afterEach(() => { database?.close(); database = null; });

describe("Make Ready scope-item material usage", () => {
  it("deducts stock, snapshots cost, and reverses corrections without deleting history", () => {
    database = openDatabase(":memory:");
    const item = database.prepare(
      "SELECT id FROM turn_items WHERE turn_id = 'turn-202' AND status != 'not_applicable' LIMIT 1",
    ).get() as { id: string };

    recordTurnItemMaterialUsage("turn-202", item.id, "inv-1", 2, "user-tech", database);

    expect((database.prepare("SELECT quantity_on_hand quantity FROM inventory_items WHERE id = 'inv-1'").get() as { quantity: number }).quantity).toBe(16);
    const usage = listTurnItemMaterials("turn-202", database).get(item.id) ?? [];
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({ inventoryItemId: "inv-1", quantity: 2, unitCost: 4.25, totalCost: 8.5 });

    reverseTurnItemMaterialUsage("turn-202", item.id, usage[0]!.id, "user-manager", database);

    expect((database.prepare("SELECT quantity_on_hand quantity FROM inventory_items WHERE id = 'inv-1'").get() as { quantity: number }).quantity).toBe(18);
    expect(listTurnItemMaterials("turn-202", database).get(item.id) ?? []).toHaveLength(0);
    const ledger = database.prepare(
      "SELECT quantity_delta quantityDelta, reverses_transaction_id reversesId FROM inventory_transactions WHERE turn_item_id = ? ORDER BY created_at",
    ).all(item.id) as Array<{ quantityDelta: number; reversesId: string | null }>;
    expect(ledger).toHaveLength(2);
    expect(ledger.map((row) => row.quantityDelta)).toEqual([-2, 2]);
    expect(ledger[1]?.reversesId).toBeTruthy();
  });

  it("rejects unavailable stock and changes outside active work", () => {
    database = openDatabase(":memory:");
    const activeItem = database.prepare(
      "SELECT id FROM turn_items WHERE turn_id = 'turn-202' AND status != 'not_applicable' LIMIT 1",
    ).get() as { id: string };
    const reviewItem = database.prepare(
      "SELECT id FROM turn_items WHERE turn_id = 'turn-302' LIMIT 1",
    ).get() as { id: string };

    expect(() => recordTurnItemMaterialUsage("turn-202", activeItem.id, "inv-1", 100, "user-tech", database!)).toThrow(/on hand/i);
    expect(() => recordTurnItemMaterialUsage("turn-302", reviewItem.id, "inv-1", 1, "user-tech", database!)).toThrow(/in progress/i);
    expect((database.prepare("SELECT quantity_on_hand quantity FROM inventory_items WHERE id = 'inv-1'").get() as { quantity: number }).quantity).toBe(18);
  });
});
