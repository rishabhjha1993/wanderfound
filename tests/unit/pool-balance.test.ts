import { describe, expect, it } from "vitest";
import { shapeCandidatePool } from "@/lib/discovery/pool-balance";
import { MOCK_PLACE_CANDIDATES } from "@/lib/providers/mock/fixtures";
import type { PlaceCandidate, PlaceCategory } from "@/lib/providers/domain";

const ORIGIN = { latitude: 15.4989, longitude: 73.8317 };

function place(
  id: string,
  category: PlaceCategory,
  overrides: Partial<PlaceCandidate> = {},
): PlaceCandidate {
  return {
    ...MOCK_PLACE_CANDIDATES[0]!,
    providerPlaceId: id,
    name: id,
    primaryCategory: category,
    categories: [category],
    landmarkSignal: false,
    reviewCount: 100,
    ...overrides,
  };
}

/** The shape of the pool that made a "historical" adventure feel generic. */
const WORSHIP_HEAVY = [
  place("cathedral", "religious", { reviewCount: 28059, landmarkSignal: true }),
  place("temple-a", "religious", { reviewCount: 40 }),
  place("temple-b", "religious", { reviewCount: 31 }),
  place("temple-c", "religious", { reviewCount: 22 }),
  place("chapel-a", "religious", { reviewCount: 480 }),
  place("chapel-b", "religious", { reviewCount: 18 }),
  place("museum", "museum", { reviewCount: 854, landmarkSignal: true }),
  place("steps", "heritage", { reviewCount: 210, landmarkSignal: true }),
];

describe("candidate pool shaping", () => {
  it("stops one dense category from taking the whole pool", () => {
    const shaped = shapeCandidatePool(WORSHIP_HEAVY, ORIGIN, {
      maxPerCategory: 3,
      prefer: "significant",
    });

    const worship = shaped.filter(
      (candidate) => candidate.primaryCategory === "religious",
    );

    expect(worship).toHaveLength(3);
    expect(shaped.length).toBeLessThan(WORSHIP_HEAVY.length);
  });

  it("keeps the places that matter when a category is capped", () => {
    const shaped = shapeCandidatePool(WORSHIP_HEAVY, ORIGIN, {
      maxPerCategory: 3,
      prefer: "significant",
    });
    const kept = shaped.map((candidate) => candidate.providerPlaceId);

    expect(kept).toContain("cathedral");
    expect(kept).toContain("chapel-a");
    // The ordinary neighbourhood shrines are what should go.
    expect(kept).not.toContain("temple-c");
    expect(kept).not.toContain("chapel-b");
  });

  it("never drops a category that was under the cap", () => {
    const shaped = shapeCandidatePool(WORSHIP_HEAVY, ORIGIN, {
      maxPerCategory: 3,
      prefer: "significant",
    });
    const kept = shaped.map((candidate) => candidate.providerPlaceId);

    expect(kept).toContain("museum");
    expect(kept).toContain("steps");
  });

  it("prefers a landmark over a merely popular place of the same kind", () => {
    const pool = [
      place("busy", "religious", { reviewCount: 9000, landmarkSignal: false }),
      place("landmark", "religious", {
        reviewCount: 300,
        landmarkSignal: true,
      }),
    ];

    const shaped = shapeCandidatePool(pool, ORIGIN, {
      maxPerCategory: 1,
      prefer: "significant",
    });

    expect(shaped.map((candidate) => candidate.providerPlaceId)).toEqual([
      "landmark",
    ]);
  });

  it("keeps the overlooked place when the mood wants obscurity", () => {
    const shaped = shapeCandidatePool(WORSHIP_HEAVY, ORIGIN, {
      maxPerCategory: 2,
      prefer: "obscure",
    });
    const kept = shaped.map((candidate) => candidate.providerPlaceId);

    expect(kept).toContain("chapel-b");
    expect(kept).not.toContain("cathedral");
  });

  it("preserves provider ordering among survivors", () => {
    const shaped = shapeCandidatePool(WORSHIP_HEAVY, ORIGIN, {
      maxPerCategory: 3,
      prefer: "significant",
    });
    const positions = shaped.map((candidate) =>
      WORSHIP_HEAVY.findIndex(
        (original) => original.providerPlaceId === candidate.providerPlaceId,
      ),
    );

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("returns the same pool for the same input", () => {
    const shape = { maxPerCategory: 3, prefer: "significant" as const };

    expect(shapeCandidatePool(WORSHIP_HEAVY, ORIGIN, shape)).toEqual(
      shapeCandidatePool(WORSHIP_HEAVY, ORIGIN, shape),
    );
  });

  it("leaves an already balanced pool untouched", () => {
    const balanced = [
      place("a", "heritage"),
      place("b", "museum"),
      place("c", "garden"),
    ];

    expect(
      shapeCandidatePool(balanced, ORIGIN, {
        maxPerCategory: 3,
        prefer: "significant",
      }),
    ).toEqual(balanced);
  });
});
