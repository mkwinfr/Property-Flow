import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ApartmentDetail.css";

type Apartment = {
  id: number | string;
  unitNumber?: string;
  building?: string | null;
  beds?: number | null;
  baths?: number | null;
  status?: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function ApartmentDetailPage() {
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

        const data = (await response.json()) as Apartment[];
        if (cancelled) return;

        setApartments(Array.isArray(data) ? data : []);
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
      if (apartment.building) {
        unique.add(apartment.building);
      }
    });

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [apartments]);

  const filteredApartments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return apartments.filter((apartment) => {
      const matchesBuilding =
        buildingFilter === "all" || (apartment.building ?? "").toLowerCase() === buildingFilter;

      const label = `${apartment.unitNumber ?? ""} ${apartment.building ?? ""}`.toLowerCase();
      const matchesSearch = search === "" || label.includes(search);

      return matchesBuilding && matchesSearch;
    });
  }, [apartments, buildingFilter, searchTerm]);

  const handleOpenDetail = (id: number | string) => {
    navigate(`/apartments/${id}`);
  };

  return (
    <div className="apartments-page">
      <div className="apartments-container">
        <header className="apartments-header">
          <div>
            <p className="apartments-kicker">Apartments</p>
            <h1 className="apartments-title">Unit Directory</h1>
            <p className="apartments-subtitle">
              Browse every unit, filter by building, or search by number.
            </p>
          </div>
          <div className="apartments-meta">
            <div>
              <p className="meta-label">Total units</p>
              <strong className="meta-value">{apartments.length}</strong>
            </div>
            <div>
              <p className="meta-label">Showing</p>
              <strong className="meta-value">{filteredApartments.length}</strong>
            </div>
          </div>
        </header>

        <section className="apartments-controls">
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
        </section>

        {loading && <div className="apartments-state">Loading apartments…</div>}
        {error && !loading && <div className="apartments-state error">{error}</div>}

        {!loading && !error && (
          <section className="apartments-list">
            {filteredApartments.length === 0 ? (
              <div className="apartments-state muted">No apartments match your filters.</div>
            ) : (
              filteredApartments.map((apartment) => (
                <article
                  key={apartment.id}
                  className="apartment-card"
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
                      <p className="card-kicker">Unit</p>
                      <h2 className="card-title">{apartment.unitNumber ?? "—"}</h2>
                      {apartment.building && <p className="card-subtitle">{apartment.building}</p>}
                    </div>
                    {apartment.status && <span className="status-pill">{apartment.status}</span>}
                  </div>

                  <div className="card-grid">
                    <div>
                      <p className="meta-label">Beds</p>
                      <p className="meta-value">{apartment.beds ?? "—"}</p>
                    </div>
                    <div>
                      <p className="meta-label">Baths</p>
                      <p className="meta-value">{apartment.baths ?? "—"}</p>
                    </div>
                    <div>
                      <p className="meta-label">Building</p>
                      <p className="meta-value">{apartment.building ?? "—"}</p>
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
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}
