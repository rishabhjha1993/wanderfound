import { distanceMeters } from "@/lib/discovery/deduplicate";
import { findPockets, type PocketPolicy } from "@/lib/discovery/pockets";
import type { GeoCoordinate, PlaceCandidate } from "@/lib/providers/domain";

/**
 * Chooses the neighbourhoods where a proximity provider should fill in the
 * detail around knowledge-source anchors.
 *
 * Wikidata can tell us that Nizamuddin or Mehrauli is worth crossing Delhi
 * for, but it does not list the bakery, market or smaller garden that turns an
 * anchor into a walk. Searching around the player instead answers the wrong
 * question whenever the player starts in a residential suburb.
 */
export function deriveEnrichmentCentres(
  candidates: PlaceCandidate[],
  {
    pocket,
    limit,
    minSeparationMetres,
  }: {
    pocket: PocketPolicy;
    limit: number;
    minSeparationMetres: number;
  },
): GeoCoordinate[] {
  if (candidates.length === 0 || limit <= 0) {
    return [];
  }

  // A one-category anchor cluster is not yet a playable pocket, but it is the
  // best possible place to ask Google for the missing category. This is how a
  // heritage cluster gains food for a culinary day without searching random
  // residential blocks.
  const relaxedPockets = findPockets(candidates, {
    ...pocket,
    minCategories: 1,
  });
  const centres = relaxedPockets
    .slice(0, limit)
    .map((candidatePocket) => candidatePocket.centre);

  // Sparse moods such as beautiful may have notable anchors but no cluster of
  // three yet. Use the highest-ranked, geographically distinct anchors as
  // seeds; the provider response around them decides whether a walk exists.
  for (const candidate of candidates) {
    if (centres.length >= limit) {
      break;
    }

    if (
      centres.every(
        (centre) =>
          distanceMeters(centre, candidate.coordinates) >= minSeparationMetres,
      )
    ) {
      centres.push(candidate.coordinates);
    }
  }

  return centres;
}
