import { describe, expect, it, vi } from "vitest";
import { GooglePlacesProvider } from "@/lib/providers/google";
import type { NearbyPlacesInput } from "@/lib/providers/domain";
import { PlacesProviderError } from "@/lib/providers/errors";

const INPUT: NearbyPlacesInput = {
  origin: { latitude: 28.6139, longitude: 77.209 },
  radiusMeters: 800,
  maxResults: 60,
  categories: ["heritage", "garden", "culinary"],
  languageCode: "en",
};

const GOOGLE_RESPONSE = {
  places: [
    {
      id: "google-red-fort",
      displayName: { text: "Red Fort" },
      formattedAddress: "Netaji Subhash Marg, Delhi",
      location: { latitude: 28.6562, longitude: 77.241 },
      primaryType: "historical_landmark",
      types: ["historical_landmark", "historical_place"],
      businessStatus: "OPERATIONAL",
      currentOpeningHours: { openNow: true },
      googleMapsUri: "https://maps.google.com/?cid=123",
    },
    {
      id: "google-garden",
      displayName: { text: "A Public Garden" },
      location: { latitude: 28.614, longitude: 77.21 },
      primaryType: "garden",
      types: ["garden", "park"],
      businessStatus: "OPERATIONAL",
    },
  ],
};

describe("GooglePlacesProvider", () => {
  it("searches server-side, caps Google results and normalises candidates", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Promise.resolve(Response.json(GOOGLE_RESPONSE, { status: 200 })),
    );
    const provider = new GooglePlacesProvider({
      apiKey: "secret-server-key",
      fetcher,
      now: () => new Date("2026-07-29T10:00:00.000Z"),
    });

    const result = await provider.nearby(INPUT);

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0]!;
    const headers = options?.headers as Record<string, string>;
    const body = JSON.parse(String(options?.body));

    expect(url).toBe("https://places.googleapis.com/v1/places:searchNearby");
    expect(headers["X-Goog-Api-Key"]).toBe("secret-server-key");
    expect(headers["X-Goog-FieldMask"]).toContain("places.displayName");
    expect(body).toMatchObject({
      languageCode: "en",
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: INPUT.origin,
          radius: 800,
        },
      },
    });
    expect(body).not.toHaveProperty("regionCode");
    expect(body.includedTypes).toEqual(
      expect.arrayContaining(["historical_landmark", "garden", "cafe"]),
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      provider: "google_places_new",
      providerPlaceId: "google-red-fort",
      primaryCategory: "heritage",
      openingStatus: "open",
      publicAccess: "unknown",
      groundedFacts: [],
    });
    expect(result[0].attributions[0]).toMatchObject({
      provider: "google_places",
      displayName: "Google Maps",
      storagePolicy: "identifier_only",
    });
  });

  it("never makes a request without a server key", async () => {
    const fetcher = vi.fn();
    const provider = new GooglePlacesProvider({ apiKey: "", fetcher });

    await expect(provider.nearby(INPUT)).rejects.toMatchObject({
      name: "PlacesProviderError",
      code: "not_configured",
      retryable: false,
    } satisfies Partial<PlacesProviderError>);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("turns provider HTTP failures into typed errors", async () => {
    const provider = new GooglePlacesProvider({
      apiKey: "secret",
      fetcher: vi.fn<typeof fetch>(async () =>
        Promise.resolve(new Response(null, { status: 429 })),
      ),
    });

    await expect(provider.nearby(INPUT)).rejects.toMatchObject({
      code: "rate_limited",
      retryable: true,
    } satisfies Partial<PlacesProviderError>);
  });
});
