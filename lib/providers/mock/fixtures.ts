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

/**
 * Review counts deliberately span the obscurity thresholds: a couple below the
 * floor where a place is unverified rather than undiscovered, several inside
 * the off-the-beaten-track band, and one famous enough to be the postcard.
 */
const FIXTURE_DEFINITIONS: Array<{
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  visualSignal: string;
  reviewCount: number;
}> = [
  {
    id: "fixture-arch",
    name: "Fixture Riverside Arch",
    category: "architecture",
    latitude: 15.4992,
    longitude: 73.8271,
    visualSignal: "A coral arch with three carved circles",
    reviewCount: 240,
  },
  {
    id: "fixture-garden",
    name: "Fixture Lantern Garden",
    category: "garden",
    latitude: 15.5001,
    longitude: 73.8265,
    visualSignal: "Five yellow lantern shapes beside a public path",
    reviewCount: 1800,
  },
  {
    id: "fixture-mural",
    name: "Fixture Monsoon Mural",
    category: "public_art",
    latitude: 15.4978,
    longitude: 73.8269,
    visualSignal: "A blue wall painting with a large paper boat",
    reviewCount: 42,
  },
  {
    id: "fixture-market",
    name: "Fixture Spice Arcade",
    category: "market",
    latitude: 15.4984,
    longitude: 73.829,
    visualSignal: "A covered public arcade with red hanging signs",
    reviewCount: 860,
  },
  {
    id: "fixture-clock",
    name: "Fixture Civic Clock",
    category: "civic",
    latitude: 15.5004,
    longitude: 73.8292,
    visualSignal: "A public clock face with a green border",
    reviewCount: 3,
  },
  {
    id: "fixture-steps",
    name: "Fixture Heritage Steps",
    category: "heritage",
    latitude: 15.4973,
    longitude: 73.8282,
    visualSignal: "A broad outdoor staircase with patterned tiles",
    reviewCount: 17,
  },
  {
    id: "fixture-waterfront",
    name: "Fixture River Compass",
    category: "waterfront",
    latitude: 15.501,
    longitude: 73.8278,
    visualSignal: "A brass compass set into a public promenade",
    reviewCount: 9400,
  },
  {
    id: "fixture-viewpoint",
    name: "Fixture Hill Window",
    category: "viewpoint",
    latitude: 15.4969,
    longitude: 73.8262,
    visualSignal: "A square public lookout frame facing west",
    reviewCount: 2,
  },
  // A pocket needs at least three places, so the historical categories carry
  // enough fixtures to form one. Without these the mock world can be filtered
  // and clustered into nothing, which tests the refusal path rather than the
  // path every other test is about.
  {
    id: "fixture-museum",
    name: "Fixture Tidewater Museum",
    category: "museum",
    latitude: 15.4995,
    longitude: 73.8286,
    visualSignal: "A blue-shuttered facade with a ship weathervane",
    reviewCount: 640,
  },
  {
    id: "fixture-chapel",
    name: "Fixture Lantern Chapel",
    category: "religious",
    latitude: 15.4981,
    longitude: 73.8276,
    visualSignal: "A whitewashed bell gable above a carved door",
    reviewCount: 310,
  },
  {
    id: "fixture-arcade",
    name: "Fixture Custom House Arcade",
    category: "architecture",
    latitude: 15.4987,
    longitude: 73.8294,
    visualSignal: "A row of nine arches with a painted date stone",
    reviewCount: 128,
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
    address: "Deterministic fixture zone",
    openingStatus: "open",
    publicAccess: "yes",
    indoorOutdoor: "outdoor",
    purchaseRequired: "no",
    commercialVenue: fixture.category === "market",
    exteriorObservable: true,
    reviewCount: fixture.reviewCount,
    landmarkSignal: ["heritage", "architecture", "museum"].includes(
      fixture.category,
    ),
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
