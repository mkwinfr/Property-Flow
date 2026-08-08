import type Database from "better-sqlite3";
import { hashPassword } from "../lib/passwords.js";

const now = () => new Date().toISOString();

const permissionCatalog = [
  ["dashboard:view", "View dashboard", "View operational property summaries"],
  ["units:view", "View units", "View buildings, floor plans, units, and unit history"],
  ["units:update", "Update units", "Update unit status, notes, and assets"],
  ["turns:view", "View turns", "View make-ready turns and their work"],
  ["turns:create", "Create turns", "Create a make-ready turn for a unit"],
  ["turns:update", "Update turns", "Update turn work, dates, and assignments"],
  ["turns:review", "Review turns", "Approve completed work or request rework"],
  ["turns:delete", "Cancel turns", "Cancel or remove turns according to retention policy"],
  ["templates:view", "View templates", "View published turn templates"],
  ["templates:manage", "Manage templates", "Draft and publish turn template versions"],
  ["users:view", "View users", "View users, roles, and property access"],
  ["users:manage", "Manage users", "Manage identities and scoped role assignments"],
  ["properties:manage", "Manage properties", "Create and configure properties, buildings, floor plans, and units"],
  ["workorders:view", "View work orders", "View maintenance work orders"],
  ["workorders:manage", "Manage work orders", "Create and update maintenance work orders"],
  ["pool:view", "View pool logs", "View pool compliance records"],
  ["pool:manage", "Manage pool logs", "Record and correct pool readings"],
  ["financial:view", "View financials", "View costs, invoices, resident charges, and vendor billing"],
  ["financial:edit", "Edit financials", "Update vendor billing, resident charges, and purchasing approvals"],
  ["purchasing:manage", "Manage purchasing", "Request, approve, and receive inventory reorders"],
] as const;

const managerPermissions = permissionCatalog.map(([key]) => key);
const technicianPermissions = [
  "dashboard:view",
  "units:view",
  "turns:view",
  "turns:update",
  "workorders:view",
  "workorders:manage",
  "pool:view",
  "pool:manage",
];
const leasingPermissions = ["dashboard:view", "units:view", "turns:view", "turns:create"];

export function seedDevelopmentData(db: Database.Database): void {
  const existing = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  if (existing.count > 0) return;

  db.transaction(() => {
    const timestamp = now();
    const propertyId = "prop-demo";

    const insertPermission = db.prepare(
      "INSERT OR IGNORE INTO permissions (key, label, description) VALUES (?, ?, ?)",
    );
    for (const permission of permissionCatalog) insertPermission.run(...permission);

    const roles = [
      ["role-manager", "Property Manager", "Full operational and administrative control"],
      ["role-tech", "Maintenance Technician", "Assigned maintenance and make-ready work"],
      ["role-leasing", "Leasing Specialist", "Unit visibility and turn initiation"],
    ] as const;
    const insertRole = db.prepare("INSERT INTO roles (id, name, description) VALUES (?, ?, ?)");
    for (const role of roles) insertRole.run(...role);

    const insertRolePermission = db.prepare(
      "INSERT INTO role_permissions (role_id, permission_key) VALUES (?, ?)",
    );
    for (const key of managerPermissions) insertRolePermission.run("role-manager", key);
    for (const key of technicianPermissions) insertRolePermission.run("role-tech", key);
    for (const key of leasingPermissions) insertRolePermission.run("role-leasing", key);

    const insertUser = db.prepare(
      `INSERT INTO users (id, name, email, password_hash, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
    );
    const passwordHash = hashPassword("propertysuite");
    insertUser.run("user-manager", "Morgan Reed", "manager@propertysuite.local", passwordHash, timestamp, timestamp);
    insertUser.run("user-tech", "Jamie Torres", "tech@propertysuite.local", passwordHash, timestamp, timestamp);
    insertUser.run("user-leasing", "Avery Chen", "leasing@propertysuite.local", passwordHash, timestamp, timestamp);

    db.prepare(
      `INSERT INTO properties
       (id, name, code, address_line_1, city, state, postal_code, timezone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      propertyId,
      "Juniper Ridge",
      "JNR",
      "1800 Juniper Way",
      "Cedar Park",
      "TX",
      "78613",
      "America/Chicago",
      timestamp,
      timestamp,
    );

    const insertAssignment = db.prepare(
      "INSERT INTO role_assignments (id, user_id, role_id, property_id, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    insertAssignment.run("assignment-manager", "user-manager", "role-manager", null, timestamp);
    insertAssignment.run("assignment-tech", "user-tech", "role-tech", propertyId, timestamp);
    insertAssignment.run("assignment-leasing", "user-leasing", "role-leasing", propertyId, timestamp);

    const insertBuilding = db.prepare(
      "INSERT INTO buildings (id, property_id, name, sort_order) VALUES (?, ?, ?, ?)",
    );
    insertBuilding.run("building-100", propertyId, "Building 100", 1);
    insertBuilding.run("building-200", propertyId, "Building 200", 2);
    insertBuilding.run("building-300", propertyId, "Building 300", 3);

    const plans = [
      ["plan-a1", "A1 · Aspen", 1, 1, 720],
      ["plan-b1", "B1 · Birch", 2, 1, 940],
      ["plan-b2", "B2 · Cypress", 2, 2, 1080],
      ["plan-c1", "C1 · Dogwood", 3, 2, 1280],
    ] as const;
    const insertPlan = db.prepare(
      `INSERT INTO floor_plans (id, property_id, name, bedrooms, bathrooms, square_feet)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const plan of plans) insertPlan.run(plan[0], propertyId, ...plan.slice(1));

    const units = [
      ["unit-101", "building-100", "plan-a1", "101", 1, "occupied"],
      ["unit-102", "building-100", "plan-b1", "102", 1, "notice"],
      ["unit-103", "building-100", "plan-b2", "103", 1, "occupied"],
      ["unit-201", "building-200", "plan-b1", "201", 2, "vacant"],
      ["unit-202", "building-200", "plan-b2", "202", 2, "notice"],
      ["unit-203", "building-200", "plan-c1", "203", 2, "occupied"],
      ["unit-301", "building-300", "plan-a1", "301", 3, "occupied"],
      ["unit-302", "building-300", "plan-b1", "302", 3, "down"],
      ["unit-303", "building-300", "plan-b2", "303", 3, "occupied"],
      ["unit-304", "building-300", "plan-c1", "304", 3, "vacant"],
    ] as const;
    const insertUnit = db.prepare(
      `INSERT INTO units
       (id, property_id, building_id, floor_plan_id, unit_number, floor, occupancy_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const unit of units) insertUnit.run(unit[0], propertyId, ...unit.slice(1), timestamp, timestamp);

    const sharedItems = [
      ["entry-locks", "Entry", "Safety", "Test and rekey entry locks"],
      ["life-safety", "Whole unit", "Safety", "Test smoke and carbon monoxide devices"],
      ["walls-repair", "Whole unit", "Paint", "Patch walls and prepare surfaces"],
      ["walls-paint", "Whole unit", "Paint", "Complete required paint and touch-up"],
      ["floors", "Whole unit", "Flooring", "Inspect and clean flooring"],
      ["kitchen-appliances", "Kitchen", "Appliances", "Clean and function-test appliances"],
      ["kitchen-plumbing", "Kitchen", "Plumbing", "Inspect sink, disposal, and supply lines"],
      ["bath-plumbing", "Bathroom", "Plumbing", "Inspect fixtures, drains, and caulking"],
      ["bath-clean", "Bathroom", "Cleaning", "Deep clean and sanitize bathroom"],
      ["final-clean", "Whole unit", "Cleaning", "Complete final clean"],
      ["quality-check", "Whole unit", "Quality", "Manager quality-control walkthrough"],
    ] as const;

    const insertTemplate = db.prepare(
      `INSERT INTO turn_templates
       (id, property_id, name, description, match_bedrooms, match_bathrooms, status, created_at, updated_at)
       VALUES (?, 'prop-demo', ?, ?, ?, ?, 'active', ?, ?)`,
    );
    const insertVersion = db.prepare(
      `INSERT INTO turn_template_versions
       (id, template_id, version, published_at, published_by_user_id) VALUES (?, ?, 1, ?, ?)`,
    );
    const insertTemplateItem = db.prepare(
      `INSERT INTO turn_template_items
       (id, template_version_id, item_key, area, category, title, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const bedrooms of [1, 2, 3]) {
      const templateId = `template-${bedrooms}br`;
      const versionId = `${templateId}-v1`;
      insertTemplate.run(
        templateId,
        `${bedrooms} Bedroom Standard`,
        `Published baseline scope for a ${bedrooms}-bedroom apartment turn.`,
        bedrooms,
        null,
        timestamp,
        timestamp,
      );
      insertVersion.run(versionId, templateId, timestamp, "user-manager");
      let order = 0;
      for (const item of sharedItems) {
        insertTemplateItem.run(`${versionId}-${item[0]}`, versionId, ...item, order++);
      }
      for (let bedroom = 1; bedroom <= bedrooms; bedroom += 1) {
        insertTemplateItem.run(
          `${versionId}-bedroom-${bedroom}`,
          versionId,
          `bedroom-${bedroom}`,
          `Bedroom ${bedroom}`,
          "General",
          "Inspect walls, doors, closet, outlets, and flooring",
          order++,
        );
      }
    }

    const offsetDate = (days: number) => {
      const value = new Date();
      value.setDate(value.getDate() + days);
      return value.toISOString().slice(0, 10);
    };
    const insertTurn = db.prepare(
      `INSERT INTO turns
       (id, property_id, unit_id, template_version_id, template_name_snapshot,
        template_version_snapshot, status, priority, move_out_date, target_ready_date,
        notes, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 'user-manager', ?, ?)`,
    );
    const insertTurnItem = db.prepare(
      `INSERT INTO turn_items
       (id, turn_id, source_template_item_id, area, category, title, status,
        completed_by_user_id, completed_at, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const addDemoTurn = (
      id: string,
      unitId: string,
      bedrooms: number,
      status: "planned" | "in_progress" | "ready_for_review",
      priority: "normal" | "high" | "urgent",
      moveOutOffset: number,
      readyOffset: number,
      completedCount: number,
    ) => {
      const versionId = `template-${bedrooms}br-v1`;
      insertTurn.run(
        id,
        propertyId,
        unitId,
        versionId,
        `${bedrooms} Bedroom Standard`,
        status,
        priority,
        offsetDate(moveOutOffset),
        offsetDate(readyOffset),
        status === "planned" ? "Resident notice received; access details pending." : null,
        timestamp,
        timestamp,
      );
      const items = db
        .prepare(
          "SELECT id, area, category, title, sort_order FROM turn_template_items WHERE template_version_id = ? ORDER BY sort_order",
        )
        .all(versionId) as Array<{
        id: string;
        area: string;
        category: string;
        title: string;
        sort_order: number;
      }>;
      items.forEach((item, index) => {
        const complete = index < completedCount || status === "ready_for_review";
        insertTurnItem.run(
          `${id}-item-${index + 1}`,
          id,
          item.id,
          item.area,
          item.category,
          item.title,
          complete ? "complete" : index === completedCount && status === "in_progress" ? "in_progress" : "open",
          complete ? "user-tech" : null,
          complete ? timestamp : null,
          item.sort_order,
          timestamp,
          timestamp,
        );
      });
      db.prepare(
        `INSERT INTO activity_events
         (id, property_id, actor_user_id, entity_type, entity_id, action, details_json, created_at)
         VALUES (?, ?, 'user-manager', 'turn', ?, 'turn.created', ?, ?)`,
      ).run(`activity-${id}`, propertyId, id, JSON.stringify({ source: "development-bootstrap" }), timestamp);
    };

    addDemoTurn("turn-102", "unit-102", 2, "planned", "normal", 2, 8, 0);
    addDemoTurn("turn-202", "unit-202", 2, "in_progress", "high", -2, 2, 5);
    addDemoTurn("turn-302", "unit-302", 2, "ready_for_review", "urgent", -7, -1, 99);
  })();
}
