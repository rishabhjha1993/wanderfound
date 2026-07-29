import type {
  AdventureDuration,
  AdventureMood,
  AdventurePartyMode,
} from "@/lib/adventure/setup-session";
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

  let candidates;

  try {
    candidates = await placesProvider.nearby({
      origin: input.origin,
      radiusMeters: policy.radiusMeters,
      maxResults: policy.candidateLimit,
      categories: policy.categories,
      languageCode: input.languageCode,
      ...(input.regionCode ? { regionCode: input.regionCode } : {}),
    });
  } catch (error) {
    log("error", "places_discovery_failed", {
      provider:
        error instanceof ProviderError
          ? error.providerId
          : placesProvider.descriptor.id,
      code: error instanceof ProviderError ? error.code : "unknown",
      retryable: error instanceof ProviderError ? error.retryable : false,
      location_cell: coarseLocationCell(input.origin),
    });
    throw error;
  }

  const uniqueCandidates = deduplicatePlaceCandidates(candidates);
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
      });
    }
  } else {
    selectedIds = await deterministicCurator.curate({
      candidates: uniqueCandidates,
      origin: input.origin,
      mood: input.mood,
      partyMode: input.partyMode,
      limit: policy.shortlistLimit,
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
    candidate_count: uniqueCandidates.length,
    selected_count: places.length,
    radius_meters: policy.radiusMeters,
    mood: input.mood,
    location_cell: coarseLocationCell(input.origin),
  });

  return {
    radiusMeters: policy.radiusMeters,
    candidateCount: uniqueCandidates.length,
    selectionMethod,
    places,
  };
}

function coarseLocationCell(location: GeoCoordinate) {
  return `${location.latitude.toFixed(1)},${location.longitude.toFixed(1)}`;
}
