import { describe, expect, it } from "vitest";
import { getDiscoveryPolicy } from "@/lib/discovery/policy";
import { ADVENTURE_MOODS } from "@/lib/adventure/setup-session";

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

  // Trail viability requires at least three discovery categories. The first
  // live audit returned only restaurants and markets for culinary, so a
  // culinary adventure could never have been generated.
  it("gives every mood enough categories to satisfy the trail-diversity rule", () => {
    for (const mood of ADVENTURE_MOODS) {
      expect(
        getDiscoveryPolicy(60, mood).categories.length,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("reaches beyond food for a culinary adventure", () => {
    expect(getDiscoveryPolicy(60, "culinary").categories).toEqual(
      expect.arrayContaining(["culinary", "market", "heritage"]),
    );
  });

  // Strange is historical or culinary substance that is off the beaten track,
  // not a category Google publishes.
  it("builds strange from the historical and culinary pool, and prefers obscurity", () => {
    const policy = getDiscoveryPolicy(60, "strange");

    expect(policy.preferObscure).toBe(true);
    expect(policy.categories).toEqual(
      expect.arrayContaining(["heritage", "culinary"]),
    );
    expect(policy.categories).not.toContain("viewpoint");
  });

  it("does not chase obscurity for the other moods", () => {
    for (const mood of ["historical", "culinary", "beautiful"] as const) {
      expect(getDiscoveryPolicy(60, mood).preferObscure).toBe(false);
    }
  });

  // One search around Fontainhas returned thirteen cafes, six shops and a
  // single chapel, because whichever kind of place sits nearest takes the whole
  // twenty-result list.
  it("searches the history and cuisine sides of strange separately", () => {
    const groups = getDiscoveryPolicy(60, "strange").searchGroups;

    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual(expect.arrayContaining(["heritage"]));
    expect(groups[1]).toEqual(expect.arrayContaining(["culinary"]));
    expect(groups.flat()).not.toContain("viewpoint");
  });

  it("uses a single search for moods that do not span two kinds of place", () => {
    for (const mood of ["historical", "culinary", "beautiful"] as const) {
      const policy = getDiscoveryPolicy(60, mood);

      expect(policy.searchGroups).toHaveLength(1);
      expect(policy.searchGroups[0]).toEqual(policy.categories);
    }
  });

  it("ranks an obscurity-seeking mood by distance so the pool is not popularity-led", () => {
    expect(getDiscoveryPolicy(60, "strange").rankBy).toBe("distance");
    expect(getDiscoveryPolicy(60, "historical").rankBy).toBe("popularity");
  });
});
