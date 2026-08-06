import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Icon size={24} /></span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}

