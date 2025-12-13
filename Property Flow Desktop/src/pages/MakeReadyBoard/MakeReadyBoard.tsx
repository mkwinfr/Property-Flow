import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { MakeReadyItem, MakeReadyStatus } from "./MakeReadyBoard";
import MakeReadyTurnTechView from "./MakeReadyTurnTechView";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const API_URL = `${API_BASE}/api/make-ready-board`;

// Demo fallback data for when the API can't be reached
/* Demo data removed */

const STATUS_LABEL: Record<MakeReadyStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  READY: "Ready",
  ON_HOLD: "On Hold",
};

type MakeReadyBoardProps = {
  selectedTurnId?: string | null;
  onSelectTurn?: (id: string | null) => void;
};

const MakeReadyBoard: React.FC<MakeReadyBoardProps> = ({
  selectedTurnId,
  onSelectTurn,
}) => {
  const [items, setItems] = useState<MakeReadyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSelectedTurnId, setLocalSelectedTurnId] = useState<string | null>(null);

  const isControlled = typeof onSelectTurn === "function";
  const activeSelection = isControlled ? selectedTurnId ?? null : localSelectedTurnId;

  const handleSelect = useCallback(
    (id: string | null) => {
      if (onSelectTurn) {
        onSelectTurn(id);
      } else {
        setLocalSelectedTurnId(id);
      }
    },
    [onSelectTurn]
  );

  useEffect(() => {
    if (isControlled) {
      setLocalSelectedTurnId(selectedTurnId ?? null);
    }
  }, [isControlled, selectedTurnId]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(API_URL);
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data = await res.json();

      const rows = Array.isArray(data)
        ? data
        : Array.isArray((data as any).units)
        ? (data as any).units
        : [];

      const mapped: MakeReadyItem[] = rows.map((row: any) => {
        const rawStatus = (row.status as string | undefined) ?? "";
        const normalizedStatus = rawStatus
          ? (rawStatus.toUpperCase().replace(/\s+/g, "_") as MakeReadyStatus)
          : ("NOT_STARTED" as MakeReadyStatus);

        const safeStatus: MakeReadyStatus =
          normalizedStatus === "IN_PROGRESS" ||
          normalizedStatus === "READY" ||
          normalizedStatus === "ON_HOLD" ||
          normalizedStatus === "NOT_STARTED"
            ? normalizedStatus
            : "NOT_STARTED";

        const priority =
          (row.priority as MakeReadyItem["priority"]) ??
          ("Medium" as MakeReadyItem["priority"]);

        return {
          id: String(row.id),
          apartmentNumber: row.unitNumber ?? row.apartmentNumber ?? "N/A",
          building: row.building ?? null,
          turnType: row.type ?? row.turnType ?? "Turn",
          techName: row.techName ?? row.technician ?? null,
          priority,
          status: safeStatus,
          notes: row.notes ?? null,
          dueDate: row.dueDate ?? row.targetReadyDate ?? null,
          updatedAt: row.updatedAt ?? null,
        };
      });

      setItems(mapped);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to load make-ready data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const handleRefresh = () => fetchData();
    window.addEventListener("refresh-make-ready-board", handleRefresh);
    window.addEventListener("turn-created", handleRefresh);
    return () => {
      window.removeEventListener("refresh-make-ready-board", handleRefresh);
      window.removeEventListener("turn-created", handleRefresh);
    };
  }, [fetchData]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [items]);

  return (
    <div className="make-ready-root">
      <div className="make-ready-header">
        <h1 className="make-ready-title">Make Ready Board</h1>
        <p className="make-ready-subtitle">
          Live snapshot of upcoming turns with assignments and due dates.
        </p>
      </div>

      {error && (
        <div className="make-ready-error"><span>Error: Unable to Connect to The Back End</span></div>
      )}

      {loading && !sortedItems.length && (
        <div className="make-ready-loading">
          <Loader2 className="make-ready-loading-icon" />
          <span>Loading turns…</span>
        </div>
      )}

      {!loading && sortedItems.length === 0 && (
        <div className="make-ready-empty">
          No turns to display yet.
        </div>
      )}

      <div className="make-ready-layout">
        <div className="make-ready-list">
          {sortedItems.map((item) => (
            <MakeReadyCard 
              key={item.id} 
              item={item}
              isSelected={activeSelection === item.id}
              onSelect={() => handleSelect(item.id)}
            />
          ))}
        </div>

        {activeSelection && (
          <div className="make-ready-tech-view-container">
            <MakeReadyTurnTechView
              turnId={activeSelection}
              onClose={() => handleSelect(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface CardProps {
  item: MakeReadyItem;
  isSelected?: boolean;
  onSelect?: () => void;
}

const MakeReadyCard: React.FC<CardProps> = ({ item, isSelected, onSelect }) => {
  const statusLabel = STATUS_LABEL[item.status];

  return (
    <div 
      className={`make-ready-card ${isSelected ? 'make-ready-card--selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className="make-ready-card-header">
        <div className="make-ready-unit-block">
          <span className="make-ready-unit-label">Unit</span>
          <div className="make-ready-unit-chip-row">
            <span className="make-ready-unit-number">{item.apartmentNumber}</span>
            {item.building && (
              <span className="make-ready-unit-building">Bldg {item.building}</span>
            )}
          </div>
        </div>

        <div className="make-ready-chip-row">
          <span className={`make-ready-chip make-ready-chip-status status-${item.status.toLowerCase()}`}>
            {statusLabel}
          </span>
          <span className={`make-ready-chip make-ready-chip-priority priority-${(item.priority || "Medium").toLowerCase()}`}>
            {item.priority ?? "Priority"}
          </span>
        </div>
      </div>

        <div className="make-ready-meta-grid">
          <div className="make-ready-meta">
          <span className="make-ready-meta-label pf-meta-label">Tech</span>
          <span className="make-ready-meta-value pf-meta-value">{item.techName || "Unassigned"}</span>
        </div>

        <div className="make-ready-meta">
          <span className="make-ready-meta-label pf-meta-label">Due</span>
          <span className="make-ready-meta-value pf-meta-value">
            {item.dueDate
              ? new Date(item.dueDate).toLocaleDateString()
              : "No due date"}
          </span>
        </div>

        <div className="make-ready-meta make-ready-meta-notes">
          <span className="make-ready-meta-label pf-meta-label">Notes</span>
          <span className="make-ready-meta-value pf-meta-value">
            {item.notes || item.turnType || "No notes"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MakeReadyBoard;
