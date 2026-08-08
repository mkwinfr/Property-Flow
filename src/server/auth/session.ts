import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { SessionUser } from "../../shared/contracts.js";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { forbidden, unauthorized } from "../lib/errors.js";

const COOKIE_NAME = "ps_session";

export interface AuthenticatedRequest extends Request {
  auth?: SessionUser;
  sessionToken?: string;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
let lastSessionCleanupAt = 0;

function cleanupExpiredSessions(): void {
  const now = Date.now();
  if (now - lastSessionCleanupAt < 60 * 60_000) return;
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date(now).toISOString());
  lastSessionCleanupAt = now;
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

export function loadSessionUser(userId: string): SessionUser | null {
  const user = db
    .prepare("SELECT id, name, email, status FROM users WHERE id = ?")
    .get(userId) as { id: string; name: string; email: string; status: string } | undefined;
  if (!user || user.status !== "active") return null;

  const assignments = db
    .prepare(
      `SELECT r.name AS role_name, ra.property_id
       FROM role_assignments ra JOIN roles r ON r.id = ra.role_id
       WHERE ra.user_id = ?`,
    )
    .all(userId) as Array<{ role_name: string; property_id: string | null }>;
  const permissions = db
    .prepare(
      `SELECT DISTINCT rp.permission_key
       FROM role_assignments ra
       JOIN role_permissions rp ON rp.role_id = ra.role_id
       WHERE ra.user_id = ?`,
    )
    .all(userId) as Array<{ permission_key: string }>;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    permissions: permissions.map((row) => row.permission_key).sort(),
    propertyIds: assignments.flatMap((row) => (row.property_id ? [row.property_id] : [])),
    roles: [...new Set(assignments.map((row) => row.role_name))],
  };
}

export function createSession(userId: string): { token: string; expiresAt: string } {
  cleanupExpiredSessions();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + config.sessionDays * 86_400_000).toISOString();
  db.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), userId, hashToken(token), expiresAt, new Date().toISOString());
  return { token, expiresAt };
}

export function setSessionCookie(res: Response, token: string, expiresAt: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export function clearSession(req: AuthenticatedRequest, res: Response): void {
  if (req.sessionToken) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(req.sessionToken));
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
    path: "/",
  });
}

export const authenticate: RequestHandler = (req: AuthenticatedRequest, _res, next) => {
  cleanupExpiredSessions();
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return next(unauthorized());
  const session = db
    .prepare(
      `SELECT user_id FROM sessions
       WHERE token_hash = ? AND expires_at > ?`,
    )
    .get(hashToken(token), new Date().toISOString()) as { user_id: string } | undefined;
  if (!session) return next(unauthorized("Your session has expired"));
  const user = loadSessionUser(session.user_id);
  if (!user) return next(unauthorized("Your account is unavailable"));
  req.auth = user;
  req.sessionToken = token;
  next();
};

export function userCan(userId: string, permission: string, propertyId?: string | null): boolean {
  const row = db
    .prepare(
      `SELECT 1
       FROM role_assignments ra
       JOIN role_permissions rp ON rp.role_id = ra.role_id
       WHERE ra.user_id = ?
         AND rp.permission_key = ?
         AND (ra.property_id IS NULL OR ? IS NULL OR ra.property_id = ?)
       LIMIT 1`,
    )
    .get(userId, permission, propertyId ?? null, propertyId ?? null);
  return Boolean(row);
}

export function userCanGlobally(userId: string, permission: string): boolean {
  const row = db
    .prepare(
      `SELECT 1
       FROM role_assignments ra
       JOIN role_permissions rp ON rp.role_id = ra.role_id
       WHERE ra.user_id = ?
         AND rp.permission_key = ?
         AND ra.property_id IS NULL
       LIMIT 1`,
    )
    .get(userId, permission);
  return Boolean(row);
}

export function requireGlobalPermission(permission: string): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (!userCanGlobally(req.auth.id, permission)) return next(forbidden());
    next();
  };
}

export function requirePermission(
  permission: string,
  propertyIdFromRequest?: (req: Request) => string | null | undefined,
): RequestHandler {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    const propertyId = propertyIdFromRequest?.(req);
    if (!userCan(req.auth.id, permission, propertyId)) return next(forbidden());
    next();
  };
}
