import type Database from "better-sqlite3";
import { moveOutInspectionTemplate } from "../inspections/template.js";

const operationalPermissions = [
  ["inspections:view", "View inspections", "View move-out inspections and findings"],
  ["inspections:manage", "Manage inspections", "Create, assess, complete, and convert inspections"],
  ["inventory:view", "View inventory", "View stock levels, costs, and usage"],
  ["inventory:manage", "Manage inventory", "Adjust inventory and record usage"],
  ["vendors:view", "View vendors", "View vendor contacts and jobs"],
  ["vendors:manage", "Manage vendors", "Manage vendors, jobs, and invoices"],
] as const;

export function seedOperationsData(db: Database.Database): void {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'work_orders'").get();
  if (!table) return;

  db.transaction(() => {
    const timestamp = new Date().toISOString();
    const dateOffset = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date.toISOString().slice(0, 10);
    };

    const insertPermission = db.prepare(
      "INSERT OR IGNORE INTO permissions (key, label, description) VALUES (?, ?, ?)",
    );
    for (const permission of operationalPermissions) insertPermission.run(...permission);
    const addPermission = db.prepare(
      "INSERT OR IGNORE INTO role_permissions (role_id, permission_key) VALUES (?, ?)",
    );
    for (const [key] of operationalPermissions) addPermission.run("role-manager", key);
    for (const key of ["inspections:view", "inspections:manage", "inventory:view", "inventory:manage", "vendors:view"]) {
      addPermission.run("role-tech", key);
    }
    addPermission.run("role-leasing", "inspections:view");
    addPermission.run("role-leasing", "inspections:manage");

    const existing = db.prepare("SELECT COUNT(*) AS count FROM work_orders").get() as { count: number };
    if (existing.count > 0) return;

    const insertWorkOrder = db.prepare(
      `INSERT INTO work_orders
       (id, property_id, unit_id, turn_id, title, description, category, status, priority,
        requested_by, assigned_to_user_id, due_date, created_by_user_id, created_at, updated_at)
       VALUES (?, 'prop-demo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user-manager', ?, ?)`,
    );
    insertWorkOrder.run("wo-1", "unit-103", null, "Leaking kitchen faucet", "Slow leak at the handle and base.", "Plumbing", "assigned", "high", "Resident", "user-tech", dateOffset(1), timestamp, timestamp);
    insertWorkOrder.run("wo-2", "unit-202", "turn-202", "Replace damaged bedroom blind", "Linked to current make-ready scope.", "Carpentry", "in_progress", "normal", "Turn inspection", "user-tech", dateOffset(2), timestamp, timestamp);
    insertWorkOrder.run("wo-3", "unit-301", null, "No cooling", "Thermostat set to 72; unit temperature reported at 81.", "HVAC", "open", "emergency", "Resident", null, dateOffset(0), timestamp, timestamp);
    insertWorkOrder.run("wo-4", "unit-101", null, "Garbage disposal jammed", null, "Appliances", "complete", "normal", "Resident", "user-tech", dateOffset(-3), timestamp, timestamp);
    db.prepare("UPDATE work_orders SET completed_at = ?, status = 'complete' WHERE id = 'wo-4'").run(dateOffset(-4));
    db.prepare(
      `INSERT OR IGNORE INTO work_order_details (work_order_id, received_by_user_id, updated_at)
       SELECT id, created_by_user_id, updated_at FROM work_orders`,
    ).run();

    const insertAppliance = db.prepare(
      `INSERT INTO appliances
       (id, unit_id, type, brand, model, serial_number, install_date, installer, warranty_expiry, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const appliances = [
      ["appl-1", "unit-101", "Refrigerator", "Whirlpool", "WRT318FZDM", "VRF-101-8842", dateOffset(-720), "Metro Appliance", dateOffset(375), "Top-freezer, stainless"],
      ["appl-2", "unit-101", "Dishwasher", "GE", "GDF535PSR", "DW-101-2291", dateOffset(-540), "Maintenance team", dateOffset(190), null],
      ["appl-3", "unit-202", "Range", "Frigidaire", "FCFE3083AS", "RG-202-1093", dateOffset(-310), "Metro Appliance", dateOffset(420), "Inspected during turn"],
      ["appl-4", "unit-302", "Refrigerator", "GE", "GTS19KYNRFS", "RF-302-7712", dateOffset(-1600), null, dateOffset(-500), "Monitor compressor noise"],
    ] as const;
    for (const appliance of appliances) insertAppliance.run(...appliance, timestamp, timestamp);

    const insertInventory = db.prepare(
      `INSERT INTO inventory_items
       (id, property_id, sku, name, category, quantity_on_hand, reorder_level, unit_cost, supplier, updated_at)
       VALUES (?, 'prop-demo', ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const inventory = [
      ["inv-1", "PLB-AER-01", "Faucet aerator 1.5 GPM", "Plumbing", 18, 8, 4.25, "HD Supply"],
      ["inv-2", "ELE-SMK-10", "10-year smoke alarm", "Life safety", 5, 6, 22.5, "Grainger"],
      ["inv-3", "HVAC-FLT-20", "20×20×1 air filter", "HVAC", 24, 12, 6.4, "Ferguson"],
      ["inv-4", "PNT-WHT-GAL", "Interior eggshell white · gallon", "Paint", 7, 5, 28.0, "Sherwin-Williams"],
      ["inv-5", "HRD-BLD-36", "36-inch faux wood blind", "Carpentry", 2, 4, 31.75, "HD Supply"],
      ["inv-6", "CLN-TURN-KIT", "Turn cleaning supply kit", "Cleaning", 11, 5, 14.2, "Local supplier"],
    ] as const;
    for (const item of inventory) insertInventory.run(...item, timestamp);

    const insertVendor = db.prepare(
      `INSERT INTO vendors
       (id, property_id, name, contact_name, phone, email, specialties_json, status, rating, notes, created_at, updated_at)
       VALUES (?, 'prop-demo', ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
    );
    insertVendor.run("vendor-1", "Metro Appliance Service", "Luis Mendoza", "512-555-0164", "dispatch@metroappliance.local", JSON.stringify(["Appliances", "Warranty"]), 4.8, "Preferred for warranty diagnostics", timestamp, timestamp);
    insertVendor.run("vendor-2", "Cedar Paint Co.", "Nina Patel", "512-555-0182", "scheduling@cedarpaint.local", JSON.stringify(["Paint", "Drywall"]), 4.6, null, timestamp, timestamp);
    insertVendor.run("vendor-3", "BlueLine Plumbing", "Owen Brooks", "512-555-0141", "service@blueline.local", JSON.stringify(["Plumbing", "Water heaters"]), 4.7, null, timestamp, timestamp);
    db.prepare(
      `INSERT INTO vendor_jobs
       (id, vendor_id, work_order_id, unit_id, status, scope, scheduled_date, created_at, updated_at)
       VALUES ('vjob-1', 'vendor-3', 'wo-1', 'unit-103', 'scheduled', 'Diagnose and repair kitchen faucet leak', ?, ?, ?)`,
    ).run(dateOffset(1), timestamp, timestamp);

    const insertInspection = db.prepare(
      `INSERT INTO move_out_inspections
       (id, property_id, unit_id, type, status, inspection_date, inspector_user_id, notes, created_at, updated_at)
       VALUES (?, 'prop-demo', ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insertInspection.run("inspection-203", "unit-203", "pre_move_out", "draft", dateOffset(3), "user-manager", "Resident requested a pre-move-out walkthrough.", timestamp, timestamp);
    insertInspection.run("inspection-304", "unit-304", "final", "complete", dateOffset(-2), "user-tech", "Keys returned at office.", timestamp, timestamp);

    const insertInspectionItem = db.prepare(
      `INSERT INTO inspection_items
       (id, inspection_id, template_key, room, category, label, condition, responsibility,
        notes, cost_estimate, severity, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const inspectionId of ["inspection-203", "inspection-304"]) {
      moveOutInspectionTemplate.forEach((item, index) => {
        const finished = inspectionId === "inspection-304";
        const damage = finished && [1, 8].includes(index);
        insertInspectionItem.run(
          `${inspectionId}-item-${index + 1}`,
          inspectionId,
          item[0],
          item[1],
          item[2],
          item[3],
          damage ? "damage" : finished ? "good" : index < 3 ? "good" : "not_inspected",
          damage ? "resident" : "owner",
          damage ? (index === 1 ? "Two large anchor holes and marker staining." : "Closet door off track.") : null,
          damage ? (index === 1 ? 185 : 90) : null,
          damage ? 3 : null,
          index,
          timestamp,
        );
      });
    }

    const insertPoolLog = db.prepare(
      `INSERT INTO pool_logs
       (id, property_id, log_date, logged_at, free_chlorine, total_chlorine, ph,
        alkalinity, hardness, cyanuric_acid, water_temp_f, weather_summary, notes,
        created_by_user_id, created_at, updated_at)
       VALUES (?, 'prop-demo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user-tech', ?, ?)`,
    );
    insertPoolLog.run("pool-1", dateOffset(-2), timestamp, 2.5, 2.7, 7.5, 90, 260, 38, 82, "Clear, warm", "Deck and gates inspected.", timestamp, timestamp);
    insertPoolLog.run("pool-2", dateOffset(-1), timestamp, 1.2, 1.5, 7.7, 88, 255, 39, 84, "Partly cloudy", "Added sanitizer after reading.", timestamp, timestamp);
    insertPoolLog.run("pool-3", dateOffset(0), timestamp, 2.1, 2.3, 7.4, 92, 258, 39, 83, "Clear", null, timestamp, timestamp);

    const insertNotification = db.prepare(
      `INSERT INTO notifications
       (id, user_id, type, title, message, entity_type, entity_id, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insertNotification.run("note-1", "user-manager", "turn.review", "Turn ready for review", "Unit 302 has completed all make-ready work.", "turn", "turn-302", null, timestamp);
    insertNotification.run("note-2", "user-manager", "inventory.low", "Inventory below reorder level", "Smoke alarms and 36-inch blinds need restocking.", "inventory", null, null, timestamp);
    insertNotification.run("note-3", "user-tech", "work_order.assigned", "Emergency work order", "No-cooling call for Unit 301 is unassigned.", "work_order", "wo-3", null, timestamp);

    db.prepare(
      "UPDATE turns SET review_round = 1, submitted_for_review_at = updated_at WHERE status = 'ready_for_review' AND review_round = 0",
    ).run();
    db.prepare(
      `UPDATE turn_items SET review_status = 'pending'
       WHERE status = 'complete' AND review_status IS NULL
         AND turn_id IN (SELECT id FROM turns WHERE status = 'ready_for_review')`,
    ).run();
  })();
}
