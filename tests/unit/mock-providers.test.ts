import { describe, expect, it } from "vitest";
import {
  MockKnowledgeProvider,
  MockPlacesProvider,
  MockRoutingProvider,
} from "@/lib/providers/mock";
import {
  KnowledgeProviderError,
  RoutingProviderError,
} from "@/lib/providers/errors";

const ORIGIN = {
  latitude: 15.4989,
  longitude: 73.8278,
};

describe("deterministic mock providers", () => {
  it("returns the same normalised nearby candidates every time", async () => {
    const provider = new MockPlacesProvider();
    const input = {
      origin: ORIGIN,
      radiusMeters: 1_000,
      maxResults: 8,
      categories: [
        "architecture",
        "civic",
        "garden",
        "heritage",
        "market",
        "public_art",
        "viewpoint",
        "waterfront",
      ] as const,
      languageCode: "en",
      regionCode: "IN",
    };

    const first = await provider.nearby(input);
    const second = await provider.nearby(input);

    expect(first).toHaveLength(8);
    expect(second).toEqual(first);
    expect(first.every((candidate) => candidate.attributions.length > 0)).toBe(
      true,
    );
  });

  it("creates a provider-shaped walking route with exact geometry", async () => {
    const provider = new MockRoutingProvider();
    const destination = {
      latitude: 15.5001,
      longitude: 73.8265,
    };

    const route = await provider.walkingRoute({
      origin: ORIGIN,
      destination,
      languageCode: "en",
      regionCode: "IN",
    });

    expect(route.path).toHaveLength(3);
    expect(route.path[0]).toEqual(ORIGIN);
    expect(route.path.at(-1)).toEqual(destination);
    expect(route.distanceMeters).toBeGreaterThan(0);
    expect(route.durationSeconds).toBeGreaterThan(0);
    expect(route.attributions[0].provider).toBe("wanderfound_mock");
  });

  it("creates one complete pedestrian matrix for every supplied pair", async () => {
    const provider = new MockRoutingProvider();
    const matrix = await provider.walkingMatrix({
      locations: [
        ORIGIN,
        { latitude: 15.5001, longitude: 73.8265 },
        { latitude: 15.4978, longitude: 73.8269 },
      ],
      languageCode: "en",
      regionCode: "IN",
    });

    expect(matrix.elements).toHaveLength(9);
    expect(matrix.elements[0]).toMatchObject({
      originIndex: 0,
      destinationIndex: 0,
      condition: "route_exists",
      distanceMeters: 0,
      durationSeconds: 0,
    });
    expect(matrix.elements[1]).toMatchObject({
      condition: "route_exists",
    });
  });

  it("returns a typed no-route failure for unsupported fixture pairs", async () => {
    const provider = new MockRoutingProvider();

    await expect(
      provider.walkingRoute({
        origin: ORIGIN,
        destination: { latitude: 15.6, longitude: 73.9 },
        languageCode: "en",
        regionCode: "IN",
      }),
    ).rejects.toMatchObject({
      name: "RoutingProviderError",
      code: "no_route",
      retryable: false,
    } satisfies Partial<RoutingProviderError>);
  });

  it("enriches only a valid candidate with grounded fixture facts", async () => {
    const places = new MockPlacesProvider();
    const knowledge = new MockKnowledgeProvider();
    const [candidate] = await places.nearby({
      origin: ORIGIN,
      radiusMeters: 1_000,
      maxResults: 1,
      categories: ["architecture", "garden"],
      languageCode: "en",
      regionCode: "IN",
    });

    const result = await knowledge.enrich(candidate);

    expect(result.place).toEqual({
      provider: candidate.provider,
      providerPlaceId: candidate.providerPlaceId,
    });
    expect(result.facts[0].confidence).toBe(1);

    await expect(
      knowledge.enrich({ ...candidate, providerPlaceId: "" }),
    ).rejects.toBeInstanceOf(KnowledgeProviderError);
  });
});
