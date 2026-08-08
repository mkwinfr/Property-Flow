import { randomUUID } from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";

const args = Object.fromEntries(process.argv.slice(2).map((entry) => {
  const [key, ...value] = entry.replace(/^--/, "").split("=");
  return [key, value.join("=")];
}));
const databasePath = args.database ?? process.env.PROPERTY_SUITE_DATABASE_PATH;
const propertyCode = String(args["property-code"] ?? "WAT").toUpperCase();
const sourceRoot = args.source ?? "C:/Users/Server/Property-Flow/Property Flow Backend";
if (!databasePath) throw new Error("Provide --database=<Property Suite SQLite path>");

const localRequire = createRequire(import.meta.url);
const Database = localRequire("better-sqlite3");
const sourceRequire = createRequire(path.join(sourceRoot, "package.json"));
sourceRequire("dotenv").config({ path: path.join(sourceRoot, ".env"), quiet: true });
const { PrismaClient } = sourceRequire("@prisma/client");
const prisma = new PrismaClient();
const target = new Database(databasePath);
target.pragma("foreign_keys = ON");
target.pragma("busy_timeout = 5000");

try {
  const schema = target.prepare("SELECT MAX(version) AS version FROM schema_migrations").get();
  if (Number(schema?.version ?? 0) < 6) throw new Error("Property Suite schema migration 6 must be applied before importing templates");
  const property = target.prepare("SELECT id, name FROM properties WHERE code = ? COLLATE NOCASE").get(propertyCode);
  if (!property) throw new Error(`Property code ${propertyCode} was not found`);

  const templates = await prisma.makeReadyTemplate.findMany({ orderBy: [{ beds: "asc" }, { baths: "asc" }] });
  const punchItems = await prisma.punchTemplateItem.findMany({ orderBy: [{ templateKey: "asc" }, { order: "asc" }, { id: "asc" }] });
  const timestamp = new Date().toISOString();
  const imported = [];
  const skipped = [];

  target.transaction(() => {
    const insertTemplate = target.prepare(
      `INSERT INTO turn_templates
       (id, property_id, name, description, match_bedrooms, match_bathrooms, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    );
    const insertVersion = target.prepare(
      `INSERT INTO turn_template_versions (id, template_id, version, published_at, published_by_user_id)
       VALUES (?, ?, 1, ?, 'user-manager')`,
    );
    const insertItem = target.prepare(
      `INSERT INTO turn_template_items
       (id, template_version_id, item_key, area, category, title, sort_order, is_required, photo_recommended)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
    );
    for (const source of templates) {
      const existing = target.prepare(
        "SELECT id FROM turn_templates WHERE property_id = ? AND name = ? COLLATE NOCASE",
      ).get(property.id, source.name);
      if (existing) {
        skipped.push(source.name);
        continue;
      }
      const templateId = randomUUID();
      const versionId = randomUUID();
      const items = punchItems.filter((item) => item.templateKey === source.templateKey);
      if (!items.length) throw new Error(`Source template ${source.name} has no punch items`);
      insertTemplate.run(templateId, property.id, source.name, source.description ?? "Imported legacy scope template", source.beds, source.baths, timestamp, timestamp);
      insertVersion.run(versionId, templateId, timestamp);
      items.forEach((item, index) => insertItem.run(
        randomUUID(), versionId, `legacy-${source.templateKey}-${item.id}`,
        item.area, item.category, item.title, index,
      ));
      imported.push({ name: source.name, templateKey: source.templateKey, itemCount: items.length });
    }
  })();

  console.log(JSON.stringify({ property: property.name, imported, skipped }, null, 2));
} finally {
  await prisma.$disconnect();
  target.close();
}
