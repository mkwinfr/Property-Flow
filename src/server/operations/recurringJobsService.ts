import { randomUUID } from "node:crypto";
import type { RecurringJob, RecurringJobFrequency } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { notFound } from "../lib/errors.js";
import { createWorkOrder } from "./workOrdersService.js";

const now = () => new Date().toISOString();

function advanceDate(date: string, frequency: RecurringJobFrequency): string {
  const next = new Date(`${date}T12:00:00`);
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "biweekly") next.setDate(next.getDate() + 14);
  else if (frequency === "monthly") next.setMonth(next.getMonth() + 1);
  else if (frequency === "quarterly") next.setMonth(next.getMonth() + 3);
  else next.setFullYear(next.getFullYear() + 1);
  return next.toISOString().slice(0, 10);
}

export function listRecurringJobs(propertyId: string): RecurringJob[] {
  return db.prepare(
    `SELECT rj.id, rj.property_id AS propertyId, rj.unit_id AS unitId, u.unit_number AS unitNumber,
            rj.title, rj.description, rj.category, rj.frequency, rj.next_run_date AS nextRunDate,
            rj.priority, rj.assigned_to_user_id AS assignedToUserId, assignee.name AS assignedToName,
            rj.status
     FROM recurring_jobs rj
     LEFT JOIN units u ON u.id = rj.unit_id
     LEFT JOIN users assignee ON assignee.id = rj.assigned_to_user_id
     WHERE rj.property_id = ? AND rj.status != 'archived'
     ORDER BY rj.next_run_date, rj.title`,
  ).all(propertyId) as RecurringJob[];
}

export function createRecurringJob(input: {
  propertyId: string;
  unitId?: string | null;
  title: string;
  description?: string | null;
  category: string;
  frequency: RecurringJobFrequency;
  nextRunDate: string;
  priority: RecurringJob["priority"];
  assignedToUserId?: string | null;
  createdByUserId: string;
}): RecurringJob {
  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO recurring_jobs
     (id, property_id, unit_id, title, description, category, frequency, next_run_date, priority,
      assigned_to_user_id, status, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
  ).run(id, input.propertyId, input.unitId ?? null, input.title, input.description ?? null, input.category,
    input.frequency, input.nextRunDate, input.priority, input.assignedToUserId ?? null,
    input.createdByUserId, timestamp, timestamp);
  return listRecurringJobs(input.propertyId).find((job) => job.id === id)!;
}

export function updateRecurringJob(id: string, input: Partial<{
  title: string;
  description: string | null;
  category: string;
  frequency: RecurringJobFrequency;
  nextRunDate: string;
  priority: RecurringJob["priority"];
  assignedToUserId: string | null;
  status: RecurringJob["status"];
}>): RecurringJob {
  const current = db.prepare("SELECT property_id FROM recurring_jobs WHERE id = ?").get(id) as { property_id: string } | undefined;
  if (!current) throw notFound("Recurring job not found");
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, column] of [
    ["title", "title"], ["description", "description"], ["category", "category"],
    ["frequency", "frequency"], ["nextRunDate", "next_run_date"], ["priority", "priority"],
    ["assignedToUserId", "assigned_to_user_id"], ["status", "status"],
  ] as const) {
    const value = input[key as keyof typeof input];
    if (value !== undefined) { fields.push(`${column} = ?`); values.push(value); }
  }
  fields.push("updated_at = ?");
  values.push(now(), id);
  db.prepare(`UPDATE recurring_jobs SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return listRecurringJobs(current.property_id).find((job) => job.id === id)!;
}

export function runDueRecurringJobs(propertyId: string, actorUserId: string): number {
  const due = db.prepare(
    `SELECT * FROM recurring_jobs WHERE property_id = ? AND status = 'active' AND next_run_date <= date('now')`,
  ).all(propertyId) as Array<{
    id: string; unit_id: string | null; title: string; description: string | null; category: string;
    frequency: RecurringJobFrequency; next_run_date: string; priority: RecurringJob["priority"];
    assigned_to_user_id: string | null; property_id: string;
  }>;
  let generated = 0;
  for (const job of due) {
    if (!job.unit_id) continue;
    const workOrder = createWorkOrder({
      propertyId: job.property_id,
      unitId: job.unit_id,
      title: job.title,
      description: job.description,
      category: job.category,
      priority: job.priority,
      assignedToUserId: job.assigned_to_user_id,
      dueDate: job.next_run_date,
      requestedBy: "Recurring maintenance",
      submissionSource: "recurring",
      areas: ["Whole unit"],
      permissionToEnter: "permission_given",
      appointmentRequired: false,
      actorUserId,
    });
    const runId = randomUUID();
    const timestamp = now();
    db.prepare(
      "INSERT INTO recurring_job_runs (id, recurring_job_id, work_order_id, scheduled_date, status, created_at) VALUES (?, ?, ?, ?, 'generated', ?)",
    ).run(runId, job.id, workOrder.id, job.next_run_date, timestamp);
    db.prepare("UPDATE recurring_jobs SET next_run_date = ?, updated_at = ? WHERE id = ?")
      .run(advanceDate(job.next_run_date, job.frequency), timestamp, job.id);
    generated += 1;
  }
  return generated;
}
