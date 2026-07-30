import { z } from "zod";
import type { PlacesProvider } from "@/lib/providers/contracts";
import {
  NearbyPlacesInputSchema,
  PlaceCandidateSchema,
  type NearbyPlacesInput,
  type PlaceCandidate,
} from "@/lib/providers/domain";
import { PlacesProviderError } from "@/lib/providers/errors";
import {
  googleTypesForCategories,
  mapGoogleTypesToCategories,
} from "@/lib/providers/google/place-types";
import { parseProviderResponse } from "@/lib/providers/validation";

const PROVIDER_ID = "google_places_new";
const ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";
const RESULT_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 6_000;
/**
 * `userRatingCount` and `priceLevel` move this request into a costlier Google
 * SKU tier. They earn it: review count is the only signal available for "off
 * the beaten track", and price level is the only direct evidence of whether a
 * place expects a purchase. Everything else here is already paid for.
 */
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
    displayName: z
      .object({
        text: z.string().trim().min(1),
      })
      .passthrough(),
    formattedAddress: z.string().trim().min(1).optional(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    primaryType: z.string().optional(),
    types: z.array(z.string()).default([]),
    businessStatus: z.string().optional(),
    currentOpeningHours: z
      .object({
        openNow: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    googleMapsUri: z.string().url().optional(),
    userRatingCount: z.number().int().nonnegative().optional(),
    priceLevel: z.string().optional(),
  })
  .passthrough();

const GoogleNearbyResponseSchema = z
  .object({
    places: z.array(GooglePlaceSchema).default([]),
  })
  .passthrough();

type GooglePlacesProviderOptions = {
  apiKey?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
};

export class GooglePlacesProvider implements PlacesProvider {
  readonly descriptor = {
    id: PROVIDER_ID,
    kind: "places" as const,
    name: "Google Places API (New)",
    status: "ready" as const,
  };

  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly now: () => Date;

  constructor(options: GooglePlacesProviderOptions = {}) {
    this.apiKey =
      options.apiKey ?? process.env.GOOGLE_MAPS_SERVER_API_KEY ?? "";
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.now = options.now ?? (() => new Date());
  }

  async nearby(input: NearbyPlacesInput): Promise<PlaceCandidate[]> {
    const parsedInput = NearbyPlacesInputSchema.safeParse(input);

    if (!parsedInput.success) {
      throw new PlacesProviderError({
        providerId: PROVIDER_ID,
        operation: "nearby_places",
        code: "invalid_request",
        retryable: false,
        message: "Nearby-place request is invalid.",
        cause: parsedInput.error,
      });
    }

    if (!this.apiKey) {
      throw new PlacesProviderError({
        providerId: PROVIDER_ID,
        operation: "nearby_places",
        code: "not_configured",
        retryable: false,
        message: "Google Places is not configured.",
      });
    }

    const request = parsedInput.data;
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
          languageCode: request.languageCode,
          ...(request.regionCode ? { regionCode: request.regionCode } : {}),
          includedTypes: googleTypesForCategories(request.categories),
          maxResultCount: Math.min(request.maxResults, RESULT_LIMIT),
          locationRestriction: {
            circle: {
              center: request.origin,
              radius: request.radiusMeters,
            },
          },
          rankPreference:
            request.rankBy === "distance" ? "DISTANCE" : "POPULARITY",
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw googleHttpError(response.status);
      }

      const rawResponse: unknown = await response.json();
      const googleResponse = parseProviderResponse(
        GoogleNearbyResponseSchema,
        rawResponse,
        {
          providerId: PROVIDER_ID,
          providerKind: "places",
          operation: "nearby_places",
        },
      );

      return googleResponse.places
        .map((place) => this.normalise(place, request))
        .filter((place): place is PlaceCandidate => place !== null)
        .slice(0, request.maxResults);
    } catch (error) {
      if (error instanceof PlacesProviderError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new PlacesProviderError({
          providerId: PROVIDER_ID,
          operation: "nearby_places",
          code: "timeout",
          retryable: true,
          message: "Google Places took too long to respond.",
          cause: error,
        });
      }

      throw new PlacesProviderError({
        providerId: PROVIDER_ID,
        operation: "nearby_places",
        code: "unavailable",
        retryable: true,
        message: "Google Places is temporarily unavailable.",
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalise(
    place: z.infer<typeof GooglePlaceSchema>,
    input: NearbyPlacesInput,
  ): PlaceCandidate | null {
    const googleTypes = [
      ...(place.primaryType ? [place.primaryType] : []),
      ...place.types,
    ];
    const categories = mapGoogleTypesToCategories(
      googleTypes,
      input.categories,
    );

    if (categories.length === 0) {
      return null;
    }

    const retrievedAt = this.now().toISOString();
    const candidate = {
      provider: PROVIDER_ID,
      providerPlaceId: place.id,
      name: place.displayName.text,
      primaryCategory: categories[0],
      categories,
      coordinates: place.location,
      ...(place.formattedAddress ? { address: place.formattedAddress } : {}),
      openingStatus: openingStatus(place),
      publicAccess: publicAccess(categories),
      indoorOutdoor: indoorOutdoor(categories),
      purchaseRequired: purchaseRequired(categories, place.priceLevel),
      commercialVenue: categories.some((category) =>
        ["culinary", "market"].includes(category),
      ),
      exteriorObservable: exteriorObservable(categories),
      ...(place.userRatingCount === undefined
        ? {}
        : { reviewCount: place.userRatingCount }),
      hazards: [],
      groundedFacts: [],
      visualSignals: googleTypes.slice(0, 20),
      attributions: [
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
    };

    return parseProviderResponse(PlaceCandidateSchema, candidate, {
      providerId: PROVIDER_ID,
      providerKind: "places",
      operation: "normalise_response",
    });
  }
}

function openingStatus(place: z.infer<typeof GooglePlaceSchema>) {
  // Only CLOSED_PERMANENTLY means the place is gone. Treating every
  // non-operational status as permanent discarded the Immaculate Conception
  // Church, Panjim's cathedral and its most photographed building, on the
  // strength of a CLOSED_TEMPORARILY flag.
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

/**
 * Places API (New) has no field describing whether the public may approach a
 * place, so these three properties were previously hardcoded to "unknown".
 * That made every candidate fail WF-202a's "unknown is not permission" rule,
 * which would have rejected the entire world while looking healthy in logs.
 *
 * Category is a weaker signal than a real access field, but it is a genuine
 * one and it is honest about its limits: anything outside these known-safe
 * shapes still returns "unknown" rather than guessing permission.
 */
const PUBLICLY_APPROACHABLE: PlaceCandidate["categories"] = [
  "garden",
  "heritage",
  "architecture",
  "public_art",
  "viewpoint",
  "waterfront",
  "religious",
  "civic",
  "market",
];

function publicAccess(categories: PlaceCandidate["categories"]) {
  if (categories.some((category) => PUBLICLY_APPROACHABLE.includes(category))) {
    return "yes" as const;
  }

  if (categories.includes("culinary") || categories.includes("museum")) {
    return "yes" as const;
  }

  return "unknown" as const;
}

/**
 * Wanderfound never requires a purchase, so this describes whether reaching
 * the *discovery* costs money, not whether the venue sells anything. A bakery
 * window, a museum facade and a market entrance are all observable for free;
 * only a reported price level on a place with no free exterior reading counts
 * against it.
 */
function purchaseRequired(
  categories: PlaceCandidate["categories"],
  priceLevel: string | undefined,
) {
  if (exteriorObservable(categories)) {
    return "no" as const;
  }

  if (priceLevel && priceLevel !== "PRICE_LEVEL_FREE") {
    return "yes" as const;
  }

  return "unknown" as const;
}

/**
 * Whether the discovery can be made from public ground. A church closed for
 * the evening still has a carved door and a facade, and Goan evenings are
 * exactly when travellers have unplanned time, so exterior-observable places
 * stay playable after closing.
 */
function exteriorObservable(categories: PlaceCandidate["categories"]) {
  return categories.some((category) =>
    [
      "garden",
      "heritage",
      "architecture",
      "public_art",
      "viewpoint",
      "waterfront",
      "religious",
      "civic",
      "market",
      "culinary",
    ].includes(category),
  );
}

function indoorOutdoor(categories: PlaceCandidate["categories"]) {
  if (
    categories.some((category) =>
      ["garden", "viewpoint", "waterfront", "public_art"].includes(category),
    )
  ) {
    return "outdoor" as const;
  }

  if (
    categories.some((category) => ["museum", "culinary"].includes(category))
  ) {
    return "indoor" as const;
  }

  if (categories.includes("religious")) {
    return "mixed" as const;
  }

  return "unknown" as const;
}

function googleHttpError(status: number) {
  if (status === 400) {
    return new PlacesProviderError({
      providerId: PROVIDER_ID,
      operation: "nearby_places",
      code: "invalid_request",
      retryable: false,
      message: "Google Places rejected the search request.",
    });
  }

  if (status === 401 || status === 403) {
    return new PlacesProviderError({
      providerId: PROVIDER_ID,
      operation: "nearby_places",
      code: "authentication_failed",
      retryable: false,
      message: "Google Places credentials were rejected.",
    });
  }

  if (status === 429) {
    return new PlacesProviderError({
      providerId: PROVIDER_ID,
      operation: "nearby_places",
      code: "rate_limited",
      retryable: true,
      message: "Google Places rate limit was reached.",
    });
  }

  return new PlacesProviderError({
    providerId: PROVIDER_ID,
    operation: "nearby_places",
    code: "unavailable",
    retryable: status >= 500,
    message: "Google Places could not complete the request.",
  });
}
