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
import { deriveEnrichmentCentres } from "@/lib/discovery/enrichment-centres";
import {
  DeterministicPlaceCurator,
  type PlaceCurator,
} from "@/lib/discovery/place-curator";
import { findPockets } from "@/lib/discovery/pockets";
import { routePockets, type RoutedPocket } from "@/lib/discovery/route-pockets";
import { verifySelectedPlaces } from "@/lib/discovery/verify-places";
import { shapeCandidatePool } from "@/lib/discovery/pool-balance";
import { deriveSearchCentres } from "@/lib/discovery/search-centres";
import { getDiscoveryPolicy } from "@/lib/discovery/policy";
import {
  SOL_SCOUT_RADIUS_METRES,
  type PlaceScout,
  type ScoutedPlaceVerifier,
} from "@/lib/discovery/place-scout";
import { log } from "@/lib/logger";
import type {
  PlacesProvider,
  PlaceVerifier,
  RoutingProvider,
} from "@/lib/providers/contracts";
import type {
  GeoCoordinate,
  PlaceCandidate,
  PlaceCategory,
} from "@/lib/providers/domain";
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
  placeVerifier,
  aiCurator,
  placeScout,
  scoutedPlaceVerifier,
  routingProvider,
}: {
  input: DiscoverNearbyPlacesInput;
  placesProvider: PlacesProvider;
  /**
   * Finds places worth travelling to across a whole region. Optional so tests
   * and offline development can run on the proximity provider alone.
   */
  knowledgeProvider?: PlacesProvider;
  /** Confirms hours, access and position for the places a trail selected. */
  placeVerifier?: PlaceVerifier;
  aiCurator?: PlaceCurator;
  /** Sol proposes mood-perfect places before any map database shapes the list. */
  placeScout?: PlaceScout;
  /** Google proves each Sol proposal exists and supplies its exact map point. */
  scoutedPlaceVerifier?: ScoutedPlaceVerifier;
  /** Proves clustered map pins are connected by real pedestrian routes. */
  routingProvider?: RoutingProvider;
}) {
  const policy = getDiscoveryPolicy(input.dayShape, input.mood);

  if (placeScout && scoutedPlaceVerifier) {
    return discoverFromSolScout({
      input,
      policy,
      placeScout,
      scoutedPlaceVerifier,
      routingProvider,
    });
  }

  /**
   * A mood that spans two kinds of place searches each side separately, so
   * that neither can take the whole result list. Each group gets an equal
   * share of the candidate budget.
   */
  const perGroupLimit = Math.max(
    1,
    Math.floor(policy.candidateLimit / policy.searchGroups.length),
  );
  const candidates: Awaited<ReturnType<PlacesProvider["nearby"]>> = [];
  const knowledgeCandidates: Awaited<ReturnType<PlacesProvider["nearby"]>> = [];
  const searchPlans: Array<{
    categories: PlaceCategory[];
    proximityCategories: PlaceCategory[];
  }> = [];
  const failures: unknown[] = [];
  let searchCount = 0;
  let centreCount = 0;

  // First ask the regional question for every side of the mood. The resulting
  // anchors decide where paid proximity searches happen in the second pass.
  // Doing both inside one loop used to search for food around the player even
  // after Wikidata had identified worthwhile neighbourhoods across the city.
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
    searchPlans.push({ categories, proximityCategories });

    if (knowledgeProvider && knowledgeCategories.length > 0) {
      searchCount += 1;

      try {
        const found = await knowledgeProvider.nearby({
          origin: input.origin,
          radiusMeters: policy.reachMeters,
          maxResults: policy.candidateLimit,
          categories: knowledgeCategories,
          languageCode: input.languageCode,
          ...(input.regionCode ? { regionCode: input.regionCode } : {}),
        });
        candidates.push(...found);
        knowledgeCandidates.push(...found);
      } catch (error) {
        failures.push(error);
        logSearchFailure(error, knowledgeProvider, knowledgeCategories, input);
      }
    }
  }

  const uniqueKnowledgeCandidates =
    deduplicatePlaceCandidates(knowledgeCandidates);
  const acceptedKnowledgeCandidates = filterCandidates(
    uniqueKnowledgeCandidates,
  ).accepted;
  const knowledgeAlreadyFormsPockets =
    findPockets(acceptedKnowledgeCandidates, policy.pocket).length > 0;
  const anchorCentres = deriveEnrichmentCentres(acceptedKnowledgeCandidates, {
    pocket: policy.pocket,
    limit: policy.enrichmentCentreLimit,
    // Neighbouring searches overlap by design, but two centres closer than
    // two radii mostly buy the same result list twice.
    minSeparationMetres: policy.searchRadiusMeters * 2,
  });

  for (const plan of searchPlans) {
    // A group with a category Wikidata cannot answer (most importantly food)
    // always needs proximity enrichment. A fully knowledge-backed mood needs
    // it only when the anchors do not yet form a walkable pocket by themselves.
    const proximityCategories =
      plan.proximityCategories.length > 0
        ? plan.proximityCategories
        : knowledgeProvider && !knowledgeAlreadyFormsPockets
          ? plan.categories
          : [];

    if (proximityCategories.length === 0) {
      continue;
    }

    // Knowledge anchors are the correct centres. The geometric sweep around
    // the player remains the fallback for offline tests, a provider outage, or
    // a mood for which the knowledge source found nothing.
    const centres =
      anchorCentres.length > 0
        ? anchorCentres
        : deriveSearchCentres(input.origin, policy.sweep);
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
  const sourceNames = [
    ...new Set(
      deduplicated.flatMap((candidate) =>
        candidate.attributions.map((source) => source.displayName),
      ),
    ),
  ];
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
  const clusteredPockets = findPockets(accepted, policy.pocket).map(
    (pocket) => ({
      ...pocket,
      // The cap then applies inside each pocket, which is what the player
      // actually experiences. One category dominating a pocket is the problem;
      // one category dominating a city is not something a player ever sees.
      places: shapeCandidatePool(
        pocket.places,
        pocket.centre,
        policy.poolShape,
      ),
    }),
  );
  const routedPockets = routingProvider
    ? await routePockets({
        pockets: clusteredPockets,
        routingProvider,
        languageCode: input.languageCode,
        ...(input.regionCode ? { regionCode: input.regionCode } : {}),
      })
    : undefined;
  const pockets = routedPockets
    ? usableRoutedPockets(routedPockets)
    : clusteredPockets;
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

  const selected = selectedIds.flatMap((placeId) => {
    const place = byId.get(placeId);
    return place ? [place] : [];
  });

  // Verification runs last, on the shortlist only. A knowledge source knows
  // what a place is and nothing about whether it is open today, and checking
  // every candidate would cost a call each for places nobody visits.
  const verification = await verifySelectedPlaces({
    places: selected,
    ...(placeVerifier ? { verifier: placeVerifier } : {}),
  });
  const places = verification.places;

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
    routing_ready_pocket_count: countRoutingStatus(routedPockets, "ready"),
    routing_rejected_pocket_count:
      countRoutingStatus(routedPockets, "unrouteable") +
      countRoutingStatus(routedPockets, "excessive"),
    routing_unavailable_pocket_count: countRoutingStatus(
      routedPockets,
      "unavailable",
    ),
    pocketed_place_count: pockets.reduce(
      (total, pocket) => total + pocket.places.length,
      0,
    ),
    verified_count: verification.verifiedCount,
    matched_count: verification.matchedCount,
    verification_dropped_count: verification.dropped.length,
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
    sourceNames,
    candidateCount: uniqueCandidates.length,
    selectionMethod,
    /** Everything that survived the filters, whether or not it was selected. */
    candidates: uniqueCandidates,
    /** The walkable neighbourhoods a day can actually be built from. */
    pockets,
    routing: summariseRouting(routedPockets),
    places,
    verification,
    rejected,
  };
}

async function discoverFromSolScout({
  input,
  policy,
  placeScout,
  scoutedPlaceVerifier,
  routingProvider,
}: {
  input: DiscoverNearbyPlacesInput;
  policy: ReturnType<typeof getDiscoveryPolicy>;
  placeScout: PlaceScout;
  scoutedPlaceVerifier: ScoutedPlaceVerifier;
  routingProvider?: RoutingProvider;
}) {
  const scout = await placeScout.scout({
    origin: input.origin,
    radiusMeters: SOL_SCOUT_RADIUS_METRES,
    mood: input.mood,
    dayShape: input.dayShape,
    partyMode: input.partyMode,
    languageCode: input.languageCode,
    ...(input.regionCode ? { regionCode: input.regionCode } : {}),
    targetCount: Math.min(policy.shortlistLimit + 4, 14),
  });

  // Verification is deliberately the second stage. Google never gets to
  // decide what "beautiful" or "strange" means; it only confirms that each
  // named Sol suggestion is real, current and inside the allowed city radius.
  const outcomes = await Promise.allSettled(
    scout.suggestions.map((suggestion) =>
      scoutedPlaceVerifier.verify({
        suggestion,
        origin: input.origin,
        radiusMeters: SOL_SCOUT_RADIUS_METRES,
        languageCode: input.languageCode,
        ...(input.regionCode ? { regionCode: input.regionCode } : {}),
      }),
    ),
  );
  const failed = outcomes.filter(
    (outcome): outcome is PromiseRejectedResult =>
      outcome.status === "rejected",
  );
  const verified = deduplicatePlaceCandidates(
    outcomes.flatMap((outcome) =>
      outcome.status === "fulfilled" && outcome.value ? [outcome.value] : [],
    ),
  );

  if (verified.length === 0 && failed.length === outcomes.length && failed[0]) {
    throw failed[0].reason;
  }

  const { accepted, rejected } = filterCandidates(verified);
  const clusteredPockets = findPockets(accepted, policy.pocket).map(
    (pocket) => ({
      ...pocket,
      places: shapeCandidatePool(
        pocket.places,
        pocket.centre,
        policy.poolShape,
      ),
    }),
  );
  const routedPockets = routingProvider
    ? await routePockets({
        pockets: clusteredPockets,
        routingProvider,
        languageCode: input.languageCode,
        ...(input.regionCode ? { regionCode: input.regionCode } : {}),
      })
    : undefined;
  const pockets = routedPockets
    ? usableRoutedPockets(routedPockets)
    : clusteredPockets;
  const routedIds = new Set(
    pockets.flatMap((pocket) =>
      pocket.places.map((place) => place.providerPlaceId),
    ),
  );
  const routeEligibleCandidates = routingProvider
    ? accepted.filter((candidate) => routedIds.has(candidate.providerPlaceId))
    : accepted;
  const places = selectAcrossLocalities(
    routeEligibleCandidates,
    policy.shortlistLimit,
  );
  const sourceNames = ["OpenAI GPT-5.6 Sol", "Google Maps"];
  const matchedCount = verified.length;
  const failedCount = failed.length;
  const unmatchedCount = outcomes.length - matchedCount - failedCount;

  log("info", "places_discovery_completed", {
    selection_method: "sol_scout_google_verified",
    ai_curator_configured: true,
    retrieved_count: scout.suggestions.length,
    candidate_count: accepted.length,
    rejected_count: rejected.length,
    selected_count: places.length,
    search_radius_meters: SOL_SCOUT_RADIUS_METRES,
    search_count: 1 + scout.suggestions.length,
    failed_search_count: failedCount,
    centre_count: distinctLocalityCount(accepted),
    pocket_count: pockets.length,
    routing_ready_pocket_count: countRoutingStatus(routedPockets, "ready"),
    routing_rejected_pocket_count:
      countRoutingStatus(routedPockets, "unrouteable") +
      countRoutingStatus(routedPockets, "excessive"),
    routing_unavailable_pocket_count: countRoutingStatus(
      routedPockets,
      "unavailable",
    ),
    pocketed_place_count: pockets.reduce(
      (total, pocket) => total + pocket.places.length,
      0,
    ),
    verified_count: outcomes.length - failedCount,
    matched_count: matchedCount,
    verification_dropped_count: rejected.length + unmatchedCount,
    day_shape: input.dayShape,
    mood: input.mood,
    area_label: scout.areaLabel,
    location_cell: coarseLocationCell(input.origin),
  });

  return {
    searchRadiusMeters: SOL_SCOUT_RADIUS_METRES,
    reachMeters: SOL_SCOUT_RADIUS_METRES,
    centreCount: distinctLocalityCount(accepted),
    searchCount: 1 + scout.suggestions.length,
    failedSearchCount: failedCount,
    rankBy: "semantic" as const,
    retrievedCount: scout.suggestions.length,
    sourceNames,
    candidateCount: routeEligibleCandidates.length,
    selectionMethod: "sol" as const,
    candidates: routeEligibleCandidates,
    pockets,
    routing: summariseRouting(routedPockets),
    places,
    verification: {
      places,
      dropped: [],
      verifiedCount: outcomes.length - failedCount,
      matchedCount,
      failedCount,
    },
    rejected,
  };
}

/**
 * When Google answered, only routeable pockets may reach the player. When the
 * provider itself failed for every pocket we preserve the verified candidates
 * but label them unavailable, allowing the UI to retry without lying.
 */
function usableRoutedPockets(pockets: RoutedPocket[]) {
  const ready = pockets.filter((pocket) => pocket.routing.status === "ready");
  if (ready.length > 0) return ready;
  if (pockets.every((pocket) => pocket.routing.status === "unavailable")) {
    return pockets;
  }
  return [];
}

function countRoutingStatus(
  pockets: RoutedPocket[] | undefined,
  status: RoutedPocket["routing"]["status"],
) {
  return (
    pockets?.filter((pocket) => pocket.routing.status === status).length ?? 0
  );
}

function summariseRouting(pockets: RoutedPocket[] | undefined) {
  return {
    checked: Boolean(pockets),
    readyPocketCount: countRoutingStatus(pockets, "ready"),
    rejectedPocketCount:
      countRoutingStatus(pockets, "unrouteable") +
      countRoutingStatus(pockets, "excessive"),
    unavailablePocketCount: countRoutingStatus(pockets, "unavailable"),
    matrixElementCount:
      pockets?.reduce(
        (total, pocket) =>
          total + (pocket.routing.matrix?.elements.length ?? 0),
        0,
      ) ?? 0,
  };
}

/**
 * A semantic scout can still return its strongest places in one famous
 * quarter first. This last deterministic cap keeps the shortlist city-wide
 * without overruling Sol's ordering inside each locality.
 */
export function selectAcrossLocalities(
  candidates: PlaceCandidate[],
  limit: number,
) {
  const localityCount = distinctLocalityCount(candidates);
  const maxPerLocality = localityCount >= 3 ? 2 : Math.max(2, limit);
  const counts = new Map<string, number>();
  const selected = new Set<string>();
  const offbeatTarget = Math.min(
    candidates.filter(isOffbeat).length,
    Math.ceil(limit * 0.35),
  );

  function add(candidate: PlaceCandidate) {
    const locality = localityOf(candidate);
    const count = counts.get(locality) ?? 0;

    if (selected.size >= limit || count >= maxPerLocality) {
      return false;
    }

    selected.add(candidate.providerPlaceId);
    counts.set(locality, count + 1);
    return true;
  }

  let offbeatCount = 0;

  for (const candidate of candidates) {
    if (isOffbeat(candidate) && add(candidate)) {
      offbeatCount += 1;

      if (offbeatCount >= offbeatTarget) {
        break;
      }
    }
  }

  for (const candidate of candidates) {
    if (!selected.has(candidate.providerPlaceId)) {
      add(candidate);
    }
  }

  // The two passes enforce the mix; this final filter restores Sol's original
  // quality order for the player-facing list.
  return candidates.filter((candidate) =>
    selected.has(candidate.providerPlaceId),
  );
}

function distinctLocalityCount(candidates: PlaceCandidate[]) {
  return new Set(candidates.map(localityOf)).size;
}

function localityOf(candidate: PlaceCandidate) {
  return (
    candidate.visualSignals
      .find((signal) => signal.startsWith("locality:"))
      ?.slice("locality:".length)
      .trim()
      .toLowerCase() ||
    candidate.address?.toLowerCase() ||
    "unknown"
  );
}

function isOffbeat(candidate: PlaceCandidate) {
  return candidate.visualSignals.some(
    (signal) =>
      signal === "obscurity:lesser_known" || signal === "obscurity:hidden_gem",
  );
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
