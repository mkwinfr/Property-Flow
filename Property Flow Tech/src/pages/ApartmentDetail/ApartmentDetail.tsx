import { useEffect, useMemo, useState } from "react";
import "./ApartmentDetail.css";

type PunchItem = {
  id: number | string;
  task: string;
  completed: boolean;
};

type TimelineEntry = {
  id?: number | string;
  timestamp?: string;
  description?: string;
  label?: string;
};

type Apartment = {
  id: number;
  unitNumber: string;
  building?: string;
  status?: string;
  moveIn?: string;
  turnType?: string;
  priority?: string;
  notes?: string;
  punchItems?: PunchItem[];
  timeline?: TimelineEntry[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const formatDate = (value?: string) => {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

type ApartmentDetailPageProps = {
  apartmentId?: string | number;
};

function ApartmentDetailPage({ apartmentId: propApartmentId }: ApartmentDetailPageProps) {
  const resolvedApartmentId = useMemo(() => {
    if (propApartmentId !== undefined && propApartmentId !== null) {
      return String(propApartmentId);
    }

    if (typeof window !== "undefined") {
      const historyState = (window.history.state ?? {}) as {
        apartmentId?: string;
        id?: string;
      };

      const searchParams = new URLSearchParams(window.location.search);
      const searchId = searchParams.get("id");

      const pathIdMatch = window.location.pathname.match(/apartment[s]?\/?(\w+)/i);
      const pathId = pathIdMatch?.[1];

      return historyState.apartmentId ?? historyState.id ?? searchId ?? pathId ?? null;
    }

    return null;
  }, [propApartmentId]);

  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [punchItems, setPunchItems] = useState<PunchItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!resolvedApartmentId) {
      setApartment(null);
      setPunchItems([]);
      setNotes("");
      setError("Apartment ID not provided.");
      return undefined;
    }

    const fetchApartment = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/api/apartments/${resolvedApartmentId}`);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data: Apartment = await response.json();
        if (cancelled) return;

        setApartment(data);
        setPunchItems(Array.isArray(data.punchItems) ? data.punchItems : []);
        setNotes(data.notes ?? "");
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load apartment.";
        setError(message);
        setApartment(null);
        setPunchItems([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchApartment();

    return () => {
      cancelled = true;
    };
  }, [resolvedApartmentId]);

  const punchSummary = useMemo(() => {
    const total = punchItems.length;
    const completed = punchItems.filter((item) => item.completed).length;
    return { total, completed };
  }, [punchItems]);

  return (
    <div className="apartment-page">
      <div className="apartment-container">
        <header className="apartment-header">
          <div>
            <p className="apartment-kicker">Apartment Detail</p>
            <h1 className="apartment-title">
              {apartment?.unitNumber ? `Unit ${apartment.unitNumber}` : "Apartment"}
            </h1>
            {apartment?.building && <p className="apartment-subtitle">Building {apartment.building}</p>}
          </div>
          {apartment?.status && <span className="status-pill">{apartment.status}</span>}
        </header>

        {loading && <div className="apartment-state">Loading apartment...</div>}
        {error && !loading && <div className="apartment-state error">{error}</div>}

        {!loading && !error && apartment && (
          <>
            <section className="apartment-section">
              <div className="apartment-info-grid">
                <div className="apartment-info-card">
                  <div className="card-header">
                    <h2>Unit Overview</h2>
                    {apartment.priority && <span className="badge priority">{apartment.priority}</span>}
                  </div>
                  <ul className="info-list">
                    <li>
                      <span>Unit Number</span>
                      <strong>{apartment.unitNumber ?? "—"}</strong>
                    </li>
                    <li>
                      <span>Building</span>
                      <strong>{apartment.building ?? "—"}</strong>
                    </li>
                    <li>
                      <span>Turn Type</span>
                      <strong>{apartment.turnType ?? "—"}</strong>
                    </li>
                    <li>
                      <span>Status</span>
                      <strong>{apartment.status ?? "—"}</strong>
                    </li>
                    <li>
                      <span>Move-In Date</span>
                      <strong>{formatDate(apartment.moveIn)}</strong>
                    </li>
                    <li>
                      <span>Priority</span>
                      <strong>{apartment.priority ?? "—"}</strong>
                    </li>
                  </ul>
                </div>

                <div className="apartment-info-card">
                  <div className="card-header">
                    <h2>Quick Summary</h2>
                  </div>
                  <div className="summary-row">
                    <div>
                      <p className="summary-label">Punch Items</p>
                      <p className="summary-value">
                        {punchSummary.completed} of {punchSummary.total} complete
                      </p>
                    </div>
                    <div>
                      <p className="summary-label">Move-In</p>
                      <p className="summary-value">{formatDate(apartment.moveIn)}</p>
                    </div>
                  </div>
                  <div className="summary-row">
                    <div>
                      <p className="summary-label">Turn Type</p>
                      <p className="summary-value">{apartment.turnType ?? "—"}</p>
                    </div>
                    <div>
                      <p className="summary-label">Status</p>
                      <p className="summary-value">{apartment.status ?? "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="apartment-section apartment-layout">
              <div className="apartment-main">
                <div className="apartment-info-card">
                  <div className="card-header">
                    <h2>Punch List</h2>
                    <span className="badge subtle">
                      {punchSummary.completed} / {punchSummary.total} complete
                    </span>
                  </div>
                  <ul className="punch-list">
                    {punchItems.length === 0 && <li className="punch-item empty">No punch items listed.</li>}
                    {punchItems.map((item) => (
                      <li key={item.id} className="punch-item">
                        <label>
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => {
                              setPunchItems((prev) =>
                                prev.map((punch) =>
                                  punch.id === item.id ? { ...punch, completed: !punch.completed } : punch
                                )
                              );
                            }}
                          />
                          <span>{item.task}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="apartment-info-card">
                  <div className="card-header">
                    <h2>Notes</h2>
                  </div>
                  <textarea
                    className="notes-box"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add quick unit notes, vendor info, or walk findings..."
                  />
                </div>
              </div>

              {apartment.timeline && apartment.timeline.length > 0 && (
                <div className="apartment-sidebar">
                  <div className="apartment-info-card timeline">
                    <div className="card-header">
                      <h2>Timeline</h2>
                    </div>
                    <ul>
                      {apartment.timeline.map((entry) => (
                        <li
                          key={entry.id ?? `${entry.timestamp}-${entry.description}`}
                          className="timeline-item"
                        >
                          <p className="timeline-date">{formatDate(entry.timestamp)}</p>
                          <p className="timeline-description">
                            {entry.description ?? entry.label ?? "Update"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default ApartmentDetailPage;
