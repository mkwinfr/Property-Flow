import PDFDocument from "pdfkit";
import { db } from "../db/index.js";
import { notFound } from "../lib/errors.js";
import { listWorkOrders } from "./service.js";

const PDF_COLORS = {
  evergreen: "#173e31",
  ink: "#18342b",
  muted: "#52675f",
  brass: "#b58b48",
  line: "#d9e1da",
};

export async function renderWorkOrderPdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
  const header = db.prepare(
    `SELECT wo.property_id AS propertyId, p.name AS propertyName, p.code AS propertyCode,
            p.address_line_1 || ', ' || p.city || ', ' || p.state || ' ' || p.postal_code AS propertyAddress
     FROM work_orders wo JOIN properties p ON p.id = wo.property_id WHERE wo.id = ?`,
  ).get(id) as { propertyId: string; propertyName: string; propertyCode: string; propertyAddress: string } | undefined;
  if (!header) throw notFound("Work order not found");
  const item = listWorkOrders(header.propertyId, true).find((record) => record.id === id);
  if (!item) throw notFound("Work order not found");
  const attachments = db.prepare("SELECT original_name AS name, mime_type AS mimeType, created_at AS createdAt FROM attachments WHERE entity_type = 'work_order' AND entity_id = ? ORDER BY created_at").all(id) as Array<{ name: string; mimeType: string; createdAt: string }>;
  const document = new PDFDocument({ size: "LETTER", margins: { top: 46, right: 46, bottom: 46, left: 46 }, info: { Title: `Work Order - Unit ${item.unitNumber}` } });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => { document.on("end", () => resolve(Buffer.concat(chunks))); document.on("error", reject); });
  document.rect(0, 0, document.page.width, 9).fill(PDF_COLORS.evergreen);
  document.fillColor(PDF_COLORS.brass).font("Helvetica-Bold").fontSize(10).text("PROPERTY SUITE", { characterSpacing: 1.4 });
  document.fillColor(PDF_COLORS.ink).fontSize(22).text(`Work Order · Apartment ${item.unitNumber}`, { characterSpacing: 0 });
  document.moveDown(.25).fillColor(PDF_COLORS.muted).font("Helvetica").fontSize(9).text(`${header.propertyName} · ${header.propertyAddress}`);
  document.moveDown(1).strokeColor(PDF_COLORS.line).moveTo(46, document.y).lineTo(566, document.y).stroke();
  section(document, "Request", [
    ["Status", item.status.replaceAll("_", " ")], ["Priority", item.priority === "normal" ? "Medium" : item.priority],
    ["Category", item.category], ["Areas", item.areas.join(", ") || "Not recorded"], ["Reported by", item.requestedBy ?? "Not recorded"],
    ["Received by", item.receivedByName ?? "Not recorded"], ["Submitted", new Date(item.createdAt).toLocaleString()],
  ]);
  paragraph(document, item.title, item.description || "No detailed description was recorded.");
  section(document, "Access and appointment", [
    ["Permission to enter", item.permissionToEnter === "permission_given" ? "Permission given" : item.permissionToEnter === "no_permission" ? "No permission given" : "Not recorded"],
    ["Appointment required", item.appointmentRequired ? "Yes" : "No"], ["Appointment", item.appointmentStart ? `${item.appointmentStart}${item.appointmentEnd ? ` to ${item.appointmentEnd}` : ""}` : "Not scheduled"],
    ["Access notes", item.accessNotes ?? "None"], ["Pet information", item.petInformation ?? "None"], ["Security instructions", item.securityInstructions ?? "None"],
  ]);
  section(document, "Assignment", [["Assigned to", item.assignedToName ?? "Unassigned"], ["Due date", item.dueDate ?? "Not scheduled"]]);
  if (item.vendorWorkPerformed) section(document, "Vendor work", [["Vendor", item.vendorName ?? "Not selected"], ["Scope", item.vendorScope ?? "Not recorded"], ["Scheduled", item.vendorScheduledDate ?? "Not scheduled"], ["Completed", item.vendorCompletedDate ?? "Not completed"], ["Invoice", item.vendorInvoiceNumber ?? "Not recorded"], ["Cost", item.vendorCost === null ? "Not recorded" : `$${item.vendorCost.toFixed(2)}`]]);
  if (item.residentResponsible) section(document, "Resident charges", [["Reason", item.residentChargeReason ?? "Not recorded"], ["Estimate", money(item.residentChargeEstimate)], ["Final", money(item.residentChargeFinal)], ["Status", item.residentChargeStatus ?? "Pending"]]);
  section(document, "Completion", [["Completed by", item.completedByName ?? "Not completed"], ["Completed", item.status === "complete" ? item.updatedAt : "Not completed"], ["Work performed", item.workPerformed ?? "Not recorded"], ["Completion notes", item.completionNotes ?? "Not recorded"], ["Resident notified", item.residentNotified ? `Yes${item.notificationMethod ? ` · ${item.notificationMethod}` : ""}` : "No"], ["Follow-up", item.followUpRequired ? item.followUpDate ?? "Required, date not set" : "Not required"]]);
  section(document, "Attachments", attachments.length ? attachments.map((file) => [file.name, `${file.mimeType} · ${new Date(file.createdAt).toLocaleDateString()}`]) : [["Files", "No photos or documents attached"]]);
  document.moveDown(1).fillColor(PDF_COLORS.muted).fontSize(7.5).text(`Generated ${new Date().toLocaleString()} · Work order ${item.id}`, { align: "center" });
  document.end();
  return { buffer: await completed, filename: `work-order-${header.propertyCode.toLowerCase()}-unit-${item.unitNumber}.pdf` };
}

function section(document: PDFKit.PDFDocument, title: string, rows: string[][]) {
  if (document.y > 670) document.addPage();
  document.moveDown(1.1).fillColor(PDF_COLORS.evergreen).font("Helvetica-Bold").fontSize(11).text(title);
  document.moveDown(.35);
  for (const [label, value] of rows) {
    document.fillColor(PDF_COLORS.muted).font("Helvetica-Bold").fontSize(8).text(label ?? "", { continued: true, width: 115 });
    document.fillColor(PDF_COLORS.ink).font("Helvetica").text(value || "—", { width: 395 });
    document.moveDown(.25);
  }
}

function paragraph(document: PDFKit.PDFDocument, title: string, body: string) {
  document.moveDown(.7).fillColor(PDF_COLORS.ink).font("Helvetica-Bold").fontSize(13).text(title);
  document.moveDown(.25).fillColor(PDF_COLORS.muted).font("Helvetica").fontSize(9).text(body, { lineGap: 2 });
}
const money = (value: number | null) => value === null ? "Not recorded" : `$${value.toFixed(2)}`;
