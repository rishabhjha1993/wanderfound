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
      userRatingCount: 184,
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
      publicAccess: "yes",
      purchaseRequired: "no",
      exteriorObservable: true,
      reviewCount: 184,
      groundedFacts: [],
    });
    expect(result[0].attributions[0]).toMatchObject({
      provider: "google_places",
      displayName: "Google Maps",
      storagePolicy: "identifier_only",
    });
  });

  it("requests the fields that access, purchase and obscurity depend on", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Promise.resolve(Response.json({ places: [] }, { status: 200 })),
    );
    const provider = new GooglePlacesProvider({ apiKey: "secret", fetcher });

    await provider.nearby(INPUT);

    const headers = fetcher.mock.calls[0]![1]?.headers as Record<
      string,
      string
    >;

    expect(headers["X-Goog-FieldMask"]).toContain("places.userRatingCount");
    expect(headers["X-Goog-FieldMask"]).toContain("places.priceLevel");
  });

  // The first live audit at Fontainhas returned the Regional Transport Office,
  // an Aadhaar Seva Kendra and the Regional Passport Office as "historical"
  // discoveries, and three offshore casino boats as "beautiful" ones.
  it("drops government offices and casinos whatever else Google tagged them", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Promise.resolve(
        Response.json(
          {
            places: [
              {
                id: "google-rto",
                displayName: { text: "RTO" },
                location: { latitude: 15.49, longitude: 73.83 },
                primaryType: "government_office",
                types: ["government_office", "historical_place"],
                businessStatus: "OPERATIONAL",
              },
              {
                id: "google-casino",
                displayName: { text: "Deltin Royale" },
                location: { latitude: 15.5, longitude: 73.83 },
                primaryType: "casino",
                types: ["casino", "restaurant", "tourist_attraction"],
                businessStatus: "OPERATIONAL",
              },
            ],
          },
          { status: 200 },
        ),
      ),
    );
    const provider = new GooglePlacesProvider({ apiKey: "secret", fetcher });

    const result = await provider.nearby({
      ...INPUT,
      categories: ["heritage", "civic", "culinary"],
    });

    expect(result).toEqual([]);
  });

  // Treating every non-operational status as permanent discarded the Immaculate
  // Conception Church, Panjim's cathedral, on a CLOSED_TEMPORARILY flag.
  it("distinguishes a temporary closure from a place that is gone", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Promise.resolve(
        Response.json(
          {
            places: [
              {
                id: "google-cathedral",
                displayName: { text: "Immaculate Conception Church" },
                location: { latitude: 15.4989, longitude: 73.8278 },
                primaryType: "church",
                types: ["church", "historical_landmark"],
                businessStatus: "CLOSED_TEMPORARILY",
                userRatingCount: 28059,
              },
              {
                id: "google-gone",
                displayName: { text: "A Demolished Landmark" },
                location: { latitude: 15.499, longitude: 73.828 },
                primaryType: "historical_landmark",
                types: ["historical_landmark"],
                businessStatus: "CLOSED_PERMANENTLY",
                userRatingCount: 40,
              },
            ],
          },
          { status: 200 },
        ),
      ),
    );
    const provider = new GooglePlacesProvider({ apiKey: "secret", fetcher });

    const result = await provider.nearby({
      ...INPUT,
      categories: ["religious", "heritage"],
    });

    expect(result[0]).toMatchObject({
      providerPlaceId: "google-cathedral",
      openingStatus: "closed",
    });
    expect(result[1]).toMatchObject({
      providerPlaceId: "google-gone",
      openingStatus: "permanently_closed",
    });
  });

  // The curator picked "CalRaid Nutrition Clinic" out of a food-led search.
  it("drops clinics and personal-services businesses from a food search", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Promise.resolve(
        Response.json(
          {
            places: [
              {
                id: "google-clinic",
                displayName: { text: "CalRaid Nutrition Clinic" },
                location: { latitude: 15.49, longitude: 73.83 },
                primaryType: "wellness_center",
                types: ["wellness_center", "food_store"],
                businessStatus: "OPERATIONAL",
              },
            ],
          },
          { status: 200 },
        ),
      ),
    );
    const provider = new GooglePlacesProvider({ apiKey: "secret", fetcher });

    await expect(
      provider.nearby({ ...INPUT, categories: ["market", "culinary"] }),
    ).resolves.toEqual([]);
  });

  // `tourist_attraction` is applied to cathedrals, casinos and whole
  // neighbourhoods alike. It must never be the reason a place qualifies.
  it("does not admit a place on a generic tourist_attraction tag alone", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Promise.resolve(
        Response.json(
          {
            places: [
              {
                id: "google-generic",
                displayName: { text: "Somewhere Touristy" },
                location: { latitude: 15.49, longitude: 73.83 },
                primaryType: "tourist_attraction",
                types: ["tourist_attraction", "point_of_interest"],
                businessStatus: "OPERATIONAL",
              },
            ],
          },
          { status: 200 },
        ),
      ),
    );
    const provider = new GooglePlacesProvider({ apiKey: "secret", fetcher });

    await expect(
      provider.nearby({ ...INPUT, categories: ["viewpoint"] }),
    ).resolves.toEqual([]);
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
