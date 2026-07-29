"use client";

import { useEffect, useRef, useState } from "react";
import {
  AdventureSetup,
  AdventureSetupComplete,
} from "@/components/adventure-setup";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayerLocationMap } from "@/components/player-location-map";
import { trackProductEvent } from "@/lib/analytics/product-events";
import {
  EMPTY_ADVENTURE_SETUP,
  type AdventureSetupDraft,
  type CompleteAdventureSetup,
  isCompleteAdventureSetup,
  readAdventureSetupDraft,
} from "@/lib/adventure/setup-session";
import {
  classifyLocationAccuracy,
  isUsableLocationQuality,
  readSessionLocation,
  requestForegroundLocation,
  type ForegroundLocation,
  type LocationAccuracyQuality,
  type LocationRequestFailure,
} from "@/lib/location/request-foreground-location";
import styles from "./location-permission-experience.module.css";

type LocationAccuracyProblem = "weak_accuracy" | "unusable_accuracy";
type LocationProblem = LocationRequestFailure | LocationAccuracyProblem;
type LocationView =
  | "education"
  | "requesting"
  | "granted"
  | "setup"
  | "setup_complete"
  | "deferred"
  | LocationProblem;

const FAILURE_COPY: Record<
  LocationProblem,
  { heading: string; description: string; action: string }
> = {
  permission_denied: {
    heading: "Location is switched off.",
    description:
      "Allow location for Wanderfound in your browser settings, then try again. We only ask while you’re playing.",
    action: "Try location again",
  },
  position_unavailable: {
    heading: "Your location is hiding.",
    description:
      "Move somewhere with a clearer view of the sky or stronger signal, then try again.",
    action: "Try again",
  },
  timeout: {
    heading: "That took too long.",
    description:
      "Your phone couldn’t get a reliable position in time. Nothing was saved—please try once more.",
    action: "Try again",
  },
  unsupported: {
    heading: "This browser can’t share location.",
    description:
      "Open Wanderfound in a current version of Safari or Chrome on a phone with location services.",
    action: "Check again",
  },
  unknown: {
    heading: "We couldn’t read your location.",
    description:
      "Nothing was saved. Check your browser’s location permission and try again.",
    action: "Try again",
  },
  weak_accuracy: {
    heading: "Your location is a little fuzzy.",
    description:
      "Move near a window or step into an open area, keep location services on, and try again.",
    action: "Improve my location",
  },
  unusable_accuracy: {
    heading: "That area is too broad to start safely.",
    description:
      "Your phone found a position, but not precisely enough to build a reliable walking adventure. Move outdoors and retry.",
    action: "Find me again",
  },
};

export function LocationPermissionExperience() {
  const [view, setView] = useState<LocationView>("education");
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [accuracyQuality, setAccuracyQuality] =
    useState<LocationAccuracyQuality | null>(null);
  const [location, setLocation] = useState<ForegroundLocation | null>(null);
  const [setupDraft, setSetupDraft] = useState<AdventureSetupDraft>(
    EMPTY_ADVENTURE_SETUP,
  );
  const promptTracked = useRef(false);

  useEffect(() => {
    const cachedLocation = readSessionLocation();

    if (!cachedLocation) {
      return;
    }

    const quality = classifyLocationAccuracy(cachedLocation.accuracyM);

    if (!isUsableLocationQuality(quality)) {
      return;
    }

    const savedSetup = readAdventureSetupDraft();
    const hasSetupChoice = Object.values(savedSetup).some(
      (value) => value !== null,
    );

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      setAccuracyM(cachedLocation.accuracyM);
      setAccuracyQuality(quality);
      setLocation(cachedLocation);
      setSetupDraft(savedSetup);
      setView(
        isCompleteAdventureSetup(savedSetup)
          ? "setup_complete"
          : hasSetupChoice
            ? "setup"
            : "granted",
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (promptTracked.current || readSessionLocation()) {
      return;
    }

    promptTracked.current = true;
    trackProductEvent("location_prompt_viewed");
  }, []);

  async function requestLocation() {
    setView("requesting");
    trackProductEvent("location_request_started");

    const result = await requestForegroundLocation();

    if (result.ok) {
      setAccuracyM(result.location.accuracyM);
      setAccuracyQuality(result.quality);
      setLocation(result.location);
      trackProductEvent("location_granted", {
        accuracy: result.quality,
      });

      if (!isUsableLocationQuality(result.quality)) {
        setView(
          result.quality === "weak" ? "weak_accuracy" : "unusable_accuracy",
        );
        trackProductEvent("location_accuracy_rejected", {
          accuracy: result.quality,
        });
        return;
      }

      setView("granted");
      return;
    }

    setView(result.reason);
    trackProductEvent("location_denied", {
      reason: result.reason,
    });
  }

  function deferLocation() {
    setView("deferred");
    trackProductEvent("location_deferred");
  }

  const failure =
    view !== "education" &&
    view !== "requesting" &&
    view !== "granted" &&
    view !== "setup" &&
    view !== "setup_complete" &&
    view !== "deferred"
      ? FAILURE_COPY[view]
      : null;

  return (
    <main className={styles.page}>
      <div className={styles.topography} aria-hidden="true">
        <span className={styles.contourOne} />
        <span className={styles.contourTwo} />
      </div>

      <header className={styles.header}>
        <span className={styles.wordmark}>
          <span className={styles.mark} aria-hidden="true">
            <span />
          </span>
          Wanderfound
        </span>
        <span className={styles.step}>{stepLabel(view)}</span>
      </header>

      <Card
        className={`${styles.card} ${
          view === "granted"
            ? styles.mapCard
            : view === "setup"
              ? styles.setupCard
              : ""
        }`}
      >
        {view === "education" ? (
          <Education onRequest={requestLocation} onDefer={deferLocation} />
        ) : null}

        {view === "requesting" ? <Requesting /> : null}

        {view === "granted" ? (
          <Granted
            accuracyM={accuracyM}
            location={location}
            quality={accuracyQuality}
            onRefresh={requestLocation}
            onContinue={() => {
              setSetupDraft(readAdventureSetupDraft());
              setView("setup");
            }}
          />
        ) : null}

        {view === "setup" ? (
          <AdventureSetup
            initialDraft={setupDraft}
            onBack={() => setView("granted")}
            onComplete={(setup) => {
              setSetupDraft(setup);
              trackSetupCompletion(setup);
              setView("setup_complete");
            }}
          />
        ) : null}

        {view === "setup_complete" &&
        location &&
        isCompleteAdventureSetup(setupDraft) ? (
          <AdventureSetupComplete
            location={location}
            setup={setupDraft}
            onEdit={() => setView("setup")}
          />
        ) : null}

        {view === "deferred" ? <Deferred onRequest={requestLocation} /> : null}

        {failure ? (
          <Failure
            action={failure.action}
            accuracyM={
              view === "weak_accuracy" || view === "unusable_accuracy"
                ? accuracyM
                : null
            }
            description={failure.description}
            heading={failure.heading}
            onRetry={requestLocation}
          />
        ) : null}
      </Card>
    </main>
  );
}

function Education({
  onRequest,
  onDefer,
}: {
  onRequest: () => void;
  onDefer: () => void;
}) {
  return (
    <>
      <p className={styles.eyebrow}>Before we read the world</p>
      <h1>Let Wanderfound find your trailhead.</h1>
      <p className={styles.description}>
        We use your current position to build a walk that begins where you’re
        standing—not to follow you after the adventure ends.
      </p>

      <div className={styles.promiseList}>
        <PromiseItem icon="⌖" title="Only while you play">
          Foreground location starts after you tap the button below.
        </PromiseItem>
        <PromiseItem icon="○" title="Never in the background">
          Closing or ending the adventure stops Wanderfound’s location use.
        </PromiseItem>
        <PromiseItem icon="◇" title="Private by design">
          Your precise coordinates stay out of product analytics.
        </PromiseItem>
      </div>

      <div className={styles.actions}>
        <Button fullWidth onClick={onRequest}>
          Use my location
        </Button>
        <button
          className={styles.secondaryAction}
          type="button"
          onClick={onDefer}
        >
          Not now
        </button>
      </div>

      <p className={styles.browserHint}>
        Your browser will ask for permission next.
      </p>
    </>
  );
}

function Requesting() {
  return (
    <div className={styles.state} aria-live="polite">
      <span className={styles.locatingMark} aria-hidden="true">
        <i />
      </span>
      <p className={styles.eyebrow}>Reading your surroundings</p>
      <h1>Finding where the story begins…</h1>
      <p className={styles.description}>
        Keep this page open for a moment while your phone finds a reliable
        position.
      </p>
    </div>
  );
}

function Granted({
  accuracyM,
  location,
  quality,
  onContinue,
  onRefresh,
}: {
  accuracyM: number | null;
  location: ForegroundLocation | null;
  quality: LocationAccuracyQuality | null;
  onContinue: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className={`${styles.state} ${styles.mapState}`} aria-live="polite">
      <div className={styles.mapIntroduction}>
        <div>
          <p className={styles.eyebrow}>Location ready</p>
          <h1>Here is your trailhead.</h1>
          <p className={styles.description}>
            The coral halo shows the area your phone is confident you’re
            inside—not an exact breadcrumb trail.
          </p>
        </div>
        <div className={styles.signalActions}>
          <p className={styles.accuracy}>
            Signal: {quality ?? "received"}
            {accuracyM === null ? "" : ` · about ${Math.round(accuracyM)} m`}
          </p>
          <button
            className={styles.secondaryAction}
            type="button"
            onClick={onRefresh}
          >
            Refresh location
          </button>
        </div>
      </div>

      {location ? <PlayerLocationMap location={location} /> : null}

      <p className={styles.mapFootnote}>
        Google’s map attribution stays visible inside the map. Wanderfound does
        not add your precise coordinates to product analytics.
      </p>
      <div className={styles.mapActions}>
        <Button onClick={onContinue}>Choose my adventure</Button>
      </div>
    </div>
  );
}

function Deferred({ onRequest }: { onRequest: () => void }) {
  return (
    <div className={styles.state} aria-live="polite">
      <span className={styles.pauseMark} aria-hidden="true">
        ···
      </span>
      <p className={styles.eyebrow}>No pressure</p>
      <h1>We’ll wait at the trailhead.</h1>
      <p className={styles.description}>
        Wanderfound cannot build a nearby adventure without your current
        location, but you can ask again whenever you’re ready.
      </p>
      <Button fullWidth onClick={onRequest}>
        Use my location
      </Button>
      <form action="/auth/signout" method="post">
        <button className={styles.secondaryAction} type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}

function Failure({
  action,
  accuracyM,
  description,
  heading,
  onRetry,
}: {
  action: string;
  accuracyM: number | null;
  description: string;
  heading: string;
  onRetry: () => void;
}) {
  return (
    <div className={styles.state} role="alert">
      <span className={styles.warningMark} aria-hidden="true">
        !
      </span>
      <p className={styles.eyebrow}>We need a little help</p>
      <h1>{heading}</h1>
      <p className={styles.description}>{description}</p>
      {accuracyM === null ? null : (
        <p className={styles.accuracy}>
          Current accuracy: about {Math.round(accuracyM)} m
        </p>
      )}
      <Button fullWidth onClick={onRetry}>
        {action}
      </Button>
      <form action="/auth/signout" method="post">
        <button className={styles.secondaryAction} type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}

function PromiseItem({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: string;
  title: string;
}) {
  return (
    <div className={styles.promise}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </div>
  );
}

function stepLabel(view: LocationView) {
  if (view === "setup") {
    return "Your adventure · 2 of 3";
  }

  if (view === "setup_complete") {
    return "Compass set · 2 of 3";
  }

  return "Trailhead · 1 of 3";
}

function trackSetupCompletion(setup: CompleteAdventureSetup) {
  trackProductEvent("setup_completed", {
    duration_minutes: setup.durationMinutes,
    mood: setup.mood,
    party_mode: setup.partyMode,
  });
}
