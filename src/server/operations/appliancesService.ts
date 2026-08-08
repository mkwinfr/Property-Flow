import { randomUUID } from "node:crypto";
import type { ApplianceRecord } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { notFound } from "../lib/errors.js";
import { now } from "./shared.js";

export function listAppliances(unitId: string): ApplianceRecord[] {
  return db.prepare(
    `SELECT id, unit_id AS unitId, type, brand, model, serial_number AS serialNumber,
            install_date AS installDate, warranty_expiry AS warrantyExpiry, notes
     FROM appliances WHERE unit_id = ? ORDER BY type`,
  ).all(unitId) as ApplianceRecord[];
}

export function saveAppliance(unitId: string, input: Omit<ApplianceRecord, "id" | "unitId">, id?: string): ApplianceRecord {
  const timestamp = now();
  const applianceId = id ?? randomUUID();
  if (id) {
    const result = db.prepare(
      `UPDATE appliances SET type = ?, brand = ?, model = ?, serial_number = ?, install_date = ?,
       warranty_expiry = ?, notes = ?, updated_at = ? WHERE id = ? AND unit_id = ?`,
    ).run(input.type, input.brand, input.model, input.serialNumber, input.installDate, input.warrantyExpiry, input.notes, timestamp, id, unitId);
    if (!result.changes) throw notFound("Appliance not found");
  } else {
    db.prepare(
      `INSERT INTO appliances
       (id, unit_id, type, brand, model, serial_number, install_date, warranty_expiry, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(applianceId, unitId, input.type, input.brand, input.model, input.serialNumber, input.installDate, input.warrantyExpiry, input.notes, timestamp, timestamp);
  }
  return listAppliances(unitId).find((item) => item.id === applianceId)!;
}
