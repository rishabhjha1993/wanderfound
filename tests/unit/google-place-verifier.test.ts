import { describe, expect, it, vi } from "vitest";
import { GooglePlaceVerifier } from "@/lib/providers/google/google-place-verifier";
import { MOCK_PLACE_CANDIDATES } from "@/lib/providers/mock/fixtures";
import type { PlaceCandidate } from "@/lib/providers/domain";
import { PlacesProviderError } from "@/lib/providers/errors";

/** A Wikidata-shaped candidate: named and located, but unverified. */
const TOMB: PlaceCandidate = {
  ...MOCK_PLACE_CANDIDATES[0]!,
  provider: "wikidata",
  providerPlaceId: "Q207590",
  name: "Humayun's Tomb",
  coordinates: { latitude: 28.593333, longitude: 77.250833 },
  openingStatus: "unknown",
  reviewCount: undefined,
  sitelinkCount: 69,
};

function respondWith(places: unknown[]) {
  return vi.fn<typeof fetch>(async () =>
    Promise.resolve(Response.json({ places }, { status: 200 })),
  );
}

function googlePlace(overrides: Record<string, unknown> = {}) {
  return {
    id: "google-humayun",
    displayName: { text: "Humayun's Tomb" },
    formattedAddress: "Mathura Road, Nizamuddin East, New Delhi",
    location: { latitude: 28.5933, longitude: 77.2507 },
    businessStatus: "OPERATIONAL",
    currentOpeningHours: { openNow: true },
    userRatingCount: 61_000,
    ...overrides,
  };
}

describe("GooglePlaceVerifier", () => {
  it("fills in what the knowledge source could not know", async () => {
    const verifier = new GooglePlaceVerifier({
      apiKey: "secret",
      fetcher: respondWith([googlePlace()]),
    });

    const { place: verified, matched } = await verifier.verify(TOMB);

    expect(matched).toBe(true);
    expect(verified).toMatchObject({
      openingStatus: "open",
      address: "Mathura Road, Nizamuddin East, New Delhi",
      reviewCount: 61_000,
    });
  });

  it("keeps the knowledge source authoritative about what the place is", async () => {
    const verifier = new GooglePlaceVerifier({
      apiKey: "secret",
      fetcher: respondWith([
        googlePlace({ displayName: { text: "Humayun Tomb Complex" } }),
      ]),
    });

    const { place: verified } = await verifier.verify(TOMB);

    expect(verified.name).toBe("Humayun's Tomb");
    expect(verified.providerPlaceId).toBe("Q207590");
    expect(verified.primaryCategory).toBe(TOMB.primaryCategory);
  });

  it("records both sources on a verified place", async () => {
    const verifier = new GooglePlaceVerifier({
      apiKey: "secret",
      fetcher: respondWith([googlePlace()]),
    });

    const { place: verified } = await verifier.verify(TOMB);

    expect(verified.attributions.map((entry) => entry.provider)).toContain(
      "google_places",
    );
    expect(verified.attributions.length).toBeGreaterThan(1);
  });

  it("reports a demolished place as permanently closed", async () => {
    const verifier = new GooglePlaceVerifier({
      apiKey: "secret",
      fetcher: respondWith([
        googlePlace({ businessStatus: "CLOSED_PERMANENTLY" }),
      ]),
    });

    await expect(verifier.verify(TOMB)).resolves.toMatchObject({
      place: { openingStatus: "permanently_closed" },
      matched: true,
    });
  });

  // A name alone matches the wrong "St. Mary's" in the next district.
  it("refuses a match that is too far away", async () => {
    const verifier = new GooglePlaceVerifier({
      apiKey: "secret",
      fetcher: respondWith([
        googlePlace({ location: { latitude: 28.65, longitude: 77.3 } }),
      ]),
    });

    await expect(verifier.verify(TOMB)).resolves.toMatchObject({
      place: { openingStatus: "unknown" },
      matched: false,
    });
  });

  // A position alone matches the cafe across the road from the monument.
  it("refuses a match whose name is unrelated", async () => {
    const verifier = new GooglePlaceVerifier({
      apiKey: "secret",
      fetcher: respondWith([
        googlePlace({ displayName: { text: "Sunder Nursery Cafe" } }),
      ]),
    });

    await expect(verifier.verify(TOMB)).resolves.toMatchObject({
      place: { openingStatus: "unknown" },
      matched: false,
    });
  });

  it("leaves the place unchanged when nothing matches", async () => {
    const verifier = new GooglePlaceVerifier({
      apiKey: "secret",
      fetcher: respondWith([]),
    });

    await expect(verifier.verify(TOMB)).resolves.toEqual({
      place: TOMB,
      matched: false,
    });
  });

  it("searches by name, biased to where the place is said to be", async () => {
    const fetcher = respondWith([]);
    const verifier = new GooglePlaceVerifier({ apiKey: "secret", fetcher });

    await verifier.verify(TOMB);

    const body = JSON.parse(String(fetcher.mock.calls[0]![1]?.body));

    expect(body.textQuery).toBe("Humayun's Tomb");
    expect(body.locationBias.circle.center).toEqual(TOMB.coordinates);
  });

  it("never makes a request without a server key", async () => {
    const fetcher = respondWith([]);
    const verifier = new GooglePlaceVerifier({ apiKey: "", fetcher });

    await expect(verifier.verify(TOMB)).rejects.toMatchObject({
      code: "not_configured",
    } satisfies Partial<PlacesProviderError>);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("turns provider failures into typed errors", async () => {
    const verifier = new GooglePlaceVerifier({
      apiKey: "secret",
      fetcher: vi.fn<typeof fetch>(async () =>
        Promise.resolve(new Response(null, { status: 429 })),
      ),
    });

    await expect(verifier.verify(TOMB)).rejects.toMatchObject({
      code: "rate_limited",
      retryable: true,
    } satisfies Partial<PlacesProviderError>);
  });
});
