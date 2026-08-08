export type ProspectStage = "inquiry" | "contacted" | "tour_scheduled" | "tour_completed" | "application" | "approved" | "leased" | "lost";

export interface ProspectSummary {
  id: string;
  propertyId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: ProspectStage;
  desiredMoveIn: string | null;
  budgetMax: number | null;
  assignedToName: string | null;
  updatedAt: string;
}

export interface ProspectDetail extends ProspectSummary {
  notes: string | null;
  activities: ProspectActivity[];
  tours: TourSummary[];
  applications: ApplicationSummary[];
}

export interface ProspectActivity {
  id: string;
  activityType: "call" | "email" | "note" | "tour" | "application";
  notes: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface TourSummary {
  id: string;
  propertyId: string;
  prospectId: string;
  prospectName: string;
  unitId: string | null;
  unitNumber: string | null;
  scheduledAt: string;
  status: "scheduled" | "completed" | "no_show" | "cancelled";
  guideName: string | null;
}

export interface ApplicationSummary {
  id: string;
  propertyId: string;
  prospectId: string;
  prospectName: string;
  unitId: string | null;
  unitNumber: string | null;
  status: "submitted" | "screening" | "approved" | "denied" | "withdrawn" | "leased";
  submittedAt: string;
  decisionAt: string | null;
  monthlyIncome: number | null;
}
