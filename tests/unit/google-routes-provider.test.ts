import { describe, expect, it, vi } from "vitest";
import { GoogleRoutesProvider } from "@/lib/providers/google";
import type { WalkingMatrixInput } from "@/lib/providers/domain";

const LOCATIONS = [
  { latitude: 28.5244, longitude: 77.1855 },
  { latitude: 28.5204, longitude: 77.1844 },
  { latitude: 28.5186, longitude: 77.1815 },
] satisfies WalkingMatrixInput["locations"];

describe("GoogleRoutesProvider", () => {
  it("normalises an out-of-order walking matrix and fills missing pairs", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json([
        {
          originIndex: 1,
          destinationIndex: 0,
          status: {},
          condition: "ROUTE_EXISTS",
          distanceMeters: 620,
          duration: "480.2s",
        },
        {
          originIndex: 0,
          destinationIndex: 1,
          status: {},
          condition: "ROUTE_NOT_FOUND",
        },
      ]),
    );
    const provider = new GoogleRoutesProvider({
      apiKey: "secret",
      fetcher,
      now: () => new Date("2026-08-01T10:00:00.000Z"),
    });

    const matrix = await provider.walkingMatrix({
      locations: LOCATIONS,
      languageCode: "en",
      regionCode: "IN",
    });

    expect(matrix.elements).toHaveLength(9);
    expect(
      matrix.elements.find(
        (entry) => entry.originIndex === 1 && entry.destinationIndex === 0,
      ),
    ).toMatchObject({
      condition: "route_exists",
      distanceMeters: 620,
      durationSeconds: 481,
    });
    expect(
      matrix.elements.find(
        (entry) => entry.originIndex === 0 && entry.destinationIndex === 1,
      ),
    ).toMatchObject({
      condition: "no_route",
    });
    expect(
      matrix.elements.find(
        (entry) => entry.originIndex === 2 && entry.destinationIndex === 1,
      ),
    ).toMatchObject({
      condition: "indeterminate",
    });

    const [url, options] = fetcher.mock.calls[0]!;
    const headers = options?.headers as Record<string, string>;
    const body = JSON.parse(String(options?.body));
    expect(url).toContain("computeRouteMatrix");
    expect(headers["X-Goog-FieldMask"]).toContain("status");
    expect(body.travelMode).toBe("WALK");
    expect(body).not.toHaveProperty("routingPreference");
    expect(body.origins).toHaveLength(3);
    expect(body.destinations).toHaveLength(3);
  });

  it("preserves route geometry and walking steps", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        routes: [
          {
            distanceMeters: 700,
            duration: "600s",
            polyline: {
              geoJsonLinestring: {
                type: "LineString",
                coordinates: [
                  [77.1855, 28.5244],
                  [77.1849, 28.5224],
                  [77.1844, 28.5204],
                ],
              },
            },
            legs: [
              {
                steps: [
                  {
                    distanceMeters: 700,
                    staticDuration: "599.1s",
                    startLocation: { latLng: LOCATIONS[0] },
                    endLocation: { latLng: LOCATIONS[1] },
                    navigationInstruction: { instructions: "Walk south" },
                    polyline: {
                      geoJsonLinestring: {
                        type: "LineString",
                        coordinates: [
                          [77.1855, 28.5244],
                          [77.1844, 28.5204],
                        ],
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    const provider = new GoogleRoutesProvider({ apiKey: "secret", fetcher });
    const route = await provider.walkingRoute({
      origin: LOCATIONS[0],
      destination: LOCATIONS[1],
      intermediateLocations: [LOCATIONS[2]],
      languageCode: "en",
    });

    expect(route.path).toEqual([
      LOCATIONS[0],
      { latitude: 28.5224, longitude: 77.1849 },
      LOCATIONS[1],
    ]);
    expect(route.steps[0]).toMatchObject({
      instruction: "Walk south",
      durationSeconds: 600,
    });
    const body = JSON.parse(String(fetcher.mock.calls[0]![1]?.body));
    expect(body).toMatchObject({
      travelMode: "WALK",
      polylineQuality: "HIGH_QUALITY",
      polylineEncoding: "GEO_JSON_LINESTRING",
    });
    expect(body.intermediates).toHaveLength(1);
  });

  it("returns typed failures for no route, rate limit and missing credentials", async () => {
    const noRoute = new GoogleRoutesProvider({
      apiKey: "secret",
      fetcher: async () => Response.json({ routes: [] }),
    });
    await expect(
      noRoute.walkingRoute({
        origin: LOCATIONS[0],
        destination: LOCATIONS[1],
        languageCode: "en",
      }),
    ).rejects.toMatchObject({ code: "no_route", retryable: false });

    const limited = new GoogleRoutesProvider({
      apiKey: "secret",
      fetcher: async () => new Response(null, { status: 429 }),
    });
    await expect(
      limited.walkingMatrix({ locations: LOCATIONS, languageCode: "en" }),
    ).rejects.toMatchObject({ code: "rate_limited", retryable: true });

    const unconfigured = new GoogleRoutesProvider({ apiKey: "" });
    await expect(
      unconfigured.walkingMatrix({ locations: LOCATIONS, languageCode: "en" }),
    ).rejects.toMatchObject({ code: "not_configured", retryable: false });
  });
});
