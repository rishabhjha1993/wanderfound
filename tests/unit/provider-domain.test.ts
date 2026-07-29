import { describe, expect, it } from "vitest";
import {
  NearbyPlacesInputSchema,
  PlaceCandidateSchema,
  WalkingRouteInputSchema,
  WalkingRouteSchema,
} from "@/lib/providers/domain";
import { ProviderResponseError } from "@/lib/providers/errors";
import { MOCK_PLACE_CANDIDATES } from "@/lib/providers/mock";
import { parseProviderResponse } from "@/lib/providers/validation";

describe("provider domain schemas", () => {
  it("accepts a complete normalised place with attribution metadata", () => {
    const parsed = PlaceCandidateSchema.parse(MOCK_PLACE_CANDIDATES[0]);

    expect(parsed.providerPlaceId).toBe("fixture-arch");
    expect(parsed.attributions[0]).toMatchObject({
      provider: "wanderfound_mock",
      storagePolicy: "permitted",
      licenseName: "Internal test fixture",
    });
  });

  it("rejects malformed coordinates at the provider boundary", () => {
    const malformed = {
      ...MOCK_PLACE_CANDIDATES[0],
      coordinates: {
        latitude: 915,
        longitude: 73.8278,
      },
    };

    expect(() =>
      parseProviderResponse(PlaceCandidateSchema, malformed, {
        providerId: "test_places",
        providerKind: "places",
      }),
    ).toThrow(ProviderResponseError);

    try {
      parseProviderResponse(PlaceCandidateSchema, malformed, {
        providerId: "test_places",
        providerKind: "places",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderResponseError);
      expect((error as ProviderResponseError).code).toBe("malformed_response");
      expect((error as ProviderResponseError).retryable).toBe(false);
      expect((error as ProviderResponseError).issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "coordinates.latitude",
          }),
        ]),
      );
    }
  });

  it("requires the primary category to remain in the category list", () => {
    const malformed = {
      ...MOCK_PLACE_CANDIDATES[0],
      categories: ["garden"],
    };

    const result = PlaceCandidateSchema.safeParse(malformed);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ["categories"],
        message: "categories must include primaryCategory",
      });
    }
  });

  it("rejects a route without usable geometry or attribution", () => {
    const result = WalkingRouteSchema.safeParse({
      provider: "broken_routes",
      origin: { latitude: 15.4989, longitude: 73.8278 },
      destination: { latitude: 15.5, longitude: 73.829 },
      distanceMeters: 120,
      durationSeconds: 100,
      path: [{ latitude: 15.4989, longitude: 73.8278 }],
      steps: [],
      attributions: [],
      retrievedAt: "2026-07-29T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("accepts coordinates without requiring a country hint", () => {
    expect(
      NearbyPlacesInputSchema.parse({
        origin: { latitude: 28.6139, longitude: 77.209 },
        radiusMeters: 1_500,
        maxResults: 20,
        categories: ["heritage", "public_art"],
        languageCode: "en",
      }),
    ).not.toHaveProperty("regionCode");

    expect(
      WalkingRouteInputSchema.parse({
        origin: { latitude: 35.6762, longitude: 139.6503 },
        destination: { latitude: 35.6801, longitude: 139.652 },
        languageCode: "en",
      }),
    ).not.toHaveProperty("regionCode");
  });
});
