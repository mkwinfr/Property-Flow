import type { ReactNode } from "react";
import { Building2, DollarSign, FolderOpen, Home, LogOut, Mail, Menu, MoreHorizontal, PawPrint, Wrench, X } from "lucide-react";
import { useState } from "react";
import type { PortalSessionUser } from "../../shared/contracts";
import { Link, useRouter } from "../lib/router";

const navItems = [
  { to: "/portal", label: "Home", icon: Home, end: true },
  { to: "/portal/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/portal/messages", label: "Messages", icon: Mail },
  { to: "/portal/documents", label: "Documents", icon: FolderOpen },
  { to: "/portal/pets", label: "Pets", icon: PawPrint },
  { to: "/portal/charges", label: "Charges", icon: DollarSign },
];

const bottomNavItems = navItems.filter((item) =>
  ["/portal", "/portal/maintenance", "/portal/pets", "/portal/charges"].includes(item.to),
);

export function PortalLayout({ user, onLogout, children }: { user: PortalSessionUser; onLogout: () => void; children: ReactNode }) {
  const { path } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (to: string, end?: boolean) => path === to || (!end && path.startsWith(`${to}/`));
  const moreActive = navItems.some((item) => !bottomNavItems.includes(item) && isActive(item.to, item.end));

  return <div className="portal-app">
    <header className="portal-topbar">
      <button className="menu-button portal-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button>
      <div className="portal-topbar__identity">
        <span className="brand__mark">PS</span>
        <span><strong>{user.propertyName}</strong><small>{user.unitNumber ? `Resident portal · Unit ${user.unitNumber}` : "Resident portal"}</small></span>
      </div>
      <div className="portal-topbar__actions">
        <span className="portal-topbar__resident">{user.name}</span>
        <button className="button button--ghost portal-signout" onClick={onLogout} aria-label="Sign out"><LogOut size={16} /><span>Sign out</span></button>
      </div>
    </header>
    <div className="portal-body">
      <aside className={`portal-sidebar ${mobileOpen ? "portal-sidebar--open" : ""}`}>
        <div className="portal-sidebar__header">
          <div><p className="eyebrow">Your residence</p><strong>{user.name.split(" ")[0]}&apos;s Home</strong></div>
          <button className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <nav className="portal-nav" aria-label="Portal navigation">
          {navItems.map(({ icon: Icon, ...item }) => <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={`portal-nav__link ${isActive(item.to, item.end) ? "portal-nav__link--active" : ""}`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>)}
        </nav>
        <footer className="portal-sidebar__footer">
          <span className="portal-sidebar__property-icon"><Building2 size={15} /></span>
          <span><strong>{user.propertyName}</strong><small>{user.email}</small></span>
        </footer>
      </aside>
      {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <main className="portal-main">{children}</main>
    </div>
    <nav className="portal-bottom-nav" aria-label="Portal shortcuts">
      {bottomNavItems.map(({ icon: Icon, ...item }) => <Link key={item.to} to={item.to} className={`portal-bottom-nav__link ${isActive(item.to, item.end) ? "portal-bottom-nav__link--active" : ""}`}><Icon size={18} /><span>{item.label}</span></Link>)}
      <button type="button" className={`portal-bottom-nav__link ${moreActive ? "portal-bottom-nav__link--active" : ""}`} onClick={() => setMobileOpen(true)} aria-label="More navigation"><MoreHorizontal size={18} /><span>More</span></button>
    </nav>
  </div>;
}
