import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PawPrint, Plus, Trash2, X } from "lucide-react";
import type { PortalPet } from "../../../shared/contracts";
import { AppSelect } from "../../components/AppSelect";
import {
  PortalEmptyState,
  PortalLoading,
  PortalPageHeader,
  PortalSectionHeading,
  PortalSurface,
} from "../../components/portal/PortalPrimitives";
import { api } from "../../lib/api";

const speciesOptions = ["Dog", "Cat", "Bird", "Fish", "Reptile", "Other"];

export function PortalPetsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PortalPet | null>(null);
  const query = useQuery({ queryKey: ["portal-pets"], queryFn: () => api<{ pets: PortalPet[] }>("/api/portal/pets") });
  const pets = query.data?.pets ?? [];

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (pet: PortalPet) => {
    setEditing(pet);
    setDialogOpen(true);
  };

  return <div className="page-stack portal-page">
    <PortalPageHeader
      eyebrow="Household"
      title="Your Pets"
      description="Keep pet records current so your leasing and maintenance teams know everyone who calls your home theirs."
      action={<button className="button button--primary" onClick={openCreate}><Plus size={16} />Add a pet</button>}
    />
    <PortalSurface>
      <PortalSectionHeading eyebrow="Household members" title={`${pets.length} Pet${pets.length === 1 ? "" : "s"} on File`} detail="Pet details are visible only to your property team." />
      {query.isPending ? <PortalLoading label="Loading pets" /> : query.isError ? <PortalEmptyState icon={PawPrint} title="Pet Records Unavailable" detail="We could not load your household pet records. Please refresh and try again." /> : pets.length ? <div className="portal-pet-list">
        {pets.map((pet) => <PetCard key={pet.id} pet={pet} onEdit={() => openEdit(pet)} />)}
      </div> : <PortalEmptyState icon={PawPrint} title="No Pets Registered" detail="Add dogs, cats, and other household pets so your property team has accurate records." action={<button className="button button--primary" onClick={openCreate}><Plus size={16} />Add your first pet</button>} />}
    </PortalSurface>
    {dialogOpen && <PetDialog pet={editing} onClose={() => setDialogOpen(false)} />}
  </div>;
}

function PetCard({ pet, onEdit }: { pet: PortalPet; onEdit: () => void }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api(`/api/portal/pets/${pet.id}`, { method: "DELETE" }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["portal-pets"] }),
  });

  return <article className="portal-pet-card">
    <div className="portal-pet-card__header">
      <div>
        <strong>{pet.name}</strong>
        <div className="portal-pet-card__meta">
          <span>{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}</span>
          {pet.color && <span>{pet.color}</span>}
          {pet.weightLbs != null && <span>{pet.weightLbs} lbs</span>}
        </div>
      </div>
      <div className="portal-pet-card__actions">
        {pet.isServiceAnimal && <span className="portal-pet-badge portal-pet-badge--service">Service animal</span>}
        <button type="button" className="button button--ghost button--small" onClick={onEdit}>Edit</button>
        <button type="button" className="icon-button" aria-label={`Remove ${pet.name}`} disabled={remove.isPending} onClick={() => void remove.mutateAsync()}><Trash2 size={16} /></button>
      </div>
    </div>
    {(pet.vaccinationExpires || pet.notes) && <dl className="legend-list portal-detail-list">
      {pet.vaccinationExpires && <div><dt>Vaccination expires</dt><dd>{formatDate(pet.vaccinationExpires)}</dd></div>}
      {pet.notes && <div><dt>Notes</dt><dd>{pet.notes}</dd></div>}
    </dl>}
  </article>;
}

function PetDialog({ pet, onClose }: { pet: PortalPet | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: pet?.name ?? "",
    species: pet?.species ?? "Dog",
    breed: pet?.breed ?? "",
    color: pet?.color ?? "",
    weightLbs: pet?.weightLbs?.toString() ?? "",
    isServiceAnimal: pet?.isServiceAnimal ?? false,
    vaccinationExpires: pet?.vaccinationExpires ?? "",
    notes: pet?.notes ?? "",
  });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed.trim() || null,
        color: form.color.trim() || null,
        weightLbs: form.weightLbs ? Number(form.weightLbs) : null,
        isServiceAnimal: form.isServiceAnimal,
        vaccinationExpires: form.vaccinationExpires || null,
        notes: form.notes.trim() || null,
      };
      return pet
        ? api<{ pet: PortalPet }>(`/api/portal/pets/${pet.id}`, { method: "PUT", body: JSON.stringify(body) })
        : api<{ pet: PortalPet }>("/api/portal/pets", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["portal-pets"] });
      onClose();
    },
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try { await mutation.mutateAsync(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save pet"); }
  };

  return <div className="modal-layer"><section className="dialog portal-dialog">
    <header className="dialog__header"><span className="dialog__icon"><PawPrint /></span><div><p className="eyebrow">Household pet</p><h2>{pet ? "Edit Pet" : "Add Pet"}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header>
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="field field--full"><span>Name</span><input required minLength={1} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="field"><span>Species</span><AppSelect ariaLabel="Species" value={form.species} onChange={(value) => setForm({ ...form, species: value })} options={speciesOptions.map((value) => ({ value, label: value }))} /></label>
        <label className="field"><span>Breed</span><input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="Optional" /></label>
        <label className="field"><span>Color</span><input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Optional" /></label>
        <label className="field"><span>Weight (lbs)</span><input type="number" min={0} max={400} step={0.1} value={form.weightLbs} onChange={(e) => setForm({ ...form, weightLbs: e.target.value })} placeholder="Optional" /></label>
        <label className="field"><span>Vaccination expires</span><input type="date" value={form.vaccinationExpires} onChange={(e) => setForm({ ...form, vaccinationExpires: e.target.value })} /></label>
        <label className="check-field field--full"><input type="checkbox" checked={form.isServiceAnimal} onChange={(e) => setForm({ ...form, isServiceAnimal: e.target.checked })} /><span><strong>Service or assistance animal</strong><small>Check if this pet is documented as a service or support animal.</small></span></label>
        <label className="field field--full"><span>Notes</span><textarea rows={3} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Temperament, crate location, vet contact, etc." /></label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : pet ? "Save changes" : "Add pet"}</button></footer>
    </form>
  </section></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
