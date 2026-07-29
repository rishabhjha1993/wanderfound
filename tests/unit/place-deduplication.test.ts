import { describe, expect, it } from "vitest";
import { deduplicatePlaceCandidates } from "@/lib/discovery/deduplicate";
import { MOCK_PLACE_CANDIDATES } from "@/lib/providers/mock";

describe("place-candidate deduplication", () => {
  it("removes provider duplicates, nearby name variants and repeated branches", () => {
    const original = MOCK_PLACE_CANDIDATES[0];
    const candidates = [
      original,
      { ...original },
      {
        ...MOCK_PLACE_CANDIDATES[1],
        providerPlaceId: "arch-name-variant",
        name: "Fixture Riverside Arch!",
        coordinates: {
          latitude: original.coordinates.latitude + 0.0002,
          longitude: original.coordinates.longitude,
        },
      },
      {
        ...MOCK_PLACE_CANDIDATES[2],
        providerPlaceId: "arch-second-branch",
        name: "Fixture Riverside Arch",
      },
      MOCK_PLACE_CANDIDATES[3],
    ];

    expect(
      deduplicatePlaceCandidates(candidates).map(
        (candidate) => candidate.providerPlaceId,
      ),
    ).toEqual([
      original.providerPlaceId,
      MOCK_PLACE_CANDIDATES[3].providerPlaceId,
    ]);
  });
});
