"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { log } from "@/lib/logger";
import {
  describeGoogleMapsConfigIssues,
  getGoogleMapsBrowserConfig,
} from "@/lib/maps/config";
import type {
  PlayerMapHandle,
  PlayerMapLayers,
  PlayerMapLocation,
} from "@/lib/maps/contracts";
import { createGoogleMapsAdapter } from "@/lib/maps/google-maps-adapter";
import styles from "./player-location-map.module.css";

type MapView = "loading" | "ready" | "unconfigured" | "failed";

export function PlayerLocationMap({
  layers,
  location,
}: {
  layers?: PlayerMapLayers;
  location: PlayerMapLocation;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<PlayerMapHandle | null>(null);
  const latestLayersRef = useRef(layers);
  const latestLocationRef = useRef(location);
  const configResult = useMemo(() => getGoogleMapsBrowserConfig(), []);
  const missingVariables = configResult.ok
    ? []
    : describeGoogleMapsConfigIssues(configResult.issues);
  const [view, setView] = useState<MapView>(
    configResult.ok ? "loading" : "unconfigured",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    latestLocationRef.current = location;
  }, [location]);

  useEffect(() => {
    latestLayersRef.current = layers;
  }, [layers]);

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
      .mount(container, latestLocationRef.current)
      .then((handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }

        handleRef.current = handle;
        handle.updatePlayerLocation(latestLocationRef.current);
        applyLayers(handle, latestLayersRef.current);
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
  }, [attempt, configResult]);

  useEffect(() => {
    handleRef.current?.updatePlayerLocation(location);
  }, [location]);

  useEffect(() => {
    if (handleRef.current) {
      applyLayers(handleRef.current, layers);
    }
  }, [layers]);

  return (
    <section className={styles.frame} aria-label="Your approximate location">
      <div
        className={styles.canvas}
        ref={containerRef}
        aria-hidden={view !== "ready"}
      />
      <div className={styles.mist} aria-hidden="true" />
      <svg
        className={styles.contours}
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M-50 118C80 22 225 35 302 101s15 145-98 148S-1 216-50 284" />
        <path d="M-38 146C72 65 192 69 251 118s10 103-78 108S12 207-38 254" />
        <path d="M1067 194c-85-80-196-67-246-11s1 121 88 122 137-46 158-87" />
        <path d="M1054 225c-66-58-148-50-184-8s4 83 64 84 98-31 120-65" />
        <path d="M280 527c55-92 152-135 249-111s119 78 208 58 125-83 199-74" />
      </svg>
      <div className={styles.motes} aria-hidden="true" />

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
            <span className={styles.compass} aria-hidden="true" />
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

function applyLayers(handle: PlayerMapHandle, layers?: PlayerMapLayers) {
  handle.setSearchArea(layers?.searchArea ?? null);
  handle.setRoute(layers?.route ?? null);
  handle.setDiscoveredStages(layers?.discoveredStages ?? []);
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
