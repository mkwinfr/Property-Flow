import { randomUUID } from "node:crypto";
import type { PoolLogRecord } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { notifyPoolManagers, now } from "./shared.js";

export interface PoolRow {
  id: string;
  property_id: string;
  log_date: string;
  logged_at: string;
  free_chlorine: number | null;
  total_chlorine: number | null;
  ph: number | null;
  alkalinity: number | null;
  hardness: number | null;
  cyanuric_acid: number | null;
  water_temp_f: number | null;
  weather_summary: string | null;
  notes: string | null;
  created_by_name?: string;
}

interface PoolInput {
  logDate: string;
  freeChlorine: number | null;
  totalChlorine: number | null;
  ph: number | null;
  alkalinity: number | null;
  hardness: number | null;
  cyanuricAcid: number | null;
  waterTempF: number | null;
  weatherSummary?: string | null;
  notes?: string | null;
}

export function poolExceptions(row: PoolRow): string[] {
  const checks: Array<[number | null, number, number, string]> = [
    [row.free_chlorine, 1, 4, "Free chlorine"], [row.ph, 7.2, 7.8, "pH"],
    [row.alkalinity, 80, 120, "Alkalinity"], [row.hardness, 200, 400, "Hardness"],
    [row.cyanuric_acid, 30, 50, "Cyanuric acid"],
  ];
  return checks.flatMap(([value, min, max, label]) => value !== null && (value < min || value > max) ? [`${label} ${value} (target ${min}–${max})`] : []);
}

function toPoolLog(row: PoolRow): PoolLogRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    logDate: row.log_date,
    loggedAt: row.logged_at,
    freeChlorine: row.free_chlorine,
    totalChlorine: row.total_chlorine,
    ph: row.ph,
    alkalinity: row.alkalinity,
    hardness: row.hardness,
    cyanuricAcid: row.cyanuric_acid,
    waterTempF: row.water_temp_f,
    weatherSummary: row.weather_summary,
    notes: row.notes,
    createdByName: row.created_by_name ?? "Unknown",
    exceptions: poolExceptions(row),
  };
}

export function listPoolLogs(propertyId: string): PoolLogRecord[] {
  const rows = db.prepare(
    `SELECT pl.*, u.name AS created_by_name FROM pool_logs pl JOIN users u ON u.id = pl.created_by_user_id
     WHERE pl.property_id = ? ORDER BY pl.log_date DESC, pl.logged_at DESC LIMIT 90`,
  ).all(propertyId) as PoolRow[];
  return rows.map(toPoolLog);
}

export function createPoolLog(propertyId: string, actorUserId: string, input: PoolInput): PoolLogRecord {
  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO pool_logs
     (id, property_id, log_date, logged_at, free_chlorine, total_chlorine, ph, alkalinity,
      hardness, cyanuric_acid, water_temp_f, weather_summary, notes, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, propertyId, input.logDate, timestamp, input.freeChlorine, input.totalChlorine, input.ph,
    input.alkalinity, input.hardness, input.cyanuricAcid, input.waterTempF, input.weatherSummary ?? null,
    input.notes ?? null, actorUserId, timestamp, timestamp);
  const row = db.prepare(
    "SELECT pl.*, u.name AS created_by_name FROM pool_logs pl JOIN users u ON u.id = pl.created_by_user_id WHERE pl.id = ?",
  ).get(id) as PoolRow;
  const record = toPoolLog(row);
  if (record.exceptions.length) {
    notifyPoolManagers(propertyId, "pool.exception", "Pool reading needs attention", record.exceptions.join(" · "), "pool_log", id);
  }
  return record;
}

export function exportPoolLogsCsv(propertyId: string): string {
  const logs = listPoolLogs(propertyId);
  const headers = ["Date", "Free Cl", "Total Cl", "pH", "Alkalinity", "Hardness", "CYA", "Temp F", "Weather", "Exceptions", "Notes", "Logged By"];
  const rows = logs.map((log) => [
    log.logDate,
    log.freeChlorine ?? "",
    log.totalChlorine ?? "",
    log.ph ?? "",
    log.alkalinity ?? "",
    log.hardness ?? "",
    log.cyanuricAcid ?? "",
    log.waterTempF ?? "",
    log.weatherSummary ?? "",
    log.exceptions.join("; "),
    log.notes ?? "",
    log.createdByName,
  ]);
  return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}
