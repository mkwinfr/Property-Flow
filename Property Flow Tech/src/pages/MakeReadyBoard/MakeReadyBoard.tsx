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

const PRIORITY_CHIP = (priority?: MakeReadyItem["priority"]) => {
  switch (priority) {
    case "Urgent":
      return "bg-red-500/15 text-red-300 border-red-500/60";
    case "High":
      return "bg-orange-500/15 text-orange-300 border-orange-500/60";
    case "Medium":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/60";
    case "Low":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/60";
    default:
      return "bg-slate-500/15 text-slate-200 border-slate-500/60";
  }
};

const STATUS_LABEL: Record<MakeReadyStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  READY: "Ready",
  ON_HOLD: "On Hold",
};

const STATUS_CHIP: Record<MakeReadyStatus, string> = {
  NOT_STARTED: "bg-slate-700/60 text-slate-100 border-slate-500/70",
  IN_PROGRESS: "bg-sky-600/30 text-sky-100 border-sky-400/70",
  READY: "bg-emerald-600/30 text-emerald-100 border-emerald-400/70",
  ON_HOLD: "bg-amber-700/40 text-amber-100 border-amber-500/70",
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
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">
          Make Ready Board
        </h1>
        <p className="text-xs text-slate-400">
          Live snapshot of upcoming turns with assignments and due dates.
        </p>
      </div>

      {usingDemo && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-900/40 px-3 py-2 text-xs text-red-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Couldn't reach <span className="font-mono text-red-200">{API_URL}</span>. Showing demo
            data while we retry.
          </span>
        </div>
      )}

      {loading && !sortedItems.length && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading turns…</span>
          </div>
        </div>
      )}

      {!loading && sortedItems.length === 0 && (
        <div className="text-xs text-slate-500 border border-dashed border-slate-700 rounded-xl px-3 py-4 text-center">
          No turns to display yet.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sortedItems.map((item) => (
          <MakeReadyCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

const MakeReadyCard: React.FC<{ item: MakeReadyItem }> = ({ item }) => {
  const statusChipClass = STATUS_CHIP[item.status];
  const statusLabel = STATUS_LABEL[item.status];

  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 to-slate-950/90 shadow-lg shadow-slate-950/40 px-4 py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-[10px] uppercase tracking-[0.14em] text-slate-400">
            <span>Unit</span>
            <div className="mt-1 inline-flex items-center gap-2">
              <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-950 text-xs font-semibold">
                {item.apartmentNumber}
              </span>
              {item.building && (
                <span className="px-2 py-1 rounded-full bg-slate-900 text-[11px] text-slate-100 border border-slate-600">
                  Bldg {item.building}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-medium ${statusChipClass}`}
          >
            {statusLabel}
          </span>
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-medium ${PRIORITY_CHIP(
              item.priority
            )}`}
          >
            {item.priority ?? "Priority"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="uppercase tracking-[0.16em] text-[10px] text-slate-500">
            Tech
          </span>
          <span>{item.techName || "Unassigned"}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="uppercase tracking-[0.16em] text-[10px] text-slate-500">
            Due
          </span>
          <span>
            {item.dueDate
              ? new Date(item.dueDate).toLocaleDateString()
              : "No due date"}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 md:col-span-2">
          <span className="uppercase tracking-[0.16em] text-[10px] text-slate-500">
            Notes
          </span>
          <span className="text-slate-200">
            {item.notes || item.turnType || "No notes"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MakeReadyBoard;
