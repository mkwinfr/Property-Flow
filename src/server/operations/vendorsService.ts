import { randomUUID } from "node:crypto";
import type { VendorRecord } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { now } from "./shared.js";

export function listVendors(propertyId: string): VendorRecord[] {
  const rows = db.prepare(
    `SELECT v.id, v.property_id AS propertyId, v.name, v.contact_name AS contactName, v.phone, v.email,
            v.specialties_json AS specialtiesJson, v.status, v.rating,
            SUM(CASE WHEN vj.status NOT IN ('complete', 'cancelled') THEN 1 ELSE 0 END) AS openJobs
     FROM vendors v LEFT JOIN vendor_jobs vj ON vj.vendor_id = v.id
     WHERE v.property_id = ? GROUP BY v.id ORDER BY v.status, v.name`,
  ).all(propertyId) as Array<Omit<VendorRecord, "specialties"> & { specialtiesJson: string }>;
  return rows.map(({ specialtiesJson, ...row }) => ({ ...row, openJobs: Number(row.openJobs), specialties: JSON.parse(specialtiesJson) as string[] }));
}

export function createVendor(propertyId: string, input: {
  name: string; contactName?: string | null; phone?: string | null; email?: string | null; specialties: string[]; rating?: number | null;
}): VendorRecord {
  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO vendors
     (id, property_id, name, contact_name, phone, email, specialties_json, status, rating, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
  ).run(id, propertyId, input.name, input.contactName ?? null, input.phone ?? null, input.email ?? null,
    JSON.stringify(input.specialties), input.rating ?? null, timestamp, timestamp);
  return listVendors(propertyId).find((vendor) => vendor.id === id)!;
}
