import { useState } from "react";
import type { ReactNode } from "react";
import {
  Building2,
  ClipboardCheck,
  Gauge,
  HardHat,
  KeyRound,
  LayoutTemplate,
  LogOut,
  Menu,
  Settings,
  Waves,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { PropertyProvider, useProperty } from "../contexts/PropertyContext";
import { Link, useRouter } from "../lib/router";
import { NotificationCenter } from "../components/NotificationCenter";
import { ChangePasswordDialog } from "../components/ChangePasswordDialog";
import { AppSelect } from "../components/AppSelect";
import { GlobalSearch } from "../components/GlobalSearch";
import { AssistantPanel } from "../components/AssistantPanel";

const navigation: Array<{ to: string; label: string; icon: typeof Gauge; permission: string; end?: boolean; technicianShortcut?: boolean }> = [
  { to: "/", label: "Overview", icon: Gauge, end: true, permission: "dashboard:view" },
  { to: "/my-work", label: "My work", icon: HardHat, permission: "turns:view" },
  { to: "/turns", label: "Make ready", icon: ClipboardCheck, permission: "turns:view" },
  { to: "/units", label: "Units", icon: Building2, permission: "units:view" },
  { to: "/pool-logs", label: "Pool log", icon: Waves, permission: "pool:view", technicianShortcut: true },
  { to: "/operations", label: "Operations", icon: Wrench, permission: "turns:review" },
  { to: "/templates", label: "Template center", icon: LayoutTemplate, permission: "templates:view" },
  { to: "/administration", label: "Administration", icon: Settings, permission: "users:view" },
];

function ShellContent({ children }: { children: ReactNode }) {
  const { user, can, logout } = useAuth();
  const { properties, propertyId, setPropertyId, property } = useProperty();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { path } = useRouter();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
        <div className="brand">
          <span className="brand__mark">PS</span>
          <span><strong>Property Suite</strong><small>Operations workspace</small></span>
        </div>
        <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
          <X size={20} />
        </button>
        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="eyebrow">Workspace</p>
          {navigation.filter((item) => can(item.permission) && (!item.technicianShortcut || !can("turns:review"))).map((item) => {
            const Icon = item.icon;
            return <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`nav-link ${path === item.to || (!item.end && path.startsWith(`${item.to}/`)) ? "nav-link--active" : ""}`}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>;
          })}
        </nav>
        <div className="sidebar__footer">
          <div className="user-block">
            <span className="avatar">{user?.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
            <span><strong>{user?.name}</strong><small>{user?.roles.join(" · ")}</small></span>
          </div>
          <div className="user-actions">
            <button className="icon-button" onClick={() => setPasswordOpen(true)} aria-label="Change password" title="Change password"><KeyRound size={17} /></button>
            <button className="icon-button" onClick={() => void logout()} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button>
          </div>
        </div>
      </aside>
      {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <main className="workspace">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button>
          <div className="property-context">
            <span className="property-context__dot" />
            <label>
              <small>Current property</small>
              <AppSelect compact ariaLabel="Current property" value={propertyId ?? ""} onChange={setPropertyId} options={properties.map((item) => ({ value: item.id, label: item.name }))} />
            </label>
          </div>
          <GlobalSearch />
          <AssistantPanel />
          <NotificationCenter />
          <span className="topbar__address">{property?.address}</span>
        </header>
        <div className="page-frame">{children}</div>
      </main>
      {passwordOpen && <ChangePasswordDialog onClose={() => setPasswordOpen(false)} />}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <PropertyProvider><ShellContent>{children}</ShellContent></PropertyProvider>;
}
