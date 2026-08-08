import fs from "node:fs";
import pg from "pg";

const bundlePath = process.argv[2] ?? "./.data/sqlite-export.json";
const databaseUrl = process.env.PROPERTY_SUITE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Set PROPERTY_SUITE_DATABASE_URL before importing.");
  process.exit(1);
}
if (!fs.existsSync(bundlePath)) {
  console.error(`Bundle not found: ${bundlePath}`);
  process.exit(1);
}

const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

for (const [table, rows] of Object.entries(bundle.tables)) {
  if (!Array.isArray(rows) || rows.length === 0) continue;
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
  for (const row of rows) {
    await client.query(sql, columns.map((column) => row[column] ?? null));
  }
  console.log(`Imported ${rows.length} row(s) into ${table}`);
}

await client.end();
console.log("PostgreSQL import complete.");
