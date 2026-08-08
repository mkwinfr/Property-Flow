export type WorkOrderStatus = "open" | "assigned" | "in_progress" | "on_hold" | "complete" | "cancelled";
export type WorkOrderPriority = "low" | "normal" | "high" | "emergency";
export type WorkOrderSubmissionSource = "staff" | "portal" | "recurring";

export interface WorkOrderSummary {
  id: string;
  propertyId: string;
  unitId: string;
  unitNumber: string;
  title: string;
  description: string | null;
  category: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  requestedBy: string | null;
  residentId: string | null;
  residentName: string | null;
  submissionSource: WorkOrderSubmissionSource;
  assignedToUserId: string | null;
  assignedToName: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  areas: string[];
  receivedByUserId: string | null;
  receivedByName: string | null;
  permissionToEnter: "permission_given" | "no_permission" | null;
  appointmentRequired: boolean;
  appointmentStart: string | null;
  appointmentEnd: string | null;
  accessNotes: string | null;
  petInformation: string | null;
  securityInstructions: string | null;
  vendorWorkPerformed: boolean;
  vendorId: string | null;
  vendorName: string | null;
  vendorScope: string | null;
  vendorScheduledDate: string | null;
  vendorCompletedDate: string | null;
  vendorInvoiceNumber: string | null;
  vendorCost: number | null;
  residentResponsible: boolean;
  residentChargeReason: string | null;
  residentChargeEstimate: number | null;
  residentChargeFinal: number | null;
  residentChargeStatus: "pending" | "approved" | "posted" | "waived" | null;
  completedByUserId: string | null;
  completedByName: string | null;
  completionNotes: string | null;
  workPerformed: string | null;
  residentNotified: boolean;
  notificationMethod: string | null;
  followUpRequired: boolean;
  followUpDate: string | null;
}

export interface ApplianceRecord {
  id: string;
  unitId: string;
  type: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  installDate: string | null;
  warrantyExpiry: string | null;
  notes: string | null;
}

export interface InventoryRecord {
  id: string;
  propertyId: string;
  sku: string;
  name: string;
  category: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: number;
  supplier: string | null;
  suggestedReorderQuantity: number;
  activeReorderStatus: InventoryReorderStatus | null;
}

export type InventoryReorderStatus = "requested" | "ordered" | "received" | "cancelled";

export interface InventoryReorder {
  id: string;
  propertyId: string;
  inventoryItemId: string;
  sku: string;
  itemName: string;
  quantity: number;
  supplier: string | null;
  status: InventoryReorderStatus;
  unitCost: number;
  estimatedTotal: number;
  requestedByName: string;
  requestedAt: string;
  orderedAt: string | null;
  receivedAt: string | null;
}

export interface VendorRecord {
  id: string;
  propertyId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  specialties: string[];
  status: "active" | "inactive";
  rating: number | null;
  openJobs: number;
}

export interface InspectionSummary {
  id: string;
  propertyId: string;
  unitId: string;
  unitNumber: string;
  type: "pre_move_out" | "final" | "other" | "move_in" | "move_in_final";
  status: "draft" | "complete" | "locked";
  inspectionDate: string;
  inspectorName: string | null;
  assessedItems: number;
  totalItems: number;
  damageItems: number;
  estimatedCharges: number;
  generatedTurnId: string | null;
  templateVersionId: string | null;
  templateName: string | null;
  templateVersion: number | null;
}

export interface InspectionItem {
  id: string;
  sourceTemplateItemId: string | null;
  templateKey: string;
  room: string;
  category: string;
  label: string;
  condition: InspectionCondition;
  responsibility: InspectionResponsibility;
  notes: string | null;
  costEstimate: number | null;
  severity: number | null;
  hasAttachments: boolean;
}

export interface InspectionDetail extends InspectionSummary {
  notes: string | null;
  items: InspectionItem[];
}

export type InspectionCondition = "not_inspected" | "good" | "wear" | "damage" | "missing";
export type InspectionResponsibility = "owner" | "resident" | "undetermined";

export interface PoolLogRecord {
  id: string;
  propertyId: string;
  logDate: string;
  loggedAt: string;
  freeChlorine: number | null;
  totalChlorine: number | null;
  ph: number | null;
  alkalinity: number | null;
  hardness: number | null;
  cyanuricAcid: number | null;
  waterTempF: number | null;
  weatherSummary: string | null;
  notes: string | null;
  createdByName: string;
  exceptions: string[];
}
