import { describe, expect, it, vi } from "vitest";
import type { ScoutedPlaceSuggestion } from "@/lib/discovery/place-scout";
import { GoogleScoutVerifier } from "@/lib/providers/google";

const ORIGIN = { latitude: 28.5921, longitude: 77.046 };
const SUGGESTION: ScoutedPlaceSuggestion = {
  name: "Sunder Nursery",
  locality: "Nizamuddin",
  suggestedPocket: "Nizamuddin heritage gardens",
  approximateCoordinates: { latitude: 28.593, longitude: 77.245 },
  primaryCategory: "garden",
  categories: ["garden", "heritage", "architecture"],
  moodFitReason:
    "Mughal tombs sit inside a richly planted landscape with water and old trees.",
  obscurity: "lesser_known",
  accessType: "ticketed_entry",
  indoorOutdoor: "outdoor",
  commercialVenue: false,
};

describe("GoogleScoutVerifier", () => {
  it("turns a matching Google result into an exact, map-linked candidate", async () => {
    let requestBody: string | undefined;
    const fetcher: typeof fetch = vi.fn(async (_input, init) => {
      requestBody = init?.body?.toString();

      return Response.json({
        places: [
          {
            id: "google-sunder",
            displayName: { text: "Sunder Nursery" },
            formattedAddress: "Nizamuddin, New Delhi",
            location: { latitude: 28.5931, longitude: 77.2454 },
            primaryType: "park",
            types: ["park", "tourist_attraction"],
            businessStatus: "OPERATIONAL",
            currentOpeningHours: { openNow: true },
            googleMapsUri: "https://maps.google.com/?cid=123",
            userRatingCount: 18_000,
          },
        ],
      });
    });
    const verifier = new GoogleScoutVerifier({
      apiKey: "test-key",
      fetcher,
      now: () => new Date("2026-07-31T08:00:00.000Z"),
    });

    const place = await verifier.verify({
      suggestion: SUGGESTION,
      origin: ORIGIN,
      radiusMeters: 30_000,
      languageCode: "en",
      regionCode: "IN",
    });

    expect(place).toMatchObject({
      providerPlaceId: "google-sunder",
      name: "Sunder Nursery",
      primaryCategory: "garden",
      coordinates: { latitude: 28.5931, longitude: 77.2454 },
      publicAccess: "yes",
      purchaseRequired: "yes",
      reviewCount: 18_000,
      identityVerified: true,
    });
    expect(place?.visualSignals).toEqual(
      expect.arrayContaining([
        "locality:Nizamuddin",
        "proposed-pocket:Nizamuddin heritage gardens",
        "obscurity:lesser_known",
      ]),
    );
    expect(place?.attributions.map((source) => source.provider)).toEqual([
      "openai",
      "google_places",
    ]);

    const request = JSON.parse(requestBody ?? "{}") as Record<string, unknown>;
    expect(request).toMatchObject({
      textQuery: "Sunder Nursery, Nizamuddin",
      maxResultCount: 5,
      regionCode: "IN",
    });
  });

  it("drops a Google result whose name does not corroborate Sol's suggestion", async () => {
    const verifier = new GoogleScoutVerifier({
      apiKey: "test-key",
      fetcher: (async () =>
        Response.json({
          places: [
            {
              id: "random-fountain",
              displayName: { text: "Jor Bagh Fountain" },
              location: { latitude: 28.59, longitude: 77.22 },
              types: ["point_of_interest"],
            },
          ],
        })) as typeof fetch,
    });

    await expect(
      verifier.verify({
        suggestion: SUGGESTION,
        origin: ORIGIN,
        radiusMeters: 30_000,
        languageCode: "en",
      }),
    ).resolves.toBeNull();
  });

  it("rejects a parking record that only borrows the landmark's name", async () => {
    const verifier = new GoogleScoutVerifier({
      apiKey: "test-key",
      fetcher: (async () =>
        Response.json({
          places: [
            {
              id: "lotus-parking",
              displayName: { text: "Lotus Temple Parking" },
              location: { latitude: 28.553, longitude: 77.258 },
              types: ["parking"],
            },
          ],
        })) as typeof fetch,
    });

    await expect(
      verifier.verify({
        suggestion: {
          ...SUGGESTION,
          name: "Lotus Temple",
          locality: "Kalkaji",
        },
        origin: ORIGIN,
        radiusMeters: 30_000,
        languageCode: "en",
      }),
    ).resolves.toBeNull();
  });
});
