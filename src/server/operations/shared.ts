import { randomUUID } from "node:crypto";
import { db } from "../db/index.js";
import type { AppDatabase } from "../db/database.js";

export const now = () => new Date().toISOString();

export function valueOrCurrent<T>(value: T | undefined, current: unknown): T | unknown {
  return value === undefined ? current : value;
}

export function appendActivity(
  propertyId: string,
  actorUserId: string,
  entityType: string,
  entityId: string,
  action: string,
  details: Record<string, unknown>,
  database: AppDatabase = db,
): void {
  database.prepare(
    `INSERT INTO activity_events (id, property_id, actor_user_id, entity_type, entity_id, action, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), propertyId, actorUserId, entityType, entityId, action, JSON.stringify(details), now());
}

export function notify(
  userId: string,
  type: string,
  title: string,
  message: string,
  entityType: string | null,
  entityId: string | null,
  database: AppDatabase = db,
): void {
  database.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), userId, type, title, message, entityType, entityId, now());
}

export function notifyPoolManagers(
  propertyId: string,
  type: string,
  title: string,
  message: string,
  entityType: string,
  entityId: string,
  database: AppDatabase = db,
): void {
  const users = database.prepare(
    `SELECT DISTINCT ra.user_id FROM role_assignments ra JOIN role_permissions rp ON rp.role_id = ra.role_id
     WHERE rp.permission_key = 'pool:manage' AND (ra.property_id IS NULL OR ra.property_id = ?)`,
  ).all(propertyId) as Array<{ user_id: string }>;
  for (const user of users) notify(user.user_id, type, title, message, entityType, entityId, database);
}

export function notifyWorkOrderManagers(
  propertyId: string,
  type: string,
  title: string,
  message: string,
  entityType: string,
  entityId: string,
  database: AppDatabase = db,
): void {
  const users = database.prepare(
    `SELECT DISTINCT ra.user_id FROM role_assignments ra JOIN role_permissions rp ON rp.role_id = ra.role_id
     WHERE rp.permission_key = 'workorders:manage' AND (ra.property_id IS NULL OR ra.property_id = ?)`,
  ).all(propertyId) as Array<{ user_id: string }>;
  for (const user of users) notify(user.user_id, type, title, message, entityType, entityId, database);
}

function numeric(record: Record<string, number | null>) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, Number(value ?? 0)]));
}

export { numeric };
