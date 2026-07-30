/**
 * The unit is a day, not an hour. A day is built from walkable pockets with
 * ordinary transport between them, so the choice is how much of a day to give
 * it rather than how many minutes of walking to allow.
 */
export const ADVENTURE_DAY_SHAPES = ["half_day", "full_day"] as const;
export const ADVENTURE_MOODS = [
  "historical",
  "culinary",
  "strange",
  "beautiful",
] as const;
export const ADVENTURE_PARTY_MODES = [
  "solo",
  "couple_friends",
  "family",
] as const;

export type AdventureDayShape = (typeof ADVENTURE_DAY_SHAPES)[number];
export type AdventureMood = (typeof ADVENTURE_MOODS)[number];
export type AdventurePartyMode = (typeof ADVENTURE_PARTY_MODES)[number];

export type AdventureSetupDraft = {
  dayShape: AdventureDayShape | null;
  mood: AdventureMood | null;
  partyMode: AdventurePartyMode | null;
};

export type CompleteAdventureSetup = {
  dayShape: AdventureDayShape;
  mood: AdventureMood;
  partyMode: AdventurePartyMode;
};

// v2: duration in minutes became a day shape. A stored v1 draft describes an
// adventure this product no longer builds, so it is discarded rather than
// migrated.
const ADVENTURE_SETUP_SESSION_KEY = "wanderfound:adventure-setup:v2";
const ADVENTURE_SETUP_SESSION_VERSION = 2;

export const EMPTY_ADVENTURE_SETUP: AdventureSetupDraft = {
  dayShape: null,
  mood: null,
  partyMode: null,
};

type StoredAdventureSetup = {
  version: typeof ADVENTURE_SETUP_SESSION_VERSION;
  draft: AdventureSetupDraft;
};

export function storeAdventureSetupDraft(draft: AdventureSetupDraft) {
  if (typeof window === "undefined" || !isValidDraft(draft)) {
    return false;
  }

  try {
    const stored: StoredAdventureSetup = {
      version: ADVENTURE_SETUP_SESSION_VERSION,
      draft,
    };

    window.sessionStorage.setItem(
      ADVENTURE_SETUP_SESSION_KEY,
      JSON.stringify(stored),
    );
    return true;
  } catch {
    return false;
  }
}

export function readAdventureSetupDraft(): AdventureSetupDraft {
  if (typeof window === "undefined") {
    return { ...EMPTY_ADVENTURE_SETUP };
  }

  try {
    const raw = window.sessionStorage.getItem(ADVENTURE_SETUP_SESSION_KEY);

    if (!raw) {
      return { ...EMPTY_ADVENTURE_SETUP };
    }

    const stored = JSON.parse(raw) as Partial<StoredAdventureSetup>;

    if (
      stored.version !== ADVENTURE_SETUP_SESSION_VERSION ||
      !isValidDraft(stored.draft)
    ) {
      clearAdventureSetupDraft();
      return { ...EMPTY_ADVENTURE_SETUP };
    }

    return stored.draft;
  } catch {
    clearAdventureSetupDraft();
    return { ...EMPTY_ADVENTURE_SETUP };
  }
}

export function clearAdventureSetupDraft() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(ADVENTURE_SETUP_SESSION_KEY);
  } catch {
    // A browser may disable storage. Setup still works in memory.
  }
}

export function isCompleteAdventureSetup(
  draft: AdventureSetupDraft,
): draft is CompleteAdventureSetup {
  return (
    draft.dayShape !== null && draft.mood !== null && draft.partyMode !== null
  );
}

function isValidDraft(
  draft: Partial<AdventureSetupDraft> | undefined,
): draft is AdventureSetupDraft {
  return Boolean(
    draft &&
    (draft.dayShape === null ||
      (draft.dayShape !== undefined &&
        ADVENTURE_DAY_SHAPES.includes(draft.dayShape))) &&
    (draft.mood === null ||
      (draft.mood !== undefined && ADVENTURE_MOODS.includes(draft.mood))) &&
    (draft.partyMode === null ||
      (draft.partyMode !== undefined &&
        ADVENTURE_PARTY_MODES.includes(draft.partyMode))),
  );
}
