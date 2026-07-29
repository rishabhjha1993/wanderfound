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
  civic: ["city_hall", "courthouse", "government_office", "plaza"],
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
  viewpoint: ["observation_deck", "scenic_spot", "tourist_attraction"],
  waterfront: ["beach", "fishing_pier", "marina", "river"],
};

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

export function mapGoogleTypesToCategories(
  googleTypes: string[],
  requestedCategories: PlaceCategory[],
): PlaceCategory[] {
  const requested = new Set(requestedCategories);

  return CATEGORY_PRIORITY.filter(
    (category) =>
      requested.has(category) &&
      GOOGLE_PLACE_TYPES_BY_CATEGORY[category].some((type) =>
        googleTypes.includes(type),
      ),
  );
}
