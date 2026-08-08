import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, RotateCcw, UserRoundCheck, UsersRound } from "lucide-react";
import type { MyWorkTurn, TeamWorkloadMember, TurnBlockerQueueItem, TurnDetail } from "../../shared/contracts";
import { EmptyState } from "../components/EmptyState";
import { ProgressBar } from "../components/ProgressBar";
import { PriorityBadge, StatusBadge } from "../components/StatusBadge";
import { TurnDetailPanel } from "../components/TurnDetailPanel";
import { BlockerResolutionDialog } from "../components/TurnDetailPanel";
import { useAuth } from "../contexts/AuthContext";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";
import { useRouter } from "../lib/router";

export function MyWorkPage() {
  const { property, propertyId } = useProperty();
  const { can, user, displayRoles } = useAuth();
  const { path, navigate } = useRouter();
  const turnId = path.match(/^\/my-work\/([^/]+)$/)?.[1] ?? null;
  const [resolving, setResolving] = useState<TurnBlockerQueueItem | null>(null);
  const query = useQuery({
    queryKey: ["my-work", propertyId, user?.id],
    queryFn: () => api<{ turns: MyWorkTurn[] }>(`/api/properties/${propertyId}/my-work`),
    enabled: Boolean(propertyId && user),
  });
  const workload = useQuery({
    queryKey: ["team-workload", propertyId],
    queryFn: () => api<{ team: TeamWorkloadMember[] }>(`/api/properties/${propertyId}/team-workload`),
    enabled: Boolean(propertyId) && can("turns:review"),
  });
  const blockers = useQuery({
    queryKey: ["turn-blockers", propertyId],
    queryFn: () => api<{ blockers: TurnBlockerQueueItem[] }>(`/api/properties/${propertyId}/turn-blockers`),
    enabled: Boolean(propertyId) && can("turns:review"),
  });
  const turns = query.data?.turns ?? [];
  const metrics = useMemo(() => ({
    assigned: turns.length,
    overdue: turns.filter((turn) => isOverdue(turn.targetReadyDate)).length,
    blocked: turns.reduce((total, turn) => total + turn.blockedItems, 0),
    rework: turns.reduce((total, turn) => total + turn.reworkItems, 0),
  }), [turns]);

  return <div className="page-stack my-work-page">
    <section className="page-heading page-heading--my-work"><div><p className="eyebrow">{property?.name}</p><h1>My work</h1><p>Assigned Make Readies, current priorities, and returned work in one focused queue.</p></div><span className="my-work-person"><UserRoundCheck /><span><strong>{user?.name}</strong><small>{displayRoles.join(" · ")}</small></span></span></section>
    <section className="my-work-metrics"><article><BriefcaseBusiness /><span><small>Assigned</small><strong>{metrics.assigned}</strong></span></article><article className={metrics.overdue ? "attention" : ""}><Clock3 /><span><small>Overdue</small><strong>{metrics.overdue}</strong></span></article><article className={metrics.blocked ? "attention" : ""}><AlertTriangle /><span><small>Blocked items</small><strong>{metrics.blocked}</strong></span></article><article className={metrics.rework ? "attention" : ""}><RotateCcw /><span><small>Rework items</small><strong>{metrics.rework}</strong></span></article></section>
    <section className="panel my-work-queue"><div className="panel__heading"><div><p className="eyebrow">Technician queue</p><h2>Assigned Make Readies</h2></div><span>{turns.length} active</span></div>{turns.length ? <div className="my-work-grid">{turns.map((turn) => <button key={turn.id} className={`my-work-card${turn.reworkItems ? " my-work-card--rework" : turn.blockedItems ? " my-work-card--blocked" : ""}`} onClick={() => navigate(`/my-work/${turn.id}`)}><header><span className="unit-number">{turn.unitNumber}</span><span><StatusBadge status={turn.status} /><PriorityBadge priority={turn.priority} /></span></header><strong>{turn.floorPlanName}</strong><small>{turn.buildingName}</small><div className="my-work-card__alerts">{isOverdue(turn.targetReadyDate) && <em><Clock3 />Overdue</em>}{turn.reworkItems > 0 && <em><RotateCcw />{turn.reworkItems} rework</em>}{turn.blockedItems > 0 && <em><AlertTriangle />{turn.blockedItems} blocked</em>}{turn.inProgressItems > 0 && <em>{turn.inProgressItems} in progress</em>}</div><div className="my-work-card__date"><span><small>Target ready</small><strong>{formatDate(turn.targetReadyDate)}</strong></span><ArrowRight /></div><div className="my-work-card__progress"><span><small>Completed</small><b>{turn.completedItems}/{turn.totalItems}</b></span><ProgressBar complete={turn.completedItems} total={turn.totalItems} /></div></button>)}</div> : <EmptyState icon={UserRoundCheck} title="No active assignments" detail="New Make Ready assignments and manager-requested rework will appear here." />}</section>
    {can("turns:review") && <section className="panel blocker-queue"><div className="panel__heading"><div><p className="eyebrow">Cross-department follow-up</p><h2>Blocked Make Ready work</h2></div><span>{blockers.data?.blockers.length ?? 0} active</span></div>{blockers.data?.blockers.length ? <div className="blocker-queue-list">{blockers.data.blockers.map((blocker) => <article className={isPastDate(blocker.expectedResolutionDate) ? "overdue" : ""} key={blocker.id}><span className="blocker-queue-icon"><AlertTriangle /></span><span className="blocker-queue-copy"><strong>Unit {blocker.unitNumber} · {blocker.scopeTitle}</strong><small>{blocker.buildingName} · {blocker.scopeArea} · {blocker.leadTechnicianName ?? "Unassigned"}</small><p>{blocker.reason}</p><small>{blocker.category} · Open {formatAge(blocker.openedAt)}{blocker.responsibleParty ? ` · Owner: ${blocker.responsibleParty}` : ""}{blocker.expectedResolutionDate ? ` · Expected ${formatDate(blocker.expectedResolutionDate)}` : ""}</small></span><span className="blocker-queue-actions"><button className="button button--small button--ghost" onClick={() => navigate(`/my-work/${blocker.turnId}`)}>Open Make Ready</button><button className="button button--small button--secondary" onClick={() => setResolving(blocker)}><CheckCircle2 />Resolve</button></span></article>)}</div> : <p className="blocker-queue-empty">No Make Ready work is currently blocked.</p>}</section>}
    {can("turns:review") && <section className="panel team-workload"><div className="panel__heading"><div><p className="eyebrow">Manager view</p><h2>Team workload</h2></div><UsersRound /></div><div className="team-workload-list">{workload.data?.team.map((member) => <article key={member.userId}><span className="avatar">{member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><span><strong>{member.name}</strong><small>{member.roles}</small></span><span><small>Active</small><strong>{member.activeTurns}</strong></span><span className={member.overdueTurns ? "attention" : ""}><small>Overdue</small><strong>{member.overdueTurns}</strong></span><span className={member.blockedItems ? "attention" : ""}><small>Blocked</small><strong>{member.blockedItems}</strong></span><span className={member.reworkTurns ? "attention" : ""}><small>Rework</small><strong>{member.reworkTurns}</strong></span></article>)}</div></section>}
    <TurnDetailPanel turnId={turnId} onClose={() => navigate("/my-work")} />
    {resolving && <BlockerQueueResolution blocker={resolving} onClose={() => setResolving(null)} onSaved={async () => { setResolving(null); await Promise.all([blockers.refetch(), query.refetch(), workload.refetch()]); }} />}
  </div>;
}

function BlockerQueueResolution({ blocker, onClose, onSaved }: { blocker: TurnBlockerQueueItem; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const turn = useQuery({ queryKey: ["turn", blocker.turnId], queryFn: () => api<{ turn: TurnDetail }>(`/api/turns/${blocker.turnId}`) });
  const item = turn.data?.turn.items.find((entry) => entry.id === blocker.turnItemId);
  if (!turn.data || !item) return null;
  return <BlockerResolutionDialog turn={turn.data.turn} item={item} onClose={onClose} onSaved={onSaved} />;
}

function isOverdue(value: string | null) {
  return Boolean(value && new Date(`${value}T23:59:59`) < new Date());
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`)) : "Not set";
}

function isPastDate(value: string | null) {
  return Boolean(value && new Date(`${value}T23:59:59`) < new Date());
}

function formatAge(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  return days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"}`;
}
