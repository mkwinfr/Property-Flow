import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { apiUrl } from "@/config/api";
import { TurnModal } from "@/components/TurnModal";
import type { MakeReadyItem, MakeReadyStatus } from "./MakeReadyBoard";

const API_URL = apiUrl("/api/make-ready-board");

// Demo fallback data for when the API can't be reached
/* Demo data removed */

type MakeReadyBoardProps = {
  // Future: selection handling if needed
};

const MakeReadyBoard: React.FC<MakeReadyBoardProps> = () => {
  const [items, setItems] = useState<MakeReadyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTurnData, setSelectedTurnData] = useState<any>(null);
  const [showTurnModal, setShowTurnModal] = useState(false);

  const handleOpenTurnModal = useCallback((item: MakeReadyItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTurnData(item);
    setShowTurnModal(true);
  }, []);

  const handleCloseTurnModal = useCallback(() => {
    setShowTurnModal(false);
    setSelectedTurnData(null);
  }, []);

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
            <React.Fragment key={item.id}>
              <MakeReadyCard 
                item={item}
                onOpenTurn={(e) => handleOpenTurnModal(item, e)}
              />
            </React.Fragment>
          ))}
        </div>

      </div>

      <TurnModal
        isOpen={showTurnModal}
        turn={selectedTurnData}
        onClose={handleCloseTurnModal}
      />
    </div>
  );
};

interface CardProps {
  item: MakeReadyItem;
  onOpenTurn?: (e: React.MouseEvent) => void;
}

const MakeReadyCard: React.FC<CardProps> = ({ 
  item,
  onOpenTurn
}) => {
  return (
    <div 
      className="make-ready-card"
    >
      <div className="make-ready-card-content">
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
      <div className="make-ready-card-actions">
        <button 
          className="make-ready-card-btn"
          onClick={onOpenTurn}
          title="Open Turn Details"
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default MakeReadyBoard;
