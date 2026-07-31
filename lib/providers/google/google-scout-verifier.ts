import { z } from "zod";
import {
  distanceMeters,
  placeNameSimilarity,
} from "@/lib/discovery/deduplicate";
import type {
  ScoutedPlaceVerifier,
  ScoutedPlaceVerificationInput,
} from "@/lib/discovery/place-scout";
import { PlaceCandidateSchema } from "@/lib/providers/domain";
import { PlacesProviderError } from "@/lib/providers/errors";
import { parseProviderResponse } from "@/lib/providers/validation";

const PROVIDER_ID = "google_places_new";
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const DEFAULT_TIMEOUT_MS = 7_000;
const NAME_SIMILARITY_FLOOR = 0.42;
const SUBPLACE_WORDS = [
  "parking",
  "car park",
  "gate",
  "entrance",
  "ticket counter",
  "booking office",
] as const;
const PUBLIC_GOOGLE_TYPES = new Set([
  "art_gallery",
  "botanical_garden",
  "garden",
  "historical_landmark",
  "monument",
  "museum",
  "national_park",
  "park",
  "place_of_worship",
  "public_art",
  "sculpture",
  "tourist_attraction",
]);
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.businessStatus",
  "places.currentOpeningHours.openNow",
  "places.googleMapsUri",
  "places.userRatingCount",
  "places.priceLevel",
].join(",");

const GooglePlaceSchema = z
  .object({
    id: z.string().trim().min(1),
    displayName: z.object({ text: z.string().trim().min(1) }).passthrough(),
    formattedAddress: z.string().trim().min(1).optional(),
    location: z.object({ latitude: z.number(), longitude: z.number() }),
    primaryType: z.string().optional(),
    types: z.array(z.string()).default([]),
    businessStatus: z.string().optional(),
    currentOpeningHours: z
      .object({ openNow: z.boolean().optional() })
      .passthrough()
      .optional(),
    googleMapsUri: z.string().url().optional(),
    userRatingCount: z.number().int().nonnegative().optional(),
    priceLevel: z.string().optional(),
  })
  .passthrough();

const SearchTextResponseSchema = z
  .object({ places: z.array(GooglePlaceSchema).default([]) })
  .passthrough();

type GoogleScoutVerifierOptions = {
  apiKey?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
};

/**
 * Google does not decide what is beautiful or strange here. It performs the
 * deliberately narrower second job: prove Sol's named suggestion exists,
 * replace the approximate coordinate, and attach current map metadata.
 */
export class GoogleScoutVerifier implements ScoutedPlaceVerifier {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly now: () => Date;

  constructor(options: GoogleScoutVerifierOptions = {}) {
    this.apiKey =
      options.apiKey ?? process.env.GOOGLE_MAPS_SERVER_API_KEY ?? "";
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.now = options.now ?? (() => new Date());
  }

  async verify(input: ScoutedPlaceVerificationInput) {
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
          textQuery: `${input.suggestion.name}, ${input.suggestion.locality}`,
          maxResultCount: 5,
          languageCode: input.languageCode,
          ...(input.regionCode ? { regionCode: input.regionCode } : {}),
          locationRestriction: {
            rectangle: boundingRectangle(input.origin, input.radiusMeters),
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
      const match = bestMatch(input, parsed.places);

      return match ? normalise(input, match, this.now()) : null;
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
          message: "Google Places took too long to verify a scouted place.",
          cause: error,
        });
      }

      throw new PlacesProviderError({
        providerId: PROVIDER_ID,
        operation: "verify_place",
        code: "unavailable",
        retryable: true,
        message: "Google Places could not verify a scouted place.",
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function bestMatch(
  input: ScoutedPlaceVerificationInput,
  places: z.infer<typeof GooglePlaceSchema>[],
) {
  return (
    places
      .map((place) => ({
        place,
        similarity: placeNameSimilarity(
          input.suggestion.name,
          place.displayName.text,
        ),
        fromOrigin: distanceMeters(input.origin, place.location),
        fromApproximation: distanceMeters(
          input.suggestion.approximateCoordinates,
          place.location,
        ),
      }))
      .filter(
        ({ place, similarity, fromOrigin }) =>
          similarity >= NAME_SIMILARITY_FLOOR &&
          fromOrigin <= input.radiusMeters &&
          !isUnrequestedSubplace(input.suggestion.name, place.displayName.text),
      )
      .sort(
        (first, second) =>
          second.similarity - first.similarity ||
          first.fromApproximation - second.fromApproximation,
      )[0]?.place ?? null
  );
}

function isUnrequestedSubplace(scoutedName: string, googleName: string) {
  const requested = scoutedName.toLowerCase();
  const returned = googleName.toLowerCase();

  return SUBPLACE_WORDS.some(
    (word) => returned.includes(word) && !requested.includes(word),
  );
}

function normalise(
  input: ScoutedPlaceVerificationInput,
  place: z.infer<typeof GooglePlaceSchema>,
  now: Date,
) {
  const suggestion = input.suggestion;
  const retrievedAt = now.toISOString();
  const publicExterior =
    suggestion.accessType === "public_space" ||
    suggestion.accessType === "publicly_visible_exterior";

  return parseProviderResponse(
    PlaceCandidateSchema,
    {
      provider: PROVIDER_ID,
      providerPlaceId: place.id,
      name: place.displayName.text,
      primaryCategory: suggestion.primaryCategory,
      categories: suggestion.categories,
      coordinates: place.location,
      ...(place.formattedAddress ? { address: place.formattedAddress } : {}),
      openingStatus: openingStatus(place),
      // Places has no general access field. A known public destination type is
      // evidence; a generic point-of-interest label is not permission.
      publicAccess: place.types.some((type) => PUBLIC_GOOGLE_TYPES.has(type))
        ? "yes"
        : "unknown",
      indoorOutdoor: suggestion.indoorOutdoor,
      purchaseRequired:
        suggestion.accessType === "ticketed_entry" || suggestion.commercialVenue
          ? "yes"
          : "no",
      commercialVenue: suggestion.commercialVenue,
      exteriorObservable: publicExterior,
      ...(place.userRatingCount === undefined
        ? {}
        : { reviewCount: place.userRatingCount }),
      identityVerified: true,
      landmarkSignal: suggestion.obscurity === "iconic",
      hazards: [],
      groundedFacts: [],
      visualSignals: [
        `mood-fit:${suggestion.moodFitReason}`,
        `locality:${suggestion.locality}`,
        `obscurity:${suggestion.obscurity}`,
        ...(place.primaryType ? [`google-type:${place.primaryType}`] : []),
      ],
      attributions: [
        {
          provider: "openai",
          displayName: "OpenAI GPT-5.6 Sol",
          requiredNotice: "Suggested by Sol; independently verified by Google.",
          storagePolicy: "transient" as const,
          retrievedAt,
        },
        {
          provider: "google_places",
          displayName: "Google Maps",
          ...(place.googleMapsUri ? { sourceUrl: place.googleMapsUri } : {}),
          requiredNotice: "Google",
          storagePolicy: "identifier_only" as const,
          retrievedAt,
        },
      ],
      retrievedAt,
    },
    {
      providerId: PROVIDER_ID,
      providerKind: "places",
      operation: "normalise_response",
    },
  );
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

/** Google Search Text accepts a rectangle restriction rather than a circle. */
function boundingRectangle(
  origin: ScoutedPlaceVerificationInput["origin"],
  radiusMeters: number,
) {
  const latitudeDelta = radiusMeters / 111_320;
  const longitudeScale = Math.max(
    Math.cos((origin.latitude * Math.PI) / 180),
    0.1,
  );
  const longitudeDelta = radiusMeters / (111_320 * longitudeScale);

  return {
    low: {
      latitude: Math.max(-90, origin.latitude - latitudeDelta),
      longitude: Math.max(-180, origin.longitude - longitudeDelta),
    },
    high: {
      latitude: Math.min(90, origin.latitude + latitudeDelta),
      longitude: Math.min(180, origin.longitude + longitudeDelta),
    },
  };
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

  if (status === 400) {
    return new PlacesProviderError({
      providerId: PROVIDER_ID,
      operation: "verify_place",
      code: "invalid_request",
      retryable: false,
      message: "Google Places rejected the scout verification request.",
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
    message: "Google Places could not verify a scouted place.",
  });
}
