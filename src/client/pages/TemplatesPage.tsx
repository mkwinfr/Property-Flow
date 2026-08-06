import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive, Check, ChevronDown, ClipboardList, Copy, Eye, FilePenLine, History, Mail,
  MoreVertical, Plus, RotateCcw, Save, Search, Trash2,
} from "lucide-react";
import type {
  PropertyScopeTemplate, ScopeTemplateDraft, ScopeTemplateVersion, TemplateFloorPlan,
} from "../../shared/contracts";
import { useAuth } from "../contexts/AuthContext";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";

type Library = { templates: PropertyScopeTemplate[]; drafts: ScopeTemplateDraft[]; floorPlans: TemplateFloorPlan[] };
type Edit = Omit<ScopeTemplateDraft, "updatedAt" | "updatedByName" | "propertyId">;
type LibraryItem = { kind: "draft" | "active" | "archived"; data: ScopeTemplateDraft | PropertyScopeTemplate };
type ContextMenu = LibraryItem & { x: number; y: number };

const blank = (): Edit => ({
  id: "", templateId: null, name: "Untitled template", description: "", bedrooms: null, bathrooms: null,
  floorPlanIds: [], items: [{ id: crypto.randomUUID(), itemKey: crypto.randomUUID(), area: "", category: "", title: "", sortOrder: 0, required: true, photoRecommended: false }],
});
const payload = (edit: Edit) => ({
  ...edit,
  items: edit.items.map(({ itemKey, area, category, title, required, photoRecommended }) => ({ itemKey, area, category, title, required, photoRecommended })),
});

export function TemplatesPage() {
  const { propertyId, property } = useProperty();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [edit, setEdit] = useState<Edit | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "archived">("all");
  const [view, setView] = useState<"details" | "checklist" | "preview" | "history">("details");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [collapsedRooms, setCollapsedRooms] = useState<Set<string>>(() => new Set());

  const query = useQuery({
    queryKey: ["template-center", propertyId], enabled: Boolean(propertyId),
    queryFn: () => api<Library>(`/api/admin/properties/${propertyId}/templates`),
  });
  const versions = useQuery({
    queryKey: ["template-versions", propertyId, selectedTemplate],
    enabled: Boolean(propertyId && selectedTemplate && view === "history"),
    queryFn: () => api<{ versions: ScopeTemplateVersion[] }>(`/api/admin/properties/${propertyId}/templates/${selectedTemplate}/versions`),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["template-center", propertyId] });

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("click", close); window.removeEventListener("resize", close); };
  }, []);

  const choose = (next: Edit, templateId: string | null) => {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setEdit(next); setSelectedTemplate(templateId); setDirty(false); setError(""); setView("details"); setContextMenu(null);
  };
  const chooseItem = ({ kind, data }: LibraryItem) => kind === "draft"
    ? choose(data as ScopeTemplateDraft, (data as ScopeTemplateDraft).templateId)
    : choose({ ...(data as PropertyScopeTemplate), id: "", templateId: data.id }, data.id);
  const openMenu = (event: MouseEvent, item: LibraryItem) => {
    event.preventDefault(); event.stopPropagation();
    setContextMenu({ ...item, x: Math.min(event.clientX, window.innerWidth - 190), y: Math.min(event.clientY, window.innerHeight - 190) });
  };
  const save = useMutation({
    mutationFn: () => api<{ draft: ScopeTemplateDraft }>(`/api/admin/properties/${propertyId}/template-drafts${edit?.id ? `/${edit.id}` : ""}`, {
      method: edit?.id ? "PUT" : "POST", body: JSON.stringify(payload(edit!)),
    }),
    onSuccess: async ({ draft }) => { setEdit(draft); setDirty(false); await refresh(); },
  });
  const action = useMutation({
    mutationFn: ({ url, method = "POST" }: { url: string; method?: string }) => api<any>(url, { method }),
    onSuccess: async (data) => {
      setDirty(false); setContextMenu(null);
      if (data?.draft) { setEdit(data.draft); setSelectedTemplate(data.draft.templateId); setView("details"); }
      else { setEdit(null); setSelectedTemplate(null); }
      await refresh();
    },
  });
  const mutate = (patch: Partial<Edit>) => { setEdit((current) => current ? { ...current, ...patch } : current); setDirty(true); };
  const items = useMemo<LibraryItem[]>(() => {
    const text = search.toLowerCase();
    return [
      ...(query.data?.drafts ?? []).map((data) => ({ kind: "draft" as const, data })),
      ...(query.data?.templates ?? []).map((data) => ({ kind: data.status, data })),
    ].filter(({ kind, data }) => (filter === "all" || kind === filter) && (!text || data.name.toLowerCase().includes(text) || data.description.toLowerCase().includes(text)));
  }, [query.data, search, filter]);
  const selectedPublished = query.data?.templates.find((template) => template.id === selectedTemplate);
  const rooms = useMemo(() => {
    const grouped = new Map<string, Edit["items"]>();
    for (const item of edit?.items ?? []) {
      const room = item.area.trim() || "Unassigned room";
      grouped.set(room, [...(grouped.get(room) ?? []), item]);
    }
    return [...grouped.entries()].map(([name, roomItems]) => ({ name, items: roomItems }));
  }, [edit?.items]);
  const addRoom = () => {
    if (!edit) return;
    let number = 1;
    let name = "New room";
    while (rooms.some((room) => room.name.toLowerCase() === name.toLowerCase())) name = `New room ${++number}`;
    mutate({ items: [...edit.items, { ...blank().items[0]!, area: name, sortOrder: edit.items.length }] });
  };
  const renameRoom = (oldName: string, name: string) => {
    if (!edit) return;
    mutate({ items: edit.items.map((item) => (item.area.trim() || "Unassigned room") === oldName ? { ...item, area: name } : item) });
  };
  const removeRoom = (name: string) => {
    if (!edit || !window.confirm(`Remove “${name}” and all of its checklist items?`)) return;
    const remaining = edit.items.filter((item) => (item.area.trim() || "Unassigned room") !== name);
    mutate({ items: remaining.length ? remaining : [{ ...blank().items[0]!, area: "New room" }] });
  };
  const addRoomItem = (room: string) => {
    if (!edit) return;
    mutate({ items: [...edit.items, { ...blank().items[0]!, area: room, sortOrder: edit.items.length }] });
  };
  const toggleRoom = (room: string) => setCollapsedRooms((current) => {
    const next = new Set(current);
    if (next.has(room)) next.delete(room); else next.add(room);
    return next;
  });
  const submit = async () => {
    setError("");
    if (!edit?.name.trim() || edit.items.some((item) => !item.area.trim() || !item.category.trim() || !item.title.trim())) {
      setError("Add a name and complete the area, category, and task for every item."); return;
    }
    try { await save.mutateAsync(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Draft could not be saved"); }
  };
  const runContextAction = (name: "edit" | "duplicate" | "archive" | "delete") => {
    if (!contextMenu) return;
    const { kind, data } = contextMenu;
    if (name === "edit") chooseItem(contextMenu);
    if (name === "duplicate" && kind !== "draft") action.mutate({ url: `/api/admin/properties/${propertyId}/templates/${data.id}/duplicate` });
    if (name === "archive" && kind !== "draft") action.mutate({ url: `/api/admin/properties/${propertyId}/templates/${data.id}/${kind === "active" ? "archive" : "reactivate"}` });
    if (name === "delete" && kind === "draft" && window.confirm(`Delete the draft “${data.name}”?`)) action.mutate({ url: `/api/admin/properties/${propertyId}/template-drafts/${data.id}`, method: "DELETE" });
  };

  if (!propertyId) return <div className="empty-state">Choose a property to manage its templates.</div>;
  return <div className="template-center">
    <header className="page-header template-center__heading">
      <div><h1>Template Center</h1><p className="eyebrow template-center__subtitle">Build, review, and publish consistent workflows for {property?.name}.</p></div>
      {can("templates:manage") && <button className="button button--primary" onClick={() => choose(blank(), null)}><Plus />New template</button>}
    </header>
    <div className="template-family-strip">
      <button className="template-family template-family--active"><ClipboardList /><span><strong>Make Ready Templates</strong><small>Shared inspection and Make Ready scope</small></span><Check /></button>
      <div className="template-family template-family--future"><Mail /><span><strong>Resident messaging</strong><small>Announcements and resident campaigns</small></span><b>Future</b></div>
    </div>
    <div className="template-center__grid">
      <aside className="template-library">
        <div className="template-search"><Search /><input aria-label="Search templates" placeholder="Search templates" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="template-filters">{(["all", "active", "draft", "archived"] as const).map((item) => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
        <p className="template-library__hint">Right-click a template for more actions</p>
        <div className="template-library__items">{items.map((item) => {
          const { kind, data } = item;
          return <div className={`template-library-row ${(edit?.id === data.id || selectedTemplate === data.id) ? "active" : ""}`} key={`${kind}-${data.id}`} onContextMenu={(event) => openMenu(event, item)}>
            <button className="template-library-row__select" onClick={() => chooseItem(item)}><span><strong>{data.name}</strong><small>{data.items.length} items · {data.bedrooms ?? "Any"} bd / {data.bathrooms ?? "Any"} ba</small></span><b className={`template-state template-state--${kind}`}>{kind}</b></button>
            {can("templates:manage") && <button className="template-library-row__menu" aria-label={`Actions for ${data.name}`} onClick={(event) => openMenu(event, item)}><MoreVertical /></button>}
          </div>;
        })}{!items.length && <p className="muted">No templates match this view.</p>}</div>
      </aside>
      <main className="template-editor">{!edit ? <div className="template-welcome"><ClipboardList /><h2>Select a template</h2><p>Choose a template from the library or create a new one.</p></div> : <>
        <header className="template-editor__header">
          <div><p className="eyebrow">{edit.id ? "Saved draft" : selectedPublished ? `Published · Version ${selectedPublished.version}` : "New template"}</p><h2>{edit.name}</h2><p>{edit.items.length} checklist items{dirty ? " · Unsaved changes" : ""}</p></div>
          <div className="template-toolbar">{selectedPublished && <><button className={`button button--small ${view === "preview" ? "button--primary" : "button--secondary"}`} onClick={() => setView("preview")}><Eye />Preview</button><button className={`button button--small ${view === "history" ? "button--primary" : "button--secondary"}`} onClick={() => setView("history")}><History />History</button></>}</div>
        </header>
        <nav className="template-editor-tabs" aria-label="Template editor sections"><button className={view === "details" ? "active" : ""} onClick={() => setView("details")}><FilePenLine />Template details</button><button className={view === "checklist" ? "active" : ""} onClick={() => setView("checklist")}><ClipboardList />Checklist <b>{edit.items.length}</b></button></nav>
        {view === "details" && <section className="template-form">
          <div className="template-section-intro"><h3>Template details</h3><p>Name the template and control which units use it.</p></div>
          <label className="field field--full"><span>Template name</span><input disabled={!can("templates:manage")} value={edit.name} onChange={(event) => mutate({ name: event.target.value })} /></label>
          <label className="field field--full"><span>Description</span><textarea disabled={!can("templates:manage")} rows={2} value={edit.description} onChange={(event) => mutate({ description: event.target.value })} /></label>
          <div className="template-match-fields"><label className="field"><span>Fallback bedrooms</span><input disabled={!can("templates:manage")} type="number" value={edit.bedrooms ?? ""} onChange={(event) => mutate({ bedrooms: event.target.value === "" ? null : Number(event.target.value) })} /></label><label className="field"><span>Fallback bathrooms</span><input disabled={!can("templates:manage")} type="number" step="0.5" value={edit.bathrooms ?? ""} onChange={(event) => mutate({ bathrooms: event.target.value === "" ? null : Number(event.target.value) })} /></label></div>
          <fieldset className="floor-plan-picker"><legend>Exact floor-plan assignments</legend><p>Exact assignments take priority over the bedroom and bathroom fallback.</p>{query.data?.floorPlans.map((floorPlan) => <label key={floorPlan.id}><input disabled={!can("templates:manage")} type="checkbox" checked={edit.floorPlanIds.includes(floorPlan.id)} onChange={(event) => mutate({ floorPlanIds: event.target.checked ? [...edit.floorPlanIds, floorPlan.id] : edit.floorPlanIds.filter((id) => id !== floorPlan.id) })} />{floorPlan.name}<small>{floorPlan.bedrooms} bd / {floorPlan.bathrooms} ba</small></label>)}</fieldset>
        </section>}
        {view === "checklist" && <section className="template-checklist">
          <header><div><h3>Rooms and checklist items</h3><p>Organize tasks by room so each floor plan is easy to tailor.</p></div>{can("templates:manage") && <button className="button button--small button--secondary" onClick={addRoom}><Plus />Add room</button>}</header>
          <div className="template-rooms">{rooms.map((room) => <section className={`template-room ${collapsedRooms.has(room.name) ? "template-room--collapsed" : ""}`} key={room.name}>
            <header className="template-room__header"><button className="template-room__toggle" aria-label={`${collapsedRooms.has(room.name) ? "Expand" : "Collapse"} ${room.name}`} onClick={() => toggleRoom(room.name)}><ChevronDown /></button><label><span>Room</span><input aria-label={`Room name ${room.name}`} disabled={!can("templates:manage")} value={room.name === "Unassigned room" ? "" : room.name} placeholder="Room name" onChange={(event) => renameRoom(room.name, event.target.value)} /></label><span>{room.items.length} {room.items.length === 1 ? "item" : "items"}</span>{can("templates:manage") && <button className="icon-button icon-button--danger" aria-label={`Remove room ${room.name}`} onClick={() => removeRoom(room.name)}><Trash2 /></button>}</header>
            {!collapsedRooms.has(room.name) && <div className="template-room__body"><div className="template-room__labels"><span>#</span><span>Inspection and work item</span><span>Category</span><span>Rule</span><span /></div>
            {room.items.map((item, roomItemIndex) => { const index = edit.items.findIndex((current) => current.id === item.id); return <div className="template-item template-item--room" key={item.id}><b>{roomItemIndex + 1}</b><input className="template-item__work" disabled={!can("templates:manage")} aria-label={`Task ${index + 1}`} placeholder="Inspection and work item" value={item.title} onChange={(event) => mutate({ items: edit.items.map((current, itemIndex) => itemIndex === index ? { ...current, title: event.target.value } : current) })} /><input className="template-item__category" disabled={!can("templates:manage")} aria-label={`Category ${index + 1}`} placeholder="Category" value={item.category} onChange={(event) => mutate({ items: edit.items.map((current, itemIndex) => itemIndex === index ? { ...current, category: event.target.value } : current) })} /><label><input disabled={!can("templates:manage")} type="checkbox" checked={item.required} onChange={(event) => mutate({ items: edit.items.map((current, itemIndex) => itemIndex === index ? { ...current, required: event.target.checked } : current) })} />Required</label>{can("templates:manage") && <button className="icon-button icon-button--danger" aria-label={`Delete item ${index + 1}`} disabled={edit.items.length === 1} onClick={() => mutate({ items: edit.items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 /></button>}</div>; })}
            {can("templates:manage") && <button className="template-room__add" onClick={() => addRoomItem(room.name)}><Plus />Add item to {room.name}</button>}</div>}
          </section>)}</div>
        </section>}
        {view === "preview" && <div className="template-preview"><p className="eyebrow">Checklist preview</p><h3>{edit.name}</h3><p>{edit.description || "No description"}</p>{edit.items.map((item, index) => <div key={item.id}><span>{index + 1}</span><p><strong>{item.title}</strong><small>{item.area} · {item.category}{item.required ? " · Required" : ""}</small></p></div>)}</div>}
        {view === "history" && <section className="template-history"><h3>Version history</h3><p>Published versions are permanent records. Restore one to create an editable draft.</p>{versions.data?.versions.map((version) => <div key={version.id}><span><strong>Version {version.version}</strong><small>{new Date(version.publishedAt).toLocaleString()} · {version.publishedByName ?? "Unknown"}</small></span>{can("templates:manage") && <button className="button button--small button--secondary" onClick={() => action.mutate({ url: `/api/admin/properties/${propertyId}/templates/${selectedTemplate}/versions/${version.id}/restore` })}><RotateCcw />Restore as draft</button>}</div>)}</section>}
        {error && <p className="form-error">{error}</p>}
        {can("templates:manage") && <footer className="template-editor__footer"><p>{edit.id ? "This draft is not live until published." : selectedPublished ? "Editing creates a safe draft first." : "Save this template as a draft to continue."}</p><span /><button className="button button--secondary" disabled={save.isPending} onClick={submit}><Save />Save draft</button>{edit.id && <button className="button button--primary" onClick={() => action.mutate({ url: `/api/admin/properties/${propertyId}/template-drafts/${edit.id}/publish` })}>Publish version</button>}</footer>}
      </>}</main>
    </div>
    {contextMenu && <div className="template-context-menu" role="menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
      <button role="menuitem" onClick={() => runContextAction("edit")}><FilePenLine />Open and edit</button>
      {contextMenu.kind !== "draft" && <button role="menuitem" onClick={() => runContextAction("duplicate")}><Copy />Duplicate as draft</button>}
      {contextMenu.kind !== "draft" && <button role="menuitem" onClick={() => runContextAction("archive")}><Archive />{contextMenu.kind === "active" ? "Archive" : "Reactivate"}</button>}
      {contextMenu.kind === "draft" && <button role="menuitem" className="danger" onClick={() => runContextAction("delete")}><Trash2 />Delete draft</button>}
    </div>}
  </div>;
}
