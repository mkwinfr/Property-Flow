export type MakeReadyStatus = "NOT_STARTED" | "IN_PROGRESS" | "READY" | "ON_HOLD";

export interface MakeReadyItem {
  id: string;
  apartmentNumber: string;
  building?: string | null;
  // Backend "type" field (FULL_TURN, etc.)
  turnType: string;
  techName?: string | null;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  status: MakeReadyStatus;
  notes?: string | null;
  dueDate?: string | null;
  updatedAt?: string | null;
}