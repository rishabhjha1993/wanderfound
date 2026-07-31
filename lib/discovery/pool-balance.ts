import { attestationOf } from "@/lib/discovery/attestation";
import { distanceMeters } from "@/lib/discovery/deduplicate";
import type { GeoCoordinate, PlaceCandidate } from "@/lib/providers/domain";

export type PoolShape = {
  /** Most candidates any single category may contribute. */
  maxPerCategory: number;
  /**
   * Which end of the prominence range this mood wants. "Historical" wants the
   * building that matters; "strange" wants the one nobody stops at. Without
   * this distinction a historical adventure fills with whichever category is
   * densest on the map, which in an Indian neighbourhood is working temples
   * and parish churches.
   */
  prefer: "significant" | "obscure" | "nearest";
};

/**
 * Caps each category's share of the pool and decides which members of an
 * over-represented category survive.
 *
 * The cap is what stops a single dense category taking the whole list: a live
 * search around Fontainhas returned twelve places of worship out of nineteen
 * "historical" candidates, and the curator could only pick from what it was
 * given.
 *
 * Significance is judged relative to the pool rather than against a fixed
 * review count, so this behaves the same in a metro and a small town. A
 * village's most important church might have two hundred reviews where a
 * city's has twenty thousand, and an absolute threshold would quietly make the
 * product work in Delhi and fail in Assagao.
 */
export function shapeCandidatePool(
  candidates: PlaceCandidate[],
  origin: GeoCoordinate,
  shape: PoolShape,
): PlaceCandidate[] {
  const byCategory = new Map<string, PlaceCandidate[]>();

  for (const candidate of candidates) {
    const group = byCategory.get(candidate.primaryCategory) ?? [];
    group.push(candidate);
    byCategory.set(candidate.primaryCategory, group);
  }

  const kept: PlaceCandidate[] = [];

  for (const group of byCategory.values()) {
    kept.push(
      ...[...group]
        .sort(comparatorFor(shape.prefer, origin))
        .slice(0, shape.maxPerCategory),
    );
  }

  // Preserve the provider's ordering among survivors so downstream behaviour
  // stays deterministic for a given response.
  const survivors = new Set(kept.map((place) => place.providerPlaceId));

  return candidates.filter((candidate) =>
    survivors.has(candidate.providerPlaceId),
  );
}

function comparatorFor(prefer: PoolShape["prefer"], origin: GeoCoordinate) {
  if (prefer === "nearest") {
    return (first: PlaceCandidate, second: PlaceCandidate) =>
      distanceMeters(origin, first.coordinates) -
      distanceMeters(origin, second.coordinates);
  }

  if (prefer === "obscure") {
    return (first: PlaceCandidate, second: PlaceCandidate) =>
      reviewsOf(first) - reviewsOf(second);
  }

  return (first: PlaceCandidate, second: PlaceCandidate) => {
    // A landmark tag beats raw popularity: it is the provider saying this
    // place is notable in itself, not merely a building of its kind.
    if (first.landmarkSignal !== second.landmarkSignal) {
      return first.landmarkSignal ? -1 : 1;
    }

    return reviewsOf(second) - reviewsOf(first);
  };
}

function reviewsOf(candidate: PlaceCandidate) {
  return attestationOf(candidate);
}
