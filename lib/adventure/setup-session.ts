export const ADVENTURE_DURATIONS = [30, 60] as const;
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

export type AdventureDuration = (typeof ADVENTURE_DURATIONS)[number];
export type AdventureMood = (typeof ADVENTURE_MOODS)[number];
export type AdventurePartyMode = (typeof ADVENTURE_PARTY_MODES)[number];

export type AdventureSetupDraft = {
  durationMinutes: AdventureDuration | null;
  mood: AdventureMood | null;
  partyMode: AdventurePartyMode | null;
};

export type CompleteAdventureSetup = {
  durationMinutes: AdventureDuration;
  mood: AdventureMood;
  partyMode: AdventurePartyMode;
};

const ADVENTURE_SETUP_SESSION_KEY = "wanderfound:adventure-setup:v1";
const ADVENTURE_SETUP_SESSION_VERSION = 1;

export const EMPTY_ADVENTURE_SETUP: AdventureSetupDraft = {
  durationMinutes: null,
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
    draft.durationMinutes !== null &&
    draft.mood !== null &&
    draft.partyMode !== null
  );
}

function isValidDraft(
  draft: Partial<AdventureSetupDraft> | undefined,
): draft is AdventureSetupDraft {
  return Boolean(
    draft &&
    (draft.durationMinutes === null ||
      (draft.durationMinutes !== undefined &&
        ADVENTURE_DURATIONS.includes(draft.durationMinutes))) &&
    (draft.mood === null ||
      (draft.mood !== undefined && ADVENTURE_MOODS.includes(draft.mood))) &&
    (draft.partyMode === null ||
      (draft.partyMode !== undefined &&
        ADVENTURE_PARTY_MODES.includes(draft.partyMode))),
  );
}
