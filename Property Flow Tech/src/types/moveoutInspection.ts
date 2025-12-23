// src/types/moveoutInspection.ts

export type MoveoutInspectionType = 'PRE_MOVEOUT' | 'FINAL' | 'OTHER';
export type MoveoutInspectionStatus = 'DRAFT' | 'COMPLETED' | 'LOCKED';
export type MoveoutConditionStatus = 'OK' | 'WEAR' | 'DAMAGE' | 'MISSING' | 'NOT_INSPECTED';
export type MoveoutResponsibility = 'OWNER' | 'TENANT' | 'UNSURE';
export type MoveoutChargeStatus = 'PROPOSED' | 'APPROVED' | 'REMOVED';
export type MoveoutMediaType = 'PHOTO' | 'VIDEO' | 'OTHER';

export interface MoveoutInspectionMedia {
  id: number;
  itemId: number;
  inspectionId?: number;
  mediaType: MoveoutMediaType;
  uri: string;
  caption?: string;
  createdAt: string;
}

export interface MoveoutInspectionItem {
  id: number;
  inspectionId: number;
  templateKey?: string;
  roomKey: string;
  categoryKey: string;
  itemKey: string;
  itemLabel: string;
  conditionStatus: MoveoutConditionStatus;
  responsibility: MoveoutResponsibility;
  notes?: string;
  costEstimate?: number;
  severity?: number;
  createdAt: string;
  updatedAt: string;
  media?: MoveoutInspectionMedia[];
  charges?: MoveoutChargeLineItem[];
}

export interface MoveoutChargeLineItem {
  id: number;
  inspectionId: number;
  itemId?: number;
  description: string;
  amount: number;
  status: MoveoutChargeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MoveoutInspection {
  id: number;
  propertyId: number;
  unitId?: number;
  apartmentId?: number;
  inspectionType: MoveoutInspectionType;
  status: MoveoutInspectionStatus;
  inspectorUserId?: number;
  inspectionDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: MoveoutInspectionItem[];
  charges?: MoveoutChargeLineItem[];
  media?: MoveoutInspectionMedia[];
}

export interface MoveoutInspectionDraft {
  propertyId?: number;
  unitId?: string;
  apartmentId?: number;
  inspectionType?: MoveoutInspectionType;
  inspectionDate?: string;
  inspectorUserId?: number;
  notes?: string;
  items?: Partial<MoveoutInspectionItem>[];
}

export interface MoveoutInspectionTemplate {
  roomKey: string;
  roomLabel: string;
  categories: {
    categoryKey: string;
    categoryLabel: string;
    items: {
      itemKey: string;
      itemLabel: string;
    }[];
  }[];
}

// View models for UI state
export interface MoveoutInspectionItemState {
  id?: number;
  templateKey: string;
  roomKey: string;
  categoryKey: string;
  itemKey: string;
  itemLabel: string;
  conditionStatus: MoveoutConditionStatus;
  responsibility: MoveoutResponsibility;
  notes: string;
  costEstimate: number | undefined;
  severity: number | undefined;
  media: MoveoutInspectionMedia[];
  isEditing?: boolean;
}

export interface MoveoutInspectionWizardState {
  inspectionDraft: MoveoutInspectionDraft;
  items: MoveoutInspectionItemState[];
  charges: MoveoutChargeLineItem[];
  isSubmitting: boolean;
  error: string | null;
  inspectionId?: number;
}
