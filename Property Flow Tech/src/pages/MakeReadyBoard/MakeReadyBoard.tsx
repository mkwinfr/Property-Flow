import React, { useEffect, useMemo, useState } from "react";
import "./MakeReadyBoard.css";

const API_URL = "/api/make-ready-board";

interface MakeReadyUnit {
  id: string;
  unitNumber: string;
  building?: string;
  status: string;
  technician?: string;
  priority?: string;
  dueDate?: string;
  notes?: string;
}

const fallbackUnits: MakeReadyUnit[] = [
  {
    id: "101",
    unitNumber: "101",
    building: "A",
    status: "In Progress",
    technician: "Robin M.",
    priority: "High",
    dueDate: "2024-08-15",
    notes: "Paint and flooring scheduled.",
  },
  {
    id: "204",
    unitNumber: "204",
    building: "B",
    status: "Scheduled",
    technician: "Kayla R.",
    priority: "Medium",
    dueDate: "2024-08-18",
    notes: "Awaiting countertop delivery.",
  },
  {
    id: "305",
    unitNumber: "305",
    building: "C",
    status: "Ready for QC",
    technician: "Samir P.",
    priority: "Low",
    dueDate: "2024-08-12",
    notes: "Need final walk before move-in.",
  },
];

const MakeReadyBoard: React.FC = () => {
  const [units, setUnits] = useState<MakeReadyUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchUnits = async () => {
      try {
        const response = await fetch(API_URL, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const payload: MakeReadyUnit[] = Array.isArray(data?.units)
          ? data.units
          : Array.isArray(data)
          ? data
          : [];

        setUnits(payload);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;

        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setUnits([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchUnits();

    return () => controller.abort();
  }, []);

  const unitsToDisplay = useMemo(() => {
    if (loading) return [];
    if (units.length > 0) return units;
    return fallbackUnits;
  }, [loading, units]);

  return (
    <div className="page-root make-ready-root">
      <header className="page-header">
        <h1 className="page-title">Make Ready Board</h1>
        <p className="page-subtitle">
          Live snapshot of upcoming turns with assignments and due dates.
        </p>
      </header>

      <div className="divider" role="presentation" />

      <div className="page-body">
        {loading && (
          <div className="status-banner" role="status">
            Loading latest make ready data...
          </div>
        )}

        {error && !loading && (
          <div className="status-banner status-banner--error" role="alert">
            Couldn&apos;t reach {API_URL}. Showing demo data while we retry.
          </div>
        )}

        {unitsToDisplay.map((unit) => (
          <article key={unit.id} className="unit-card">
            <div className="unit-card__header">
              <div className="unit-card__title">
                <span className="unit-card__label">Unit</span>
                <span className="unit-card__unit">{unit.unitNumber}</span>
                {unit.building && (
                  <span className="unit-card__building">Bldg {unit.building}</span>
                )}
              </div>
              <div className="unit-card__meta">
                <span className="pill pill--status">{unit.status}</span>
                {unit.priority && (
                  <span className={`pill pill--priority-${unit.priority.toLowerCase()}`}>
                    {unit.priority} Priority
                  </span>
                )}
              </div>
            </div>

            <div className="unit-card__details">
              {unit.technician && (
                <div className="detail-row">
                  <span className="detail-label">Tech</span>
                  <span className="detail-value">{unit.technician}</span>
                </div>
              )}
              {unit.dueDate && (
                <div className="detail-row">
                  <span className="detail-label">Due</span>
                  <span className="detail-value">
                    {new Date(unit.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {unit.notes && (
                <div className="detail-row">
                  <span className="detail-label">Notes</span>
                  <span className="detail-value">{unit.notes}</span>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default MakeReadyBoard;