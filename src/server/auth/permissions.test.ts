import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/database.js";
import { seedDevelopmentData } from "../db/seed.js";
import { seedOperationsData } from "../db/seedOperations.js";
import { listWorkOrders } from "../operations/service.js";
import { hideTurnFinancials, getTurn } from "../turns/service.js";
import { recordTurnItemMaterialUsage } from "../turns/materialService.js";

describe("financial permissions", () => {
  it("hides work-order financial fields unless explicitly included", () => {
    const database = openDatabase(":memory:");
    seedDevelopmentData(database);
    seedOperationsData(database);
    database.prepare("UPDATE work_order_details SET vendor_cost = 125, resident_charge_estimate = 75 WHERE work_order_id = 'wo-1'").run();

    const redacted = listWorkOrders("prop-demo", false, database);
    const visible = listWorkOrders("prop-demo", true, database);
    const sample = redacted.find((item) => item.id === "wo-1");
    expect(sample?.vendorCost).toBeNull();
    expect(visible.find((item) => item.id === "wo-1")).toMatchObject({ vendorCost: 125, residentChargeEstimate: 75 });
  });

  it("redacts make-ready financial detail for technician views", () => {
    const database = openDatabase(":memory:");
    seedDevelopmentData(database);
    seedOperationsData(database);
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
    const technicianTurn = hideTurnFinancials(managerTurn);
    expect(managerTurn.costSummary).not.toBeNull();
    expect(technicianTurn.costSummary).toBeNull();
    expect(technicianTurn.vendorJobs.every((job) => job.invoiceAmount === null && job.quoteAmount === null)).toBe(true);
    expect(technicianTurn.items.every((entry) => entry.materialCost === null)).toBe(true);
  });
});
