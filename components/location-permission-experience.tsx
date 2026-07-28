"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trackProductEvent } from "@/lib/analytics/product-events";
import {
  requestForegroundLocation,
  type LocationRequestFailure,
} from "@/lib/location/request-foreground-location";
import styles from "./location-permission-experience.module.css";

type LocationView =
  "education" | "requesting" | "granted" | "deferred" | LocationRequestFailure;

const FAILURE_COPY: Record<
  LocationRequestFailure,
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
};

export function LocationPermissionExperience() {
  const [view, setView] = useState<LocationView>("education");
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const promptTracked = useRef(false);

  useEffect(() => {
    if (promptTracked.current) {
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
      setView("granted");
      trackProductEvent("location_granted", {
        accuracy: accuracyBucket(result.location.accuracyM),
      });
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
        <span className={styles.step}>Trailhead · 1 of 3</span>
      </header>

      <Card className={styles.card}>
        {view === "education" ? (
          <Education onRequest={requestLocation} onDefer={deferLocation} />
        ) : null}

        {view === "requesting" ? <Requesting /> : null}

        {view === "granted" ? (
          <Granted accuracyM={accuracyM} onRefresh={requestLocation} />
        ) : null}

        {view === "deferred" ? <Deferred onRequest={requestLocation} /> : null}

        {failure ? (
          <Failure
            action={failure.action}
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
  onRefresh,
}: {
  accuracyM: number | null;
  onRefresh: () => void;
}) {
  return (
    <div className={styles.state} aria-live="polite">
      <span className={styles.successMark} aria-hidden="true">
        ✓
      </span>
      <p className={styles.eyebrow}>Location ready</p>
      <h1>We found your trailhead.</h1>
      <p className={styles.description}>
        Your position is ready for the map. Adventure choices come next.
      </p>
      <p className={styles.accuracy}>Signal: {accuracyLabel(accuracyM)}</p>
      <button
        className={styles.secondaryAction}
        type="button"
        onClick={onRefresh}
      >
        Refresh location
      </button>
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
  description,
  heading,
  onRetry,
}: {
  action: string;
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

function accuracyBucket(accuracyM: number) {
  if (accuracyM <= 25) {
    return "strong";
  }

  if (accuracyM <= 100) {
    return "usable";
  }

  return "weak";
}

function accuracyLabel(accuracyM: number | null) {
  if (accuracyM === null) {
    return "received";
  }

  return accuracyBucket(accuracyM);
}
