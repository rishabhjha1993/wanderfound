import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type {
  AdventureMood,
  AdventurePartyMode,
} from "@/lib/adventure/setup-session";
import { distanceMeters } from "@/lib/discovery/deduplicate";
import { OBSCURITY_THRESHOLDS } from "@/lib/discovery/policy";
import type { GeoCoordinate, PlaceCandidate } from "@/lib/providers/domain";

export type PlaceCurationInput = {
  candidates: PlaceCandidate[];
  origin: GeoCoordinate;
  mood: AdventureMood;
  partyMode: AdventurePartyMode;
  limit: number;
  /**
   * Favour places most visitors walk past. Set for the "strange" mood, where
   * the brief is historical or culinary value that is off the beaten track.
   */
  preferObscure?: boolean;
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

When preferObscure is true the brief is "off the beaten track": places with
genuine historical or culinary substance that most visitors walk straight past.
Judge this yourself from everything you are given — the name, what kind of place
it is, and how many people have reviewed it.

Prefer the family bakery, the neighbourhood shrine, the old shopfront, the
quarter's odd corner. Reject the landmark on every postcard and the busiest
restaurant in town, even when they fit the mood, because being well known is
what disqualifies them here. Do not mistake a place nobody has reviewed for a
hidden gem; with no evidence it is worth the walk, prefer somewhere modest that
people have at least noticed.

Never invent a place, ID, coordinate, opening status, distance, or fact, and
never select a place that is absent from the candidate list — however well you
think you know this area. The candidate list is the only permitted source.
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
            preferObscure: input.preferObscure ?? false,
            candidates: input.candidates.map((candidate) => ({
              providerPlaceId: candidate.providerPlaceId,
              name: candidate.name,
              primaryCategory: candidate.primaryCategory,
              categories: candidate.categories,
              openingStatus: candidate.openingStatus,
              indoorOutdoor: candidate.indoorOutdoor,
              exteriorObservable: candidate.exteriorObservable,
              reviewCount: candidate.reviewCount ?? null,
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
    const pool = input.preferObscure
      ? input.candidates.filter(isOffTheBeatenTrack)
      : input.candidates;
    const candidates = pool.length > 0 ? pool : input.candidates;

    return [...candidates]
      .sort((first, second) => {
        const firstDistance = distanceMeters(input.origin, first.coordinates);
        const secondDistance = distanceMeters(input.origin, second.coordinates);

        if (input.preferObscure) {
          const byObscurity =
            (first.reviewCount ?? Number.MAX_SAFE_INTEGER) -
            (second.reviewCount ?? Number.MAX_SAFE_INTEGER);

          if (byObscurity !== 0) {
            return byObscurity;
          }

          return firstDistance - secondDistance;
        }

        // A closed place is still playable when the discovery is on its
        // exterior, so closure demotes a candidate rather than removing it.
        const firstOpen = openingRank(first);
        const secondOpen = openingRank(second);

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

/**
 * A place with too few reviews is usually unverified rather than undiscovered,
 * and one with too many is the postcard everybody already photographs.
 */
function isOffTheBeatenTrack(candidate: PlaceCandidate) {
  if (candidate.reviewCount === undefined) {
    return false;
  }

  return (
    candidate.reviewCount >= OBSCURITY_THRESHOLDS.minReviewCount &&
    candidate.reviewCount <= OBSCURITY_THRESHOLDS.maxReviewCount
  );
}

function openingRank(candidate: PlaceCandidate) {
  if (candidate.openingStatus === "open") {
    return 0;
  }

  return candidate.exteriorObservable ? 1 : 2;
}
