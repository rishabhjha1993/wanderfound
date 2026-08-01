import { z } from "zod";
import type { RoutingProvider } from "@/lib/providers/contracts";
import {
  WalkingMatrixInputSchema,
  WalkingMatrixSchema,
  WalkingRouteInputSchema,
  WalkingRouteSchema,
  type GeoCoordinate,
  type WalkingMatrix,
  type WalkingMatrixInput,
  type WalkingRoute,
  type WalkingRouteInput,
} from "@/lib/providers/domain";
import {
  RoutingProviderError,
  type ProviderOperation,
} from "@/lib/providers/errors";
import { parseProviderResponse } from "@/lib/providers/validation";

const PROVIDER_ID = "google_routes";
const MATRIX_ENDPOINT =
  "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
const ROUTE_ENDPOINT =
  "https://routes.googleapis.com/directions/v2:computeRoutes";
const DEFAULT_TIMEOUT_MS = 8_000;
const MATRIX_FIELD_MASK = [
  "originIndex",
  "destinationIndex",
  "status",
  "condition",
  "distanceMeters",
  "duration",
].join(",");
const ROUTE_FIELD_MASK = [
  "routes.distanceMeters",
  "routes.duration",
  "routes.polyline.geoJsonLinestring",
  "routes.legs.steps.distanceMeters",
  "routes.legs.steps.staticDuration",
  "routes.legs.steps.polyline.geoJsonLinestring",
  "routes.legs.steps.startLocation.latLng",
  "routes.legs.steps.endLocation.latLng",
  "routes.legs.steps.navigationInstruction.instructions",
].join(",");

const GoogleStatusSchema = z
  .object({
    code: z.number().int().optional(),
    message: z.string().optional(),
  })
  .passthrough();

const GoogleMatrixElementSchema = z
  .object({
    originIndex: z.number().int().nonnegative(),
    destinationIndex: z.number().int().nonnegative(),
    status: GoogleStatusSchema.optional(),
    condition: z.string().optional(),
    distanceMeters: z.number().int().nonnegative().optional(),
    duration: z.string().optional(),
  })
  .passthrough();

const GoogleMatrixResponseSchema = z.array(GoogleMatrixElementSchema);

const GeoJsonLineStringSchema = z
  .object({
    type: z.literal("LineString").optional(),
    coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
  })
  .passthrough();

const GooglePolylineSchema = z
  .object({
    geoJsonLinestring: GeoJsonLineStringSchema,
  })
  .passthrough();

const GoogleLatLngSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

const GoogleRouteStepSchema = z
  .object({
    distanceMeters: z.number().int().nonnegative().default(0),
    staticDuration: z.string().default("0s"),
    polyline: GooglePolylineSchema.optional(),
    startLocation: z.object({ latLng: GoogleLatLngSchema }).optional(),
    endLocation: z.object({ latLng: GoogleLatLngSchema }).optional(),
    navigationInstruction: z
      .object({ instructions: z.string().trim().min(1).optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

const GoogleRouteSchema = z
  .object({
    distanceMeters: z.number().int().positive(),
    duration: z.string(),
    polyline: GooglePolylineSchema,
    legs: z
      .array(
        z
          .object({
            steps: z.array(GoogleRouteStepSchema).default([]),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

const GoogleRoutesResponseSchema = z
  .object({ routes: z.array(GoogleRouteSchema).default([]) })
  .passthrough();

type GoogleRoutesProviderOptions = {
  apiKey?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
};

export class GoogleRoutesProvider implements RoutingProvider {
  readonly descriptor = {
    id: PROVIDER_ID,
    kind: "routing" as const,
    name: "Google Routes API",
    status: "ready" as const,
  };

  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly now: () => Date;

  constructor(options: GoogleRoutesProviderOptions = {}) {
    this.apiKey =
      options.apiKey ??
      process.env.GOOGLE_ROUTES_SERVER_API_KEY ??
      process.env.GOOGLE_MAPS_SERVER_API_KEY ??
      "";
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.now = options.now ?? (() => new Date());
  }

  async walkingMatrix(input: WalkingMatrixInput): Promise<WalkingMatrix> {
    const request = this.parseInput(
      WalkingMatrixInputSchema,
      input,
      "walking_matrix",
    );
    const locations = request.locations;
    const raw = await this.post(
      MATRIX_ENDPOINT,
      {
        origins: locations.map((location) => ({
          waypoint: { location: { latLng: location } },
          routeModifiers: { avoidFerries: true },
        })),
        destinations: locations.map((location) => ({
          waypoint: { location: { latLng: location } },
        })),
        travelMode: "WALK",
        languageCode: request.languageCode,
        ...(request.regionCode ? { regionCode: request.regionCode } : {}),
        units: "METRIC",
      },
      MATRIX_FIELD_MASK,
      "walking_matrix",
    );
    const response = parseProviderResponse(GoogleMatrixResponseSchema, raw, {
      providerId: PROVIDER_ID,
      providerKind: "routing",
      operation: "walking_matrix",
    });
    const byPair = new Map(
      response.map((element) => [
        `${element.originIndex}:${element.destinationIndex}`,
        normaliseMatrixElement(element),
      ]),
    );
    const elements = locations.flatMap((_, originIndex) =>
      locations.map(
        (_, destinationIndex) =>
          byPair.get(`${originIndex}:${destinationIndex}`) ?? {
            originIndex,
            destinationIndex,
            condition: "indeterminate" as const,
          },
      ),
    );
    const retrievedAt = this.now().toISOString();

    return parseProviderResponse(
      WalkingMatrixSchema,
      {
        provider: PROVIDER_ID,
        locations,
        elements,
        attributions: [googleAttribution(retrievedAt)],
        retrievedAt,
      },
      {
        providerId: PROVIDER_ID,
        providerKind: "routing",
        operation: "walking_matrix",
      },
    );
  }

  async walkingRoute(input: WalkingRouteInput): Promise<WalkingRoute> {
    const request = this.parseInput(
      WalkingRouteInputSchema,
      input,
      "walking_route",
    );
    const raw = await this.post(
      ROUTE_ENDPOINT,
      {
        origin: { location: { latLng: request.origin } },
        destination: { location: { latLng: request.destination } },
        ...(request.intermediateLocations.length > 0
          ? {
              intermediates: request.intermediateLocations.map((location) => ({
                location: { latLng: location },
              })),
            }
          : {}),
        travelMode: "WALK",
        languageCode: request.languageCode,
        ...(request.regionCode ? { regionCode: request.regionCode } : {}),
        units: "METRIC",
        polylineQuality: "HIGH_QUALITY",
        polylineEncoding: "GEO_JSON_LINESTRING",
      },
      ROUTE_FIELD_MASK,
      "walking_route",
    );
    const response = parseProviderResponse(GoogleRoutesResponseSchema, raw, {
      providerId: PROVIDER_ID,
      providerKind: "routing",
      operation: "walking_route",
    });
    const route = response.routes[0];

    if (!route) {
      throw new RoutingProviderError({
        providerId: PROVIDER_ID,
        operation: "walking_route",
        code: "no_route",
        retryable: false,
        message: "Google found no pedestrian route for this pair.",
      });
    }

    const path = toPath(route.polyline.geoJsonLinestring.coordinates);
    const rawSteps = route.legs.flatMap((leg) => leg.steps);
    const steps = rawSteps.length
      ? rawSteps.map((step, index) => normaliseStep(step, path, index))
      : [
          {
            instruction: "Follow the walking route.",
            distanceMeters: route.distanceMeters,
            durationSeconds: secondsFromDuration(route.duration),
            start: request.origin,
            end: request.destination,
            path,
          },
        ];
    const retrievedAt = this.now().toISOString();

    return parseProviderResponse(
      WalkingRouteSchema,
      {
        provider: PROVIDER_ID,
        origin: request.origin,
        destination: request.destination,
        distanceMeters: route.distanceMeters,
        durationSeconds: secondsFromDuration(route.duration),
        path,
        steps,
        attributions: [googleAttribution(retrievedAt)],
        retrievedAt,
      },
      {
        providerId: PROVIDER_ID,
        providerKind: "routing",
        operation: "walking_route",
      },
    );
  }

  private parseInput<T>(
    schema: z.ZodType<T>,
    input: unknown,
    operation: ProviderOperation,
  ) {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      throw new RoutingProviderError({
        providerId: PROVIDER_ID,
        operation,
        code: "invalid_request",
        retryable: false,
        message: "Google routing received an invalid request.",
        cause: parsed.error,
      });
    }
    if (!this.apiKey) {
      throw new RoutingProviderError({
        providerId: PROVIDER_ID,
        operation,
        code: "not_configured",
        retryable: false,
        message: "Google Routes is not configured.",
      });
    }
    return parsed.data;
  }

  private async post(
    endpoint: string,
    body: unknown,
    fieldMask: string,
    operation: ProviderOperation,
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw googleHttpError(response.status, operation);
      return (await response.json()) as unknown;
    } catch (error) {
      if (error instanceof RoutingProviderError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new RoutingProviderError({
          providerId: PROVIDER_ID,
          operation,
          code: "timeout",
          retryable: true,
          message: "Google Routes took too long to respond.",
          cause: error,
        });
      }
      throw new RoutingProviderError({
        providerId: PROVIDER_ID,
        operation,
        code: "unavailable",
        retryable: true,
        message: "Google Routes is temporarily unavailable.",
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normaliseMatrixElement(
  element: z.infer<typeof GoogleMatrixElementSchema>,
) {
  const failed = (element.status?.code ?? 0) !== 0;
  const routeExists = element.condition === "ROUTE_EXISTS" && !failed;
  const sameLocation = element.originIndex === element.destinationIndex;
  return {
    originIndex: element.originIndex,
    destinationIndex: element.destinationIndex,
    condition: routeExists
      ? ("route_exists" as const)
      : element.condition === "ROUTE_NOT_FOUND" && !failed
        ? ("no_route" as const)
        : ("indeterminate" as const),
    ...(routeExists && (element.distanceMeters !== undefined || sameLocation)
      ? { distanceMeters: element.distanceMeters ?? 0 }
      : {}),
    ...(routeExists && (element.duration !== undefined || sameLocation)
      ? {
          durationSeconds:
            element.duration === undefined
              ? 0
              : secondsFromDuration(element.duration),
        }
      : {}),
  };
}

function normaliseStep(
  step: z.infer<typeof GoogleRouteStepSchema>,
  routePath: GeoCoordinate[],
  index: number,
) {
  const path = step.polyline
    ? toPath(step.polyline.geoJsonLinestring.coordinates)
    : [step.startLocation?.latLng, step.endLocation?.latLng].filter(
        (point): point is GeoCoordinate => Boolean(point),
      );
  const safePath = path.length >= 2 ? path : routePath;
  return {
    instruction:
      step.navigationInstruction?.instructions ??
      (index === 0
        ? "Begin the walking route."
        : "Continue on the walking route."),
    distanceMeters: step.distanceMeters,
    durationSeconds: secondsFromDuration(step.staticDuration),
    start: step.startLocation?.latLng ?? safePath[0]!,
    end: step.endLocation?.latLng ?? safePath.at(-1)!,
    path: safePath,
  };
}

function toPath(coordinates: Array<[number, number]>): GeoCoordinate[] {
  return coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
}

function secondsFromDuration(value: string) {
  const seconds = Number(value.endsWith("s") ? value.slice(0, -1) : value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RoutingProviderError({
      providerId: PROVIDER_ID,
      operation: "normalise_response",
      code: "malformed_response",
      retryable: false,
      message: "Google Routes returned an invalid duration.",
    });
  }
  return Math.ceil(seconds);
}

function googleAttribution(retrievedAt: string) {
  return {
    provider: PROVIDER_ID,
    displayName: "Google Maps",
    requiredNotice: "Google",
    storagePolicy: "transient" as const,
    retrievedAt,
  };
}

function googleHttpError(status: number, operation: ProviderOperation) {
  const code =
    status === 400
      ? "invalid_request"
      : status === 401 || status === 403
        ? "authentication_failed"
        : status === 429
          ? "rate_limited"
          : "unavailable";
  return new RoutingProviderError({
    providerId: PROVIDER_ID,
    operation,
    code,
    retryable: status === 429 || status >= 500,
    message: "Google Routes could not complete the request.",
  });
}
