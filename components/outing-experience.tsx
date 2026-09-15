"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  inGoa,
  isStale,
  navigationUrl,
  OutingResultSchema,
  type Coordinate,
  type OutingOption,
  type OutingRequest,
  type OutingResult,
} from "@/lib/outings/domain";
import {
  decodeShare,
  encodeShare,
  readSession,
  SESSION_KEY,
  writeSession,
} from "@/lib/outings/session";
import styles from "./outing-experience.module.css";

const STARTERS = [
  {
    icon: "☀",
    label: "A slower afternoon",
    prompt:
      "Two of us want a slow, beautiful afternoon. Somewhere interesting to sit, look around and take it easy. Keep travel short.",
  },
  {
    icon: "◒",
    label: "Something beyond the beach",
    prompt:
      "We’ve done the beaches. Find something creative or cultural that feels like a different side of Goa.",
  },
  {
    icon: "✳",
    label: "Follow the food",
    prompt:
      "We’re hungry. Find distinctive Goan food or a bakery worth visiting, with somewhere to sit. Nothing fancy.",
  },
];
type EventName =
  | "started"
  | "selected"
  | "navigation"
  | "shared"
  | "shared_opened"
  | "returned"
  | "went"
  | "changed_plans"
  | "did_not_go"
  | "useful"
  | "not_useful";

export function OutingExperience() {
  const [area, setArea] = useState("Siolim");
  const [hours, setHours] = useState(3);
  const [transport, setTransport] =
    useState<OutingRequest["transport"]>("scooter");
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<OutingRequest["history"]>([]);
  const [result, setResult] = useState<OutingResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Coordinate>();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [shared, setShared] = useState(false);
  const [storageWorks, setStorageWorks] = useState(true);
  const [locating, setLocating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const sessionId = useRef("");
  const abort = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const source = useRef<"direct" | "shared">("direct");

  function track(name: EventName, outingId?: string) {
    if (!sessionId.current) return;
    void fetch("/api/outings/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sessionId: sessionId.current,
        ...(outingId ? { outingId } : {}),
        source: source.current,
      }),
      keepalive: true,
    }).catch(() => {});
  }

  useEffect(() => {
    const loadSharedOuting = () => {
      const share = new URLSearchParams(window.location.hash.slice(1)).get(
        "outing",
      );
      if (!share) return;
      const parsed = decodeShare(share);
      if (parsed) {
        setResult(parsed);
        setSelectedId(parsed.options[0]?.id ?? null);
        setShared(true);
        setFeedback("");
        source.current = "shared";
        track("shared_opened", parsed.id);
      } else {
        setError(
          "This shared outing couldn’t be read. You can still find a new one below.",
        );
      }
    };
    const timer = window.setTimeout(() => {
      sessionId.current = crypto.randomUUID();
      let restored = null;
      try {
        restored = readSession(localStorage);
      } catch {
        setStorageWorks(false);
      }
      if (restored) {
        sessionId.current = restored.sessionId;
        setArea(restored.area);
        setHours(restored.hours);
        setTransport(restored.transport);
        setDraft(restored.draft);
        setHistory(restored.history);
        setResult(restored.result);
        setSelectedId(restored.selectedId);
        if (restored.result && !window.location.hash.includes("outing="))
          track("returned", restored.result.id);
      }
      loadSharedOuting();
      setReady(true);
    }, 0);
    window.addEventListener("hashchange", loadSharedOuting);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", loadSharedOuting);
      abort.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!ready || shared) return;
    try {
      const saved = writeSession(localStorage, {
        sessionId: sessionId.current,
        area,
        hours,
        transport,
        draft,
        history,
        result,
        selectedId,
        updatedAt: Date.now(),
      });
      if (!saved) queueMicrotask(() => setStorageWorks(false));
    } catch {
      queueMicrotask(() => setStorageWorks(false));
    }
  }, [
    area,
    hours,
    transport,
    draft,
    history,
    result,
    selectedId,
    ready,
    shared,
  ]);

  async function generate(override?: string) {
    const text = (override ?? draft).trim();
    if (busy) return;
    if (text.length < 3 || area.trim().length < 2) {
      setError(
        "Add a Goa area and tell us a little about what you’d like to do.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    setFeedback("");
    setStage("Starting your research");
    const controller = new AbortController();
    abort.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 65000);
    const context = shared ? [] : history;
    track("started");
    let completed = false;
    try {
      const response = await fetch("/api/outings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          ...(origin ? { origin } : {}),
          hours,
          transport,
          message: text,
          history: context,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(
          body.error || "Couldn’t start research. Please try again.",
        );
      }
      if (!response.body)
        throw new Error("The connection was interrupted. Please try again.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const acceptLine = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line);
        if (event.type === "progress" && typeof event.stage === "string")
          setStage(event.stage);
        if (event.type === "error") throw new Error(event.error);
        if (event.type === "result") {
          const next = OutingResultSchema.parse(event.result);
          setResult(next);
          setSelectedId(null);
          setHours(next.hours);
          setTransport(next.transport);
          setDraft("");
          setShared(false);
          window.history.replaceState(null, "", window.location.pathname);
          setHistory(
            [
              ...context,
              { role: "user" as const, content: text },
              {
                role: "assistant" as const,
                content: JSON.stringify({
                  summary: next.summary,
                  context: next.context,
                  places: next.options.map((o) => ({
                    name: o.name,
                    category: o.category,
                    distanceKm: o.distanceKm,
                  })),
                  hours: next.hours,
                  transport: next.transport,
                }).slice(0, 1600),
              },
            ].slice(-10),
          );
          completed = true;
          window.setTimeout(
            () =>
              resultsRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              }),
            100,
          );
        }
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) acceptLine(line);
      }
      buffer += decoder.decode();
      if (buffer.trim()) acceptLine(buffer);
      if (!completed)
        throw new Error(
          "The connection ended before your outing was ready. Please try again.",
        );
    } catch (err) {
      setError(
        controller.signal.aborted
          ? "Research was interrupted. Your request is still here—try again when you’re ready."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
      abort.current = null;
    }
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setError(
        "Location isn’t available in this browser. Enter your area instead.",
      );
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (!inGoa(point)) {
          setMessage(
            "You can test from anywhere. Choose a Goa area below; we’re exploring Goa first.",
          );
          return;
        }
        setOrigin(point);
        setArea("My location in Goa");
        setMessage(
          "Location set for this request. Your precise starting point isn’t included in shared links.",
        );
      },
      () => {
        setLocating(false);
        setMessage("No problem—type your Goa area instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function share(option: OutingOption) {
    if (!result) return;
    const url = `${window.location.origin}/#${new URLSearchParams({ outing: encodeShare(result, option) })}`;
    try {
      if (navigator.share)
        await navigator.share({
          title: option.name,
          text: "A little Goa discovery, from Wanderfound.",
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        setMessage(
          "Share link copied. It includes this place, not your conversation or starting location.",
        );
      }
      track("shared", result.id);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError"))
        setMessage(
          "Sharing isn’t available here. Open the place in Maps to share it from there.",
        );
    }
  }

  function reset() {
    abort.current?.abort();
    setResult(null);
    setSelectedId(null);
    setHistory([]);
    setDraft("");
    setError("");
    setMessage("");
    setFeedback("");
    setShared(false);
    window.history.replaceState(null, "", "/");
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    textareaRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const selected = result?.options.find((o) => o.id === selectedId);
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Wanderfound home">
          <span className={styles.brandMark} aria-hidden="true">
            ✳
          </span>{" "}
          wanderfound<span className={styles.brandDot}>.</span>
        </Link>
        <span className={styles.edition}>
          GOA FIELD EDITION <span>01</span>
        </span>
      </header>
      <section className={`${styles.hero} ${result ? styles.heroCompact : ""}`}>
        <div className={styles.eyebrow}>
          <span /> A LITTLE LESS PLANNING. A LITTLE MORE GOA.
        </div>
        <h1>
          Your next few hours,
          <br />
          <em>well wandered.</em>
        </h1>
        <p className={styles.intro}>
          Tell us what you’re in the mood for. We’ll find a real place worth
          your time—and figure out the practical bits.
        </p>
        <div className={styles.postmark} aria-hidden="true">
          <span>15.49° N</span>
          <b>
            GO
            <br />
            SOMEWHERE
            <br />
            GOOD
          </b>
          <span>73.83° E</span>
        </div>
      </section>

      <section className={styles.composer} aria-label="Plan your outing">
        <div className={styles.composerTop}>
          <span className={styles.label}>
            {result && !shared
              ? "KEEP THE GOOD PARTS. CHANGE THE REST."
              : "LET’S START WITH YOU"}
          </span>
          {result ? (
            <button
              className={styles.textButton}
              type="button"
              onClick={reset}
              disabled={busy}
            >
              Start fresh ↗
            </button>
          ) : (
            <span className={styles.freeLabel}>Free to explore</span>
          )}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void generate();
          }}
        >
          <label className="sr-only" htmlFor="outing-request">
            What would you like to do?
          </label>
          <textarea
            id="outing-request"
            ref={textareaRef}
            className={styles.prompt}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={1200}
            disabled={busy}
            placeholder={
              result && !shared
                ? "A little closer? Less walking? Tell me what to change…"
                : "We’ve done the beaches. Two of us, a scooter, and an afternoon to spare…"
            }
            rows={3}
          />
          {!result && (
            <div className={styles.starters}>
              {STARTERS.map((starter) => (
                <button
                  type="button"
                  key={starter.label}
                  onClick={() => {
                    setDraft(starter.prompt);
                    textareaRef.current?.focus();
                  }}
                  disabled={busy}
                >
                  <span aria-hidden="true">{starter.icon}</span>
                  {starter.label}
                </button>
              ))}
            </div>
          )}
          <div className={styles.controls}>
            <div className={styles.areaControl}>
              <label htmlFor="outing-area">STARTING AROUND</label>
              <div>
                <input
                  id="outing-area"
                  list="goa-areas"
                  value={area}
                  maxLength={160}
                  onChange={(event) => {
                    setArea(event.target.value);
                    setOrigin(undefined);
                  }}
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={useLocation}
                  disabled={busy || locating}
                  aria-label="Use my location"
                  title="Use my location"
                >
                  {locating ? "…" : "⌖"}
                </button>
              </div>
              <datalist id="goa-areas">
                {[
                  "Siolim",
                  "Panjim",
                  "Assagao",
                  "Anjuna",
                  "Candolim",
                  "Mapusa",
                  "Margao",
                  "Palolem",
                  "Colva",
                  "Old Goa",
                ].map((place) => (
                  <option key={place} value={place} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="outing-hours">TIME TO SPARE</label>
              <select
                id="outing-hours"
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
                disabled={busy}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                  <option key={h} value={h}>
                    {h} {h === 1 ? "hour" : "hours"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="outing-transport">GETTING AROUND</label>
              <select
                id="outing-transport"
                value={transport}
                onChange={(event) =>
                  setTransport(event.target.value as OutingRequest["transport"])
                }
                disabled={busy}
              >
                <option value="scooter">Scooter</option>
                <option value="drive">Car / taxi</option>
                <option value="walk">On foot</option>
              </select>
            </div>
            <button
              className={styles.primary}
              type="submit"
              disabled={busy || !ready}
            >
              {busy
                ? "Finding your next move…"
                : result && !shared
                  ? "Rethink my outing ↗"
                  : "Find my next move ↗"}
            </button>
          </div>
        </form>
        <div className={styles.composerFoot}>
          <span>Real places. Current research. Your kind of day.</span>
          <span>
            {storageWorks
              ? "Saved on this browser"
              : "Browser storage unavailable"}
          </span>
        </div>
        {busy && (
          <div className={styles.progress} role="status">
            <span className={styles.spinner} />
            <div>
              <strong>{stage}</strong>
              <small>
                This usually takes around half a minute. You can leave the tab
                open.
              </small>
            </div>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => abort.current?.abort()}
            >
              Cancel
            </button>
          </div>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className={styles.message} role="status">
            {message}
          </p>
        )}
      </section>

      {result && (
        <section
          ref={resultsRef}
          className={styles.results}
          aria-label="Your outing choices"
          aria-busy={busy}
        >
          <div className={styles.resultHeading}>
            <div>
              <span className={styles.eyebrow}>
                {shared
                  ? "A DISCOVERY, PASSED ALONG"
                  : "A FEW GOOD POSSIBILITIES"}
              </span>
              <h2>
                {selected
                  ? "That sounds like your kind of day."
                  : result.options.length
                    ? "Here’s where I’d start."
                    : "Let’s try a different angle."}
              </h2>
            </div>
            <span className={styles.checked}>
              Checked{" "}
              {new Date(result.checkedAt).toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST
            </span>
          </div>
          <p className={styles.summary}>{result.summary}</p>
          {isStale(result.checkedAt) && (
            <p className={styles.stale}>
              This outing is from an earlier session. Recheck opening times in
              Maps, or ask for fresh research before heading out.
            </p>
          )}
          {result.weather && (
            <p className={styles.weather}>
              ☁ {result.weather}{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
              >
                Source ↗
              </a>
            </p>
          )}
          {result.clarification && (
            <div className={styles.empty}>
              <span aria-hidden="true">↻</span>
              <p>{result.clarification}</p>
              <button
                className={styles.secondary}
                onClick={() => textareaRef.current?.focus()}
                type="button"
              >
                Adjust my request ↑
              </button>
            </div>
          )}
          <div className={styles.cards}>
            {result.options.map((option, index) => (
              <OutingCard
                key={option.id}
                option={option}
                index={index}
                selected={selectedId === option.id}
                shared={shared}
                transport={result.transport}
                onSelect={() => {
                  setSelectedId(option.id);
                  setFeedback("");
                  track("selected", result.id);
                }}
                onNavigate={() => track("navigation", result.id)}
                onShare={() => void share(option)}
              />
            ))}
          </div>
          {result.options.length > 0 && (
            <>
              {!shared && (
                <div className={styles.refine}>
                  <span>Not quite your mood?</span>
                  {[
                    "A little closer",
                    "Less walking",
                    "Something indoors",
                    "We’re hungry now",
                  ].map((revision) => (
                    <button
                      key={revision}
                      disabled={busy}
                      onClick={() => {
                        setDraft(revision);
                        void generate(revision);
                      }}
                      type="button"
                    >
                      {revision} ↗
                    </button>
                  ))}
                </div>
              )}
              {selected && (
                <div className={styles.feedback}>
                  <div>
                    <span className={styles.label}>HOW DID IT GO?</span>
                    <p>Your real-world verdict helps shape Wanderfound.</p>
                  </div>
                  <div>
                    {feedback ? (
                      <span role="status">{feedback}</span>
                    ) : (
                      <>
                        {(
                          [
                            ["went", "We went"],
                            ["changed_plans", "Changed plans"],
                            ["did_not_go", "Didn’t go"],
                          ] as const
                        ).map(([event, label]) => (
                          <button
                            className={styles.secondary}
                            type="button"
                            key={event}
                            onClick={() => {
                              track(event, result.id);
                              setFeedback(
                                event === "went"
                                  ? "Thanks for taking us along. Was it worth the trip?"
                                  : "Thanks—that’s useful to know. Try another outing whenever you’re ready.",
                              );
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </>
                    )}
                    {feedback.includes("worth the trip") && (
                      <div className={styles.verdict}>
                        <button
                          type="button"
                          onClick={() => {
                            track("useful", result.id);
                            setFeedback(
                              "Good to hear. Come back when you have a few more hours to fill.",
                            );
                          }}
                        >
                          Yes, worth it
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            track("not_useful", result.id);
                            setFeedback(
                              "Thanks for being honest. We’re learning what deserves your time.",
                            );
                          }}
                        >
                          Not really
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <details className={styles.notices}>
                <summary>A few practical things</summary>
                <ul>
                  {result.notices.map((notice) => (
                    <li key={notice}>{notice}</li>
                  ))}
                </ul>
                <p>
                  Research uses the linked sources; place information is
                  provided by Google Maps. A place listing does not confirm a
                  booking.
                </p>
              </details>
            </>
          )}
        </section>
      )}

      {!result && (
        <section className={styles.how}>
          <div>
            <span>01 / YOUR MOOD</span>
            <h3>Start with a feeling.</h3>
            <p>Hungry, curious, a little restless. A sentence is plenty.</p>
          </div>
          <div>
            <span>02 / THE REAL WORLD</span>
            <h3>We do the checking.</h3>
            <p>Real places, source links, opening details and the journey.</p>
          </div>
          <div>
            <span>03 / ROOM TO WANDER</span>
            <h3>Make it your own.</h3>
            <p>
              Change your mind. Take a friend. Find your next little discovery.
            </p>
          </div>
        </section>
      )}
      <footer className={styles.footer}>
        <span>Made for days that don’t need a big plan.</span>
        <span>
          GOA, FOR NOW. <span aria-hidden="true">✳</span>
        </span>
      </footer>
    </main>
  );
}

function OutingCard({
  option,
  index,
  selected,
  shared,
  transport,
  onSelect,
  onNavigate,
  onShare,
}: {
  option: OutingOption;
  index: number;
  selected: boolean;
  shared: boolean;
  transport: OutingRequest["transport"];
  onSelect: () => void;
  onNavigate: () => void;
  onShare: () => void;
}) {
  const label = {
    nature: "OUTSIDE & UNHURRIED",
    culture: "A LITTLE CULTURE",
    food: "FOLLOW YOUR APPETITE",
    creative: "SOMETHING DIFFERENT",
    slow: "TAKE IT SLOW",
  }[option.category];
  return (
    <article
      className={`${styles.card} ${selected ? styles.cardSelected : ""}`}
    >
      <div
        className={`${styles.cardArt} ${styles[option.category]}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice">
          <circle cx="275" cy="42" r="25" />
          <path d="M-20 125Q55 40 133 110T290 75T400 95V160H-20Z" />
          <path d="M-20 152Q70 88 162 140T360 95" />
          <path d="M40 155L63 58M63 58Q14 13 2 53M63 58Q105 3 142 30M63 58Q115 39 136 78M63 58Q17 32 5 84" />
        </svg>
        <span>
          {String(index + 1).padStart(2, "0")} / {label}
        </span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardEyebrow}>
          <span>
            {index === 0 && !shared
              ? "OUR FIRST PICK"
              : "ANOTHER WAY TO SPEND IT"}
          </span>
          {option.openNow !== null && (
            <span className={option.openNow ? styles.open : styles.closed}>
              {option.openNow ? "Open now" : "Closed now"}
            </span>
          )}
        </div>
        <h3>{option.title}</h3>
        <p className={styles.placeName}>{option.name}</p>
        <p className={styles.why}>{option.why}</p>
        <div className={styles.facts}>
          <span>◷ Around {option.visitMinutes} min there</span>
          {!shared && (
            <span>
              ↗{" "}
              {option.travelMinutes !== null
                ? `~${option.travelMinutes} min each way`
                : `${option.distanceKm} km direct · travel unverified`}
            </span>
          )}
          <span>₹ {option.priceLabel}</span>
        </div>
        <p className={styles.experience}>{option.experience}</p>
        <details className={styles.details}>
          <summary>
            Details & sources <span>+</span>
          </summary>
          <p>{option.address}</p>
          {option.practicalNote && <p>{option.practicalNote}</p>}
          {option.weeklyHours.length > 0 && (
            <>
              <strong>Listed hours</strong>
              <ul>
                {option.weeklyHours.map((day) => (
                  <li key={day}>{day}</li>
                ))}
              </ul>
            </>
          )}
          <div className={styles.sources}>
            {option.sources.map((s) => (
              <a href={s.url} key={s.url} target="_blank" rel="noreferrer">
                {s.title} ↗
              </a>
            ))}
            <a href={option.mapsUrl} target="_blank" rel="noreferrer">
              Google Maps · place details ↗
            </a>
            {option.website && (
              <a href={option.website} target="_blank" rel="noreferrer">
                Venue website ↗
              </a>
            )}
          </div>
        </details>
        <div className={styles.cardActions}>
          {selected ? (
            <>
              <a
                className={styles.primary}
                href={navigationUrl(option, transport)}
                onClick={onNavigate}
                target="_blank"
                rel="noreferrer"
              >
                Let’s go · open Maps ↗
              </a>
              <button
                className={styles.share}
                type="button"
                onClick={onShare}
                aria-label={`Share ${option.name}`}
              >
                ↗ Share
              </button>
            </>
          ) : (
            <button
              className={styles.secondary}
              type="button"
              onClick={onSelect}
            >
              This is my kind of outing <span>↗</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
