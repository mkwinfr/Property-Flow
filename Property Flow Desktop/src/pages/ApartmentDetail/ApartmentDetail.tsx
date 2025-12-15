import { useEffect, useMemo, useState } from "react";
import { MemoryRouter, useInRouterContext } from "react-router-dom";
import { apiUrl } from "../../config/api";

type Apartment = {
  id: number | string;
  unitNumber?: string;
  building?: string | null;
  beds?: number | null;
  baths?: number | null;
  status?: string | null;
};

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
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | string | null>(null);
  const [apartmentDetail, setApartmentDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [turnQuery, setTurnQuery] = useState("");
  const [workOrderQuery, setWorkOrderQuery] = useState("");
  const [vendorQuery, setVendorQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchApartments = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(apiUrl("/api/apartments"));

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

  const statuses = useMemo(() => {
    const unique = new Set<string>();
    apartments.forEach((apartment) => {
      const status = (apartment.status ?? "").trim();
      if (status) unique.add(status);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [apartments]);

  const filteredApartments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return apartments.filter((apartment) => {
      const matchesBuilding =
        buildingFilter === "all" || (apartment.building ?? "").toLowerCase() === buildingFilter;

      const matchesStatus =
        statusFilter === "all" || (apartment.status ?? "").toLowerCase() === statusFilter;

      const label = `${apartment.unitNumber ?? ""} ${apartment.building ?? ""}`.toLowerCase();
      const matchesSearch =
        search === "" ||
        label.includes(search) ||
        String(apartment.id ?? "").toLowerCase().includes(search);

      return matchesBuilding && matchesStatus && matchesSearch;
    });
  }, [apartments, buildingFilter, statusFilter, searchTerm]);

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
    setSelectedApartmentId(id);
  };

  useEffect(() => {
    const fetchDetail = async () => {
      if (!selectedApartmentId) return;
      try {
        setDetailLoading(true);
        setDetailError(null);
        const res = await fetch(apiUrl(`/api/apartments/${selectedApartmentId}/detail`));
        if (!res.ok) throw new Error(`Failed to load apartment ${selectedApartmentId}`);
        const data = await res.json();
        setApartmentDetail(data);
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : "Failed to load apartment detail.");
        setApartmentDetail(null);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [selectedApartmentId]);

  const filteredTurns = useMemo(() => {
    const q = turnQuery.toLowerCase();
    const turns = apartmentDetail?.turns ?? [];
    if (!q) return turns;
    return turns.filter(
      (turn: any) =>
        String(turn.id).toLowerCase().includes(q) ||
        (turn.turnNotes ?? "").toLowerCase().includes(q) ||
        (turn.status ?? "").toLowerCase().includes(q),
    );
  }, [apartmentDetail, turnQuery]);

  const filteredWorkOrders = useMemo(() => {
    const q = workOrderQuery.toLowerCase();
    const orders = apartmentDetail?.workOrders ?? [];
    if (!q) return orders;
    return orders.filter(
      (wo: any) =>
        (wo.summary ?? "").toLowerCase().includes(q) ||
        (wo.status ?? "").toLowerCase().includes(q) ||
        String(wo.id).toLowerCase().includes(q),
    );
  }, [apartmentDetail, workOrderQuery]);

  const filteredVendors = useMemo(() => {
    const q = vendorQuery.toLowerCase();
    // Placeholder vendor card uses work orders as stand-in vendor jobs for now
    const vendorJobs = apartmentDetail?.workOrders ?? [];
    if (!q) return vendorJobs;
    return vendorJobs.filter(
      (job: any) =>
        (job.summary ?? "").toLowerCase().includes(q) ||
        (job.status ?? "").toLowerCase().includes(q) ||
        String(job.id).toLowerCase().includes(q),
    );
  }, [apartmentDetail, vendorQuery]);

  return (
    <div className="apartments-page pf-page">
      <div className="apartments-container">
        <div className="apartments-topline">
          <h1 className="apartments-title pf-page-title">Apartment Index</h1>
        </div>

        <section className="apartments-toolbar">
          <div className="apartments-toolbar-card">
              <div className="apartments-toolbar-row">
              <label className="control-group">
                <select
                  value={buildingFilter}
                  onChange={(event) => setBuildingFilter(event.target.value)}
                  aria-label="Filter apartments by building"
                >
                  <option value="all">Building</option>
                  {buildings.map((building) => (
                    <option key={building} value={building.toLowerCase()}>
                      {building}
                    </option>
                  ))}
                </select>
              </label>

              <label className="control-group">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter apartments by status"
                >
                  <option value="all">Status</option>
                  {statuses.map((status) => (
                    <option key={status} value={status.toLowerCase()}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <div className="control-group search search-inline">
                <div className="search-with-meta">
                  <input
                    type="search"
                    placeholder="Search by unit or building"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    aria-label="Search apartments"
                  />
                  <div className="search-meta">
                    <div>
                      <p className="meta-label pf-meta-label">Total</p>
                      <strong className="meta-value pf-meta-value">{apartments.length}</strong>
                    </div>
                    <span className="meta-divider" aria-hidden="true" />
                    <div>
                      <p className="meta-label pf-meta-label">Showing</p>
                      <strong className="meta-value pf-meta-value">{filteredApartments.length}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                  <div className="apartments-table">
                    <div className="apartments-table-header">
                      <span>Unit</span>
                      <span>Building</span>
                      <span>Status</span>
                      <span>Layout</span>
                    </div>
                    {group.units.map((apartment) => (
                      <button
                        key={apartment.id}
                        className="apartments-table-row"
                        type="button"
                        onClick={() => handleOpenDetail(apartment.id)}
                      >
                        <span className="cell primary">
                          {apartment.unitNumber ? `Apartment ${apartment.unitNumber}` : "Unit"}
                        </span>
                        <span className="cell">{apartment.building ?? "N/A"}</span>
                        <span className="cell status">{apartment.status ?? "Pending"}</span>
                        <span className="cell">
                          {apartment.beds ?? "N/A"} BD {apartment.baths ?? "N/A"} BA
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {selectedApartmentId && (
          <section className="apartment-profile">
            <div className="apartment-group-header">
              <h3>Apartment Profile</h3>
              <span>Unit {apartmentDetail?.unitNumber ?? selectedApartmentId}</span>
            </div>

            {detailLoading && <div className="apartments-state">Loading apartment profile…</div>}
            {detailError && !detailLoading && (
              <div className="apartments-state error">{detailError}</div>
            )}

            {apartmentDetail && !detailLoading && !detailError && (
              <div className="profile-grid">
                <article className="pf-card">
                  <h4 className="pf-card-title">Overview</h4>
                  <div className="card-grid">
                    <div>
                      <p className="meta-label pf-meta-label">Unit</p>
                      <p className="meta-value pf-meta-value">
                        {apartmentDetail.unitNumber ?? "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="meta-label pf-meta-label">Building</p>
                      <p className="meta-value pf-meta-value">
                        {apartmentDetail.building ?? "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="meta-label pf-meta-label">Status</p>
                      <p className="meta-value pf-meta-value">
                        {apartmentDetail.status ?? "Pending"}
                      </p>
                    </div>
                    <div>
                      <p className="meta-label pf-meta-label">Layout</p>
                      <p className="meta-value pf-meta-value">
                        {apartmentDetail.beds ?? "N/A"} BD {apartmentDetail.baths ?? "N/A"} BA
                      </p>
                    </div>
                  </div>
                </article>

                <article className="pf-card">
                  <h4 className="pf-card-title">Turns / Make Ready</h4>
                  <div className="control-group">
                    <label className="pf-meta-label">Filter</label>
                    <input
                      type="search"
                      placeholder="Search turn status or notes"
                      value={turnQuery}
                      onChange={(e) => setTurnQuery(e.target.value)}
                    />
                  </div>
                  {filteredTurns.length === 0 ? (
                    <p className="pf-meta-label">No turns yet.</p>
                  ) : (
                    <div className="profile-list">
                      {filteredTurns.map((turn: any) => (
                        <div key={turn.id} className="profile-list-row">
                          <div>
                            <p className="meta-label pf-meta-label">Turn #{turn.id}</p>
                            <p className="meta-value pf-meta-value">{turn.status}</p>
                            {turn.turnNotes && <p className="pf-muted">{turn.turnNotes}</p>}
                          </div>
                          <button
                            className="card-action"
                            type="button"
                            onClick={() =>
                              window.dispatchEvent(
                                new CustomEvent("navigate-to-board", {
                                  detail: { turnId: turn.id },
                                }),
                              )
                            }
                          >
                            Open in Make Ready Board
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="pf-card">
                  <h4 className="pf-card-title">Work Orders</h4>
                  <div className="control-group">
                    <label className="pf-meta-label">Filter</label>
                    <input
                      type="search"
                      placeholder="Search summary or status"
                      value={workOrderQuery}
                      onChange={(e) => setWorkOrderQuery(e.target.value)}
                    />
                  </div>
                  {filteredWorkOrders.length === 0 ? (
                    <p className="pf-meta-label">No work orders.</p>
                  ) : (
                    <div className="profile-list">
                      {filteredWorkOrders.map((wo: any) => (
                        <div key={wo.id} className="profile-list-row">
                          <div>
                            <p className="meta-label pf-meta-label">WO #{wo.id}</p>
                            <p className="meta-value pf-meta-value">{wo.summary}</p>
                            <p className="pf-muted">Status: {wo.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="pf-card">
                  <h4 className="pf-card-title">Vendor Work</h4>
                  <div className="control-group">
                    <label className="pf-meta-label">Filter</label>
                    <input
                      type="search"
                      placeholder="Search vendor jobs"
                      value={vendorQuery}
                      onChange={(e) => setVendorQuery(e.target.value)}
                    />
                  </div>
                  {filteredVendors.length === 0 ? (
                    <p className="pf-meta-label">No vendor work yet.</p>
                  ) : (
                    <div className="profile-list">
                      {filteredVendors.map((job: any) => (
                        <div key={job.id} className="profile-list-row">
                          <div>
                            <p className="meta-label pf-meta-label">Job #{job.id}</p>
                            <p className="meta-value pf-meta-value">{job.summary}</p>
                            <p className="pf-muted">Status: {job.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="pf-card">
                  <h4 className="pf-card-title">Materials</h4>
                  <p className="pf-meta-label">
                    Materials tracking placeholder — will sync with inventory soon.
                  </p>
                </article>

                <article className="pf-card">
                  <h4 className="pf-card-title">Resident Information</h4>
                  <p className="pf-meta-label">Resident profile placeholder.</p>
                </article>
              </div>
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
