import { describe, expect, it } from "vitest";
import { getDiscoveryPolicy } from "@/lib/discovery/policy";
import { ADVENTURE_MOODS } from "@/lib/adventure/setup-session";

describe("discovery policy", () => {
  it("lets a half day reach across a city, not a neighbourhood", () => {
    expect(getDiscoveryPolicy("half_day", "historical")).toMatchObject({
      reachMeters: 20_000,
      candidateLimit: 20,
      categories: expect.arrayContaining(["heritage", "museum"]),
    });
  });

  it("lets a full day reach further without a city boundary", () => {
    expect(getDiscoveryPolicy("full_day", "beautiful")).toMatchObject({
      reachMeters: 45_000,
      candidateLimit: 20,
      categories: expect.arrayContaining(["garden", "viewpoint", "waterfront"]),
    });
  });

  // Reach is how far the day travels; walking only ever happens inside a
  // pocket. Each individual search stays small because a wide radius returns
  // the same prominent places spread thinner rather than more of them.
  it("keeps each search small however far the day reaches", () => {
    for (const shape of ["half_day", "full_day"] as const) {
      const policy = getDiscoveryPolicy(shape, "historical");

      expect(policy.searchRadiusMeters).toBeLessThanOrEqual(1_500);
      expect(policy.searchRadiusMeters).toBeLessThan(policy.reachMeters);
      // The proximity sweep stays near the player; the region is the
      // knowledge source's job.
      expect(policy.sweep.reachMeters).toBeLessThan(policy.reachMeters);
    }
  });

  it("gives a full day more reach and more centres than a half day", () => {
    const half = getDiscoveryPolicy("half_day", "historical");
    const full = getDiscoveryPolicy("full_day", "historical");

    expect(full.reachMeters).toBeGreaterThan(half.reachMeters);
    expect(full.sweep.rings).toBeGreaterThan(half.sweep.rings);
  });

  // Trail viability requires at least three discovery categories. The first
  // live audit returned only restaurants and markets for culinary, so a
  // culinary adventure could never have been generated.
  it("gives every mood enough categories to satisfy the trail-diversity rule", () => {
    for (const mood of ADVENTURE_MOODS) {
      expect(
        getDiscoveryPolicy("full_day", mood).categories.length,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("reaches beyond food for a culinary adventure", () => {
    expect(getDiscoveryPolicy("full_day", "culinary").categories).toEqual(
      expect.arrayContaining(["culinary", "market", "heritage"]),
    );
  });

  // Strange is historical or culinary substance that is off the beaten track,
  // not a category Google publishes.
  it("builds strange from the historical and culinary pool, and prefers obscurity", () => {
    const policy = getDiscoveryPolicy("full_day", "strange");

    expect(policy.preferObscure).toBe(true);
    expect(policy.categories).toEqual(
      expect.arrayContaining(["heritage", "culinary"]),
    );
    expect(policy.categories).not.toContain("viewpoint");
  });

  it("does not chase obscurity for the other moods", () => {
    for (const mood of ["historical", "culinary", "beautiful"] as const) {
      expect(getDiscoveryPolicy("full_day", mood).preferObscure).toBe(false);
    }
  });

  // One search around Fontainhas returned thirteen cafes, six shops and a
  // single chapel, because whichever kind of place sits nearest takes the whole
  // twenty-result list.
  it("searches the history and cuisine sides of strange separately", () => {
    const groups = getDiscoveryPolicy("full_day", "strange").searchGroups;

    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual(expect.arrayContaining(["heritage"]));
    expect(groups[1]).toEqual(expect.arrayContaining(["culinary"]));
    expect(groups.flat()).not.toContain("viewpoint");
  });

  it("uses a single search for moods that do not span two kinds of place", () => {
    for (const mood of ["culinary", "beautiful"] as const) {
      const policy = getDiscoveryPolicy("full_day", mood);

      expect(policy.searchGroups).toHaveLength(1);
      expect(policy.searchGroups[0]).toEqual(policy.categories);
    }
  });

  // Places of worship are the densest mappable category in most Indian
  // neighbourhoods and took twelve of nineteen "historical" candidates.
  it("gives heritage its own search so worship does not crowd it out", () => {
    const groups = getDiscoveryPolicy("full_day", "historical").searchGroups;

    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual(
      expect.arrayContaining(["heritage", "architecture", "museum"]),
    );
    expect(groups[0]).not.toContain("religious");
    expect(groups[1]).toContain("religious");
  });

  // The cap stops one category dominating; it must not shrink the pool. At
  // three per category it cut a seventy-four place city sweep down to nine,
  // which is not enough to build even two pockets from.
  it("scales the category cap with the day rather than with one search", () => {
    const half = getDiscoveryPolicy("half_day", "historical");
    const full = getDiscoveryPolicy("full_day", "historical");

    expect(half.poolShape.maxPerCategory).toBeGreaterThan(3);
    expect(full.poolShape.maxPerCategory).toBeGreaterThan(
      half.poolShape.maxPerCategory,
    );
  });

  it("caps every mood, whatever end of the range it prefers", () => {
    for (const mood of ADVENTURE_MOODS) {
      expect(
        getDiscoveryPolicy("full_day", mood).poolShape.maxPerCategory,
      ).toBeGreaterThan(0);
    }
  });

  // Historical wants the building that matters; strange wants the one nobody
  // stops at. Without this they collapse into the same adventure.
  it("points each mood at the end of the prominence range it actually wants", () => {
    expect(getDiscoveryPolicy("full_day", "historical").poolShape.prefer).toBe(
      "significant",
    );
    expect(getDiscoveryPolicy("full_day", "strange").poolShape.prefer).toBe(
      "obscure",
    );
  });

  it("ranks an obscurity-seeking mood by distance so the pool is not popularity-led", () => {
    expect(getDiscoveryPolicy("full_day", "strange").rankBy).toBe("distance");
    expect(getDiscoveryPolicy("full_day", "historical").rankBy).toBe(
      "popularity",
    );
  });
});
