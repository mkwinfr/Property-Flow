import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { PortalSessionUser } from "../../shared/contracts.js";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { unauthorized } from "../lib/errors.js";

const COOKIE_NAME = "ps_portal_session";
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export interface PortalAuthenticatedRequest extends Request {
  portalAuth?: PortalSessionUser;
  portalSessionToken?: string;
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

export function loadPortalSessionUser(accountId: string): PortalSessionUser | null {
  const account = db.prepare(
    `SELECT ra.id AS accountId, ra.resident_id AS residentId, ra.email, r.first_name, r.last_name, r.property_id AS propertyId,
            p.name AS propertyName
     FROM resident_accounts ra
     JOIN residents r ON r.id = ra.resident_id
     JOIN properties p ON p.id = r.property_id
     WHERE ra.id = ? AND ra.status = 'active' AND r.status = 'active'`,
  ).get(accountId) as {
    accountId: string; residentId: string; email: string; first_name: string; last_name: string; propertyId: string; propertyName: string;
  } | undefined;
  if (!account) return null;
  const lease = db.prepare(
    `SELECT l.status, u.unit_number AS unitNumber
     FROM leases l JOIN units u ON u.id = l.unit_id
     JOIN household_members hm ON hm.household_id = l.household_id
     WHERE hm.resident_id = ? AND l.status IN ('active', 'notice')
     ORDER BY l.start_date DESC LIMIT 1`,
  ).get(account.residentId) as { status: string; unitNumber: string } | undefined;
  return {
    accountId: account.accountId,
    residentId: account.residentId,
    propertyId: account.propertyId,
    propertyName: account.propertyName,
    name: `${account.first_name} ${account.last_name}`,
    email: account.email,
    unitNumber: lease?.unitNumber ?? null,
    leaseStatus: lease?.status ?? null,
  };
}

export function createPortalSession(accountId: string): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + config.sessionDays * 86_400_000).toISOString();
  db.prepare(
    "INSERT INTO resident_sessions (id, account_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), accountId, hashToken(token), expiresAt, new Date().toISOString());
  return { token, expiresAt };
}

export function setPortalSessionCookie(res: Response, token: string, expiresAt: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export function clearPortalSession(req: PortalAuthenticatedRequest, res: Response): void {
  if (req.portalSessionToken) {
    db.prepare("DELETE FROM resident_sessions WHERE token_hash = ?").run(hashToken(req.portalSessionToken));
  }
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
    path: "/",
  });
}

export const authenticatePortal: RequestHandler = (req: PortalAuthenticatedRequest, _res, next) => {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return next(unauthorized());
  const session = db.prepare(
    `SELECT rs.account_id AS accountId FROM resident_sessions rs
     WHERE rs.token_hash = ? AND rs.expires_at > ?`,
  ).get(hashToken(token), new Date().toISOString()) as { accountId: string } | undefined;
  if (!session) return next(unauthorized());
  const user = loadPortalSessionUser(session.accountId);
  if (!user) return next(unauthorized());
  req.portalAuth = user;
  req.portalSessionToken = token;
  next();
};

export function requirePortalModule(_req: PortalAuthenticatedRequest, _res: Response, next: NextFunction): void {
  next();
}
