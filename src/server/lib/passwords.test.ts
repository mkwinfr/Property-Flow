import { describe, expect, it } from "vitest";
import { hashPassword, passwordValidationMessage, verifyPassword } from "./passwords.js";

describe("password storage", () => {
  it("uses a unique salt and verifies without exposing the password", () => {
    const first = hashPassword("correct horse battery staple");
    const second = hashPassword("correct horse battery staple");

    expect(first).not.toBe(second);
    expect(first).not.toContain("correct horse");
    expect(verifyPassword("correct horse battery staple", first)).toBe(true);
    expect(verifyPassword("wrong", first)).toBe(false);
  });

  it("rejects short and known default passwords", () => {
    expect(passwordValidationMessage("short")).toContain("at least 12");
    expect(passwordValidationMessage("propertysuite")).toContain("common default");
    expect(passwordValidationMessage("a long private passphrase")).toBeNull();
  });
});
