// Make Ready Punch List Data Types

export type PunchListStatus = 'Draft' | 'In Progress' | 'Completed';
export type PunchItemStatus = 'Open' | 'In Progress' | 'Complete';
export type PunchItemPriority = 'Low' | 'Medium' | 'High';
export type PunchItemCategory =
  | 'Electrical'
  | 'Plumbing'
  | 'Paint/Finishes'
  | 'Doors & Windows'
  | 'Flooring'
  | 'Fixtures & Hardware'
  | 'HVAC/Ventilation'
  | 'Cabinetry'
  | 'Accessories'
  | 'General'
  | 'Fire / Life Safety'
  | 'Doors & Storage';

export interface PunchTemplateArea {
  area: string;
  categories: PunchTemplateCategory[];
}

export interface PunchTemplateCategory {
  category: PunchItemCategory;
  items: Omit<PunchTemplateItem, 'area' | 'category'>[];
}

export interface PunchTemplateItem {
  templateKey: string;
  title: string;
  area: string;
  category: PunchItemCategory;
}

export interface PunchList {
  id: string;
  propertyId: string;
  unitId: string;
  unitLabel: string;
  status: PunchListStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PunchItem {
  id: string;
  punchListId: string;
  area: string;
  category: PunchItemCategory;
  title: string;
  templateKey?: string;
  notes?: string;
  status: PunchItemStatus;
  priority: PunchItemPriority;
  assignedTo?: string;
  vendorTrade?: string;
  photoUrls?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface FilterState {
  area?: string;
  category?: string;
  status?: PunchItemStatus;
  priority?: PunchItemPriority;
  assignedTo?: string;
}
