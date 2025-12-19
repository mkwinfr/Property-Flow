/**
 * Turn Management Types
 * Comprehensive types for the unified turn modal with integrated workflows
 */

// Turn Status Enum
export const TurnStatus = {
  PENDING: 'PENDING',
  VACANT: 'VACANT',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_REVIEW: 'PENDING_REVIEW',
  VACANT_READY: 'VACANT_READY',
} as const;
export type TurnStatus = typeof TurnStatus[keyof typeof TurnStatus];

// Punch List Item Status
export const PunchListItemStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
} as const;
export type PunchListItemStatus = typeof PunchListItemStatus[keyof typeof PunchListItemStatus];

// Activity Types
export const TurnActivityType = {
  ITEM_OPENED: 'ITEM_OPENED',
  ITEM_COMPLETED: 'ITEM_COMPLETED',
  ITEM_ADDED: 'ITEM_ADDED',
  PUNCH_LIST_COMPLETED: 'PUNCH_LIST_COMPLETED',
  MANAGER_REVIEW_STARTED: 'MANAGER_REVIEW_STARTED',
  MANAGER_APPROVED: 'MANAGER_APPROVED',
  MANAGER_REQUESTED_REWORK: 'MANAGER_REQUESTED_REWORK',
  INVENTORY_USED: 'INVENTORY_USED',
  COST_OVERRIDDEN: 'COST_OVERRIDDEN',
  APPLIANCE_UPDATED: 'APPLIANCE_UPDATED',
  VENDOR_SERVICE_ADDED: 'VENDOR_SERVICE_ADDED',
  TURN_STATUS_CHANGED: 'TURN_STATUS_CHANGED',
} as const;
export type TurnActivityType = typeof TurnActivityType[keyof typeof TurnActivityType];

// Work Categories
export const WorkCategory = {
  GENERAL_MAINTENANCE: 'GENERAL_MAINTENANCE',
  PAINT: 'PAINT',
  CLEANING: 'CLEANING',
  FLOORING: 'FLOORING',
  APPLIANCES: 'APPLIANCES',
  HVAC: 'HVAC',
  PLUMBING: 'PLUMBING',
  ELECTRICAL: 'ELECTRICAL',
  PEST_CONTROL: 'PEST_CONTROL',
  TRASH_OUT: 'TRASH_OUT',
  VENDOR_SPECIALTY: 'VENDOR_SPECIALTY',
  OTHER: 'OTHER',
} as const;
export type WorkCategory = typeof WorkCategory[keyof typeof WorkCategory];

// ============ Main Models ============

export interface Turn {
  id: number;
  apartmentId: number;
  createdByUserId: number;
  type: string;
  status: TurnStatus;
  priority: string;

  moveOutDate?: string;
  targetReadyDate?: string;
  actualReadyDate?: string;

  // Condition assessment
  overallCondition?: string;
  wallsCondition?: string;
  flooringCondition?: string;
  doorsLocksCondition?: string;
  plumbingCondition?: string;
  electricalCondition?: string;
  appliancesCondition?: string;
  cleanlinessCondition?: string;
  hasLifeSafetyIssues: boolean;
  lifeSafetyNotes?: string;
  photoNotes?: string;

  // Costs
  estimatedLaborCost?: number;
  estimatedMaterialsCost?: number;
  totalEstimatedCost?: number;

  // Assignment & access
  turnOwnerId?: string;
  accessInstructions?: string;
  alarmCodes?: string;

  // Chargeback info
  chargebackType: string;
  chargebackAmount?: number;
  chargebackReason?: string;

  // Manager review
  managerReviewNotes?: string;
  reviewedByUserId?: number;
  reviewedAt?: string;

  // General notes
  notes?: string;
  turnNotes?: string;

  // Appliances
  appliances?: Appliance[];

  createdAt: string;
  updatedAt: string;

  // Relations
  apartment?: any;
  createdBy?: User;
  reviewedBy?: User;
  punchListItems?: PunchListItem[];
  activityLogs?: TurnActivityLog[];
  costBreakdown?: TurnCostBreakdown;
}

export interface Appliance {
  name: string;
  status: 'working' | 'needs-repair' | 'needs-replacement';
  notes?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  roleId?: number;
  userRole: string;
  status: string;
}

export interface PunchListItem {
  id: number;
  turnId: number;
  label: string;
  area: string;
  category: string;
  status: PunchListItemStatus;
  notes?: string;
  assignedToUserId?: number;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedByUserId?: number;

  // Relations
  assignedTo?: User;
  completedBy?: User;
  inventoryUsages?: PunchItemInventoryUsage[];
}

export interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  tags: string[];
  category: WorkCategory;
  quantity: number;
  unitCost: number;
  supplier?: string;
  lastRestocked?: string;

  createdAt: string;
  updatedAt: string;
}

export interface PunchItemInventoryUsage {
  id: number;
  punchListItemId: number;
  inventoryItemId: number;
  quantityUsed: number;
  unitCost: number;
  costOverride?: number;

  createdAt: string;
  updatedAt: string;

  // Relations
  inventoryItem?: InventoryItem;
}

export interface TurnCostBreakdown {
  id: number;
  turnId: number;
  laborCost: number;
  materialsCost: number;
  vendorServicesCost: number;
  totalCost: number;

  createdAt: string;
  updatedAt: string;
}

export interface TurnActivityLog {
  id: number;
  turnId: number;
  userId?: number;
  activityType: TurnActivityType;
  punchListItemId?: number;
  inventoryItemId?: number;
  details?: Record<string, any>;

  createdAt: string;

  // Relations
  user?: User;
}

// ============ UI State & Context ============

export interface TurnModalTab {
  id: 'move-out' | 'punch-list' | 'vendor' | 'updates';
  label: string;
  icon: string;
}

export interface TurnModalState {
  isOpen: boolean;
  turn?: Turn;
  activeTab: TurnModalTab['id'];
  isLoading: boolean;
  error?: string;
}

// ============ API Request/Response ============

export interface CreateTurnRequest {
  apartmentId: number;
  moveOutDate: string;
  type: string;
  priority: string;
  overallCondition: string;
  notes?: string;
  // ... other assessment fields
}

export interface UpdatePunchListItemRequest {
  status: PunchListItemStatus;
  notes?: string;
  assignedToUserId?: number;
  inventoryUsages?: Array<{
    inventoryItemId: number;
    quantityUsed: number;
  }>;
}

export interface UpdateTurnStatusRequest {
  status: TurnStatus;
  managerReviewNotes?: string;
}

export interface AddPunchListItemRequest {
  label: string;
  area: string;
  category: string;
  notes?: string;
}

export interface OverrideCostRequest {
  punchItemInventoryUsageId: number;
  costOverride: number;
}

// ============ Tab-Specific Data ============

export interface MoveOutInspectionData {
  overallCondition: string;
  wallsCondition: string;
  flooringCondition: string;
  doorsLocksCondition: string;
  plumbingCondition: string;
  electricalCondition: string;
  appliancesCondition: string;
  cleanlinessCondition: string;
  hasLifeSafetyIssues: boolean;
  lifeSafetyNotes?: string;
  photoNotes?: string;
  conditionTags?: string[];
}

export interface VendorServiceItem {
  id?: string;
  type: 'FLOORING' | 'CLEANING' | 'OTHER';
  description: string;
  estimatedCost?: number;
  status?: 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface UpdateLogEntry {
  id: number;
  timestamp: string;
  actor: {
    id: number;
    name: string;
    role: string;
  };
  action: string;
  details?: string;
}
