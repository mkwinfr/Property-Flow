import { randomUUID } from "node:crypto";
import type {
  ApplicationSummary,
  ProspectDetail,
  ProspectStage,
  ProspectSummary,
  TourSummary,
} from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { notFound } from "../lib/errors.js";

const now = () => new Date().toISOString();

export function listProspects(propertyId: string): ProspectSummary[] {
  return db.prepare(
    `SELECT p.id, p.property_id AS propertyId, p.first_name AS firstName, p.last_name AS lastName,
            p.email, p.phone, p.source, p.stage, p.desired_move_in AS desiredMoveIn, p.budget_max AS budgetMax,
            assignee.name AS assignedToName, p.updated_at AS updatedAt
     FROM prospects p LEFT JOIN users assignee ON assignee.id = p.assigned_to_user_id
     WHERE p.property_id = ? ORDER BY p.updated_at DESC`,
  ).all(propertyId) as ProspectSummary[];
}

export function getProspect(id: string): ProspectDetail {
  const summary = db.prepare(
    `SELECT p.id, p.property_id AS propertyId, p.first_name AS firstName, p.last_name AS lastName,
            p.email, p.phone, p.source, p.stage, p.desired_move_in AS desiredMoveIn, p.budget_max AS budgetMax,
            p.notes, assignee.name AS assignedToName, p.updated_at AS updatedAt
     FROM prospects p LEFT JOIN users assignee ON assignee.id = p.assigned_to_user_id
     WHERE p.id = ?`,
  ).get(id) as ProspectDetail | undefined;
  if (!summary) throw notFound("Prospect not found");
  const activities = db.prepare(
    `SELECT pa.id, pa.activity_type AS activityType, pa.notes, pa.scheduled_at AS scheduledAt,
            pa.completed_at AS completedAt, actor.name AS actorName, pa.created_at AS createdAt
     FROM prospect_activities pa LEFT JOIN users actor ON actor.id = pa.actor_user_id
     WHERE pa.prospect_id = ? ORDER BY pa.created_at DESC`,
  ).all(id) as ProspectDetail["activities"];
  return {
    ...summary,
    activities,
    tours: listTours(summary.propertyId).filter((tour) => tour.prospectId === id),
    applications: listApplications(summary.propertyId).filter((app) => app.prospectId === id),
  };
}

export function createProspect(input: {
  propertyId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  stage?: ProspectStage;
  desiredMoveIn?: string | null;
  budgetMax?: number | null;
  notes?: string | null;
  assignedToUserId?: string | null;
}): ProspectSummary {
  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO prospects (id, property_id, first_name, last_name, email, phone, source, stage, desired_move_in, budget_max, notes, assigned_to_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.propertyId, input.firstName, input.lastName, input.email ?? null, input.phone ?? null,
    input.source ?? null, input.stage ?? "inquiry", input.desiredMoveIn ?? null, input.budgetMax ?? null,
    input.notes ?? null, input.assignedToUserId ?? null, timestamp, timestamp);
  return listProspects(input.propertyId).find((prospect) => prospect.id === id)!;
}

export function updateProspectStage(id: string, stage: ProspectStage, actorUserId: string, notes?: string | null): ProspectSummary {
  const current = db.prepare("SELECT property_id FROM prospects WHERE id = ?").get(id) as { property_id: string } | undefined;
  if (!current) throw notFound("Prospect not found");
  const timestamp = now();
  db.transaction(() => {
    db.prepare("UPDATE prospects SET stage = ?, updated_at = ? WHERE id = ?").run(stage, timestamp, id);
    db.prepare(
      "INSERT INTO prospect_activities (id, prospect_id, activity_type, notes, actor_user_id, created_at) VALUES (?, ?, 'note', ?, ?, ?)",
    ).run(randomUUID(), id, notes ?? `Stage updated to ${stage.replaceAll("_", " ")}`, actorUserId, timestamp);
  })();
  return listProspects(current.property_id).find((prospect) => prospect.id === id)!;
}

export function listTours(propertyId: string): TourSummary[] {
  return db.prepare(
    `SELECT t.id, t.property_id AS propertyId, t.prospect_id AS prospectId,
            p.first_name || ' ' || p.last_name AS prospectName, t.unit_id AS unitId, u.unit_number AS unitNumber,
            t.scheduled_at AS scheduledAt, t.status, guide.name AS guideName
     FROM tours t
     JOIN prospects p ON p.id = t.prospect_id
     LEFT JOIN units u ON u.id = t.unit_id
     LEFT JOIN users guide ON guide.id = t.guide_user_id
     WHERE t.property_id = ? ORDER BY t.scheduled_at DESC`,
  ).all(propertyId) as TourSummary[];
}

export function createTour(input: {
  propertyId: string;
  prospectId: string;
  unitId?: string | null;
  scheduledAt: string;
  guideUserId?: string | null;
  notes?: string | null;
}): TourSummary {
  const id = randomUUID();
  const timestamp = now();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO tours (id, property_id, prospect_id, unit_id, scheduled_at, status, notes, guide_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)`,
    ).run(id, input.propertyId, input.prospectId, input.unitId ?? null, input.scheduledAt,
      input.notes ?? null, input.guideUserId ?? null, timestamp, timestamp);
    db.prepare("UPDATE prospects SET stage = 'tour_scheduled', updated_at = ? WHERE id = ?").run(timestamp, input.prospectId);
  })();
  return listTours(input.propertyId).find((tour) => tour.id === id)!;
}

export function listApplications(propertyId: string): ApplicationSummary[] {
  return db.prepare(
    `SELECT a.id, a.property_id AS propertyId, a.prospect_id AS prospectId,
            p.first_name || ' ' || p.last_name AS prospectName, a.unit_id AS unitId, u.unit_number AS unitNumber,
            a.status, a.submitted_at AS submittedAt, a.decision_at AS decisionAt, a.monthly_income AS monthlyIncome
     FROM applications a
     JOIN prospects p ON p.id = a.prospect_id
     LEFT JOIN units u ON u.id = a.unit_id
     WHERE a.property_id = ? ORDER BY a.submitted_at DESC`,
  ).all(propertyId) as ApplicationSummary[];
}

export function createApplication(input: {
  propertyId: string;
  prospectId: string;
  unitId?: string | null;
  monthlyIncome?: number | null;
}): ApplicationSummary {
  const id = randomUUID();
  const timestamp = now();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO applications (id, property_id, prospect_id, unit_id, status, submitted_at, monthly_income, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'submitted', ?, ?, ?, ?)`,
    ).run(id, input.propertyId, input.prospectId, input.unitId ?? null, timestamp, input.monthlyIncome ?? null, timestamp, timestamp);
    db.prepare("UPDATE prospects SET stage = 'application', updated_at = ? WHERE id = ?").run(timestamp, input.prospectId);
  })();
  return listApplications(input.propertyId).find((app) => app.id === id)!;
}

export function updateApplicationStatus(id: string, status: ApplicationSummary["status"], decisionNotes?: string | null): ApplicationSummary {
  const current = db.prepare("SELECT property_id, prospect_id FROM applications WHERE id = ?").get(id) as
    | { property_id: string; prospect_id: string }
    | undefined;
  if (!current) throw notFound("Application not found");
  const timestamp = now();
  db.transaction(() => {
    db.prepare("UPDATE applications SET status = ?, decision_at = ?, decision_notes = ?, updated_at = ? WHERE id = ?")
      .run(status, timestamp, decisionNotes ?? null, timestamp, id);
    const stage = status === "approved" ? "approved" : status === "denied" ? "lost" : status === "leased" ? "leased" : "application";
    db.prepare("UPDATE prospects SET stage = ?, updated_at = ? WHERE id = ?").run(stage, timestamp, current.prospect_id);
  })();
  return listApplications(current.property_id).find((app) => app.id === id)!;
}
