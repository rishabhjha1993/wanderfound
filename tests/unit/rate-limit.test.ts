import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";

function createLimiter(limit: number, windowMs: number) {
  let clock = 0;
  const limiter = new FixedWindowRateLimiter({
    limit,
    windowMs,
    now: () => clock,
  });

  return {
    limiter,
    advance(ms: number) {
      clock += ms;
    },
  };
}

describe("fixed window rate limiter", () => {
  it("allows requests up to the limit", () => {
    const { limiter } = createLimiter(3, 60_000);

    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(true);

    const third = limiter.check("user-1");

    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("blocks the request after the limit and reports a retry delay", () => {
    const { limiter, advance } = createLimiter(2, 60_000);

    limiter.check("user-1");
    limiter.check("user-1");
    advance(15_000);

    const blocked = limiter.check("user-1");

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBe(45);
  });

  it("never reports a retry delay below one second", () => {
    const { limiter, advance } = createLimiter(1, 60_000);

    limiter.check("user-1");
    advance(59_950);

    expect(limiter.check("user-1").retryAfterSeconds).toBe(1);
  });

  it("starts a fresh window once the previous one expires", () => {
    const { limiter, advance } = createLimiter(1, 60_000);

    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(false);

    advance(60_000);

    expect(limiter.check("user-1").allowed).toBe(true);
  });

  it("counts each identity separately", () => {
    const { limiter } = createLimiter(1, 60_000);

    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-2").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(false);
  });

  it("does not retain windows for identities that stopped calling", () => {
    const { limiter, advance } = createLimiter(5, 60_000);

    for (let index = 0; index < 50; index += 1) {
      limiter.check(`user-${index}`);
    }

    advance(60_000);
    limiter.check("user-0");

    const windows = Reflect.get(limiter, "windows") as Map<string, unknown>;

    expect(windows.size).toBe(1);
  });
});
