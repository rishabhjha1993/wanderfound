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
  writeSession,
} from "@/lib/outings/session";
import styles from "./outing-experience.module.css";

const STARTERS = [
  "We’re tired, hungry and want something distinctly Goan without a long ride.",
  "It may rain. Give us an interesting indoor afternoon away from the beaches.",
  "My parents are with us. Keep it comfortable, quiet and worth leaving for.",
];

const REPLANS = [
  [
    "It’s crowded",
    "The place is too crowded. Replan with somewhere calmer nearby.",
  ],
  [
    "It’s closed",
    "The primary place is closed. Switch us to a verified fallback now.",
  ],
  [
    "Weather changed",
    "The weather changed. Replan the rest of the outing for indoors.",
  ],
  [
    "We finished early",
    "We finished early. Give us the best next move nearby.",
  ],
  ["We’re hungry", "We’re hungry now. Replan around distinctive local food."],
] as const;

const MEMORY_CHOICES = [
  "We like a slow pace",
  "We prefer local over touristy",
  "Keep journeys short",
  "We like cultural places",
  "Food should be vegetarian-friendly",
] as const;

type Phase = "planning" | "active" | "complete";
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
  | "not_useful"
  | "agent_accepted"
  | "replan_requested"
  | "memory_added";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: (event: {
    results: { [index: number]: { [index: number]: { transcript: string } } };
  }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function OutingExperience() {
  const [area, setArea] = useState("Siolim");
  const [hours, setHours] = useState(3);
  const [transport, setTransport] =
    useState<OutingRequest["transport"]>("scooter");
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<OutingRequest["history"]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [result, setResult] = useState<OutingResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("planning");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [clock, setClock] = useState(0);
  const [origin, setOrigin] = useState<Coordinate>();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [shared, setShared] = useState(false);
  const [storageWorks, setStorageWorks] = useState(true);
  const [locating, setLocating] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
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
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const loadSharedOuting = () => {
      const share = new URLSearchParams(window.location.hash.slice(1)).get(
        "outing",
      );
      if (!share) return;
      const parsed = decodeShare(share);
      if (parsed) {
        setResult(parsed);
        setSelectedId(parsed.agent.primaryId);
        setPhase("planning");
        setShared(true);
        source.current = "shared";
        track("shared_opened", parsed.id);
      } else {
        setError(
          "This shared outing could not be read. Start a fresh one below.",
        );
      }
    };
    const timer = window.setTimeout(() => {
      setVoiceAvailable(
        Boolean(
          speechWindow.SpeechRecognition ||
          speechWindow.webkitSpeechRecognition,
        ),
      );
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
        setPreferences(restored.preferences);
        setResult(restored.result);
        setSelectedId(restored.selectedId);
        setPhase(restored.phase);
        setStartedAt(restored.startedAt);
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
    if (phase !== "active") return;
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [phase]);

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
        preferences,
        phase,
        startedAt,
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
    preferences,
    phase,
    startedAt,
    ready,
    shared,
  ]);

  async function generate(override?: string, isReplan = false) {
    const text = (override ?? draft).trim();
    if (busy) return;
    if (text.length < 3 || area.trim().length < 2) {
      setError("Tell your agent what is happening and add your Goa area.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    setFeedback("");
    setStage(
      isReplan
        ? "Reassessing the live situation"
        : "Understanding the situation",
    );
    const controller = new AbortController();
    abort.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 65_000);
    const context = shared ? [] : history;
    track(isReplan ? "replan_requested" : "started", result?.id);
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
          preferences,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(
          body.error || "The agent could not start. Please try again.",
        );
      }
      if (!response.body) throw new Error("The connection was interrupted.");
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
          setSelectedId(next.agent.primaryId);
          setPhase("planning");
          setStartedAt(null);
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
                  decision: next.agent.decision,
                  primary: next.options.find(
                    (option) => option.id === next.agent.primaryId,
                  )?.name,
                  fallback: next.options.find(
                    (option) => option.id === next.agent.fallbackId,
                  )?.name,
                  context: next.context,
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
        throw new Error("The connection ended before the plan was ready.");
    } catch (caught) {
      setError(
        controller.signal.aborted
          ? "The agent was interrupted. Your situation is saved—try again."
          : caught instanceof Error
            ? caught.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      window.clearTimeout(timer);
      setBusy(false);
      abort.current = null;
    }
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setError("Location is unavailable here. Enter your area instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (!inGoa(point)) {
          setMessage(
            "You can test from anywhere—choose a Goa starting area below.",
          );
          return;
        }
        setOrigin(point);
        setArea("My location in Goa");
        setMessage(
          "Live starting point set. It will not appear in shared links.",
        );
      },
      () => {
        setLocating(false);
        setMessage("Location was not shared. Type your Goa area instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function startListening() {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Constructor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setDraft((current) => `${current} ${transcript}`.trim());
    };
    recognition.onerror = () =>
      setMessage("I could not hear that. You can type instead.");
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  async function share(option: OutingOption) {
    if (!result) return;
    const url = `${window.location.origin}/#${new URLSearchParams({ outing: encodeShare(result, option) })}`;
    try {
      if (navigator.share)
        await navigator.share({
          title: option.name,
          text: "A Goa plan from Wanderfound.",
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        setMessage(
          "Plan link copied without your conversation or starting location.",
        );
      }
      track("shared", result.id);
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError"))
        setMessage(
          "Sharing is unavailable here. Share the place from Maps instead.",
        );
    }
  }

  function acceptPlan() {
    if (!result?.agent.primaryId) return;
    setSelectedId(result.agent.primaryId);
    setPhase("active");
    setStartedAt(Date.now());
    setClock(Date.now());
    track("agent_accepted", result.id);
  }

  function remember(preference: string) {
    setPreferences((current) =>
      [preference, ...current.filter((item) => item !== preference)].slice(
        0,
        8,
      ),
    );
    track("memory_added", result?.id);
    setFeedback(`Remembered: “${preference}”`);
  }

  function reset() {
    abort.current?.abort();
    setResult(null);
    setSelectedId(null);
    setPhase("planning");
    setStartedAt(null);
    setHistory([]);
    setDraft("");
    setError("");
    setMessage("");
    setFeedback("");
    setShared(false);
    window.history.replaceState(null, "", "/");
    textareaRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const primary = result?.options.find(
    (option) => option.id === result.agent.primaryId,
  );
  const fallback = result?.options.find(
    (option) => option.id === result.agent.fallbackId,
  );
  const selected =
    result?.options.find((option) => option.id === selectedId) ?? primary;
  const activeMinutes = startedAt
    ? Math.max(0, Math.floor((clock - startedAt) / 60_000))
    : 0;
  const usingFallback = Boolean(
    selected && fallback && selected.id === fallback.id,
  );
  const runNextAction = usingFallback
    ? selected?.travelMinutes !== null
      ? `Open the route now. Allow about ${selected?.travelMinutes} minutes to reach the fallback.`
      : "Open the fallback in Maps and check the live journey before leaving."
    : result?.agent.nextAction;
  const runItinerary =
    usingFallback && selected
      ? [
          selected.travelMinutes !== null
            ? `Travel to ${selected.name} · about ${selected.travelMinutes} min`
            : `Check the live route to ${selected.name}`,
          `${selected.experience} · allow about ${selected.visitMinutes} min`,
          "Tell me what changed and I’ll rebuild the plan",
        ]
      : (result?.agent.itinerary ?? []);
  const runWatchFor =
    usingFallback && selected
      ? [selected.practicalNote, result?.weather].filter(
          (value): value is string => Boolean(value),
        )
      : (result?.agent.watchFor ?? []);

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
          GOA AGENT <span>LIVE</span>
        </span>
      </header>

      <section className={`${styles.hero} ${result ? styles.heroCompact : ""}`}>
        <div className={styles.eyebrow}>
          <span /> ONE BRIEF. ONE DECISION. A PLAN THAT ADAPTS.
        </div>
        <h1>
          Give me your next few hours.
          <br />
          <em>I’ll make them work.</em>
        </h1>
        <p className={styles.intro}>
          Tell me the messy version—who you’re with, how you feel, what changed.
          I’ll research the real world, make the call, and stay with the plan.
        </p>
        <div className={styles.postmark} aria-hidden="true">
          <span>AGENT 01</span>
          <b>
            BRIEF
            <br />
            DECIDE
            <br />
            ADAPT
          </b>
          <span>GOA · LIVE</span>
        </div>
      </section>

      <section className={styles.composer} aria-label="Brief your outing agent">
        <div className={styles.composerTop}>
          <span className={styles.label}>
            {result ? "TELL THE AGENT WHAT CHANGED" : "BRIEF YOUR AGENT"}
          </span>
          {result ? (
            <button className={styles.textButton} type="button" onClick={reset}>
              Start fresh ↗
            </button>
          ) : (
            <span className={styles.freeLabel}>No sign-in · free to test</span>
          )}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void generate(undefined, Boolean(result));
          }}
        >
          <div className={styles.promptWrap}>
            <label className="sr-only" htmlFor="outing-request">
              What is your situation right now?
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
                result
                  ? "The place is packed, we finished early, it started raining…"
                  : "We’re in Panjim, it may rain, my parents are tired, and we want something distinctly Goan before dinner…"
              }
              rows={3}
            />
            {voiceAvailable && (
              <button
                className={styles.voice}
                type="button"
                onClick={startListening}
                disabled={busy || listening}
              >
                {listening ? "Listening…" : "◉ Speak"}
              </button>
            )}
          </div>
          {!result && (
            <div className={styles.starters}>
              {STARTERS.map((starter) => (
                <button
                  type="button"
                  key={starter}
                  onClick={() => setDraft(starter)}
                >
                  {starter.split(".")[0]} ↗
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
              <label htmlFor="outing-hours">TIME YOU’RE GIVING ME</label>
              <select
                id="outing-hours"
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
                disabled={busy}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? "hour" : "hours"}
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
              disabled={busy || !ready || draft.trim().length < 3}
            >
              {busy
                ? "Agent is working…"
                : result
                  ? "Replan now ↗"
                  : "Let the agent decide ↗"}
            </button>
          </div>
        </form>
        <div className={styles.composerFoot}>
          <span>Research · verification · routing · fallback</span>
          <span>
            {storageWorks
              ? `${preferences.length} remembered preference${preferences.length === 1 ? "" : "s"}`
              : "Browser memory unavailable"}
          </span>
        </div>
        {preferences.length > 0 && (
          <div className={styles.memory}>
            <strong>Agent memory</strong>
            {preferences.map((preference) => (
              <span key={preference}>{preference}</span>
            ))}
          </div>
        )}
        {busy && (
          <div className={styles.progress} role="status">
            <span className={styles.spinner} />
            <div>
              <strong>{stage}</strong>
              <small>
                Searching, checking and choosing—not just generating a list.
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
          aria-label="Your agent’s plan"
          aria-busy={busy}
        >
          <div className={styles.agentBar}>
            <div>
              <span
                className={`${styles.pulse} ${phase === "active" ? styles.pulseLive : ""}`}
              />
              <strong>
                {phase === "active"
                  ? "AGENT ON DUTY"
                  : phase === "complete"
                    ? "OUTING COMPLETE"
                    : "PLAN READY"}
              </strong>
            </div>
            <span>
              {phase === "active"
                ? `${activeMinutes} min into this outing`
                : `Checked ${new Date(result.checkedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST`}
            </span>
          </div>
          <div className={styles.decision}>
            <span className={styles.eyebrow}>
              {shared ? "A PLAN, PASSED ALONG" : "THE CALL"}
            </span>
            <h2>{primary ? primary.title : "I need one more constraint."}</h2>
            <p>{result.agent.decision}</p>
            {result.weather && (
              <p className={styles.weather}>☁ {result.weather}</p>
            )}
            {isStale(result.checkedAt) && (
              <p className={styles.stale}>
                The live checks are over an hour old. Ask the agent to recheck
                before leaving.
              </p>
            )}
          </div>

          {primary && (
            <div className={styles.agentGrid}>
              <div>
                <AgentPlaceCard
                  option={selected ?? primary}
                  role={usingFallback ? "ACTIVE FALLBACK" : "PRIMARY MOVE"}
                  transport={result.transport}
                  active={phase === "active"}
                  onNavigate={() => track("navigation", result.id)}
                  onShare={() => void share(selected ?? primary)}
                  onAccept={acceptPlan}
                  shared={shared}
                />
                {fallback && selected?.id !== fallback.id && (
                  <details className={styles.fallback}>
                    <summary>
                      <span>
                        <b>BACKUP READY</b>
                        {fallback.name}
                      </span>
                      <span>View fallback +</span>
                    </summary>
                    <p>{fallback.why}</p>
                    <div>
                      <button
                        className={styles.secondary}
                        type="button"
                        onClick={() => {
                          setSelectedId(fallback.id);
                          setPhase("active");
                          setStartedAt(Date.now());
                          track("selected", result.id);
                        }}
                      >
                        Switch to this backup
                      </button>
                      <a
                        href={fallback.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Check in Maps ↗
                      </a>
                    </div>
                  </details>
                )}
              </div>
              <aside className={styles.runSheet}>
                <span className={styles.label}>THE RUN OF SHOW</span>
                <p className={styles.nextAction}>{runNextAction}</p>
                <ol>
                  {runItinerary.map((step, index) => (
                    <li key={step}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>
                {runWatchFor.length > 0 && (
                  <div className={styles.watch}>
                    <strong>Agent is watching</strong>
                    {runWatchFor.map((item) => (
                      <p key={item}>△ {item}</p>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          )}

          {result.clarification && (
            <div className={styles.empty}>
              <span>↻</span>
              <p>{result.clarification}</p>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => textareaRef.current?.focus()}
              >
                Add that detail ↑
              </button>
            </div>
          )}

          {phase === "active" && !shared && (
            <div className={styles.liveConsole}>
              <div>
                <span className={styles.label}>REALITY CHANGED?</span>
                <h3>Tell me. I’ll rebuild the plan.</h3>
                <p>
                  Your accepted constraints and preferences stay in context.
                </p>
              </div>
              <div>
                {REPLANS.map(([label, prompt]) => (
                  <button
                    type="button"
                    key={label}
                    disabled={busy}
                    onClick={() => void generate(prompt, true)}
                  >
                    {label} ↗
                  </button>
                ))}
              </div>
              <button
                className={styles.done}
                type="button"
                onClick={() => {
                  setPhase("complete");
                  track("went", result.id);
                  setFeedback("What should I remember for next time?");
                }}
              >
                We’re done with this outing ✓
              </button>
            </div>
          )}

          {phase === "complete" && !shared && (
            <div className={styles.feedback}>
              <div>
                <span className={styles.label}>CLOSE THE LOOP</span>
                <h3>{feedback || "What should I remember?"}</h3>
                <p>
                  These preferences stay on this browser and shape the next
                  plan.
                </p>
              </div>
              <div>
                {MEMORY_CHOICES.map((preference) => (
                  <button
                    className={styles.secondary}
                    type="button"
                    key={preference}
                    onClick={() => remember(preference)}
                  >
                    {preferences.includes(preference) ? "✓ " : "+ "}
                    {preference}
                  </button>
                ))}
                <button
                  className={styles.primary}
                  type="button"
                  onClick={reset}
                >
                  Plan what’s next ↗
                </button>
              </div>
            </div>
          )}

          <details className={styles.notices}>
            <summary>Evidence and practical limits</summary>
            <ul>
              {result.notices.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
            <p>
              Research uses linked sources. Place information is supplied by
              Google Maps. No booking is implied.
            </p>
          </details>
        </section>
      )}

      {!result && (
        <section className={styles.how}>
          <div>
            <span>01 / BRIEF</span>
            <h3>Give me the messy truth.</h3>
            <p>
              Mood, people, energy, weather, appetite. Natural language is the
              interface.
            </p>
          </div>
          <div>
            <span>02 / DECIDE</span>
            <h3>I make the call.</h3>
            <p>
              I search, verify and rank one primary move with a credible
              fallback.
            </p>
          </div>
          <div>
            <span>03 / ADAPT</span>
            <h3>I stay with the outing.</h3>
            <p>
              Report crowds, closures or a changed mood and I will rebuild the
              plan.
            </p>
          </div>
        </section>
      )}
      <footer className={styles.footer}>
        <span>An experimental real-world agent for Goa.</span>
        <span>
          GOA, FOR NOW. <span>✳</span>
        </span>
      </footer>
    </main>
  );
}

function AgentPlaceCard({
  option,
  role,
  transport,
  active,
  shared,
  onAccept,
  onNavigate,
  onShare,
}: {
  option: OutingOption;
  role: string;
  transport: OutingRequest["transport"];
  active: boolean;
  shared: boolean;
  onAccept: () => void;
  onNavigate: () => void;
  onShare: () => void;
}) {
  return (
    <article className={`${styles.card} ${styles.heroCard}`}>
      <div
        className={`${styles.cardArt} ${styles[option.category]}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 600 180" preserveAspectRatio="xMidYMid slice">
          <circle cx="470" cy="46" r="32" />
          <path d="M-20 155Q95 30 230 130T490 80T650 115V200H-20Z" />
          <path d="M-20 180Q120 95 280 165T620 108" />
          <path d="M70 190L103 70M103 70Q35 12 12 65M103 70Q170 4 220 42M103 70Q178 45 206 98M103 70Q35 35 12 110" />
        </svg>
        <span>{role}</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardEyebrow}>
          <span>{option.name}</span>
          {option.openNow !== null && (
            <span className={option.openNow ? styles.open : styles.closed}>
              {option.openNow ? "Open now" : "Closed now"}
            </span>
          )}
        </div>
        <h3>{option.title}</h3>
        <p className={styles.why}>{option.why}</p>
        <div className={styles.facts}>
          <span>◷ About {option.visitMinutes} min there</span>
          {!shared && (
            <span>
              ↗{" "}
              {option.travelMinutes !== null
                ? `~${option.travelMinutes} min each way`
                : `${option.distanceKm} km direct · check route`}
            </span>
          )}
          <span>₹ {option.priceLabel}</span>
        </div>
        <p className={styles.experience}>{option.experience}</p>
        <details className={styles.details}>
          <summary>
            Verified details & sources <span>+</span>
          </summary>
          <p>{option.address}</p>
          <p>{option.practicalNote}</p>
          {option.weeklyHours.length > 0 && (
            <ul>
              {option.weeklyHours.map((day) => (
                <li key={day}>{day}</li>
              ))}
            </ul>
          )}
          <div className={styles.sources}>
            {option.sources.map((item) => (
              <a
                href={item.url}
                key={item.url}
                target="_blank"
                rel="noreferrer"
              >
                {item.title} ↗
              </a>
            ))}
            <a href={option.mapsUrl} target="_blank" rel="noreferrer">
              Google Maps listing ↗
            </a>
            {option.website && (
              <a href={option.website} target="_blank" rel="noreferrer">
                Venue website ↗
              </a>
            )}
          </div>
        </details>
        <div className={styles.cardActions}>
          {active || shared ? (
            <>
              <a
                className={styles.primary}
                href={navigationUrl(option, transport)}
                onClick={onNavigate}
                target="_blank"
                rel="noreferrer"
              >
                Open live route ↗
              </a>
              <button className={styles.share} type="button" onClick={onShare}>
                Share this plan
              </button>
            </>
          ) : (
            <button className={styles.primary} type="button" onClick={onAccept}>
              Put the agent on duty ↗
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
