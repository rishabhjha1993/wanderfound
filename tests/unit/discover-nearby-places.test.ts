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
  durationMinutes: 30 as const,
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

      expect(requests).toHaveLength(2);
      expect(requests[0]!.categories).toEqual(
        expect.arrayContaining(["heritage"]),
      );
      expect(requests[1]!.categories).toEqual(
        expect.arrayContaining(["culinary"]),
      );
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

    it("makes one request for a single-sided mood", async () => {
      const { provider, requests } = recordingProvider();

      await discoverNearbyPlaces({ input: INPUT, placesProvider: provider });

      expect(requests).toHaveLength(1);
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
