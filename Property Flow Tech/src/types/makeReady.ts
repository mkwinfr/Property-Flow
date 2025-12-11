// src/types/makeReady.ts

export type TurnType = 'STANDARD_MOVE_OUT' | 'TRANSFER' | 'RENOVATION' | 'SPECIAL';
export type PriorityLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'DOWN_UNIT';
export type OverallCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'SEVERE';

export type ConditionTag =
  | 'HEAVY_TRASH'
  | 'ODORS'
  | 'PET_DAMAGE'
  | 'PESTS'
  | 'MOLD_MOISTURE'
  | 'SAFETY_ISSUES'
  | 'APPLIANCE_ISSUES';

export type WorkCategory =
  | 'GENERAL_MAINTENANCE'
  | 'PAINT'
  | 'CLEANING'
  | 'FLOORING'
  | 'APPLIANCES'
  | 'HVAC'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'PEST_CONTROL'
  | 'TRASH_OUT'
  | 'VENDOR_SPECIALTY'
  | 'OTHER';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type BillableParty = 'OWNER' | 'RESIDENT' | 'SHARED' | 'OTHER';
export type ChargebackType = 'NONE' | 'PARTIAL' | 'FULL';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface MakeReadyTask {
  id: string;
  title: string;
  category: WorkCategory;
  area:
    | 'WHOLE_UNIT'
    | 'LIVING_ROOM'
    | 'KITCHEN'
    | 'BEDROOM_1'
    | 'BEDROOM_2'
    | 'BEDROOM_3'
    | 'BATHROOM_1'
    | 'BATHROOM_2'
    | 'HALLWAY'
    | 'OTHER';
  priority: TaskPriority;
  estimatedEffortValue?: number;
  estimatedEffortUnit?: 'HOURS' | 'DAYS';
  internalNotes?: string;
  vendorNotes?: string;
  budgetedCost?: number;
  billableTo?: BillableParty;
  mustCompleteBy?: string;
  assigneeId?: string;
  assigneeType?: 'IN_HOUSE' | 'VENDOR';
  vendorId?: string;
  startDate?: string;
  dueDate?: string;
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  dependsOnTaskId?: string | null;
}

export interface MaterialLine {
  id: string;
  item: string;
  category: WorkCategory | 'OTHER';
  quantity: number;
  unit: string;
  costPerUnit?: number;
  storeOrVendor?: string;
}

export interface MakeReadyTurnDraft {
  // Step 0/1 – base
  propertyId?: string;
  unitId?: string;
  turnType?: TurnType;
  moveOutDate?: string;
  targetReadyDate?: string;
  priority?: PriorityLevel;
  turnOwnerId?: string;
  turnNotes?: string;

  // Step 2 – condition
  overallCondition?: OverallCondition;
  conditionTags: ConditionTag[];
  photoNotes?: string;
  wallsCondition?: 'OK' | 'MINOR_DAMAGE' | 'MAJOR_DAMAGE';
  flooringCondition?: 'OK' | 'PARTIAL_REPLACE' | 'FULL_REPLACE';
  doorsLocksCondition?: 'OK' | 'NEEDS_WORK';
  plumbingCondition?: 'OK' | 'ISSUES';
  electricalCondition?: 'OK' | 'ISSUES';
  appliancesCondition?: 'OK' | 'ISSUES';
  cleanlinessCondition?: 'BROOM_SWEEP' | 'DIRTY' | 'BIOHAZARD';
  hasLifeSafetyIssues?: boolean;
  lifeSafetyNotes?: string;

  // Step 3 – scope
  selectedCategories: WorkCategory[];
  useTemplateTasks?: boolean;
  scopeSpecialInstructions?: string;

  // Step 4 – tasks
  tasks: MakeReadyTask[];

  // Step 7 – materials & costs
  materials: MaterialLine[];
  estimatedLaborCost?: number;
  estimatedMaterialsCost?: number;
  totalEstimatedCost?: number;
  chargebackType?: ChargebackType;
  chargebackAmount?: number;
  chargebackReason?: string;

  // Step 6 – access
  accessInstructions?: string;
  alarmCodes?: string;

  // Step 8 options
  markActiveOnBoard?: boolean;
  notifyAssignees?: boolean;
}

export interface MakeReadyBoardTurn {
  id: string;
  propertyId: string;
  unitId: string;
  priority: PriorityLevel;
  targetReadyDate: string;
  status: 'ACTIVE' | 'COMPLETED';
  turnOwnerId: string;
  tasks: MakeReadyTask[];
}
