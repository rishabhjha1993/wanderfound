import { describe, expect, it } from "vitest";
import {
  balanceScoutSuggestions,
  type ScoutedPlaceSuggestion,
} from "@/lib/discovery/place-scout";

describe("Sol place scouting guardrails", () => {
  it("deduplicates names and caps a single locality at four suggestions", () => {
    const result = balanceScoutSuggestions(
      [
        suggestion("Lodhi Garden", "Lodhi Road"),
        suggestion("Lodhi Garden", "Central Delhi"),
        suggestion("Tomb One", "Jor Bagh"),
        suggestion("Tomb Two", "Jor Bagh"),
        suggestion("Tomb Three", "Jor Bagh"),
        suggestion("Tomb Four", "Jor Bagh"),
        suggestion("Tomb Five", "Jor Bagh"),
        suggestion("Sunder Nursery", "Nizamuddin"),
      ],
      18,
    );

    expect(result.map((place) => place.name)).toEqual([
      "Lodhi Garden",
      "Tomb One",
      "Tomb Two",
      "Tomb Three",
      "Tomb Four",
      "Sunder Nursery",
    ]);
  });
});

function suggestion(name: string, locality: string): ScoutedPlaceSuggestion {
  return {
    name,
    locality,
    approximateCoordinates: { latitude: 28.59, longitude: 77.22 },
    primaryCategory: "garden",
    categories: ["garden", "heritage"],
    moodFitReason:
      "A layered landscape of old stone, mature trees and reflective water.",
    obscurity: "lesser_known",
    accessType: "public_space",
    indoorOutdoor: "outdoor",
    commercialVenue: false,
  };
}
