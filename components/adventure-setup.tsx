"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type AdventureDayShape,
  type AdventureMood,
  type AdventurePartyMode,
  type AdventureSetupDraft,
  type CompleteAdventureSetup,
  isCompleteAdventureSetup,
  storeAdventureSetupDraft,
} from "@/lib/adventure/setup-session";
import type { ForegroundLocation } from "@/lib/location/request-foreground-location";
import styles from "./adventure-setup.module.css";

const DURATION_OPTIONS: Array<{
  value: AdventureDayShape;
  label: string;
  eyebrow: string;
  description: string;
}> = [
  {
    value: "half_day",
    label: "An afternoon of it",
    eyebrow: "Half a day",
    description:
      "Two corners of the city to explore on foot, with a short ride between them.",
  },
  {
    value: "full_day",
    label: "The whole day",
    eyebrow: "A full day",
    description:
      "Three or four neighbourhoods, further afield, with room for the story to unfold.",
  },
];

const MOOD_OPTIONS: Array<{
  value: AdventureMood;
  label: string;
  mark: string;
  description: string;
}> = [
  {
    value: "historical",
    label: "Historical",
    mark: "⌛",
    description:
      "Old walls, forgotten names, and stories hiding in plain sight.",
  },
  {
    value: "culinary",
    label: "Culinary",
    mark: "✦",
    description:
      "Markets, kitchens, local flavours, and the people behind them.",
  },
  {
    value: "strange",
    label: "Strange",
    mark: "◌",
    description:
      "Odd details, local legends, and things most walkers never notice.",
  },
  {
    value: "beautiful",
    label: "Beautiful",
    mark: "◇",
    description:
      "Colour, craft, water, gardens, and places worth slowing down for.",
  },
];

const PARTY_OPTIONS: Array<{
  value: AdventurePartyMode;
  label: string;
  description: string;
}> = [
  {
    value: "solo",
    label: "Solo",
    description: "A reflective trail paced for one curious explorer.",
  },
  {
    value: "couple_friends",
    label: "Couple / friends",
    description: "Clues designed to discuss and notice together.",
  },
  {
    value: "family",
    label: "Family",
    description: "Approachable clues and a gentler rhythm for mixed ages.",
  },
];

export function AdventureSetup({
  initialDraft,
  onBack,
  onComplete,
}: {
  initialDraft: AdventureSetupDraft;
  onBack: () => void;
  onComplete: (setup: CompleteAdventureSetup) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const completedChoiceCount = useMemo(
    () =>
      [draft.dayShape, draft.mood, draft.partyMode].filter(
        (value) => value !== null,
      ).length,
    [draft],
  );

  function updateDraft(nextDraft: AdventureSetupDraft) {
    setDraft(nextDraft);
    storeAdventureSetupDraft(nextDraft);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isCompleteAdventureSetup(draft)) {
      return;
    }

    storeAdventureSetupDraft(draft);
    onComplete(draft);
  }

  return (
    <form className={styles.setup} onSubmit={submit}>
      <div className={styles.introduction}>
        <div>
          <p className={styles.eyebrow}>Tune your compass</p>
          <h1>What kind of adventure are we making?</h1>
          <p className={styles.description}>
            Three quick choices give Wanderfound its brief. You can change them
            before we build anything.
          </p>
        </div>
        <p className={styles.progress} aria-live="polite">
          {completedChoiceCount} of 3 choices ready
        </p>
      </div>

      <fieldset className={styles.group}>
        <legend>
          <span>01</span>
          How much time do you have?
        </legend>
        <div className={styles.twoColumnOptions}>
          {DURATION_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              checked={draft.dayShape === option.value}
              description={option.description}
              eyebrow={option.eyebrow}
              group="duration"
              label={option.label}
              value={String(option.value)}
              onChange={() => updateDraft({ ...draft, dayShape: option.value })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>
          <span>02</span>
          What should the world feel like?
        </legend>
        <div className={styles.moodOptions}>
          {MOOD_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              checked={draft.mood === option.value}
              description={option.description}
              group="mood"
              label={option.label}
              mark={option.mark}
              value={option.value}
              onChange={() => updateDraft({ ...draft, mood: option.value })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>
          <span>03</span>
          Who is wandering?
        </legend>
        <div className={styles.partyOptions}>
          {PARTY_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              checked={draft.partyMode === option.value}
              description={option.description}
              group="party"
              label={option.label}
              value={option.value}
              onChange={() =>
                updateDraft({ ...draft, partyMode: option.value })
              }
            />
          ))}
        </div>
      </fieldset>

      <div className={styles.actions}>
        <button className={styles.back} type="button" onClick={onBack}>
          Back to my trailhead
        </button>
        <Button
          className={styles.continue}
          disabled={!isCompleteAdventureSetup(draft)}
          type="submit"
        >
          Set my compass
        </Button>
      </div>
    </form>
  );
}

export function AdventureSetupComplete({
  location,
  setup,
  onEdit,
}: {
  location: ForegroundLocation;
  setup: CompleteAdventureSetup;
  onEdit: () => void;
}) {
  const [discovery, setDiscovery] = useState<DiscoveryState>({
    status: "idle",
  });

  async function scoutArea() {
    setDiscovery({ status: "loading" });

    try {
      const response = await fetch("/api/places/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          ...setup,
          languageCode: browserLanguageCode(),
        }),
      });
      const payload = (await response.json()) as DiscoveryResponse;

      if (!response.ok) {
        setDiscovery({
          status: "error",
          message: payload.error ?? "We could not scout this area just now.",
        });
        return;
      }

      setDiscovery({ status: "ready", result: payload });
    } catch {
      setDiscovery({
        status: "error",
        message: "The scout lost its signal. Please try again.",
      });
    }
  }

  return (
    <div className={styles.complete} aria-live="polite">
      <span className={styles.compassMark} aria-hidden="true">
        <i />
      </span>
      <p className={styles.eyebrow}>Compass set</p>
      <h1>Your kind of mystery is ready.</h1>
      <p className={styles.description}>
        Wanderfound now knows the shape of the adventure. Next, Sol scouts the
        city for places that truly fit your mood, Google checks every one, and
        the route engine keeps the walk practical.
      </p>

      <dl className={styles.summary}>
        <div>
          <dt>Time</dt>
          <dd>{setup.dayShape === "half_day" ? "Half a day" : "A full day"}</dd>
        </div>
        <div>
          <dt>Mood</dt>
          <dd>{labelMood(setup.mood)}</dd>
        </div>
        <div>
          <dt>Party</dt>
          <dd>{labelParty(setup.partyMode)}</dd>
        </div>
      </dl>

      <div className={styles.engineNote}>
        <span aria-hidden="true">✦</span>
        <div>
          <strong>The next piece: the adventure engine</strong>
          <p>
            Sol proposes the meaningful places first. Google then proves each
            one is real, current and inside the 30 km discovery area.
          </p>
        </div>
      </div>

      {discovery.status === "ready" ? (
        <DiscoveryResult result={discovery.result} />
      ) : (
        <Button
          aria-busy={discovery.status === "loading"}
          disabled={discovery.status === "loading"}
          fullWidth
          onClick={scoutArea}
        >
          {discovery.status === "loading"
            ? "Scouting the streets…"
            : "Discover what’s around me"}
        </Button>
      )}

      {discovery.status === "error" ? (
        <p className={styles.discoveryError} role="alert">
          {discovery.message}
        </p>
      ) : null}

      <Button fullWidth onClick={onEdit} variant="quiet">
        Change my choices
      </Button>
    </div>
  );
}

type DiscoveredPlace = {
  providerPlaceId: string;
  name: string;
  primaryCategory: string;
  address?: string;
  openingStatus: "open" | "closed" | "unknown";
  googleMapsUrl?: string;
};

type DiscoveryResponse = {
  error?: string;
  searchRadiusMeters: number;
  reachMeters: number;
  centreCount: number;
  searchCount: number;
  retrievedCount: number;
  candidateCount: number;
  pocketCount: number;
  selectionMethod: "sol" | "deterministic";
  places: DiscoveredPlace[];
  attribution: string;
};

type DiscoveryState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; result: DiscoveryResponse };

function DiscoveryResult({ result }: { result: DiscoveryResponse }) {
  return (
    <section className={styles.discoveryResult}>
      <div className={styles.discoveryHeading}>
        <div>
          <p className={styles.eyebrow}>The scout returned</p>
          <h2>
            {result.places.length > 0
              ? `${result.places.length} promising story points`
              : result.retrievedCount > 0
                ? "The pieces didn’t form a strong walk"
                : "The scout needs another pass"}
          </h2>
        </div>
        {result.places.length > 0 ? (
          <span>
            {result.selectionMethod === "sol"
              ? "Found by Sol · verified by Google"
              : "Smart fallback"}
          </span>
        ) : null}
      </div>

      {result.places.length > 0 ? (
        <ol className={styles.placeList}>
          {result.places.map((place, index) => (
            <li key={place.providerPlaceId}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{place.name}</strong>
                <p>
                  {humaniseCategory(place.primaryCategory)}
                  {place.address ? ` · ${place.address}` : ""}
                </p>
              </div>
              {place.googleMapsUrl ? (
                <a href={place.googleMapsUrl} rel="noreferrer" target="_blank">
                  Map
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.emptyDiscovery}>
          {result.retrievedCount > 0
            ? `The scout found ${result.retrievedCount} real places, but they did not make a varied, walkable pocket yet. We will not pad the day with weak stops.`
            : "The place providers returned nothing usable for this mood. Try another mood while the scout learns this area."}
        </p>
      )}

      <p className={styles.googleAttribution}>
        Sources: {result.attribution} · searched within{" "}
        {(result.reachMeters / 1_000).toFixed(1)} km
      </p>
    </section>
  );
}

function browserLanguageCode() {
  const language = navigator.language.split("-")[0]?.toLocaleLowerCase();
  return /^[a-z]{2}$/.test(language) ? language : "en";
}

function humaniseCategory(category: string) {
  return category.replaceAll("_", " ");
}

function Choice({
  checked,
  description,
  eyebrow,
  group,
  label,
  mark,
  onChange,
  value,
}: {
  checked: boolean;
  description: string;
  eyebrow?: string;
  group: string;
  label: string;
  mark?: string;
  onChange: () => void;
  value: string;
}) {
  return (
    <label className={`${styles.choice} ${checked ? styles.selected : ""}`}>
      <input
        checked={checked}
        name={group}
        type="radio"
        value={value}
        onChange={onChange}
      />
      <span className={styles.choiceCheck} aria-hidden="true" />
      {mark ? (
        <span className={styles.choiceMark} aria-hidden="true">
          {mark}
        </span>
      ) : null}
      <span className={styles.choiceCopy}>
        {eyebrow ? <small>{eyebrow}</small> : null}
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
    </label>
  );
}

function labelMood(mood: AdventureMood) {
  return mood.charAt(0).toUpperCase() + mood.slice(1);
}

function labelParty(partyMode: AdventurePartyMode) {
  if (partyMode === "couple_friends") {
    return "Couple / friends";
  }

  return partyMode.charAt(0).toUpperCase() + partyMode.slice(1);
}
