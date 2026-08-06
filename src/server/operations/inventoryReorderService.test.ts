import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "../db/database.js";
import { createInventoryReorder, listInventoryReorders, updateInventoryReorder } from "./service.js";

let database: Database.Database | null = null;
afterEach(() => { database?.close(); database = null; });

describe("inventory reorder lifecycle", () => {
  it("requests, orders, and receives stock through the inventory ledger", () => {
    database = openDatabase(":memory:");
    const requested = createInventoryReorder("prop-demo", "inv-2", "user-manager", 7, "Grainger", database);

    expect(requested).toMatchObject({ inventoryItemId: "inv-2", quantity: 7, status: "requested" });
    expect(() => createInventoryReorder("prop-demo", "inv-2", "user-manager", 2, null, database!)).toThrow(/active reorder/i);

    const ordered = updateInventoryReorder(requested.id, "user-manager", "ordered", database);
    expect(ordered.status).toBe("ordered");
    const received = updateInventoryReorder(requested.id, "user-manager", "received", database);
    expect(received.status).toBe("received");

    const stock = database.prepare("SELECT quantity_on_hand quantity FROM inventory_items WHERE id = 'inv-2'").get() as { quantity: number };
    expect(stock.quantity).toBe(12);
    const ledger = database.prepare(
      "SELECT quantity_delta quantity, reason FROM inventory_transactions WHERE inventory_item_id = 'inv-2'",
    ).all() as Array<{ quantity: number; reason: string }>;
    expect(ledger).toEqual([{ quantity: 7, reason: expect.stringMatching(/received reorder/i) }]);
    expect(() => updateInventoryReorder(requested.id, "user-manager", "cancelled", database!)).toThrow(/cannot move/i);
  });

  it("cancels a request without changing stock", () => {
    database = openDatabase(":memory:");
    const requested = createInventoryReorder("prop-demo", "inv-5", "user-manager", 6, null, database);
    updateInventoryReorder(requested.id, "user-manager", "cancelled", database);

    expect(listInventoryReorders("prop-demo", database).find((row) => row.id === requested.id)?.status).toBe("cancelled");
    expect((database.prepare("SELECT quantity_on_hand quantity FROM inventory_items WHERE id = 'inv-5'").get() as { quantity: number }).quantity).toBe(2);
  });
});
