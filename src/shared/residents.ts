export interface ResidentSummary {
  id: string;
  propertyId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  preferredContact: "email" | "phone" | "sms" | null;
  status: "active" | "former" | "applicant";
  householdId: string | null;
  householdName: string | null;
  currentUnitNumber: string | null;
  currentLeaseStatus: string | null;
}

export interface ResidentDetail extends ResidentSummary {
  notes: string | null;
  leases: LeaseSummary[];
}

export interface HouseholdSummary {
  id: string;
  propertyId: string;
  name: string;
  primaryResidentId: string | null;
  memberCount: number;
}

export interface LeaseSummary {
  id: string;
  propertyId: string;
  unitId: string;
  unitNumber: string;
  householdId: string | null;
  householdName: string | null;
  startDate: string;
  endDate: string | null;
  monthlyRent: number;
  status: "draft" | "active" | "notice" | "ended" | "cancelled";
  moveInDate: string | null;
  moveOutDate: string | null;
  residentNames: string;
}

export interface LeaseDetail extends LeaseSummary {
  notes: string | null;
  residents: Array<{ id: string; name: string; isLeaseholder: boolean }>;
}
