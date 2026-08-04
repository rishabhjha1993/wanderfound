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

const ScoutedPlaceCoreSchema = z
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

export const ScoutedPlaceSuggestionSchema = ScoutedPlaceCoreSchema.extend({
  /** Sol's proposed walking chapter; Google coordinates must still prove it. */
  suggestedPocket: z.string().trim().min(2).max(120),
}).strict();

const ScoutedPocketSchema = z
  .object({
    label: z.string().trim().min(2).max(120),
    locality: z.string().trim().min(2).max(120),
    suggestions: z.array(ScoutedPlaceCoreSchema).min(3).max(5),
  })
  .strict()
  .superRefine((pocket, context) => {
    const categories = new Set(
      pocket.suggestions.flatMap((suggestion) => suggestion.categories),
    );
    if (categories.size < 2) {
      context.addIssue({
        code: "custom",
        message: "A suggested pocket needs at least two kinds of discovery.",
        path: ["suggestions"],
      });
    }
  });

const ScoutedPlacesSchema = z
  .object({
    areaLabel: z.string().trim().min(2).max(160),
    pockets: z.array(ScoutedPocketSchema).min(2).max(4),
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

Return candidate walking pockets, not a city-wide bag of isolated pins. A
pocket is one compact named quarter, complex, market area, garden precinct, or
heritage zone containing 3-5 specifically named discoveries. Every place in a
pocket must sit within about 1.2 km of every other place, with no likely
clue-to-clue step over 750 m. Do not put far-apart places under the same locality
label and call them a pocket. Never return an isolated place.

For a half day return three candidate pockets in distinct localities; for a
full day return four. Each pocket needs at least two kinds of discovery and a
mix of an excellent anchor plus less obvious details. Across the response,
include a deliberate 25-40% of lesser-known or hidden-gem places, but obscurity
is not quality: each offbeat choice must still be clearly worth the trip and
strongly fit the mood. Avoid a list made entirely of postcard landmarks too.

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
            candidatePocketCount: input.dayShape === "half_day" ? 3 : 4,
            placesPerPocket: "3-5",
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

    const suggestions = response.output_parsed.pockets.flatMap((pocket) =>
      pocket.suggestions.map((suggestion) => ({
        ...suggestion,
        // The enclosing pocket wins if Sol repeated a broader locality name
        // inside a suggestion. Google coordinates remain the final judge.
        locality: suggestion.locality || pocket.locality,
        suggestedPocket: pocket.label,
      })),
    );

    return {
      areaLabel: response.output_parsed.areaLabel,
      suggestions: balanceScoutSuggestions(
        suggestions.filter(
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
 * Sol makes the semantic judgment; this guard spends the Google verification
 * budget on complete candidate pockets. Taking two names from four localities
 * looks diverse in a list and creates no playable walk anywhere.
 */
export function balanceScoutSuggestions(
  suggestions: ScoutedPlaceSuggestion[],
  limit: number,
) {
  const names = new Set<string>();
  const groups = new Map<string, ScoutedPlaceSuggestion[]>();

  for (const suggestion of suggestions) {
    const name = normalise(suggestion.name);
    const pocket = normalise(suggestion.suggestedPocket);

    if (names.has(name)) {
      continue;
    }

    names.add(name);
    const group = groups.get(pocket) ?? [];
    if (group.length < 5) group.push(suggestion);
    groups.set(pocket, group);
  }

  const completeGroups = [...groups.values()].filter(
    (group) => group.length >= 3,
  );
  const selectedGroups = completeGroups.slice(0, Math.floor(limit / 3));
  const balanced = selectedGroups.flatMap((group) => group.slice(0, 3));
  let depth = 3;

  while (balanced.length < limit) {
    let added = false;
    for (const group of selectedGroups) {
      if (group[depth] && balanced.length < limit) {
        balanced.push(group[depth]);
        added = true;
      }
    }
    if (!added) break;
    depth += 1;
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
