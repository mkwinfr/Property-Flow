import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "../db/database.js";
import { listPropertyScopeTemplates, listScopeTemplateVersions, publishPropertyScopeTemplate, publishScopeTemplateDraft, restoreScopeTemplateVersion, saveScopeTemplateDraft } from "./templateService.js";

let database: Database.Database | null = null;
afterEach(() => { database?.close(); database = null; });

describe("property scope templates", () => {
  it("publishes immutable property versions with ordered shared scope items", () => {
    database = openDatabase(":memory:");
    const created = publishPropertyScopeTemplate("prop-demo", null, "user-manager", {
      name: "Studio shared scope",
      description: "Used by inspection and Make Ready",
      bedrooms: 0,
      bathrooms: 1,
      items: [
        { area: "Kitchen", category: "Plumbing", title: "Inspect faucet", required: true, photoRecommended: false },
        { area: "Entry", category: "Safety", title: "Inspect entry lock", required: true, photoRecommended: true },
      ],
    }, database);
    expect(created.propertyId).toBe("prop-demo");
    expect(created.version).toBe(1);
    expect(created.items.map((item) => item.title)).toEqual(["Inspect faucet", "Inspect entry lock"]);

    const updated = publishPropertyScopeTemplate("prop-demo", created.id, "user-manager", {
      name: created.name,
      description: created.description,
      bedrooms: created.bedrooms,
      bathrooms: created.bathrooms,
      items: created.items.map((item) => ({ ...item, title: item.title === "Inspect faucet" ? "Inspect faucet and supply" : item.title })),
    }, database);
    expect(updated.version).toBe(2);
    expect(updated.items[0]?.title).toBe("Inspect faucet and supply");
    const versions = database.prepare("SELECT version FROM turn_template_versions WHERE template_id = ? ORDER BY version").all(created.id);
    expect(versions).toEqual([{ version: 1 }, { version: 2 }]);
    expect(listPropertyScopeTemplates("prop-demo", database).some((template) => template.id === created.id)).toBe(true);
  });

  it("saves a working draft, publishes it, and restores an older version as a draft", () => {
    database = openDatabase(":memory:");
    const draft = saveScopeTemplateDraft("prop-demo", null, null, "user-manager", {
      name: "Draft workflow", description: "Safe working copy", bedrooms: 2, bathrooms: 2, floorPlanIds: [],
      items: [{ area: "Kitchen", category: "Cleaning", title: "Clean cabinets", required: true, photoRecommended: false }],
    }, database);
    expect(draft.templateId).toBeNull();
    const published = publishScopeTemplateDraft("prop-demo", draft.id, "user-manager", database);
    expect(published.version).toBe(1);
    expect(published.hasDraft).toBe(false);
    const version = listScopeTemplateVersions("prop-demo", published.id, database)[0]!;
    const restored = restoreScopeTemplateVersion("prop-demo", published.id, version.id, "user-manager", database);
    expect(restored.templateId).toBe(published.id);
    expect(restored.items[0]?.title).toBe("Clean cabinets");
  });
});
