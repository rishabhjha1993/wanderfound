import { describe, expect, it } from "vitest";
import { LOCATION_POLICY, SAFETY_POLICY } from "@/lib/policies";

describe("foundation policies", () => {
  it("never enables background tracking", () => {
    expect(LOCATION_POLICY.foregroundOnly).toBe(true);
    expect(LOCATION_POLICY.backgroundTracking).toBe(false);
  });

  it("keeps navigation and emergency escape explicit", () => {
    expect(SAFETY_POLICY.navigationIsNotThePuzzle).toBe(true);
    expect(SAFETY_POLICY.emergencyExitRequired).toBe(true);
  });
});
