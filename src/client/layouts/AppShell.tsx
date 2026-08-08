import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Boxes,
  ChevronDown,
  ChevronRight,
  Gauge,
  HardHat,
  KeyRound,
  LogOut,
  Menu,
  Settings,
  Wrench,
  X,
  Handshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PropertyModuleKey } from "../../shared/contracts";
import { useAuth } from "../contexts/AuthContext";
import { PropertyProvider, useProperty } from "../contexts/PropertyContext";
import { Link, useRouter } from "../lib/router";
import { NotificationCenter } from "../components/NotificationCenter";
import { ChangePasswordDialog } from "../components/ChangePasswordDialog";
import { NotificationPreferencesDialog } from "../components/NotificationPreferencesDialog";
import { AppSelect } from "../components/AppSelect";
import { GlobalSearch } from "../components/GlobalSearch";
import { AssistantPanel } from "../components/AssistantPanel";

interface NavChild {
  to: string;
  label: string;
  permission: string;
  module?: PropertyModuleKey;
  technicianShortcut?: boolean;
  isActive: (path: string, search: string) => boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavChild[];
}

interface NavLinkItem {
  type: "link";
  to: string;
  label: string;
  icon: LucideIcon;
  permission: string;
  module?: PropertyModuleKey;
  isActive: (path: string, search: string) => boolean;
}

type NavEntry = NavLinkItem | ({ type: "group" } & NavGroup);
type VisibleNavEntry = NavLinkItem | ({ type: "group" } & NavGroup);

function operationsTab(path: string, search: string, tab: string) {
  if (path !== "/operations") return false;
  return (new URLSearchParams(search).get("tab") ?? "overview") === tab;
}

const navigation: NavEntry[] = [
  {
    type: "link",
    to: "/",
    label: "Overview",
    icon: Gauge,
    permission: "dashboard:view",
    isActive: (path) => path === "/",
  },
  {
    type: "link",
    to: "/my-work",
    label: "My Work",
    icon: HardHat,
    permission: "turns:view",
    module: "make_ready",
    isActive: (path) => path === "/my-work" || path.startsWith("/my-work/"),
  },
  {
    type: "group",
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    children: [
      { to: "/operations?tab=work-orders", label: "Work orders", permission: "workorders:view", module: "operations", isActive: (path, search) => operationsTab(path, search, "work-orders") },
      { to: "/turns", label: "Make Ready", permission: "turns:view", module: "make_ready", isActive: (path) => path === "/turns" || path.startsWith("/turns/") },
      { to: "/operations?tab=inspections", label: "Inspections", permission: "inspections:view", module: "operations", isActive: (path, search) => operationsTab(path, search, "inspections") },
      { to: "/operations?tab=recurring", label: "Recurring jobs", permission: "workorders:view", module: "operations", isActive: (path, search) => operationsTab(path, search, "recurring") },
      { to: "/pool-logs", label: "Pool Log", permission: "pool:view", module: "pool", technicianShortcut: true, isActive: (path) => path === "/pool-logs" },
    ],
  },
  {
    type: "group",
    id: "leasing",
    label: "Leasing",
    icon: Handshake,
    children: [
      { to: "/leasing", label: "Pipeline", permission: "leasing:view", module: "leasing", isActive: (path) => path === "/leasing" },
      { to: "/residents", label: "Residents & leases", permission: "residents:view", module: "residents", isActive: (path) => path === "/residents" },
    ],
  },
  {
    type: "group",
    id: "operations",
    label: "Operations",
    icon: Boxes,
    children: [
      { to: "/operations", label: "Control center", permission: "turns:review", module: "operations", isActive: (path, search) => path === "/operations" && (new URLSearchParams(search).get("tab") ?? "overview") === "overview" },
      { to: "/units", label: "Units", permission: "units:view", isActive: (path) => path === "/units" },
      { to: "/operations?tab=inventory", label: "Inventory", permission: "inventory:view", module: "operations", isActive: (path, search) => operationsTab(path, search, "inventory") },
      { to: "/operations?tab=vendors", label: "Vendors", permission: "vendors:view", module: "operations", isActive: (path, search) => operationsTab(path, search, "vendors") },
      { to: "/templates", label: "Template center", permission: "templates:view", isActive: (path) => path === "/templates" },
    ],
  },
  {
    type: "group",
    id: "administration",
    label: "Administration",
    icon: Settings,
    children: [
      { to: "/administration", label: "Users & properties", permission: "users:view", isActive: (path) => path === "/administration" },
      { to: "/communications", label: "Communications", permission: "communications:view", module: "communications", isActive: (path) => path === "/communications" },
      { to: "/financial", label: "Financial", permission: "financial:view", module: "financial", isActive: (path) => path === "/financial" },
      { to: "/audit", label: "Audit Log", permission: "audit:view", isActive: (path) => path === "/audit" },
      { to: "/platform-admin", label: "Platform", permission: "platform:manage", isActive: (path) => path === "/platform-admin" },
    ],
  },
];

function ShellContent({ children }: { children: ReactNode }) {
  const { user, can, logout } = useAuth();
  const { properties, propertyId, setPropertyId, property, isModuleEnabled } = useProperty();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { path, search } = useRouter();

  const canSeeChild = (item: NavChild) =>
    can(item.permission)
    && (!item.module || isModuleEnabled(item.module))
    && (!item.technicianShortcut || !can("turns:review"));

  const visibleNavigation = useMemo((): VisibleNavEntry[] => navigation.flatMap((entry): VisibleNavEntry[] => {
    if (entry.type === "link") {
      if (!can(entry.permission)) return [];
      if (entry.module && !isModuleEnabled(entry.module)) return [];
      return [entry];
    }
    const children = entry.children.filter(canSeeChild);
    return children.length ? [{ ...entry, children }] : [];
  }), [can, isModuleEnabled, propertyId]);

  useEffect(() => {
    setExpanded((current) => {
      const next = { ...current };
      for (const entry of visibleNavigation) {
        if (entry.type === "group" && entry.children.some((child) => child.isActive(path, search))) {
          next[entry.id] = true;
        }
      }
      return next;
    });
  }, [path, search, visibleNavigation]);

  const toggleGroup = (id: string) => {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <div className="app-shell staff-app">
      <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
        <div className="brand">
          <span className="brand__mark">PS</span>
          <span><strong>Property Suite</strong><small>Operations workspace</small></span>
        </div>
        <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
          <X size={20} />
        </button>
        <nav className="primary-nav" aria-label="Primary navigation">
          {visibleNavigation.map((entry) => {
            if (entry.type === "link") {
              const Icon = entry.icon;
              return <Link
                key={entry.to}
                to={entry.to}
                onClick={() => setMobileOpen(false)}
                className={`nav-link ${entry.isActive(path, search) ? "nav-link--active" : ""}`}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{entry.label}</span>
              </Link>;
            }
            const Icon = entry.icon;
            const open = expanded[entry.id] ?? false;
            const groupActive = entry.children.some((child) => child.isActive(path, search));
            return <section className="nav-group" key={entry.id}>
              <button
                type="button"
                className={`nav-group__trigger ${groupActive ? "nav-group__trigger--active" : ""}`}
                aria-expanded={open}
                onClick={() => toggleGroup(entry.id)}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{entry.label}</span>
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {open && <div className="nav-group__children">
                {entry.children.map((child) => <Link
                  key={child.to}
                  to={child.to}
                  onClick={() => setMobileOpen(false)}
                  className={`nav-link nav-link--child ${child.isActive(path, search) ? "nav-link--active" : ""}`}
                >
                  <span>{child.label}</span>
                </Link>)}
              </div>}
            </section>;
          })}
        </nav>
        <div className="sidebar__footer">
          <div className="user-block">
            <span className="avatar">{user?.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
            <span><strong>{user?.name}</strong><small>{user?.roles.join(" · ")}</small></span>
          </div>
          <div className="user-actions">
            <button className="icon-button" onClick={() => setPreferencesOpen(true)} aria-label="Notification preferences" title="Notification preferences"><Bell size={17} /></button>
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
      {preferencesOpen && <NotificationPreferencesDialog onClose={() => setPreferencesOpen(false)} />}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <PropertyProvider><ShellContent>{children}</ShellContent></PropertyProvider>;
}
