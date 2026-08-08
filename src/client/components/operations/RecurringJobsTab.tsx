import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Play, X } from "lucide-react";
import type { RecurringJob, RecurringJobFrequency, UnitSummary, WorkOrderPriority } from "../../../shared/contracts";
import { useAuth } from "../../contexts/AuthContext";
import { useProperty } from "../../contexts/PropertyContext";
import { api } from "../../lib/api";
import { AppSelect } from "../AppSelect";
import { EmptyState } from "../EmptyState";

const frequencies: RecurringJobFrequency[] = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];
const priorities: WorkOrderPriority[] = ["low", "normal", "high", "emergency"];

export function RecurringJobsTab() {
  const { propertyId } = useProperty();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const jobs = useQuery({
    queryKey: ["recurring-jobs", propertyId],
    queryFn: () => api<{ recurringJobs: RecurringJob[] }>(`/api/properties/${propertyId}/recurring-jobs`),
    enabled: Boolean(propertyId),
  });
  const runMutation = useMutation({
    mutationFn: () => api<{ generated: number }>(`/api/properties/${propertyId}/recurring-jobs/run-due`, { method: "POST" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recurring-jobs", propertyId] }),
        queryClient.invalidateQueries({ queryKey: ["work-orders", propertyId] }),
      ]);
    },
  });
  const pauseMutation = useMutation({
    mutationFn: (id: string) => api(`/api/recurring-jobs/${id}`, { method: "PATCH", body: JSON.stringify({ status: "paused" }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["recurring-jobs", propertyId] }); },
  });

  return <section className="ops-section">
    <header className="ops-section__header"><div><p className="eyebrow">Preventive maintenance</p><h2>Recurring jobs</h2><p>Schedule repeating work orders and generate due maintenance automatically.</p></div><div style={{ display: "flex", gap: 8 }}>{can("workorders:manage") && <><button className="button button--secondary" disabled={runMutation.isPending} onClick={() => void runMutation.mutate()}><Play size={16} />Run due jobs</button><button className="button button--primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New recurring job</button></>}</div></header>
    {jobs.data?.recurringJobs.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Title</th><th>Unit</th><th>Frequency</th><th>Next run</th><th>Assignee</th><th>Status</th><th /></tr></thead><tbody>
      {jobs.data.recurringJobs.map((job) => <tr key={job.id}><td><strong>{job.title}</strong><small className="muted">{job.category}</small></td><td>{job.unitNumber ? `Unit ${job.unitNumber}` : "—"}</td><td>{job.frequency}</td><td>{job.nextRunDate}</td><td>{job.assignedToName ?? "Unassigned"}</td><td>{job.status}</td><td>{can("workorders:manage") && job.status === "active" && <button className="text-button" onClick={() => void pauseMutation.mutate(job.id)}>Pause</button>}</td></tr>)}
    </tbody></table></div> : <EmptyState icon={CalendarClock} title="No recurring jobs" detail="Create preventive maintenance schedules for filters, inspections, and unit turns." />}
    {runMutation.data?.generated ? <p className="notification-empty">Generated {runMutation.data.generated} work order(s) from due recurring jobs.</p> : null}
    {createOpen && <CreateRecurringJobDialog onClose={() => setCreateOpen(false)} />}
  </section>;
}

function CreateRecurringJobDialog({ onClose }: { onClose: () => void }) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const units = useQuery({ queryKey: ["units", propertyId], queryFn: () => api<{ units: UnitSummary[] }>(`/api/properties/${propertyId}/units`), enabled: Boolean(propertyId) });
  const team = useQuery({ queryKey: ["team", propertyId], queryFn: () => api<{ team: Array<{ id: string; name: string }> }>(`/api/properties/${propertyId}/team`), enabled: Boolean(propertyId) });
  const [form, setForm] = useState({ unitId: "", title: "", description: "", category: "General", frequency: "monthly" as RecurringJobFrequency, nextRunDate: new Date().toISOString().slice(0, 10), priority: "normal" as WorkOrderPriority, assignedToUserId: "" });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api("/api/recurring-jobs", {
      method: "POST",
      body: JSON.stringify({ ...form, propertyId, unitId: form.unitId || null, assignedToUserId: form.assignedToUserId || null, description: form.description || null }),
    }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["recurring-jobs", propertyId] }); onClose(); },
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.unitId) return setError("Select a unit for recurring maintenance.");
    try { await mutation.mutateAsync(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create recurring job"); }
  };
  return <div className="modal-layer"><section className="dialog"><header className="dialog__header"><span className="dialog__icon"><CalendarClock /></span><div><p className="eyebrow">Preventive maintenance</p><h2>New recurring job</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={submit}><div className="form-grid"><label className="field field--full"><span>Title</span><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label className="field field--full"><span>Description</span><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="field"><span>Unit</span><AppSelect required ariaLabel="Unit" value={form.unitId} onChange={(value) => setForm({ ...form, unitId: value })} options={[{ value: "", label: "Select unit" }, ...(units.data?.units.map((unit) => ({ value: unit.id, label: `Unit ${unit.unitNumber}` })) ?? [])]} /></label><label className="field"><span>Category</span><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label className="field"><span>Frequency</span><AppSelect ariaLabel="Frequency" value={form.frequency} onChange={(value) => setForm({ ...form, frequency: value as RecurringJobFrequency })} options={frequencies.map((value) => ({ value, label: value }))} /></label><label className="field"><span>Next run date</span><input type="date" required value={form.nextRunDate} onChange={(e) => setForm({ ...form, nextRunDate: e.target.value })} /></label><label className="field"><span>Priority</span><AppSelect ariaLabel="Priority" value={form.priority} onChange={(value) => setForm({ ...form, priority: value as WorkOrderPriority })} options={priorities.map((value) => ({ value, label: value }))} /></label><label className="field"><span>Assign to</span><AppSelect ariaLabel="Assignee" value={form.assignedToUserId} onChange={(value) => setForm({ ...form, assignedToUserId: value })} options={[{ value: "", label: "Unassigned" }, ...(team.data?.team.map((person) => ({ value: person.id, label: person.name })) ?? [])]} /></label></div>{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Create recurring job"}</button></footer></form></section></div>;
}
