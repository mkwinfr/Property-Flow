import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "../../lib/router";

export function PortalPageHeader({
  eyebrow,
  title,
  description,
  action,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return <header className={`portal-hero ${compact ? "portal-hero--compact" : ""}`}>
    <div className="portal-hero__copy">
      <p className="portal-kicker">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {action && <div className="portal-hero__action">{action}</div>}
  </header>;
}

export function PortalSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`portal-surface ${className}`.trim()}>{children}</section>;
}

export function PortalSectionHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return <header className="portal-section-heading">
    <div>
      {eyebrow && <p className="portal-kicker">{eyebrow}</p>}
      <h2>{title}</h2>
      {detail && <p>{detail}</p>}
    </div>
    {action}
  </header>;
}

export function PortalStatusBadge({
  value,
  tone,
}: {
  value: string;
  tone?: "neutral" | "success" | "warning" | "info" | "danger";
}) {
  const resolvedTone = tone ?? statusTone(value);
  return <span className={`portal-badge portal-badge--${resolvedTone}`}>{value.replaceAll("_", " ")}</span>;
}

export function PortalTabs({
  items,
  activeId,
  label,
}: {
  items: ReadonlyArray<{ id: string; label: string; to: string; icon?: LucideIcon }>;
  activeId: string;
  label: string;
}) {
  return <nav className="portal-tabs" aria-label={label}>
    {items.map(({ icon: Icon, ...item }) => <Link
      key={item.id}
      to={item.to}
      className={`portal-tabs__item ${activeId === item.id ? "portal-tabs__item--active" : ""}`}
    >
      {Icon && <Icon size={16} />}
      <span>{item.label}</span>
    </Link>)}
  </nav>;
}

export function PortalEmptyState({
  icon: Icon,
  title,
  detail,
  action,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return <div className="portal-empty-state">
    <span className="portal-empty-state__icon"><Icon size={25} /></span>
    <h3>{title}</h3>
    <p>{detail}</p>
    {action}
  </div>;
}

export function PortalLoading({ label = "Loading" }: { label?: string }) {
  return <div className="portal-loading" role="status" aria-label={label}>
    <span />
    <span />
    <span />
  </div>;
}

function statusTone(value: string): "neutral" | "success" | "warning" | "info" | "danger" {
  if (["complete", "paid", "active", "approved"].includes(value)) return "success";
  if (["cancelled", "failed", "denied"].includes(value)) return "danger";
  if (["open", "pending", "notice", "screening"].includes(value)) return "warning";
  if (["in_progress", "assigned", "submitted"].includes(value)) return "info";
  return "neutral";
}
