import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";
import { migrations } from "./schema.js";
import { seedDevelopmentData } from "./seed.js";
import { seedOperationsData } from "./seedOperations.js";
import { seedPhaseData, seedHouseholdPets, seedPortalAccounts, seedPortalMessages } from "./seedPhases.js";
import { verifyPostgresBoundary } from "./postgres.js";

export type AppDatabase = Database.Database;

function addColumnIfMissing(db: AppDatabase, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrateAttachmentEntityTypes(db: AppDatabase): void {
  const definition = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'attachments'",
  ).get() as { sql: string } | undefined;
  if (!definition?.sql || definition.sql.includes("'lease'")) return;
  db.transaction(() => {
    db.exec(`
      CREATE TABLE attachments_new (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id),
        entity_type TEXT NOT NULL CHECK (entity_type IN ('turn', 'turn_item', 'work_order', 'inspection', 'inspection_item', 'appliance', 'lease')),
        entity_id TEXT NOT NULL,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        caption TEXT,
        uploaded_by_user_id TEXT NOT NULL REFERENCES users(id),
        uploaded_by_resident_id TEXT REFERENCES residents(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL
      );
      INSERT INTO attachments_new
        (id, property_id, entity_type, entity_id, original_name, stored_name, mime_type, size_bytes, caption,
         uploaded_by_user_id, uploaded_by_resident_id, created_at)
      SELECT id, property_id, entity_type, entity_id, original_name, stored_name, mime_type, size_bytes, caption,
             uploaded_by_user_id, uploaded_by_resident_id, created_at
      FROM attachments;
      DROP TABLE attachments;
      ALTER TABLE attachments_new RENAME TO attachments;
      CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id, created_at DESC);
    `);
  })();
}

function migrateAttachmentHouseholdEntityType(db: AppDatabase): void {
  const definition = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'attachments'",
  ).get() as { sql: string } | undefined;
  if (!definition?.sql || definition.sql.includes("'household'")) return;
  db.transaction(() => {
    db.exec(`
      CREATE TABLE attachments_new (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id),
        entity_type TEXT NOT NULL CHECK (entity_type IN ('turn', 'turn_item', 'work_order', 'inspection', 'inspection_item', 'appliance', 'lease', 'household')),
        entity_id TEXT NOT NULL,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        caption TEXT,
        uploaded_by_user_id TEXT NOT NULL REFERENCES users(id),
        uploaded_by_resident_id TEXT REFERENCES residents(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL
      );
      INSERT INTO attachments_new
        (id, property_id, entity_type, entity_id, original_name, stored_name, mime_type, size_bytes, caption,
         uploaded_by_user_id, uploaded_by_resident_id, created_at)
      SELECT id, property_id, entity_type, entity_id, original_name, stored_name, mime_type, size_bytes, caption,
             uploaded_by_user_id, uploaded_by_resident_id, created_at
      FROM attachments;
      DROP TABLE attachments;
      ALTER TABLE attachments_new RENAME TO attachments;
      CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id, created_at DESC);
    `);
  })();
}

function migrateInspectionTypes(db: AppDatabase): void {
  const definition = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'move_out_inspections'",
  ).get() as { sql: string } | undefined;
  if (!definition?.sql || definition.sql.includes("'move_in'")) return;
  db.transaction(() => {
    db.exec(`
      CREATE TABLE move_out_inspections_new (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id),
        unit_id TEXT NOT NULL REFERENCES units(id),
        type TEXT NOT NULL CHECK (type IN ('pre_move_out', 'final', 'other', 'move_in', 'move_in_final')),
        status TEXT NOT NULL CHECK (status IN ('draft', 'complete', 'locked')),
        inspection_date TEXT NOT NULL,
        inspector_user_id TEXT REFERENCES users(id),
        notes TEXT,
        generated_turn_id TEXT REFERENCES turns(id) ON DELETE SET NULL,
        template_version_id TEXT REFERENCES turn_template_versions(id),
        template_name_snapshot TEXT,
        template_version_snapshot INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO move_out_inspections_new
        (id, property_id, unit_id, type, status, inspection_date, inspector_user_id, notes,
         generated_turn_id, template_version_id, template_name_snapshot, template_version_snapshot, created_at, updated_at)
      SELECT id, property_id, unit_id, type, status, inspection_date, inspector_user_id, notes,
         generated_turn_id, template_version_id, template_name_snapshot, template_version_snapshot, created_at, updated_at
      FROM move_out_inspections;
      DROP TABLE move_out_inspections;
      ALTER TABLE move_out_inspections_new RENAME TO move_out_inspections;
      CREATE INDEX IF NOT EXISTS idx_inspections_property ON move_out_inspections(property_id, inspection_date DESC);
      CREATE INDEX IF NOT EXISTS idx_inspections_template_version ON move_out_inspections(template_version_id);
    `);
  })();
}

function applyPostMigrations(db: AppDatabase): void {
  migrateInspectionTypes(db);
  migrateAttachmentEntityTypes(db);
  migrateAttachmentHouseholdEntityType(db);
  addColumnIfMissing(db, "work_orders", "resident_id", "TEXT REFERENCES residents(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "turns", "resident_id", "TEXT REFERENCES residents(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "work_orders", "submission_source", "TEXT NOT NULL DEFAULT 'staff'");
  db.prepare(
    `UPDATE work_orders
     SET requested_by = (SELECT TRIM(r.first_name || ' ' || r.last_name) FROM residents r WHERE r.id = work_orders.resident_id)
     WHERE submission_source = 'portal' AND resident_id IS NOT NULL
       AND (requested_by = 'Resident portal' OR requested_by IS NULL)`,
  ).run();
  addColumnIfMissing(db, "properties", "organization_id", "TEXT REFERENCES organizations(id) ON DELETE SET NULL");
  seedDefaultModules(db);
  seedDefaultOrganization(db);
}

const DEFAULT_MODULES = [
  "make_ready", "operations", "pool", "residents", "leasing", "communications", "financial", "portal",
] as const;

function seedDefaultModules(db: AppDatabase): void {
  const properties = db.prepare("SELECT id FROM properties").all() as Array<{ id: string }>;
  const insert = db.prepare(
    "INSERT OR IGNORE INTO property_modules (property_id, module_key, enabled) VALUES (?, ?, 1)",
  );
  for (const property of properties) {
    for (const moduleKey of DEFAULT_MODULES) insert.run(property.id, moduleKey);
  }
}

function seedDefaultOrganization(db: AppDatabase): void {
  const existing = db.prepare("SELECT id FROM organizations LIMIT 1").get();
  if (existing) return;
  const timestamp = new Date().toISOString();
  db.prepare(
    "INSERT INTO organizations (id, name, slug, status, created_at, updated_at) VALUES ('org-default', 'Property Suite Demo', 'demo', 'active', ?, ?)",
  ).run(timestamp, timestamp);
  db.prepare("UPDATE properties SET organization_id = 'org-default' WHERE organization_id IS NULL").run();
}

export function openDatabase(databasePath = config.databasePath): AppDatabase {
  if (databasePath !== ":memory:") fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const current = db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get() as {
    version: number;
  };
  for (const migration of migrations) {
    if (migration.version <= current.version) continue;
    db.transaction(() => {
      db.exec(migration.sql);
      db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)").run(
        migration.version,
        migration.name,
        new Date().toISOString(),
      );
    })();
  }

  applyPostMigrations(db);
  seedDevelopmentData(db);
  seedOperationsData(db);
  seedPhaseData(db);
  seedPortalAccounts(db);
  seedHouseholdPets(db);
  seedPortalMessages(db);
  void verifyPostgresBoundary();
  return db;
}
