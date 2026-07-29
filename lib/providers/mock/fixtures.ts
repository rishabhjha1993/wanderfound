import type {
  GroundedFact,
  PlaceCandidate,
  PlaceCategory,
  ProviderAttribution,
} from "@/lib/providers/domain";

const RETRIEVED_AT = "2026-07-28T00:00:00.000Z";

export const MOCK_PROVIDER_ATTRIBUTION: ProviderAttribution = {
  provider: "wanderfound_mock",
  displayName: "Wanderfound deterministic test fixtures",
  sourceUrl: "https://fixtures.wanderfound.test/provider-data",
  licenseName: "Internal test fixture",
  requiredNotice: "Not real-world place data. Never display in production.",
  storagePolicy: "permitted",
  retrievedAt: RETRIEVED_AT,
};

const FIXTURE_DEFINITIONS: Array<{
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  visualSignal: string;
}> = [
  {
    id: "fixture-arch",
    name: "Fixture Riverside Arch",
    category: "architecture",
    latitude: 15.4992,
    longitude: 73.8271,
    visualSignal: "A coral arch with three carved circles",
  },
  {
    id: "fixture-garden",
    name: "Fixture Lantern Garden",
    category: "garden",
    latitude: 15.5001,
    longitude: 73.8265,
    visualSignal: "Five yellow lantern shapes beside a public path",
  },
  {
    id: "fixture-mural",
    name: "Fixture Monsoon Mural",
    category: "public_art",
    latitude: 15.4978,
    longitude: 73.8269,
    visualSignal: "A blue wall painting with a large paper boat",
  },
  {
    id: "fixture-market",
    name: "Fixture Spice Arcade",
    category: "market",
    latitude: 15.4984,
    longitude: 73.829,
    visualSignal: "A covered public arcade with red hanging signs",
  },
  {
    id: "fixture-clock",
    name: "Fixture Civic Clock",
    category: "civic",
    latitude: 15.5004,
    longitude: 73.8292,
    visualSignal: "A public clock face with a green border",
  },
  {
    id: "fixture-steps",
    name: "Fixture Heritage Steps",
    category: "heritage",
    latitude: 15.4973,
    longitude: 73.8282,
    visualSignal: "A broad outdoor staircase with patterned tiles",
  },
  {
    id: "fixture-waterfront",
    name: "Fixture River Compass",
    category: "waterfront",
    latitude: 15.501,
    longitude: 73.8278,
    visualSignal: "A brass compass set into a public promenade",
  },
  {
    id: "fixture-viewpoint",
    name: "Fixture Hill Window",
    category: "viewpoint",
    latitude: 15.4969,
    longitude: 73.8262,
    visualSignal: "A square public lookout frame facing west",
  },
];

export const MOCK_PLACE_CANDIDATES: PlaceCandidate[] = FIXTURE_DEFINITIONS.map(
  (fixture) => ({
    provider: "wanderfound_mock",
    providerPlaceId: fixture.id,
    name: fixture.name,
    primaryCategory: fixture.category,
    categories: [fixture.category],
    coordinates: {
      latitude: fixture.latitude,
      longitude: fixture.longitude,
    },
    address: "Deterministic fixture area, Panaji, Goa",
    openingStatus: "open",
    publicAccess: "yes",
    indoorOutdoor: "outdoor",
    purchaseRequired: "no",
    commercialVenue: fixture.category === "market",
    hazards: [],
    groundedFacts: [makeFixtureFact(fixture.id, fixture.name)],
    visualSignals: [fixture.visualSignal],
    attributions: [MOCK_PROVIDER_ATTRIBUTION],
    retrievedAt: RETRIEVED_AT,
  }),
);

function makeFixtureFact(id: string, name: string): GroundedFact {
  return {
    id: `${id}-fact`,
    text: `${name} exists only as deterministic test data for Wanderfound development.`,
    sourceTitle: "Wanderfound fixture catalogue",
    sourceUrl: `https://fixtures.wanderfound.test/places/${id}`,
    confidence: 1,
    attribution: MOCK_PROVIDER_ATTRIBUTION,
  };
}
