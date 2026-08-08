import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, Shield, Users } from "lucide-react";
import type { OrganizationSummary, PropertyModuleKey, PropertyModuleSetting } from "../../shared/contracts";
import { useAuth } from "../contexts/AuthContext";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: string;
  propertyScope: string;
}

interface PlatformHealth {
  service: string;
  databaseProvider: string;
  databaseReady: boolean;
  migrationVersion: number;
  propertyCount: number;
  userCount: number;
  residentAccountCount: number;
  ssoEnabled: boolean;
  portalEnabledProperties: number;
}

export function PlatformAdminPage() {
  const { can } = useAuth();
  const { propertyId } = useProperty();
  const [tab, setTab] = useState<"health" | "users" | "modules">("health");
  const health = useQuery({ queryKey: ["platform-health"], queryFn: () => api<{ health: PlatformHealth }>("/api/platform/health"), enabled: can("platform:manage") });
  const users = useQuery({ queryKey: ["platform-users"], queryFn: () => api<{ users: PlatformUser[]; roles: Array<{ id: string; name: string }> }>("/api/platform/users"), enabled: can("platform:manage") && tab === "users" });
  const orgs = useQuery({ queryKey: ["platform-orgs"], queryFn: () => api<{ organizations: OrganizationSummary[] }>("/api/platform/organizations"), enabled: can("platform:manage") });
  const modules = useQuery({ queryKey: ["property-modules", propertyId], queryFn: () => api<{ modules: PropertyModuleSetting[] }>(`/api/properties/${propertyId}/modules`), enabled: Boolean(propertyId) && tab === "modules" });

  if (!can("platform:manage") && !can("properties:manage")) {
    return <div className="page-stack"><section className="panel"><p>Platform administration requires elevated permissions.</p></section></div>;
  }

  return <div className="page-stack">
    <section className="page-heading"><div><p className="eyebrow">Admin Ops</p><h1>Platform Control</h1><p>Organizations, users, module toggles, and platform health.</p></div></section>
    <section className="toolbar"><div className="segmented-control">{(["health", "users", "modules"] as const).map((value) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value}</button>)}</div></section>
    {tab === "health" && health.data && <section className="metric-grid">
      {[
        { label: "Database", value: health.data.health.databaseProvider, detail: health.data.health.databaseReady ? "Ready" : "Unavailable", icon: Activity },
        { label: "Migration", value: `v${health.data.health.migrationVersion}`, detail: `${health.data.health.propertyCount} properties`, icon: Building2 },
        { label: "Users", value: health.data.health.userCount, detail: `${health.data.health.residentAccountCount} portal accounts`, icon: Users },
        { label: "SSO", value: health.data.health.ssoEnabled ? "Enabled" : "Disabled", detail: `${health.data.health.portalEnabledProperties} portal-enabled properties`, icon: Shield },
      ].map(({ label, value, detail, icon: Icon }) => <article className="metric-card metric-card--blue" key={label}><span className="metric-card__icon"><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>)}
    </section>}
    {tab === "users" && <section className="panel table-panel">
      <header className="panel__heading"><div><p className="eyebrow">Identity</p><h2>Staff Users</h2></div></header>
      {users.data?.users.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Roles</th><th>Scope</th><th>Status</th></tr></thead><tbody>
        {users.data.users.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.roles}</td><td>{user.propertyScope}</td><td>{user.status}</td></tr>)}
      </tbody></table></div> : <p className="notification-empty">No users found.</p>}
      {orgs.data?.organizations.length ? <footer className="panel__heading"><small>{orgs.data.organizations.map((org) => `${org.name} (${org.propertyCount} properties)`).join(" · ")}</small></footer> : null}
    </section>}
    {tab === "modules" && propertyId && <ModuleTogglePanel propertyId={propertyId} modules={modules.data?.modules ?? []} onSaved={() => void modules.refetch()} />}
  </div>;
}

function ModuleTogglePanel({ propertyId, modules, onSaved }: { propertyId: string; modules: PropertyModuleSetting[]; onSaved: () => void }) {
  const [local, setLocal] = useState(modules);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setLocal(modules); }, [modules]);
  const labels: Record<PropertyModuleKey, string> = {
    make_ready: "Make Ready", operations: "Operations", pool: "Pool", residents: "Residents",
    leasing: "Leasing", communications: "Communications", financial: "Financial", portal: "Resident portal",
  };
  const save = async () => {
    setSaving(true);
    try {
      await api(`/api/properties/${propertyId}/modules`, { method: "PUT", body: JSON.stringify({ modules: local }) });
      onSaved();
    } finally { setSaving(false); }
  };
  return <section className="panel"><header className="panel__heading"><div><p className="eyebrow">Module toggles</p><h2>Property Features</h2></div><button className="button button--primary" disabled={saving} onClick={() => void save()}>Save modules</button></header><div className="legend-list">{local.map((module) => <label key={module.moduleKey}><input type="checkbox" checked={module.enabled} onChange={(event) => setLocal((current) => current.map((item) => item.moduleKey === module.moduleKey ? { ...item, enabled: event.target.checked } : item))} /> {labels[module.moduleKey]}</label>)}</div></section>;
}
