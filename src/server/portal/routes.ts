import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "../db/index.js";
import { unauthorized } from "../lib/errors.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { isModuleEnabled } from "../portfolio/service.js";
import {
  countPortalUnreadMessages,
  createPortalHouseholdSubmission,
  createPortalMaintenanceAttachment,
  getPortalAttachmentContent,
  listPortalHouseholdSubmissions,
  listPortalLeaseDocuments,
  listPortalMaintenanceAttachments,
  listPortalMessages,
  markPortalMessageRead,
} from "./attachments.js";
import {
  getPortalApplication,
  getPortalLease,
  getPortalMaintenance,
  createPortalPet,
  deletePortalPet,
  listPortalCharges,
  listPortalMaintenance,
  listPortalPets,
  resolveResidentUnit,
  submitPortalMaintenance,
  updatePortalPet,
} from "./service.js";
import {
  authenticatePortal,
  clearPortalSession,
  createPortalSession,
  loadPortalSessionUser,
  setPortalSessionCookie,
  type PortalAuthenticatedRequest,
} from "./session.js";

const router = Router();
const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(200) });
const fallbackPasswordHash = hashPassword(randomBytes(32).toString("hex"));

router.post("/portal/auth/login", (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const account = db.prepare(
      `SELECT ra.id, ra.password_hash, ra.status, r.property_id AS propertyId
       FROM resident_accounts ra JOIN residents r ON r.id = ra.resident_id
       WHERE ra.email = ? COLLATE NOCASE`,
    ).get(input.email) as { id: string; password_hash: string; status: string; propertyId: string } | undefined;
    if (!account || account.status !== "active" || !verifyPassword(input.password, account.password_hash ?? fallbackPasswordHash)) {
      throw unauthorized("Email or password is incorrect");
    }
    if (!isModuleEnabled(account.propertyId, "portal")) throw unauthorized("The resident portal is not available for your property");
    const session = createPortalSession(account.id);
    setPortalSessionCookie(res, session.token, session.expiresAt);
    res.json({ user: loadPortalSessionUser(account.id) });
  } catch (error) { next(error); }
});

router.get("/portal/auth/session", authenticatePortal, (req: PortalAuthenticatedRequest, res) => {
  res.json({ user: req.portalAuth });
});

router.post("/portal/auth/logout", authenticatePortal, (req: PortalAuthenticatedRequest, res) => {
  clearPortalSession(req, res);
  res.status(204).end();
});

router.get("/portal/maintenance", authenticatePortal, (req: PortalAuthenticatedRequest, res) => {
  res.json({ requests: listPortalMaintenance(req.portalAuth!.residentId) });
});

router.get("/portal/maintenance/:id", authenticatePortal, (req: PortalAuthenticatedRequest, res) => {
  res.json({ request: getPortalMaintenance(req.portalAuth!.residentId, String(req.params.id)) });
});

router.post("/portal/maintenance", authenticatePortal, (req: PortalAuthenticatedRequest, res, next) => {
  try {
    const input = z.object({
      title: z.string().trim().min(3).max(160),
      description: z.string().trim().min(3).max(4000),
      category: z.string().trim().min(2).max(80),
      permissionToEnter: z.enum(["permission_given", "no_permission"]),
      appointmentRequired: z.boolean(),
    }).parse(req.body);
    const unit = resolveResidentUnit(req.portalAuth!.residentId);
    res.status(201).json({
      request: submitPortalMaintenance({
        residentId: req.portalAuth!.residentId,
        propertyId: unit.propertyId,
        unitId: unit.unitId,
        ...input,
      }),
    });
  } catch (error) { next(error); }
});

router.get("/portal/charges", authenticatePortal, (req: PortalAuthenticatedRequest, res) => {
  res.json({ charges: listPortalCharges(req.portalAuth!.residentId) });
});

router.get("/portal/lease", authenticatePortal, (req: PortalAuthenticatedRequest, res) => {
  res.json({ lease: getPortalLease(req.portalAuth!.residentId) });
});

router.get("/portal/application", authenticatePortal, (req: PortalAuthenticatedRequest, res) => {
  res.json({ application: getPortalApplication(req.portalAuth!.residentId) });
});

router.get("/portal/pets", authenticatePortal, (req: PortalAuthenticatedRequest, res) => {
  res.json({ pets: listPortalPets(req.portalAuth!.residentId) });
});

router.post("/portal/pets", authenticatePortal, (req: PortalAuthenticatedRequest, res, next) => {
  try {
    const input = z.object({
      name: z.string().trim().min(1).max(80),
      species: z.string().trim().min(1).max(40),
      breed: z.string().trim().max(80).nullable().optional(),
      color: z.string().trim().max(80).nullable().optional(),
      weightLbs: z.number().min(0).max(400).nullable().optional(),
      isServiceAnimal: z.boolean().optional(),
      vaccinationExpires: z.iso.date().nullable().optional(),
      notes: z.string().trim().max(1000).nullable().optional(),
    }).parse(req.body);
    res.status(201).json({ pet: createPortalPet(req.portalAuth!.residentId, input) });
  } catch (error) { next(error); }
});

router.put("/portal/pets/:id", authenticatePortal, (req: PortalAuthenticatedRequest, res, next) => {
  try {
    const input = z.object({
      name: z.string().trim().min(1).max(80).optional(),
      species: z.string().trim().min(1).max(40).optional(),
      breed: z.string().trim().max(80).nullable().optional(),
      color: z.string().trim().max(80).nullable().optional(),
      weightLbs: z.number().min(0).max(400).nullable().optional(),
      isServiceAnimal: z.boolean().optional(),
      vaccinationExpires: z.iso.date().nullable().optional(),
      notes: z.string().trim().max(1000).nullable().optional(),
    }).parse(req.body);
    res.json({ pet: updatePortalPet(req.portalAuth!.residentId, String(req.params.id), input) });
  } catch (error) { next(error); }
});

router.delete("/portal/pets/:id", authenticatePortal, (req: PortalAuthenticatedRequest, res, next) => {
  try {
    deletePortalPet(req.portalAuth!.residentId, String(req.params.id));
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get("/portal/messages", authenticatePortal, (req: PortalAuthenticatedRequest, res) => {
  res.json({ messages: listPortalMessages(req.portalAuth!.residentId), unreadCount: countPortalUnreadMessages(req.portalAuth!.residentId) });
});

router.post("/portal/messages/:id/read", authenticatePortal, (req: PortalAuthenticatedRequest, res, next) => {
  try {
    res.json({ message: markPortalMessageRead(req.portalAuth!.residentId, String(req.params.id)) });
  } catch (error) { next(error); }
});

router.get("/portal/lease/documents", authenticatePortal, (req: PortalAuthenticatedRequest, res) => {
  res.json({ documents: listPortalLeaseDocuments(req.portalAuth!.residentId) });
});

router.get("/portal/documents/submissions", authenticatePortal, (req: PortalAuthenticatedRequest, res) => {
  res.json({ submissions: listPortalHouseholdSubmissions(req.portalAuth!.residentId) });
});

router.post("/portal/documents/submissions", authenticatePortal, (req: PortalAuthenticatedRequest, res, next) => {
  try {
    const input = z.object({
      originalName: z.string().trim().min(1).max(240),
      mimeType: z.string().min(1),
      dataBase64: z.string().min(1),
      caption: z.string().trim().max(500).nullable().optional(),
    }).parse(req.body);
    res.status(201).json({
      submission: createPortalHouseholdSubmission({
        residentId: req.portalAuth!.residentId,
        ...input,
      }),
    });
  } catch (error) { next(error); }
});

router.get("/portal/maintenance/:id/attachments", authenticatePortal, (req: PortalAuthenticatedRequest, res, next) => {
  try {
    res.json({ attachments: listPortalMaintenanceAttachments(req.portalAuth!.residentId, String(req.params.id)) });
  } catch (error) { next(error); }
});

router.post("/portal/maintenance/:id/attachments", authenticatePortal, (req: PortalAuthenticatedRequest, res, next) => {
  try {
    const input = z.object({
      originalName: z.string().trim().min(1).max(240),
      mimeType: z.string().min(1),
      dataBase64: z.string().min(1),
      caption: z.string().trim().max(500).nullable().optional(),
    }).parse(req.body);
    res.status(201).json({
      attachment: createPortalMaintenanceAttachment({
        residentId: req.portalAuth!.residentId,
        workOrderId: String(req.params.id),
        ...input,
      }),
    });
  } catch (error) { next(error); }
});

router.get("/portal/attachments/:id/content", authenticatePortal, (req: PortalAuthenticatedRequest, res, next) => {
  try {
    const content = getPortalAttachmentContent(req.portalAuth!.residentId, String(req.params.id));
    res.type(content.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${content.originalName.replaceAll('"', "")}"`);
    res.sendFile(content.filePath);
  } catch (error) { next(error); }
});

export default router;
