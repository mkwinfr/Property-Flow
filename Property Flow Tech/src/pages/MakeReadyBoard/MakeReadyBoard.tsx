import React, { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import type { MakeReadyItem, MakeReadyStatus } from "./MakeReadyBoard";
import "./MakeReadyBoard.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const API_URL = `${API_BASE}/api/make-ready-board`;

// Demo fallback data for when the API can't be reached
const DEMO_ITEMS: MakeReadyItem[] = [
  {
    id: "demo-1",
    apartmentNumber: "101",
    building: "A",
    turnType: "Full Turn",
    techName: "Robin M.",
    priority: "High",
    status: "IN_PROGRESS",
    notes: "Paint and flooring scheduled.",
    dueDate: "2024-08-14T00:00:00.000Z",
    updatedAt: null,
  },
  {
    id: "demo-2",
    apartmentNumber: "204",
    building: "B",
    turnType: "Scheduled",
    techName: "Kayla R.",
    priority: "Medium",
    status: "NOT_STARTED",
    notes: "Awaiting countertop delivery.",
    dueDate: "2024-08-17T00:00:00.000Z",
    updatedAt: null,
  },
  {
    id: "demo-3",
    apartmentNumber: "305",
    building: "C",
    turnType: "Ready for QC",
    techName: "Samir P.",
    priority: "Low",
    status: "READY",
    notes: "Need final walk before move-in.",
    dueDate: "2024-08-11T00:00:00.000Z",
    updatedAt: null,
  },
];

const STATUS_LABEL: Record<MakeReadyStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  READY: "Ready",
  ON_HOLD: "On Hold",
};

const MakeReadyBoard: React.FC = () => {
  const [items, setItems] = useState<MakeReadyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setUsingDemo(false);

        const res = await fetch(API_URL);
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const data = await res.json();
        if (cancelled) return;

        console.log("Make Ready API response:", data);

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
        if (!cancelled) {
          // On error, fall back to demo data so the board still looks alive
          setError(err.message ?? "Failed to load make-ready data");
          setItems(DEMO_ITEMS);
          setUsingDemo(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

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

      {usingDemo && (
        <div className="make-ready-error">
          <AlertTriangle className="make-ready-error-icon" />
          <span>
            Couldn't reach <span className="make-ready-error-url">{API_URL}</span>. Showing demo
            data while we retry.
          </span>
        </div>
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

      <div className="make-ready-list">
        {sortedItems.map((item) => (
          <MakeReadyCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

interface CardProps {
  item: MakeReadyItem;
}

const MakeReadyCard: React.FC<CardProps> = ({ item }) => {
  const statusLabel = STATUS_LABEL[item.status];

  return (
    <div className="make-ready-card">
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
          <span className="make-ready-meta-label">Tech</span>
          <span className="make-ready-meta-value">{item.techName || "Unassigned"}</span>
        </div>

        <div className="make-ready-meta">
          <span className="make-ready-meta-label">Due</span>
          <span className="make-ready-meta-value">
            {item.dueDate
              ? new Date(item.dueDate).toLocaleDateString()
              : "No due date"}
          </span>
        </div>

        <div className="make-ready-meta make-ready-meta-notes">
          <span className="make-ready-meta-label">Notes</span>
          <span className="make-ready-meta-value">
            {item.notes || item.turnType || "No notes"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MakeReadyBoard;
