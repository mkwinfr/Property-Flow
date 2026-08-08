import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "../db/index.js";
import { badRequest, tooManyRequests, unauthorized } from "../lib/errors.js";
import {
  hashPassword,
  passwordValidationMessage,
  verifyPassword,
} from "../lib/passwords.js";
import {
  authenticate,
  clearSession,
  createSession,
  loadSessionUser,
  readCookie,
  setSessionCookie,
  type AuthenticatedRequest,
} from "./session.js";
import { LoginThrottle } from "./loginThrottle.js";
import { config } from "../config.js";
import { buildSsoLoginRedirect, hashSsoState, resolveSsoUser, ssoStateCookieName } from "./sso.js";

const router = Router();
const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(200) });
const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
});
const loginThrottle = new LoginThrottle();
const fallbackPasswordHash = hashPassword(randomBytes(32).toString("hex"));

function loginKeys(ip: string | undefined, email: string): string[] {
  return [
    `ip|${ip || "unknown"}`,
    `account|${email.trim().toLowerCase()}`,
  ];
}

router.post("/login", (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const throttleKeys = loginKeys(req.ip, input.email);
    const retryAfter = Math.max(...throttleKeys.map((key) => loginThrottle.retryAfterSeconds(key)));
    if (retryAfter > 0) {
      res.setHeader("Retry-After", String(retryAfter));
      throw tooManyRequests("Too many sign-in attempts. Try again later.");
    }
    const user = db
      .prepare("SELECT id, password_hash, status FROM users WHERE email = ? COLLATE NOCASE")
      .get(input.email) as { id: string; password_hash: string; status: string } | undefined;
    const passwordMatches = verifyPassword(input.password, user?.password_hash ?? fallbackPasswordHash);
    if (!user || user.status !== "active" || !passwordMatches) {
      throttleKeys.forEach((key) => loginThrottle.recordFailure(key));
      throw unauthorized("Email or password is incorrect");
    }
    throttleKeys.forEach((key) => loginThrottle.reset(key));
    const session = createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);
    res.json({ user: loadSessionUser(user.id) });
  } catch (error) {
    next(error);
  }
});

router.post("/password", authenticate, (req: AuthenticatedRequest, res, next) => {
  try {
    const input = passwordSchema.parse(req.body);
    const user = db
      .prepare("SELECT id, password_hash FROM users WHERE id = ?")
      .get(req.auth!.id) as { id: string; password_hash: string } | undefined;
    if (!user || !verifyPassword(input.currentPassword, user.password_hash)) {
      throw unauthorized("Current password is incorrect");
    }
    const validationMessage = passwordValidationMessage(input.newPassword);
    if (validationMessage) throw badRequest(validationMessage);
    if (verifyPassword(input.newPassword, user.password_hash)) {
      throw badRequest("New password must be different from the current password");
    }

    db.transaction(() => {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
        hashPassword(input.newPassword),
        new Date().toISOString(),
        user.id,
      );
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
    })();
    clearSession(req, res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/session", authenticate, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.auth });
});

router.get("/sso/config", (_req, res) => {
  res.json({
    sso: {
      enabled: config.ssoEnabled && Boolean(config.ssoIssuer && config.ssoClientId && config.ssoRedirectUri),
      issuer: config.ssoIssuer || null,
      clientId: config.ssoClientId || null,
      loginPath: "/api/auth/sso/login",
    },
  });
});

router.get("/sso/login", (_req, res, next) => {
  try {
    const { url, state } = buildSsoLoginRedirect();
    res.cookie(ssoStateCookieName(), hashSsoState(state), {
      httpOnly: true,
      sameSite: "lax",
      secure: config.nodeEnv === "production",
      maxAge: 10 * 60 * 1000,
      path: "/api/auth/sso",
    });
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

router.get("/sso/callback", async (req, res, next) => {
  try {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    const expected = readCookie(req, ssoStateCookieName());
    res.clearCookie(ssoStateCookieName(), { path: "/api/auth/sso" });
    if (!code || !state || !expected || hashSsoState(state) !== expected) {
      throw unauthorized("SSO sign-in could not be verified");
    }
    const profile = await resolveSsoUser(code);
    const user = db.prepare("SELECT id, status FROM users WHERE email = ? COLLATE NOCASE").get(profile.email) as { id: string; status: string } | undefined;
    if (!user || user.status !== "active") throw unauthorized("No active Property Suite account matches this SSO identity");
    const session = createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);
    res.redirect("/");
  } catch (error) {
    next(error);
  }
});

router.post("/logout", authenticate, (req: AuthenticatedRequest, res) => {
  clearSession(req, res);
  res.status(204).end();
});

export default router;
