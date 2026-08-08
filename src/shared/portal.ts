export interface PortalSessionUser {
  accountId: string;
  residentId: string;
  propertyId: string;
  propertyName: string;
  name: string;
  email: string;
  unitNumber: string | null;
  leaseStatus: string | null;
}

export interface PortalMaintenanceRequest {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  unitNumber: string;
  permissionToEnter: "permission_given" | "no_permission" | null;
  appointmentRequired: boolean;
}

export interface PortalCharge {
  id: string;
  description: string;
  amount: number;
  status: string;
  dueDate: string | null;
}

export interface PortalLeaseSummary {
  id: string;
  unitNumber: string;
  monthlyRent: number;
  startDate: string;
  endDate: string | null;
  status: string;
  moveInDate: string | null;
}

export interface PortalAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  createdAt: string;
}

export interface PortalMessage {
  id: string;
  subject: string;
  body: string;
  campaignName: string;
  sentAt: string;
  readAt: string | null;
}

export interface PortalApplicationStatus {
  id: string;
  status: string;
  unitNumber: string | null;
  submittedAt: string;
  decisionAt: string | null;
}

export interface PortalPet {
  id: string;
  householdId: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  weightLbs: number | null;
  isServiceAnimal: boolean;
  vaccinationExpires: string | null;
  notes: string | null;
  updatedAt: string;
}
