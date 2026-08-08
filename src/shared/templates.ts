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
