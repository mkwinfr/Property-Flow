import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import type { AuditEvent } from "../../shared/contracts";
import { EmptyState } from "../components/EmptyState";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";

export function AuditLogPage() {
  const { property, propertyId } = useProperty();
  const query = useQuery({
    queryKey: ["audit", propertyId],
    queryFn: () => api<{ events: AuditEvent[] }>(`/api/properties/${propertyId}/audit`),
    enabled: Boolean(propertyId),
  });

  return <div className="page-stack">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Audit log</h1><p>Property activity history across turns, work orders, inspections, and administration.</p></div></section>
    <section className="panel table-panel">
      {query.data?.events.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>When</th><th>Actor</th><th>Entity</th><th>Action</th><th>Details</th></tr></thead><tbody>
        {query.data.events.map((event) => <tr key={event.id}><td>{formatDate(event.createdAt)}</td><td>{event.actorName ?? "System"}</td><td>{event.entityType} · {event.entityId.slice(0, 8)}</td><td>{event.action.replaceAll(".", " · ")}</td><td className="muted">{summarize(event.details)}</td></tr>)}
      </tbody></table></div> : <EmptyState icon={ScrollText} title="No activity yet" detail="Actions taken in Property Suite will appear here." />}
    </section>
  </div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function summarize(details: Record<string, unknown>) {
  const parts = Object.entries(details).slice(0, 3).map(([key, value]) => `${key}: ${String(value)}`);
  return parts.join(" · ") || "—";
}
