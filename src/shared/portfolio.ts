import type { TurnStatus } from "./turns.js";

export interface PropertySummary {
  id: string;
  name: string;
  code: string;
  address: string;
  unitCount: number;
}

export interface AdminPropertySummary extends PropertySummary {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  timezone: string;
  buildingCount: number;
  floorPlanCount: number;
  reviewUnitCount: number;
  staffCount: number;
  createdAt: string;
}

export type OccupancyStatus = "occupied" | "vacant" | "notice" | "down";

export interface AdminUnitRecord {
  id: string;
  propertyId: string;
  unitNumber: string;
  buildingId: string;
  buildingName: string;
  floorPlanId: string;
  floorPlanName: string;
  floor: number | null;
  occupancyStatus: OccupancyStatus;
  notes: string | null;
  reviewRequired: boolean;
  updatedAt: string;
}

export interface AdminPropertyStructure {
  property: Pick<AdminPropertySummary, "id" | "name" | "code">;
  buildings: Array<{ id: string; name: string }>;
  floorPlans: Array<{
    id: string;
    name: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    reviewPlaceholder: boolean;
  }>;
  reviewUnits: AdminUnitRecord[];
}

export interface AdminUnitUpdateInput {
  floorPlanId: string;
  floor: number | null;
  occupancyStatus: OccupancyStatus;
  notes: string | null;
  resolveReview?: boolean;
}

export interface PropertyOnboardingInput {
  name: string;
  code: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  timezone: string;
  buildings: Array<{ name: string }>;
  floorPlans: Array<{
    name: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
  }>;
  units: Array<{
    unitNumber: string;
    buildingName: string;
    floorPlanName: string;
    floor: number | null;
    occupancyStatus: OccupancyStatus;
  }>;
}

export interface UnitSummary {
  id: string;
  propertyId: string;
  unitNumber: string;
  buildingName: string;
  floorPlanName: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  occupancyStatus: OccupancyStatus;
  activeTurnId: string | null;
  activeTurnStatus: TurnStatus | null;
}

export type PropertyModuleKey =
  | "make_ready"
  | "operations"
  | "pool"
  | "residents"
  | "leasing"
  | "communications"
  | "financial"
  | "portal";

export interface PropertyModuleSetting {
  moduleKey: PropertyModuleKey;
  enabled: boolean;
}

export interface PortfolioSummary {
  propertyCount: number;
  units: { total: number; occupied: number; vacant: number; notice: number; down: number };
  turns: { open: number; urgent: number; overdue: number; readyForReview: number };
  workOrders: { open: number; emergency: number; overdue: number };
  properties: Array<{
    id: string;
    name: string;
    code: string;
    unitCount: number;
    occupancyRate: number;
    openTurns: number;
    openWorkOrders: number;
  }>;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  propertyCount: number;
}
