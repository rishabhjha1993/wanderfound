import { rejectionFor } from "@/lib/discovery/candidate-filters";
import { log } from "@/lib/logger";
import type { PlaceVerifier } from "@/lib/providers/contracts";
import type { PlaceCandidate } from "@/lib/providers/domain";

export type VerificationOutcome = {
  /** Places that survived verification, in their original order. */
  places: PlaceCandidate[];
  /** Places verification proved unusable, with the rule that rejected them. */
  dropped: Array<{ candidate: PlaceCandidate; reason: string }>;
  /** Calls that returned without error. */
  verifiedCount: number;
  /** Places a confident match was actually found for. */
  matchedCount: number;
  failedCount: number;
};

/**
 * Verifies the selected places and drops any that verification proves
 * unusable.
 *
 * The order matters: places are verified after selection, not before, so this
 * costs a handful of calls per day rather than one per candidate. Most
 * candidates are never selected, and paying to check a monument nobody will
 * visit is the kind of cost that quietly makes the unlock price unworkable.
 *
 * A place that fails verification is removed rather than repaired. Sending
 * somebody to a demolished building is worse than a shorter day, and choosing a
 * replacement belongs to sequence search rather than here.
 */
export async function verifySelectedPlaces({
  places,
  verifier,
}: {
  places: PlaceCandidate[];
  verifier?: PlaceVerifier;
}): Promise<VerificationOutcome> {
  if (!verifier || places.length === 0) {
    return {
      places,
      dropped: [],
      verifiedCount: 0,
      matchedCount: 0,
      failedCount: 0,
    };
  }

  const kept: PlaceCandidate[] = [];
  const dropped: VerificationOutcome["dropped"] = [];
  let verifiedCount = 0;
  let matchedCount = 0;
  let failedCount = 0;

  for (const place of places) {
    let verified: PlaceCandidate;

    try {
      const result = await verifier.verify(place);
      verified = result.place;
      verifiedCount += 1;

      if (result.matched) {
        matchedCount += 1;
      }
    } catch {
      // A verification failure is not evidence against the place. Keeping it
      // unverified is honest; dropping it would let a provider outage silently
      // empty a day.
      failedCount += 1;
      kept.push(place);
      continue;
    }

    // Verification can reveal what the original source could not: that the
    // place is permanently closed, or shut with nothing to see from outside.
    const rejection = rejectionFor(verified);

    if (rejection) {
      dropped.push({ candidate: verified, reason: rejection.reason });
      continue;
    }

    kept.push(verified);
  }

  if (dropped.length > 0 || failedCount > 0 || matchedCount < places.length) {
    log("info", "places_verification_completed", {
      selected_count: places.length,
      verified_count: verifiedCount,
      matched_count: matchedCount,
      dropped_count: dropped.length,
      failed_count: failedCount,
      reasons: dropped.map((entry) => entry.reason).join(","),
    });
  }

  return { places: kept, dropped, verifiedCount, matchedCount, failedCount };
}
