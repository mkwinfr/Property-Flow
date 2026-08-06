import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "../db/database.js";
import { recordTurnItemMaterialUsage } from "./materialService.js";
import { getTurn, hideTurnFinancials, listMyWork, listTeamWorkload, listTurnBlockers, resolveTurnBlocker, updateTurnItem } from "./service.js";

let database: Database.Database | null = null;
afterEach(() => { database?.close(); database = null; });

describe("technician My Work", () => {
  it("returns only active assignments with operational exception counts", () => {
    database = openDatabase(":memory:");
    database.prepare("UPDATE turns SET lead_technician_user_id = 'user-tech' WHERE id = 'turn-202'").run();
    const items = database.prepare("SELECT id FROM turn_items WHERE turn_id = 'turn-202' ORDER BY sort_order LIMIT 3").all() as Array<{ id: string }>;
    database.prepare("UPDATE turn_items SET status = 'blocked', blocked_reason = 'Waiting on part' WHERE id = ?").run(items[0]!.id);
    database.prepare("UPDATE turn_items SET status = 'in_progress' WHERE id = ?").run(items[1]!.id);
    database.prepare("UPDATE turn_items SET review_status = 'rework' WHERE id = ?").run(items[2]!.id);

    const assigned = listMyWork("prop-demo", "user-tech", database);
    expect(assigned).toHaveLength(1);
    expect(assigned[0]).toMatchObject({ id: "turn-202", blockedItems: 1, inProgressItems: 2, reworkItems: 1 });
    expect(listMyWork("prop-demo", "user-leasing", database)).toHaveLength(0);

    const workload = listTeamWorkload("prop-demo", database);
    expect(workload.find((member) => member.userId === "user-tech")).toMatchObject({ activeTurns: 1, blockedItems: 1 });
    expect(workload.find((member) => member.userId === "unassigned")?.activeTurns).toBe(2);
  });

  it("removes financial values from technician turn responses", () => {
    database = openDatabase(":memory:");
    const item = database.prepare("SELECT id FROM turn_items WHERE turn_id = 'turn-202' AND status != 'not_applicable' LIMIT 1").get() as { id: string };
    recordTurnItemMaterialUsage("turn-202", item.id, "inv-1", 2, "user-tech", database);
    database.prepare(
      `INSERT INTO vendor_jobs
       (id, vendor_id, unit_id, status, scope, invoice_amount, invoice_number, created_at, updated_at,
        turn_id, quote_amount, approved_amount, payment_status)
       VALUES ('vjob-financial-test', 'vendor-2', 'unit-202', 'scheduled', 'Paint unit', 825, 'INV-825',
        datetime('now'), datetime('now'), 'turn-202', 900, 850, 'approved')`,
    ).run();

    const managerTurn = getTurn("turn-202", database);
    expect(managerTurn.costSummary?.grossCost).toBe(833.5);
    expect(managerTurn.vendorJobs[0]?.invoiceAmount).toBe(825);
    expect(managerTurn.items.find((entry) => entry.id === item.id)?.materialCost).toBe(8.5);

    const technicianTurn = hideTurnFinancials(managerTurn);
    expect(technicianTurn.costSummary).toBeNull();
    expect(technicianTurn.vendorJobs[0]).toMatchObject({ quoteAmount: null, approvedAmount: null, invoiceAmount: null, invoiceNumber: null, paymentStatus: null });
    expect(technicianTurn.items.find((entry) => entry.id === item.id)?.materialCost).toBeNull();
    expect(technicianTurn.items.find((entry) => entry.id === item.id)?.materials[0]).toMatchObject({ unitCost: null, totalCost: null });
  });

  it("escalates structured blockers to managers and retains their resolution history", () => {
    database = openDatabase(":memory:");
    database.prepare("UPDATE turns SET lead_technician_user_id = 'user-tech' WHERE id = 'turn-202'").run();
    const item = database.prepare(
      "SELECT id FROM turn_items WHERE turn_id = 'turn-202' AND status = 'open' LIMIT 1",
    ).get() as { id: string };

    const blocked = updateTurnItem("turn-202", item.id, "user-tech", {
      status: "blocked",
      blockedReason: "Replacement valve has not arrived",
      blockerCategory: "material",
      responsibleParty: "Purchasing",
      expectedResolutionDate: "2099-01-15",
    }, database);

    expect(blocked.items.find((entry) => entry.id === item.id)?.blocker).toMatchObject({
      category: "material",
      reason: "Replacement valve has not arrived",
      responsibleParty: "Purchasing",
    });
    expect(listTurnBlockers("prop-demo", database)).toEqual([
      expect.objectContaining({ turnId: "turn-202", turnItemId: item.id, unitNumber: "202" }),
    ]);
    expect(database.prepare(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = 'user-manager' AND type = 'turn.blocked'",
    ).get()).toEqual({ count: 1 });

    const resolved = resolveTurnBlocker("turn-202", item.id, "user-manager", "Valve delivered to the shop", database);
    expect(resolved.items.find((entry) => entry.id === item.id)).toMatchObject({ status: "in_progress", blocker: null, blockedReason: null });
    expect(listTurnBlockers("prop-demo", database)).toHaveLength(0);
    expect(database.prepare(
      "SELECT resolved_at AS resolvedAt, resolution_notes AS resolutionNotes FROM turn_item_blockers WHERE turn_item_id = ?",
    ).get(item.id)).toMatchObject({ resolutionNotes: "Valve delivered to the shop", resolvedAt: expect.any(String) });
    expect(database.prepare(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = 'user-tech' AND type = 'turn.blocker.resolved'",
    ).get()).toEqual({ count: 1 });
  });
});
