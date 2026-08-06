import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomBytes, scryptSync } from "node:crypto";

const [databasePath, appRoot = process.cwd()] = process.argv.slice(2);
if (!databasePath) throw new Error("Database path is required");

let inputText = "";
for await (const chunk of process.stdin) inputText += chunk;
const input = JSON.parse(inputText);
const name = String(input.name || "").trim();
const email = String(input.email || "").trim().toLowerCase();
const password = String(input.password || "");
const disableSeededAccounts = input.disableSeededAccounts !== false;

if (name.length < 2 || name.length > 100) throw new Error("Administrator name must be 2–100 characters");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid administrator email is required");
if (password.length < 12 || password.length > 128) throw new Error("Password must be 12–128 characters");
if (["password", "password123", "propertysuite", "propertysuite123", "changeme"].includes(password.trim().toLowerCase())) {
  throw new Error("Choose a password that is not a known Property Suite or common default");
}

const requireFromApp = createRequire(path.join(appRoot, "package.json"));
const Database = requireFromApp("better-sqlite3");
const salt = randomBytes(16).toString("hex");
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
const database = new Database(databasePath, { fileMustExist: true });

try {
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  const manager = database.prepare(
    `SELECT u.id, u.email
     FROM users u
     JOIN role_assignments ra ON ra.user_id = u.id
     JOIN roles r ON r.id = ra.role_id
     WHERE r.name = 'Property Manager'
     ORDER BY CASE WHEN u.id = 'user-manager' THEN 0 ELSE 1 END, u.created_at
     LIMIT 1`,
  ).get();
  if (!manager) throw new Error("No Property Manager account was found");

  database.transaction(() => {
    database.prepare(
      "UPDATE users SET name = ?, email = ?, password_hash = ?, status = 'active', updated_at = ? WHERE id = ?",
    ).run(name, email, passwordHash, new Date().toISOString(), manager.id);
    database.prepare("DELETE FROM sessions WHERE user_id = ?").run(manager.id);

    if (disableSeededAccounts) {
      database.prepare(
        `UPDATE users SET status = 'disabled', updated_at = ?
         WHERE id IN ('user-tech', 'user-leasing')
           AND email LIKE '%@propertysuite.local'`,
      ).run(new Date().toISOString());
      database.prepare("DELETE FROM sessions WHERE user_id IN ('user-tech', 'user-leasing')").run();
    }
  })();

  console.log(JSON.stringify({
    updated: true,
    administratorId: manager.id,
    previousEmail: manager.email,
    email,
    seededAccountsDisabled: disableSeededAccounts,
  }));
} finally {
  database.close();
}
