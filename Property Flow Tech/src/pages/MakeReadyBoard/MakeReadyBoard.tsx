import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { apiUrl } from "@/config/api";
import { PunchListModal } from "@/components/PunchList/PunchListModal";
import type { MakeReadyItem, MakeReadyStatus } from "./MakeReadyBoard";
import MakeReadyTurnTechView from "./MakeReadyTurnTechView";

const API_URL = apiUrl("/api/make-ready-board");

// Demo fallback data for when the API can't be reached
/* Demo data removed */

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
  const [showPunchList, setShowPunchList] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<{ id: string; number: string } | null>(null);

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

  const handleOpenPunchList = useCallback((item: MakeReadyItem) => {
    setSelectedApartment({
      id: item.id,
      number: item.apartmentNumber,
    });
    setShowPunchList(true);
  }, []);

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
          <div className="make-ready-header-row">
            <span className="make-ready-header-col">Apartment</span>
            <span className="make-ready-header-col">Tech</span>
            <span className="make-ready-header-col">Move Out</span>
            <span className="make-ready-header-col">Target</span>
          </div>
          {sortedItems.map((item) => (
            <MakeReadyCard 
              key={item.id} 
              item={item}
              isSelected={activeSelection === item.id}
              onSelect={() => handleSelect(item.id)}
              onPunchList={() => handleOpenPunchList(item)}
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

      <PunchListModal
        isOpen={showPunchList}
        onClose={() => {
          setShowPunchList(false);
          setSelectedApartment(null);
        }}
        turnId={selectedApartment ? parseInt(selectedApartment.id) : undefined}
        apartmentNumber={selectedApartment?.number || ""}
        floorPlan="Floor Plan A"
      />
    </div>
  );
};

interface CardProps {
  item: MakeReadyItem;
  isSelected?: boolean;
  onSelect?: () => void;
  onPunchList?: () => void;
}

const MakeReadyCard: React.FC<CardProps> = ({ item, isSelected, onSelect, onPunchList }) => {
  return (
    <div 
      className={`make-ready-card ${isSelected ? 'make-ready-card--selected' : ''}`}
    >
      <div className="make-ready-card-content" onClick={onSelect} role="button" tabIndex={0}>
        <span className="make-ready-card-apt">{item.apartmentNumber}</span>
        <span className="make-ready-card-tech">{item.techName || "Unassigned"}</span>
        <span className="make-ready-card-date">
          {item.updatedAt
            ? new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : "—"}
        </span>
        <span className="make-ready-card-date">
          {item.dueDate
            ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : "—"}
        </span>
      </div>
      <button 
        className="make-ready-card-punch-btn"
        onClick={(e) => {
          e.stopPropagation();
          onPunchList?.();
        }}
        title="Open Punch List"
      >
        📋
      </button>
    </div>
  );
};

export default MakeReadyBoard;
