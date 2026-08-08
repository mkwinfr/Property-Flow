import { createHash, randomBytes } from "node:crypto";
import { config } from "../config.js";
import { badRequest, unauthorized } from "../lib/errors.js";

const SSO_STATE_COOKIE = "ps_sso_state";

export function ssoStateCookieName() {
  return SSO_STATE_COOKIE;
}

export function buildSsoLoginRedirect(): { url: string; state: string } {
  if (!config.ssoEnabled || !config.ssoIssuer || !config.ssoClientId || !config.ssoRedirectUri) {
    throw badRequest("SSO is not configured");
  }
  const state = randomBytes(24).toString("hex");
  const params = new URLSearchParams({
    client_id: config.ssoClientId,
    redirect_uri: config.ssoRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  const issuer = config.ssoIssuer.replace(/\/$/, "");
  return { url: `${issuer}/oauth2/authorize?${params.toString()}`, state };
}

export async function resolveSsoUser(code: string): Promise<{ email: string; name: string }> {
  if (!config.ssoEnabled || !config.ssoIssuer || !config.ssoClientId || !config.ssoClientSecret || !config.ssoRedirectUri) {
    throw badRequest("SSO is not configured");
  }
  const issuer = config.ssoIssuer.replace(/\/$/, "");
  const tokenResponse = await fetch(`${issuer}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.ssoRedirectUri,
      client_id: config.ssoClientId,
      client_secret: config.ssoClientSecret,
    }),
  });
  if (!tokenResponse.ok) throw unauthorized("SSO token exchange failed");
  const tokenPayload = await tokenResponse.json() as { access_token?: string };
  if (!tokenPayload.access_token) throw unauthorized("SSO token missing");

  const userInfoResponse = await fetch(`${issuer}/oauth2/userinfo`, {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
  });
  if (!userInfoResponse.ok) throw unauthorized("SSO user info request failed");
  const profile = await userInfoResponse.json() as { email?: string; name?: string; preferred_username?: string };
  const email = profile.email?.trim().toLowerCase();
  if (!email) throw unauthorized("SSO account is missing an email address");
  return { email, name: profile.name?.trim() || profile.preferred_username?.trim() || email };
}

export function hashSsoState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}
