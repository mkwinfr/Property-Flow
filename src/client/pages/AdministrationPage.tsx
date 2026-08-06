import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type {
  AdminPropertyStructure,
  AdminPropertySummary,
  AdminUnitRecord,
  AdminUnitUpdateInput,
  OccupancyStatus,
  PropertyOnboardingInput,
} from "../../shared/contracts";
import { useAuth } from "../contexts/AuthContext";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";
import { ScopeTemplatesDialog } from "../components/admin/ScopeTemplatesDialog";
import { AppSelect } from "../components/AppSelect";

type FloorPlanDraft = { id: number; name: string; bedrooms: string; bathrooms: string; squareFeet: string };
const emptyDetails = {
  name: "",
  code: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  timezone: "America/Chicago",
};

function parseUnits(text: string): PropertyOnboardingInput["units"] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines[0]?.toLowerCase().startsWith("unit")) lines.shift();
  return lines.map((line, index) => {
    const fields = line.split(",").map((field) => field.trim());
    if (fields.length < 3 || !fields[0] || !fields[1] || !fields[2]) {
      throw new Error(`Unit line ${index + 1} needs unit number, building, and floor plan`);
    }
    const floor = fields[3] ? Number(fields[3]) : null;
    if (floor !== null && !Number.isInteger(floor)) throw new Error(`Unit line ${index + 1} has an invalid floor`);
    const status = (fields[4] || "vacant").toLowerCase();
    if (!["occupied", "vacant", "notice", "down"].includes(status)) {
      throw new Error(`Unit line ${index + 1} has an invalid occupancy status`);
    }
    return {
      unitNumber: fields[0],
      buildingName: fields[1],
      floorPlanName: fields[2],
      floor,
      occupancyStatus: status as PropertyOnboardingInput["units"][number]["occupancyStatus"],
    };
  });
}

function PropertyOnboardingDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { setPropertyId } = useProperty();
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState(emptyDetails);
  const [buildingText, setBuildingText] = useState("Building 1");
  const [floorPlans, setFloorPlans] = useState<FloorPlanDraft[]>([
    { id: 1, name: "", bedrooms: "1", bathrooms: "1", squareFeet: "" },
  ]);
  const [nextPlanId, setNextPlanId] = useState(2);
  const [unitText, setUnitText] = useState("unit,building,floorPlan,floor,status\n");
  const [error, setError] = useState("");

  const buildings = useMemo(
    () => buildingText.split(/\r?\n/).map((name) => name.trim()).filter(Boolean),
    [buildingText],
  );
  const parsedUnits = useMemo(() => {
    try { return { units: parseUnits(unitText), error: "" }; }
    catch (reason) { return { units: [], error: reason instanceof Error ? reason.message : "Invalid unit rows" }; }
  }, [unitText]);

  const mutation = useMutation({
    mutationFn: (input: PropertyOnboardingInput) =>
      api<{ property: AdminPropertySummary }>("/api/admin/properties/onboard", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async ({ property }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-properties"] }),
        queryClient.invalidateQueries({ queryKey: ["properties"] }),
      ]);
      setPropertyId(property.id);
      onClose();
    },
  });

  const validateStep = () => {
    setError("");
    if (step === 0 && Object.values(details).some((value) => !value.trim())) {
      setError("Complete every property detail before continuing");
      return false;
    }
    if (step === 1) {
      if (!buildings.length) { setError("Add at least one building"); return false; }
      if (floorPlans.some((plan) => !plan.name.trim() || !plan.squareFeet || Number(plan.squareFeet) < 100)) {
        setError("Complete every floor plan, including square footage");
        return false;
      }
    }
    if (step === 2 && parsedUnits.error) { setError(parsedUnits.error); return false; }
    return true;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateStep()) return;
    try {
      await mutation.mutateAsync({
        ...details,
        code: details.code.toUpperCase(),
        state: details.state.toUpperCase(),
        buildings: buildings.map((name) => ({ name })),
        floorPlans: floorPlans.map((plan) => ({
          name: plan.name.trim(),
          bedrooms: Number(plan.bedrooms),
          bathrooms: Number(plan.bathrooms),
          squareFeet: Number(plan.squareFeet),
        })),
        units: parsedUnits.units,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Property could not be created");
    }
  };

  const steps = ["Property", "Structure", "Units"];
  return (
    <div className="modal-layer">
      <section className="dialog property-onboarding" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
        <header className="dialog__header">
          <span className="dialog__icon"><Building2 /></span>
          <div><p className="eyebrow">Property onboarding</p><h2 id="onboard-title">Add a property</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
        </header>
        <div className="onboarding-steps">
          {steps.map((label, index) => <span className={index === step ? "active" : index < step ? "complete" : ""} key={label}><b>{index < step ? <Check /> : index + 1}</b>{label}</span>)}
        </div>
        <form onSubmit={submit}>
          {step === 0 && <div className="form-grid">
            <label className="field field--full"><span>Property name</span><input required value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} placeholder="Community or portfolio name" /></label>
            <label className="field"><span>Property code</span><input required maxLength={12} value={details.code} onChange={(event) => setDetails({ ...details, code: event.target.value.toUpperCase() })} placeholder="ABC" /></label>
            <label className="field"><span>Timezone</span><AppSelect ariaLabel="Timezone" value={details.timezone} onChange={(value) => setDetails({ ...details, timezone: value })} options={["America/Chicago", "America/New_York", "America/Denver", "America/Phoenix", "America/Los_Angeles"].map((value) => ({ value, label: value }))} /></label>
            <label className="field field--full"><span>Street address</span><input required value={details.addressLine1} onChange={(event) => setDetails({ ...details, addressLine1: event.target.value })} /></label>
            <label className="field"><span>City</span><input required value={details.city} onChange={(event) => setDetails({ ...details, city: event.target.value })} /></label>
            <label className="field"><span>State</span><input required maxLength={2} value={details.state} onChange={(event) => setDetails({ ...details, state: event.target.value.toUpperCase() })} /></label>
            <label className="field"><span>Postal code</span><input required value={details.postalCode} onChange={(event) => setDetails({ ...details, postalCode: event.target.value })} /></label>
          </div>}

          {step === 1 && <div className="structure-step">
            <label className="field"><span>Buildings <small>One name per line</small></span><textarea rows={7} value={buildingText} onChange={(event) => setBuildingText(event.target.value)} /></label>
            <div className="floor-plan-editor">
              <div className="field-heading"><span>Floor plans</span><button type="button" className="button button--small button--secondary" onClick={() => { setFloorPlans([...floorPlans, { id: nextPlanId, name: "", bedrooms: "1", bathrooms: "1", squareFeet: "" }]); setNextPlanId(nextPlanId + 1); }}><Plus /> Add</button></div>
              {floorPlans.map((plan) => <div className="floor-plan-row" key={plan.id}>
                <input aria-label="Floor plan name" placeholder="A1" value={plan.name} onChange={(event) => setFloorPlans(floorPlans.map((item) => item.id === plan.id ? { ...item, name: event.target.value } : item))} />
                <input aria-label="Bedrooms" type="number" min="0" max="20" value={plan.bedrooms} onChange={(event) => setFloorPlans(floorPlans.map((item) => item.id === plan.id ? { ...item, bedrooms: event.target.value } : item))} />
                <input aria-label="Bathrooms" type="number" min="0" max="20" step="0.5" value={plan.bathrooms} onChange={(event) => setFloorPlans(floorPlans.map((item) => item.id === plan.id ? { ...item, bathrooms: event.target.value } : item))} />
                <input aria-label="Square feet" type="number" min="100" placeholder="Sq ft" value={plan.squareFeet} onChange={(event) => setFloorPlans(floorPlans.map((item) => item.id === plan.id ? { ...item, squareFeet: event.target.value } : item))} />
                <button type="button" className="icon-button" disabled={floorPlans.length === 1} onClick={() => setFloorPlans(floorPlans.filter((item) => item.id !== plan.id))}><Trash2 /></button>
              </div>)}
              <div className="floor-plan-labels"><span>Name</span><span>Beds</span><span>Baths</span><span>Square feet</span></div>
            </div>
          </div>}

          {step === 2 && <div className="units-import">
            <div className="import-guidance"><strong>Paste units as comma-separated rows</strong><p>Use the exact building and floor-plan names from the previous step. Units can be added later, so only the header is allowed.</p><code>101,Building 1,A1,1,vacant</code></div>
            <label className="field"><span>Unit rows <small>unit, building, floor plan, floor, status</small></span><textarea rows={12} value={unitText} onChange={(event) => setUnitText(event.target.value)} spellCheck={false} /></label>
            <div className="import-summary"><span><strong>{buildings.length}</strong> buildings</span><span><strong>{floorPlans.length}</strong> floor plans</span><span><strong>{parsedUnits.units.length}</strong> units</span></div>
          </div>}

          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="dialog__footer onboarding-footer">
            <button type="button" className="button button--ghost" disabled={step === 0} onClick={() => { setError(""); setStep(step - 1); }}><ChevronLeft /> Back</button>
            <span />
            {step < 2
              ? <button type="button" className="button button--primary" onClick={() => { if (validateStep()) setStep(step + 1); }}>Continue <ChevronRight /></button>
              : <button className="button button--primary" disabled={mutation.isPending}>{mutation.isPending ? "Creating…" : "Create property"}</button>}
          </footer>
        </form>
      </section>
    </div>
  );
}

const removeMigrationFlag = (notes: string | null) =>
  notes?.replace(/^MIGRATION REVIEW REQUIRED:[^.]*\.\s*/, "").trim() ?? "";

function UnitReviewDialog({ property, onClose }: { property: AdminPropertySummary; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [floorPlanId, setFloorPlanId] = useState("");
  const [floor, setFloor] = useState("");
  const [occupancyStatus, setOccupancyStatus] = useState<OccupancyStatus>("occupied");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["admin-property-structure", property.id],
    queryFn: () => api<AdminPropertyStructure>(`/api/admin/properties/${property.id}/structure`),
  });
  const selected = query.data?.reviewUnits.find((unit) => unit.id === selectedId) ?? null;

  useEffect(() => {
    if (!query.data) return;
    if (!query.data.reviewUnits.some((unit) => unit.id === selectedId)) {
      setSelectedId(query.data.reviewUnits[0]?.id ?? "");
    }
  }, [query.data, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setFloorPlanId(selected.floorPlanName === "UNASSIGNED - REVIEW REQUIRED" ? "" : selected.floorPlanId);
    setFloor(selected.floor == null ? "" : String(selected.floor));
    setOccupancyStatus(selected.occupancyStatus);
    setNotes(removeMigrationFlag(selected.notes));
    setError("");
  }, [selected]);

  const mutation = useMutation({
    mutationFn: ({ unit, input }: { unit: AdminUnitRecord; input: AdminUnitUpdateInput }) =>
      api<{ unit: AdminUnitRecord }>(`/api/admin/properties/${property.id}/units/${unit.id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-property-structure", property.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-properties"] }),
        queryClient.invalidateQueries({ queryKey: ["units", property.id] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", property.id] }),
      ]);
    },
  });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !floorPlanId) {
      setError("Select the confirmed floor plan before resolving this unit");
      return;
    }
    const parsedFloor = floor.trim() ? Number(floor) : null;
    if (parsedFloor !== null && !Number.isInteger(parsedFloor)) {
      setError("Floor must be a whole number or left blank");
      return;
    }
    setError("");
    try {
      await mutation.mutateAsync({
        unit: selected,
        input: {
          floorPlanId,
          floor: parsedFloor,
          occupancyStatus,
          notes: notes.trim() || null,
          resolveReview: true,
        },
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unit could not be updated");
    }
  };

  return <div className="modal-layer">
    <section className="dialog unit-review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <header className="dialog__header">
        <span className="dialog__icon dialog__icon--warning"><AlertTriangle /></span>
        <div><p className="eyebrow">Review required</p><h2 id="review-title">{property.name} units</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
      </header>
      {query.isLoading && <div className="review-loading">Loading flagged units…</div>}
      {query.error && <div className="form-error review-loading">{query.error instanceof Error ? query.error.message : "Flagged units could not be loaded"}</div>}
      {query.data && query.data.reviewUnits.length === 0 && <div className="review-complete"><Check /><h3>All imported units are resolved</h3><p>No units at this property currently require review.</p><button className="button button--primary" onClick={onClose}>Done</button></div>}
      {query.data && query.data.reviewUnits.length > 0 && <div className="review-workspace">
        <aside className="review-unit-list" aria-label="Units requiring review">
          <header><strong>{query.data.reviewUnits.length}</strong><span>remaining</span></header>
          {query.data.reviewUnits.map((unit) => <button type="button" className={unit.id === selectedId ? "active" : ""} onClick={() => setSelectedId(unit.id)} key={unit.id}>
            <span className="unit-number">{unit.unitNumber}</span><span><strong>{unit.buildingName}</strong><small>{unit.floorPlanName}</small></span><ChevronRight />
          </button>)}
        </aside>
        {selected && <form className="review-unit-form" onSubmit={save}>
          <div className="review-unit-heading"><div><span>Unit {selected.unitNumber}</span><h3>{selected.buildingName}</h3></div><span className={`status-pill status-${selected.occupancyStatus}`}>{selected.occupancyStatus}</span></div>
          <div className="form-grid">
            <label className="field field--full"><span>Confirmed floor plan</span><AppSelect required searchable ariaLabel="Confirmed floor plan" value={floorPlanId} onChange={setFloorPlanId} options={[{ value: "", label: "Select a floor plan" }, ...query.data.floorPlans.filter((plan) => !plan.reviewPlaceholder).map((plan) => ({ value: plan.id, label: `${plan.name} · ${plan.bedrooms} bd / ${plan.bathrooms} ba · ${plan.squareFeet} sq ft` }))]} /></label>
            <label className="field"><span>Floor <small>Optional</small></span><input type="number" step="1" value={floor} onChange={(event) => setFloor(event.target.value)} placeholder="Unknown" /></label>
            <label className="field"><span>Occupancy status</span><AppSelect ariaLabel="Occupancy status" value={occupancyStatus} onChange={(value) => setOccupancyStatus(value as OccupancyStatus)} options={[{ value: "occupied", label: "Occupied" }, { value: "notice", label: "Notice" }, { value: "vacant", label: "Vacant" }, { value: "down", label: "Down" }]} /></label>
            <label className="field field--full"><span>Notes <small>Optional</small></span><textarea rows={5} maxLength={2_000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="How was this floor plan confirmed?" /></label>
          </div>
          <p className="review-resolution-note"><Check /> Saving assigns the selected floor plan and clears the migration review flag.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="dialog__footer"><button className="button button--primary" disabled={mutation.isPending || !floorPlanId}><Save /> {mutation.isPending ? "Saving…" : "Save and resolve"}</button></footer>
        </form>}
      </div>}
    </section>
  </div>;
}

export function AdministrationPage() {
  const { can } = useAuth();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [reviewProperty, setReviewProperty] = useState<AdminPropertySummary | null>(null);
  const [templateProperty, setTemplateProperty] = useState<AdminPropertySummary | null>(null);
  const query = useQuery({
    queryKey: ["admin-properties"],
    queryFn: () => api<{ properties: AdminPropertySummary[] }>("/api/admin/properties"),
    enabled: can("properties:manage"),
  });

  if (!can("properties:manage")) {
    return <div className="page-stack"><section className="empty-state"><h3>Global property administration is unavailable</h3><p>Your account does not have organization-wide property management access.</p></section></div>;
  }

  const reviewProperties = query.data?.properties.filter((property) => property.reviewUnitCount > 0) ?? [];
  const reviewCount = reviewProperties.reduce((total, property) => total + property.reviewUnitCount, 0);

  return <div className="page-stack administration-page">
    <section className="page-heading">
      <div><p className="eyebrow">Administration</p><h1>Properties</h1><p>Configure communities, physical structure, floor plans, and units.</p></div>
      <button className="button button--primary" onClick={() => setOnboardingOpen(true)}><Plus /> Add property</button>
    </section>
    <section className="admin-summary">
      <span><strong>{query.data?.properties.length ?? 0}</strong> properties</span>
      <span><strong>{query.data?.properties.reduce((total, item) => total + item.unitCount, 0) ?? 0}</strong> units</span>
      <span><strong>{query.data?.properties.reduce((total, item) => total + item.buildingCount, 0) ?? 0}</strong> buildings</span>
    </section>
    {reviewCount > 0 && <section className="admin-review-required">
      <span className="admin-review-required__icon"><AlertTriangle /></span>
      <div><p className="eyebrow">Review required</p><h2>{reviewCount} imported {reviewCount === 1 ? "unit needs" : "units need"} confirmation</h2><p>Assign a verified floor plan and add any known floor or operational notes.</p></div>
      <div className="admin-review-actions">{reviewProperties.map((property) => <button className="button button--secondary" onClick={() => setReviewProperty(property)} key={property.id}>{property.name} <strong>{property.reviewUnitCount}</strong><ChevronRight /></button>)}</div>
    </section>}
    <section className="property-admin-grid">
      {query.isLoading && <div className="empty-state">Loading properties…</div>}
      {query.error && <div className="form-error">{query.error instanceof Error ? query.error.message : "Properties could not be loaded"}</div>}
      {query.data?.properties.map((property) => <article className="property-admin-card" key={property.id}>
        <header><span className="property-code">{property.code}</span><div><h2>{property.name}</h2><p><MapPin /> {property.address}</p></div></header>
        <div className="property-admin-metrics"><span><Building2 /><strong>{property.buildingCount}</strong><small>Buildings</small></span><span><strong>{property.floorPlanCount}</strong><small>Floor plans</small></span><span><strong>{property.unitCount}</strong><small>Units</small></span><span><Users /><strong>{property.staffCount}</strong><small>Staff</small></span></div>
        <footer><span>{property.timezone}</span><button className="text-button" onClick={() => setTemplateProperty(property)}>Templates <ChevronRight /></button><small>Created {new Date(property.createdAt).toLocaleDateString()}</small></footer>
      </article>)}
    </section>
    <section className="admin-safety-note"><strong>Safe onboarding</strong><p>Creating a property is transactional. Existing demo or production properties are never modified by this workflow.</p></section>
    {onboardingOpen && <PropertyOnboardingDialog onClose={() => setOnboardingOpen(false)} />}
    {reviewProperty && <UnitReviewDialog property={reviewProperty} onClose={() => setReviewProperty(null)} />}
    {templateProperty && <ScopeTemplatesDialog property={templateProperty} onClose={() => setTemplateProperty(null)} />}
  </div>;
}
