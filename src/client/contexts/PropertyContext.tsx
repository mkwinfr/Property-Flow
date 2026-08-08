import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PropertyModuleKey, PropertyModuleSetting, PropertySummary } from "../../shared/contracts";
import { api } from "../lib/api";

interface PropertyContextValue {
  properties: PropertySummary[];
  property: PropertySummary | null;
  propertyId: string | null;
  setPropertyId: (id: string) => void;
  loading: boolean;
  modules: PropertyModuleSetting[];
  isModuleEnabled: (moduleKey: PropertyModuleKey) => boolean;
}

const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: ["properties"],
    queryFn: () => api<{ properties: PropertySummary[] }>("/api/properties"),
  });
  const properties = query.data?.properties ?? [];
  const [propertyId, setPropertyIdState] = useState<string | null>(
    () => window.localStorage.getItem("ps:selected-property") ?? window.localStorage.getItem("pf:selected-property"),
  );

  useEffect(() => {
    if (!properties.length) return;
    if (!propertyId || !properties.some((property) => property.id === propertyId)) {
      setPropertyIdState(properties[0]!.id);
    }
  }, [properties, propertyId]);

  const modulesQuery = useQuery({
    queryKey: ["property-modules", propertyId],
    queryFn: () => api<{ modules: PropertyModuleSetting[] }>(`/api/properties/${propertyId}/modules`),
    enabled: Boolean(propertyId),
  });

  const setPropertyId = (id: string) => {
    window.localStorage.setItem("ps:selected-property", id);
    window.localStorage.removeItem("pf:selected-property");
    setPropertyIdState(id);
  };

  const modules = modulesQuery.data?.modules ?? [];
  const isModuleEnabled = (moduleKey: PropertyModuleKey) =>
    modules.find((module) => module.moduleKey === moduleKey)?.enabled ?? true;

  const value = useMemo(
    () => ({
      properties,
      property: properties.find((item) => item.id === propertyId) ?? null,
      propertyId,
      setPropertyId,
      loading: query.isLoading,
      modules,
      isModuleEnabled,
    }),
    [properties, propertyId, query.isLoading, modules],
  );
  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (!context) throw new Error("useProperty must be used inside PropertyProvider");
  return context;
}
