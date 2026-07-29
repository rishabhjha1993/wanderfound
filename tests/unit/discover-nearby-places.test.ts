import { describe, expect, it, vi } from "vitest";
import { discoverNearbyPlaces } from "@/lib/discovery/discover-nearby-places";
import type { PlaceCurator } from "@/lib/discovery/place-curator";
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
});
