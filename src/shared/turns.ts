import type { InspectionCondition, InspectionResponsibility, InventoryReorderStatus } from "./operations.js";

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