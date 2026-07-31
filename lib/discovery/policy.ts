import type {
  AdventureDayShape,
  AdventureMood,
} from "@/lib/adventure/setup-session";
import type { PocketPolicy } from "@/lib/discovery/pockets";
import type { PoolShape } from "@/lib/discovery/pool-balance";
import type { PlaceCategory } from "@/lib/providers/domain";

/**
 * How far a day reaches, and how the sweep covers it.
 *
 * `reachMeters` is how far from the player the day may travel, not how far
 * anyone walks: walking happens inside pockets, and transport carries the
 * player between them. It is answered by a knowledge source in one query.
 * `sweepReachMeters` is the much smaller area the proximity sweep covers for
 * the things no encyclopaedia lists, such as food. `searchRadiusMeters` stays small because a wide search
 * returns the same twenty prominent places spread thinner rather than more of
 * them, which is the whole reason the sweep exists.
 *
 * `candidateLimit` is per search centre. A full day therefore gathers up to
 * thirteen centres' worth of candidates before filtering, which is what makes
 * genuinely distinct pockets possible.
 */
const DAY_POLICY: Record<
  AdventureDayShape,
  {
    reachMeters: number;
    sweepReachMeters: number;
    searchRadiusMeters: number;
    rings: number;
    centresPerRing: number;
    candidateLimit: number;
    shortlistLimit: number;
  }
> = {
  half_day: {
    // A day travels by auto or taxi between pockets, so reach is a city
    // rather than a walk. Delhi NCR is roughly sixty kilometres across, and a
    // three-kilometre reach from Dwarka could only ever offer Dwarka.
    reachMeters: 20_000,
    sweepReachMeters: 3_000,
    searchRadiusMeters: 1_200,
    rings: 1,
    centresPerRing: 6,
    candidateLimit: 20,
    shortlistLimit: 8,
  },
  full_day: {
    reachMeters: 45_000,
    sweepReachMeters: 6_000,
    searchRadiusMeters: 1_500,
    rings: 2,
    centresPerRing: 6,
    candidateLimit: 20,
    shortlistLimit: 12,
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
/**
 * How much corroboration a place needs before we treat its provider label as
 * true. The audit returned a nail salon tagged as a historical landmark with
 * four reviews, and a person's name tagged as a temple with none, and the
 * curator selected the nail salon precisely because so few people had reviewed
 * it. Below this bar a place is unverified, not undiscovered.
 */
export const CANDIDATE_FILTER_THRESHOLDS = {
  minCorroboratingReviews: 5,
} as const;

export const OBSCURITY_THRESHOLDS = {
  minReviewCount: CANDIDATE_FILTER_THRESHOLDS.minCorroboratingReviews,
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
  // Places of worship are the densest mappable category in most Indian
  // neighbourhoods, and a single search let them take twelve of nineteen
  // "historical" candidates. Giving heritage, architecture and museums their
  // own search guarantees they reach the curator at all.
  historical: [
    ["heritage", "architecture", "museum"],
    ["religious", "civic"],
  ],
  strange: [
    ["heritage", "architecture", "public_art", "religious"],
    ["culinary", "market"],
  ],
};

/**
 * How each mood wants its pool shaped once the candidates are in.
 *
 * `maxPerCategory` is the cap that stops one dense category taking the list.
 * `prefer` decides who survives that cap: the place that matters, the place
 * nobody stops at, or simply the nearest.
 */
const MOOD_PREFERENCE: Record<AdventureMood, PoolShape["prefer"]> = {
  historical: "significant",
  culinary: "significant",
  strange: "obscure",
  beautiful: "significant",
};

/**
 * The cap has to scale with the day, not with a single search.
 *
 * At three per category it was right for the twenty places one search returns,
 * and wrong the moment the sweep returned seventy-four: it cut a city down to
 * nine candidates, which is not enough to build even two pockets from. The cap
 * exists to stop one category dominating, not to shrink the pool.
 */
const MAX_PER_CATEGORY: Record<AdventureDayShape, number> = {
  half_day: 6,
  full_day: 10,
};

/**
 * What makes a group of places a pocket.
 *
 * `linkMetres` is the step by which a pocket grows, not its width: places join
 * the same pocket when each is a short walk from the next, which is how a
 * neighbourhood actually feels. `maxSpanMetres` then stops that chaining from
 * running the length of a city and calling it one walk.
 *
 * `minPlaces` is about worth rather than mechanics. Two places do not justify
 * a journey across town, and offering them as a chapter is how a day becomes
 * padding.
 */
const POCKET_POLICY: PocketPolicy = {
  linkMetres: 350,
  minPlaces: 3,
  maxSpanMetres: 1_200,
  minCategories: 2,
};

export function getDiscoveryPolicy(
  dayShape: AdventureDayShape,
  mood: AdventureMood,
) {
  const preferObscure = MOODS_PREFERRING_OBSCURITY.includes(mood);
  const searchGroups = MOOD_SEARCH_GROUPS[mood] ?? [MOOD_CATEGORIES[mood]];

  const day = DAY_POLICY[dayShape];

  return {
    ...day,
    sweep: {
      // The proximity sweep stays near the player. Spreading its centres
      // across the whole region would search a handful of arbitrary points
      // forty kilometres apart and find nothing coherent; the region is the
      // knowledge source's job.
      reachMeters: day.sweepReachMeters,
      searchRadiusMeters: day.searchRadiusMeters,
      rings: day.rings,
      centresPerRing: day.centresPerRing,
    },
    categories: [...MOOD_CATEGORIES[mood]],
    searchGroups: searchGroups.map((group) => [...group]),
    poolShape: {
      maxPerCategory: MAX_PER_CATEGORY[dayShape],
      prefer: MOOD_PREFERENCE[mood],
    } satisfies PoolShape,
    pocket: POCKET_POLICY,
    preferObscure,
    /**
     * Ranking shapes which twenty places the curator gets to choose between.
     * Popularity ranking would hand it Panjim's busiest restaurants and no
     * overlooked ones, leaving nothing off the beaten track to select.
     */
    rankBy: preferObscure ? ("distance" as const) : ("popularity" as const),
  };
}
