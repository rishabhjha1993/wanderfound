import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type {
  AdventureDayShape,
  AdventureMood,
  AdventurePartyMode,
} from "@/lib/adventure/setup-session";
import { distanceMeters } from "@/lib/discovery/deduplicate";
import {
  GeoCoordinateSchema,
  PlaceCategorySchema,
  type GeoCoordinate,
  type PlaceCandidate,
} from "@/lib/providers/domain";

/**
 * The product promise is metropolitan discovery, even when the player starts
 * in an outer suburb. This is deliberately independent of walking distance:
 * transport connects neighbourhoods; walking happens inside each pocket.
 */
export const SOL_SCOUT_RADIUS_METRES = 30_000;

export const ScoutedPlaceSuggestionSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    locality: z.string().trim().min(2).max(120),
    approximateCoordinates: GeoCoordinateSchema,
    primaryCategory: PlaceCategorySchema,
    categories: z.array(PlaceCategorySchema).min(1).max(4),
    moodFitReason: z.string().trim().min(20).max(320),
    obscurity: z.enum(["iconic", "lesser_known", "hidden_gem"]),
    accessType: z.enum([
      "public_space",
      "public_entry",
      "ticketed_entry",
      "publicly_visible_exterior",
    ]),
    indoorOutdoor: z.enum(["indoor", "outdoor", "mixed"]),
    commercialVenue: z.boolean(),
  })
  .strict()
  .superRefine((suggestion, context) => {
    if (!suggestion.categories.includes(suggestion.primaryCategory)) {
      context.addIssue({
        code: "custom",
        message: "categories must include primaryCategory",
        path: ["categories"],
      });
    }
  });

const ScoutedPlacesSchema = z
  .object({
    areaLabel: z.string().trim().min(2).max(160),
    suggestions: z.array(ScoutedPlaceSuggestionSchema).min(1).max(18),
  })
  .strict();

export type ScoutedPlaceSuggestion = z.infer<
  typeof ScoutedPlaceSuggestionSchema
>;

export type PlaceScoutInput = {
  origin: GeoCoordinate;
  radiusMeters: number;
  mood: AdventureMood;
  dayShape: AdventureDayShape;
  partyMode: AdventurePartyMode;
  languageCode: string;
  regionCode?: string;
  targetCount: number;
};

export type PlaceScoutResult = {
  areaLabel: string;
  suggestions: ScoutedPlaceSuggestion[];
};

export interface PlaceScout {
  scout(input: PlaceScoutInput): Promise<PlaceScoutResult>;
}

export type ScoutedPlaceVerificationInput = {
  suggestion: ScoutedPlaceSuggestion;
  origin: GeoCoordinate;
  radiusMeters: number;
  languageCode: string;
  regionCode?: string;
};

export interface ScoutedPlaceVerifier {
  verify(input: ScoutedPlaceVerificationInput): Promise<PlaceCandidate | null>;
}

const SCOUT_INSTRUCTIONS = `You are Wanderfound's first-stage place scout.
Use your geographic and cultural knowledge to find real, specifically named
destinations inside the supplied radius. A separate Google Places step will
verify every name and coordinate, so return fewer places rather than guessing
or inventing.

The requested mood is a hard quality contract:
- beautiful: visually exceptional or atmospherically transporting. It must be
  worth looking at in person. Generic fountains, ordinary office/residential
  buildings, apartment amenities, and places that are merely tidy do not count.
- strange: genuinely unusual, uncanny, eccentric, surprising, or attached to
  a specific odd story. A normal temple, cafe, market, or old building is not
  strange merely because it is locally known.
- historical: materially connected to a specific documented past, not merely
  old-looking.
- culinary: distinctive local food craft, market culture, or a place with a
  specific culinary reason to visit; not an interchangeable restaurant.

Build a city-wide discovery pool, not a nearest-neighbour list. When the area
supports it, cover at least four distinct localities and never return more than
four suggestions from one locality. Include a deliberate 25-40% of
lesser-known or hidden-gem places, but obscurity is not quality: each offbeat
choice must still be clearly worth the trip and strongly fit the mood. Avoid a
list made entirely of postcard landmarks too.

Prefer several walkable clusters in different localities over isolated points.
Only suggest places approachable by an ordinary member of the public, through
entry or from public ground. Exclude private homes, residential-complex
features, members-only venues, unsafe ruins, unnamed objects, and generic map
labels. Coordinates may be approximate but must describe the named place.

Return structured data only. moodFitReason must state the concrete visual,
odd, historic, or culinary quality—not generic praise.`;

type OpenAIPlaceScoutOptions = {
  apiKey?: string;
  model?: string;
  client?: OpenAI;
};

export class OpenAIPlaceScout implements PlaceScout {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIPlaceScoutOptions = {}) {
    const apiKey = options.apiKey ?? process.env.AI_API_KEY ?? "";

    if (!options.client && !apiKey) {
      throw new Error("AI_API_KEY is not configured.");
    }

    this.client =
      options.client ??
      new OpenAI({
        apiKey,
        timeout: 60_000,
        // Google verification provides the retry-safe boundary. Repeating an
        // expensive semantic scout can produce a different list and double
        // the user's wait.
        maxRetries: 0,
      });
    this.model = options.model ?? process.env.AI_TEXT_MODEL ?? "gpt-5.6-sol";
  }

  async scout(input: PlaceScoutInput): Promise<PlaceScoutResult> {
    const response = await this.client.responses.parse({
      model: this.model,
      reasoning: { effort: "low" },
      store: false,
      input: [
        { role: "developer", content: SCOUT_INSTRUCTIONS },
        {
          role: "user",
          content: JSON.stringify({
            origin: input.origin,
            radiusMeters: input.radiusMeters,
            requestedMood: input.mood,
            dayShape: input.dayShape,
            partyMode: input.partyMode,
            targetCount: input.targetCount,
            languageCode: input.languageCode,
            regionCode: input.regionCode ?? null,
          }),
        },
      ],
      text: {
        format: zodTextFormat(ScoutedPlacesSchema, "scouted_places"),
      },
    });

    if (!response.output_parsed) {
      throw new Error("Sol did not return a place scout result.");
    }

    return {
      areaLabel: response.output_parsed.areaLabel,
      suggestions: balanceScoutSuggestions(
        response.output_parsed.suggestions.filter(
          (suggestion) =>
            distanceMeters(input.origin, suggestion.approximateCoordinates) <=
            input.radiusMeters * 1.1,
        ),
        input.targetCount,
      ),
    };
  }
}

/**
 * Sol makes the semantic judgment; this small deterministic guard prevents one
 * locality or duplicate spelling from taking the final API budget.
 */
export function balanceScoutSuggestions(
  suggestions: ScoutedPlaceSuggestion[],
  limit: number,
) {
  const localityCounts = new Map<string, number>();
  const names = new Set<string>();
  const balanced: ScoutedPlaceSuggestion[] = [];

  for (const suggestion of suggestions) {
    const name = normalise(suggestion.name);
    const locality = normalise(suggestion.locality);

    if (names.has(name) || (localityCounts.get(locality) ?? 0) >= 4) {
      continue;
    }

    names.add(name);
    localityCounts.set(locality, (localityCounts.get(locality) ?? 0) + 1);
    balanced.push(suggestion);

    if (balanced.length >= limit) {
      break;
    }
  }

  return balanced;
}

function normalise(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}
