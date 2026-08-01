"use client";

import { useState } from "react";
import {
  ADVENTURE_MOODS,
  ADVENTURE_PARTY_MODES,
  type AdventureDayShape,
  type AdventureMood,
  type AdventurePartyMode,
} from "@/lib/adventure/setup-session";
import styles from "./playability-debugger.module.css";

type CandidateRow = {
  providerPlaceId: string;
  name: string;
  primaryCategory: string;
  categories: string[];
  coordinates: { latitude: number; longitude: number };
  openingStatus: string;
  publicAccess: string;
  purchaseRequired: string;
  exteriorObservable: boolean;
  commercialVenue: boolean;
  reviewCount: number | null;
  selected?: boolean;
  reason?: string;
  detail?: string;
};

type DebugResult = {
  searchRadiusMeters: number;
  reachMeters: number;
  centreCount: number;
  searchCount: number;
  rankBy: string;
  retrievedCount: number;
  candidateCount: number;
  rejectedCount: number;
  selectionMethod: string;
  aiCuratorRequested: boolean;
  aiCuratorConfigured: boolean;
  routing?: {
    checked: boolean;
    readyPocketCount: number;
    rejectedPocketCount: number;
    unavailablePocketCount: number;
    matrixElementCount: number;
  };
  candidates: CandidateRow[];
  rejected: CandidateRow[];
};

/** Fontainhas, the quarter the discovery rules were corrected against. */
const DEFAULT_ORIGIN = { latitude: "15.4989", longitude: "73.8317" };

export function PlayabilityDebugger() {
  const [latitude, setLatitude] = useState(DEFAULT_ORIGIN.latitude);
  const [longitude, setLongitude] = useState(DEFAULT_ORIGIN.longitude);
  const [dayShape, setDayShape] = useState<AdventureDayShape>("full_day");
  const [mood, setMood] = useState<AdventureMood>("historical");
  const [partyMode, setPartyMode] = useState<AdventurePartyMode>("solo");
  const [useAiCurator, setUseAiCurator] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DebugResult | null>(null);

  async function run() {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/debug/playability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: {
            latitude: Number(latitude),
            longitude: Number(longitude),
          },
          dayShape,
          mood,
          partyMode,
          languageCode: "en",
          useAiCurator,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(
          `${payload.error ?? "Request failed."}${
            payload.code ? ` (${payload.code})` : ""
          }`,
        );
        setResult(null);
        return;
      }

      setResult(payload as DebugResult);
    } catch {
      setError("Could not reach the debug endpoint.");
      setResult(null);
    } finally {
      setStatus("idle");
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("This browser exposes no geolocation API.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
      },
      () => setError("Location permission was refused."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Playability debugger</h1>
        <p className={styles.subtitle}>
          Founder tooling. Shows every place retrieved, why each was rejected,
          and which the curator chose.
        </p>
      </header>

      <section className={styles.controls}>
        <label className={styles.field}>
          Latitude
          <input
            className={styles.input}
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className={styles.field}>
          Longitude
          <input
            className={styles.input}
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            inputMode="decimal"
          />
        </label>
        <label className={styles.field}>
          Day shape
          <select
            className={styles.input}
            value={dayShape}
            onChange={(event) =>
              setDayShape(event.target.value as AdventureDayShape)
            }
          >
            <option value="half_day">Half a day</option>
            <option value="full_day">A full day</option>
          </select>
        </label>
        <label className={styles.field}>
          Mood
          <select
            className={styles.input}
            value={mood}
            onChange={(event) => setMood(event.target.value as AdventureMood)}
          >
            {ADVENTURE_MOODS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Party
          <select
            className={styles.input}
            value={partyMode}
            onChange={(event) =>
              setPartyMode(event.target.value as AdventurePartyMode)
            }
          >
            {ADVENTURE_PARTY_MODES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={useAiCurator}
            onChange={(event) => setUseAiCurator(event.target.checked)}
          />
          Use Sol
        </label>

        <div className={styles.actions}>
          <button
            className={styles.button}
            type="button"
            onClick={useCurrentLocation}
          >
            Use my location
          </button>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={run}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Scouting…" : "Run discovery"}
          </button>
        </div>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      {result ? (
        <>
          <section className={styles.summary}>
            <Stat label="Retrieved" value={result.retrievedCount} />
            <Stat label="Passed filters" value={result.candidateCount} />
            <Stat label="Rejected" value={result.rejectedCount} />
            <Stat label="Reach" value={`${result.reachMeters} m`} />
            <Stat label="Centres" value={String(result.centreCount)} />
            <Stat label="Searches" value={String(result.searchCount)} />
            <Stat label="Ranked by" value={result.rankBy} />
            <Stat label="Chosen by" value={result.selectionMethod} />
            {result.routing ? (
              <>
                <Stat
                  label="Walkable pockets"
                  value={result.routing.readyPocketCount}
                />
                <Stat
                  label="Route pairs checked"
                  value={result.routing.matrixElementCount}
                />
              </>
            ) : null}
          </section>

          {result.aiCuratorRequested && result.selectionMethod !== "sol" ? (
            <p className={styles.warning}>
              Sol was requested but did not produce the selection.
              {result.aiCuratorConfigured
                ? " The call failed and the deterministic curator ran instead."
                : " No AI key is configured in this environment."}
            </p>
          ) : null}

          <CandidateTable
            heading={`Passed filters (${result.candidates.length})`}
            rows={result.candidates}
            emptyMessage="Nothing survived the filters here."
          />
          <CandidateTable
            heading={`Rejected (${result.rejected.length})`}
            rows={result.rejected}
            emptyMessage="Nothing was rejected."
            showReason
          />
        </>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

function CandidateTable({
  heading,
  rows,
  emptyMessage,
  showReason = false,
}: {
  heading: string;
  rows: CandidateRow[];
  emptyMessage: string;
  showReason?: boolean;
}) {
  return (
    <section className={styles.tableSection}>
      <h2 className={styles.tableHeading}>{heading}</h2>

      {rows.length === 0 ? (
        <p className={styles.empty}>{emptyMessage}</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Place</th>
                <th>Category</th>
                <th>Reviews</th>
                <th>Opening</th>
                <th>Access</th>
                <th>Purchase</th>
                <th>{showReason ? "Rejected because" : "Chosen"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.providerPlaceId}-${row.reason ?? "kept"}`}
                  className={row.selected ? styles.selectedRow : undefined}
                >
                  <td>{row.name}</td>
                  <td>{row.primaryCategory}</td>
                  <td>{row.reviewCount ?? "—"}</td>
                  <td>{row.openingStatus}</td>
                  <td>{row.publicAccess}</td>
                  <td>{row.purchaseRequired}</td>
                  <td>
                    {showReason ? (
                      <span title={row.detail}>{row.reason}</span>
                    ) : row.selected ? (
                      "chosen"
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
