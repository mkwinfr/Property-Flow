import { Router } from "express";
import { z } from "zod";
import { authenticate, requireGlobalPermission, type AuthenticatedRequest } from "../auth/session.js";
import {
  createPlatformUser,
  getPlatformHealth,
  listOrganizations,
  listPlatformUsers,
  listRoles,
  updateUserRoleAssignment,
} from "./service.js";

const router = Router();
router.use(authenticate);

router.get("/platform/health", requireGlobalPermission("platform:manage"), (_req, res) => {
  res.json({ health: getPlatformHealth() });
});

router.get("/platform/organizations", requireGlobalPermission("platform:manage"), (_req, res) => {
  res.json({ organizations: listOrganizations() });
});

router.get("/platform/users", requireGlobalPermission("platform:manage"), (_req, res) => {
  res.json({ users: listPlatformUsers(), roles: listRoles() });
});

router.post("/platform/users", requireGlobalPermission("platform:manage"), (req, res, next) => {
  try {
    const input = z.object({
      name: z.string().trim().min(2).max(120),
      email: z.email(),
      password: z.string().min(8).max(200),
      roleId: z.string().min(1),
      propertyId: z.string().nullable().optional(),
    }).parse(req.body);
    res.status(201).json({ user: createPlatformUser(input) });
  } catch (error) { next(error); }
});

router.put("/platform/users/:userId/role", requireGlobalPermission("platform:manage"), (req, res, next) => {
  try {
    const body = z.object({ roleId: z.string().min(1), propertyId: z.string().nullable().optional() }).parse(req.body);
    updateUserRoleAssignment(String(req.params.userId), body.roleId, body.propertyId ?? null);
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
