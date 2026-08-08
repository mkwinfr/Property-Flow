import type { TurnSummary } from "./turns.js";

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

export interface DashboardSnapshot {
  propertyId: string;
  units: { total: number; occupied: number; vacant: number; notice: number; down: number };
  turns: { open: number; urgent: number; overdue: number; attention: number; readyForReview: number };
  recentTurns: TurnSummary[];
}

export interface OperationsSnapshot {
  workOrders: { open: number; emergency: number; overdue: number };
  inspections: { draft: number; damageFound: number };
  inventory: { lowStock: number; totalValue: number };
  pool: { latestLogDate: string | null; exceptions: number };
}

export type SavedViewModule = "work_orders" | "turns" | "inspections" | "units";

export interface SavedView {
  id: string;
  propertyId: string;
  module: SavedViewModule;
  name: string;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  isDefault: boolean;
}

export interface AuditEvent {
  id: string;
  propertyId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorName: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationPreference {
  notificationType: string;
  channel: "in_app" | "email" | "sms";
  enabled: boolean;
}

export type RecurringJobFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export interface RecurringJob {
  id: string;
  propertyId: string;
  unitId: string | null;
  unitNumber: string | null;
  title: string;
  description: string | null;
  category: string;
  frequency: RecurringJobFrequency;
  nextRunDate: string;
  priority: "low" | "normal" | "high" | "emergency";
  assignedToUserId: string | null;
  assignedToName: string | null;
  status: "active" | "paused" | "archived";
}
