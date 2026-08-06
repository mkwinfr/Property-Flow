import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Bell, Building2, CalendarClock, CheckCircle2, ClipboardList, Wrench } from "lucide-react";
import type { DashboardSnapshot, NotificationRecord, OperationsSnapshot, WorkOrderSummary } from "../../shared/contracts";
import { ProgressBar } from "../components/ProgressBar";
import { PriorityBadge, StatusBadge } from "../components/StatusBadge";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";
import { Link } from "../lib/router";

export function DashboardPage() {
  const { property, propertyId } = useProperty();
  const query = useQuery({ queryKey: ["dashboard", propertyId], queryFn: () => api<{ dashboard: DashboardSnapshot }>(`/api/properties/${propertyId}/dashboard`), enabled: Boolean(propertyId) });
  const operations = useQuery({ queryKey: ["operations", propertyId], queryFn: () => api<{ operations: OperationsSnapshot }>(`/api/properties/${propertyId}/operations`), enabled: Boolean(propertyId) });
  const workOrders = useQuery({ queryKey: ["work-orders", propertyId], queryFn: () => api<{ workOrders: WorkOrderSummary[] }>(`/api/properties/${propertyId}/work-orders`), enabled: Boolean(propertyId) });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ notifications: NotificationRecord[]; unread: number }>("/api/notifications") });
  const data = query.data?.dashboard;
  if (!data) return <PageLoading />;
  const occupiedPercent = Math.round((data.units.occupied / data.units.total) * 100);
  const occupiedStop = (data.units.occupied / data.units.total) * 100;
  const noticeStop = ((data.units.occupied + data.units.notice) / data.units.total) * 100;
  const vacantStop = ((data.units.occupied + data.units.notice + data.units.vacant) / data.units.total) * 100;
  const stats = [
    { label: "Open turns", value: data.turns.open, icon: ClipboardList, tone: "green", detail: `${data.turns.readyForReview} ready for review`, to: "/turns?view=open" },
    { label: "Attention", value: data.turns.attention, icon: AlertTriangle, tone: "coral", detail: `${data.turns.urgent} urgent · ${data.turns.overdue} overdue`, to: "/turns?view=attention" },
    { label: "On notice", value: data.units.notice, icon: CalendarClock, tone: "amber", detail: "Upcoming move-outs", to: "/units?status=notice" },
    { label: "Available", value: data.units.vacant, icon: CheckCircle2, tone: "blue", detail: `${data.units.down} units currently down`, to: "/units?status=vacant" },
  ];
  const openWork = workOrders.data?.workOrders.filter((item) => !["complete", "cancelled"].includes(item.status)) ?? [];

  return <div className="page-stack">
    <section className="page-heading page-heading--hero dashboard-hero"><div><p className="eyebrow">Today at {property?.name}</p><h1>Operations overview</h1><p>Focus the team on what needs movement today.</p></div><div className="occupancy-ring" style={{ "--value": `${occupiedPercent}%` } as React.CSSProperties}><strong>{occupiedPercent}%</strong><span>occupied</span></div></section>
    <section className="metric-grid">{stats.map(({ icon: Icon, ...stat }) => <Link className={`metric-card metric-card--${stat.tone} metric-card--button dashboard-metric-link`} to={stat.to} key={stat.label}><span className="metric-card__icon"><Icon size={20} /></span><div><small>{stat.label}</small><strong>{stat.value}</strong><p>{stat.detail}</p></div><ArrowRight className="metric-card__arrow" /></Link>)}</section>
    <section className="content-grid">
      <div className="panel panel--wide"><div className="panel__heading"><div><p className="eyebrow">Make ready</p><h2>Turns needing attention</h2></div><Link className="text-link" to="/turns">View board <ArrowRight size={15} /></Link></div><div className="turn-list">{data.recentTurns.map((turn) => <Link to={`/turns/${turn.id}`} className="turn-row" key={turn.id}><span className="unit-number">{turn.unitNumber}</span><span className="turn-row__identity"><strong>{turn.floorPlanName}</strong><small>{turn.buildingName}</small></span><StatusBadge status={turn.status} /><PriorityBadge priority={turn.priority} /><span className="turn-row__progress"><small>{turn.completedItems}/{turn.totalItems} tasks</small><ProgressBar complete={turn.completedItems} total={turn.totalItems} /></span><ArrowRight className="row-arrow" size={17} /></Link>)}</div></div>
      <aside className="panel portfolio-panel"><div className="panel__heading"><div><p className="eyebrow">Portfolio pulse</p><h2>Unit status</h2></div><Building2 size={22} /></div><div className="unit-status-overview"><div className="unit-status-ring" style={{ "--occupied-stop": `${occupiedStop}%`, "--notice-stop": `${noticeStop}%`, "--vacant-stop": `${vacantStop}%` } as React.CSSProperties}><span><strong>{data.units.total}</strong><small>Total units</small></span></div><dl className="legend-list"><div><dt><i className="dot dot--occupied" />Occupied</dt><dd>{data.units.occupied}</dd></div><div><dt><i className="dot dot--notice" />Notice</dt><dd>{data.units.notice}</dd></div><div><dt><i className="dot dot--vacant" />Vacant</dt><dd>{data.units.vacant}</dd></div><div><dt><i className="dot dot--down" />Down</dt><dd>{data.units.down}</dd></div></dl></div><Link className="button button--secondary button--full" to="/units">Open unit directory</Link></aside>
    </section>
    <section className="overview-operations-grid">
      <article className="panel overview-queue-panel"><div className="panel__heading"><div><p className="eyebrow">Property maintenance</p><h2>Work-order pulse</h2></div><Link className="text-link" to="/operations?tab=work-orders">Open queue <ArrowRight /></Link></div><div className="overview-queue-summary"><span><Wrench /><strong>{operations.data?.operations.workOrders.open ?? 0}</strong><small>open work orders</small></span><span className="overview-queue-summary__urgent"><AlertTriangle /><strong>{operations.data?.operations.workOrders.emergency ?? 0}</strong><small>emergency</small></span><span><CalendarClock /><strong>{operations.data?.operations.workOrders.overdue ?? 0}</strong><small>overdue</small></span></div><div className="overview-work-list">{openWork.slice(0, 3).map((item) => <div key={item.id}><span className={`ops-priority ops-priority--${item.priority}`}>{item.priority === "emergency" ? <AlertTriangle /> : <Wrench />}</span><span><strong>{item.title}</strong><small>Unit {item.unitNumber} · {item.category}</small></span><b>{item.status.replaceAll("_", " ")}</b></div>)}{!openWork.length && <p className="notification-empty">No open maintenance work orders.</p>}</div></article>
      <aside className="panel overview-message-panel"><div className="panel__heading"><div><p className="eyebrow">Team communication</p><h2>Recent updates</h2></div><span className="overview-unread"><Bell />{notifications.data?.unread ?? 0} unread</span></div><div className="overview-message-list">{notifications.data?.notifications.slice(0, 4).map((item) => <article className={item.readAt ? "" : "unread"} key={item.id}><i /><span><strong>{item.title}</strong><p>{item.message}</p><small>{relativeTime(item.createdAt)}</small></span></article>)}{!notifications.data?.notifications.length && <p className="notification-empty">Your team is all caught up.</p>}</div><footer>Use the notification bell to review and clear updates.</footer></aside>
    </section>
  </div>;
}

function PageLoading() { return <div className="page-loading"><span /><span /><span /></div>; }
function relativeTime(value: string) { const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "Just now"; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`; return `${Math.floor(seconds / 86_400)}d ago`; }
