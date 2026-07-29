import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type {
  AdventureMood,
  AdventurePartyMode,
} from "@/lib/adventure/setup-session";
import { distanceMeters } from "@/lib/discovery/deduplicate";
import type { GeoCoordinate, PlaceCandidate } from "@/lib/providers/domain";

export type PlaceCurationInput = {
  candidates: PlaceCandidate[];
  origin: GeoCoordinate;
  mood: AdventureMood;
  partyMode: AdventurePartyMode;
  limit: number;
};

export interface PlaceCurator {
  curate(input: PlaceCurationInput): Promise<string[]>;
}

const CuratedPlacesSchema = z
  .object({
    selectedPlaceIds: z.array(z.string().min(1)).min(1).max(8),
  })
  .strict();

const CURATOR_INSTRUCTIONS = `You curate real places for a short walking mystery.
Select only providerPlaceId values present in the supplied candidate list.
Prioritise an interesting, varied set that fits the requested mood and party.
Avoid choosing several places with the same category or similar names.
Never invent a place, ID, coordinate, opening status, distance, or fact.
Return only the structured selection.`;

type OpenAIPlaceCuratorOptions = {
  apiKey?: string;
  model?: string;
  client?: OpenAI;
};

export class OpenAIPlaceCurator implements PlaceCurator {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIPlaceCuratorOptions = {}) {
    const apiKey = options.apiKey ?? process.env.AI_API_KEY ?? "";

    if (!options.client && !apiKey) {
      throw new Error("AI_API_KEY is not configured.");
    }

    this.client =
      options.client ??
      new OpenAI({
        apiKey,
        timeout: 12_000,
        maxRetries: 1,
      });
    this.model = options.model ?? process.env.AI_TEXT_MODEL ?? "gpt-5.6-sol";
  }

  async curate(input: PlaceCurationInput) {
    const allowedIds = new Set(
      input.candidates.map((candidate) => candidate.providerPlaceId),
    );
    const response = await this.client.responses.parse({
      model: this.model,
      reasoning: { effort: "medium" },
      store: false,
      input: [
        {
          role: "developer",
          content: CURATOR_INSTRUCTIONS,
        },
        {
          role: "user",
          content: JSON.stringify({
            mood: input.mood,
            partyMode: input.partyMode,
            selectionLimit: input.limit,
            candidates: input.candidates.map((candidate) => ({
              providerPlaceId: candidate.providerPlaceId,
              name: candidate.name,
              primaryCategory: candidate.primaryCategory,
              categories: candidate.categories,
              openingStatus: candidate.openingStatus,
              indoorOutdoor: candidate.indoorOutdoor,
              distanceMeters: Math.round(
                distanceMeters(input.origin, candidate.coordinates),
              ),
            })),
          }),
        },
      ],
      text: {
        format: zodTextFormat(CuratedPlacesSchema, "curated_places"),
      },
    });

    const parsed = response.output_parsed;

    if (!parsed) {
      throw new Error("Sol did not return a place selection.");
    }

    return [
      ...new Set(
        parsed.selectedPlaceIds.filter((placeId) => allowedIds.has(placeId)),
      ),
    ].slice(0, input.limit);
  }
}

export class DeterministicPlaceCurator implements PlaceCurator {
  async curate(input: PlaceCurationInput) {
    const categoryCounts = new Map<string, number>();

    return [...input.candidates]
      .sort((first, second) => {
        const firstDistance = distanceMeters(input.origin, first.coordinates);
        const secondDistance = distanceMeters(input.origin, second.coordinates);
        const firstOpen = first.openingStatus === "open" ? 0 : 1;
        const secondOpen = second.openingStatus === "open" ? 0 : 1;

        return firstOpen - secondOpen || firstDistance - secondDistance;
      })
      .filter((candidate) => {
        const count = categoryCounts.get(candidate.primaryCategory) ?? 0;
        categoryCounts.set(candidate.primaryCategory, count + 1);
        return count < 2;
      })
      .slice(0, input.limit)
      .map((candidate) => candidate.providerPlaceId);
  }
}
