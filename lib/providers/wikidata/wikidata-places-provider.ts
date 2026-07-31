import { z } from "zod";
import type { PlacesProvider } from "@/lib/providers/contracts";
import {
  NearbyPlacesInputSchema,
  PlaceCandidateSchema,
  type NearbyPlacesInput,
  type PlaceCandidate,
  type PlaceCategory,
} from "@/lib/providers/domain";
import { PlacesProviderError } from "@/lib/providers/errors";
import {
  categoryForWikidataClass,
  wikidataClassesForCategories,
} from "@/lib/providers/wikidata/wikidata-types";
import { parseProviderResponse } from "@/lib/providers/validation";

const PROVIDER_ID = "wikidata";
const ENDPOINT = "https://query.wikidata.org/sparql";
const DEFAULT_TIMEOUT_MS = 25_000;

/**
 * Wikidata asks for a descriptive agent so maintainers can contact heavy users.
 * Identifying the product honestly is a condition of using a free service.
 */
const USER_AGENT =
  "Wanderfound/0.1 (https://wanderfound.vercel.app; contact via repository)";

const BindingSchema = z.object({
  item: z.object({ value: z.string().url() }),
  itemLabel: z.object({ value: z.string().trim().min(1) }),
  lat: z.object({ value: z.string() }),
  lon: z.object({ value: z.string() }),
  cls: z.object({ value: z.string().url() }),
  links: z.object({ value: z.string() }),
  heritage: z.object({ value: z.string() }).optional(),
});

const SparqlResponseSchema = z.object({
  results: z.object({
    bindings: z.array(BindingSchema.passthrough()).default([]),
  }),
});

type WikidataPlacesProviderOptions = {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
};

/**
 * Finds the places in a region that somebody would actually travel to see.
 *
 * This exists because a proximity search cannot answer that question. Google
 * Nearby Search returns what is close to a point, so a search centred on
 * residential Dwarka honestly returns home bakeries, a pickle store and an
 * apartment-block shrine. Widening the radius does not help, and sweeping a
 * region the size of Delhi with paid searches is unaffordable.
 *
 * Wikidata inverts it: one free query covers tens of kilometres and returns
 * only places an encyclopaedia editor thought worth describing. Notability
 * becomes evidence — how many language editions of Wikipedia carry an article —
 * rather than a review count that a home business can accumulate.
 *
 * It is deliberately thin on food, and does not pretend otherwise; culinary
 * places come from Google inside a pocket this provider found.
 */
export class WikidataPlacesProvider implements PlacesProvider {
  readonly descriptor = {
    id: PROVIDER_ID,
    kind: "places" as const,
    name: "Wikidata",
    status: "ready" as const,
  };

  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly now: () => Date;

  constructor(options: WikidataPlacesProviderOptions = {}) {
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

    const request = parsedInput.data;
    const classes = wikidataClassesForCategories(request.categories);

    // Asking for no classes would return the whole of Wikidata inside the
    // radius. A mood with no knowledge-backed categories simply has nothing
    // here, and says so.
    if (classes.length === 0) {
      return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(
        `${ENDPOINT}?${new URLSearchParams({
          query: buildQuery(request, classes),
          format: "json",
        })}`,
        {
          headers: {
            Accept: "application/sparql-results+json",
            "User-Agent": USER_AGENT,
          },
          cache: "no-store",
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw httpError(response.status);
      }

      const raw: unknown = await response.json();
      const parsed = parseProviderResponse(SparqlResponseSchema, raw, {
        providerId: PROVIDER_ID,
        providerKind: "places",
        operation: "nearby_places",
      });

      return dedupeByItem(parsed.results.bindings)
        .map((binding) => this.normalise(binding, request))
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
          message: "Wikidata took too long to respond.",
          cause: error,
        });
      }

      throw new PlacesProviderError({
        providerId: PROVIDER_ID,
        operation: "nearby_places",
        code: "unavailable",
        retryable: true,
        message: "Wikidata is temporarily unavailable.",
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalise(
    binding: z.infer<typeof BindingSchema>,
    request: NearbyPlacesInput,
  ): PlaceCandidate | null {
    const wikidataClass = idFromUri(binding.cls.value);
    const category = categoryForWikidataClass(wikidataClass);

    if (!category || !request.categories.includes(category)) {
      return null;
    }

    const latitude = Number(binding.lat.value);
    const longitude = Number(binding.lon.value);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const id = idFromUri(binding.item.value);
    // A label that is still a Q-number means Wikidata has no name for this in
    // the requested language, and an unnamed place cannot carry a clue.
    if (/^Q\d+$/.test(binding.itemLabel.value)) {
      return null;
    }

    const retrievedAt = this.now().toISOString();
    const candidate = {
      provider: PROVIDER_ID,
      providerPlaceId: id,
      name: binding.itemLabel.value,
      primaryCategory: category,
      categories: [category] satisfies PlaceCategory[],
      coordinates: { latitude, longitude },
      openingStatus: "unknown" as const,
      // Everything this provider returns is a public monument, museum, park or
      // place of worship. Google verifies the detail later.
      publicAccess: "yes" as const,
      indoorOutdoor: indoorOutdoor(category),
      purchaseRequired: "unknown" as const,
      commercialVenue: false,
      exteriorObservable: true,
      // Being described in an encyclopaedia is the landmark signal.
      landmarkSignal: true,
      sitelinkCount: Number(binding.links.value) || 0,
      hazards: [],
      groundedFacts: [],
      // The class is what there is to look at: a tomb, a stepwell, a city
      // gate. Google's provider records its types here for the same reason,
      // and a candidate with nothing observable is rejected outright.
      visualSignals: [wikidataClass, category],
      attributions: [
        {
          provider: PROVIDER_ID,
          displayName: "Wikidata",
          sourceUrl: binding.item.value,
          licenseName: "CC0-1.0",
          requiredNotice: "Data from Wikidata, available under CC0.",
          storagePolicy: "permitted" as const,
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

/**
 * Ranked by how many language editions describe the place, which is the
 * closest thing to "worth travelling for" that exists as data.
 */
function buildQuery(request: NearbyPlacesInput, classes: string[]) {
  const values = classes.map((id) => `wd:${id}`).join(" ");
  const radiusKm = request.radiusMeters / 1_000;

  // `wikibase:sitelinks` is a materialised count on the item itself. Counting
  // the links by joining and grouping instead is the same answer arrived at
  // expensively, and timed out at metropolitan radii.
  return `SELECT ?item ?itemLabel ?lat ?lon ?cls ?links WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(${request.origin.longitude} ${request.origin.latitude})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "${radiusKm}" .
  }
  ?item wdt:P31 ?cls .
  VALUES ?cls { ${values} }
  ?item wikibase:sitelinks ?links .
  ?item p:P625/psv:P625 ?node .
  ?node wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${request.languageCode},en" }
}
ORDER BY DESC(?links)
LIMIT ${Math.min(request.maxResults * 3, 300)}`;
}

/**
 * An item instantiating several matched classes appears once per class. Keep
 * the first, which the ordering has already made the best-attested.
 */
function dedupeByItem(bindings: z.infer<typeof BindingSchema>[]) {
  const seen = new Set<string>();

  return bindings.filter((binding) => {
    const id = idFromUri(binding.item.value);

    if (seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

function idFromUri(uri: string) {
  return uri.slice(uri.lastIndexOf("/") + 1);
}

function indoorOutdoor(category: PlaceCategory) {
  if (["garden", "public_art", "waterfront", "viewpoint"].includes(category)) {
    return "outdoor" as const;
  }

  if (["museum", "civic"].includes(category)) {
    return "indoor" as const;
  }

  return "mixed" as const;
}

function httpError(status: number) {
  if (status === 429) {
    return new PlacesProviderError({
      providerId: PROVIDER_ID,
      operation: "nearby_places",
      code: "rate_limited",
      retryable: true,
      message: "Wikidata rate limit was reached.",
    });
  }

  return new PlacesProviderError({
    providerId: PROVIDER_ID,
    operation: "nearby_places",
    code: status >= 500 ? "unavailable" : "invalid_request",
    retryable: status >= 500,
    message: "Wikidata could not complete the query.",
  });
}
