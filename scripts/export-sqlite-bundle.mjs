import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = process.env.PROPERTY_SUITE_DATABASE_PATH ?? path.join(process.cwd(), ".data", "property-suite.db");
const outputPath = process.argv[2] ?? path.join(process.cwd(), ".data", "sqlite-export.json");

if (!fs.existsSync(dbPath)) {
  console.error(`SQLite database not found: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>;
const bundle = {
  exportedAt: new Date().toISOString(),
  source: dbPath,
  tables: Object.fromEntries(tables.map(({ name }) => {
    const rows = db.prepare(`SELECT * FROM ${name}`).all();
    return [name, rows];
  })),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2));
console.log(`Exported ${tables.length} tables to ${outputPath}`);
