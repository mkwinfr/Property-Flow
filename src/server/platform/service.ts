import { randomUUID } from "node:crypto";
import type { AuditEvent, NotificationPreference, SavedView, SavedViewModule } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { notFound } from "../lib/errors.js";

const now = () => new Date().toISOString();

export function listSavedViews(userId: string, propertyId: string, module: SavedViewModule): SavedView[] {
  return db.prepare(
    `SELECT id, property_id AS propertyId, module, name, filters_json AS filtersJson,
            sort_json AS sortJson, is_default AS isDefault
     FROM saved_views WHERE user_id = ? AND property_id = ? AND module = ? ORDER BY is_default DESC, name`,
  ).all(userId, propertyId, module).map((row) => {
    const item = row as { id: string; propertyId: string; module: SavedViewModule; name: string; filtersJson: string; sortJson: string; isDefault: number };
    return {
      id: item.id,
      propertyId: item.propertyId,
      module: item.module,
      name: item.name,
      filters: JSON.parse(item.filtersJson) as Record<string, unknown>,
      sort: JSON.parse(item.sortJson) as Record<string, unknown>,
      isDefault: Boolean(item.isDefault),
    };
  });
}

export function saveSavedView(userId: string, input: {
  id?: string;
  propertyId: string;
  module: SavedViewModule;
  name: string;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  isDefault?: boolean;
}): SavedView {
  const id = input.id ?? randomUUID();
  const timestamp = now();
  db.transaction(() => {
    if (input.isDefault) {
      db.prepare("UPDATE saved_views SET is_default = 0, updated_at = ? WHERE user_id = ? AND property_id = ? AND module = ?")
        .run(timestamp, userId, input.propertyId, input.module);
    }
    const existing = db.prepare("SELECT id FROM saved_views WHERE id = ? AND user_id = ?").get(id, userId);
    if (existing) {
      db.prepare(
        `UPDATE saved_views SET name = ?, filters_json = ?, sort_json = ?, is_default = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      ).run(input.name, JSON.stringify(input.filters), JSON.stringify(input.sort), input.isDefault ? 1 : 0, timestamp, id, userId);
    } else {
      db.prepare(
        `INSERT INTO saved_views (id, user_id, property_id, module, name, filters_json, sort_json, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, userId, input.propertyId, input.module, input.name, JSON.stringify(input.filters),
        JSON.stringify(input.sort), input.isDefault ? 1 : 0, timestamp, timestamp);
    }
  })();
  return listSavedViews(userId, input.propertyId, input.module).find((view) => view.id === id)!;
}

export function deleteSavedView(userId: string, viewId: string): void {
  const result = db.prepare("DELETE FROM saved_views WHERE id = ? AND user_id = ?").run(viewId, userId);
  if (!result.changes) throw notFound("Saved view not found");
}

export function listAuditEvents(propertyId: string, limit = 100): AuditEvent[] {
  return db.prepare(
    `SELECT ae.id, ae.property_id AS propertyId, ae.entity_type AS entityType, ae.entity_id AS entityId,
            ae.action, u.name AS actorName, ae.details_json AS detailsJson, ae.created_at AS createdAt
     FROM activity_events ae LEFT JOIN users u ON u.id = ae.actor_user_id
     WHERE ae.property_id = ? ORDER BY ae.created_at DESC LIMIT ?`,
  ).all(propertyId, limit).map((row) => {
    const item = row as { id: string; propertyId: string; entityType: string; entityId: string; action: string; actorName: string | null; detailsJson: string; createdAt: string };
    return {
      id: item.id,
      propertyId: item.propertyId,
      entityType: item.entityType,
      entityId: item.entityId,
      action: item.action,
      actorName: item.actorName,
      details: JSON.parse(item.detailsJson) as Record<string, unknown>,
      createdAt: item.createdAt,
    };
  });
}

const defaultNotificationTypes = [
  "turn.assigned", "turn.blocked", "turn.blocker.resolved", "turn.rework",
  "pool.exception", "workorder.assigned",
];

export function listNotificationPreferences(userId: string): NotificationPreference[] {
  const rows = db.prepare(
    "SELECT notification_type AS notificationType, channel, enabled FROM notification_preferences WHERE user_id = ?",
  ).all(userId) as Array<{ notificationType: string; channel: NotificationPreference["channel"]; enabled: number }>;
  if (rows.length) {
    return rows.map((row) => ({
      notificationType: row.notificationType,
      channel: row.channel,
      enabled: Boolean(row.enabled),
    }));
  }
  return defaultNotificationTypes.flatMap((notificationType) => ([
    { notificationType, channel: "in_app" as const, enabled: true },
    { notificationType, channel: "email" as const, enabled: false },
    { notificationType, channel: "sms" as const, enabled: false },
  ]));
}

export function saveNotificationPreferences(userId: string, preferences: NotificationPreference[]): NotificationPreference[] {
  db.transaction(() => {
    db.prepare("DELETE FROM notification_preferences WHERE user_id = ?").run(userId);
    const insert = db.prepare(
      "INSERT INTO notification_preferences (user_id, notification_type, channel, enabled) VALUES (?, ?, ?, ?)",
    );
    for (const pref of preferences) {
      insert.run(userId, pref.notificationType, pref.channel, pref.enabled ? 1 : 0);
    }
  })();
  return listNotificationPreferences(userId);
}

export function isNotificationEnabled(userId: string, notificationType: string, channel: "in_app" | "email" | "sms"): boolean {
  const row = db.prepare(
    "SELECT enabled FROM notification_preferences WHERE user_id = ? AND notification_type = ? AND channel = ?",
  ).get(userId, notificationType, channel) as { enabled: number } | undefined;
  if (!row) return channel === "in_app";
  return Boolean(row.enabled);
}
