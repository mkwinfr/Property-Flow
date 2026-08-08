import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Megaphone, Plus, Send, X } from "lucide-react";
import type { MessageCampaign, MessageTemplate } from "../../shared/contracts";
import { EmptyState } from "../components/EmptyState";
import { AppSelect } from "../components/AppSelect";
import { useAuth } from "../contexts/AuthContext";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";

export function CommunicationsPage() {
  const { property, propertyId } = useProperty();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"templates" | "campaigns">("campaigns");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const templates = useQuery({ queryKey: ["message-templates", propertyId], queryFn: () => api<{ templates: MessageTemplate[] }>(`/api/properties/${propertyId}/message-templates`), enabled: Boolean(propertyId) });
  const campaigns = useQuery({ queryKey: ["campaigns", propertyId], queryFn: () => api<{ campaigns: MessageCampaign[] }>(`/api/properties/${propertyId}/campaigns`), enabled: Boolean(propertyId) });
  const sendMutation = useMutation({
    mutationFn: (campaignId: string) => api<{ campaign: MessageCampaign }>(`/api/campaigns/${campaignId}/send`, { method: "POST" }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["campaigns", propertyId] }); },
  });

  return <div className="page-stack">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Communications</h1><p>Message templates, resident campaigns, and delivery history.</p></div>{can("communications:manage") && tab === "templates" && <button className="button button--primary" onClick={() => setTemplateOpen(true)}><Plus size={16} />New template</button>}{can("communications:manage") && tab === "campaigns" && <button className="button button--primary" onClick={() => setCampaignOpen(true)}><Plus size={16} />New campaign</button>}</section>
    <section className="toolbar"><div className="segmented-control">{(["campaigns", "templates"] as const).map((value) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value}</button>)}</div></section>
    {tab === "templates" ? <section className="panel table-panel">
      {templates.data?.templates.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Channel</th><th>Subject</th><th>Updated</th></tr></thead><tbody>
        {templates.data.templates.map((template) => <tr key={template.id}><td><strong>{template.name}</strong></td><td>{template.channel}</td><td className="muted">{template.subject ?? "—"}</td><td>{formatDate(template.updatedAt)}</td></tr>)}
      </tbody></table></div> : <EmptyState icon={Mail} title="No templates yet" detail="Reusable message templates will appear here." />}
    </section> : <section className="panel table-panel">
      {campaigns.data?.campaigns.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Campaign</th><th>Audience</th><th>Status</th><th>Deliveries</th><th>Sent</th><th /></tr></thead><tbody>
        {campaigns.data.campaigns.map((campaign) => <tr key={campaign.id}><td><strong>{campaign.name}</strong><small className="muted">{campaign.templateName ?? "No template"}</small></td><td>{campaign.audienceType.replaceAll("_", " ")}</td><td>{campaign.status}</td><td>{campaign.deliveryCount}</td><td>{campaign.sentCount}</td><td>{campaign.status !== "sent" && can("communications:manage") && <button className="text-button" disabled={sendMutation.isPending} onClick={() => void sendMutation.mutate(campaign.id)}><Send size={14} /> Send</button>}</td></tr>)}
      </tbody></table></div> : <EmptyState icon={Megaphone} title="No campaigns yet" detail="Resident and prospect campaigns will appear here." />}
    </section>}
    {templateOpen && <CreateTemplateDialog onClose={() => setTemplateOpen(false)} />}
    {campaignOpen && <CreateCampaignDialog onClose={() => setCampaignOpen(false)} templates={templates.data?.templates ?? []} />}
  </div>;
}

function CreateTemplateDialog({ onClose }: { onClose: () => void }) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", channel: "in_app" as MessageTemplate["channel"], subject: "", body: "" });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api("/api/message-templates", { method: "POST", body: JSON.stringify({ propertyId, name: form.name, channel: form.channel, subject: form.subject || null, body: form.body }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["message-templates", propertyId] }); onClose(); },
  });
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); try { await mutation.mutateAsync(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create template"); } };
  return <CommsDialog title="New template" icon={<Mail />} onClose={onClose} onSubmit={submit} error={error} pending={mutation.isPending} submitLabel="Create template"><div className="form-grid"><label className="field field--full"><span>Name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="field"><span>Channel</span><AppSelect ariaLabel="Channel" value={form.channel} onChange={(value) => setForm({ ...form, channel: value as MessageTemplate["channel"] })} options={[{ value: "in_app", label: "In app" }, { value: "email", label: "Email" }, { value: "sms", label: "SMS" }]} /></label><label className="field field--full"><span>Subject</span><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label><label className="field field--full"><span>Body</span><textarea required rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label></div></CommsDialog>;
}

function CreateCampaignDialog({ onClose, templates }: { onClose: () => void; templates: MessageTemplate[] }) {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", templateId: "", audienceType: "all_residents" as MessageCampaign["audienceType"] });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api("/api/campaigns", { method: "POST", body: JSON.stringify({ propertyId, name: form.name, templateId: form.templateId || null, audienceType: form.audienceType }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["campaigns", propertyId] }); onClose(); },
  });
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); try { await mutation.mutateAsync(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create campaign"); } };
  return <CommsDialog title="New campaign" icon={<Megaphone />} onClose={onClose} onSubmit={submit} error={error} pending={mutation.isPending} submitLabel="Create campaign"><div className="form-grid"><label className="field field--full"><span>Campaign name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="field field--full"><span>Template</span><AppSelect ariaLabel="Template" value={form.templateId} onChange={(value) => setForm({ ...form, templateId: value })} options={[{ value: "", label: "No template" }, ...templates.map((template) => ({ value: template.id, label: template.name }))]} /></label><label className="field field--full"><span>Audience</span><AppSelect ariaLabel="Audience" value={form.audienceType} onChange={(value) => setForm({ ...form, audienceType: value as MessageCampaign["audienceType"] })} options={[{ value: "all_residents", label: "All residents" }, { value: "active_leases", label: "Active leases" }, { value: "prospects", label: "Prospects" }]} /></label></div></CommsDialog>;
}

function CommsDialog({ title, icon, onClose, onSubmit, error, pending, submitLabel, children }: { title: string; icon: ReactNode; onClose: () => void; onSubmit: (event: FormEvent) => void; error: string; pending: boolean; submitLabel: string; children: ReactNode }) {
  return <div className="modal-layer"><section className="dialog"><header className="dialog__header"><span className="dialog__icon">{icon}</span><div><p className="eyebrow">Communications</p><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={onSubmit}>{children}{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button></footer></form></section></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
