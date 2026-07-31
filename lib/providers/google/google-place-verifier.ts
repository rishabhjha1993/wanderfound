import { z } from "zod";
import type {
  PlaceVerification,
  PlaceVerifier,
} from "@/lib/providers/contracts";
import {
  placeNameSimilarity,
  distanceMeters,
} from "@/lib/discovery/deduplicate";
import type { PlaceCandidate } from "@/lib/providers/domain";
import { PlacesProviderError } from "@/lib/providers/errors";
import { parseProviderResponse } from "@/lib/providers/validation";

const PROVIDER_ID = "google_places_new";
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const DEFAULT_TIMEOUT_MS = 6_000;

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.businessStatus",
  "places.currentOpeningHours.openNow",
  "places.googleMapsUri",
  "places.userRatingCount",
].join(",");

/**
 * How close a match must be before we believe it is the same place.
 *
 * Both bars have to be cleared. A name alone matches the wrong "St. Mary's" in
 * the next district; a position alone matches the cafe across the road from the
 * monument. Below either bar the place keeps its unverified status, which is a
 * worse trail but an honest one.
 */
const MATCH_THRESHOLDS = {
  nameSimilarity: 0.34,
  distanceMetres: 300,
} as const;

const GooglePlaceSchema = z
  .object({
    id: z.string().min(1),
    displayName: z.object({ text: z.string().min(1) }),
    formattedAddress: z.string().min(1).optional(),
    location: z.object({ latitude: z.number(), longitude: z.number() }),
    businessStatus: z.string().optional(),
    currentOpeningHours: z
      .object({ openNow: z.boolean() })
      .partial()
      .optional(),
    googleMapsUri: z.string().url().optional(),
    userRatingCount: z.number().int().nonnegative().optional(),
  })
  .passthrough();

const SearchTextResponseSchema = z.object({
  places: z.array(GooglePlaceSchema).default([]),
});

type GooglePlaceVerifierOptions = {
  apiKey?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Fills in what a knowledge source cannot know.
 *
 * Wikidata describes what a place *is* — a tomb, a stepwell, who built it — and
 * says nothing about whether it is open today, permanently closed, or standing
 * where its coordinate claims. Without this a trail can send somebody to a
 * museum shut on Mondays, or to a monument that no longer exists.
 *
 * This runs only for the places a trail actually selected. Verifying a whole
 * region would cost one call per candidate and buy nothing, since most
 * candidates are never visited.
 */
export class GooglePlaceVerifier implements PlaceVerifier {
  readonly descriptor = {
    id: PROVIDER_ID,
    kind: "places" as const,
    name: "Google Places verification",
    status: "ready" as const,
  };

  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: GooglePlaceVerifierOptions = {}) {
    this.apiKey =
      options.apiKey ?? process.env.GOOGLE_MAPS_SERVER_API_KEY ?? "";
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async verify(candidate: PlaceCandidate): Promise<PlaceVerification> {
    if (!this.apiKey) {
      throw new PlacesProviderError({
        providerId: PROVIDER_ID,
        operation: "verify_place",
        code: "not_configured",
        retryable: false,
        message: "Google Places is not configured.",
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: candidate.name,
          maxResultCount: 3,
          locationBias: {
            circle: {
              center: candidate.coordinates,
              radius: MATCH_THRESHOLDS.distanceMetres,
            },
          },
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw httpError(response.status);
      }

      const raw: unknown = await response.json();
      const parsed = parseProviderResponse(SearchTextResponseSchema, raw, {
        providerId: PROVIDER_ID,
        providerKind: "places",
        operation: "verify_place",
      });

      const match = bestMatch(candidate, parsed.places);

      return match
        ? { place: merge(candidate, match), matched: true }
        : { place: candidate, matched: false };
    } catch (error) {
      if (error instanceof PlacesProviderError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new PlacesProviderError({
          providerId: PROVIDER_ID,
          operation: "verify_place",
          code: "timeout",
          retryable: true,
          message: "Google Places took too long to verify a place.",
          cause: error,
        });
      }

      throw new PlacesProviderError({
        providerId: PROVIDER_ID,
        operation: "verify_place",
        code: "unavailable",
        retryable: true,
        message: "Google Places is temporarily unavailable.",
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function bestMatch(
  candidate: PlaceCandidate,
  places: z.infer<typeof GooglePlaceSchema>[],
) {
  const scored = places
    .map((place) => ({
      place,
      similarity: placeNameSimilarity(candidate.name, place.displayName.text),
      metres: distanceMeters(candidate.coordinates, place.location),
    }))
    .filter(
      (entry) =>
        entry.similarity >= MATCH_THRESHOLDS.nameSimilarity &&
        entry.metres <= MATCH_THRESHOLDS.distanceMetres,
    )
    .sort((first, second) => second.similarity - first.similarity);

  return scored[0]?.place ?? null;
}

/**
 * The knowledge source stays authoritative about what the place is; the
 * provider only contributes what it alone observes. Overwriting the name or
 * category here would undo the reason this place was chosen.
 */
function merge(
  candidate: PlaceCandidate,
  place: z.infer<typeof GooglePlaceSchema>,
): PlaceCandidate {
  return {
    ...candidate,
    openingStatus: openingStatus(place),
    // A provider position is surveyed; a Wikidata coordinate is often the
    // centroid of a large site, which can leave a player in the wrong street.
    coordinates: place.location,
    ...(place.formattedAddress ? { address: place.formattedAddress } : {}),
    ...(place.userRatingCount === undefined
      ? {}
      : { reviewCount: place.userRatingCount }),
    attributions: [
      ...candidate.attributions,
      {
        provider: "google_places",
        displayName: "Google Maps",
        ...(place.googleMapsUri ? { sourceUrl: place.googleMapsUri } : {}),
        requiredNotice: "Google",
        storagePolicy: "identifier_only" as const,
        retrievedAt: candidate.retrievedAt,
      },
    ],
  };
}

function openingStatus(place: z.infer<typeof GooglePlaceSchema>) {
  if (place.businessStatus === "CLOSED_PERMANENTLY") {
    return "permanently_closed" as const;
  }

  if (place.businessStatus === "CLOSED_TEMPORARILY") {
    return "closed" as const;
  }

  if (place.currentOpeningHours?.openNow === true) {
    return "open" as const;
  }

  if (place.currentOpeningHours?.openNow === false) {
    return "closed" as const;
  }

  return "unknown" as const;
}

function httpError(status: number) {
  if (status === 429) {
    return new PlacesProviderError({
      providerId: PROVIDER_ID,
      operation: "verify_place",
      code: "rate_limited",
      retryable: true,
      message: "Google Places rate limit was reached.",
    });
  }

  if (status === 401 || status === 403) {
    return new PlacesProviderError({
      providerId: PROVIDER_ID,
      operation: "verify_place",
      code: "authentication_failed",
      retryable: false,
      message: "Google Places credentials were rejected.",
    });
  }

  return new PlacesProviderError({
    providerId: PROVIDER_ID,
    operation: "verify_place",
    code: "unavailable",
    retryable: status >= 500,
    message: "Google Places could not verify a place.",
  });
}
