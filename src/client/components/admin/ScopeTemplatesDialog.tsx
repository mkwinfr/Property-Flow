import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowDown, ArrowUp, ClipboardList, Plus, Save, Trash2 } from "lucide-react";
import type { AdminPropertySummary, PropertyScopeTemplate } from "../../../shared/contracts";
import { api } from "../../lib/api";
import { DetailModal } from "../DetailModal";

type DraftItem = {
  itemKey?: string;
  area: string;
  category: string;
  title: string;
  required: boolean;
  photoRecommended: boolean;
};
type Draft = {
  id: string | null;
  name: string;
  description: string;
  bedrooms: string;
  bathrooms: string;
  items: DraftItem[];
};

const blankItem = (): DraftItem => ({ area: "", category: "", title: "", required: true, photoRecommended: false });
const blankDraft = (): Draft => ({ id: null, name: "", description: "", bedrooms: "", bathrooms: "", items: [blankItem()] });
const fromTemplate = (template: PropertyScopeTemplate): Draft => ({
  id: template.id,
  name: template.name,
  description: template.description,
  bedrooms: template.bedrooms == null ? "" : String(template.bedrooms),
  bathrooms: template.bathrooms == null ? "" : String(template.bathrooms),
  items: template.items.map((item) => ({
    itemKey: item.itemKey,
    area: item.area,
    category: item.category,
    title: item.title,
    required: item.required,
    photoRecommended: item.photoRecommended,
  })),
});

export function ScopeTemplatesDialog({ property, onClose }: { property: AdminPropertySummary; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["admin-property-templates", property.id],
    queryFn: () => api<{ templates: PropertyScopeTemplate[] }>(`/api/admin/properties/${property.id}/templates`),
  });
  const selected = query.data?.templates.find((template) => template.id === selectedId) ?? null;

  useEffect(() => {
    if (!query.data || selectedId) return;
    const first = query.data.templates.find((template) => template.status === "active") ?? query.data.templates[0];
    if (first) setSelectedId(first.id);
  }, [query.data, selectedId]);
  useEffect(() => {
    if (selected) setDraft(fromTemplate(selected));
  }, [selected]);

  const publish = useMutation({
    mutationFn: () => api<{ template: PropertyScopeTemplate }>(
      draft.id
        ? `/api/admin/properties/${property.id}/templates/${draft.id}`
        : `/api/admin/properties/${property.id}/templates`,
      {
        method: draft.id ? "PUT" : "POST",
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          bedrooms: draft.bedrooms === "" ? null : Number(draft.bedrooms),
          bathrooms: draft.bathrooms === "" ? null : Number(draft.bathrooms),
          items: draft.items,
        }),
      },
    ),
    onSuccess: async ({ template }) => {
      setSelectedId(template.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-property-templates", property.id] }),
        queryClient.invalidateQueries({ queryKey: ["turn-templates", property.id] }),
      ]);
    },
  });
  const archive = useMutation({
    mutationFn: (templateId: string) => api<{ template: PropertyScopeTemplate }>(
      `/api/admin/properties/${property.id}/templates/${templateId}/archive`, { method: "POST" },
    ),
    onSuccess: async () => {
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-property-templates", property.id] });
    },
  });

  const setItem = (index: number, patch: Partial<DraftItem>) => setDraft({
    ...draft,
    items: draft.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  });
  const moveItem = (index: number, offset: number) => {
    const next = [...draft.items];
    const destination = index + offset;
    if (destination < 0 || destination >= next.length) return;
    const current = next[index]!;
    next[index] = next[destination]!;
    next[destination] = current;
    setDraft({ ...draft, items: next });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (draft.items.some((item) => !item.area.trim() || !item.category.trim() || !item.title.trim())) {
      setError("Every scope item needs an area, category, and task");
      return;
    }
    try { await publish.mutateAsync(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Template could not be published"); }
  };

  return <DetailModal eyebrow={`${property.name} administration`} title="Templates" icon={ClipboardList} labelledBy="property-templates-title" onClose={onClose} className="scope-template-modal">
    <div className="scope-template-workspace">
      <aside className="scope-template-list">
        <header><span><strong>{query.data?.templates.length ?? 0}</strong> scope templates</span><button className="button button--small button--secondary" onClick={() => { setSelectedId(null); setDraft(blankDraft()); }}><Plus />New</button></header>
        {query.data?.templates.map((template) => <button className={template.id === selectedId ? "active" : ""} onClick={() => setSelectedId(template.id)} key={template.id}>
          <span><strong>{template.name}</strong><small>{template.bedrooms ?? "Any"} bd / {template.bathrooms ?? "Any"} ba</small></span>
          <span><b>v{template.version}</b><small>{template.itemCount} items</small></span>
        </button>)}
      </aside>
      <form className="scope-template-editor" onSubmit={submit}>
        <section className="scope-template-basics">
          <div className="section-title"><div><p className="eyebrow">Shared inspection and Make Ready scope</p><h3>{draft.id ? `Publish a new version` : "Create a template"}</h3></div>{selected?.status === "archived" && <span className="badge badge--neutral">Archived</span>}</div>
          <div className="form-grid">
            <label className="field field--full"><span>Template name</span><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label className="field"><span>Bedrooms <small>Blank matches any</small></span><input type="number" min="0" max="20" value={draft.bedrooms} onChange={(event) => setDraft({ ...draft, bedrooms: event.target.value })} /></label>
            <label className="field"><span>Bathrooms <small>Blank matches any</small></span><input type="number" min="0" max="20" step="0.5" value={draft.bathrooms} onChange={(event) => setDraft({ ...draft, bathrooms: event.target.value })} /></label>
            <label className="field field--full"><span>Description</span><textarea rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          </div>
        </section>
        <section className="scope-item-editor">
          <header><div><p className="eyebrow">Ordered checklist</p><h3>Scope items</h3></div><button type="button" className="button button--small button--secondary" onClick={() => setDraft({ ...draft, items: [...draft.items, blankItem()] })}><Plus />Add item</button></header>
          <div className="scope-item-labels"><span>Area</span><span>Category</span><span>Inspection and work item</span><span>Rules</span><span /></div>
          {draft.items.map((item, index) => <div className="scope-item-row" key={`${item.itemKey ?? "new"}-${index}`}>
            <input aria-label={`Area ${index + 1}`} value={item.area} onChange={(event) => setItem(index, { area: event.target.value })} />
            <input aria-label={`Category ${index + 1}`} value={item.category} onChange={(event) => setItem(index, { category: event.target.value })} />
            <input aria-label={`Task ${index + 1}`} value={item.title} onChange={(event) => setItem(index, { title: event.target.value })} />
            <span className="scope-item-rules"><label><input type="checkbox" checked={item.required} onChange={(event) => setItem(index, { required: event.target.checked })} /> Required</label><label><input type="checkbox" checked={item.photoRecommended} onChange={(event) => setItem(index, { photoRecommended: event.target.checked })} /> Photo helpful</label></span>
            <span className="scope-item-actions"><button type="button" className="icon-button" onClick={() => moveItem(index, -1)} disabled={index === 0}><ArrowUp /></button><button type="button" className="icon-button" onClick={() => moveItem(index, 1)} disabled={index === draft.items.length - 1}><ArrowDown /></button><button type="button" className="icon-button icon-button--danger" disabled={draft.items.length === 1} onClick={() => setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 /></button></span>
          </div>)}
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
        <footer className="scope-template-footer">
          <p>Publishing creates an immutable version. Existing inspections and turns retain their original scope.</p>
          {selected?.status === "active" && <button type="button" className="button button--ghost" disabled={archive.isPending} onClick={() => archive.mutate(selected.id)}><Archive />Archive</button>}
          <button className="button button--primary" disabled={publish.isPending}><Save />{publish.isPending ? "Publishing…" : draft.id ? "Publish new version" : "Publish template"}</button>
        </footer>
      </form>
    </div>
  </DetailModal>;
}
