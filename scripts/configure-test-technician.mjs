import path from "node:path";
import { createRequire } from "node:module";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";

const [databasePath, appRoot = process.cwd()] = process.argv.slice(2);
if (!databasePath) throw new Error("Database path is required");

let inputText = "";
for await (const chunk of process.stdin) inputText += chunk;
const input = inputText.trim() ? JSON.parse(inputText) : {};
const name = String(input.name || "Test Maintenance Technician").trim();
const email = String(input.email || "maintenance.test@propertysuite.local").trim().toLowerCase();
const propertyId = String(input.propertyId || "").trim();
const password = String(input.password || createTemporaryPassword());

if (name.length < 2 || name.length > 100) throw new Error("Technician name must be 2-100 characters");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid technician email is required");
if (!propertyId) throw new Error("propertyId is required");
if (password.length < 12 || password.length > 128) throw new Error("Password must be 12-128 characters");

const requireFromApp = createRequire(path.join(appRoot, "package.json"));
const Database = requireFromApp("better-sqlite3");
const salt = randomBytes(16).toString("hex");
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
const database = new Database(databasePath, { fileMustExist: true });

try {
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");

  const property = database.prepare("SELECT id, name FROM properties WHERE id = ?").get(propertyId);
  if (!property) throw new Error(`Property not found: ${propertyId}`);

  const role = database.prepare("SELECT id, name FROM roles WHERE name = 'Maintenance Technician'").get();
  if (!role) throw new Error("Maintenance Technician role was not found");

  const existing = database.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email);
  const userId = existing?.id || randomUUID();
  const now = new Date().toISOString();

  database.transaction(() => {
    if (existing) {
      database.prepare(
        "UPDATE users SET name = ?, password_hash = ?, status = 'active', updated_at = ? WHERE id = ?",
      ).run(name, passwordHash, now, userId);
    } else {
      database.prepare(
        `INSERT INTO users (id, name, email, password_hash, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      ).run(userId, name, email, passwordHash, now, now);
    }

    database.prepare("DELETE FROM role_assignments WHERE user_id = ?").run(userId);
    database.prepare(
      `INSERT INTO role_assignments (id, user_id, role_id, property_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(randomUUID(), userId, role.id, property.id, now);
    database.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  })();

  console.log(JSON.stringify({
    configured: true,
    created: !existing,
    userId,
    name,
    email,
    temporaryPassword: password,
    role: role.name,
    property: property.name,
  }, null, 2));
} finally {
  database.close();
}

function createTemporaryPassword() {
  return `Ps!${randomBytes(18).toString("base64url")}9a`;
}
