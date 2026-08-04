import { describe, expect, it } from "vitest";
import {
  balanceScoutSuggestions,
  type ScoutedPlaceSuggestion,
} from "@/lib/discovery/place-scout";

describe("Sol place scouting guardrails", () => {
  it("deduplicates names and spends verification on complete pockets", () => {
    const result = balanceScoutSuggestions(
      [
        suggestion("A One", "Mehrauli", "Pocket A"),
        suggestion("A Two", "Mehrauli", "Pocket A"),
        suggestion("A Three", "Mehrauli", "Pocket A"),
        suggestion("A Four", "Mehrauli", "Pocket A"),
        suggestion("A Five", "Mehrauli", "Pocket A"),
        suggestion("A One", "Elsewhere", "Pocket B"),
        suggestion("B One", "Nizamuddin", "Pocket B"),
        suggestion("B Two", "Nizamuddin", "Pocket B"),
        suggestion("B Three", "Nizamuddin", "Pocket B"),
        suggestion("B Four", "Nizamuddin", "Pocket B"),
        suggestion("Orphan One", "Old Delhi", "Incomplete"),
        suggestion("Orphan Two", "Old Delhi", "Incomplete"),
      ],
      8,
    );

    expect(result.map((place) => place.name)).toEqual([
      "A One",
      "A Two",
      "A Three",
      "B One",
      "B Two",
      "B Three",
      "A Four",
      "B Four",
    ]);
    expect(result.map((place) => place.suggestedPocket)).not.toContain(
      "Incomplete",
    );
  });
});

function suggestion(
  name: string,
  locality: string,
  suggestedPocket: string,
): ScoutedPlaceSuggestion {
  return {
    name,
    locality,
    suggestedPocket,
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
