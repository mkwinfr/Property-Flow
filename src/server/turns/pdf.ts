import PDFDocument from "pdfkit";
import type Database from "better-sqlite3";
import type { TurnDetail } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { conflict, notFound } from "../lib/errors.js";
import { getTurn } from "./service.js";

const COLORS = {
  ink: "#18342b",
  green: "#173e31",
  greenSoft: "#edf3ec",
  gold: "#b58b48",
  coral: "#994b43",
  muted: "#52675f",
  line: "#d9e1da",
  paper: "#f7f3eb",
  white: "#ffffff",
};

const paginationContexts = new WeakMap<PDFKit.PDFDocument, {
  record: MakeReadyPdfRecord;
  addingManualPage: boolean;
}>();

interface MakeReadyExportHeader {
  actualReadyDate: string | null;
  templateVersion: number;
  propertyName: string;
  propertyCode: string;
  propertyAddress: string;
  propertyTimezone: string;
  createdByName: string;
}

interface MakeReadyBlockerHistory {
  id: string;
  itemTitle: string;
  itemArea: string;
  category: string;
  reason: string;
  responsibleParty: string | null;
  expectedResolutionDate: string | null;
  openedByName: string;
  openedAt: string;
  resolvedByName: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
}

interface MakeReadyAttachmentRecord {
  id: string;
  entityType: "turn" | "turn_item";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  uploadedByName: string;
  createdAt: string;
  scopeTitle: string | null;
}

export interface MakeReadyPdfRecord {
  turn: TurnDetail;
  header: MakeReadyExportHeader;
  blockers: MakeReadyBlockerHistory[];
  attachments: MakeReadyAttachmentRecord[];
  generatedAt: string;
}

export function loadMakeReadyPdfRecord(
  turnId: string,
  database: Database.Database = db,
  generatedAt = new Date().toISOString(),
): MakeReadyPdfRecord {
  const turn = getTurn(turnId, database);
  if (turn.status !== "complete") {
    throw conflict("The Make Ready PDF is available after manager approval");
  }

  const header = database.prepare(
    `SELECT t.actual_ready_date AS actualReadyDate,
            t.template_version_snapshot AS templateVersion,
            p.name AS propertyName, p.code AS propertyCode,
            p.address_line_1 || ', ' || p.city || ', ' || p.state || ' ' || p.postal_code AS propertyAddress,
            p.timezone AS propertyTimezone, creator.name AS createdByName
     FROM turns t
     JOIN properties p ON p.id = t.property_id
     JOIN users creator ON creator.id = t.created_by_user_id
     WHERE t.id = ?`,
  ).get(turnId) as MakeReadyExportHeader | undefined;
  if (!header) throw notFound("Make Ready not found");

  const blockers = database.prepare(
    `SELECT blocker.id, item.title AS itemTitle, item.area AS itemArea,
            blocker.category, blocker.reason, blocker.responsible_party AS responsibleParty,
            blocker.expected_resolution_date AS expectedResolutionDate,
            opened.name AS openedByName, blocker.opened_at AS openedAt,
            resolved.name AS resolvedByName, blocker.resolved_at AS resolvedAt,
            blocker.resolution_notes AS resolutionNotes
     FROM turn_item_blockers blocker
     JOIN turn_items item ON item.id = blocker.turn_item_id
     JOIN users opened ON opened.id = blocker.opened_by_user_id
     LEFT JOIN users resolved ON resolved.id = blocker.resolved_by_user_id
     WHERE blocker.turn_id = ?
     ORDER BY blocker.opened_at, item.sort_order`,
  ).all(turnId) as MakeReadyBlockerHistory[];

  const attachments = database.prepare(
    `SELECT attachment.id, attachment.entity_type AS entityType,
            attachment.original_name AS originalName, attachment.mime_type AS mimeType,
            attachment.size_bytes AS sizeBytes, attachment.caption,
            uploader.name AS uploadedByName, attachment.created_at AS createdAt,
            item.title AS scopeTitle
     FROM attachments attachment
     JOIN users uploader ON uploader.id = attachment.uploaded_by_user_id
     LEFT JOIN turn_items item
       ON attachment.entity_type = 'turn_item' AND item.id = attachment.entity_id
     WHERE (attachment.entity_type = 'turn' AND attachment.entity_id = ?)
        OR (attachment.entity_type = 'turn_item' AND item.turn_id = ?)
     ORDER BY attachment.created_at, attachment.original_name`,
  ).all(turnId, turnId) as MakeReadyAttachmentRecord[];

  return { turn, header, blockers, attachments, generatedAt };
}

export function makeReadyPdfFilename(record: MakeReadyPdfRecord): string {
  const property = slug(record.header.propertyCode || record.header.propertyName);
  const unit = slug(record.turn.unitNumber);
  const date = record.header.actualReadyDate ?? record.turn.approvedAt?.slice(0, 10) ?? "completed";
  return `make-ready-${property}-unit-${unit}-${date}.pdf`;
}

export function renderMakeReadyPdf(record: MakeReadyPdfRecord): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "LETTER",
      margins: { top: 58, right: 48, bottom: 54, left: 48 },
      bufferPages: true,
      compress: true,
      info: {
        Title: `Completed Make Ready - Unit ${record.turn.unitNumber}`,
        Author: "Property Suite",
        Subject: `Completed Make Ready record for ${record.header.propertyName}`,
        Keywords: "make ready, completion record, property operations",
        CreationDate: new Date(record.generatedAt),
      },
    });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => {
      paginationContexts.delete(document);
      resolve(Buffer.concat(chunks));
    });
    document.on("error", reject);

    paginationContexts.set(document, { record, addingManualPage: false });
    document.on("pageAdded", () => {
      if (!paginationContexts.get(document)?.addingManualPage) drawContinuationHeader(document, record);
    });
    drawReport(document, record);
    drawPageFooters(document, record);
    document.end();
  });
}

function drawReport(document: PDFKit.PDFDocument, record: MakeReadyPdfRecord): void {
  const { turn, header } = record;
  drawCoverHeader(document, record);

  document.moveDown(1.1);
  drawApprovalPanel(document, record);
  sectionHeading(document, "Make Ready summary", "Final ownership, schedule, and scope totals");
  drawSummaryGrid(document, [
    ["Lead technician", turn.leadTechnicianName ?? "Unassigned"],
    ["Created by", header.createdByName],
    ["Move-out date", formatDate(turn.moveOutDate, header.propertyTimezone)],
    ["Target ready", formatDate(turn.targetReadyDate, header.propertyTimezone)],
    ["Actual ready", formatDate(header.actualReadyDate, header.propertyTimezone)],
    ["Priority", titleCase(turn.priority)],
    ["Scope completed", `${turn.completedItems} of ${turn.totalItems}`],
    ["Review rounds", String(turn.reviewRound)],
  ]);
  if (turn.notes) {
    labelParagraph(document, "Make Ready notes", turn.notes);
  }

  sectionHeading(document, "Completed scope", "Completion evidence and manager review history by area");
  let currentArea = "";
  for (const item of turn.items) {
    if (item.area !== currentArea) {
      currentArea = item.area;
      ensureSpace(document, 130);
      document.moveDown(0.45);
      document.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.green)
        .text(item.area, document.page.margins.left, document.y, { width: contentWidth(document) });
      document.moveTo(document.page.margins.left, document.y + 4)
        .lineTo(document.page.width - document.page.margins.right, document.y + 4)
        .lineWidth(1).strokeColor(COLORS.line).stroke();
      document.moveDown(0.75);
    }
    drawScopeItem(document, item, header.propertyTimezone);
  }

  sectionHeading(document, "Vendor work", "Outside services connected to this Make Ready");
  if (turn.vendorJobs.length === 0) {
    emptyText(document, "No vendor work was recorded.");
  } else {
    for (const job of turn.vendorJobs) drawVendorJob(document, job, header.propertyTimezone);
  }

  sectionHeading(document, "Financial summary", "Final materials, vendor commitments, and allocation estimates");
  if (!turn.costSummary) {
    emptyText(document, "Financial information is not available for this record.");
  } else {
    drawMoneyGrid(document, [
      ["Materials", turn.costSummary.materialCost],
      ["Vendor cost", turn.costSummary.vendorCost],
      ["Gross cost", turn.costSummary.grossCost],
      ["Estimated resident charge", turn.costSummary.estimatedResidentCharge],
      ["Projected property expense", turn.costSummary.projectedPropertyExpense],
    ]);
    mutedText(document, "Vendor cost uses the final invoice when available, otherwise the approved amount or quote. Resident charges are inspection estimates.");
  }

  sectionHeading(document, "Blocker history", "Resolved delays and cross-department follow-up");
  if (record.blockers.length === 0) {
    emptyText(document, "No blockers were recorded.");
  } else {
    for (const blocker of record.blockers) drawBlocker(document, blocker, header.propertyTimezone);
  }

  sectionHeading(document, "Attachment register", "Files retained with the Make Ready record");
  if (record.attachments.length === 0) {
    emptyText(document, "No attachments were recorded.");
  } else {
    for (const attachment of record.attachments) drawAttachment(document, attachment, header.propertyTimezone);
  }

  ensureSpace(document, 62);
  document.moveDown(0.8);
  const y = document.y;
  document.roundedRect(document.page.margins.left, y, contentWidth(document), 48, 5)
    .fillColor(COLORS.greenSoft).fill();
  document.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.green)
    .text("RECORD CERTIFICATION", document.page.margins.left + 14, y + 10);
  document.font("Helvetica").fontSize(8.5).fillColor(COLORS.ink)
    .text(`This document was generated from the locked, manager-approved Make Ready record ${turn.id}.`,
      document.page.margins.left + 14, y + 25, { width: contentWidth(document) - 28 });
  document.y = y + 55;
}

function drawCoverHeader(document: PDFKit.PDFDocument, record: MakeReadyPdfRecord): void {
  const { turn, header } = record;
  const left = document.page.margins.left;
  const width = contentWidth(document);
  document.rect(0, 0, document.page.width, 13).fill(COLORS.green);
  document.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.green).text("PROPERTY SUITE", left, 44, { characterSpacing: 1.2 });
  document.font("Helvetica-Bold").fontSize(25).fillColor(COLORS.ink).text("Completed Make Ready Record", left, 67);
  document.font("Helvetica").fontSize(10).fillColor(COLORS.muted)
    .text(`${header.propertyName} - Unit ${turn.unitNumber}`, left, 101);
  document.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted)
    .text(header.propertyAddress, left, 117, { width: width - 130 });

  const badgeWidth = 102;
  const badgeX = document.page.width - document.page.margins.right - badgeWidth;
  document.roundedRect(badgeX, 68, badgeWidth, 31, 5).fill(COLORS.green);
  document.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.white)
    .text("COMPLETE", badgeX, 79, { width: badgeWidth, align: "center", characterSpacing: 0.8 });
  document.moveTo(left, 141).lineTo(left + width, 141).lineWidth(1).strokeColor(COLORS.line).stroke();
  document.y = 153;
}

function drawContinuationHeader(document: PDFKit.PDFDocument, record: MakeReadyPdfRecord): void {
  const left = document.page.margins.left;
  const right = document.page.width - document.page.margins.right;
  document.rect(0, 0, document.page.width, 8).fill(COLORS.green);
  document.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.green)
    .text("PROPERTY SUITE", left, 37, { characterSpacing: 1 });
  document.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted)
    .text(`${record.header.propertyName} - Unit ${record.turn.unitNumber}`, left + 125, 37, {
      width: right - left - 125,
      align: "right",
    });
  document.moveTo(left, 51).lineTo(right, 51).lineWidth(0.7).strokeColor(COLORS.line).stroke();
  document.y = 66;
}

function drawApprovalPanel(document: PDFKit.PDFDocument, record: MakeReadyPdfRecord): void {
  const { turn, header } = record;
  ensureSpace(document, 72);
  const x = document.page.margins.left;
  const y = document.y;
  const width = contentWidth(document);
  document.roundedRect(x, y, width, 64, 6).fill(COLORS.greenSoft);
  document.circle(x + 24, y + 24, 10).fill(COLORS.green);
  document.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.white).text("OK", x + 14, y + 20, { width: 20, align: "center" });
  document.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.green).text("Manager approved", x + 45, y + 13);
  document.font("Helvetica").fontSize(9).fillColor(COLORS.ink)
    .text(`${turn.approvedByName ?? "Property manager"} - ${formatDateTime(turn.approvedAt, header.propertyTimezone)}`, x + 45, y + 30);
  document.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted)
    .text(`Record ID: ${turn.id}`, x + 45, y + 45, { width: width - 60 });
  document.y = y + 68;
}

function drawSummaryGrid(document: PDFKit.PDFDocument, entries: Array<[string, string]>): void {
  const gap = 8;
  const cellWidth = (contentWidth(document) - gap) / 2;
  for (let index = 0; index < entries.length; index += 2) {
    ensureSpace(document, 51);
    const y = document.y;
    for (let column = 0; column < 2; column += 1) {
      const entry = entries[index + column];
      if (!entry) continue;
      const x = document.page.margins.left + column * (cellWidth + gap);
      document.roundedRect(x, y, cellWidth, 43, 4).fill(COLORS.paper);
      document.font("Helvetica").fontSize(7.5).fillColor(COLORS.muted)
        .text(entry[0].toUpperCase(), x + 10, y + 8, { width: cellWidth - 20, characterSpacing: 0.35 });
      document.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.ink)
        .text(safeText(entry[1]), x + 10, y + 22, { width: cellWidth - 20, ellipsis: true });
    }
    document.y = y + 50;
    document.x = document.page.margins.left;
  }
}

function drawScopeItem(document: PDFKit.PDFDocument, item: TurnDetail["items"][number], timezone: string): void {
  ensureSpace(document, 68);
  const x = document.page.margins.left;
  const startY = document.y;
  const marker = item.status === "complete" ? COLORS.green : COLORS.muted;
  document.roundedRect(x, startY + 1, 5, 34, 2).fill(marker);
  document.font("Helvetica-Bold").fontSize(10.5).fillColor(COLORS.ink)
    .text(item.title, x + 14, startY, { width: contentWidth(document) - 120 });
  document.font("Helvetica-Bold").fontSize(7.5).fillColor(marker)
    .text(titleCase(item.status), x + contentWidth(document) - 100, startY + 1, { width: 100, align: "right" });
  document.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted)
    .text(`${item.category} - ${originLabel(item.origin)}`, x + 14, document.y + 2);
  document.moveDown(0.35);

  const completion = item.status === "not_applicable"
    ? "No work required"
    : `Completed ${formatDateTime(item.completedAt, timezone)}${item.completedByName ? ` by ${item.completedByName}` : ""}`;
  labelLine(document, "Completion", completion, 14);
  if (item.notes) labelLine(document, "Notes", item.notes, 14);
  if (item.inspectionCondition) {
    const inspection = [
      titleCase(item.inspectionCondition),
      item.inspectionResponsibility ? `${titleCase(item.inspectionResponsibility)} responsibility` : null,
      item.inspectionCostEstimate !== null ? `${formatMoney(item.inspectionCostEstimate)} estimate` : null,
    ].filter(Boolean).join(" - ");
    labelLine(document, "Inspection", inspection, 14);
  }
  if (item.materials.length > 0) {
    labelLine(document, "Materials", item.materials.map((material) =>
      `${formatQuantity(material.quantity)} ${material.name} (${material.sku})${material.totalCost !== null ? ` - ${formatMoney(material.totalCost)}` : ""}`,
    ).join("; "), 14);
  }
  if (item.reviews.length > 0) {
    for (const review of [...item.reviews].reverse()) {
      labelLine(document, `Review ${review.reviewRound}`,
        `${titleCase(review.decision)} by ${review.reviewedByName} on ${formatDateTime(review.createdAt, timezone)}${review.notes ? ` - ${review.notes}` : ""}`, 14);
    }
  }
  document.moveDown(0.45);
  document.moveTo(x + 14, document.y).lineTo(x + contentWidth(document), document.y)
    .lineWidth(0.5).strokeColor(COLORS.line).stroke();
  document.moveDown(0.6);
  document.x = x;
}

function drawVendorJob(document: PDFKit.PDFDocument, job: TurnDetail["vendorJobs"][number], timezone: string): void {
  ensureSpace(document, 70);
  const x = document.page.margins.left;
  const y = document.y;
  document.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink)
    .text(job.vendorName, x, y, { width: contentWidth(document) - 105 });
  document.font("Helvetica-Bold").fontSize(8).fillColor(job.status === "complete" ? COLORS.green : COLORS.muted)
    .text(titleCase(job.status), x + contentWidth(document) - 100, y + 1, { width: 100, align: "right" });
  document.font("Helvetica").fontSize(8.7).fillColor(COLORS.ink)
    .text(job.scope, x, Math.max(document.y, y + 16), { width: contentWidth(document) });
  const facts = [
    job.scheduledDate ? `Scheduled ${formatDate(job.scheduledDate, timezone)}` : null,
    job.completedDate ? `Completed ${formatDate(job.completedDate, timezone)}` : null,
    vendorAmount(job),
    job.invoiceNumber ? `Invoice ${job.invoiceNumber}` : null,
    job.paymentStatus ? `Payment ${titleCase(job.paymentStatus)}` : null,
  ].filter(Boolean).join(" - ");
  document.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text(facts);
  document.moveDown(0.7);
}

function drawMoneyGrid(document: PDFKit.PDFDocument, entries: Array<[string, number]>): void {
  const x = document.page.margins.left;
  for (const [label, amount] of entries) {
    ensureSpace(document, 25);
    const y = document.y;
    document.font(label === "Gross cost" ? "Helvetica-Bold" : "Helvetica")
      .fontSize(label === "Gross cost" ? 10 : 9).fillColor(COLORS.ink).text(label, x, y);
    document.font("Helvetica-Bold").fontSize(label === "Gross cost" ? 11 : 9).fillColor(COLORS.ink)
      .text(formatMoney(amount), x, y, { width: contentWidth(document), align: "right" });
    document.moveTo(x, y + 17).lineTo(x + contentWidth(document), y + 17)
      .lineWidth(0.45).strokeColor(COLORS.line).stroke();
    document.y = y + 24;
  }
}

function drawBlocker(document: PDFKit.PDFDocument, blocker: MakeReadyBlockerHistory, timezone: string): void {
  ensureSpace(document, 82);
  document.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink)
    .text(`${blocker.itemArea} - ${blocker.itemTitle}`);
  document.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.coral)
    .text(titleCase(blocker.category), { continued: true })
    .font("Helvetica").fillColor(COLORS.muted)
    .text(`  Opened ${formatDateTime(blocker.openedAt, timezone)} by ${blocker.openedByName}`);
  labelLine(document, "Reason", blocker.reason);
  if (blocker.responsibleParty) labelLine(document, "Owner", blocker.responsibleParty);
  if (blocker.expectedResolutionDate) labelLine(document, "Expected", formatDate(blocker.expectedResolutionDate, timezone));
  labelLine(document, "Resolution", blocker.resolvedAt
    ? `${blocker.resolutionNotes ?? "Resolved"} - ${formatDateTime(blocker.resolvedAt, timezone)}${blocker.resolvedByName ? ` by ${blocker.resolvedByName}` : ""}`
    : "Open when the Make Ready was approved");
  document.moveDown(0.6);
}

function drawAttachment(document: PDFKit.PDFDocument, attachment: MakeReadyAttachmentRecord, timezone: string): void {
  ensureSpace(document, 45);
  document.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.ink).text(attachment.originalName);
  const location = attachment.scopeTitle ? `Scope: ${attachment.scopeTitle}` : "Make Ready record";
  document.font("Helvetica").fontSize(8).fillColor(COLORS.muted)
    .text(`${location} - ${attachment.mimeType} - ${formatFileSize(attachment.sizeBytes)} - ${formatDateTime(attachment.createdAt, timezone)} by ${attachment.uploadedByName}`);
  if (attachment.caption) document.font("Helvetica").fontSize(8.5).fillColor(COLORS.ink).text(attachment.caption, { indent: 10 });
  document.moveDown(0.45);
}

function sectionHeading(document: PDFKit.PDFDocument, title: string, subtitle: string): void {
  ensureSpace(document, 66);
  document.moveDown(1.15);
  const x = document.page.margins.left;
  document.font("Helvetica-Bold").fontSize(15).fillColor(COLORS.ink)
    .text(title, x, document.y, { width: contentWidth(document) });
  document.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted)
    .text(subtitle, x, document.y, { width: contentWidth(document) });
  document.moveDown(0.7);
  document.x = x;
}

function labelParagraph(document: PDFKit.PDFDocument, label: string, value: string): void {
  ensureSpace(document, 48);
  document.moveDown(0.45);
  document.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.green).text(label.toUpperCase());
  document.font("Helvetica").fontSize(9).fillColor(COLORS.ink).text(safeText(value));
}

function labelLine(document: PDFKit.PDFDocument, label: string, value: string, indent = 0): void {
  const x = document.page.margins.left + indent;
  const labelWidth = 70;
  document.font("Helvetica-Bold").fontSize(8.2).fillColor(COLORS.muted)
    .text(`${label}:`, x, document.y, { width: labelWidth, continued: false });
  const labelY = document.y;
  document.font("Helvetica").fontSize(8.5).fillColor(COLORS.ink)
    .text(safeText(value), x + labelWidth, labelY - 9.4, { width: contentWidth(document) - indent - labelWidth });
  document.moveDown(0.18);
}

function mutedText(document: PDFKit.PDFDocument, value: string): void {
  document.moveDown(0.35);
  document.font("Helvetica").fontSize(8).fillColor(COLORS.muted)
    .text(value, document.page.margins.left, document.y, { width: contentWidth(document) });
}

function emptyText(document: PDFKit.PDFDocument, value: string): void {
  document.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.muted)
    .text(value, document.page.margins.left, document.y, { width: contentWidth(document) });
}

function ensureSpace(document: PDFKit.PDFDocument, height: number): void {
  const bottom = document.page.height - document.page.margins.bottom;
  if (document.y + height <= bottom) return;
  const context = paginationContexts.get(document);
  if (!context) {
    document.addPage();
    return;
  }
  context.addingManualPage = true;
  document.addPage();
  context.addingManualPage = false;
  drawContinuationHeader(document, context.record);
}

function drawPageFooters(document: PDFKit.PDFDocument, record: MakeReadyPdfRecord): void {
  const range = document.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    document.switchToPage(index);
    const y = document.page.height - 42;
    const left = document.page.margins.left;
    const bottomMargin = document.page.margins.bottom;
    document.page.margins.bottom = 0;
    document.moveTo(left, y - 8).lineTo(document.page.width - document.page.margins.right, y - 8)
      .lineWidth(0.5).strokeColor(COLORS.line).stroke();
    document.font("Helvetica").fontSize(7).fillColor(COLORS.muted)
      .text(`Generated ${formatDateTime(record.generatedAt, record.header.propertyTimezone)} - Record ${record.turn.id}`, left, y, {
        width: contentWidth(document) - 60,
        lineBreak: false,
      });
    document.text(`Page ${index + 1} of ${range.count}`, document.page.width - document.page.margins.right - 72, y, {
      width: 72,
      align: "right",
      lineBreak: false,
    });
    document.page.margins.bottom = bottomMargin;
  }
}

function contentWidth(document: PDFKit.PDFDocument): number {
  return document.page.width - document.page.margins.left - document.page.margins.right;
}

function formatDate(value: string | null, timezone: string): string {
  if (!value) return "Not recorded";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatDateTime(value: string | null, timezone: string): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatFileSize(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function vendorAmount(job: TurnDetail["vendorJobs"][number]): string | null {
  if (job.invoiceAmount !== null) return `${formatMoney(job.invoiceAmount)} invoiced`;
  if (job.approvedAmount !== null) return `${formatMoney(job.approvedAmount)} approved`;
  if (job.quoteAmount !== null) return `${formatMoney(job.quoteAmount)} quoted`;
  return null;
}

function titleCase(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function originLabel(value: TurnDetail["items"][number]["origin"]): string {
  if (value === "inspection") return "Inspection finding";
  if (value === "make_ready") return "Added during Make Ready";
  return "Published template";
}

function safeText(value: string): string {
  return value
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2011", "-")
    .replaceAll("\u2022", "-")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "record";
}
