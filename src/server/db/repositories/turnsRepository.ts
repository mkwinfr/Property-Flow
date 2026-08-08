import type { TurnBlockerQueueItem, TurnSummary, TurnTemplateSummary } from "../../../shared/contracts.js";
import type { RepositoryDatabase } from "./types.js";
import { TURN_SUMMARY_SQL, normalizeTurnRow } from "./types.js";

export function listTurnTemplates(database: RepositoryDatabase, propertyId: string): TurnTemplateSummary[] {
  return database
    .prepare(
      `SELECT tt.id, tt.property_id AS propertyId, tv.id AS versionId, tt.name, tv.version,
              tt.match_bedrooms AS bedrooms, tt.match_bathrooms AS bathrooms,
              COUNT(tti.id) AS itemCount
       FROM turn_templates tt
       JOIN turn_template_versions tv ON tv.id = (
         SELECT tv2.id FROM turn_template_versions tv2
         WHERE tv2.template_id = tt.id ORDER BY tv2.version DESC LIMIT 1
       )
       LEFT JOIN turn_template_items tti ON tti.template_version_id = tv.id
       WHERE tt.status = 'active' AND tt.property_id = ?
       GROUP BY tt.id, tv.id
       ORDER BY tt.match_bedrooms, tt.match_bathrooms, tt.name`,
    )
    .all(propertyId)
    .map((row) => ({
      ...(row as TurnTemplateSummary),
      itemCount: Number((row as { itemCount: number }).itemCount),
    }));
}

export function listTurnSummaries(database: RepositoryDatabase, propertyId: string): TurnSummary[] {
  const rows = database
    .prepare(
      `${TURN_SUMMARY_SQL}
       WHERE t.property_id = ?
       GROUP BY t.id
       ORDER BY CASE t.status
         WHEN 'ready_for_review' THEN 1 WHEN 'rework' THEN 2 WHEN 'in_progress' THEN 3
         WHEN 'planned' THEN 4 WHEN 'complete' THEN 5 ELSE 6 END,
         COALESCE(t.target_ready_date, '9999-12-31'), t.created_at DESC`,
    )
    .all(propertyId) as Array<Record<string, unknown>>;
  return rows.map((row) => normalizeTurnRow(row) as TurnSummary);
}

export function findTurnSummary(database: RepositoryDatabase, turnId: string): TurnSummary | null {
  const row = database
    .prepare(`${TURN_SUMMARY_SQL} WHERE t.id = ? GROUP BY t.id`)
    .get(turnId) as Record<string, unknown> | undefined;
  return row ? (normalizeTurnRow(row) as TurnSummary) : null;
}

export function findTurnNotes(database: RepositoryDatabase, turnId: string): string | null {
  const row = database.prepare("SELECT notes FROM turns WHERE id = ?").get(turnId) as { notes: string | null } | undefined;
  return row?.notes ?? null;
}

export function findActiveTurnForUnit(database: RepositoryDatabase, unitId: string): { id: string } | undefined {
  return database
    .prepare("SELECT id FROM turns WHERE unit_id = ? AND status NOT IN ('complete', 'cancelled')")
    .get(unitId) as { id: string } | undefined;
}

export function listTurnBlockers(database: RepositoryDatabase, propertyId: string): TurnBlockerQueueItem[] {
  return database.prepare(
    `SELECT blocker.id, blocker.property_id AS propertyId, blocker.turn_id AS turnId,
            blocker.turn_item_id AS turnItemId, blocker.category, blocker.reason,
            blocker.responsible_party AS responsibleParty,
            blocker.expected_resolution_date AS expectedResolutionDate,
            opened.name AS openedByName, blocker.opened_at AS openedAt,
            u.unit_number AS unitNumber, b.name AS buildingName,
            ti.title AS scopeTitle, ti.area AS scopeArea, t.priority AS turnPriority,
            t.target_ready_date AS targetReadyDate, lead.name AS leadTechnicianName
     FROM turn_item_blockers blocker
     JOIN turns t ON t.id = blocker.turn_id
     JOIN turn_items ti ON ti.id = blocker.turn_item_id
     JOIN units u ON u.id = t.unit_id
     JOIN buildings b ON b.id = u.building_id
     JOIN users opened ON opened.id = blocker.opened_by_user_id
     LEFT JOIN users lead ON lead.id = t.lead_technician_user_id
     WHERE blocker.property_id = ? AND blocker.resolved_at IS NULL
       AND t.status NOT IN ('complete', 'cancelled')
     ORDER BY CASE WHEN blocker.expected_resolution_date < date('now') THEN 0 ELSE 1 END,
              CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
              COALESCE(blocker.expected_resolution_date, '9999-12-31'), blocker.opened_at`,
  ).all(propertyId) as TurnBlockerQueueItem[];
}

export function countTurnItemProgress(database: RepositoryDatabase, turnId: string) {
  return database.prepare(
    `SELECT SUM(status = 'open') AS openItems,
            SUM(status = 'in_progress') AS inProgressItems,
            SUM(status = 'blocked') AS blockedItems,
            SUM(review_status = 'rework') AS reworkItems
     FROM turn_items WHERE turn_id = ?`,
  ).get(turnId) as Record<string, number | null>;
}
