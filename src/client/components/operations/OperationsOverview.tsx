import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Boxes, ClipboardPen, PackageSearch, Waves, Wrench } from "lucide-react";
import type { OperationsSnapshot, WorkOrderSummary } from "../../../shared/contracts";
import { useProperty } from "../../contexts/PropertyContext";
import { api } from "../../lib/api";

export function OperationsOverview({ onNavigate }: { onNavigate: (tab: "work-orders" | "inspections" | "inventory" | "pool") => void }) {
  const { propertyId } = useProperty();
  const snapshot = useQuery({ queryKey: ["operations", propertyId], queryFn: () => api<{ operations: OperationsSnapshot }>(`/api/properties/${propertyId}/operations`), enabled: Boolean(propertyId) });
  const workOrders = useQuery({ queryKey: ["work-orders", propertyId], queryFn: () => api<{ workOrders: WorkOrderSummary[] }>(`/api/properties/${propertyId}/work-orders`), enabled: Boolean(propertyId) });
  const data = snapshot.data?.operations;
  if (!data) return <div className="page-loading"><span /><span /><span /></div>;
  const metrics = [
    { label: "Open work orders", value: data.workOrders.open, detail: `${data.workOrders.emergency} emergency · ${data.workOrders.overdue} overdue`, icon: Wrench, tone: "green", tab: "work-orders" as const },
    { label: "Draft inspections", value: data.inspections.draft, detail: `${data.inspections.damageFound} inspections with damage`, icon: ClipboardPen, tone: "amber", tab: "inspections" as const },
    { label: "Low stock", value: data.inventory.lowStock, detail: `$${data.inventory.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} inventory value`, icon: PackageSearch, tone: "coral", tab: "inventory" as const },
    { label: "Pool compliance", value: data.pool.exceptions, detail: data.pool.latestLogDate ? `Last logged ${formatDate(data.pool.latestLogDate)}` : "No readings logged", icon: Waves, tone: "blue", tab: "pool" as const },
  ];
  return <>
    <section className="metric-grid">{metrics.map(({ icon: Icon, tab, ...metric }) => <button className={`metric-card metric-card--${metric.tone} metric-card--button`} key={metric.label} onClick={() => onNavigate(tab)}><span className="metric-card__icon"><Icon size={20} /></span><div><small>{metric.label}</small><strong>{metric.value}</strong><p>{metric.detail}</p></div></button>)}</section>
    <section className="content-grid"><div className="panel panel--wide"><div className="panel__heading"><div><p className="eyebrow">Maintenance queue</p><h2>Priority work</h2></div><button className="text-button" onClick={() => onNavigate("work-orders")}>Open work orders <ArrowRight size={15} /></button></div><div className="ops-list">{workOrders.data?.workOrders.filter((item) => !["complete", "cancelled"].includes(item.status)).slice(0, 5).map((item) => <div className="ops-row" key={item.id}><span className={`ops-priority ops-priority--${item.priority}`}>{item.priority === "emergency" ? <AlertTriangle size={15} /> : <Wrench size={15} />}</span><span><strong>{item.title}</strong><small>Unit {item.unitNumber} · {item.category}</small></span><span className={`work-status work-status--${item.status}`}>{item.status.replaceAll("_", " ")}</span><span className="ops-row__due">{item.dueDate ? formatDate(item.dueDate) : "No due date"}</span></div>)}</div></div><aside className="panel operations-principles"><div className="panel__heading"><div><p className="eyebrow">Control center</p><h2>Operational design</h2></div><Boxes size={21} /></div><ul><li>One source of work across turns and maintenance</li><li>Inspection findings convert without re-entry</li><li>Stock changes retain cost and reason history</li><li>Compliance exceptions notify managers</li></ul></aside></section>
  </>;
}

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));

