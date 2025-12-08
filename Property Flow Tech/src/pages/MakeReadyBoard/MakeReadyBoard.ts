export type MakeReadyStatus = "NOT_STARTED" | "IN_PROGRESS" | "READY" | "ON_HOLD";

export interface MakeReadyItem {
  notes: string;
  id: string;
  apartmentNumber: string;
  building?: string | null;
  // Backend "type" field (FULL_TURN, etc.)
  turnType: string;
  techName?: string | null;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  status: MakeReadyStatus;
  dueDate?: string | null;
  updatedAt?: string | null;
}