import type {
  AdventureDayShape,
  AdventureMood,
  AdventurePartyMode,
} from "@/lib/adventure/setup-session";
import {
  filterCandidates,
  type CandidateRejection,
} from "@/lib/discovery/candidate-filters";
import { deduplicatePlaceCandidates } from "@/lib/discovery/deduplicate";
import {
  DeterministicPlaceCurator,
  type PlaceCurator,
} from "@/lib/discovery/place-curator";
import { findPockets } from "@/lib/discovery/pockets";
import { shapeCandidatePool } from "@/lib/discovery/pool-balance";
import { deriveSearchCentres } from "@/lib/discovery/search-centres";
import { getDiscoveryPolicy } from "@/lib/discovery/policy";
import { log } from "@/lib/logger";
import type { PlacesProvider } from "@/lib/providers/contracts";
import type { GeoCoordinate, PlaceCategory } from "@/lib/providers/domain";
import { WIKIDATA_CLASSES_BY_CATEGORY } from "@/lib/providers/wikidata";
import { ProviderError } from "@/lib/providers/errors";

export type DiscoverNearbyPlacesInput = {
  origin: GeoCoordinate;
  dayShape: AdventureDayShape;
  mood: AdventureMood;
  partyMode: AdventurePartyMode;
  languageCode: string;
  regionCode?: string;
};

export async function discoverNearbyPlaces({
  input,
  placesProvider,
  knowledgeProvider,
  aiCurator,
}: {
  input: DiscoverNearbyPlacesInput;
  placesProvider: PlacesProvider;
  /**
   * Finds places worth travelling to across a whole region. Optional so tests
   * and offline development can run on the proximity provider alone.
   */
  knowledgeProvider?: PlacesProvider;
  aiCurator?: PlaceCurator;
}) {
  const policy = getDiscoveryPolicy(input.dayShape, input.mood);

  /**
   * A mood that spans two kinds of place searches each side separately, so
   * that neither can take the whole result list. Each group gets an equal
   * share of the candidate budget.
   */
  const perGroupLimit = Math.max(
    1,
    Math.floor(policy.candidateLimit / policy.searchGroups.length),
  );
  const candidates = [];
  const failures: unknown[] = [];
  let searchCount = 0;
  let centreCount = 0;

  for (const categories of policy.searchGroups) {
    const knowledgeCategories = knowledgeProvider
      ? categories.filter(isKnowledgeBacked)
      : [];
    // Two questions, two sources.
    //
    // "What here is worth a day" is answered by a knowledge source in one
    // query across the whole region, because notability is a property of the
    // place. "What food is near this point" can only be answered by a
    // proximity search, because no encyclopaedia describes a good litti chokha
    // stall — so that side still sweeps.
    const proximityCategories = categories.filter(
      (category) => !knowledgeCategories.includes(category),
    );

    if (knowledgeProvider && knowledgeCategories.length > 0) {
      searchCount += 1;

      try {
        candidates.push(
          ...(await knowledgeProvider.nearby({
            origin: input.origin,
            radiusMeters: policy.reachMeters,
            maxResults: policy.candidateLimit,
            categories: knowledgeCategories,
            languageCode: input.languageCode,
            ...(input.regionCode ? { regionCode: input.regionCode } : {}),
          })),
        );
      } catch (error) {
        failures.push(error);
        logSearchFailure(error, knowledgeProvider, knowledgeCategories, input);
      }
    }

    if (proximityCategories.length === 0) {
      continue;
    }

    // Only the proximity side needs a sweep, and only within reach of the
    // player rather than across the region.
    const centres = deriveSearchCentres(input.origin, policy.sweep);
    centreCount = Math.max(centreCount, centres.length);

    for (const centre of centres) {
      searchCount += 1;

      try {
        candidates.push(
          ...(await placesProvider.nearby({
            origin: centre,
            radiusMeters: policy.searchRadiusMeters,
            maxResults: perGroupLimit,
            categories: proximityCategories,
            languageCode: input.languageCode,
            rankBy: policy.rankBy,
            ...(input.regionCode ? { regionCode: input.regionCode } : {}),
          })),
        );
      } catch (error) {
        failures.push(error);
        logSearchFailure(error, placesProvider, proximityCategories, input);
      }
    }
  }

  // A sweep is expected to lose some searches at the edges of a city, where a
  // centre may fall in water or open country. Only a total failure means we
  // know nothing about this area and must say so rather than pretend.
  if (failures.length === searchCount) {
    throw failures[0];
  }

  const deduplicated = deduplicatePlaceCandidates(candidates);
  // Filters run before curation so that no AI response can reinstate a
  // candidate the deterministic rules rejected.
  const { accepted, rejected } = filterCandidates(deduplicated);

  // Clustering runs before the category cap, and the order matters.
  //
  // Capping the whole city first kept only the most significant places, and
  // significance concentrates in the centre: a seventy-four place sweep of
  // Panjim collapsed to a single pocket because every outlying place had
  // already been cut. Pockets are about where a day can be walked, so they are
  // formed from everything that survived the safety filters.
  const pockets = findPockets(accepted, policy.pocket).map((pocket) => ({
    ...pocket,
    // The cap then applies inside each pocket, which is what the player
    // actually experiences. One category dominating a pocket is the problem;
    // one category dominating a city is not something a player ever sees.
    places: shapeCandidatePool(pocket.places, pocket.centre, policy.poolShape),
  }));
  const uniqueCandidates = pockets.flatMap((pocket) => pocket.places);

  if (rejected.length > 0) {
    log("info", "places_candidates_rejected", {
      rejected_count: rejected.length,
      retrieved_count: deduplicated.length,
      reasons: summariseReasons(rejected),
      location_cell: coarseLocationCell(input.origin),
    });
  }

  const deterministicCurator = new DeterministicPlaceCurator();
  let selectionMethod: "sol" | "deterministic" = "deterministic";
  let selectedIds: string[];

  if (aiCurator && uniqueCandidates.length > 1) {
    try {
      selectedIds = await aiCurator.curate({
        candidates: uniqueCandidates,
        origin: input.origin,
        mood: input.mood,
        partyMode: input.partyMode,
        limit: policy.shortlistLimit,
        preferObscure: policy.preferObscure,
      });

      if (selectedIds.length === 0) {
        throw new Error("AI returned no usable place IDs.");
      }

      selectionMethod = "sol";
    } catch {
      log("warn", "place_curation_fallback", {
        candidate_count: uniqueCandidates.length,
        location_cell: coarseLocationCell(input.origin),
      });
      selectedIds = await deterministicCurator.curate({
        candidates: uniqueCandidates,
        origin: input.origin,
        mood: input.mood,
        partyMode: input.partyMode,
        limit: policy.shortlistLimit,
        preferObscure: policy.preferObscure,
      });
    }
  } else {
    selectedIds = await deterministicCurator.curate({
      candidates: uniqueCandidates,
      origin: input.origin,
      mood: input.mood,
      partyMode: input.partyMode,
      limit: policy.shortlistLimit,
      preferObscure: policy.preferObscure,
    });
  }

  const byId = new Map(
    uniqueCandidates.map((candidate) => [candidate.providerPlaceId, candidate]),
  );

  const places = selectedIds.flatMap((placeId) => {
    const place = byId.get(placeId);
    return place ? [place] : [];
  });

  log("info", "places_discovery_completed", {
    selection_method: selectionMethod,
    ai_curator_configured: Boolean(aiCurator),
    retrieved_count: deduplicated.length,
    candidate_count: uniqueCandidates.length,
    rejected_count: rejected.length,
    selected_count: places.length,
    search_radius_meters: policy.searchRadiusMeters,
    // The cost of a generated day has to be a measured number, not an
    // estimate: the sweep multiplies provider calls, and this is what decides
    // whether the unlock price works.
    search_count: searchCount,
    failed_search_count: failures.length,
    centre_count: centreCount,
    pocket_count: pockets.length,
    pocketed_place_count: pockets.reduce(
      (total, pocket) => total + pocket.places.length,
      0,
    ),
    day_shape: input.dayShape,
    mood: input.mood,
    location_cell: coarseLocationCell(input.origin),
  });

  return {
    searchRadiusMeters: policy.searchRadiusMeters,
    reachMeters: policy.reachMeters,
    centreCount,
    searchCount,
    failedSearchCount: failures.length,
    rankBy: policy.rankBy,
    retrievedCount: deduplicated.length,
    candidateCount: uniqueCandidates.length,
    selectionMethod,
    /** Everything that survived the filters, whether or not it was selected. */
    candidates: uniqueCandidates,
    /** The walkable neighbourhoods a day can actually be built from. */
    pockets,
    places,
    rejected,
  };
}

/** A mood category a knowledge source can answer for a whole region. */
function isKnowledgeBacked(category: PlaceCategory) {
  return WIKIDATA_CLASSES_BY_CATEGORY[category].length > 0;
}

function logSearchFailure(
  error: unknown,
  provider: PlacesProvider,
  categories: PlaceCategory[],
  input: DiscoverNearbyPlacesInput,
) {
  log("error", "places_discovery_failed", {
    provider:
      error instanceof ProviderError
        ? error.providerId
        : provider.descriptor.id,
    code: error instanceof ProviderError ? error.code : "unknown",
    retryable: error instanceof ProviderError ? error.retryable : false,
    categories: categories.join(","),
    location_cell: coarseLocationCell(input.origin),
  });
}

function summariseReasons(rejections: CandidateRejection[]) {
  const counts = new Map<string, number>();

  for (const rejection of rejections) {
    counts.set(rejection.reason, (counts.get(rejection.reason) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([reason, count]) => `${reason}:${count}`)
    .join(",");
}

function coarseLocationCell(location: GeoCoordinate) {
  return `${location.latitude.toFixed(1)},${location.longitude.toFixed(1)}`;
}
