import { randomUUID } from "node:crypto";
import type { MessageCampaign, MessageDelivery, MessageTemplate } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { badRequest, notFound } from "../lib/errors.js";
import { notify } from "../operations/shared.js";

const now = () => new Date().toISOString();

export function listTemplates(propertyId: string): MessageTemplate[] {
  return db.prepare(
    `SELECT id, property_id AS propertyId, name, channel, subject, body, updated_at AS updatedAt
     FROM message_templates WHERE property_id = ? ORDER BY name`,
  ).all(propertyId) as MessageTemplate[];
}

export function createTemplate(input: {
  propertyId: string;
  name: string;
  channel: MessageTemplate["channel"];
  subject?: string | null;
  body: string;
}): MessageTemplate {
  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    "INSERT INTO message_templates (id, property_id, name, channel, subject, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, input.propertyId, input.name, input.channel, input.subject ?? null, input.body, timestamp, timestamp);
  return listTemplates(input.propertyId).find((template) => template.id === id)!;
}

export function listCampaigns(propertyId: string): MessageCampaign[] {
  return db.prepare(
    `SELECT c.id, c.property_id AS propertyId, c.name, c.template_id AS templateId, t.name AS templateName,
            c.audience_type AS audienceType, c.status, c.scheduled_at AS scheduledAt, c.sent_at AS sentAt,
            c.created_at AS createdAt,
            COUNT(d.id) AS deliveryCount,
            SUM(CASE WHEN d.status = 'sent' THEN 1 ELSE 0 END) AS sentCount,
            SUM(CASE WHEN d.status = 'failed' THEN 1 ELSE 0 END) AS failedCount
     FROM message_campaigns c
     LEFT JOIN message_templates t ON t.id = c.template_id
     LEFT JOIN message_deliveries d ON d.campaign_id = c.id
     WHERE c.property_id = ?
     GROUP BY c.id ORDER BY c.created_at DESC`,
  ).all(propertyId).map((row) => ({
    ...(row as MessageCampaign),
    deliveryCount: Number((row as MessageCampaign).deliveryCount),
    sentCount: Number((row as MessageCampaign).sentCount),
    failedCount: Number((row as MessageCampaign).failedCount),
  }));
}

export function createCampaign(input: {
  propertyId: string;
  name: string;
  templateId?: string | null;
  audienceType: MessageCampaign["audienceType"];
  audienceFilter?: Record<string, unknown>;
  scheduledAt?: string | null;
  createdByUserId: string;
}): MessageCampaign {
  const id = randomUUID();
  const timestamp = now();
  db.prepare(
    `INSERT INTO message_campaigns
     (id, property_id, name, template_id, audience_type, audience_filter_json, status, scheduled_at, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.propertyId, input.name, input.templateId ?? null, input.audienceType,
    JSON.stringify(input.audienceFilter ?? {}), input.scheduledAt ? "scheduled" : "draft",
    input.scheduledAt ?? null, input.createdByUserId, timestamp, timestamp);
  return listCampaigns(input.propertyId).find((campaign) => campaign.id === id)!;
}

function resolveAudience(propertyId: string, audienceType: MessageCampaign["audienceType"]): Array<{ type: MessageDelivery["recipientType"]; id: string; name: string }> {
  if (audienceType === "prospects") {
    return db.prepare(
      "SELECT 'prospect' AS type, id, first_name || ' ' || last_name AS name FROM prospects WHERE property_id = ? AND stage NOT IN ('lost', 'leased')",
    ).all(propertyId) as Array<{ type: MessageDelivery["recipientType"]; id: string; name: string }>;
  }
  if (audienceType === "active_leases") {
    return db.prepare(
      `SELECT 'resident' AS type, r.id, r.first_name || ' ' || r.last_name AS name
       FROM leases l JOIN household_members hm ON hm.household_id = l.household_id
       JOIN residents r ON r.id = hm.resident_id
       WHERE l.property_id = ? AND l.status IN ('active', 'notice')`,
    ).all(propertyId) as Array<{ type: MessageDelivery["recipientType"]; id: string; name: string }>;
  }
  return db.prepare(
    "SELECT 'resident' AS type, id, first_name || ' ' || last_name AS name FROM residents WHERE property_id = ? AND status = 'active'",
  ).all(propertyId) as Array<{ type: MessageDelivery["recipientType"]; id: string; name: string }>;
}

export function sendCampaign(campaignId: string, actorUserId: string): MessageCampaign {
  const campaign = db.prepare(
    "SELECT property_id, template_id, audience_type, status FROM message_campaigns WHERE id = ?",
  ).get(campaignId) as { property_id: string; template_id: string | null; audience_type: MessageCampaign["audienceType"]; status: string } | undefined;
  if (!campaign) throw notFound("Campaign not found");
  if (campaign.status === "sent") throw badRequest("Campaign already sent");
  const template = campaign.template_id
    ? db.prepare("SELECT channel, subject, body FROM message_templates WHERE id = ?").get(campaign.template_id) as { channel: MessageTemplate["channel"]; subject: string | null; body: string }
    : { channel: "in_app" as const, subject: "Property announcement", body: "Please check your account for updates." };
  const audience = resolveAudience(campaign.property_id, campaign.audience_type);
  const timestamp = now();
  db.transaction(() => {
    db.prepare("UPDATE message_campaigns SET status = 'sending', updated_at = ? WHERE id = ?").run(timestamp, campaignId);
    const insert = db.prepare(
      "INSERT INTO message_deliveries (id, campaign_id, recipient_type, recipient_id, channel, status, sent_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const recipient of audience) {
      const deliveryId = randomUUID();
      insert.run(deliveryId, campaignId, recipient.type, recipient.id, template.channel, "sent", timestamp, timestamp);
      if (template.channel === "in_app" && recipient.type === "user") {
        notify(recipient.id, "campaign.sent", template.subject ?? campaignId, template.body, "campaign", campaignId);
      }
    }
    db.prepare("UPDATE message_campaigns SET status = 'sent', sent_at = ?, updated_at = ? WHERE id = ?").run(timestamp, timestamp, campaignId);
  })();
  return listCampaigns(campaign.property_id).find((item) => item.id === campaignId)!;
}

export function listDeliveries(campaignId: string): MessageDelivery[] {
  return db.prepare(
    `SELECT d.id, d.campaign_id AS campaignId, d.recipient_type AS recipientType, d.recipient_id AS recipientId,
            COALESCE(r.first_name || ' ' || r.last_name, p.first_name || ' ' || p.last_name, u.name, d.recipient_id) AS recipientName,
            d.channel, d.status, d.sent_at AS sentAt, d.error_message AS errorMessage
     FROM message_deliveries d
     LEFT JOIN residents r ON d.recipient_type = 'resident' AND r.id = d.recipient_id
     LEFT JOIN prospects p ON d.recipient_type = 'prospect' AND p.id = d.recipient_id
     LEFT JOIN users u ON d.recipient_type = 'user' AND u.id = d.recipient_id
     WHERE d.campaign_id = ? ORDER BY d.created_at DESC`,
  ).all(campaignId) as MessageDelivery[];
}
