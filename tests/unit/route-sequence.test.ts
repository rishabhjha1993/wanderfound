import { describe, expect, it } from "vitest";
import { routeSelectedSequence } from "@/lib/discovery/route-sequence";
import { RoutingProviderError } from "@/lib/providers/errors";
import {
  MOCK_PLACE_CANDIDATES,
  MockRoutingProvider,
} from "@/lib/providers/mock";

describe("selected walking sequence", () => {
  it("fetches full geometry only for consecutive selected legs", async () => {
    const provider = new MockRoutingProvider();
    const places = MOCK_PLACE_CANDIDATES.slice(0, 3);
    const routed = await routeSelectedSequence({
      places,
      routingProvider: provider,
      languageCode: "en",
      regionCode: "IN",
    });

    expect(routed.route.steps).toHaveLength(2);
    expect(routed.path[0]).toEqual(places[0]!.coordinates);
    expect(routed.path.at(-1)).toEqual(places[2]!.coordinates);
    expect(routed.distanceMeters).toBe(routed.route.distanceMeters);
  });

  it("rejects the sequence when any pedestrian leg fails", async () => {
    const base = new MockRoutingProvider();
    let calls = 0;
    const provider: MockRoutingProvider = Object.assign(
      Object.create(Object.getPrototypeOf(base)),
      base,
      {
        walkingRoute: async (
          input: Parameters<typeof base.walkingRoute>[0],
        ) => {
          calls += 1;
          if (calls === 1) {
            throw new RoutingProviderError({
              providerId: "fixture",
              operation: "walking_route",
              code: "no_route",
              retryable: false,
              message: "No pedestrian route.",
            });
          }
          return base.walkingRoute(input);
        },
      },
    );

    await expect(
      routeSelectedSequence({
        places: MOCK_PLACE_CANDIDATES.slice(0, 3),
        routingProvider: provider,
        languageCode: "en",
      }),
    ).rejects.toMatchObject({ code: "no_route" });
    expect(calls).toBe(1);
  });
});
