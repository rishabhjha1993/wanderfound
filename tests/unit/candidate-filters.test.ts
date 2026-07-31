import { describe, expect, it } from "vitest";
import {
  CANDIDATE_RULE_REASONS,
  filterCandidates,
  rejectionFor,
  type CandidateRejectionReason,
} from "@/lib/discovery/candidate-filters";
import { CANDIDATE_FILTER_THRESHOLDS } from "@/lib/discovery/policy";
import { MOCK_PLACE_CANDIDATES } from "@/lib/providers/mock/fixtures";
import type { PlaceCandidate } from "@/lib/providers/domain";

/** A candidate that passes every rule, so each test changes one thing only. */
function acceptable(overrides: Partial<PlaceCandidate> = {}): PlaceCandidate {
  return {
    ...MOCK_PLACE_CANDIDATES[0]!,
    openingStatus: "open",
    publicAccess: "yes",
    purchaseRequired: "no",
    exteriorObservable: true,
    reviewCount: 50,
    hazards: [],
    visualSignals: ["A coral arch with three carved circles"],
    ...overrides,
  };
}

function reasonFor(overrides: Partial<PlaceCandidate>) {
  return rejectionFor(acceptable(overrides))?.reason;
}

describe("candidate hard filters", () => {
  it("accepts a candidate that satisfies every rule", () => {
    expect(rejectionFor(acceptable())).toBeNull();
  });

  it("explains every rejection", () => {
    const { rejected } = filterCandidates([acceptable({ reviewCount: 0 })]);

    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.detail).toContain("corroboration");
  });

  describe("each rule independently", () => {
    it("rejects a place that no longer operates", () => {
      expect(reasonFor({ openingStatus: "permanently_closed" })).toBe(
        "permanently_closed",
      );
    });

    // A chapel shut for the evening still has its carved door.
    it("keeps a closed place whose discovery is on its exterior", () => {
      expect(
        reasonFor({ openingStatus: "closed", exteriorObservable: true }),
      ).toBeUndefined();
    });

    it("rejects a closed place that would need its interior", () => {
      expect(
        reasonFor({ openingStatus: "closed", exteriorObservable: false }),
      ).toBe("closed_and_interior_only");
    });

    it("rejects a place the public may not approach", () => {
      expect(reasonFor({ publicAccess: "no" })).toBe(
        "public_access_not_established",
      );
    });

    // Unknown is not permission.
    it("rejects a place whose access was never established", () => {
      expect(reasonFor({ publicAccess: "unknown" })).toBe(
        "public_access_not_established",
      );
    });

    // Rejecting paid entry removed every museum and gallery around
    // Fontainhas. The constraint belongs on the clue, not on the place.
    it("keeps a place that charges for entry", () => {
      expect(reasonFor({ purchaseRequired: "yes" })).toBeUndefined();
    });

    it("keeps a place whose purchase expectation is unknown", () => {
      expect(reasonFor({ purchaseRequired: "unknown" })).toBeUndefined();
    });

    // The audit returned a nail salon tagged as a historical landmark with four
    // reviews, and the curator picked it for being obscure.
    it("rejects a place with too little corroboration to trust its label", () => {
      expect(
        reasonFor({
          reviewCount: CANDIDATE_FILTER_THRESHOLDS.minCorroboratingReviews - 1,
        }),
      ).toBe("unverified_identity");
    });

    it("rejects a place with no review count at all", () => {
      expect(reasonFor({ reviewCount: undefined })).toBe("unverified_identity");
    });

    it("accepts a place exactly at the corroboration threshold", () => {
      expect(
        reasonFor({
          reviewCount: CANDIDATE_FILTER_THRESHOLDS.minCorroboratingReviews,
        }),
      ).toBeUndefined();
    });

    it("rejects a place with a recorded hazard", () => {
      expect(reasonFor({ hazards: ["railway"] })).toBe("hazard_present");
    });

    it("rejects a place with nothing a player could verify", () => {
      expect(reasonFor({ visualSignals: [] })).toBe("no_observable_feature");
    });
  });

  it("reports the most fundamental problem when several rules match", () => {
    // A demolished building should not be reported as merely unverified.
    expect(
      reasonFor({
        openingStatus: "permanently_closed",
        reviewCount: 0,
        publicAccess: "no",
      }),
    ).toBe("permanently_closed");
  });

  it("partitions a mixed pool without losing candidates", () => {
    const pool = [
      acceptable({ providerPlaceId: "keep-1" }),
      acceptable({ providerPlaceId: "drop-1", reviewCount: 1 }),
      acceptable({ providerPlaceId: "keep-2" }),
      acceptable({
        providerPlaceId: "drop-2",
        openingStatus: "permanently_closed",
      }),
    ];

    const { accepted, rejected } = filterCandidates(pool);

    expect(accepted.map((place) => place.providerPlaceId)).toEqual([
      "keep-1",
      "keep-2",
    ]);
    expect(rejected.map((entry) => entry.candidate.providerPlaceId)).toEqual([
      "drop-1",
      "drop-2",
    ]);
    expect(accepted.length + rejected.length).toBe(pool.length);
  });

  it("has a test for every reason code it can return", () => {
    const covered: CandidateRejectionReason[] = [
      "permanently_closed",
      "closed_and_interior_only",
      "public_access_not_established",
      "unverified_identity",
      "hazard_present",
      "no_observable_feature",
    ];

    expect(new Set(CANDIDATE_RULE_REASONS)).toEqual(new Set(covered));
  });
});
