import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import type { SavedView, SavedViewModule } from "../../shared/contracts";
import { AppSelect } from "./AppSelect";
import { api } from "../lib/api";

export function SavedViewsBar<T extends Record<string, unknown>>({
  propertyId,
  module,
  filters,
  onApply,
}: {
  propertyId: string | null;
  module: SavedViewModule;
  filters: T;
  onApply: (filters: T) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [selectedViewId, setSelectedViewId] = useState("");
  const views = useQuery({
    queryKey: ["saved-views", propertyId, module],
    queryFn: () => api<{ views: SavedView[] }>(`/api/properties/${propertyId}/saved-views?module=${module}`),
    enabled: Boolean(propertyId),
  });
  const saveMutation = useMutation({
    mutationFn: () => api("/api/saved-views", {
      method: "POST",
      body: JSON.stringify({ propertyId, module, name: name.trim(), filters }),
    }),
    onSuccess: async () => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["saved-views", propertyId, module] });
    },
  });

  if (!propertyId) return null;
  const items = views.data?.views ?? [];
  return <div className="saved-views-bar"><Bookmark size={16} /><AppSelect compact ariaLabel="Saved views" value={selectedViewId} onChange={(id) => {
    setSelectedViewId(id);
    const view = items.find((item) => item.id === id);
    if (view) onApply(view.filters as T);
  }} options={[{ value: "", label: items.length ? "Saved views…" : "No saved views" }, ...items.map((view) => ({ value: view.id, label: view.name }))]} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Save current filters" /><button className="button button--secondary" disabled={!name.trim() || saveMutation.isPending} onClick={() => void saveMutation.mutate()}>Save</button></div>;
}
