import { describe, expect, it } from "vitest";
import { LoginThrottle } from "./loginThrottle.js";

describe("login throttling", () => {
  it("blocks a login key after repeated failures and resets after success", () => {
    let now = 1_000;
    const throttle = new LoginThrottle({
      maxFailures: 3,
      windowMs: 60_000,
      blockMs: 120_000,
      now: () => now,
    });
    throttle.recordFailure("client|user");
    throttle.recordFailure("client|user");
    expect(throttle.retryAfterSeconds("client|user")).toBe(0);
    throttle.recordFailure("client|user");
    expect(throttle.retryAfterSeconds("client|user")).toBe(120);
    throttle.reset("client|user");
    expect(throttle.retryAfterSeconds("client|user")).toBe(0);
    now += 180_000;
  });
});
