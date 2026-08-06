export type TurnStatus =
  | "planned"
  | "in_progress"
  | "ready_for_review"
  | "rework"
  | "complete"
  | "cancelled";

export type TurnPriority = "low" | "normal" | "high" | "urgent";
export type TurnItemStatus = "open" | "in_progress" | "blocked" | "complete" | "not_applicable";
export type TurnBlockerCategory = "material" | "vendor" | "access" | "approval" | "scheduling" | "other";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  propertyIds: string[];
  roles: string[];
}

export type GlobalSearchResultType = "unit" | "turn" | "work_order" | "inspection" | "vendor" | "inventory" | "template";

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle: string;
}

export interface AssistantResponse {
  answer: string;
  sources: GlobalSearchResult[];
}

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
    occupancyStatus: "occupied" | "vacant" | "notice" | "down";
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
  occupancyStatus: "occupied" | "vacant" | "notice" | "down";
  activeTurnId: string | null;
  activeTurnStatus: TurnStatus | null;
}

export interface TurnTemplateSummary {
  id: string;
  propertyId: string;
  versionId: string;
  name: string;
  version: number;
  bedrooms: number | null;
  bathrooms: number | null;
  itemCount: number;
}

export interface ScopeTemplateItem {
  id: string;
  itemKey: string;
  area: string;
  category: string;
  title: string;
  sortOrder: number;
  required: boolean;
  photoRecommended: boolean;
}

export interface PropertyScopeTemplate extends TurnTemplateSummary {
  description: string;
  status: "active" | "archived";
  publishedAt: string;
  publishedByName: string | null;
  floorPlanIds: string[];
  hasDraft: boolean;
  items: ScopeTemplateItem[];
}

export interface ScopeTemplateDraft {
  id: string;
  templateId: string | null;
  propertyId: string;
  name: string;
  description: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floorPlanIds: string[];
  items: ScopeTemplateItem[];
  updatedAt: string;
  updatedByName: string;
}

export interface ScopeTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  publishedAt: string;
  publishedByName: string | null;
  items: ScopeTemplateItem[];
}

export interface TemplateFloorPlan {
  id: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
}

export interface TurnSummary {
  id: string;
  propertyId: string;
  unitId: string;
  unitNumber: string;
  buildingName: string;
  floorPlanName: string;
  status: TurnStatus;
  priority: TurnPriority;
  moveOutDate: string | null;
  targetReadyDate: string | null;
  completedItems: number;
  totalItems: number;
  templateName: string;
  leadTechnicianUserId: string | null;
  leadTechnicianName: string | null;
  reviewRound: number;
  submittedForReviewAt: string | null;
  approvedAt: string | null;
  approvedByName: string | null;
  createdAt: string;
}

export interface TurnItemReview {
  id: string;
  reviewRound: number;
  decision: "passed" | "rework";
  notes: string | null;
  reviewedByName: string;
  createdAt: string;
}

export interface TurnItemMaterialUsage {
  id: string;
  inventoryItemId: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  usedByName: string;
  usedAt: string;
}

export interface TurnItemBlocker {
  id: string;
  category: TurnBlockerCategory;
  reason: string;
  responsibleParty: string | null;
  expectedResolutionDate: string | null;
  openedByName: string;
  openedAt: string;
}

export interface TurnItem {
  id: string;
  area: string;
  category: string;
  title: string;
  status: TurnItemStatus;
  notes: string | null;
  blockedReason: string | null;
  blocker: TurnItemBlocker | null;
  startedAt: string | null;
  completedAt: string | null;
  completedByName: string | null;
  attachmentCount: number;
  reviewStatus: "pending" | "passed" | "rework" | null;
  reviewNotes: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviews: TurnItemReview[];
  materials: TurnItemMaterialUsage[];
  materialCost: number | null;
  sortOrder: number;
  origin: "template" | "inspection" | "make_ready";
  sourceInspectionItemId: string | null;
  inspectionCondition: Exclude<InspectionCondition, "not_inspected"> | null;
  inspectionResponsibility: InspectionResponsibility | null;
  inspectionCostEstimate: number | null;
}

export interface TurnBlockerQueueItem extends TurnItemBlocker {
  propertyId: string;
  turnId: string;
  turnItemId: string;
  unitNumber: string;
  buildingName: string;
  scopeTitle: string;
  scopeArea: string;
  turnPriority: TurnPriority;
  targetReadyDate: string | null;
  leadTechnicianName: string | null;
}

export type TurnVendorJobStatus = "proposed" | "scheduled" | "in_progress" | "complete" | "cancelled";
export type VendorPaymentStatus = "not_submitted" | "pending_approval" | "approved" | "paid" | "disputed" | "not_applicable";

export interface TurnVendorJob {
  id: string;
  vendorId: string;
  vendorName: string;
  status: TurnVendorJobStatus;
  scope: string;
  scheduledDate: string | null;
  completedDate: string | null;
  quoteAmount: number | null;
  approvedAmount: number | null;
  invoiceAmount: number | null;
  invoiceNumber: string | null;
  paymentStatus: VendorPaymentStatus | null;
  paidAt: string | null;
}

export interface TurnCostSummary {
  materialCost: number;
  vendorCost: number;
  grossCost: number;
  estimatedResidentCharge: number;
  projectedPropertyExpense: number;
  lowStockItems: Array<{
    inventoryItemId: string;
    name: string;
    sku: string;
    quantityOnHand: number;
    reorderLevel: number;
    activeReorderStatus: InventoryReorderStatus | null;
  }>;
}

export interface TurnDetail extends TurnSummary {
  notes: string | null;
  items: TurnItem[];
  vendorJobs: TurnVendorJob[];
  costSummary: TurnCostSummary | null;
  activity: Array<{
    id: string;
    action: string;
    actorName: string | null;
    details: Record<string, unknown>;
    createdAt: string;
  }>;
}

export interface MyWorkTurn extends TurnSummary {
  openItems: number;
  inProgressItems: number;
  blockedItems: number;
  reworkItems: number;
}

export interface TeamWorkloadMember {
  userId: string;
  name: string;
  roles: string;
  activeTurns: number;
  urgentTurns: number;
  overdueTurns: number;
  reworkTurns: number;
  blockedItems: number;
}

export interface DashboardSnapshot {
  propertyId: string;
  units: { total: number; occupied: number; vacant: number; notice: number; down: number };
  turns: { open: number; urgent: number; overdue: number; attention: number; readyForReview: number };
  recentTurns: TurnSummary[];
}

export type WorkOrderStatus = "open" | "assigned" | "in_progress" | "on_hold" | "complete" | "cancelled";
export type WorkOrderPriority = "low" | "normal" | "high" | "emergency";

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

export type InspectionCondition = "not_inspected" | "good" | "wear" | "damage" | "missing";
export type InspectionResponsibility = "owner" | "resident" | "undetermined";

export interface InspectionSummary {
  id: string;
  propertyId: string;
  unitId: string;
  unitNumber: string;
  type: "pre_move_out" | "final" | "other";
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

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface OperationsSnapshot {
  workOrders: { open: number; emergency: number; overdue: number };
  inspections: { draft: number; damageFound: number };
  inventory: { lowStock: number; totalValue: number };
  pool: { latestLogDate: string | null; exceptions: number };
}
