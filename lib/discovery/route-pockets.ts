import { distanceMeters } from "@/lib/discovery/deduplicate";
import type { Pocket } from "@/lib/discovery/pockets";
import type { RoutingProvider } from "@/lib/providers/contracts";
import type { WalkingMatrix } from "@/lib/providers/domain";
import { ProviderError } from "@/lib/providers/errors";

export type WalkingPocketPolicy = {
  /** A single clue-to-clue walk should never feel like a commute. */
  maxLegSeconds: number;
  /** Reject map pins that are close in the air but wildly far on foot. */
  maxDetourRatio: number;
  /** Ignore detour ratios for tiny distances where GPS noise dominates. */
  detourRatioFloorMetres: number;
  /** Minimum tree walk through the pocket must fit inside this budget. */
  maxPocketSeconds: number;
};

export const DEFAULT_WALKING_POCKET_POLICY: WalkingPocketPolicy = {
  maxLegSeconds: 25 * 60,
  maxDetourRatio: 3,
  detourRatioFloorMetres: 100,
  maxPocketSeconds: 90 * 60,
};

export type RoutedPocket = Pocket & {
  routing: {
    status: "ready" | "unrouteable" | "excessive" | "unavailable";
    matrix?: WalkingMatrix;
    viablePairCount: number;
    unreachablePairCount: number;
    excessivePairCount: number;
    estimatedMinimumWalkSeconds?: number;
    providerErrorCode?: string;
  };
};

/**
 * Replaces the rough straight-line pocket assumption with actual pedestrian
 * reachability. Each pocket costs exactly one matrix call, irrespective of how
 * many possible visit orders we later compare.
 */
export async function routePockets({
  pockets,
  routingProvider,
  languageCode,
  regionCode,
  policy = DEFAULT_WALKING_POCKET_POLICY,
}: {
  pockets: Pocket[];
  routingProvider: RoutingProvider;
  languageCode: string;
  regionCode?: string;
  policy?: WalkingPocketPolicy;
}): Promise<RoutedPocket[]> {
  return Promise.all(
    pockets.map(async (pocket) => {
      try {
        const matrix = await routingProvider.walkingMatrix({
          locations: pocket.places.map((place) => place.coordinates),
          languageCode,
          ...(regionCode ? { regionCode } : {}),
        });
        return { ...pocket, routing: analyseMatrix(pocket, matrix, policy) };
      } catch (error) {
        return {
          ...pocket,
          routing: {
            status: "unavailable" as const,
            viablePairCount: 0,
            unreachablePairCount: 0,
            excessivePairCount: 0,
            ...(error instanceof ProviderError
              ? { providerErrorCode: error.code }
              : {}),
          },
        };
      }
    }),
  );
}

function analyseMatrix(
  pocket: Pocket,
  matrix: WalkingMatrix,
  policy: WalkingPocketPolicy,
) {
  const edges: Array<{ from: number; to: number; seconds: number }> = [];
  let unreachablePairCount = 0;
  let excessivePairCount = 0;

  for (let from = 0; from < pocket.places.length; from += 1) {
    for (let to = from + 1; to < pocket.places.length; to += 1) {
      const candidates = matrix.elements.filter(
        (element) =>
          ((element.originIndex === from && element.destinationIndex === to) ||
            (element.originIndex === to &&
              element.destinationIndex === from)) &&
          element.condition === "route_exists" &&
          element.distanceMeters !== undefined &&
          element.durationSeconds !== undefined,
      );

      if (candidates.length === 0) {
        unreachablePairCount += 1;
        continue;
      }

      const route = candidates.sort(
        (first, second) => first.durationSeconds! - second.durationSeconds!,
      )[0]!;
      const direct = distanceMeters(
        pocket.places[from]!.coordinates,
        pocket.places[to]!.coordinates,
      );
      const excessiveDetour =
        direct >= policy.detourRatioFloorMetres &&
        route.distanceMeters! / direct > policy.maxDetourRatio;

      if (route.durationSeconds! > policy.maxLegSeconds || excessiveDetour) {
        excessivePairCount += 1;
        continue;
      }

      edges.push({ from, to, seconds: route.durationSeconds! });
    }
  }

  const minimumWalk = minimumSpanningTreeSeconds(pocket.places.length, edges);
  const base = {
    matrix,
    viablePairCount: edges.length,
    unreachablePairCount,
    excessivePairCount,
  };

  if (minimumWalk === undefined) {
    return { ...base, status: "unrouteable" as const };
  }

  if (minimumWalk > policy.maxPocketSeconds) {
    return {
      ...base,
      status: "excessive" as const,
      estimatedMinimumWalkSeconds: minimumWalk,
    };
  }

  return {
    ...base,
    status: "ready" as const,
    estimatedMinimumWalkSeconds: minimumWalk,
  };
}

function minimumSpanningTreeSeconds(
  vertexCount: number,
  edges: Array<{ from: number; to: number; seconds: number }>,
) {
  if (vertexCount === 0) return 0;

  const visited = new Set([0]);
  let total = 0;

  while (visited.size < vertexCount) {
    const edge = edges
      .filter(({ from, to }) => visited.has(from) !== visited.has(to))
      .sort((first, second) => first.seconds - second.seconds)[0];

    if (!edge) return undefined;
    visited.add(visited.has(edge.from) ? edge.to : edge.from);
    total += edge.seconds;
  }

  return total;
}
