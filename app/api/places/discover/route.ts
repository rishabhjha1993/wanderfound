import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADVENTURE_MOODS,
  ADVENTURE_PARTY_MODES,
} from "@/lib/adventure/setup-session";
import { discoverNearbyPlaces } from "@/lib/discovery/discover-nearby-places";
import { OpenAIPlaceCurator } from "@/lib/discovery/place-curator";
import { log } from "@/lib/logger";
import { GeoCoordinateSchema } from "@/lib/providers/domain";
import { ProviderError } from "@/lib/providers/errors";
import { GooglePlacesProvider } from "@/lib/providers/google";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Every accepted request spends Google Places quota and may spend AI tokens.
 * Authentication alone does not bound that cost, so a signed-in client is
 * limited to a small burst of scouting requests per window.
 */
const discoveryRateLimiter = new FixedWindowRateLimiter({
  limit: 10,
  windowMs: 60_000,
});

const DiscoverRequestSchema = z
  .object({
    origin: GeoCoordinateSchema,
    durationMinutes: z.union([z.literal(30), z.literal(60)]),
    mood: z.enum(ADVENTURE_MOODS),
    partyMode: z.enum(ADVENTURE_PARTY_MODES),
    languageCode: z
      .string()
      .trim()
      .regex(/^[a-z]{2}$/),
  })
  .strict();

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return NextResponse.json(
      { error: "Sign in is required." },
      { status: 401 },
    );
  }

  const userId = data.claims.sub;
  const rateLimit = discoveryRateLimiter.check(userId);

  if (!rateLimit.allowed) {
    log("warn", "places_discovery_rate_limited", {
      retry_after_seconds: rateLimit.retryAfterSeconds,
    });

    return NextResponse.json(
      { error: "You are scouting a little too quickly. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The discovery request is not valid JSON." },
      { status: 400 },
    );
  }

  const parsed = DiscoverRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "The discovery request is invalid." },
      { status: 400 },
    );
  }

  try {
    const result = await discoverNearbyPlaces({
      input: parsed.data,
      placesProvider: new GooglePlacesProvider(),
      aiCurator: createAiCurator(),
    });

    return NextResponse.json({
      radiusMeters: result.radiusMeters,
      candidateCount: result.candidateCount,
      selectionMethod: result.selectionMethod,
      places: result.places.map((place) => ({
        providerPlaceId: place.providerPlaceId,
        name: place.name,
        primaryCategory: place.primaryCategory,
        categories: place.categories,
        coordinates: place.coordinates,
        address: place.address,
        openingStatus: place.openingStatus,
        googleMapsUrl: place.attributions.find(
          (attribution) => attribution.provider === "google_places",
        )?.sourceUrl,
      })),
      attribution: "Google",
    });
  } catch (error) {
    const status =
      error instanceof ProviderError && error.code === "not_configured"
        ? 503
        : error instanceof ProviderError && error.retryable
          ? 502
          : 500;

    return NextResponse.json(
      {
        error:
          status === 503
            ? "Place discovery is being connected. Please try again shortly."
            : "We could not scout this area just now. Please try again.",
      },
      { status },
    );
  }
}

function createAiCurator() {
  if (!process.env.AI_API_KEY) {
    return undefined;
  }

  return new OpenAIPlaceCurator();
}
