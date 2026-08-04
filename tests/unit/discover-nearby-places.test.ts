import { describe, expect, it, vi } from "vitest";
import {
  discoverNearbyPlaces,
  selectAcrossPockets,
} from "@/lib/discovery/discover-nearby-places";
import type { PlaceCurator } from "@/lib/discovery/place-curator";
import type {
  PlaceScout,
  ScoutedPlaceSuggestion,
  ScoutedPlaceVerifier,
} from "@/lib/discovery/place-scout";
import { getDiscoveryPolicy } from "@/lib/discovery/policy";
import type { PlacesProvider } from "@/lib/providers/contracts";
import type { NearbyPlacesInput, PlaceCandidate } from "@/lib/providers/domain";
import {
  MockPlacesProvider,
  MockRoutingProvider,
  MOCK_PLACE_CANDIDATES,
} from "@/lib/providers/mock";

const INPUT = {
  origin: { latitude: 15.4989, longitude: 73.8278 },
  dayShape: "half_day" as const,
  mood: "historical" as const,
  partyMode: "solo" as const,
  languageCode: "en",
};

describe("discoverNearbyPlaces", () => {
  it("keeps three stops per pocket before spending shortlist space on extras", () => {
    const pockets = ["a", "b", "c"].map((prefix, pocketIndex) => ({
      places: Array.from({ length: 4 }, (_, placeIndex) => ({
        ...MOCK_PLACE_CANDIDATES[
          (pocketIndex + placeIndex) % MOCK_PLACE_CANDIDATES.length
        ]!,
        providerPlaceId: `${prefix}-${placeIndex}`,
      })),
    }));

    const selected = selectAcrossPockets(pockets, 8);
    const counts = selected.reduce<Record<string, number>>((result, place) => {
      const pocket = place.providerPlaceId.split("-")[0]!;
      result[pocket] = (result[pocket] ?? 0) + 1;
      return result;
    }, {});

    expect(counts).toEqual({ a: 4, b: 4 });
    expect(selected).toHaveLength(8);
  });

  it("uses Sol first, drops unverified suggestions, and preserves complete pockets", async () => {
    const suggestions = [
      scouted("Jor One", "Jor Bagh", "iconic"),
      scouted("Jor Two", "Jor Bagh", "iconic"),
      scouted("Jor Three", "Jor Bagh", "iconic"),
      scouted("Jor Four", "Jor Bagh", "iconic"),
      scouted("Nizam One", "Nizamuddin", "iconic"),
      scouted("Nizam Two", "Nizamuddin", "lesser_known"),
      scouted("Mehrauli One", "Mehrauli", "hidden_gem"),
      scouted("Made Up Palace", "Mehrauli"),
    ];
    const placeScout: PlaceScout = {
      scout: vi.fn(async () => ({ areaLabel: "Delhi", suggestions })),
    };
    const scoutedPlaceVerifier: ScoutedPlaceVerifier = {
      verify: vi.fn(async ({ suggestion }) =>
        suggestion.name === "Made Up Palace"
          ? null
          : verifiedScoutCandidate(suggestion),
      ),
    };
    const nearby = vi.fn(async () => {
      throw new Error("The database-first path must not run.");
    });
    const placesProvider: PlacesProvider = {
      descriptor: {
        id: "unused",
        kind: "places",
        name: "Unused nearby provider",
        status: "ready",
      },
      nearby,
    };

    const result = await discoverNearbyPlaces({
      input: { ...INPUT, mood: "beautiful" },
      placesProvider,
      placeScout,
      scoutedPlaceVerifier,
    });

    expect(nearby).not.toHaveBeenCalled();
    expect(placeScout.scout).toHaveBeenCalledWith(
      expect.objectContaining({ radiusMeters: 30_000, mood: "beautiful" }),
    );
    expect(scoutedPlaceVerifier.verify).toHaveBeenCalledTimes(8);
    expect(result.selectionMethod).toBe("sol");
    expect(result.sourceNames).toEqual(["OpenAI GPT-5.6 Sol", "Google Maps"]);
    expect(result.candidates).toHaveLength(7);
    expect(
      result.places.filter((place) =>
        place.visualSignals.includes("locality:Jor Bagh"),
      ),
    ).toHaveLength(4);
    expect(result.places.some((place) => place.name === "Made Up Palace")).toBe(
      false,
    );
    expect(result.places.map((place) => place.name)).toEqual(
      expect.arrayContaining(["Jor One", "Jor Two", "Jor Three"]),
    );
  });

  it("lets the AI choose only from provider-grounded candidates", async () => {
    const aiCurator: PlaceCurator = {
      curate: vi.fn(async () => [
        MOCK_PLACE_CANDIDATES[5].providerPlaceId,
        MOCK_PLACE_CANDIDATES[0].providerPlaceId,
      ]),
    };

    const result = await discoverNearbyPlaces({
      input: INPUT,
      placesProvider: new MockPlacesProvider(),
      aiCurator,
    });

    expect(result.selectionMethod).toBe("sol");
    expect(result.places.map((place) => place.providerPlaceId)).toEqual([
      MOCK_PLACE_CANDIDATES[5].providerPlaceId,
      MOCK_PLACE_CANDIDATES[0].providerPlaceId,
    ]);
  });

  it("falls back deterministically when AI curation fails", async () => {
    const aiCurator: PlaceCurator = {
      curate: vi.fn(async () => {
        throw new Error("temporary AI outage");
      }),
    };

    const first = await discoverNearbyPlaces({
      input: INPUT,
      placesProvider: new MockPlacesProvider(),
      aiCurator,
    });
    const second = await discoverNearbyPlaces({
      input: INPUT,
      placesProvider: new MockPlacesProvider(),
      aiCurator,
    });

    expect(first.selectionMethod).toBe("deterministic");
    expect(second.places).toEqual(first.places);
    expect(first.places.length).toBeLessThanOrEqual(
      getDiscoveryPolicy(INPUT.dayShape, INPUT.mood).shortlistLimit,
    );
  });

  it("groups the surviving places into walkable pockets", async () => {
    const result = await discoverNearbyPlaces({
      input: INPUT,
      placesProvider: new MockPlacesProvider(),
    });

    expect(result.pockets.length).toBeGreaterThan(0);

    for (const pocket of result.pockets) {
      expect(pocket.places.length).toBeGreaterThanOrEqual(3);
      expect(pocket.spanMetres).toBeLessThanOrEqual(1_200);
    }
  });

  it("checks each pocket against real walking pairs before selection", async () => {
    const routingProvider = new MockRoutingProvider();
    const walkingMatrix = vi.spyOn(routingProvider, "walkingMatrix");
    const result = await discoverNearbyPlaces({
      input: INPUT,
      placesProvider: new MockPlacesProvider(),
      routingProvider,
    });

    expect(walkingMatrix).toHaveBeenCalledTimes(result.pockets.length);
    expect(result.routing.checked).toBe(true);
    expect(result.routing.readyPocketCount).toBe(result.pockets.length);
    expect(result.routing.matrixElementCount).toBeGreaterThan(0);
  });

  it("searches for culinary detail around regional anchors rather than the player's suburb", async () => {
    const anchorLatitude = INPUT.origin.latitude + 0.1;
    const anchors = [
      placeAt("anchor-one", "heritage", anchorLatitude, INPUT.origin.longitude),
      placeAt(
        "anchor-two",
        "heritage",
        anchorLatitude + 0.001,
        INPUT.origin.longitude + 0.001,
      ),
      placeAt(
        "anchor-three",
        "heritage",
        anchorLatitude - 0.001,
        INPUT.origin.longitude - 0.001,
      ),
    ];
    const knowledge = recordingProvider(async () => anchors);
    const proximity = recordingProvider(async (request) => [
      placeAt(
        "food-one",
        "culinary",
        request.origin.latitude + 0.0003,
        request.origin.longitude,
      ),
      placeAt(
        "food-two",
        "culinary",
        request.origin.latitude,
        request.origin.longitude + 0.0003,
      ),
      placeAt(
        "food-three",
        "culinary",
        request.origin.latitude - 0.0003,
        request.origin.longitude,
      ),
    ]);

    const result = await discoverNearbyPlaces({
      input: { ...INPUT, mood: "culinary" },
      placesProvider: proximity.provider,
      knowledgeProvider: knowledge.provider,
    });

    expect(proximity.requests).toHaveLength(1);
    expect(proximity.requests[0]!.origin.latitude).toBeCloseTo(
      anchorLatitude,
      2,
    );
    expect(proximity.requests[0]!.origin).not.toEqual(INPUT.origin);
    expect(proximity.requests[0]!.categories).toContain("culinary");
    expect(result.pockets).toHaveLength(1);
    expect(result.pockets[0]!.categories).toEqual(
      expect.arrayContaining(["heritage", "culinary"]),
    );
  });

  describe("balanced pools", () => {
    it("searches each side of a two-sided mood separately", async () => {
      const { provider, requests } = recordingProvider();

      await discoverNearbyPlaces({
        input: { ...INPUT, mood: "strange" },
        placesProvider: provider,
      });

      // Both sides are searched at every centre of the sweep.
      const sides = new Set(
        requests.map((request) => request.categories.join(",")),
      );

      expect(sides.size).toBe(2);
      expect(
        requests.some((request) => request.categories.includes("heritage")),
      ).toBe(true);
      expect(
        requests.some((request) => request.categories.includes("culinary")),
      ).toBe(true);
    });

    it("splits the candidate budget across the sides", async () => {
      const { provider, requests } = recordingProvider();

      await discoverNearbyPlaces({
        input: { ...INPUT, mood: "strange" },
        placesProvider: provider,
      });

      for (const request of requests) {
        expect(request.maxResults).toBe(10);
      }
    });

    it("makes one request per centre for a single-sided mood", async () => {
      const { provider, requests } = recordingProvider();

      await discoverNearbyPlaces({
        input: { ...INPUT, mood: "beautiful" },
        placesProvider: provider,
      });

      const sides = new Set(
        requests.map((request) => request.categories.join(",")),
      );

      expect(sides.size).toBe(1);
      expect(requests.length).toBeGreaterThan(1);
    });

    // The sweep is the whole reason a day can cover a city: one Nearby Search
    // answers a point and returns at most twenty places.
    it("searches from several distinct centres, not just the player", async () => {
      const { provider, requests } = recordingProvider();

      await discoverNearbyPlaces({ input: INPUT, placesProvider: provider });

      const centres = new Set(
        requests.map(
          (request) =>
            `${request.origin.latitude.toFixed(4)},${request.origin.longitude.toFixed(4)}`,
        ),
      );

      expect(centres.size).toBeGreaterThan(1);
      expect(
        centres.has(
          `${INPUT.origin.latitude.toFixed(4)},${INPUT.origin.longitude.toFixed(4)}`,
        ),
      ).toBe(true);
    });

    it("reaches further for a full day than a half day", async () => {
      const half = recordingProvider();
      const full = recordingProvider();

      await discoverNearbyPlaces({
        input: { ...INPUT, dayShape: "half_day" },
        placesProvider: half.provider,
      });
      await discoverNearbyPlaces({
        input: { ...INPUT, dayShape: "full_day" },
        placesProvider: full.provider,
      });

      expect(full.requests.length).toBeGreaterThan(half.requests.length);
    });

    it("reports what the sweep cost", async () => {
      const { provider } = recordingProvider();

      const result = await discoverNearbyPlaces({
        input: INPUT,
        placesProvider: provider,
      });

      expect(result.searchCount).toBeGreaterThan(1);
      expect(result.centreCount).toBeGreaterThan(1);
      expect(result.failedSearchCount).toBe(0);
    });

    // A centre may land in water or open country at the edge of a city.
    it("tolerates individual searches failing across the sweep", async () => {
      let call = 0;
      const { provider } = recordingProvider(async (request) => {
        call += 1;

        if (call % 3 === 0) {
          throw new Error("no results at this centre");
        }

        return MOCK_PLACE_CANDIDATES.slice(0, request.maxResults);
      });

      const result = await discoverNearbyPlaces({
        input: INPUT,
        placesProvider: provider,
      });

      expect(result.failedSearchCount).toBeGreaterThan(0);
      expect(result.places.length).toBeGreaterThan(0);
    });

    // A less balanced pool still beats refusing an area we partly understand.
    it("continues when one side of the search fails", async () => {
      let call = 0;
      const { provider } = recordingProvider(async (request) => {
        call += 1;

        if (call === 1) {
          throw new Error("heritage search failed");
        }

        return MOCK_PLACE_CANDIDATES.slice(0, request.maxResults);
      });

      const result = await discoverNearbyPlaces({
        input: { ...INPUT, mood: "strange" },
        placesProvider: provider,
      });

      expect(result.places.length).toBeGreaterThan(0);
    });

    it("refuses when every side of the search fails", async () => {
      const { provider } = recordingProvider(async () => {
        throw new Error("provider outage");
      });

      await expect(
        discoverNearbyPlaces({
          input: { ...INPUT, mood: "strange" },
          placesProvider: provider,
        }),
      ).rejects.toThrow("provider outage");
    });
  });
});

function recordingProvider(
  handler: (request: NearbyPlacesInput) => Promise<PlaceCandidate[]> = async (
    request,
  ) => MOCK_PLACE_CANDIDATES.slice(0, request.maxResults),
) {
  const requests: NearbyPlacesInput[] = [];
  const provider: PlacesProvider = {
    descriptor: {
      id: "test_places",
      kind: "places",
      name: "Recording test provider",
      status: "ready",
    },
    async nearby(request) {
      requests.push(request);
      return handler(request);
    },
  };

  return { provider, requests };
}

function placeAt(
  id: string,
  category: PlaceCandidate["primaryCategory"],
  latitude: number,
  longitude: number,
): PlaceCandidate {
  return {
    ...MOCK_PLACE_CANDIDATES[5]!,
    providerPlaceId: id,
    name: `Test place ${id}`,
    primaryCategory: category,
    categories: [category],
    coordinates: { latitude, longitude },
    commercialVenue: category === "culinary",
    landmarkSignal: category === "heritage",
  };
}

function scouted(
  name: string,
  locality: string,
  obscurity: ScoutedPlaceSuggestion["obscurity"] = "lesser_known",
): ScoutedPlaceSuggestion {
  return {
    name,
    locality,
    suggestedPocket: `${locality} walk`,
    approximateCoordinates: INPUT.origin,
    primaryCategory: "garden",
    categories: ["garden", "architecture"],
    moodFitReason:
      "A distinctive composition of landscape, old stone and mature trees.",
    obscurity,
    accessType: "public_space",
    indoorOutdoor: "outdoor",
    commercialVenue: false,
  };
}

function verifiedScoutCandidate(
  suggestion: ScoutedPlaceSuggestion,
): PlaceCandidate {
  return {
    ...MOCK_PLACE_CANDIDATES[5]!,
    provider: "google_places_new",
    providerPlaceId: `google-${suggestion.name}`,
    name: suggestion.name,
    primaryCategory: suggestion.primaryCategory,
    categories: suggestion.categories,
    coordinates: suggestion.approximateCoordinates,
    publicAccess: "yes",
    reviewCount: 100,
    landmarkSignal: false,
    visualSignals: [
      `mood-fit:${suggestion.moodFitReason}`,
      `locality:${suggestion.locality}`,
      `obscurity:${suggestion.obscurity}`,
    ],
  };
}
