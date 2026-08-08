export interface MessageTemplate {
  id: string;
  propertyId: string;
  name: string;
  channel: "email" | "sms" | "in_app";
  subject: string | null;
  body: string;
  updatedAt: string;
}

export interface MessageCampaign {
  id: string;
  propertyId: string;
  name: string;
  templateId: string | null;
  templateName: string | null;
  audienceType: "all_residents" | "active_leases" | "prospects" | "custom";
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  scheduledAt: string | null;
  sentAt: string | null;
  deliveryCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

export interface MessageDelivery {
  id: string;
  campaignId: string;
  recipientType: "resident" | "prospect" | "user";
  recipientId: string;
  recipientName: string;
  channel: "email" | "sms" | "in_app";
  status: "pending" | "sent" | "failed" | "skipped";
  sentAt: string | null;
  errorMessage: string | null;
}
