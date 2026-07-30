import { CANDIDATE_FILTER_THRESHOLDS } from "@/lib/discovery/policy";
import type { PlaceCandidate } from "@/lib/providers/domain";

/**
 * WF-202a — candidate-level hard filters.
 *
 * These run before the curator sees anything, so no AI response can restore a
 * candidate the rules rejected. Only filters that a places response can
 * actually answer belong here: whether a route reaches a place on foot, and
 * whether that route is safe, cannot be known until WF-203 has a real
 * pedestrian route, and those rules live in WF-202b.
 *
 * Every rule returns a reason code, because "no reliable adventure here yet" is
 * only an acceptable answer if we can say what was rejected and why.
 */
export type CandidateRejectionReason =
  | "permanently_closed"
  | "closed_and_interior_only"
  | "public_access_not_established"
  | "purchase_required"
  | "unverified_identity"
  | "hazard_present"
  | "no_observable_feature";

export type CandidateRejection = {
  candidate: PlaceCandidate;
  reason: CandidateRejectionReason;
  detail: string;
};

export type CandidateFilterResult = {
  accepted: PlaceCandidate[];
  rejected: CandidateRejection[];
};

type CandidateRule = {
  reason: CandidateRejectionReason;
  /** Returns a detail string when the candidate must be rejected. */
  check: (candidate: PlaceCandidate) => string | null;
};

/**
 * Rules are evaluated in order and the first match wins, so the reason a player
 * or the founder sees is the most fundamental problem rather than an incidental
 * one. A demolished building should not be reported as merely unverified.
 */
const RULES: CandidateRule[] = [
  {
    reason: "permanently_closed",
    check: (candidate) =>
      candidate.openingStatus === "permanently_closed"
        ? "The provider reports this place is no longer operating."
        : null,
  },
  {
    reason: "closed_and_interior_only",
    check: (candidate) =>
      candidate.openingStatus === "closed" && !candidate.exteriorObservable
        ? "Closed right now, and the discovery would need its interior."
        : null,
  },
  {
    // Unknown is not permission. Anything the provider did not place in a
    // known-public shape is rejected rather than assumed approachable.
    reason: "public_access_not_established",
    check: (candidate) =>
      candidate.publicAccess === "yes"
        ? null
        : `Public access is "${candidate.publicAccess}" rather than established.`,
  },
  {
    // Wanderfound never requires a player to buy anything to finish a stage.
    reason: "purchase_required",
    check: (candidate) =>
      candidate.purchaseRequired === "no"
        ? null
        : `Reaching the discovery may require a purchase ("${candidate.purchaseRequired}").`,
  },
  {
    reason: "unverified_identity",
    check: (candidate) => {
      const { minCorroboratingReviews } = CANDIDATE_FILTER_THRESHOLDS;

      if (candidate.reviewCount === undefined) {
        return "No review count, so the provider's label is uncorroborated.";
      }

      return candidate.reviewCount < minCorroboratingReviews
        ? `Only ${candidate.reviewCount} reviews, below the ${minCorroboratingReviews} needed to trust the label.`
        : null;
    },
  },
  {
    reason: "hazard_present",
    check: (candidate) =>
      candidate.hazards.length > 0
        ? `Recorded hazards: ${candidate.hazards.join(", ")}.`
        : null,
  },
  {
    reason: "no_observable_feature",
    check: (candidate) =>
      candidate.visualSignals.length === 0
        ? "Nothing recorded that a player could visually verify."
        : null,
  },
];

export function filterCandidates(
  candidates: PlaceCandidate[],
): CandidateFilterResult {
  const accepted: PlaceCandidate[] = [];
  const rejected: CandidateRejection[] = [];

  for (const candidate of candidates) {
    const failure = firstFailure(candidate);

    if (failure) {
      rejected.push({ candidate, ...failure });
      continue;
    }

    accepted.push(candidate);
  }

  return { accepted, rejected };
}

/**
 * Exposed so a single candidate can be explained on its own, which is what the
 * WF-206 debug view needs when the founder asks why one place was dropped.
 */
export function rejectionFor(candidate: PlaceCandidate) {
  return firstFailure(candidate);
}

function firstFailure(candidate: PlaceCandidate) {
  for (const rule of RULES) {
    const detail = rule.check(candidate);

    if (detail) {
      return { reason: rule.reason, detail };
    }
  }

  return null;
}

export const CANDIDATE_RULE_REASONS = RULES.map((rule) => rule.reason);
