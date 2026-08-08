import { randomUUID } from "node:crypto";
import type { OrganizationSummary } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { hashPassword } from "../lib/passwords.js";
import { badRequest, notFound } from "../lib/errors.js";
import { config } from "../config.js";
import { getPostgresBoundaryStatus } from "../db/postgres.js";

const now = () => new Date().toISOString();

export interface PlatformUserSummary {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: string;
  propertyScope: string;
}

export interface PlatformHealth {
  service: string;
  databaseProvider: string;
  databaseReady: boolean;
  migrationVersion: number;
  propertyCount: number;
  userCount: number;
  residentAccountCount: number;
  ssoEnabled: boolean;
  portalEnabledProperties: number;
}

export function listOrganizations(): OrganizationSummary[] {
  return db.prepare(
    `SELECT o.id, o.name, o.slug, o.status, COUNT(p.id) AS propertyCount
     FROM organizations o LEFT JOIN properties p ON p.organization_id = o.id
     GROUP BY o.id ORDER BY o.name`,
  ).all().map((row) => ({
    ...(row as OrganizationSummary),
    propertyCount: Number((row as OrganizationSummary).propertyCount),
  }));
}

export function listPlatformUsers(): PlatformUserSummary[] {
  return db.prepare(
    `SELECT u.id, u.name, u.email, u.status,
            GROUP_CONCAT(DISTINCT r.name) AS roles,
            GROUP_CONCAT(DISTINCT COALESCE(p.name, 'All properties')) AS propertyScope
     FROM users u
     LEFT JOIN role_assignments ra ON ra.user_id = u.id
     LEFT JOIN roles r ON r.id = ra.role_id
     LEFT JOIN properties p ON p.id = ra.property_id
     GROUP BY u.id ORDER BY u.name`,
  ).all() as PlatformUserSummary[];
}

export function createPlatformUser(input: {
  name: string;
  email: string;
  password: string;
  roleId: string;
  propertyId?: string | null;
}): PlatformUserSummary {
  const id = randomUUID();
  const timestamp = now();
  db.transaction(() => {
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)",
    ).run(id, input.name, input.email, hashPassword(input.password), timestamp, timestamp);
    db.prepare(
      "INSERT INTO role_assignments (id, user_id, role_id, property_id, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(randomUUID(), id, input.roleId, input.propertyId ?? null, timestamp);
    db.prepare(
      "INSERT INTO platform_audit_events (id, action, entity_type, entity_id, details_json, created_at) VALUES (?, 'user.created', 'user', ?, ?, ?)",
    ).run(randomUUID(), id, JSON.stringify({ email: input.email, roleId: input.roleId }), timestamp);
  })();
  return listPlatformUsers().find((user) => user.id === id)!;
}

export function updateUserRoleAssignment(userId: string, roleId: string, propertyId: string | null): void {
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!user) throw notFound("User not found");
  const timestamp = now();
  db.transaction(() => {
    db.prepare("DELETE FROM role_assignments WHERE user_id = ?").run(userId);
    db.prepare(
      "INSERT INTO role_assignments (id, user_id, role_id, property_id, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(randomUUID(), userId, roleId, propertyId, timestamp);
  })();
}

export function getPlatformHealth(): PlatformHealth {
  const migration = db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get() as { version: number };
  let databaseReady = false;
  try {
    db.prepare("SELECT 1").get();
    databaseReady = true;
  } catch {
    databaseReady = false;
  }
  const counts = db.prepare(
    `SELECT
      (SELECT COUNT(*) FROM properties) AS propertyCount,
      (SELECT COUNT(*) FROM users WHERE status = 'active') AS userCount,
      (SELECT COUNT(*) FROM resident_accounts WHERE status = 'active') AS residentAccountCount,
      (SELECT COUNT(DISTINCT property_id) FROM property_modules WHERE module_key = 'portal' AND enabled = 1) AS portalEnabledProperties`,
  ).get() as Record<string, number>;
  const postgres = getPostgresBoundaryStatus();
  return {
    service: "property-suite",
    databaseProvider: config.databaseProvider,
    databaseReady: config.databaseProvider === "postgresql" ? postgres.ready : databaseReady,
    migrationVersion: Number(migration.version ?? 0),
    propertyCount: Number(counts.propertyCount ?? 0),
    userCount: Number(counts.userCount ?? 0),
    residentAccountCount: Number(counts.residentAccountCount ?? 0),
    ssoEnabled: config.ssoEnabled,
    portalEnabledProperties: Number(counts.portalEnabledProperties ?? 0),
  };
}

export function listRoles(): Array<{ id: string; name: string }> {
  return db.prepare("SELECT id, name FROM roles ORDER BY name").all() as Array<{ id: string; name: string }>;
}
