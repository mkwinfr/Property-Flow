import { useEffect, useMemo, useState } from "react";
import { MemoryRouter, useInRouterContext, useNavigate } from "react-router-dom";

type Apartment = {
  id: number | string;
  unitNumber?: string;
  building?: string | null;
  beds?: number | null;
  baths?: number | null;
  status?: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type ApartmentsResponse =
  | Apartment[]
  | { apartments?: Apartment[] | null; units?: Apartment[] | null };

const normalizeApartments = (payload: ApartmentsResponse): Apartment[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.apartments)) return payload.apartments;
  if (Array.isArray(payload.units)) return payload.units;
  return [];
};

function ApartmentDetailPageContent() {
  const navigate = useNavigate();

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchApartments = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE}/api/apartments`);

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as ApartmentsResponse;
        if (cancelled) return;

        setApartments(normalizeApartments(payload));
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load apartments.";
        setError(message);
        setApartments([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchApartments();

    return () => {
      cancelled = true;
    };
  }, []);

  const buildings = useMemo(() => {
    const unique = new Set<string>();
    apartments.forEach((apartment) => {
      if (apartment.building && apartment.building.trim() !== "") {
        unique.add(apartment.building);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [apartments]);

  const filteredApartments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return apartments.filter((apartment) => {
      const matchesBuilding =
        buildingFilter === "all" || (apartment.building ?? "").toLowerCase() === buildingFilter;

      const label = `${apartment.unitNumber ?? ""} ${apartment.building ?? ""}`.toLowerCase();
      const matchesSearch =
        search === "" ||
        label.includes(search) ||
        String(apartment.id ?? "").toLowerCase().includes(search);

      return matchesBuilding && matchesSearch;
    });
  }, [apartments, buildingFilter, searchTerm]);

  const groupedApartments = useMemo(() => {
    const isFiltered = buildingFilter !== "all";
    const groups = new Map<string, Apartment[]>();

    filteredApartments.forEach((unit) => {
      const groupKey =
        isFiltered && buildingFilter !== "all"
          ? buildings.find((b) => b.toLowerCase() === buildingFilter) ?? buildingFilter
          : unit.building ?? "Other";

      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(unit);
    });

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" }))
      .map(([label, units]) => ({
        label,
        units: [...units].sort((a, b) =>
          String(a.unitNumber ?? "").localeCompare(String(b.unitNumber ?? ""), undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        ),
      }));
  }, [filteredApartments, buildingFilter, buildings]);

  const handleOpenDetail = (id: number | string) => {
    navigate(`/apartments/${id}`);
  };

  return (
    <div className="apartments-page pf-page">
      <div className="apartments-container">
        <header className="apartments-header">
          <div className="apartments-hero">
            <h1 className="apartments-title pf-page-title">Apartment Index</h1>
            <p className="apartments-subtitle pf-page-subtitle">
              Browse every unit, filter by building, or search by number.
            </p>
          </div>
          <div className="apartments-meta">
            <div>
              <p className="meta-label pf-meta-label">Total units</p>
              <strong className="meta-value pf-meta-value">{apartments.length}</strong>
            </div>
            <div>
              <p className="meta-label pf-meta-label">Showing</p>
              <strong className="meta-value pf-meta-value">{filteredApartments.length}</strong>
            </div>
          </div>
        </header>

        <section className="apartments-toolbar">
          <div className="apartments-controls">
            <label className="control-group">
              <span>Building</span>
              <select
                value={buildingFilter}
                onChange={(event) => setBuildingFilter(event.target.value)}
                aria-label="Filter apartments by building"
              >
                <option value="all">All buildings</option>
                {buildings.map((building) => (
                  <option key={building} value={building.toLowerCase()}>
                    {building}
                  </option>
                ))}
              </select>
            </label>

            <label className="control-group search">
              <span>Search</span>
              <input
                type="search"
                placeholder="Search by unit or building"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search apartments"
              />
            </label>
          </div>
        </section>

        {loading && <div className="apartments-state">Loading apartments...</div>}
        {error && !loading && <div className="apartments-state error">{error}</div>}

        {!loading && !error && (
          <section className="apartments-groups">
            {groupedApartments.length === 0 ? (
              <div className="apartments-state muted">No apartments match your filters.</div>
            ) : (
              groupedApartments.map((group) => (
                <div key={group.label} className="apartment-group">
                  <div className="apartment-group-header">
                    <h3>{group.label}</h3>
                    <span>{group.units.length} units</span>
                  </div>
                  <div className="apartments-list">
                    {group.units.map((apartment) => (
                      <article
                        key={apartment.id}
                        className="apartment-card pf-card"
                        onClick={() => handleOpenDetail(apartment.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleOpenDetail(apartment.id);
                          }
                        }}
                      >
                        <div className="card-top">
                          <div>
                            <p className="card-kicker">Apartment</p>
                            <h2 className="card-title">
                              {apartment.unitNumber ? `Apartment ${apartment.unitNumber}` : "Unit"}
                            </h2>
                            <p className="card-subtitle">
                              Building: {apartment.building ?? "N/A"}
                            </p>
                          </div>
                          {apartment.status && (
                            <span className="status-pill pf-pill pf-pill-success">
                              {apartment.status}
                            </span>
                          )}
                        </div>

                        <div className="card-grid">
                          <div>
                            <p className="meta-label pf-meta-label">Layout</p>
                            <p className="meta-value pf-meta-value">
                              {apartment.beds ?? "N/A"} BD {apartment.baths ?? "N/A"} BA
                            </p>
                          </div>
                          <div>
                            <p className="meta-label pf-meta-label">Building</p>
                            <p className="meta-value pf-meta-value">{apartment.building ?? "N/A"}</p>
                          </div>
                          <div>
                            <p className="meta-label pf-meta-label">Status</p>
                            <p className="meta-value pf-meta-value">
                              {apartment.status ?? "Pending"}
                            </p>
                          </div>
                        </div>

                        <button
                          className="card-action"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenDetail(apartment.id);
                          }}
                        >
                          View details
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default function ApartmentDetailPage() {
  const inRouter = useInRouterContext();

  if (!inRouter) {
    return (
      <MemoryRouter>
        <ApartmentDetailPageContent />
      </MemoryRouter>
    );
  }

  return <ApartmentDetailPageContent />;
}
