import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, FileText, Handshake, Plus, X } from "lucide-react";
import type { ApplicationSummary, ProspectStage, ProspectSummary, TourSummary, UnitSummary } from "../../shared/contracts";
import { EmptyState } from "../components/EmptyState";
import { AppSelect } from "../components/AppSelect";
import { useAuth } from "../contexts/AuthContext";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";

const stages: ProspectStage[] = ["inquiry", "contacted", "tour_scheduled", "tour_completed", "application", "approved", "leased", "lost"];
const nextStage: Partial<Record<ProspectStage, ProspectStage>> = {
  inquiry: "contacted", contacted: "tour_scheduled", tour_scheduled: "tour_completed",
  tour_completed: "application", application: "approved", approved: "leased",
};

export function LeasingPage() {
  const { property, propertyId } = useProperty();
  const { can } = useAuth();
  const [tab, setTab] = useState<"pipeline" | "tours" | "applications">("pipeline");
  const [prospectOpen, setProspectOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState(false);
  const queryClient = useQueryClient();
  const prospects = useQuery({ queryKey: ["prospects", propertyId], queryFn: () => api<{ prospects: ProspectSummary[] }>(`/api/properties/${propertyId}/prospects`), enabled: Boolean(propertyId) });
  const tours = useQuery({ queryKey: ["tours", propertyId], queryFn: () => api<{ tours: TourSummary[] }>(`/api/properties/${propertyId}/tours`), enabled: Boolean(propertyId) });
  const applications = useQuery({ queryKey: ["applications", propertyId], queryFn: () => api<{ applications: ApplicationSummary[] }>(`/api/properties/${propertyId}/applications`), enabled: Boolean(propertyId) });
  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ProspectStage }) => api(`/api/prospects/${id}/stage`, { method: "PATCH", body: JSON.stringify({ stage }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["prospects", propertyId] }); },
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationSummary["status"] }) => api(`/api/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["applications", propertyId] }); },
  });

  return <div className="page-stack">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Leasing pipeline</h1><p>Prospects, tours, and applications from first contact through lease decision.</p></div>{can("leasing:manage") && tab === "pipeline" && <button className="button button--primary" onClick={() => setProspectOpen(true)}><Plus size={16} />Add prospect</button>}{can("leasing:manage") && tab === "tours" && <button className="button button--primary" onClick={() => setTourOpen(true)}><Plus size={16} />Schedule tour</button>}{can("leasing:manage") && tab === "applications" && <button className="button button--primary" onClick={() => setApplicationOpen(true)}><Plus size={16} />New application</button>}</section>
    <section className="toolbar"><div className="segmented-control">{(["pipeline", "tours", "applications"] as const).map((value) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value}</button>)}</div></section>
    {tab === "pipeline" && <section className="content-grid">
      {stages.map((stage) => {
        const items = prospects.data?.prospects.filter((prospect) => prospect.stage === stage) ?? [];
        return <article className="panel" key={stage}><header className="panel__heading"><div><p className="eyebrow">{stage.replaceAll("_", " ")}</p><h2>{items.length}</h2></div><Handshake size={20} /></header><div className="turn-list">{items.map((prospect) => <div className="turn-row" key={prospect.id}><span><strong>{prospect.firstName} {prospect.lastName}</strong><small>{prospect.email ?? prospect.phone ?? "No contact"}</small></span>{can("leasing:manage") && nextStage[stage] && <button className="text-button" onClick={() => void stageMutation.mutate({ id: prospect.id, stage: nextStage[stage]! })}>Advance</button>}</div>)}</div></article>;
      })}
    </section>}
    {tab === "tours" && <section className="panel table-panel">
      {tours.data?.tours.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Prospect</th><th>Unit</th><th>Scheduled</th><th>Guide</th><th>Status</th></tr></thead><tbody>
        {tours.data.tours.map((tour) => <tr key={tour.id}><td>{tour.prospectName}</td><td>{tour.unitNumber ? `Unit ${tour.unitNumber}` : "—"}</td><td>{formatDate(tour.scheduledAt)}</td><td>{tour.guideName ?? "—"}</td><td>{tour.status.replaceAll("_", " ")}</td></tr>)}
      </tbody></table></div> : <EmptyState icon={CalendarDays} title="No tours scheduled" detail="Scheduled property tours will appear here." />}
    </section>}
    {tab === "applications" && <section className="panel table-panel">
      {applications.data?.applications.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Prospect</th><th>Unit</th><th>Submitted</th><th>Income</th><th>Status</th><th /></tr></thead><tbody>
        {applications.data.applications.map((app) => <tr key={app.id}><td>{app.prospectName}</td><td>{app.unitNumber ? `Unit ${app.unitNumber}` : "—"}</td><td>{formatDate(app.submittedAt)}</td><td>{app.monthlyIncome ? `$${app.monthlyIncome.toLocaleString()}` : "—"}</td><td>{app.status}</td><td>{can("leasing:manage") && app.status === "screening" && <button className="text-button" onClick={() => void statusMutation.mutate({ id: app.id, status: "approved" })}>Approve</button>}</td></tr>)}
      </tbody></table></div> : <EmptyState icon={FileText} title="No applications yet" detail="Submitted rental applications will appear here." />}
    </section>}
    {prospectOpen && <CreateProspectDialog onClose={() => setProspectOpen(false)} />}
    {tourOpen && <CreateTourDialog onClose={() => setTourOpen(false)} prospects={prospects.data?.prospects ?? []} />}
    {applicationOpen && <CreateApplicationDialog onClose={() => setApplicationOpen(false)} prospects={prospects.data?.prospects ?? []} />}
  </div>;
}

function CreateProspectDialog({ onClose }: { onClose: () => void }) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", source: "Website", stage: "inquiry" as ProspectStage, desiredMoveIn: "", budgetMax: "", notes: "" });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api("/api/prospects", { method: "POST", body: JSON.stringify({ propertyId, ...form, email: form.email || null, phone: form.phone || null, source: form.source || null, desiredMoveIn: form.desiredMoveIn || null, budgetMax: form.budgetMax ? Number(form.budgetMax) : null, notes: form.notes || null }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["prospects", propertyId] }); onClose(); },
  });
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); try { await mutation.mutateAsync(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create prospect"); } };
  return <LeasingDialog title="Add prospect" icon={<Handshake />} onClose={onClose} onSubmit={submit} error={error} pending={mutation.isPending} submitLabel="Create prospect"><div className="form-grid"><label className="field"><span>First name</span><input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label><label className="field"><span>Last name</span><input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label><label className="field"><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="field"><span>Phone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="field"><span>Source</span><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></label><label className="field"><span>Stage</span><AppSelect ariaLabel="Stage" value={form.stage} onChange={(value) => setForm({ ...form, stage: value as ProspectStage })} options={stages.map((value) => ({ value, label: value.replaceAll("_", " ") }))} /></label><label className="field"><span>Desired move-in</span><input type="date" value={form.desiredMoveIn} onChange={(e) => setForm({ ...form, desiredMoveIn: e.target.value })} /></label><label className="field"><span>Budget max</span><input type="number" min="0" value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} /></label><label className="field field--full"><span>Notes</span><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label></div></LeasingDialog>;
}

function CreateTourDialog({ onClose, prospects }: { onClose: () => void; prospects: ProspectSummary[] }) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const units = useQuery({ queryKey: ["units", propertyId], queryFn: () => api<{ units: UnitSummary[] }>(`/api/properties/${propertyId}/units`), enabled: Boolean(propertyId) });
  const team = useQuery({ queryKey: ["team", propertyId], queryFn: () => api<{ team: Array<{ id: string; name: string }> }>(`/api/properties/${propertyId}/team`), enabled: Boolean(propertyId) });
  const [form, setForm] = useState({ prospectId: "", unitId: "", scheduledAt: "", guideUserId: "", notes: "" });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api("/api/tours", { method: "POST", body: JSON.stringify({ propertyId, prospectId: form.prospectId, unitId: form.unitId || null, scheduledAt: form.scheduledAt, guideUserId: form.guideUserId || null, notes: form.notes || null }) }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["tours", propertyId] }), queryClient.invalidateQueries({ queryKey: ["prospects", propertyId] })]); onClose(); },
  });
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); if (!form.prospectId || !form.scheduledAt) return setError("Prospect and schedule are required."); try { await mutation.mutateAsync(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not schedule tour"); } };
  return <LeasingDialog title="Schedule tour" icon={<CalendarDays />} onClose={onClose} onSubmit={submit} error={error} pending={mutation.isPending} submitLabel="Schedule tour"><div className="form-grid"><label className="field field--full"><span>Prospect</span><AppSelect required ariaLabel="Prospect" value={form.prospectId} onChange={(value) => setForm({ ...form, prospectId: value })} options={[{ value: "", label: "Select prospect" }, ...prospects.map((prospect) => ({ value: prospect.id, label: `${prospect.firstName} ${prospect.lastName}` }))]} /></label><label className="field"><span>Unit</span><AppSelect ariaLabel="Unit" value={form.unitId} onChange={(value) => setForm({ ...form, unitId: value })} options={[{ value: "", label: "Any unit" }, ...(units.data?.units.map((unit) => ({ value: unit.id, label: `Unit ${unit.unitNumber}` })) ?? [])]} /></label><label className="field"><span>Scheduled at</span><input type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></label><label className="field"><span>Guide</span><AppSelect ariaLabel="Guide" value={form.guideUserId} onChange={(value) => setForm({ ...form, guideUserId: value })} options={[{ value: "", label: "Unassigned" }, ...(team.data?.team.map((person) => ({ value: person.id, label: person.name })) ?? [])]} /></label><label className="field field--full"><span>Notes</span><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label></div></LeasingDialog>;
}

function CreateApplicationDialog({ onClose, prospects }: { onClose: () => void; prospects: ProspectSummary[] }) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const units = useQuery({ queryKey: ["units", propertyId], queryFn: () => api<{ units: UnitSummary[] }>(`/api/properties/${propertyId}/units`), enabled: Boolean(propertyId) });
  const [form, setForm] = useState({ prospectId: "", unitId: "", monthlyIncome: "" });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api("/api/applications", { method: "POST", body: JSON.stringify({ propertyId, prospectId: form.prospectId, unitId: form.unitId || null, monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : null }) }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["applications", propertyId] }), queryClient.invalidateQueries({ queryKey: ["prospects", propertyId] })]); onClose(); },
  });
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); if (!form.prospectId) return setError("Select a prospect."); try { await mutation.mutateAsync(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create application"); } };
  return <LeasingDialog title="New application" icon={<FileText />} onClose={onClose} onSubmit={submit} error={error} pending={mutation.isPending} submitLabel="Create application"><div className="form-grid"><label className="field field--full"><span>Prospect</span><AppSelect required ariaLabel="Prospect" value={form.prospectId} onChange={(value) => setForm({ ...form, prospectId: value })} options={[{ value: "", label: "Select prospect" }, ...prospects.map((prospect) => ({ value: prospect.id, label: `${prospect.firstName} ${prospect.lastName}` }))]} /></label><label className="field"><span>Unit</span><AppSelect ariaLabel="Unit" value={form.unitId} onChange={(value) => setForm({ ...form, unitId: value })} options={[{ value: "", label: "Undecided" }, ...(units.data?.units.map((unit) => ({ value: unit.id, label: `Unit ${unit.unitNumber}` })) ?? [])]} /></label><label className="field"><span>Monthly income</span><input type="number" min="0" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} /></label></div></LeasingDialog>;
}

function LeasingDialog({ title, icon, onClose, onSubmit, error, pending, submitLabel, children }: { title: string; icon: ReactNode; onClose: () => void; onSubmit: (event: FormEvent) => void; error: string; pending: boolean; submitLabel: string; children: ReactNode }) {
  return <div className="modal-layer"><section className="dialog"><header className="dialog__header"><span className="dialog__icon">{icon}</span><div><p className="eyebrow">Leasing</p><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={onSubmit}>{children}{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button></footer></form></section></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
