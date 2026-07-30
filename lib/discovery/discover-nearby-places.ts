import type {
  AdventureDuration,
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
import { getDiscoveryPolicy } from "@/lib/discovery/policy";
import { log } from "@/lib/logger";
import type { PlacesProvider } from "@/lib/providers/contracts";
import type { GeoCoordinate } from "@/lib/providers/domain";
import { ProviderError } from "@/lib/providers/errors";

export type DiscoverNearbyPlacesInput = {
  origin: GeoCoordinate;
  durationMinutes: AdventureDuration;
  mood: AdventureMood;
  partyMode: AdventurePartyMode;
  languageCode: string;
  regionCode?: string;
};

export async function discoverNearbyPlaces({
  input,
  placesProvider,
  aiCurator,
}: {
  input: DiscoverNearbyPlacesInput;
  placesProvider: PlacesProvider;
  aiCurator?: PlaceCurator;
}) {
  const policy = getDiscoveryPolicy(input.durationMinutes, input.mood);

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

  for (const categories of policy.searchGroups) {
    try {
      candidates.push(
        ...(await placesProvider.nearby({
          origin: input.origin,
          radiusMeters: policy.radiusMeters,
          maxResults: perGroupLimit,
          categories,
          languageCode: input.languageCode,
          rankBy: policy.rankBy,
          ...(input.regionCode ? { regionCode: input.regionCode } : {}),
        })),
      );
    } catch (error) {
      failures.push(error);
      log("error", "places_discovery_failed", {
        provider:
          error instanceof ProviderError
            ? error.providerId
            : placesProvider.descriptor.id,
        code: error instanceof ProviderError ? error.code : "unknown",
        retryable: error instanceof ProviderError ? error.retryable : false,
        categories: categories.join(","),
        location_cell: coarseLocationCell(input.origin),
      });
    }
  }

  // One side failing leaves a usable if less balanced pool; every side failing
  // means we know nothing about this area and must say so rather than pretend.
  if (failures.length === policy.searchGroups.length) {
    throw failures[0];
  }

  const deduplicated = deduplicatePlaceCandidates(candidates);
  // Filters run before curation so that no AI response can reinstate a
  // candidate the deterministic rules rejected.
  const { accepted: uniqueCandidates, rejected } =
    filterCandidates(deduplicated);

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
    radius_meters: policy.radiusMeters,
    mood: input.mood,
    location_cell: coarseLocationCell(input.origin),
  });

  return {
    radiusMeters: policy.radiusMeters,
    retrievedCount: deduplicated.length,
    candidateCount: uniqueCandidates.length,
    selectionMethod,
    places,
    rejected,
  };
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
