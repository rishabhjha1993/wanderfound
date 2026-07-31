import { distanceMeters } from "@/lib/discovery/deduplicate";
import { rejectionFor } from "@/lib/discovery/candidate-filters";
import {
  OpenAIPlaceScout,
  SOL_SCOUT_RADIUS_METRES,
} from "@/lib/discovery/place-scout";
import { GoogleScoutVerifier } from "@/lib/providers/google";

const origin = {
  latitude: Number(process.argv[2] ?? "28.5921"),
  longitude: Number(process.argv[3] ?? "77.0460"),
};
const mood = process.argv[4] === "strange" ? "strange" : "beautiful";
const scout = new OpenAIPlaceScout();
const verifier = new GoogleScoutVerifier();

const result = await scout.scout({
  origin,
  radiusMeters: SOL_SCOUT_RADIUS_METRES,
  mood,
  dayShape: "half_day",
  partyMode: "solo",
  languageCode: "en",
  regionCode: "IN",
  targetCount: 12,
});

const verified = await Promise.allSettled(
  result.suggestions.map(async (suggestion) => ({
    suggestion,
    place: await verifier.verify({
      suggestion,
      origin,
      radiusMeters: SOL_SCOUT_RADIUS_METRES,
      languageCode: "en",
      regionCode: "IN",
    }),
  })),
);

console.log(`Area: ${result.areaLabel}`);
console.log(`Mood: ${mood}`);
console.log(`Sol suggestions: ${result.suggestions.length}`);
console.table(
  verified.map((outcome) => {
    if (outcome.status === "rejected") {
      return { verified: "error" };
    }

    const { suggestion, place } = outcome.value;

    return {
      solName: suggestion.name,
      locality: suggestion.locality,
      obscurity: suggestion.obscurity,
      googleName: place?.name ?? "UNVERIFIED",
      usable: place ? (rejectionFor(place)?.reason ?? "yes") : "no",
      kilometres: place
        ? (distanceMeters(origin, place.coordinates) / 1_000).toFixed(1)
        : "-",
    };
  }),
);
