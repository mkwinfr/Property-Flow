import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";
import { migrations } from "./schema.js";
import { seedDevelopmentData } from "./seed.js";
import { seedOperationsData } from "./seedOperations.js";

export type AppDatabase = Database.Database;

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

  seedDevelopmentData(db);
  seedOperationsData(db);
  return db;
}
