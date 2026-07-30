import type {
  AdventureDuration,
  AdventureMood,
} from "@/lib/adventure/setup-session";
import type { PlaceCategory } from "@/lib/providers/domain";

const DURATION_POLICY: Record<
  AdventureDuration,
  { radiusMeters: number; candidateLimit: number; shortlistLimit: number }
> = {
  30: {
    radiusMeters: 800,
    candidateLimit: 20,
    shortlistLimit: 4,
  },
  60: {
    radiusMeters: 1_500,
    candidateLimit: 20,
    shortlistLimit: 6,
  },
};

/**
 * Corrected from the first live audit at Fontainhas rather than from
 * assumption.
 *
 * `culinary` previously returned only restaurants and markets — two
 * categories, against a trail-viability rule that demands at least three, so a
 * culinary adventure could never have been generated. It now reaches for the
 * old bakery building and the spice warehouse alongside the food itself, which
 * also makes for a better walk than five eateries in a row.
 *
 * `strange` previously requested `viewpoint`, whose `tourist_attraction` type
 * swallowed cathedrals, casinos and whole neighbourhoods, and returned nothing
 * strange at all. Strange is not a category Google publishes. It is the
 * historical and culinary pool, from which the curator picks what most
 * visitors walk past.
 */
const MOOD_CATEGORIES: Record<AdventureMood, PlaceCategory[]> = {
  historical: ["heritage", "architecture", "museum", "civic", "religious"],
  culinary: ["culinary", "market", "heritage", "architecture", "public_art"],
  strange: [
    "heritage",
    "culinary",
    "architecture",
    "public_art",
    "market",
    "religious",
  ],
  beautiful: [
    "garden",
    "viewpoint",
    "waterfront",
    "architecture",
    "public_art",
  ],
};

/**
 * Deciding what counts as off the beaten track is the curator's judgement, not
 * a threshold. These bounds exist only for the deterministic fallback that
 * runs when the AI is unavailable, where some rule has to stand in for taste.
 *
 * Below the floor a place is usually unverified rather than undiscovered, and
 * we have no evidence it is worth walking to. Above the ceiling it is the
 * postcard everyone already photographs, which is the opposite of the mood.
 */
export const OBSCURITY_THRESHOLDS = {
  minReviewCount: 5,
  maxReviewCount: 5_000,
} as const;

const MOODS_PREFERRING_OBSCURITY: AdventureMood[] = ["strange"];

/**
 * Some moods span two kinds of place, and one search cannot represent both.
 *
 * Nearby Search returns at most twenty results under a single ranking, so
 * whichever kind happens to sit nearest takes the whole list: asked for
 * heritage and food together around Fontainhas it returned thirteen cafes, six
 * shops and one chapel. Searching each side separately and merging is what
 * makes the pool balanced, at the cost of one extra provider call.
 */
const MOOD_SEARCH_GROUPS: Partial<Record<AdventureMood, PlaceCategory[][]>> = {
  strange: [
    ["heritage", "architecture", "public_art", "religious"],
    ["culinary", "market"],
  ],
};

export function getDiscoveryPolicy(
  durationMinutes: AdventureDuration,
  mood: AdventureMood,
) {
  const preferObscure = MOODS_PREFERRING_OBSCURITY.includes(mood);
  const searchGroups = MOOD_SEARCH_GROUPS[mood] ?? [MOOD_CATEGORIES[mood]];

  return {
    ...DURATION_POLICY[durationMinutes],
    categories: [...MOOD_CATEGORIES[mood]],
    searchGroups: searchGroups.map((group) => [...group]),
    preferObscure,
    /**
     * Ranking shapes which twenty places the curator gets to choose between.
     * Popularity ranking would hand it Panjim's busiest restaurants and no
     * overlooked ones, leaving nothing off the beaten track to select.
     */
    rankBy: preferObscure ? ("distance" as const) : ("popularity" as const),
  };
}
