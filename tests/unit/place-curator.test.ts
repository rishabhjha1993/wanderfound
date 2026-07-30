import { describe, expect, it } from "vitest";
import { DeterministicPlaceCurator } from "@/lib/discovery/place-curator";
import { OBSCURITY_THRESHOLDS } from "@/lib/discovery/policy";
import { MOCK_PLACE_CANDIDATES } from "@/lib/providers/mock/fixtures";
import type { PlaceCandidate } from "@/lib/providers/domain";

const ORIGIN = { latitude: 15.4989, longitude: 73.8317 };

function curate(
  candidates: PlaceCandidate[],
  overrides: { preferObscure?: boolean; limit?: number } = {},
) {
  return new DeterministicPlaceCurator().curate({
    candidates,
    origin: ORIGIN,
    mood: "strange",
    partyMode: "solo",
    limit: overrides.limit ?? 6,
    ...(overrides.preferObscure === undefined
      ? {}
      : { preferObscure: overrides.preferObscure }),
  });
}

function withCandidate(overrides: Partial<PlaceCandidate>): PlaceCandidate {
  return { ...MOCK_PLACE_CANDIDATES[0]!, ...overrides };
}

describe("deterministic place curator", () => {
  it("returns a stable selection for the same input", async () => {
    const first = await curate(MOCK_PLACE_CANDIDATES);
    const second = await curate(MOCK_PLACE_CANDIDATES);

    expect(first).toEqual(second);
  });

  describe("off the beaten track", () => {
    it("prefers the least-reviewed places inside the obscurity band", async () => {
      const selected = await curate(MOCK_PLACE_CANDIDATES, {
        preferObscure: true,
        limit: 2,
      });

      // 17 and 42 reviews, over the 240, 860 and 1800 alternatives.
      expect(selected).toEqual(["fixture-steps", "fixture-mural"]);
    });

    it("skips the postcard everyone already photographs", async () => {
      const selected = await curate(MOCK_PLACE_CANDIDATES, {
        preferObscure: true,
      });

      expect(selected).not.toContain("fixture-waterfront");
    });

    it("skips places too unreviewed to be worth walking to", async () => {
      const selected = await curate(MOCK_PLACE_CANDIDATES, {
        preferObscure: true,
      });

      expect(selected).not.toContain("fixture-viewpoint");
      expect(selected).not.toContain("fixture-clock");
    });

    it("falls back to the full pool rather than refusing when nothing is obscure", async () => {
      const famous = MOCK_PLACE_CANDIDATES.map((candidate, index) =>
        withCandidate({
          ...candidate,
          reviewCount: OBSCURITY_THRESHOLDS.maxReviewCount + index + 1,
        }),
      );

      await expect(
        curate(famous, { preferObscure: true }),
      ).resolves.not.toEqual([]);
    });

    it("ignores obscurity when the mood did not ask for it", async () => {
      const selected = await curate(MOCK_PLACE_CANDIDATES, {
        preferObscure: false,
        limit: 2,
      });

      expect(selected).not.toEqual(["fixture-steps", "fixture-mural"]);
    });
  });

  describe("closed places", () => {
    // A church closed for the evening still has a carved door and a facade,
    // and Goan evenings are when travellers have unplanned time.
    it("keeps a closed place whose discovery is on its exterior", async () => {
      const closed = withCandidate({
        providerPlaceId: "closed-chapel",
        openingStatus: "closed",
        exteriorObservable: true,
      });

      await expect(curate([closed], { limit: 1 })).resolves.toEqual([
        "closed-chapel",
      ]);
    });

    it("ranks a closed interior-only place below a closed exterior one", async () => {
      const interiorOnly = withCandidate({
        providerPlaceId: "closed-museum",
        primaryCategory: "museum",
        categories: ["museum"],
        openingStatus: "closed",
        exteriorObservable: false,
      });
      const exterior = withCandidate({
        providerPlaceId: "closed-chapel",
        primaryCategory: "religious",
        categories: ["religious"],
        openingStatus: "closed",
        exteriorObservable: true,
      });

      await expect(
        curate([interiorOnly, exterior], { limit: 2 }),
      ).resolves.toEqual(["closed-chapel", "closed-museum"]);
    });

    it("still ranks an open place first", async () => {
      const open = withCandidate({
        providerPlaceId: "open-garden",
        primaryCategory: "garden",
        categories: ["garden"],
        openingStatus: "open",
      });
      const closed = withCandidate({
        providerPlaceId: "closed-chapel",
        primaryCategory: "religious",
        categories: ["religious"],
        openingStatus: "closed",
        exteriorObservable: true,
      });

      await expect(curate([closed, open], { limit: 2 })).resolves.toEqual([
        "open-garden",
        "closed-chapel",
      ]);
    });
  });
});
