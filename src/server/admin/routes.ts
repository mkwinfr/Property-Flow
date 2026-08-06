import { Router } from "express";
import { z } from "zod";
import { authenticate, requireGlobalPermission, requirePermission, type AuthenticatedRequest } from "../auth/session.js";
import { db } from "../db/index.js";
import {
  getAdminPropertyStructure,
  listAdminProperties,
  onboardProperty,
  updateAdminUnit,
} from "./propertyService.js";
import {
  archivePropertyScopeTemplate,
  deleteScopeTemplateDraft,
  duplicateScopeTemplate,
  listScopeTemplateDrafts,
  listScopeTemplateVersions,
  listTemplateFloorPlans,
  listPropertyScopeTemplates,
  publishScopeTemplateDraft,
  publishPropertyScopeTemplate,
  reactivatePropertyScopeTemplate,
  restoreScopeTemplateVersion,
  saveScopeTemplateDraft,
} from "./templateService.js";

const upperCode = z.string().trim().transform((value) => value.toUpperCase()).pipe(
  z.string().min(2).max(12).regex(/^[A-Z0-9-]+$/, "Use letters, numbers, or hyphens"),
);
const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: upperCode,
  addressLine1: z.string().trim().min(3).max(160),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().transform((value) => value.toUpperCase()).pipe(z.string().length(2)),
  postalCode: z.string().trim().min(3).max(12),
  timezone: z.string().trim().min(3).max(80),
  buildings: z.array(z.object({ name: z.string().trim().min(1).max(100) })).min(1).max(100),
  floorPlans: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    bedrooms: z.number().int().min(0).max(20),
    bathrooms: z.number().min(0).max(20).multipleOf(0.5),
    squareFeet: z.number().int().min(100).max(20_000),
  })).min(1).max(100),
  units: z.array(z.object({
    unitNumber: z.string().trim().min(1).max(40),
    buildingName: z.string().trim().min(1).max(100),
    floorPlanName: z.string().trim().min(1).max(100),
    floor: z.number().int().min(-10).max(250).nullable(),
    occupancyStatus: z.enum(["occupied", "vacant", "notice", "down"]),
  })).max(5_000),
});
const unitUpdateSchema = z.object({
  floorPlanId: z.string().min(1),
  floor: z.number().int().min(-10).max(250).nullable(),
  occupancyStatus: z.enum(["occupied", "vacant", "notice", "down"]),
  notes: z.string().trim().max(2_000).nullable(),
  resolveReview: z.boolean().optional(),
});
const scopeItemSchema = z.object({
  itemKey: z.string().trim().max(160).optional(),
  area: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(120),
  title: z.string().trim().min(2).max(240),
  required: z.boolean().default(true),
  photoRecommended: z.boolean().default(false),
});
const scopeTemplateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1_000).default(""),
  bedrooms: z.number().int().min(0).max(20).nullable(),
  bathrooms: z.number().min(0).max(20).multipleOf(0.5).nullable(),
  floorPlanIds: z.array(z.string().min(1)).max(200).default([]),
  items: z.array(scopeItemSchema).min(1).max(500),
});

const router = Router();
router.use(authenticate);
const propertyId = (req: any) => String(req.params.propertyId);

router.get("/properties/:propertyId/templates", requirePermission("templates:view", propertyId), (req, res, next) => {
  try { res.json({ templates: listPropertyScopeTemplates(String(req.params.propertyId), db), drafts: listScopeTemplateDrafts(String(req.params.propertyId), db), floorPlans: listTemplateFloorPlans(String(req.params.propertyId), db) }); } catch (error) { next(error); }
});
router.post("/properties/:propertyId/template-drafts", requirePermission("templates:manage", propertyId), (req: AuthenticatedRequest,res,next)=>{try{res.status(201).json({draft:saveScopeTemplateDraft(String(req.params.propertyId),null,req.body.templateId??null,req.auth!.id,scopeTemplateSchema.parse(req.body),db)});}catch(error){next(error);}});
router.put("/properties/:propertyId/template-drafts/:draftId", requirePermission("templates:manage", propertyId), (req: AuthenticatedRequest,res,next)=>{try{res.json({draft:saveScopeTemplateDraft(String(req.params.propertyId),String(req.params.draftId),req.body.templateId??null,req.auth!.id,scopeTemplateSchema.parse(req.body),db)});}catch(error){next(error);}});
router.delete("/properties/:propertyId/template-drafts/:draftId", requirePermission("templates:manage", propertyId), (req,res,next)=>{try{deleteScopeTemplateDraft(String(req.params.propertyId),String(req.params.draftId),db);res.status(204).end();}catch(error){next(error);}});
router.post("/properties/:propertyId/template-drafts/:draftId/publish", requirePermission("templates:manage", propertyId), (req:AuthenticatedRequest,res,next)=>{try{res.json({template:publishScopeTemplateDraft(String(req.params.propertyId),String(req.params.draftId),req.auth!.id,db)});}catch(error){next(error);}});
router.get("/properties/:propertyId/templates/:templateId/versions", requirePermission("templates:view", propertyId), (req,res,next)=>{try{res.json({versions:listScopeTemplateVersions(String(req.params.propertyId),String(req.params.templateId),db)});}catch(error){next(error);}});
router.post("/properties/:propertyId/templates/:templateId/versions/:versionId/restore", requirePermission("templates:manage", propertyId), (req:AuthenticatedRequest,res,next)=>{try{res.json({draft:restoreScopeTemplateVersion(String(req.params.propertyId),String(req.params.templateId),String(req.params.versionId),req.auth!.id,db)});}catch(error){next(error);}});
router.post("/properties/:propertyId/templates/:templateId/duplicate", requirePermission("templates:manage", propertyId), (req:AuthenticatedRequest,res,next)=>{try{res.status(201).json({draft:duplicateScopeTemplate(String(req.params.propertyId),String(req.params.templateId),req.auth!.id,db)});}catch(error){next(error);}});
router.post("/properties/:propertyId/templates/:templateId/reactivate", requirePermission("templates:manage", propertyId), (req:AuthenticatedRequest,res,next)=>{try{res.json({template:reactivatePropertyScopeTemplate(String(req.params.propertyId),String(req.params.templateId),req.auth!.id,db)});}catch(error){next(error);}});
router.post("/properties/:propertyId/templates/:templateId/archive", requirePermission("templates:manage", propertyId), (req:AuthenticatedRequest,res,next)=>{try{res.json({template:archivePropertyScopeTemplate(String(req.params.propertyId),String(req.params.templateId),req.auth!.id,db)});}catch(error){next(error);}});

router.use(requireGlobalPermission("properties:manage"));

router.get("/properties", (_req, res) => {
  res.json({ properties: listAdminProperties(db) });
});

router.get("/properties/:propertyId/structure", (req, res, next) => {
  try {
    res.json(getAdminPropertyStructure(String(req.params.propertyId), db));
  } catch (error) {
    next(error);
  }
});

router.post("/properties/:propertyId/templates", (req: AuthenticatedRequest, res, next) => {
  try {
    const template = publishPropertyScopeTemplate(
      String(req.params.propertyId), null, req.auth!.id, scopeTemplateSchema.parse(req.body), db,
    );
    res.status(201).json({ template });
  } catch (error) {
    next(error);
  }
});

router.put("/properties/:propertyId/templates/:templateId", (req: AuthenticatedRequest, res, next) => {
  try {
    res.json({
      template: publishPropertyScopeTemplate(
        String(req.params.propertyId), String(req.params.templateId), req.auth!.id,
        scopeTemplateSchema.parse(req.body), db,
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/properties/:propertyId/templates/:templateId/archive", (req: AuthenticatedRequest, res, next) => {
  try {
    res.json({
      template: archivePropertyScopeTemplate(
        String(req.params.propertyId), String(req.params.templateId), req.auth!.id, db,
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.put("/properties/:propertyId/units/:unitId", (req: AuthenticatedRequest, res, next) => {
  try {
    const input = unitUpdateSchema.parse(req.body);
    res.json({
      unit: updateAdminUnit(
        String(req.params.propertyId),
        String(req.params.unitId),
        input,
        req.auth!.id,
        db,
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/properties/onboard", (req: AuthenticatedRequest, res, next) => {
  try {
    const input = onboardingSchema.parse(req.body);
    res.status(201).json({ property: onboardProperty(input, req.auth!.id, db) });
  } catch (error) {
    next(error);
  }
});

export default router;
