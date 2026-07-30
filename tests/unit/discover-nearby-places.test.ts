import { describe, expect, it, vi } from "vitest";
import { discoverNearbyPlaces } from "@/lib/discovery/discover-nearby-places";
import type { PlaceCurator } from "@/lib/discovery/place-curator";
import type { PlacesProvider } from "@/lib/providers/contracts";
import type { NearbyPlacesInput, PlaceCandidate } from "@/lib/providers/domain";
import {
  MockPlacesProvider,
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
    expect(first.places.length).toBeLessThanOrEqual(4);
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
