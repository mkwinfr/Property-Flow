import type Database from "better-sqlite3";
import type { GlobalSearchResult } from "../../shared/contracts.js";
import { db } from "../db/index.js";

const like = (value: string) => `%${value.replace(/[\\%_]/g, "\\$&")}%`;

export function searchProperty(propertyId: string, query: string, permissions: Set<string>, database: Database.Database = db): GlobalSearchResult[] {
  const term = query.trim();
  if (term.length < 2) return [];
  const value = like(term);
  const results: GlobalSearchResult[] = [];
  const add = (permission: string, type: GlobalSearchResult["type"], sql: string) => {
    if (!permissions.has(permission)) return;
    results.push(...database.prepare(sql).all(propertyId, value, value, value).map((row) => ({ ...(row as GlobalSearchResult), type })));
  };
  add("units:view", "unit", `SELECT u.id, 'Unit ' || u.unit_number AS title, b.name || ' · ' || fp.name || ' · ' || u.occupancy_status AS subtitle FROM units u JOIN buildings b ON b.id = u.building_id JOIN floor_plans fp ON fp.id = u.floor_plan_id WHERE u.property_id = ? AND (u.unit_number LIKE ? ESCAPE '\\' OR b.name LIKE ? ESCAPE '\\' OR fp.name LIKE ? ESCAPE '\\') ORDER BY u.unit_number LIMIT 6`);
  add("turns:view", "turn", `SELECT t.id, 'Make Ready · Unit ' || u.unit_number AS title, t.status || ' · ' || t.priority || COALESCE(' · ' || t.template_name_snapshot, '') AS subtitle FROM turns t JOIN units u ON u.id = t.unit_id WHERE t.property_id = ? AND (u.unit_number LIKE ? ESCAPE '\\' OR t.template_name_snapshot LIKE ? ESCAPE '\\' OR t.status LIKE ? ESCAPE '\\') ORDER BY t.updated_at DESC LIMIT 6`);
  add("workorders:view", "work_order", `SELECT wo.id, 'Work order · Unit ' || u.unit_number AS title, wo.title || ' · ' || wo.status || ' · ' || wo.priority AS subtitle FROM work_orders wo JOIN units u ON u.id = wo.unit_id LEFT JOIN work_order_details wod ON wod.work_order_id = wo.id WHERE wo.property_id = ? AND wod.deleted_at IS NULL AND (u.unit_number LIKE ? ESCAPE '\\' OR wo.title LIKE ? ESCAPE '\\' OR wo.description LIKE ? ESCAPE '\\') ORDER BY wo.updated_at DESC LIMIT 6`);
  add("inspections:view", "inspection", `SELECT mi.id, 'Inspection · Unit ' || u.unit_number AS title, replace(mi.type, '_', ' ') || ' · ' || mi.status || ' · ' || mi.inspection_date AS subtitle FROM move_out_inspections mi JOIN units u ON u.id = mi.unit_id WHERE mi.property_id = ? AND (u.unit_number LIKE ? ESCAPE '\\' OR mi.type LIKE ? ESCAPE '\\' OR mi.notes LIKE ? ESCAPE '\\') ORDER BY mi.inspection_date DESC LIMIT 6`);
  add("vendors:view", "vendor", `SELECT id, name AS title, COALESCE(specialties_json, 'Vendor') || ' · ' || status AS subtitle FROM vendors WHERE property_id = ? AND (name LIKE ? ESCAPE '\\' OR COALESCE(specialties_json, '') LIKE ? ESCAPE '\\' OR COALESCE(contact_name, '') LIKE ? ESCAPE '\\') ORDER BY name LIMIT 6`);
  add("inventory:view", "inventory", `SELECT id, name AS title, sku || ' · ' || category || ' · ' || CAST(quantity_on_hand AS TEXT) || ' on hand' AS subtitle FROM inventory_items WHERE property_id = ? AND (name LIKE ? ESCAPE '\\' OR sku LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\') ORDER BY name LIMIT 6`);
  add("templates:view", "template", `SELECT id, name AS title, 'Make Ready template · ' || status AS subtitle FROM turn_templates WHERE property_id = ? AND (name LIKE ? ESCAPE '\\' OR COALESCE(description, '') LIKE ? ESCAPE '\\' OR status LIKE ? ESCAPE '\\') ORDER BY name LIMIT 6`);
  return results.slice(0, 28);
}
