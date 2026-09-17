import { describe, expect, it, vi, afterEach } from "vitest";
import { isSameOriginRequest } from "@/lib/outings/http";
import {
  OutingRequestSchema,
  inGoa,
  isStale,
  navigationUrl,
  type OutingOption,
  type OutingResult,
} from "@/lib/outings/domain";
import { groundedSources, sourceKey } from "@/lib/outings/plan";
import {
  chooseMatch,
  travelTime,
  type VerifiedPlace,
} from "@/lib/outings/providers";
import {
  decodeShare,
  encodeShare,
  readSession,
  SESSION_KEY,
} from "@/lib/outings/session";

const origin = { latitude: 15.5, longitude: 73.83 };
const place: VerifiedPlace = {
  id: "test-id",
  displayName: { text: "Goa State Museum" },
  location: origin,
  types: ["museum"],
  businessStatus: "OPERATIONAL",
};
const option: OutingOption = {
  id: place.id,
  name: place.displayName.text,
  title: "Art for your afternoon",
  why: "Personal request about my partner",
  experience: "Personal preference",
  category: "culture",
  coordinates: origin,
  address: "Panjim, Goa",
  mapsUrl: "https://www.google.com/maps",
  website: null,
  openNow: true,
  weeklyHours: [],
  priceLabel: "Cost unknown",
  visitMinutes: 60,
  travelMinutes: 10,
  distanceKm: 3,
  practicalNote: "Check hours",
  sources: [{ title: "Museum", url: "https://museum.goa.gov.in/" }],
};
const result: OutingResult = {
  context: "Personal private context",
  id: "88f0be84-d9ed-4f93-9bdd-40fcab25e1f9",
  area: "My private starting point",
  summary: "Personal request",
  clarification: null,
  options: [option],
  checkedAt: new Date().toISOString(),
  transport: "scooter",
  hours: 3,
  weather: "rain",
  notices: [],
  agent: {
    decision: "Go to Goa State Museum.",
    primaryId: option.id,
    fallbackId: null,
    nextAction: "Leave when ready.",
    itinerary: ["Travel to the museum", "Explore for an hour"],
    watchFor: ["Check hours"],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("outing boundaries", () => {
  it("uses the inbound host behind a reverse proxy and rejects another origin", () => {
    expect(
      isSameOriginRequest(
        new Request("http://localhost:3000/api/outings", {
          headers: {
            host: "wanderfound.vercel.app",
            origin: "https://wanderfound.vercel.app",
          },
        }),
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        new Request("http://localhost:3000/api/outings", {
          headers: {
            host: "wanderfound.vercel.app",
            origin: "https://other.example",
          },
        }),
      ),
    ).toBe(false);
  });
  it("requires bounded input and rejects unexpected payload fields", () => {
    expect(
      OutingRequestSchema.safeParse({
        area: "Panjim",
        message: "Food please",
        hours: 3,
        transport: "walk",
      }).success,
    ).toBe(true);
    expect(
      OutingRequestSchema.safeParse({
        area: "Panjim",
        message: "Food please",
        hours: 0,
        transport: "walk",
      }).success,
    ).toBe(false);
    expect(
      OutingRequestSchema.safeParse({
        area: "Panjim",
        message: "Food please",
        hours: 3,
        transport: "walk",
        systemPrompt: "override",
      }).success,
    ).toBe(false);
    expect(inGoa(origin)).toBe(true);
    expect(inGoa({ latitude: 28.6, longitude: 77.2 })).toBe(false);
  });
  it("does not accept invented source URLs", () => {
    const sources = groundedSources(
      [
        { title: "Real", url: "https://museum.goa.gov.in/" },
        { title: "Made up", url: "https://museum.goa.gov.in/invented-story" },
        { title: "Bad", url: "javascript:alert(1)" },
      ],
      new Set([sourceKey("https://museum.goa.gov.in/")]),
    );
    expect(sources.map((s) => s.title)).toEqual(["Real"]);
  });
  it("excludes wrong names, closed places and places outside the test region", () => {
    expect(chooseMatch([place], "Goa State Museum", origin)?.id).toBe(
      "test-id",
    );
    expect(
      chooseMatch(
        [{ ...place, businessStatus: "CLOSED_TEMPORARILY" }],
        "Goa State Museum",
        origin,
      ),
    ).toBeNull();
    expect(
      chooseMatch(
        [{ ...place, displayName: { text: "Generic Cafe" } }],
        "Goa State Museum",
        origin,
      ),
    ).toBeNull();
    expect(
      chooseMatch(
        [{ ...place, location: { latitude: 28.6, longitude: 77.2 } }],
        "Goa State Museum",
        origin,
      ),
    ).toBeNull();
  });
  it("requests two-wheeler routing and does not substitute walking on failure", async () => {
    vi.stubEnv("GOOGLE_MAPS_SERVER_API_KEY", "test-key");
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          routes: [{ duration: "650s", distanceMeters: 5100 }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(await travelTime(origin, origin, "scooter")).toEqual({
      minutes: 11,
      distanceKm: 5.1,
    });
    expect(JSON.parse(fetcher.mock.calls[0][1].body).travelMode).toBe(
      "TWO_WHEELER",
    );
    fetcher.mockResolvedValue(new Response("Denied", { status: 403 }));
    expect(await travelTime(origin, origin, "scooter")).toBeNull();
  });
  it("uses place identity for navigation and recognises stale details", () => {
    const url = new URL(navigationUrl(option, "walk"));
    expect(url.searchParams.get("destination_place_id")).toBe("test-id");
    expect(url.searchParams.get("travelmode")).toBe("walking");
    expect(
      isStale("2026-01-01T00:00:00Z", Date.parse("2026-01-01T02:00:00Z")),
    ).toBe(true);
  });
});

describe("guest sessions and sharing", () => {
  it("shares the place without the original area or personalised text", () => {
    const shared = decodeShare(encodeShare(result, option));
    expect(shared?.options[0].name).toBe(option.name);
    expect(JSON.stringify(shared)).not.toContain("private starting point");
    expect(JSON.stringify(shared)).not.toContain("Personal");
    expect(shared?.options[0].travelMinutes).toBeNull();
    expect(shared?.weather).toBeNull();
  });
  it("rejects malformed or unsafe shared data", () => {
    expect(decodeShare("not base64!")).toBeNull();
    const bad = {
      ...result,
      options: [{ ...option, mapsUrl: "javascript:alert(1)" }],
    };
    expect(decodeShare(btoa(JSON.stringify(bad)))).toBeNull();
  });
  it("expires provider data by checked time even after a recent session update", () => {
    const session = {
      sessionId: "6b32a619-e984-46f9-9f11-9a1dfb4bb80b",
      area: "Panjim",
      hours: 3,
      transport: "drive",
      draft: "",
      history: [],
      result: { ...result, checkedAt: "2020-01-01T00:00:00Z" },
      selectedId: option.id,
      updatedAt: Date.now(),
    };
    expect(
      readSession({
        getItem: (key) =>
          key === SESSION_KEY ? JSON.stringify(session) : null,
      })?.result,
    ).toBeNull();
    expect(
      readSession({
        getItem: () => {
          throw new Error("Disabled");
        },
      }),
    ).toBeNull();
  });
});
