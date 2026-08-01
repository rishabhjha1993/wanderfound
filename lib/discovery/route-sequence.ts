import type { RoutingProvider } from "@/lib/providers/contracts";
import type {
  GeoCoordinate,
  PlaceCandidate,
  WalkingRoute,
} from "@/lib/providers/domain";

export type RoutedSequence = {
  places: PlaceCandidate[];
  route: WalkingRoute;
  distanceMeters: number;
  durationSeconds: number;
  path: GeoCoordinate[];
};

/**
 * Fetches expensive full geometry only after a sequence has been chosen.
 * Any failed leg rejects the whole sequence; no straight line is substituted.
 */
export async function routeSelectedSequence({
  places,
  routingProvider,
  languageCode,
  regionCode,
}: {
  places: PlaceCandidate[];
  routingProvider: RoutingProvider;
  languageCode: string;
  regionCode?: string;
}): Promise<RoutedSequence> {
  if (places.length < 2) {
    throw new TypeError("A routed sequence needs at least two places.");
  }

  const route = await routingProvider.walkingRoute({
    origin: places[0]!.coordinates,
    destination: places.at(-1)!.coordinates,
    intermediateLocations: places
      .slice(1, -1)
      .map((place) => place.coordinates),
    languageCode,
    ...(regionCode ? { regionCode } : {}),
  });

  return {
    places,
    route,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    path: route.path,
  };
}
