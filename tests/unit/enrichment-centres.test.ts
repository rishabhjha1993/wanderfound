import { describe, expect, it } from "vitest";
import { deriveEnrichmentCentres } from "@/lib/discovery/enrichment-centres";
import { MOCK_PLACE_CANDIDATES } from "@/lib/providers/mock";
import type { PlaceCandidate } from "@/lib/providers/domain";

const POCKET_POLICY = {
  linkMetres: 750,
  minPlaces: 3,
  maxSpanMetres: 1_200,
  minCategories: 2,
};

function candidate(
  id: string,
  latitude: number,
  longitude: number,
): PlaceCandidate {
  return {
    ...MOCK_PLACE_CANDIDATES[5]!,
    providerPlaceId: id,
    name: `Knowledge anchor ${id}`,
    coordinates: { latitude, longitude },
  };
}

describe("knowledge-anchor enrichment centres", () => {
  it("uses a one-category anchor cluster as the place to find missing detail", () => {
    const centres = deriveEnrichmentCentres(
      [
        candidate("one", 28.5932, 77.2506),
        candidate("two", 28.5931, 77.2437),
        candidate("three", 28.5912, 77.243),
      ],
      {
        pocket: POCKET_POLICY,
        limit: 4,
        minSeparationMetres: 2_400,
      },
    );

    expect(centres).toHaveLength(1);
    expect(centres[0]!.longitude).toBeGreaterThan(77.24);
  });

  it("uses distinct ranked anchors when the knowledge result is too sparse to cluster", () => {
    const centres = deriveEnrichmentCentres(
      [
        candidate("one", 28.5944, 77.22),
        candidate("two", 28.558, 77.2433),
        candidate("three", 28.6148, 77.1817),
        candidate("four", 28.5158, 77.1775),
      ],
      {
        pocket: POCKET_POLICY,
        limit: 3,
        minSeparationMetres: 2_400,
      },
    );

    expect(centres).toHaveLength(3);
    expect(centres[0]).toEqual({ latitude: 28.5944, longitude: 77.22 });
  });

  it("does not invent a centre when the knowledge source found nothing", () => {
    expect(
      deriveEnrichmentCentres([], {
        pocket: POCKET_POLICY,
        limit: 4,
        minSeparationMetres: 2_400,
      }),
    ).toEqual([]);
  });
});
