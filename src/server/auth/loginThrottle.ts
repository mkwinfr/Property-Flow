interface AttemptState {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
}

export class LoginThrottle {
  private readonly attempts = new Map<string, AttemptState>();

  constructor(
    private readonly options: {
      maxFailures: number;
      windowMs: number;
      blockMs: number;
      now?: () => number;
    } = { maxFailures: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 },
  ) {}

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  retryAfterSeconds(key: string): number {
    const state = this.attempts.get(key);
    if (!state) return 0;
    const now = this.now();
    if (state.blockedUntil > now) return Math.max(1, Math.ceil((state.blockedUntil - now) / 1000));
    if (now - state.windowStartedAt >= this.options.windowMs) this.attempts.delete(key);
    return 0;
  }

  recordFailure(key: string): void {
    const now = this.now();
    const current = this.attempts.get(key);
    const state = !current || now - current.windowStartedAt >= this.options.windowMs
      ? { failures: 0, windowStartedAt: now, blockedUntil: 0 }
      : current;
    state.failures += 1;
    if (state.failures >= this.options.maxFailures) state.blockedUntil = now + this.options.blockMs;
    this.attempts.set(key, state);
    if (this.attempts.size > 10_000) this.cleanup();
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  cleanup(): void {
    const now = this.now();
    for (const [key, state] of this.attempts) {
      if (state.blockedUntil <= now && now - state.windowStartedAt >= this.options.windowMs) {
        this.attempts.delete(key);
      }
    }
  }
}
