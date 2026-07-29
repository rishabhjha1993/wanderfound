"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { log } from "@/lib/logger";
import {
  describeGoogleMapsConfigIssues,
  getGoogleMapsBrowserConfig,
} from "@/lib/maps/config";
import type { PlayerMapHandle, PlayerMapLocation } from "@/lib/maps/contracts";
import { createGoogleMapsAdapter } from "@/lib/maps/google-maps-adapter";
import styles from "./player-location-map.module.css";

type MapView = "loading" | "ready" | "unconfigured" | "failed";

export function PlayerLocationMap({
  location,
}: {
  location: PlayerMapLocation;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<PlayerMapHandle | null>(null);
  const configResult = useMemo(() => getGoogleMapsBrowserConfig(), []);
  const missingVariables = configResult.ok
    ? []
    : describeGoogleMapsConfigIssues(configResult.issues);
  const [view, setView] = useState<MapView>(
    configResult.ok ? "loading" : "unconfigured",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    if (!configResult.ok) {
      log("warn", "map_configuration_invalid", {
        issues: configResult.issues.join(","),
      });
      return;
    }

    let cancelled = false;

    createGoogleMapsAdapter(configResult.config)
      .mount(container, location)
      .then((handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }

        handleRef.current = handle;
        setView("ready");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setView("failed");
        log("error", "map_provider_load_failed", {
          provider: "google_maps",
        });
      });

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [attempt, configResult, location]);

  return (
    <section className={styles.frame} aria-label="Your approximate location">
      <div
        className={styles.canvas}
        ref={containerRef}
        aria-hidden={view !== "ready"}
      />

      {view === "loading" ? (
        <MapMessage
          heading="Drawing the world around you…"
          description="Google Maps is loading only now that your location is ready."
        />
      ) : null}

      {view === "unconfigured" ? (
        <MapMessage
          heading="The map still needs its key."
          description={
            process.env.NODE_ENV === "development"
              ? `Add ${missingVariables.join(" and ")} to .env.local, then restart the app.`
              : "The map connection is being prepared. Your location is safe; please try again shortly."
          }
        />
      ) : null}

      {view === "failed" ? (
        <MapMessage
          heading="The map couldn’t arrive."
          description="Your location is still safe. Check your connection and try loading the map again."
          action={
            <button
              type="button"
              className={styles.retry}
              onClick={() => {
                setView("loading");
                setAttempt((value) => value + 1);
              }}
            >
              Try map again
            </button>
          }
        />
      ) : null}

      {view === "ready" ? (
        <>
          <button
            type="button"
            className={styles.recenter}
            onClick={() => handleRef.current?.recenter()}
            aria-label="Recenter map on me"
          >
            ⌖
          </button>
          <div className={styles.legend}>
            <span aria-hidden="true" />
            Your approximate area
          </div>
        </>
      ) : null}
    </section>
  );
}

function MapMessage({
  action,
  description,
  heading,
}: {
  action?: React.ReactNode;
  description: string;
  heading: string;
}) {
  return (
    <div className={styles.message} role="status">
      <span className={styles.loadingMark} aria-hidden="true" />
      <strong>{heading}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}
