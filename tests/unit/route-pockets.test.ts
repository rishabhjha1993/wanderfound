import { describe, expect, it } from "vitest";
import { routePockets } from "@/lib/discovery/route-pockets";
import type { Pocket } from "@/lib/discovery/pockets";
import type { RoutingProvider } from "@/lib/providers/contracts";
import type { WalkingMatrixElement } from "@/lib/providers/domain";
import { RoutingProviderError } from "@/lib/providers/errors";
import {
  MOCK_PLACE_CANDIDATES,
  MOCK_PROVIDER_ATTRIBUTION,
} from "@/lib/providers/mock";

const places = MOCK_PLACE_CANDIDATES.slice(0, 3);
const pocket: Pocket = {
  id: "test-pocket",
  places,
  centre: places[0]!.coordinates,
  spanMetres: 400,
  categories: ["architecture", "garden", "public_art"],
};

function elements(
  edge: (from: number, to: number) => Partial<WalkingMatrixElement>,
) {
  return places.flatMap((_, from) =>
    places.map((__, to) => ({
      originIndex: from,
      destinationIndex: to,
      condition: "route_exists" as const,
      distanceMeters: from === to ? 0 : 300,
      durationSeconds: from === to ? 0 : 240,
      ...edge(from, to),
    })),
  );
}

function providerWith(matrixElements: WalkingMatrixElement[]): RoutingProvider {
  return {
    descriptor: {
      id: "fixture",
      kind: "routing",
      name: "fixture",
      status: "ready",
    },
    walkingMatrix: async () => ({
      provider: "fixture",
      locations: places.map((place) => place.coordinates),
      elements: matrixElements,
      attributions: [MOCK_PROVIDER_ATTRIBUTION],
      retrievedAt: MOCK_PROVIDER_ATTRIBUTION.retrievedAt,
    }),
    walkingRoute: async () => {
      throw new Error("not used");
    },
  };
}

describe("walking pocket viability", () => {
  it("accepts a pocket whose real pedestrian graph connects", async () => {
    const [result] = await routePockets({
      pockets: [pocket],
      routingProvider: providerWith(elements(() => ({}))),
      languageCode: "en",
    });

    expect(result!.routing).toMatchObject({
      status: "ready",
      viablePairCount: 3,
      estimatedMinimumWalkSeconds: 480,
    });
  });

  it("rejects a pocket when one place has no pedestrian connection", async () => {
    const [result] = await routePockets({
      pockets: [pocket],
      routingProvider: providerWith(
        elements((from, to) =>
          from === 2 || to === 2
            ? {
                condition: "no_route",
                distanceMeters: undefined,
                durationSeconds: undefined,
              }
            : {},
        ),
      ),
      languageCode: "en",
    });

    expect(result!.routing.status).toBe("unrouteable");
    expect(result!.routing.unreachablePairCount).toBe(2);
  });

  it("rejects implausible detours and excessive walking time", async () => {
    const [result] = await routePockets({
      pockets: [pocket],
      routingProvider: providerWith(
        elements(() => ({ distanceMeters: 9_000, durationSeconds: 2_000 })),
      ),
      languageCode: "en",
    });

    expect(result!.routing.status).toBe("unrouteable");
    expect(result!.routing.excessivePairCount).toBe(3);
  });

  it("reports provider failure without pretending routing passed", async () => {
    const provider: RoutingProvider = {
      ...providerWith([]),
      walkingMatrix: async () => {
        throw new RoutingProviderError({
          providerId: "fixture",
          operation: "walking_matrix",
          code: "timeout",
          retryable: true,
          message: "timed out",
        });
      },
    };
    const [result] = await routePockets({
      pockets: [pocket],
      routingProvider: provider,
      languageCode: "en",
    });

    expect(result!.routing).toMatchObject({
      status: "unavailable",
      providerErrorCode: "timeout",
    });
    expect(result!.routing).not.toHaveProperty("matrix");
  });
});
