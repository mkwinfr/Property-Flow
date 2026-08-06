import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, ClipboardCheck, Filter, Plus, Search, UserRoundCheck } from "lucide-react";
import type { TurnDetail, TurnStatus, TurnSummary } from "../../shared/contracts";
import { CreateTurnDialog } from "../components/CreateTurnDialog";
import { EmptyState } from "../components/EmptyState";
import { ProgressBar } from "../components/ProgressBar";
import { PriorityBadge } from "../components/StatusBadge";
import { TurnDetailPanel } from "../components/TurnDetailPanel";
import { useAuth } from "../contexts/AuthContext";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";
import { useRouter } from "../lib/router";

const columns: Array<{ status: TurnStatus; title: string; detail: string }> = [
  { status: "planned", title: "Planned", detail: "Not yet started" },
  { status: "in_progress", title: "In progress", detail: "Work underway" },
  { status: "ready_for_review", title: "Review", detail: "Manager action" },
  { status: "rework", title: "Rework", detail: "Returned to team" },
  { status: "complete", title: "Complete", detail: "Recently finished" },
];

export function TurnsPage() {
  const { property, propertyId } = useProperty();
  const { can, user } = useAuth();
  const { path, navigate } = useRouter();
  const turnId = path.match(/^\/turns\/([^/]+)$/)?.[1] ?? null;
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const initialView = new URLSearchParams(window.location.search).get("view");
  const [showCompleted, setShowCompleted] = useState(!["open", "attention"].includes(initialView ?? ""));
  const [attentionOnly, setAttentionOnly] = useState(initialView === "attention");
  const [onlyMine, setOnlyMine] = useState(false);
  const query = useQuery({
    queryKey: ["turns", propertyId],
    queryFn: () => api<{ turns: TurnSummary[] }>(`/api/properties/${propertyId}/turns`),
    enabled: Boolean(propertyId),
  });
  const visibleTurns = useMemo(() => {
    const term = search.toLowerCase().trim();
    return (query.data?.turns ?? []).filter((turn) => {
      const target = turn.targetReadyDate ? new Date(`${turn.targetReadyDate}T12:00:00`) : null;
      const needsAttention = turn.priority === "urgent" || Boolean(target && target < new Date() && !["complete", "cancelled"].includes(turn.status));
      return (showCompleted || turn.status !== "complete") && (!attentionOnly || needsAttention) && (!onlyMine || turn.leadTechnicianUserId === user?.id) && (!term || `${turn.unitNumber} ${turn.buildingName} ${turn.floorPlanName} ${turn.leadTechnicianName ?? ""}`.toLowerCase().includes(term));
    });
  }, [query.data, search, showCompleted, attentionOnly, onlyMine, user?.id]);

  return <div className="page-stack page-stack--board">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Make-ready board</h1><p>Move units through a consistent, accountable readiness workflow.</p></div>{can("turns:create") && <button className="button button--primary" onClick={() => setCreateOpen(true)}><Plus size={17} />Create turn</button>}</section>
    <section className="board-toolbar"><label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a unit, floor plan, or technician" /></label><button className={`filter-button ${attentionOnly ? "filter-button--active" : ""}`} onClick={() => setAttentionOnly((value) => !value)}><AlertTriangle size={16} />Attention</button><button className={`filter-button ${onlyMine ? "filter-button--active" : ""}`} onClick={() => setOnlyMine((value) => !value)}><UserRoundCheck size={16} />My assignments</button><button className={`filter-button ${showCompleted ? "filter-button--active" : ""}`} onClick={() => setShowCompleted((value) => !value)}><Filter size={16} />Completed</button><span className="board-count">{visibleTurns.filter((turn) => turn.status !== "complete").length} active turns</span></section>
    <section className="kanban-board">
      {columns.filter((column) => showCompleted || column.status !== "complete").map((column) => {
        const turns = visibleTurns.filter((turn) => turn.status === column.status);
        return <div className={`kanban-column kanban-column--${column.status}`} key={column.status}><header><span><strong>{column.title}</strong><small>{column.detail}</small></span><b>{turns.length}</b></header><div className="kanban-column__cards">{turns.map((turn) => <TurnCard turn={turn} key={turn.id} onClick={() => navigate(`/turns/${turn.id}`)} />)}{!turns.length && <EmptyState icon={ClipboardCheck} title="Nothing here" detail="Turns in this stage will appear here." />}</div></div>;
      })}
    </section>
    <section className="mobile-turn-queue" aria-label="Make Ready stage list">
      {columns.filter((column) => showCompleted || column.status !== "complete").map((column) => {
        const turns = visibleTurns.filter((turn) => turn.status === column.status);
        if (!turns.length) return null;
        return <section className={`mobile-turn-stage mobile-turn-stage--${column.status}`} key={column.status}><header><span><strong>{column.title}</strong><small>{column.detail}</small></span><b>{turns.length}</b></header><div>{turns.map((turn) => <MobileTurnRow turn={turn} key={turn.id} onClick={() => navigate(`/turns/${turn.id}`)} />)}</div></section>;
      })}
      {!visibleTurns.length && <EmptyState icon={ClipboardCheck} title="No Make Readies found" detail="Try clearing a filter or searching for a different unit." />}
    </section>
    <CreateTurnDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(turn: TurnDetail) => navigate(`/turns/${turn.id}`)} />
    <TurnDetailPanel turnId={turnId ?? null} onClose={() => navigate("/turns")} />
  </div>;
}

function MobileTurnRow({ turn, onClick }: { turn: TurnSummary; onClick: () => void }) {
  const target = turn.targetReadyDate ? new Date(`${turn.targetReadyDate}T12:00:00`) : null;
  const overdue = target && target < new Date() && !["complete", "cancelled"].includes(turn.status);
  return <button className="mobile-turn-row" onClick={onClick}><span className="unit-number">{turn.unitNumber}</span><span className="mobile-turn-row__identity"><strong>{turn.floorPlanName}</strong><small>{turn.buildingName} · {turn.leadTechnicianName ?? "Unassigned"}</small><span><ProgressBar complete={turn.completedItems} total={turn.totalItems} /><small>{turn.completedItems}/{turn.totalItems}</small></span></span><span className="mobile-turn-row__meta"><PriorityBadge priority={turn.priority} /><small className={overdue ? "text-danger" : ""}>{overdue ? "Overdue" : target ? target.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No target"}</small></span><ArrowRight /></button>;
}

function TurnCard({ turn, onClick }: { turn: TurnSummary; onClick: () => void }) {
  const target = turn.targetReadyDate ? new Date(`${turn.targetReadyDate}T12:00:00`) : null;
  const overdue = target && target < new Date() && !["complete", "cancelled"].includes(turn.status);
  return <button className="turn-card" onClick={onClick}>
    <div className="turn-card__top"><span className="unit-number">{turn.unitNumber}</span><PriorityBadge priority={turn.priority} /></div>
    <strong>{turn.floorPlanName}</strong><small>{turn.buildingName}</small>
    <span className="turn-card__lead"><UserRoundCheck />{turn.leadTechnicianName ?? "Unassigned"}</span>
    <div className="turn-card__date"><span>{overdue ? "Overdue" : "Target ready"}</span><strong className={overdue ? "text-danger" : ""}>{target ? target.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Not set"}</strong></div>
    <div className="turn-card__progress"><span><small>Work completed</small><b>{turn.completedItems}/{turn.totalItems}</b></span><ProgressBar complete={turn.completedItems} total={turn.totalItems} /></div>
  </button>;
}
