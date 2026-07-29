import type {
  KnowledgeProvider,
  PlacesProvider,
  RoutingProvider,
} from "@/lib/providers/contracts";
import {
  GroundedPlaceFactsSchema,
  NearbyPlacesInputSchema,
  PlaceCandidateSchema,
  WalkingRouteInputSchema,
  WalkingRouteSchema,
  type GeoCoordinate,
} from "@/lib/providers/domain";
import {
  KnowledgeProviderError,
  PlacesProviderError,
  RoutingProviderError,
} from "@/lib/providers/errors";
import {
  MOCK_PLACE_CANDIDATES,
  MOCK_PROVIDER_ATTRIBUTION,
} from "@/lib/providers/mock/fixtures";
import { parseProviderResponse } from "@/lib/providers/validation";

const MOCK_PROVIDER_ID = "wanderfound_mock";
const WALKING_METERS_PER_SECOND = 1.2;
const MOCK_PATH_FACTOR = 1.18;

export class MockPlacesProvider implements PlacesProvider {
  readonly descriptor = {
    id: MOCK_PROVIDER_ID,
    kind: "places" as const,
    name: "Wanderfound mock places",
    status: "ready" as const,
  };

  async nearby(input: unknown) {
    const parsedInput = NearbyPlacesInputSchema.safeParse(input);

    if (!parsedInput.success) {
      throw new PlacesProviderError({
        providerId: this.descriptor.id,
        operation: "nearby_places",
        code: "invalid_request",
        retryable: false,
        message: "Mock places received an invalid nearby search.",
        cause: parsedInput.error,
      });
    }

    return MOCK_PLACE_CANDIDATES.map((candidate) =>
      parseProviderResponse(PlaceCandidateSchema, candidate, {
        providerId: this.descriptor.id,
        providerKind: "places",
      }),
    )
      .filter(
        (candidate) =>
          candidate.categories.some((category) =>
            parsedInput.data.categories.includes(category),
          ) &&
          distanceMeters(parsedInput.data.origin, candidate.coordinates) <=
            parsedInput.data.radiusMeters,
      )
      .sort((left, right) => {
        const distanceDifference =
          distanceMeters(parsedInput.data.origin, left.coordinates) -
          distanceMeters(parsedInput.data.origin, right.coordinates);

        return (
          distanceDifference ||
          left.providerPlaceId.localeCompare(right.providerPlaceId)
        );
      })
      .slice(0, parsedInput.data.maxResults);
  }
}

export class MockRoutingProvider implements RoutingProvider {
  readonly descriptor = {
    id: MOCK_PROVIDER_ID,
    kind: "routing" as const,
    name: "Wanderfound mock routing",
    status: "ready" as const,
  };

  async walkingRoute(input: unknown) {
    const parsedInput = WalkingRouteInputSchema.safeParse(input);

    if (!parsedInput.success) {
      throw new RoutingProviderError({
        providerId: this.descriptor.id,
        operation: "walking_route",
        code: "invalid_request",
        retryable: false,
        message: "Mock routing received an invalid walking-route request.",
        cause: parsedInput.error,
      });
    }

    const directDistance = distanceMeters(
      parsedInput.data.origin,
      parsedInput.data.destination,
    );

    if (directDistance < 1 || directDistance > 5_000) {
      throw new RoutingProviderError({
        providerId: this.descriptor.id,
        operation: "walking_route",
        code: "no_route",
        retryable: false,
        message: "No deterministic mock walking route exists for this pair.",
      });
    }

    const distance = Math.ceil(directDistance * MOCK_PATH_FACTOR);
    const duration = Math.ceil(distance / WALKING_METERS_PER_SECOND);
    const midpoint = {
      latitude:
        (parsedInput.data.origin.latitude +
          parsedInput.data.destination.latitude) /
        2,
      longitude:
        (parsedInput.data.origin.longitude +
          parsedInput.data.destination.longitude) /
        2,
    };
    const path = [
      parsedInput.data.origin,
      midpoint,
      parsedInput.data.destination,
    ];

    return parseProviderResponse(
      WalkingRouteSchema,
      {
        provider: MOCK_PROVIDER_ID,
        providerRouteId: [
          coordinateKey(parsedInput.data.origin),
          coordinateKey(parsedInput.data.destination),
        ].join(":"),
        origin: parsedInput.data.origin,
        destination: parsedInput.data.destination,
        distanceMeters: distance,
        durationSeconds: duration,
        path,
        steps: [
          {
            instruction: "Follow the deterministic fixture pedestrian path.",
            distanceMeters: distance,
            durationSeconds: duration,
            start: parsedInput.data.origin,
            end: parsedInput.data.destination,
            path,
          },
        ],
        attributions: [MOCK_PROVIDER_ATTRIBUTION],
        retrievedAt: MOCK_PROVIDER_ATTRIBUTION.retrievedAt,
      },
      {
        providerId: this.descriptor.id,
        providerKind: "routing",
      },
    );
  }
}

export class MockKnowledgeProvider implements KnowledgeProvider {
  readonly descriptor = {
    id: MOCK_PROVIDER_ID,
    kind: "knowledge" as const,
    name: "Wanderfound mock knowledge",
    status: "ready" as const,
  };

  async enrich(place: unknown) {
    const parsedPlace = PlaceCandidateSchema.safeParse(place);

    if (!parsedPlace.success) {
      throw new KnowledgeProviderError({
        providerId: this.descriptor.id,
        operation: "enrich_place",
        code: "invalid_request",
        retryable: false,
        message: "Mock knowledge received an invalid place candidate.",
        cause: parsedPlace.error,
      });
    }

    if (parsedPlace.data.groundedFacts.length === 0) {
      throw new KnowledgeProviderError({
        providerId: this.descriptor.id,
        operation: "enrich_place",
        code: "no_results",
        retryable: false,
        message: "The fixture has no grounded facts.",
      });
    }

    return parseProviderResponse(
      GroundedPlaceFactsSchema,
      {
        place: {
          provider: parsedPlace.data.provider,
          providerPlaceId: parsedPlace.data.providerPlaceId,
        },
        matchedEntity: {
          provider: MOCK_PROVIDER_ID,
          entityId: parsedPlace.data.providerPlaceId,
          confidence: 1,
        },
        facts: parsedPlace.data.groundedFacts,
        attributions: parsedPlace.data.attributions,
        retrievedAt: MOCK_PROVIDER_ATTRIBUTION.retrievedAt,
      },
      {
        providerId: this.descriptor.id,
        providerKind: "knowledge",
      },
    );
  }
}

function distanceMeters(from: GeoCoordinate, to: GeoCoordinate) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function coordinateKey(coordinate: GeoCoordinate) {
  return [coordinate.latitude.toFixed(6), coordinate.longitude.toFixed(6)].join(
    ",",
  );
}
