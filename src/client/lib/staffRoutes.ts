import type { GlobalSearchResult } from "../../shared/contracts";

export const STAFF_PATHS = [
  "/",
  "/my-work",
  "/turns",
  "/units",
  "/pool-logs",
  "/operations",
  "/work-orders",
  "/inspections",
  "/inventory",
  "/recurring-jobs",
  "/vendors",
  "/templates",
  "/administration",
  "/audit",
  "/residents",
  "/leasing",
  "/communications",
  "/financial",
  "/platform-admin",
] as const;

export const OPERATIONS_TAB_REDIRECTS: Record<string, string> = {
  "work-orders": "/work-orders",
  recurring: "/recurring-jobs",
  inspections: "/inspections?context=maintenance",
  inventory: "/inventory",
  vendors: "/vendors",
  pool: "/pool-logs",
};

export function staffDestinationForSearch(result: GlobalSearchResult): string {
  if (result.type === "turn") return `/turns/${result.id}`;
  if (result.type === "unit") return "/units";
  if (result.type === "template") return "/templates";
  const routes: Record<string, string> = {
    work_order: "/work-orders",
    inspection: "/inspections?context=maintenance",
    vendor: "/vendors",
    inventory: "/inventory",
  };
  return routes[result.type] ?? "/operations";
}

export function inspectionsContextFromSearch(search: string): "maintenance" | "leasing" {
  return new URLSearchParams(search).get("context") === "leasing" ? "leasing" : "maintenance";
}

export function isInspectionsNavActive(path: string, search: string, context: "maintenance" | "leasing") {
  if (path !== "/inspections") return false;
  return inspectionsContextFromSearch(search) === context;
}

export function isNavLinkHiddenForPreview(roleId: string | null | undefined, to: string) {
  if (!roleId) return false;
  if (roleId === "role-leasing" && to === "/my-work") return true;
  if (roleId === "role-tech" && to === "/recurring-jobs") return true;
  return false;
}

export function isNavGroupHiddenForPreview(roleId: string | null | undefined, groupId: string) {
  if (!roleId) return false;
  if (roleId === "role-tech" && (groupId === "operations" || groupId === "leasing")) return true;
  return false;
}
