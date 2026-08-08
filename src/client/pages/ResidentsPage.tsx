import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, Users, X, FileText } from "lucide-react";
import type { HouseholdSummary, LeaseSummary, ResidentSummary, UnitSummary } from "../../shared/contracts";
import { AttachmentPanel } from "../components/AttachmentPanel";
import { EmptyState } from "../components/EmptyState";
import { AppSelect } from "../components/AppSelect";
import { useAuth } from "../contexts/AuthContext";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";

export function ResidentsPage() {
  const { property, propertyId } = useProperty();
  const { can } = useAuth();
  const [tab, setTab] = useState<"residents" | "leases">("residents");
  const [residentOpen, setResidentOpen] = useState(false);
  const [leaseOpen, setLeaseOpen] = useState(false);
  const [leaseDocs, setLeaseDocs] = useState<LeaseSummary | null>(null);
  const [portalUploads, setPortalUploads] = useState<ResidentSummary | null>(null);
  const residents = useQuery({ queryKey: ["residents", propertyId], queryFn: () => api<{ residents: ResidentSummary[] }>(`/api/properties/${propertyId}/residents`), enabled: Boolean(propertyId) });
  const leases = useQuery({ queryKey: ["leases", propertyId], queryFn: () => api<{ leases: LeaseSummary[] }>(`/api/properties/${propertyId}/leases`), enabled: Boolean(propertyId) });

  return <div className="page-stack">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Residents & leases</h1><p>Household records, occupancy, and lease context for operations.</p></div>{can("residents:manage") && tab === "residents" && <button className="button button--primary" onClick={() => setResidentOpen(true)}><Plus size={16} />Add resident</button>}{can("leases:manage") && tab === "leases" && <button className="button button--primary" onClick={() => setLeaseOpen(true)}><Plus size={16} />Add lease</button>}</section>
    <section className="toolbar"><div className="segmented-control">{(["residents", "leases"] as const).map((value) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value}</button>)}</div></section>
    {tab === "residents" ? <section className="panel table-panel">
      {residents.data?.residents.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Contact</th><th>Household</th><th>Unit</th><th>Status</th><th></th></tr></thead><tbody>
        {residents.data.residents.map((resident) => <tr key={resident.id}><td><strong>{resident.firstName} {resident.lastName}</strong></td><td className="muted">{resident.email ?? resident.phone ?? "—"}</td><td>{resident.householdName ?? "—"}</td><td>{resident.currentUnitNumber ? `Unit ${resident.currentUnitNumber}` : "—"}</td><td>{resident.status}</td><td className="resident-row-actions">{can("residents:view") && resident.householdId && <button className="button button--ghost button--small" onClick={() => setPortalUploads(resident)}><Upload size={14} />Portal uploads</button>}</td></tr>)}
      </tbody></table></div> : <EmptyState icon={Users} title="No residents yet" detail="Resident records will appear here once households are created." />}
    </section> : <section className="panel table-panel">
      {leases.data?.leases.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Unit</th><th>Household</th><th>Residents</th><th>Rent</th><th>Status</th><th>Term</th><th></th></tr></thead><tbody>
        {leases.data.leases.map((lease) => <tr key={lease.id}><td><span className="unit-number">{lease.unitNumber}</span></td><td>{lease.householdName ?? "—"}</td><td className="muted">{lease.residentNames || "—"}</td><td>${lease.monthlyRent.toLocaleString()}</td><td>{lease.status}</td><td className="muted">{lease.startDate}{lease.endDate ? ` → ${lease.endDate}` : ""}</td><td>{can("leases:view") && <button className="button button--ghost button--small" onClick={() => setLeaseDocs(lease)}><FileText size={14} />Documents</button>}</td></tr>)}
      </tbody></table></div> : <EmptyState icon={Users} title="No leases yet" detail="Active and historical leases will appear here." />}
    </section>}
    {residentOpen && <CreateResidentDialog onClose={() => setResidentOpen(false)} />}
    {leaseOpen && <CreateLeaseDialog onClose={() => setLeaseOpen(false)} />}
    {leaseDocs && propertyId && <LeaseDocumentsDialog lease={leaseDocs} propertyId={propertyId} canUpload={can("leases:manage")} onClose={() => setLeaseDocs(null)} />}
    {portalUploads?.householdId && propertyId && <PortalUploadsDialog resident={portalUploads} propertyId={propertyId} onClose={() => setPortalUploads(null)} />}
  </div>;
}

function CreateResidentDialog({ onClose }: { onClose: () => void }) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", preferredContact: "email" as "email" | "phone" | "sms", status: "active" as "active" | "former" | "applicant", householdName: "", notes: "" });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api("/api/residents", { method: "POST", body: JSON.stringify({ propertyId, firstName: form.firstName, lastName: form.lastName, email: form.email || null, phone: form.phone || null, preferredContact: form.preferredContact, status: form.status, householdName: form.householdName || null, notes: form.notes || null }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["residents", propertyId] }); onClose(); },
  });
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); try { await mutation.mutateAsync(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create resident"); } };
  return <DialogShell title="Add resident" onClose={onClose} onSubmit={submit} error={error} pending={mutation.isPending} submitLabel="Create resident"><div className="form-grid"><label className="field"><span>First name</span><input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label><label className="field"><span>Last name</span><input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label><label className="field"><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="field"><span>Phone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="field"><span>Preferred contact</span><AppSelect ariaLabel="Preferred contact" value={form.preferredContact} onChange={(value) => setForm({ ...form, preferredContact: value as typeof form.preferredContact })} options={[{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }, { value: "sms", label: "SMS" }]} /></label><label className="field"><span>Status</span><AppSelect ariaLabel="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value as typeof form.status })} options={[{ value: "active", label: "Active" }, { value: "applicant", label: "Applicant" }, { value: "former", label: "Former" }]} /></label><label className="field field--full"><span>Household name</span><input value={form.householdName} onChange={(e) => setForm({ ...form, householdName: e.target.value })} placeholder="Optional — creates a household if provided" /></label><label className="field field--full"><span>Notes</span><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label></div></DialogShell>;
}

function CreateLeaseDialog({ onClose }: { onClose: () => void }) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const units = useQuery({ queryKey: ["units", propertyId], queryFn: () => api<{ units: UnitSummary[] }>(`/api/properties/${propertyId}/units`), enabled: Boolean(propertyId) });
  const households = useQuery({ queryKey: ["households", propertyId], queryFn: () => api<{ households: HouseholdSummary[] }>(`/api/properties/${propertyId}/households`), enabled: Boolean(propertyId) });
  const [form, setForm] = useState({ unitId: "", householdId: "", startDate: new Date().toISOString().slice(0, 10), endDate: "", monthlyRent: "1500", status: "active" as LeaseSummary["status"], moveInDate: "", notes: "" });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api("/api/leases", { method: "POST", body: JSON.stringify({ propertyId, unitId: form.unitId, householdId: form.householdId || null, startDate: form.startDate, endDate: form.endDate || null, monthlyRent: Number(form.monthlyRent), status: form.status, moveInDate: form.moveInDate || null, notes: form.notes || null }) }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["leases", propertyId] }), queryClient.invalidateQueries({ queryKey: ["residents", propertyId] })]); onClose(); },
  });
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); if (!form.unitId) return setError("Select a unit."); try { await mutation.mutateAsync(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create lease"); } };
  return <DialogShell title="Add lease" onClose={onClose} onSubmit={submit} error={error} pending={mutation.isPending} submitLabel="Create lease"><div className="form-grid"><label className="field"><span>Unit</span><AppSelect required ariaLabel="Unit" value={form.unitId} onChange={(value) => setForm({ ...form, unitId: value })} options={[{ value: "", label: "Select unit" }, ...(units.data?.units.map((unit) => ({ value: unit.id, label: `Unit ${unit.unitNumber}` })) ?? [])]} /></label><label className="field"><span>Household</span><AppSelect ariaLabel="Household" value={form.householdId} onChange={(value) => setForm({ ...form, householdId: value })} options={[{ value: "", label: "No household" }, ...(households.data?.households.map((household) => ({ value: household.id, label: household.name })) ?? [])]} /></label><label className="field"><span>Start date</span><input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label><label className="field"><span>End date</span><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label><label className="field"><span>Monthly rent</span><input type="number" min="0" required value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} /></label><label className="field"><span>Status</span><AppSelect ariaLabel="Lease status" value={form.status} onChange={(value) => setForm({ ...form, status: value as LeaseSummary["status"] })} options={["draft", "active", "notice", "ended", "cancelled"].map((value) => ({ value, label: value }))} /></label><label className="field"><span>Move-in date</span><input type="date" value={form.moveInDate} onChange={(e) => setForm({ ...form, moveInDate: e.target.value })} /></label><label className="field field--full"><span>Notes</span><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label></div></DialogShell>;
}

function DialogShell({ title, onClose, onSubmit, error, pending, submitLabel, children }: { title: string; onClose: () => void; onSubmit: (event: FormEvent) => void; error: string; pending: boolean; submitLabel: string; children: ReactNode }) {
  return <div className="modal-layer"><section className="dialog"><header className="dialog__header"><span className="dialog__icon"><Users /></span><div><p className="eyebrow">Residents</p><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={onSubmit}>{children}{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button></footer></form></section></div>;
}

function LeaseDocumentsDialog({ lease, propertyId, canUpload, onClose }: { lease: LeaseSummary; propertyId: string; canUpload: boolean; onClose: () => void }) {
  return <div className="modal-layer"><section className="dialog dialog--wide"><header className="dialog__header"><span className="dialog__icon"><FileText /></span><div><p className="eyebrow">Lease documents</p><h2>Unit {lease.unitNumber}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><AttachmentPanel propertyId={propertyId} entityType="lease" entityId={lease.id} canUpload={canUpload} /><footer className="dialog__footer"><button type="button" className="button button--primary" onClick={onClose}>Done</button></footer></section></div>;
}

function PortalUploadsDialog({ resident, propertyId, onClose }: { resident: ResidentSummary; propertyId: string; onClose: () => void }) {
  return <div className="modal-layer"><section className="dialog dialog--wide"><header className="dialog__header"><span className="dialog__icon"><Upload /></span><div><p className="eyebrow">Portal uploads</p><h2>{resident.firstName} {resident.lastName}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><AttachmentPanel propertyId={propertyId} entityType="household" entityId={resident.householdId!} canUpload={false} /><footer className="dialog__footer"><button type="button" className="button button--primary" onClick={onClose}>Done</button></footer></section></div>;
}
