import { useEffect, useMemo, useState } from "react";
import { MemoryRouter, useInRouterContext } from "react-router-dom";
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

// Support either a plain array of apartments or an object wrapper
type ApartmentsResponse = Apartment[] | { apartments: Apartment[] };

function normalizeApartments(data: ApartmentsResponse): Apartment[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray((data as any).apartments)) {
    return (data as any).apartments as Apartment[];
  }

  return [];
}

function ApartmentDetailPageContent() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

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

        const raw = (await response.json()) as ApartmentsResponse;
        if (cancelled) return;

        const normalized = normalizeApartments(raw);
        setApartments(normalized);
      } catch (err) {
        console.error("Failed to load apartments", err);
        if (!cancelled) {
          setError("Unable to load apartments.");
        }
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

    apartments.forEach((apt) => {
      if (apt.building && apt.building.trim() !== "") {
        unique.add(apt.building);
      }
    });

    return ["all", ...Array.from(unique)];
  }, [apartments]);

  const filteredApartments = useMemo(
    () =>
      apartments.filter((apartment) => {
        const matchesBuilding =
          buildingFilter === "all" ||
          (apartment.building ?? "") === buildingFilter;

        const q = searchTerm.trim().toLowerCase();
        const matchesSearch =
          q === "" ||
          apartment.unitNumber?.toLowerCase().includes(q) ||
          apartment.building?.toLowerCase().includes(q) ||
          String(apartment.id).toLowerCase().includes(q);

        return matchesBuilding && matchesSearch;
      }),
    [apartments, buildingFilter, searchTerm]
  );

  return (
    <div className="apartment-detail-page">
      <div className="apartment-detail-header">
        <div className="apartment-detail-eyebrow">APARTMENT DETAIL</div>
        <h1 className="apartment-detail-title">Apartments</h1>
        <p className="apartment-detail-subtitle">
          Browse and search all units. Use filters to narrow by building or unit.
        </p>
      </div>

      <div className="apartment-detail-filters">
        <select
          className="apartment-detail-building-select"
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
        >
          {buildings.map((b) => (
            <option key={b} value={b}>
              {b === "all" ? "All Buildings" : b}
            </option>
          ))}
        </select>

        <input
          className="apartment-detail-search-input"
          type="text"
          placeholder="Search by unit, building, or ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="apartment-detail-body">
        {loading && (
          <div className="apartment-detail-status">Loading apartments…</div>
        )}

        {error && !loading && (
          <div className="apartment-detail-error">{error}</div>
        )}

        {!loading && !error && (
          <div className="apartment-list">
            {filteredApartments.length === 0 ? (
              <div className="apartment-detail-empty">
                No apartments match your filters.
              </div>
            ) : (
              filteredApartments.map((apartment) => (
                <div key={apartment.id} className="apartment-card">
                  <div className="apartment-card-main">
                    <div className="apartment-card-unit">
                      {apartment.unitNumber || `Unit ${apartment.id}`}
                    </div>
                    {apartment.building && (
                      <div className="apartment-card-building">
                        {apartment.building}
                      </div>
                    )}
                  </div>

                  <div className="apartment-card-meta">
                    {(apartment.beds != null || apartment.baths != null) && (
                      <span className="apartment-card-beds-baths">
                        {apartment.beds != null ? `${apartment.beds} bd` : ""}
                        {apartment.beds != null && apartment.baths != null
                          ? " • "
                          : ""}
                        {apartment.baths != null ? `${apartment.baths} ba` : ""}
                      </span>
                    )}
                    {apartment.status && (
                      <span className="apartment-card-status">
                        {apartment.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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
