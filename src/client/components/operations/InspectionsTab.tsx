import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, ClipboardPen, FileCheck2, Plus, X } from "lucide-react";
import type {
  InspectionCondition,
  InspectionDetail,
  InspectionItem,
  InspectionResponsibility,
  InspectionSummary,
  UnitSummary,
} from "../../../shared/contracts";
import { useAuth } from "../../contexts/AuthContext";
import { useProperty } from "../../contexts/PropertyContext";
import { api } from "../../lib/api";
import { AttachmentPanel } from "../AttachmentPanel";
import { DetailModal } from "../DetailModal";
import { AppSelect } from "../AppSelect";

const conditions: Array<{ value: InspectionCondition; label: string }> = [
  { value: "good", label: "Good" },
  { value: "wear", label: "Wear" },
  { value: "damage", label: "Damage" },
  { value: "missing", label: "Missing" },
];

export function InspectionsTab() {
  const { propertyId } = useProperty();
  const { can } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const query = useQuery({
    queryKey: ["inspections", propertyId],
    queryFn: () => api<{ inspections: InspectionSummary[] }>(`/api/properties/${propertyId}/inspections`),
    enabled: Boolean(propertyId),
  });
  return <section className="ops-section">
    <header className="ops-section__header"><div><p className="eyebrow">Move-out workflow</p><h2>Inspections</h2><p>Inspect the property scope once, preserve the findings, and carry it into Make Ready.</p></div>{can("inspections:manage") && <button className="button button--primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New inspection</button>}</header>
    <div className="inspection-grid">{query.data?.inspections.map((item) => <button className="inspection-card" key={item.id} onClick={() => setSelectedId(item.id)}><header><span className="unit-number">{item.unitNumber}</span><span className={`inspection-status inspection-status--${item.status}`}>{item.status}</span></header><strong>{item.type.replaceAll("_", " ")} inspection</strong><small>{formatDate(item.inspectionDate)} · {item.inspectorName ?? "Unassigned"}</small><div className="inspection-card__metrics"><span><b>{item.assessedItems}/{item.totalItems}</b><small>assessed</small></span><span><b className={item.damageItems ? "text-danger" : ""}>{item.damageItems}</b><small>findings</small></span><span><b>${item.estimatedCharges.toFixed(0)}</b><small>resident</small></span></div><div className="inspection-card__footer"><span>{item.generatedTurnId ? "Make Ready generated" : item.status === "complete" ? "Ready to generate work" : item.templateName ?? "Assessment in progress"}</span><ArrowRight size={15} /></div></button>)}</div>
    <InspectionDetailModal inspectionId={selectedId} onClose={() => setSelectedId(null)} />
    <CreateInspectionDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); setSelectedId(id); }} />
  </section>;
}

function InspectionDetailModal({ inspectionId, onClose }: { inspectionId: string | null; onClose: () => void }) {
  const { propertyId } = useProperty();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [photoConfirmOpen, setPhotoConfirmOpen] = useState(false);
  const query = useQuery({
    queryKey: ["inspection", inspectionId],
    queryFn: () => api<{ inspection: InspectionDetail }>(`/api/inspections/${inspectionId}`),
    enabled: Boolean(inspectionId),
  });
  const inspection = query.data?.inspection;
  const groups = useMemo(() => {
    const map = new Map<string, InspectionItem[]>();
    for (const item of inspection?.items ?? []) map.set(item.room, [...(map.get(item.room) ?? []), item]);
    return [...map.entries()];
  }, [inspection]);
  const apply = async (updated: InspectionDetail) => {
    queryClient.setQueryData(["inspection", inspectionId], { inspection: updated });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inspections", propertyId] }),
      queryClient.invalidateQueries({ queryKey: ["operations", propertyId] }),
    ]);
  };
  const itemMutation = useMutation({
    mutationFn: ({ item, patch }: { item: InspectionItem; patch: Partial<Pick<InspectionItem, "condition" | "responsibility" | "notes" | "costEstimate" | "severity">> }) =>
      api<{ inspection: InspectionDetail }>(`/api/inspections/${inspectionId}/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          condition: patch.condition ?? item.condition,
          responsibility: patch.responsibility ?? item.responsibility,
          notes: patch.notes === undefined ? item.notes : patch.notes,
          costEstimate: patch.costEstimate === undefined ? item.costEstimate : patch.costEstimate,
          severity: patch.severity === undefined ? item.severity : patch.severity,
        }),
      }),
    onSuccess: ({ inspection: updated }) => void apply(updated),
  });
  const actionMutation = useMutation({
    mutationFn: ({ action, confirmWithoutDamagePhotos = false }: { action: "complete" | "generate-turn"; confirmWithoutDamagePhotos?: boolean }) =>
      api<{ inspection: InspectionDetail }>(`/api/inspections/${inspectionId}/${action}`, {
        method: "POST",
        body: JSON.stringify(action === "complete" ? { confirmWithoutDamagePhotos } : {}),
      }),
    onSuccess: ({ inspection: updated }) => void apply(updated),
  });
  if (!inspectionId) return null;
  const action = async (value: "complete" | "generate-turn", confirmed = false) => {
    setError("");
    if (value === "complete" && !confirmed && inspection?.items.some((item) => item.condition === "damage" && !item.hasAttachments)) {
      setPhotoConfirmOpen(true);
      return;
    }
    try {
      await actionMutation.mutateAsync({ action: value, confirmWithoutDamagePhotos: confirmed });
      setPhotoConfirmOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update inspection");
    }
  };
  return <>
    <DetailModal eyebrow="Move-out inspection" title={`Unit ${inspection?.unitNumber ?? "…"}`} icon={ClipboardPen} labelledBy="inspection-detail-title" onClose={onClose} className="inspection-detail-modal">
      {!inspection ? <div className="page-loading"><span /><span /><span /></div> : <div className="inspection-detail-layout">
        <main className="inspection-detail-main"><section className="inspection-checklist">
          <div className="section-title"><div><p className="eyebrow">Condition assessment</p><h3>{inspection.templateName ?? "Inspection scope"}</h3></div><span>{inspection.assessedItems}/{inspection.totalItems}</span></div>
          {groups.map(([room, items]) => <div className="inspection-room" key={room}><h4>{room}<small>{items.filter((item) => item.condition !== "not_inspected").length}/{items.length}</small></h4>
            {items.map((item) => <article className={`inspection-line inspection-line--${item.condition}`} key={item.id}>
              <div className="inspection-line__title"><strong>{item.label}</strong><small>{item.category}</small></div>
              <div className="condition-buttons">{conditions.map((condition) => <button key={condition.value} className={item.condition === condition.value ? "active" : ""} disabled={!can("inspections:manage") || inspection.status !== "draft" || itemMutation.isPending} onClick={() => itemMutation.mutate({ item, patch: { condition: condition.value } })}>{condition.label}</button>)}</div>
              {["damage", "missing", "wear"].includes(item.condition) && <div className="finding-fields">
                <input className="finding-notes" aria-label={`${item.label} finding notes`} disabled={inspection.status !== "draft" || itemMutation.isPending} defaultValue={item.notes ?? ""} placeholder="Finding notes" onBlur={(event) => itemMutation.mutate({ item, patch: { notes: event.target.value || null } })} />
                <AppSelect compact ariaLabel={`${item.label} responsibility`} disabled={inspection.status !== "draft" || itemMutation.isPending} value={item.responsibility} onChange={(value) => itemMutation.mutate({ item, patch: { responsibility: value as InspectionResponsibility } })} options={[{ value: "undetermined", label: "Responsibility TBD" }, { value: "owner", label: "Owner" }, { value: "resident", label: "Resident" }]} />
                <label>$<input aria-label={`${item.label} estimate`} disabled={inspection.status !== "draft" || itemMutation.isPending} type="number" min="0" step="0.01" defaultValue={item.costEstimate ?? ""} placeholder="Estimate" onBlur={(event) => itemMutation.mutate({ item, patch: { costEstimate: event.target.value ? Number(event.target.value) : null } })} /></label>
                <div className="inspection-item-attachments"><AttachmentPanel propertyId={inspection.propertyId} entityType="inspection_item" entityId={item.id} canUpload={can("inspections:manage") && inspection.status === "draft"} onChanged={() => queryClient.invalidateQueries({ queryKey: ["inspection", inspectionId] })} /></div>
              </div>}
            </article>)}
          </div>)}
        </section></main>
        <aside className="inspection-detail-sidebar">
          <section className="inspection-hero"><span className={`inspection-status inspection-status--${inspection.status}`}>{inspection.status}</span><h3>{inspection.type.replaceAll("_", " ")}</h3><p>{formatDate(inspection.inspectionDate)} · {inspection.inspectorName}{inspection.templateVersion ? ` · scope v${inspection.templateVersion}` : ""}</p><div><span><strong>{inspection.assessedItems}/{inspection.totalItems}</strong><small>assessed</small></span><span><strong>{inspection.damageItems}</strong><small>findings</small></span><span><strong>${inspection.estimatedCharges.toFixed(0)}</strong><small>resident</small></span></div></section>
          {error && <p className="form-error drawer-error">{error}</p>}
          {can("inspections:manage") && <section className="drawer-actions">{inspection.status === "draft" && <button className="button button--primary" disabled={actionMutation.isPending} onClick={() => void action("complete")}><FileCheck2 size={16} />Complete inspection</button>}{inspection.status === "complete" && !inspection.generatedTurnId && can("turns:create") && <button className="button button--primary" disabled={actionMutation.isPending} onClick={() => void action("generate-turn")}><ClipboardPen size={16} />Generate Make Ready</button>}{inspection.generatedTurnId && <span className="success-note"><Check size={15} />Shared scope carried into Make Ready</span>}</section>}
          <AttachmentPanel propertyId={inspection.propertyId} entityType="inspection" entityId={inspection.id} canUpload={can("inspections:manage")} />
        </aside>
      </div>}
    </DetailModal>
    {photoConfirmOpen && <div className="modal-layer modal-layer--nested"><section className="dialog dialog--compact" role="alertdialog" aria-modal="true" aria-labelledby="damage-photo-title"><header className="dialog__header"><span className="dialog__icon dialog__icon--warning"><AlertTriangle /></span><div><p className="eyebrow">Damage documentation</p><h2 id="damage-photo-title">Complete without damage photos?</h2></div></header><div className="confirmation-copy"><p>One or more damaged items do not include a picture. Are you sure you do not wish to submit a picture before completing this inspection?</p><p>The inspection will still be valid, and this choice will not prevent the Make Ready from being generated.</p></div><footer className="dialog__footer confirmation-actions"><button className="button button--ghost" onClick={() => setPhotoConfirmOpen(false)}>Return to inspection</button><button className="button button--primary" disabled={actionMutation.isPending} onClick={() => void action("complete", true)}>Complete without pictures</button></footer></section></div>}
  </>;
}

function CreateInspectionDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const units = useQuery({ queryKey: ["units", propertyId], queryFn: () => api<{ units: UnitSummary[] }>(`/api/properties/${propertyId}/units`), enabled: open });
  const [form, setForm] = useState({ unitId: "", type: "final", inspectionDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api<{ inspection: InspectionDetail }>("/api/inspections", { method: "POST", body: JSON.stringify({ ...form, propertyId, notes: form.notes || null }) }),
    onSuccess: async ({ inspection }) => { await queryClient.invalidateQueries({ queryKey: ["inspections", propertyId] }); onCreated(inspection.id); },
  });
  if (!open) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try { await mutation.mutateAsync(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create inspection"); }
  };
  return <div className="modal-layer"><section className="dialog"><header className="dialog__header"><span className="dialog__icon"><ClipboardPen /></span><div><p className="eyebrow">Shared scope assessment</p><h2>New move-out inspection</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={submit}><div className="form-grid"><label className="field field--full"><span>Unit</span><AppSelect required searchable ariaLabel="Unit" value={form.unitId} onChange={(value) => setForm({ ...form, unitId: value })} options={[{ value: "", label: "Select unit" }, ...(units.data?.units.map((unit) => ({ value: unit.id, label: `Unit ${unit.unitNumber} · ${unit.floorPlanName} · ${unit.occupancyStatus}` })) ?? [])]} /></label><label className="field"><span>Inspection type</span><AppSelect ariaLabel="Inspection type" value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={[{ value: "pre_move_out", label: "Pre-move-out" }, { value: "final", label: "Final" }, { value: "other", label: "Other" }]} /></label><label className="field"><span>Inspection date</span><input type="date" required value={form.inspectionDate} onChange={(event) => setForm({ ...form, inspectionDate: event.target.value })} /></label><label className="field field--full"><span>Notes</span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div>{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={mutation.isPending}>Create inspection</button></footer></form></section></div>;
}

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
