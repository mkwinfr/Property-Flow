import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { PropertyScopeTemplate, ScopeTemplateDraft, ScopeTemplateItem, ScopeTemplateVersion, TemplateFloorPlan } from "../../shared/contracts.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";

export interface ScopeTemplateInput {
  name: string;
  description: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floorPlanIds?: string[];
  items: Array<{
    itemKey?: string;
    area: string;
    category: string;
    title: string;
    required: boolean;
    photoRecommended: boolean;
  }>;
}

const latestVersionSql = `
  SELECT tt.id, tt.property_id AS propertyId, tt.name, tt.description, tt.status,
         tt.match_bedrooms AS bedrooms, tt.match_bathrooms AS bathrooms,
         tv.id AS versionId, tv.version, tv.published_at AS publishedAt, u.name AS publishedByName,
         COUNT(tti.id) AS itemCount
  FROM turn_templates tt
  JOIN turn_template_versions tv ON tv.id = (
    SELECT tv2.id FROM turn_template_versions tv2
    WHERE tv2.template_id = tt.id ORDER BY tv2.version DESC LIMIT 1
  )
  LEFT JOIN turn_template_items tti ON tti.template_version_id = tv.id
  LEFT JOIN users u ON u.id = tv.published_by_user_id
`;

const itemQuerySql = `SELECT id, item_key AS itemKey, area, category, title, sort_order AS sortOrder,
  is_required AS required, photo_recommended AS photoRecommended FROM turn_template_items
  WHERE template_version_id = ? ORDER BY sort_order, area, title`;
const mapItems = (rows: Array<Omit<ScopeTemplateItem, "required" | "photoRecommended"> & { required: number; photoRecommended: number }>) =>
  rows.map((item) => ({ ...item, required: Boolean(item.required), photoRecommended: Boolean(item.photoRecommended) }));

export function listPropertyScopeTemplates(
  propertyId: string,
  database: Database.Database,
): PropertyScopeTemplate[] {
  const rows = database.prepare(
    `${latestVersionSql}
     WHERE tt.property_id = ?
     GROUP BY tt.id, tv.id
     ORDER BY tt.status, tt.match_bedrooms, tt.match_bathrooms, tt.name`,
  ).all(propertyId) as Array<Omit<PropertyScopeTemplate, "items">>;

  const itemQuery = database.prepare(itemQuerySql);
  const floorPlans = database.prepare("SELECT floor_plan_id AS id FROM turn_template_floor_plans WHERE template_id = ?");
  const drafts = new Set((database.prepare("SELECT template_id AS id FROM turn_template_drafts WHERE property_id = ? AND template_id IS NOT NULL").all(propertyId) as Array<{id: string}>).map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    itemCount: Number(row.itemCount),
    floorPlanIds: (floorPlans.all(row.id) as Array<{id: string}>).map((item) => item.id),
    hasDraft: drafts.has(row.id),
    items: mapItems(itemQuery.all(row.versionId) as any),
  }));
}

function validateInput(propertyId: string, input: ScopeTemplateInput, database: Database.Database, excludeTemplateId?: string | null) {
  if (!input.name.trim()) throw badRequest("Template name is required");
  if (!input.items.length) throw badRequest("A scope template must contain at least one item");
  const duplicate = new Set<string>();
  for (const item of input.items) {
    const key = `${item.area.trim().toLowerCase()}|${item.category.trim().toLowerCase()}|${item.title.trim().toLowerCase()}`;
    if (duplicate.has(key)) throw badRequest(`Duplicate scope item: ${item.area} / ${item.title}`);
    duplicate.add(key);
  }
  const floorPlanIds = [...new Set(input.floorPlanIds ?? [])];
  for (const id of floorPlanIds) {
    if (!database.prepare("SELECT 1 FROM floor_plans WHERE id = ? AND property_id = ?").get(id, propertyId)) throw badRequest("A selected floor plan does not belong to this property");
    const conflictRow = database.prepare(`SELECT tt.name FROM turn_template_floor_plans tfp JOIN turn_templates tt ON tt.id = tfp.template_id
      WHERE tfp.floor_plan_id = ? AND tt.property_id = ? AND tt.status = 'active' AND tt.id <> ?`).get(id, propertyId, excludeTemplateId ?? "") as {name: string}|undefined;
    if (conflictRow) throw conflict(`That floor plan is already assigned to ${conflictRow.name}`);
  }
  return floorPlanIds;
}

export function publishPropertyScopeTemplate(
  propertyId: string,
  templateId: string | null,
  actorUserId: string,
  input: ScopeTemplateInput,
  database: Database.Database,
): PropertyScopeTemplate {
  const property = database.prepare("SELECT id FROM properties WHERE id = ?").get(propertyId);
  if (!property) throw notFound("Property not found");
  const existing = templateId
    ? database.prepare("SELECT id, property_id FROM turn_templates WHERE id = ?").get(templateId) as { id: string; property_id: string } | undefined
    : undefined;
  if (templateId && (!existing || existing.property_id !== propertyId)) throw notFound("Template not found at this property");
  const floorPlanIds = validateInput(propertyId, input, database, templateId);

  const timestamp = new Date().toISOString();
  const id = existing?.id ?? randomUUID();
  database.transaction(() => {
    const nameConflict = database.prepare(
      "SELECT id FROM turn_templates WHERE property_id = ? AND name = ? COLLATE NOCASE AND id <> ?",
    ).get(propertyId, input.name, id);
    if (nameConflict) throw conflict("Another template at this property already uses that name");

    if (existing) {
      database.prepare(
        `UPDATE turn_templates SET name = ?, description = ?, match_bedrooms = ?, match_bathrooms = ?,
         status = 'active', updated_at = ? WHERE id = ?`,
      ).run(input.name, input.description, input.bedrooms, input.bathrooms, timestamp, id);
    } else {
      database.prepare(
        `INSERT INTO turn_templates
         (id, name, description, match_bedrooms, match_bathrooms, status, created_at, updated_at, property_id)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      ).run(id, input.name, input.description, input.bedrooms, input.bathrooms, timestamp, timestamp, propertyId);
    }

    const current = database.prepare(
      "SELECT COALESCE(MAX(version), 0) AS version FROM turn_template_versions WHERE template_id = ?",
    ).get(id) as { version: number };
    const version = current.version + 1;
    const versionId = randomUUID();
    database.prepare(
      `INSERT INTO turn_template_versions (id, template_id, version, published_at, published_by_user_id)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(versionId, id, version, timestamp, actorUserId);
    const insertItem = database.prepare(
      `INSERT INTO turn_template_items
       (id, template_version_id, item_key, area, category, title, sort_order, is_required, photo_recommended)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    input.items.forEach((item, index) => {
      insertItem.run(
        randomUUID(), versionId, item.itemKey?.trim() || randomUUID(), item.area.trim(), item.category.trim(),
        item.title.trim(), index, item.required ? 1 : 0, item.photoRecommended ? 1 : 0,
      );
    });
    database.prepare("DELETE FROM turn_template_floor_plans WHERE template_id = ?").run(id);
    const assignFloorPlan = database.prepare("INSERT INTO turn_template_floor_plans (template_id, floor_plan_id) VALUES (?, ?)");
    floorPlanIds.forEach((floorPlanId) => assignFloorPlan.run(id, floorPlanId));
    database.prepare(
      `INSERT INTO activity_events
       (id, property_id, actor_user_id, entity_type, entity_id, action, details_json, created_at)
       VALUES (?, ?, ?, 'turn_template', ?, 'turn_template.published', ?, ?)`,
    ).run(randomUUID(), propertyId, actorUserId, id, JSON.stringify({ version, itemCount: input.items.length }), timestamp);
  })();

  return listPropertyScopeTemplates(propertyId, database).find((template) => template.id === id)!;
}

export function listTemplateFloorPlans(propertyId: string, database: Database.Database): TemplateFloorPlan[] {
  return database.prepare("SELECT id, name, bedrooms, bathrooms FROM floor_plans WHERE property_id = ? ORDER BY bedrooms, bathrooms, name").all(propertyId) as TemplateFloorPlan[];
}

export function saveScopeTemplateDraft(propertyId: string, draftId: string | null, templateId: string | null, actorUserId: string, input: ScopeTemplateInput, database: Database.Database): ScopeTemplateDraft {
  const floorPlanIds = validateInput(propertyId, input, database, templateId);
  if (templateId && !database.prepare("SELECT 1 FROM turn_templates WHERE id = ? AND property_id = ?").get(templateId, propertyId)) throw notFound("Template not found");
  const existing = draftId ? database.prepare("SELECT id FROM turn_template_drafts WHERE id = ? AND property_id = ?").get(draftId, propertyId) : templateId ? database.prepare("SELECT id FROM turn_template_drafts WHERE template_id = ? AND property_id = ?").get(templateId, propertyId) : undefined;
  const id = (existing as {id:string}|undefined)?.id ?? randomUUID();
  const now = new Date().toISOString();
  database.transaction(() => {
    if (existing) database.prepare(`UPDATE turn_template_drafts SET name=?, description=?, match_bedrooms=?, match_bathrooms=?, updated_by_user_id=?, updated_at=? WHERE id=?`).run(input.name.trim(), input.description.trim(), input.bedrooms, input.bathrooms, actorUserId, now, id);
    else database.prepare(`INSERT INTO turn_template_drafts (id,property_id,template_id,name,description,match_bedrooms,match_bathrooms,created_by_user_id,updated_by_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, propertyId, templateId, input.name.trim(), input.description.trim(), input.bedrooms, input.bathrooms, actorUserId, actorUserId, now, now);
    database.prepare("DELETE FROM turn_template_draft_items WHERE draft_id=?").run(id);
    const add = database.prepare(`INSERT INTO turn_template_draft_items (id,draft_id,item_key,area,category,title,sort_order,is_required,photo_recommended) VALUES (?,?,?,?,?,?,?,?,?)`);
    input.items.forEach((item,index)=>add.run(randomUUID(),id,item.itemKey?.trim()||randomUUID(),item.area.trim(),item.category.trim(),item.title.trim(),index,item.required?1:0,item.photoRecommended?1:0));
    database.prepare("DELETE FROM turn_template_draft_floor_plans WHERE draft_id=?").run(id);
    const assign = database.prepare("INSERT INTO turn_template_draft_floor_plans (draft_id,floor_plan_id) VALUES (?,?)");
    floorPlanIds.forEach((floorPlanId)=>assign.run(id,floorPlanId));
  })();
  return getScopeTemplateDraft(propertyId,id,database);
}

export function getScopeTemplateDraft(propertyId:string,draftId:string,database:Database.Database):ScopeTemplateDraft {
  const row=database.prepare(`SELECT d.id,d.template_id AS templateId,d.property_id AS propertyId,d.name,d.description,d.match_bedrooms AS bedrooms,d.match_bathrooms AS bathrooms,d.updated_at AS updatedAt,u.name AS updatedByName FROM turn_template_drafts d JOIN users u ON u.id=d.updated_by_user_id WHERE d.id=? AND d.property_id=?`).get(draftId,propertyId) as Omit<ScopeTemplateDraft,"items"|"floorPlanIds">|undefined;
  if(!row) throw notFound("Draft not found");
  const items=database.prepare(`SELECT id,item_key AS itemKey,area,category,title,sort_order AS sortOrder,is_required AS required,photo_recommended AS photoRecommended FROM turn_template_draft_items WHERE draft_id=? ORDER BY sort_order`).all(draftId) as any;
  const floors=database.prepare("SELECT floor_plan_id AS id FROM turn_template_draft_floor_plans WHERE draft_id=?").all(draftId) as Array<{id:string}>;
  return {...row,items:mapItems(items),floorPlanIds:floors.map(x=>x.id)};
}

export function listScopeTemplateDrafts(propertyId:string,database:Database.Database):ScopeTemplateDraft[]{
  const ids=database.prepare("SELECT id FROM turn_template_drafts WHERE property_id=? ORDER BY updated_at DESC").all(propertyId) as Array<{id:string}>;
  return ids.map(x=>getScopeTemplateDraft(propertyId,x.id,database));
}

export function deleteScopeTemplateDraft(propertyId:string,draftId:string,database:Database.Database):void { if(!database.prepare("DELETE FROM turn_template_drafts WHERE id=? AND property_id=?").run(draftId,propertyId).changes) throw notFound("Draft not found"); }

export function publishScopeTemplateDraft(propertyId:string,draftId:string,actorUserId:string,database:Database.Database):PropertyScopeTemplate { const draft=getScopeTemplateDraft(propertyId,draftId,database); const published=publishPropertyScopeTemplate(propertyId,draft.templateId,actorUserId,draft,database); database.prepare("DELETE FROM turn_template_drafts WHERE id=?").run(draftId); return published; }

export function listScopeTemplateVersions(propertyId:string,templateId:string,database:Database.Database):ScopeTemplateVersion[]{
  if(!database.prepare("SELECT 1 FROM turn_templates WHERE id=? AND property_id=?").get(templateId,propertyId)) throw notFound("Template not found");
  const rows=database.prepare(`SELECT tv.id,tv.template_id AS templateId,tv.version,tv.published_at AS publishedAt,u.name AS publishedByName FROM turn_template_versions tv LEFT JOIN users u ON u.id=tv.published_by_user_id WHERE tv.template_id=? ORDER BY tv.version DESC`).all(templateId) as Array<Omit<ScopeTemplateVersion,"items">>;
  const q=database.prepare(itemQuerySql); return rows.map(row=>({...row,items:mapItems(q.all(row.id) as any)}));
}

export function restoreScopeTemplateVersion(propertyId:string,templateId:string,versionId:string,actorUserId:string,database:Database.Database):ScopeTemplateDraft {
  const template=listPropertyScopeTemplates(propertyId,database).find(x=>x.id===templateId); if(!template) throw notFound("Template not found");
  const version=listScopeTemplateVersions(propertyId,templateId,database).find(x=>x.id===versionId); if(!version) throw notFound("Version not found");
  return saveScopeTemplateDraft(propertyId,null,templateId,actorUserId,{name:template.name,description:template.description,bedrooms:template.bedrooms,bathrooms:template.bathrooms,floorPlanIds:template.floorPlanIds,items:version.items},database);
}

export function duplicateScopeTemplate(propertyId:string,templateId:string,actorUserId:string,database:Database.Database):ScopeTemplateDraft { const t=listPropertyScopeTemplates(propertyId,database).find(x=>x.id===templateId); if(!t) throw notFound("Template not found"); return saveScopeTemplateDraft(propertyId,null,null,actorUserId,{...t,name:`${t.name} copy`,floorPlanIds:[]},database); }

export function reactivatePropertyScopeTemplate(propertyId:string,templateId:string,actorUserId:string,database:Database.Database):PropertyScopeTemplate { const t=database.prepare("SELECT id FROM turn_templates WHERE id=? AND property_id=?").get(templateId,propertyId); if(!t) throw notFound("Template not found"); database.prepare("UPDATE turn_templates SET status='active',updated_at=? WHERE id=?").run(new Date().toISOString(),templateId); return listPropertyScopeTemplates(propertyId,database).find(x=>x.id===templateId)!; }

export function archivePropertyScopeTemplate(
  propertyId: string,
  templateId: string,
  actorUserId: string,
  database: Database.Database,
): PropertyScopeTemplate {
  const template = database.prepare(
    "SELECT id FROM turn_templates WHERE id = ? AND property_id = ?",
  ).get(templateId, propertyId);
  if (!template) throw notFound("Template not found at this property");
  const activeTurns = database.prepare(
    `SELECT COUNT(*) AS count FROM turns t JOIN turn_template_versions tv ON tv.id = t.template_version_id
     WHERE tv.template_id = ? AND t.status NOT IN ('complete', 'cancelled')`,
  ).get(templateId) as { count: number };
  if (activeTurns.count) throw conflict("Complete or cancel active turns using this template before archiving it");
  const timestamp = new Date().toISOString();
  database.prepare("UPDATE turn_templates SET status = 'archived', updated_at = ? WHERE id = ?").run(timestamp, templateId);
  database.prepare(
    `INSERT INTO activity_events
     (id, property_id, actor_user_id, entity_type, entity_id, action, details_json, created_at)
     VALUES (?, ?, ?, 'turn_template', ?, 'turn_template.archived', '{}', ?)`,
  ).run(randomUUID(), propertyId, actorUserId, templateId, timestamp);
  return listPropertyScopeTemplates(propertyId, database).find((item) => item.id === templateId)!;
}
