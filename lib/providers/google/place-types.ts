import type { PlaceCategory } from "@/lib/providers/domain";

/**
 * Only requestable Table A types from Places API (New) belong here.
 * Keep this deliberately broad: deterministic filters and the curator narrow
 * the candidates after Google returns them.
 */
export const GOOGLE_PLACE_TYPES_BY_CATEGORY: Record<
  PlaceCategory,
  readonly string[]
> = {
  architecture: [
    "castle",
    "cultural_landmark",
    "historical_landmark",
    "monument",
  ],
  civic: ["city_hall", "courthouse", "plaza"],
  culinary: ["bakery", "cafe", "coffee_shop", "restaurant"],
  garden: ["botanical_garden", "garden", "park", "city_park"],
  heritage: [
    "historical_place",
    "historical_landmark",
    "cultural_landmark",
    "monument",
  ],
  market: ["farmers_market", "flea_market", "market", "food_store"],
  museum: ["art_museum", "history_museum", "museum", "art_gallery"],
  public_art: ["art_gallery", "art_studio", "fountain", "sculpture"],
  religious: [
    "buddhist_temple",
    "church",
    "hindu_temple",
    "mosque",
    "shinto_shrine",
    "synagogue",
  ],
  viewpoint: ["observation_deck", "scenic_spot"],
  waterfront: ["beach", "fishing_pier", "marina", "river"],
};

/**
 * Types that are never a Wanderfound discovery, whatever else Google also
 * tagged them with.
 *
 * The first live audit at Fontainhas returned the Regional Transport Office,
 * an Aadhaar Seva Kendra, the Regional Passport Office and the PWD
 * headquarters as "historical" candidates, and three offshore casino boats as
 * "beautiful" and "strange" ones. Bureaucratic counters are not discoveries,
 * and a casino is not somewhere to send a player on foot.
 *
 * The curator then picked a nutrition clinic out of a food-led search, which
 * added the health and personal-services entries. Lodging is deliberately
 * absent: Goa's old boarding houses are exactly the sort of overlooked place
 * this product exists to notice.
 */
const EXCLUDED_GOOGLE_TYPES = new Set([
  "government_office",
  "post_office",
  "embassy",
  "police",
  "fire_station",
  "casino",
  "night_club",
  "shopping_mall",
  "department_store",
  "car_dealer",
  "car_repair",
  "gas_station",
  "hospital",
  "doctor",
  "dentist",
  "pharmacy",
  "drugstore",
  "physiotherapist",
  "medical_lab",
  "wellness_center",
  "gym",
  "fitness_center",
  "beauty_salon",
  "hair_salon",
  "nail_salon",
  "spa",
  "veterinary_care",
  "bank",
  "atm",
  "storage",
  "moving_company",
  "real_estate_agency",
  "insurance_agency",
]);

/**
 * Types too generic to establish what a place actually is. Google applies
 * `tourist_attraction` to cathedrals, casinos and entire neighbourhoods alike,
 * so it may support a category that another type already established, but it
 * may never be the reason a place enters the candidate pool.
 */
const WEAK_SIGNAL_GOOGLE_TYPES = new Set([
  "tourist_attraction",
  "point_of_interest",
  "establishment",
  "premise",
]);

const CATEGORY_PRIORITY: PlaceCategory[] = [
  "heritage",
  "museum",
  "public_art",
  "architecture",
  "garden",
  "viewpoint",
  "waterfront",
  "religious",
  "market",
  "culinary",
  "civic",
];

export function googleTypesForCategories(categories: PlaceCategory[]) {
  return [
    ...new Set(
      categories.flatMap(
        (category) => GOOGLE_PLACE_TYPES_BY_CATEGORY[category],
      ),
    ),
  ].slice(0, 50);
}

/**
 * Types that mark a place as a landmark in its own right, rather than as an
 * ordinary building of its kind. A parish church carries `church`; the
 * cathedral carries `historical_landmark` as well.
 */
const LANDMARK_GOOGLE_TYPES = new Set([
  "historical_landmark",
  "historical_place",
  "cultural_landmark",
  "monument",
  "castle",
  "art_museum",
  "history_museum",
  "museum",
]);

export function hasLandmarkSignal(googleTypes: string[]) {
  return googleTypes.some((type) => LANDMARK_GOOGLE_TYPES.has(type));
}

export function isExcludedGooglePlace(googleTypes: string[]) {
  return googleTypes.some((type) => EXCLUDED_GOOGLE_TYPES.has(type));
}

export function mapGoogleTypesToCategories(
  googleTypes: string[],
  requestedCategories: PlaceCategory[],
): PlaceCategory[] {
  if (isExcludedGooglePlace(googleTypes)) {
    return [];
  }

  const requested = new Set(requestedCategories);
  const meaningfulTypes = googleTypes.filter(
    (type) => !WEAK_SIGNAL_GOOGLE_TYPES.has(type),
  );

  return CATEGORY_PRIORITY.filter(
    (category) =>
      requested.has(category) &&
      GOOGLE_PLACE_TYPES_BY_CATEGORY[category].some((type) =>
        meaningfulTypes.includes(type),
      ),
  );
}
