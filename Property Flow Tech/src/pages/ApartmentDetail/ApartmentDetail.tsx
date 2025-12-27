import { useEffect, useMemo, useState } from "react";
import { MemoryRouter, useInRouterContext } from "react-router-dom";
import { X } from "lucide-react";
import { apiUrl } from "@/config/api";

type Apartment = {
  id: number | string;
  unitNumber?: string;
  building?: string | null;
  beds?: number | null;
  baths?: number | null;
  status?: string | null;
  property?: string | null;
  minRent?: number | null;
  maxRent?: number | null;
  floorPlan?: {
    name?: string;
    sqFt?: number;
    marketRent?: number;
  } | null;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | string | null>(null);
  const [apartmentDetail, setApartmentDetail] = useState<any | null>(null);
  const [turnQuery, setTurnQuery] = useState("");
  const [workOrderQuery, setWorkOrderQuery] = useState("");
  const [vendorQuery, setVendorQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'overview' | 'turns' | 'workOrders' | 'appliances'>('overview');

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
    setSelectedApartmentId(id);
  };

  useEffect(() => {
    const fetchDetail = async () => {
      if (!selectedApartmentId) return;
      try {
        const res = await fetch(apiUrl(`/api/apartments/${selectedApartmentId}/detail`));
        if (!res.ok) throw new Error(`Failed to load apartment ${selectedApartmentId}`);
        const data = await res.json();
        setApartmentDetail(data);
      } catch {
        setApartmentDetail(null);
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
                            <h2 className="card-title">
                              Unit {apartment.unitNumber ?? "N/A"}
                            </h2>
                            <p className="card-kicker card-field-plan">
                              {apartment.floorPlan?.name ?? "Floor Plan N/A"}
                            </p>
                          </div>
                        </div>

                        <div className="card-grid">
                          <div className="card-field-beds">
                            <p className="meta-label pf-meta-label">Beds</p>
                            <p className="meta-value pf-meta-value">
                              {apartment.beds ?? "N/A"}
                            </p>
                          </div>
                          <div className="card-field-baths">
                            <p className="meta-label pf-meta-label">Bath</p>
                            <p className="meta-value pf-meta-value">
                              {apartment.baths ?? "N/A"}
                            </p>
                          </div>
                        </div>

                        {apartment.status && (
                          <span className="status-pill pf-pill pf-pill-success card-field-status">
                            {apartment.status}
                          </span>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {selectedApartmentId && (
          <div className="apartment-detail-modal-overlay" onClick={() => setSelectedApartmentId(null)}>
            <div className="apartment-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="apartment-detail-modal-header">
                <div className="apartment-detail-modal-title">
                  <h3>Apartment Profile</h3>
                  <span>Unit {apartmentDetail?.unitNumber ?? selectedApartmentId}</span>
                </div>
                <button 
                  className="apartment-detail-modal-close"
                  onClick={() => setSelectedApartmentId(null)}
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="apartment-detail-tabs">
                <button
                  className={`apartment-detail-tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button
                  className={`apartment-detail-tab ${activeTab === 'turns' ? 'active' : ''}`}
                  onClick={() => setActiveTab('turns')}
                >
                  Turns
                </button>
                <button
                  className={`apartment-detail-tab ${activeTab === 'workOrders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('workOrders')}
                >
                  Work Orders
                </button>
                <button
                  className={`apartment-detail-tab ${activeTab === 'appliances' ? 'active' : ''}`}
                  onClick={() => setActiveTab('appliances')}
                >
                  Appliances
                </button>
              </div>

              {activeTab === 'overview' && (
                <div className="apartment-detail-content">
                  <div className="apartment-detail-two-column">
                    <article className="pf-card">
                      <h4 className="pf-card-title">Apartment Details</h4>
                      <div className="card-grid">
                        <div>
                          <p className="meta-label pf-meta-label">Unit</p>
                          <p className="meta-value pf-meta-value">
                            {apartmentDetail?.unitNumber ?? "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="meta-label pf-meta-label">Building</p>
                          <p className="meta-value pf-meta-value">
                            {apartmentDetail?.building ?? "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="meta-label pf-meta-label">Status</p>
                          <p className="meta-value pf-meta-value">
                            {apartmentDetail?.status ?? "Pending"}
                          </p>
                        </div>
                        <div>
                          <p className="meta-label pf-meta-label">Layout</p>
                          <p className="meta-value pf-meta-value">
                            {apartmentDetail?.beds ?? "N/A"} BD {apartmentDetail?.baths ?? "N/A"} BA
                          </p>
                        </div>
                        <div>
                          <p className="meta-label pf-meta-label">Floor Plan</p>
                          <p className="meta-value pf-meta-value">
                            {apartmentDetail?.floorPlan?.name ?? "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="meta-label pf-meta-label">Square Feet</p>
                          <p className="meta-value pf-meta-value">
                            {apartmentDetail?.floorPlan?.sqFt ?? apartmentDetail?.sqFt ?? "N/A"} sq ft
                          </p>
                        </div>
                        <div>
                          <p className="meta-label pf-meta-label">Rent Range</p>
                          <p className="meta-value pf-meta-value">
                            ${apartmentDetail?.minRent ?? apartmentDetail?.floorPlan?.marketRent ?? "N/A"}
                            {apartmentDetail?.maxRent && apartmentDetail.minRent !== apartmentDetail.maxRent 
                              ? ` - $${apartmentDetail.maxRent}` 
                              : ''}
                          </p>
                        </div>
                        <div>
                          <p className="meta-label pf-meta-label">Deposit</p>
                          <p className="meta-value pf-meta-value">
                            ${apartmentDetail?.floorPlan?.requiredDeposit ?? "N/A"}
                          </p>
                        </div>
                      </div>
                    </article>

                    <article className="pf-card">
                      <h4 className="pf-card-title">Resident Information</h4>
                      <p className="pf-meta-label">No current resident data available.</p>
                      <p className="pf-muted" style={{ fontSize: '12px', marginTop: '8px' }}>
                        Resident profiles will be integrated in a future update.
                      </p>
                    </article>
                  </div>
                </div>
              )}

              {activeTab === 'turns' && (
                <div className="apartment-detail-content">
                  <article className="pf-card">
                    <h4 className="pf-card-title">Make Ready Turns</h4>
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
                </div>
              )}

              {activeTab === 'workOrders' && (
                <div className="apartment-detail-content">
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

                  <article className="pf-card" style={{ marginTop: '20px' }}>
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
                </div>
              )}

              {activeTab === 'appliances' && (
                <div className="apartment-detail-content">
                  <article className="pf-card">
                    <h4 className="pf-card-title">Appliance Inventory</h4>
                    <p className="pf-meta-label">No appliances tracked yet.</p>
                    <p className="pf-muted" style={{ fontSize: '12px', marginTop: '8px' }}>
                      Appliance tracking will allow you to monitor:
                    </p>
                    <ul className="pf-muted" style={{ fontSize: '12px', marginTop: '8px', paddingLeft: '20px' }}>
                      <li>Refrigerator (model, install date, warranty)</li>
                      <li>Stove/Oven (model, install date, warranty)</li>
                      <li>Dishwasher (model, install date, warranty)</li>
                      <li>Microwave (model, install date, warranty)</li>
                      <li>Washer/Dryer (model, install date, warranty)</li>
                      <li>HVAC Unit (model, install date, last service)</li>
                    </ul>
                  </article>
                </div>
              )}
            </div>
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
