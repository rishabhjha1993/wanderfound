import { afterEach, describe, expect, it, vi } from "vitest";
import { isDebugToolingEnabled } from "@/lib/discovery/debug-access";

/**
 * `NODE_ENV` is readonly in the app's types, so these tests replace the value
 * through the property descriptor rather than assignment.
 */
function withEnvironment(nodeEnv: string, debugFlag?: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);

  if (debugFlag === undefined) {
    vi.stubEnv("WANDERFOUND_DEBUG_TOOLS", "");
    delete process.env.WANDERFOUND_DEBUG_TOOLS;
    return;
  }

  vi.stubEnv("WANDERFOUND_DEBUG_TOOLS", debugFlag);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("debug tooling gate", () => {
  it("is available in local development", () => {
    withEnvironment("development");

    expect(isDebugToolingEnabled()).toBe(true);
  });

  it("is available under test", () => {
    withEnvironment("test");

    expect(isDebugToolingEnabled()).toBe(true);
  });

  // The default for a deployed environment must be off, so shipping the route
  // cannot expose founder tooling to players.
  it("is unavailable in production by default", () => {
    withEnvironment("production");

    expect(isDebugToolingEnabled()).toBe(false);
  });

  it("can be opted into in production for field diagnosis", () => {
    withEnvironment("production", "true");

    expect(isDebugToolingEnabled()).toBe(true);
  });

  it('treats any value other than "true" as off', () => {
    for (const value of ["1", "yes", "TRUE", "on", ""]) {
      withEnvironment("production", value);

      expect(isDebugToolingEnabled()).toBe(false);
    }
  });
});
