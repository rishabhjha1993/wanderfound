import type { PlaceCategory } from "@/lib/providers/domain";

/**
 * Wikidata `instance of` classes that make a place worth a day, mapped to
 * Wanderfound categories.
 *
 * This list is the product's taste, written down. Everything in it is a thing
 * somebody would travel to see; nothing in it is a shop, an office or a
 * residential amenity, which is exactly the material a proximity search cannot
 * help returning.
 */
export const WIKIDATA_CLASSES_BY_CATEGORY: Record<
  PlaceCategory,
  readonly string[]
> = {
  heritage: [
    "Q4989906", // monument
    "Q1081138", // historic site
    "Q839954", // archaeological site
    "Q381885", // tomb
    "Q57821", // fortification
    "Q82117", // city gate
    "Q5003624", // memorial
  ],
  architecture: [
    "Q23413", // castle
    "Q16560", // palace
    "Q12280", // bridge
    "Q39715", // lighthouse
    "Q811979", // architectural structure
  ],
  museum: [
    "Q33506", // museum
    "Q207694", // art museum
    "Q2087181", // historic house museum
    "Q7075", // library
  ],
  religious: [
    "Q16970", // church building
    "Q44539", // temple
    "Q842402", // Hindu temple
    "Q32815", // mosque
    "Q1068275", // gurdwara
    "Q44613", // monastery
  ],
  garden: [
    "Q22698", // park
    "Q167346", // botanical garden
    "Q1107656", // garden
  ],
  public_art: [
    "Q860861", // sculpture
    "Q483453", // fountain
  ],
  viewpoint: [
    "Q1201876", // observation tower
  ],
  waterfront: [
    "Q12284", // canal
    "Q40080", // beach
  ],
  civic: [
    "Q24354", // theatre
    "Q41253", // movie theatre
  ],
  market: [
    "Q330284", // marketplace
    "Q11315", // shopping centre
  ],
  // Deliberately empty. Wikidata has no entry for a great litti chokha stall,
  // and pretending otherwise would return restaurant chains with articles
  // rather than the food anybody actually travels for. Culinary places are
  // sourced from Google inside a pocket this provider has already found.
  culinary: [],
};

const CATEGORY_BY_CLASS = new Map<string, PlaceCategory>();

for (const [category, classes] of Object.entries(
  WIKIDATA_CLASSES_BY_CATEGORY,
)) {
  for (const wikidataClass of classes) {
    if (!CATEGORY_BY_CLASS.has(wikidataClass)) {
      CATEGORY_BY_CLASS.set(wikidataClass, category as PlaceCategory);
    }
  }
}

export function wikidataClassesForCategories(categories: PlaceCategory[]) {
  return [
    ...new Set(
      categories.flatMap(
        (category) => WIKIDATA_CLASSES_BY_CATEGORY[category] ?? [],
      ),
    ),
  ];
}

export function categoryForWikidataClass(wikidataClass: string) {
  return CATEGORY_BY_CLASS.get(wikidataClass);
}
