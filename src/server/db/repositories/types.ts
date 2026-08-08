import type { AppDatabase } from "../database.js";

export type RepositoryDatabase = AppDatabase;

export const TURN_SUMMARY_SQL = `
  SELECT t.id, t.property_id AS propertyId, t.unit_id AS unitId,
         u.unit_number AS unitNumber, b.name AS buildingName, fp.name AS floorPlanName,
         t.status, t.priority, t.move_out_date AS moveOutDate,
         t.target_ready_date AS targetReadyDate,
         t.lead_technician_user_id AS leadTechnicianUserId,
         lead.name AS leadTechnicianName,
         t.review_round AS reviewRound,
         t.submitted_for_review_at AS submittedForReviewAt,
         t.approved_at AS approvedAt,
         approver.name AS approvedByName,
         SUM(CASE WHEN ti.status IN ('complete', 'not_applicable') THEN 1 ELSE 0 END) AS completedItems,
         COUNT(ti.id) AS totalItems,
         t.template_name_snapshot AS templateName,
         t.created_at AS createdAt
  FROM turns t
  JOIN units u ON u.id = t.unit_id
  JOIN buildings b ON b.id = u.building_id
  JOIN floor_plans fp ON fp.id = u.floor_plan_id
  LEFT JOIN users lead ON lead.id = t.lead_technician_user_id
  LEFT JOIN users approver ON approver.id = t.approved_by_user_id
  LEFT JOIN turn_items ti ON ti.turn_id = t.id
`;

export function normalizeTurnRow(row: Record<string, unknown>) {
  return {
    ...(row as Record<string, unknown>),
    completedItems: Number(row.completedItems ?? 0),
    totalItems: Number(row.totalItems ?? 0),
    reviewRound: Number(row.reviewRound ?? 0),
  };
}
