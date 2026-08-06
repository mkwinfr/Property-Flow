import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ClipboardPlus, X } from "lucide-react";
import type { TurnDetail, TurnPriority, TurnTemplateSummary, UnitSummary } from "../../shared/contracts";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";
import { AppSelect } from "./AppSelect";

export function CreateTurnDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (turn: TurnDetail) => void }) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const unitsQuery = useQuery({ queryKey: ["units", propertyId], queryFn: () => api<{ units: UnitSummary[] }>(`/api/properties/${propertyId}/units`), enabled: open && Boolean(propertyId) });
  const templatesQuery = useQuery({ queryKey: ["turn-templates", propertyId], queryFn: () => api<{ templates: TurnTemplateSummary[] }>(`/api/properties/${propertyId}/turn-templates`), enabled: open && Boolean(propertyId) });
  const [unitId, setUnitId] = useState("");
  const [templateVersionId, setTemplateVersionId] = useState("");
  const [priority, setPriority] = useState<TurnPriority>("normal");
  const [moveOutDate, setMoveOutDate] = useState("");
  const [targetReadyDate, setTargetReadyDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const availableUnits = useMemo(() => (unitsQuery.data?.units ?? []).filter((unit) => !unit.activeTurnId), [unitsQuery.data]);
  const selectedUnit = availableUnits.find((unit) => unit.id === unitId);

  useEffect(() => {
    if (!selectedUnit) return;
    const matching = templatesQuery.data?.templates.find(
      (template) => template.bedrooms === selectedUnit.bedrooms && (template.bathrooms === null || template.bathrooms === selectedUnit.bathrooms),
    );
    if (matching) setTemplateVersionId(matching.versionId);
  }, [selectedUnit, templatesQuery.data]);

  const mutation = useMutation({
    mutationFn: () => api<{ turn: TurnDetail }>("/api/turns", { method: "POST", body: JSON.stringify({ propertyId, unitId, templateVersionId, priority, moveOutDate: moveOutDate || null, targetReadyDate: targetReadyDate || null, notes: notes || null }) }),
    onSuccess: async ({ turn }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["turns", propertyId] }),
        queryClient.invalidateQueries({ queryKey: ["units", propertyId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", propertyId] }),
      ]);
      onCreated(turn);
      onClose();
    },
  });
  if (!open) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    try { await mutation.mutateAsync(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create turn"); }
  };

  return <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="create-turn-title">
      <header className="dialog__header"><span className="dialog__icon"><ClipboardPlus /></span><div><p className="eyebrow">New make-ready</p><h2 id="create-turn-title">Plan a unit turn</h2></div><button className="icon-button" onClick={onClose}><X /></button></header>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="field field--full"><span>Unit</span><AppSelect required searchable ariaLabel="Unit" value={unitId} onChange={setUnitId} options={[{ value: "", label: "Select an available unit" }, ...availableUnits.map((unit) => ({ value: unit.id, label: `Unit ${unit.unitNumber} · ${unit.floorPlanName} · ${unit.occupancyStatus}` }))]} /></label>
          <label className="field field--full"><span>Published work template</span><AppSelect required searchable ariaLabel="Published work template" value={templateVersionId} onChange={setTemplateVersionId} options={[{ value: "", label: "Select a template" }, ...(templatesQuery.data?.templates.map((template) => ({ value: template.versionId, label: `${template.name} · v${template.version} · ${template.itemCount} items` })) ?? [])]} />{selectedUnit && templateVersionId && <small className="field-hint"><Check size={13} /> Best match selected from the unit floor plan</small>}</label>
          <label className="field"><span><CalendarDays size={14} /> Move-out date</span><input type="date" value={moveOutDate} onChange={(event) => setMoveOutDate(event.target.value)} /></label>
          <label className="field"><span><CalendarDays size={14} /> Target ready</span><input type="date" value={targetReadyDate} onChange={(event) => setTargetReadyDate(event.target.value)} /></label>
          <label className="field"><span>Priority</span><AppSelect ariaLabel="Priority" value={priority} onChange={(value) => setPriority(value as TurnPriority)} options={[{ value: "normal", label: "Normal" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" }, { value: "low", label: "Low" }]} /></label>
          <label className="field field--full"><span>Access or planning notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Optional context the team needs before work begins" /></label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={mutation.isPending || !unitId || !templateVersionId}>{mutation.isPending ? "Creating…" : "Create turn"}</button></footer>
      </form>
    </section>
  </div>;
}
