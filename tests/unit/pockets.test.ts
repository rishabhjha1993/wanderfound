import { describe, expect, it } from "vitest";
import { findPockets, type PocketPolicy } from "@/lib/discovery/pockets";
import { MOCK_PLACE_CANDIDATES } from "@/lib/providers/mock/fixtures";
import type { PlaceCandidate } from "@/lib/providers/domain";

const POLICY: PocketPolicy = {
  linkMetres: 350,
  minPlaces: 3,
  maxSpanMetres: 1_200,
  minCategories: 2,
};

/** Metres north of a base point, converted to degrees of latitude. */
function northOf(latitude: number, metres: number) {
  return latitude + metres / 111_320;
}

function place(
  id: string,
  latitude: number,
  longitude: number,
  category = "heritage",
): PlaceCandidate {
  return {
    ...MOCK_PLACE_CANDIDATES[0]!,
    providerPlaceId: id,
    name: id,
    primaryCategory: category as PlaceCandidate["primaryCategory"],
    categories: [category as PlaceCandidate["primaryCategory"]],
    coordinates: { latitude, longitude },
    landmarkSignal: true,
    reviewCount: 500,
  };
}

/** Alternates category so a group clears the variety bar. */
function varied(
  id: string,
  latitude: number,
  longitude: number,
  index: number,
) {
  return place(
    id,
    latitude,
    longitude,
    index % 2 === 0 ? "heritage" : "museum",
  );
}

/** Three places 200 m apart, then a gap, then three more. */
function twoNeighbourhoods() {
  const base = 15.4989;
  const longitude = 73.8317;

  return [
    varied("a1", base, longitude, 0),
    varied("a2", northOf(base, 200), longitude, 1),
    varied("a3", northOf(base, 400), longitude, 0),
    varied("b1", northOf(base, 3_000), longitude, 0),
    varied("b2", northOf(base, 3_200), longitude, 1),
    varied("b3", northOf(base, 3_400), longitude, 0),
  ];
}

describe("pocket clustering", () => {
  it("finds separate pockets either side of a gap", () => {
    const pockets = findPockets(twoNeighbourhoods(), POLICY);

    expect(pockets).toHaveLength(2);
    expect(pockets[0]!.places).toHaveLength(3);
    expect(pockets[1]!.places).toHaveLength(3);
  });

  it("keeps each pocket's places together", () => {
    const pockets = findPockets(twoNeighbourhoods(), POLICY);
    const ids = pockets.map((pocket) =>
      pocket.places.map((entry) => entry.providerPlaceId).sort(),
    );

    expect(ids).toContainEqual(["a1", "a2", "a3"]);
    expect(ids).toContainEqual(["b1", "b2", "b3"]);
  });

  it("drops a place with nothing around it, however good", () => {
    const lonely = [...twoNeighbourhoods(), place("orphan", 15.6, 73.9)];
    const pockets = findPockets(lonely, POLICY);
    const pocketed = pockets.flatMap((pocket) =>
      pocket.places.map((entry) => entry.providerPlaceId),
    );

    expect(pocketed).not.toContain("orphan");
  });

  it("refuses to call two places a pocket", () => {
    const base = 15.4989;
    const pair = [
      varied("p1", base, 73.8317, 0),
      varied("p2", northOf(base, 150), 73.8317, 1),
    ];

    expect(findPockets(pair, POLICY)).toEqual([]);
  });

  // Single-link clustering chains, so a dense street could otherwise become one
  // pocket running the length of a city.
  it("splits a chain that grew wider than a walk", () => {
    const base = 15.4989;
    const chain = Array.from({ length: 20 }, (_, index) =>
      varied(`chain-${index}`, northOf(base, index * 300), 73.8317, index),
    );

    const pockets = findPockets(chain, POLICY);

    expect(pockets.length).toBeGreaterThan(1);

    for (const pocket of pockets) {
      expect(pocket.spanMetres).toBeLessThanOrEqual(POLICY.maxSpanMetres);
    }
  });

  it("never loses a place when splitting a chain", () => {
    const base = 15.4989;
    const chain = Array.from({ length: 12 }, (_, index) =>
      varied(`chain-${index}`, northOf(base, index * 300), 73.8317, index),
    );

    const pocketed = findPockets(chain, POLICY).flatMap((pocket) =>
      pocket.places.map((entry) => entry.providerPlaceId),
    );

    expect(new Set(pocketed).size).toBe(pocketed.length);
  });

  it("reports the span and categories of each pocket", () => {
    const base = 15.4989;
    const mixed = [
      place("m1", base, 73.8317, "heritage"),
      place("m2", northOf(base, 200), 73.8317, "museum"),
      place("m3", northOf(base, 400), 73.8317, "heritage"),
    ];

    const [pocket] = findPockets(mixed, POLICY);

    expect(pocket!.spanMetres).toBeGreaterThan(350);
    expect(pocket!.spanMetres).toBeLessThan(450);
    expect(pocket!.categories.sort()).toEqual(["heritage", "museum"]);
  });

  it("counts provider-backed secondary categories when judging variety", () => {
    const base = 15.4989;
    const candidates = [
      place("v1", base, 73.8317, "heritage"),
      place("v2", northOf(base, 200), 73.8317, "heritage"),
      place("v3", northOf(base, 400), 73.8317, "heritage"),
    ].map((candidate, index) => ({
      ...candidate,
      categories:
        index === 1
          ? (["heritage", "architecture"] as PlaceCandidate["categories"])
          : candidate.categories,
    }));

    const [pocket] = findPockets(candidates, POLICY);

    expect(pocket).toBeDefined();
    expect(pocket!.categories.sort()).toEqual(["architecture", "heritage"]);
  });

  it("puts the pocket with the most to find first", () => {
    const base = 15.4989;
    const uneven = [
      ...twoNeighbourhoods(),
      varied("a4", northOf(base, 600), 73.8317, 1),
      varied("a5", northOf(base, 800), 73.8317, 0),
    ];

    const pockets = findPockets(uneven, POLICY);

    expect(pockets[0]!.places.length).toBeGreaterThanOrEqual(
      pockets[1]!.places.length,
    );
  });

  it("gives the same pockets the same ids across runs", () => {
    const first = findPockets(twoNeighbourhoods(), POLICY);
    const second = findPockets(twoNeighbourhoods(), POLICY);

    expect(first.map((pocket) => pocket.id)).toEqual(
      second.map((pocket) => pocket.id),
    );
  });

  it("returns nothing rather than inventing a pocket from empty ground", () => {
    expect(findPockets([], POLICY)).toEqual([]);
  });

  // A live sweep of Panjim produced pockets of four neighbourhood temples and
  // nothing else: the complaint that started this work, one level up.
  describe("substance", () => {
    it("rejects a cluster offering only one kind of place", () => {
      const base = 15.4989;
      const sameness = [
        place("t1", base, 73.8317, "religious"),
        place("t2", northOf(base, 150), 73.8317, "religious"),
        place("t3", northOf(base, 300), 73.8317, "religious"),
      ];

      expect(findPockets(sameness, POLICY)).toEqual([]);
    });

    it("rejects a cluster with nothing in it worth the journey", () => {
      const base = 15.4989;
      const forgettable = [
        {
          ...place("f1", base, 73.8317, "heritage"),
          landmarkSignal: false,
          reviewCount: 6,
        },
        {
          ...place("f2", northOf(base, 150), 73.8317, "museum"),
          landmarkSignal: false,
          reviewCount: 7,
        },
        {
          ...place("f3", northOf(base, 300), 73.8317, "heritage"),
          landmarkSignal: false,
          reviewCount: 8,
        },
        // A far more notable place elsewhere raises the bar these must clear.
        {
          ...place("anchor", 15.6, 73.9, "heritage"),
          landmarkSignal: false,
          reviewCount: 9_000,
        },
      ];

      const pockets = findPockets(forgettable, POLICY);

      expect(pockets).toEqual([]);
    });

    it("keeps a cluster anchored by a genuine landmark", () => {
      const base = 15.4989;
      const anchored = [
        {
          ...place("g1", base, 73.8317, "heritage"),
          landmarkSignal: true,
          reviewCount: 4_000,
        },
        {
          ...place("g2", northOf(base, 150), 73.8317, "museum"),
          landmarkSignal: false,
          reviewCount: 12,
        },
        {
          ...place("g3", northOf(base, 300), 73.8317, "heritage"),
          landmarkSignal: false,
          reviewCount: 15,
        },
      ];

      expect(findPockets(anchored, POLICY)).toHaveLength(1);
    });
  });
});
