import { z } from "zod";
import {
  distanceMeters,
  placeNameSimilarity,
} from "@/lib/discovery/deduplicate";
import {
  CoordinateSchema,
  inGoa,
  type Coordinate,
  type OutingRequest,
} from "./domain";

const PlaceSchema = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string() }),
  formattedAddress: z.string().optional(),
  location: CoordinateSchema,
  businessStatus: z.string().optional(),
  types: z.array(z.string()).default([]),
  googleMapsUri: z.string().optional(),
  websiteUri: z.string().optional(),
  currentOpeningHours: z
    .object({
      openNow: z.boolean().optional(),
      weekdayDescriptions: z.array(z.string()).optional(),
    })
    .optional(),
  regularOpeningHours: z
    .object({ weekdayDescriptions: z.array(z.string()).optional() })
    .optional(),
  priceLevel: z.string().optional(),
});
export type VerifiedPlace = z.infer<typeof PlaceSchema>;

export class OutingProviderError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

async function searchPlaces(
  query: string,
  origin?: Coordinate,
  signal?: AbortSignal,
) {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key)
    throw new OutingProviderError(
      "Place research is temporarily unavailable. Please try again shortly.",
      503,
    );
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.any([
        AbortSignal.timeout(7000),
        ...(signal ? [signal] : []),
      ]),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus,places.types,places.googleMapsUri,places.websiteUri,places.currentOpeningHours,places.regularOpeningHours,places.priceLevel",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "en",
        regionCode: "IN",
        pageSize: 5,
        locationBias: {
          circle: {
            center: origin ?? { latitude: 15.45, longitude: 73.95 },
            radius: origin ? 30000 : 50000,
          },
        },
      }),
    },
  );
  if (!res.ok)
    throw new OutingProviderError(
      "We couldn’t check place details just now. Please try again.",
    );
  return z
    .object({ places: z.array(PlaceSchema).default([]) })
    .parse(await res.json()).places;
}

export async function resolveArea(
  area: string,
  origin?: Coordinate,
  signal?: AbortSignal,
): Promise<Coordinate> {
  if (origin) {
    if (!inGoa(origin))
      throw new OutingProviderError(
        "We’re exploring Goa first. Enter a Goa area to try a plan from wherever you are.",
        400,
      );
    return origin;
  }
  const places = await searchPlaces(`${area}, Goa, India`, undefined, signal);
  const match = places.find((p) => inGoa(p.location));
  if (!match)
    throw new OutingProviderError(
      "We couldn’t locate that area in Goa. Try a nearby town, such as Siolim, Panjim or Palolem.",
      400,
    );
  return match.location;
}

const EXCLUDED = new Set([
  "hospital",
  "school",
  "university",
  "cemetery",
  "funeral_home",
  "police",
  "military_base",
]);
export function chooseMatch(
  places: VerifiedPlace[],
  name: string,
  origin: Coordinate,
) {
  return (
    places
      .filter(
        (place) =>
          inGoa(place.location) &&
          distanceMeters(origin, place.location) <= 35000 &&
          !["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"].includes(
            place.businessStatus ?? "",
          ) &&
          !place.types.some((type) => EXCLUDED.has(type)) &&
          placeNameSimilarity(name, place.displayName.text) >= 0.35,
      )
      .sort(
        (a, b) =>
          placeNameSimilarity(name, b.displayName.text) -
          placeNameSimilarity(name, a.displayName.text),
      )[0] ?? null
  );
}

export async function verifyPlace(
  name: string,
  locality: string,
  origin: Coordinate,
  signal?: AbortSignal,
) {
  return chooseMatch(
    await searchPlaces(`${name}, ${locality}, Goa`, origin, signal),
    name,
    origin,
  );
}

export async function travelTime(
  origin: Coordinate,
  destination: Coordinate,
  transport: OutingRequest["transport"],
  signal?: AbortSignal,
) {
  const key =
    process.env.GOOGLE_ROUTES_SERVER_API_KEY ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.any([
          AbortSignal.timeout(5000),
          ...(signal ? [signal] : []),
        ]),
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        },
        body: JSON.stringify({
          origin: { location: { latLng: origin } },
          destination: { location: { latLng: destination } },
          travelMode:
            transport === "walk"
              ? "WALK"
              : transport === "scooter"
                ? "TWO_WHEELER"
                : "DRIVE",
          languageCode: "en",
        }),
      },
    );
    if (!res.ok) return null;
    const data = z
      .object({
        routes: z
          .array(z.object({ duration: z.string(), distanceMeters: z.number() }))
          .default([]),
      })
      .parse(await res.json());
    const route = data.routes[0];
    if (!route) return null;
    const seconds = Number(route.duration.replace(/s$/, ""));
    return Number.isFinite(seconds) && seconds >= 0
      ? {
          minutes: Math.ceil(seconds / 60),
          distanceKm: Math.round(route.distanceMeters / 100) / 10,
        }
      : null;
  } catch {
    return null;
  }
}

export async function currentWeather(origin: Coordinate, signal?: AbortSignal) {
  try {
    const params = new URLSearchParams({
      latitude: String(origin.latitude),
      longitude: String(origin.longitude),
      current: "temperature_2m,precipitation,weather_code",
      timezone: "Asia/Kolkata",
    });
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      {
        cache: "no-store",
        signal: AbortSignal.any([
          AbortSignal.timeout(4000),
          ...(signal ? [signal] : []),
        ]),
      },
    );
    if (!res.ok) return null;
    const data = z
      .object({
        current: z.object({
          temperature_2m: z.number(),
          precipitation: z.number(),
          weather_code: z.number(),
          time: z.string(),
        }),
      })
      .parse(await res.json());
    const c = data.current;
    return `${Math.round(c.temperature_2m)}°C · ${c.precipitation > 0 ? "rain reported" : c.weather_code <= 3 ? "fair to cloudy" : "conditions may change"} · current forecast from Open-Meteo (${c.time.slice(11, 16)} IST). Check conditions before outdoor activities.`;
  } catch {
    return null;
  }
}

export function priceLabel(level?: string) {
  return (
    (
      {
        PRICE_LEVEL_FREE: "Listed as free",
        PRICE_LEVEL_INEXPENSIVE: "Lower price range",
        PRICE_LEVEL_MODERATE: "Moderate price range",
        PRICE_LEVEL_EXPENSIVE: "Higher price range",
        PRICE_LEVEL_VERY_EXPENSIVE: "Premium price range",
      } as Record<string, string>
    )[level ?? ""] ?? "Cost not verified · check before you go"
  );
}
