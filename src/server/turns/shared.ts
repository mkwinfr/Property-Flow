import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { db } from "../db/index.js";

export function appendTurnActivity(
  turnId: string,
  propertyId: string,
  actorUserId: string,
  action: string,
  details: Record<string, unknown>,
  database: Database.Database = db,
): void {
  database.prepare(
    `INSERT INTO activity_events
     (id, property_id, actor_user_id, entity_type, entity_id, action, details_json, created_at)
     VALUES (?, ?, ?, 'turn', ?, ?, ?, ?)`,
  ).run(randomUUID(), propertyId, actorUserId, turnId, action, JSON.stringify(details), new Date().toISOString());
}

export function notifyPropertyManagers(
  database: Database.Database,
  propertyId: string,
  actorUserId: string,
  type: string,
  title: string,
  message: string,
  turnId: string,
  timestamp: string,
): void {
  const managers = database.prepare(
    `SELECT DISTINCT u.id
     FROM users u
     JOIN role_assignments assignment ON assignment.user_id = u.id
     JOIN role_permissions permission ON permission.role_id = assignment.role_id
     WHERE u.status = 'active' AND permission.permission_key = 'turns:review'
       AND (assignment.property_id IS NULL OR assignment.property_id = ?)
       AND u.id <> ?`,
  ).all(propertyId, actorUserId) as Array<{ id: string }>;
  const insert = database.prepare(
    `INSERT INTO notifications
     (id, user_id, type, title, message, entity_type, entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, 'turn', ?, ?)`,
  );
  for (const manager of managers) insert.run(randomUUID(), manager.id, type, title, message, turnId, timestamp);
}
