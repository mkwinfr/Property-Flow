import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CalendarClock, Plus, Wrench, X } from "lucide-react";
import type { PortalMaintenanceRequest } from "../../../shared/contracts";
import { AppSelect } from "../../components/AppSelect";
import { PortalAttachmentPanel } from "../../components/PortalAttachmentPanel";
import {
  PortalEmptyState,
  PortalLoading,
  PortalPageHeader,
  PortalSectionHeading,
  PortalStatusBadge,
  PortalSurface,
} from "../../components/portal/PortalPrimitives";
import { api } from "../../lib/api";
import { useRouter } from "../../lib/router";

const categories = ["General", "Plumbing", "Electrical", "HVAC", "Appliances", "Carpentry", "Life safety"];

export function PortalMaintenancePage() {
  const { path, navigate } = useRouter();
  const detailId = path.match(/^\/portal\/maintenance\/([^/]+)$/)?.[1] ?? null;
  const [createOpen, setCreateOpen] = useState(false);
  const query = useQuery({ queryKey: ["portal-maintenance"], queryFn: () => api<{ requests: PortalMaintenanceRequest[] }>("/api/portal/maintenance") });
  const detail = useQuery({
    queryKey: ["portal-maintenance", detailId],
    queryFn: () => api<{ request: PortalMaintenanceRequest }>(`/api/portal/maintenance/${detailId}`),
    enabled: Boolean(detailId),
  });

  if (detailId && detail.data) {
    return <MaintenanceDetail request={detail.data.request} onBack={() => navigate("/portal/maintenance")} />;
  }
  if (detailId && detail.isPending) {
    return <div className="page-stack portal-page"><PortalLoading label="Loading maintenance request" /></div>;
  }
  if (detailId && detail.isError) {
    return <div className="page-stack portal-page">
      <PortalEmptyState icon={AlertTriangle} title="Request Unavailable" detail="We could not load this maintenance request. Please return to your requests and try again." action={<button className="button button--primary" onClick={() => navigate("/portal/maintenance")}>Back to requests</button>} />
    </div>;
  }

  const openRequests = query.data?.requests.filter((item) => !["complete", "cancelled"].includes(item.status)) ?? [];
  const closedRequests = query.data?.requests.filter((item) => ["complete", "cancelled"].includes(item.status)) ?? [];

  return <div className="page-stack portal-page">
    <PortalPageHeader
      eyebrow="Care for your home"
      title="Maintenance"
      description="Tell us what needs attention and follow every request from submission to completion."
      action={<button className="button button--primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New request</button>}
    />
    <PortalSurface>
      <PortalSectionHeading eyebrow="Open requests" title={`${openRequests.length} Active`} detail="Requests currently with your property team." />
      {query.isPending ? <PortalLoading label="Loading maintenance requests" /> : query.isError ? <PortalEmptyState icon={AlertTriangle} title="Requests Unavailable" detail="We could not load your service requests. Please refresh the page and try again." /> : openRequests.length ? <div className="portal-request-list">
        {openRequests.map((item) => <MaintenanceCard key={item.id} item={item} onOpen={() => navigate(`/portal/maintenance/${item.id}`)} />)}
      </div> : <PortalEmptyState icon={Wrench} title="Everything Looks Good" detail="You have no open service requests. If something needs attention, your property team is ready to help." action={<button className="button button--primary" onClick={() => setCreateOpen(true)}><Plus size={16} />Submit a request</button>} />}
    </PortalSurface>
    {closedRequests.length > 0 && <PortalSurface>
      <PortalSectionHeading eyebrow="Request history" title={`${closedRequests.length} Closed`} detail="Completed and cancelled requests for your records." />
      <div className="portal-request-list">{closedRequests.map((item) => <MaintenanceCard key={item.id} item={item} onOpen={() => navigate(`/portal/maintenance/${item.id}`)} />)}</div>
    </PortalSurface>}
    {createOpen && <CreateMaintenanceDialog onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); navigate(`/portal/maintenance/${id}`); }} />}
  </div>;
}

function MaintenanceCard({ item, onOpen }: { item: PortalMaintenanceRequest; onOpen: () => void }) {
  return <button type="button" className="portal-request-card" onClick={onOpen}>
    <PortalStatusBadge value={item.status} />
    <strong>{item.title}</strong>
    <small>{item.category} · Unit {item.unitNumber}</small>
    <span className="portal-request-card__meta"><CalendarClock size={14} />Submitted {formatDate(item.createdAt)}</span>
  </button>;
}

function MaintenanceDetail({ request, onBack }: { request: PortalMaintenanceRequest; onBack: () => void }) {
  return <div className="page-stack portal-page">
    <button className="text-link portal-back-link portal-back-link--standalone" onClick={onBack}><ArrowLeft size={16} />Back to requests</button>
    <PortalPageHeader
      eyebrow={`${request.category} · Unit ${request.unitNumber}`}
      title={request.title}
      description={`Submitted ${formatDate(request.createdAt)}. Your property team will keep this request updated as work progresses.`}
      compact
      action={<PortalStatusBadge value={request.status} />}
    />
    <PortalSurface className="portal-detail-panel">
      <div className="portal-detail-grid">
        <article><small>Status</small><PortalStatusBadge value={request.status} /></article>
        <article><small>Priority</small><strong>{request.priority}</strong></article>
        <article><small>Submitted</small><strong>{formatDate(request.createdAt)}</strong></article>
        <article><small>Last updated</small><strong>{formatDate(request.updatedAt)}</strong></article>
      </div>
      <div className="portal-detail-section"><h3>Description</h3><p>{request.description || "No additional details were provided."}</p></div>
      <div className="portal-detail-section"><h3>Access</h3><dl className="legend-list">
        <div><dt>Permission to enter</dt><dd>{request.permissionToEnter === "permission_given" ? "Permission given" : request.permissionToEnter === "no_permission" ? "No permission — appointment required" : "Not recorded"}</dd></div>
        <div><dt>Appointment required</dt><dd>{request.appointmentRequired ? "Yes" : "No"}</dd></div>
      </dl></div>
      {request.status === "complete" ? <p className="notification-empty">This request has been completed by your maintenance team.</p> : <p className="notification-empty"><AlertTriangle size={14} /> Your property team will update this request as work progresses. Check back here for status changes.</p>}
    </PortalSurface>
    <PortalSurface><PortalAttachmentPanel workOrderId={request.id} canUpload={!["complete", "cancelled"].includes(request.status)} /></PortalSurface>
  </div>;
}

function CreateMaintenanceDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "General",
    permissionToEnter: "" as "" | "permission_given" | "no_permission",
    appointmentRequired: false,
  });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api<{ request: PortalMaintenanceRequest }>("/api/portal/maintenance", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        category: form.category,
        permissionToEnter: form.permissionToEnter,
        appointmentRequired: form.appointmentRequired || form.permissionToEnter === "no_permission",
      }),
    }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["portal-maintenance"] });
      onCreated(result.request.id);
    },
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.permissionToEnter) return setError("Select whether maintenance may enter your unit.");
    try { await mutation.mutateAsync(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not submit request"); }
  };
  return <div className="modal-layer"><section className="dialog portal-dialog"><header className="dialog__header"><span className="dialog__icon"><Wrench /></span><div><p className="eyebrow">Maintenance request</p><h2>Report an Issue</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={submit}><div className="form-grid"><label className="field field--full"><span>What needs attention?</span><input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Leaking kitchen faucet" /></label><label className="field field--full"><span>Describe the issue</span><textarea required rows={4} minLength={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Include location, severity, and anything the technician should know." /></label><label className="field"><span>Category</span><AppSelect ariaLabel="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} options={categories.map((value) => ({ value, label: value }))} /></label><label className="field"><span>Permission to enter</span><AppSelect ariaLabel="Permission to enter" value={form.permissionToEnter} onChange={(value) => setForm({ ...form, permissionToEnter: value as typeof form.permissionToEnter, appointmentRequired: value === "no_permission" ? true : form.appointmentRequired })} options={[{ value: "", label: "Select one" }, { value: "permission_given", label: "Permission given" }, { value: "no_permission", label: "No permission" }]} /></label><label className="check-field"><input type="checkbox" checked={form.appointmentRequired || form.permissionToEnter === "no_permission"} disabled={form.permissionToEnter === "no_permission"} onChange={(e) => setForm({ ...form, appointmentRequired: e.target.checked })} /><span><strong>Appointment required</strong><small>Maintenance must schedule a visit with you.</small></span></label></div>{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={mutation.isPending}>{mutation.isPending ? "Submitting…" : "Submit request"}</button></footer></form></section></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
