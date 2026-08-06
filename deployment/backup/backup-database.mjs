import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const [sourcePath, targetPath, appRoot] = process.argv.slice(2);
if (!sourcePath || !targetPath || !appRoot) {
  throw new Error("Usage: node backup-database.mjs <source> <target> <app-root>");
}

const requireFromApp = createRequire(path.join(appRoot, "package.json"));
const Database = requireFromApp("better-sqlite3");

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
try {
  const sourceIntegrity = source.pragma("integrity_check", { simple: true });
  if (sourceIntegrity !== "ok") {
    throw new Error(`Source database integrity check failed: ${sourceIntegrity}`);
  }
  await source.backup(targetPath);
} finally {
  source.close();
}

const backup = new Database(targetPath, { readonly: true, fileMustExist: true });
try {
  const backupIntegrity = backup.pragma("integrity_check", { simple: true });
  if (backupIntegrity !== "ok") {
    throw new Error(`Backup database integrity check failed: ${backupIntegrity}`);
  }
} finally {
  backup.close();
}

console.log("ok");
