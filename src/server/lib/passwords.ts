import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const blockedPasswords = new Set([
  "password",
  "password123",
  "propertysuite",
  "propertysuite123",
  "changeme",
]);

export function passwordValidationMessage(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be no more than ${PASSWORD_MAX_LENGTH} characters`;
  }
  if (blockedPasswords.has(password.trim().toLowerCase())) {
    return "Choose a password that is not a known Property Suite or common default";
  }
  return null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
