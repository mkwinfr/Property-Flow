export interface ResidentCharge {
  id: string;
  propertyId: string;
  residentId: string | null;
  residentName: string | null;
  leaseId: string | null;
  unitId: string | null;
  unitNumber: string | null;
  description: string;
  amount: number;
  chargeType: "rent" | "fee" | "damage" | "utility" | "other";
  status: "pending" | "posted" | "paid" | "waived" | "void";
  dueDate: string | null;
  postedAt: string | null;
}

export interface RentRollEntry {
  unitId: string;
  unitNumber: string;
  floorPlanName: string;
  occupancyStatus: string;
  householdName: string | null;
  residentNames: string;
  leaseStatus: string | null;
  monthlyRent: number;
  moveInDate: string | null;
  moveOutDate: string | null;
  pendingCharges: number;
}

export interface ExecutiveSnapshot {
  propertyId: string;
  occupancyRate: number;
  activeLeases: number;
  monthlyRentPotential: number;
  collectedRent: number;
  pendingCharges: number;
  openWorkOrders: number;
  openTurns: number;
  prospectPipeline: number;
  toursThisWeek: number;
}

export interface AccountingExport {
  id: string;
  propertyId: string;
  exportType: "rent_roll" | "charges" | "vendor_costs" | "full_period";
  periodStart: string;
  periodEnd: string;
  status: "pending" | "ready" | "failed";
  rowCount: number;
  summary: Record<string, unknown>;
  createdAt: string;
}
