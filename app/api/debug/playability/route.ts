import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADVENTURE_DAY_SHAPES,
  ADVENTURE_MOODS,
  ADVENTURE_PARTY_MODES,
} from "@/lib/adventure/setup-session";
import { isDebugToolingEnabled } from "@/lib/discovery/debug-access";
import { discoverNearbyPlaces } from "@/lib/discovery/discover-nearby-places";
import { OpenAIPlaceScout } from "@/lib/discovery/place-scout";
import { GeoCoordinateSchema } from "@/lib/providers/domain";
import { ProviderError } from "@/lib/providers/errors";
import {
  GooglePlacesProvider,
  GoogleScoutVerifier,
} from "@/lib/providers/google";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const debugRateLimiter = new FixedWindowRateLimiter({
  limit: 20,
  windowMs: 60_000,
});

const DebugRequestSchema = z
  .object({
    origin: GeoCoordinateSchema,
    dayShape: z.enum(ADVENTURE_DAY_SHAPES),
    mood: z.enum(ADVENTURE_MOODS),
    partyMode: z.enum(ADVENTURE_PARTY_MODES),
    languageCode: z
      .string()
      .trim()
      .regex(/^[a-z]{2}$/)
      .default("en"),
    useAiCurator: z.boolean().default(true),
  })
  .strict();

export async function POST(request: Request) {
  if (!isDebugToolingEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return NextResponse.json(
      { error: "Sign in is required." },
      { status: 401 },
    );
  }

  if (!debugRateLimiter.check(data.claims.sub).allowed) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = DebugRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid debug request.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { useAiCurator, ...input } = parsed.data;

  try {
    const result = await discoverNearbyPlaces({
      input,
      placesProvider: new GooglePlacesProvider(),
      ...(useAiCurator && process.env.AI_API_KEY
        ? {
            placeScout: new OpenAIPlaceScout(),
            scoutedPlaceVerifier: new GoogleScoutVerifier(),
          }
        : {}),
    });
    const selectedIds = new Set(
      result.places.map((place) => place.providerPlaceId),
    );

    return NextResponse.json({
      searchRadiusMeters: result.searchRadiusMeters,
      reachMeters: result.reachMeters,
      centreCount: result.centreCount,
      searchCount: result.searchCount,
      rankBy: result.rankBy,
      retrievedCount: result.retrievedCount,
      candidateCount: result.candidateCount,
      rejectedCount: result.rejected.length,
      selectionMethod: result.selectionMethod,
      aiCuratorRequested: useAiCurator,
      aiCuratorConfigured: Boolean(process.env.AI_API_KEY),
      candidates: result.candidates.map((candidate) => ({
        ...summarise(candidate),
        selected: selectedIds.has(candidate.providerPlaceId),
      })),
      rejected: result.rejected.map((rejection) => ({
        ...summarise(rejection.candidate),
        reason: rejection.reason,
        detail: rejection.detail,
      })),
      attribution: "Google",
    });
  } catch (error) {
    // Unlike the player-facing route, this reports the provider's own failure
    // classification: diagnosing a bad area is the entire purpose. Provider
    // messages are deliberately not included, only the typed code.
    return NextResponse.json(
      {
        error: "Discovery failed.",
        code: error instanceof ProviderError ? error.code : "unknown",
        retryable: error instanceof ProviderError ? error.retryable : false,
      },
      { status: 502 },
    );
  }
}

function summarise(candidate: {
  providerPlaceId: string;
  name: string;
  primaryCategory: string;
  categories: string[];
  coordinates: { latitude: number; longitude: number };
  openingStatus: string;
  publicAccess: string;
  purchaseRequired: string;
  exteriorObservable: boolean;
  commercialVenue: boolean;
  reviewCount?: number;
}) {
  return {
    providerPlaceId: candidate.providerPlaceId,
    name: candidate.name,
    primaryCategory: candidate.primaryCategory,
    categories: candidate.categories,
    coordinates: candidate.coordinates,
    openingStatus: candidate.openingStatus,
    publicAccess: candidate.publicAccess,
    purchaseRequired: candidate.purchaseRequired,
    exteriorObservable: candidate.exteriorObservable,
    commercialVenue: candidate.commercialVenue,
    reviewCount: candidate.reviewCount ?? null,
  };
}
