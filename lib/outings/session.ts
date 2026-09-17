import { z } from "zod";
import {
  OutingResultSchema,
  TransportSchema,
  type OutingOption,
  type OutingResult,
} from "./domain";

export const SESSION_KEY = "wanderfound:outing:v1";
export const SessionSchema = z.object({
  sessionId: z.string().uuid(),
  area: z.string().max(160),
  hours: z.number().min(1).max(8),
  transport: TransportSchema,
  draft: z.string().max(1200),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(1600),
      }),
    )
    .max(10),
  result: OutingResultSchema.nullable(),
  selectedId: z.string().nullable(),
  preferences: z.array(z.string().max(160)).max(8).default([]),
  phase: z.enum(["planning", "active", "complete"]).default("planning"),
  startedAt: z.number().nullable().default(null),
  updatedAt: z.number(),
});
export type OutingSession = z.infer<typeof SessionSchema>;

export function readSession(
  storage: Pick<Storage, "getItem">,
): OutingSession | null {
  try {
    const parsed = SessionSchema.safeParse(
      JSON.parse(storage.getItem(SESSION_KEY) ?? "null"),
    );
    if (!parsed.success) return null;
    if (
      parsed.data.result &&
      Date.now() - Date.parse(parsed.data.result.checkedAt) > 24 * 60 * 60_000
    )
      return { ...parsed.data, result: null, selectedId: null };
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeSession(
  storage: Pick<Storage, "setItem">,
  session: OutingSession,
) {
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

// A share contains only the selected public place and its source details.
// It omits the conversation, starting area, GPS, personalised rationale and session ID.
export function sharePayload(result: OutingResult, option: OutingOption) {
  return {
    ...result,
    area: "Goa",
    context: "",
    summary: "A place shared with you. Check the details before heading out.",
    weather: null,
    clarification: null,
    options: [
      {
        ...option,
        title: option.name,
        why: "Shared from Wanderfound",
        experience:
          "Explore the source links and check the latest details in Google Maps.",
        travelMinutes: null,
        distanceKm: 0,
        practicalNote: "Travel time depends on where you start.",
      },
    ],
    notices: [
      "This is a shared snapshot. Opening information may have changed. Start a new outing for current research from your area.",
    ],
    agent: {
      decision: `Go to ${option.name}. Check the latest details before leaving.`,
      primaryId: option.id,
      fallbackId: null,
      nextAction: "Open the live route when you are ready.",
      itinerary: [
        `Check the route to ${option.name}`,
        "Explore at your own pace",
      ],
      watchFor: ["Opening information and travel time may have changed."],
    },
  } satisfies OutingResult;
}

export function encodeShare(result: OutingResult, option: OutingOption) {
  const bytes = new TextEncoder().encode(
    JSON.stringify(sharePayload(result, option)),
  );
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

export function decodeShare(value: string) {
  if (value.length > 16000) return null;
  try {
    const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    const parsed = OutingResultSchema.safeParse(
      JSON.parse(new TextDecoder().decode(bytes)),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
