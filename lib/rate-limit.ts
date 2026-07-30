export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Window = {
  count: number;
  resetAt: number;
};

/**
 * Fixed-window limiter for routes that spend provider quota.
 *
 * State is per server instance, so a horizontally scaled deployment enforces
 * the limit per instance rather than globally. That is deliberate for V0: it
 * removes the "one signed-in client drains the Places and AI budget in a loop"
 * failure without adding a datastore dependency to the request path. Move this
 * to a shared store before the paid launch, when the same reasoning applies to
 * payment and verification routes.
 */
export class FixedWindowRateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly windows = new Map<string, Window>();

  constructor(options: {
    limit: number;
    windowMs: number;
    now?: () => number;
  }) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? (() => Date.now());
  }

  check(key: string): RateLimitDecision {
    const now = this.now();
    this.pruneExpired(now);

    const existing = this.windows.get(key);

    if (!existing || existing.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        remaining: this.limit - 1,
        retryAfterSeconds: 0,
      };
    }

    if (existing.count >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.resetAt - now) / 1_000),
        ),
      };
    }

    existing.count += 1;

    return {
      allowed: true,
      remaining: this.limit - existing.count,
      retryAfterSeconds: 0,
    };
  }

  private pruneExpired(now: number) {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) {
        this.windows.delete(key);
      }
    }
  }
}
