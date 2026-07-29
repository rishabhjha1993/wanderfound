import { beforeEach, describe, expect, it } from "vitest";
import {
  EMPTY_ADVENTURE_SETUP,
  clearAdventureSetupDraft,
  isCompleteAdventureSetup,
  readAdventureSetupDraft,
  storeAdventureSetupDraft,
} from "@/lib/adventure/setup-session";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("adventure setup session", () => {
  it("stores partial choices for the current browser session", () => {
    const draft = {
      durationMinutes: 60,
      mood: "strange",
      partyMode: null,
    } as const;

    expect(storeAdventureSetupDraft(draft)).toBe(true);
    expect(readAdventureSetupDraft()).toEqual(draft);
    expect(isCompleteAdventureSetup(draft)).toBe(false);
  });

  it("recognises a complete setup", () => {
    const setup = {
      durationMinutes: 30,
      mood: "historical",
      partyMode: "solo",
    } as const;

    expect(isCompleteAdventureSetup(setup)).toBe(true);
  });

  it("discards malformed stored choices", () => {
    window.sessionStorage.setItem(
      "wanderfound:adventure-setup:v1",
      JSON.stringify({
        version: 1,
        draft: {
          durationMinutes: 500,
          mood: "invented",
          partyMode: "crowd",
        },
      }),
    );

    expect(readAdventureSetupDraft()).toEqual(EMPTY_ADVENTURE_SETUP);
  });

  it("can clear the session draft", () => {
    storeAdventureSetupDraft({
      durationMinutes: 30,
      mood: "beautiful",
      partyMode: "family",
    });

    clearAdventureSetupDraft();

    expect(readAdventureSetupDraft()).toEqual(EMPTY_ADVENTURE_SETUP);
  });
});
