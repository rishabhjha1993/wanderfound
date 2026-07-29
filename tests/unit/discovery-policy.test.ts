import { describe, expect, it } from "vitest";
import { getDiscoveryPolicy } from "@/lib/discovery/policy";

describe("discovery policy", () => {
  it("keeps a 30-minute adventure compact", () => {
    expect(getDiscoveryPolicy(30, "historical")).toMatchObject({
      radiusMeters: 800,
      candidateLimit: 20,
      shortlistLimit: 4,
      categories: expect.arrayContaining(["heritage", "museum"]),
    });
  });

  it("gives a 60-minute adventure a wider search without a city boundary", () => {
    expect(getDiscoveryPolicy(60, "beautiful")).toMatchObject({
      radiusMeters: 1_500,
      candidateLimit: 20,
      shortlistLimit: 6,
      categories: expect.arrayContaining(["garden", "viewpoint", "waterfront"]),
    });
  });
});
