import { z } from "zod";

export const CoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const TransportSchema = z.enum(["walk", "drive", "scooter"]);
export const OutingRequestSchema = z
  .object({
    area: z.string().trim().min(2).max(160),
    origin: CoordinateSchema.optional(),
    message: z.string().trim().min(3).max(1200),
    hours: z.number().min(1).max(8),
    transport: TransportSchema,
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(1600),
        }),
      )
      .max(10)
      .default([]),
  })
  .strict();

export const EvidenceSchema = z.object({
  title: z.string().max(200),
  url: z
    .string()
    .url()
    .max(1500)
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    }),
});

export const ResearchSchema = z.object({
  summary: z.string(),
  intentSummary: z.string(),
  clarification: z.string().nullable(),
  hours: z.number(),
  transport: TransportSchema,
  startsNow: z.boolean(),
  candidates: z.array(
    z.object({
      name: z.string(),
      locality: z.string(),
      title: z.string(),
      why: z.string(),
      experience: z.string(),
      category: z.enum(["nature", "culture", "food", "creative", "slow"]),
      visitMinutes: z.number(),
      practicalNote: z.string(),
      sources: z.array(z.object({ title: z.string(), url: z.string() })),
    }),
  ),
});

export const OutingOptionSchema = z.object({
  id: z.string().max(200),
  name: z.string().max(200),
  title: z.string().max(160),
  why: z.string().max(600),
  experience: z.string().max(800),
  category: z.enum(["nature", "culture", "food", "creative", "slow"]),
  coordinates: CoordinateSchema,
  address: z.string().max(500),
  mapsUrl: EvidenceSchema.shape.url,
  website: EvidenceSchema.shape.url.nullable(),
  openNow: z.boolean().nullable(),
  weeklyHours: z.array(z.string().max(200)).max(7),
  priceLabel: z.string().max(150),
  visitMinutes: z.number().min(15).max(360),
  travelMinutes: z.number().nonnegative().nullable(),
  distanceKm: z.number().nonnegative(),
  practicalNote: z.string().max(500),
  sources: z.array(EvidenceSchema).max(5),
});

export const OutingResultSchema = z.object({
  id: z.string().max(80),
  area: z.string().max(200),
  summary: z.string().max(1000),
  context: z.string().max(1600).default(""),
  clarification: z.string().max(500).nullable(),
  options: z.array(OutingOptionSchema).max(3),
  checkedAt: z.string().datetime(),
  transport: TransportSchema,
  hours: z.number().min(1).max(8),
  weather: z.string().max(300).nullable(),
  notices: z.array(z.string().max(400)).max(6),
});

export type OutingRequest = z.infer<typeof OutingRequestSchema>;
export type OutingResult = z.infer<typeof OutingResultSchema>;
export type OutingOption = z.infer<typeof OutingOptionSchema>;
export type Research = z.infer<typeof ResearchSchema>;
export type Coordinate = z.infer<typeof CoordinateSchema>;
export type Progress = (stage: string) => void;

export function inGoa(point: Coordinate) {
  return (
    point.latitude >= 14.85 &&
    point.latitude <= 15.85 &&
    point.longitude >= 73.65 &&
    point.longitude <= 74.35
  );
}

export function navigationUrl(
  option: OutingOption,
  transport: OutingRequest["transport"],
) {
  const query = new URLSearchParams({
    api: "1",
    destination: `${option.coordinates.latitude},${option.coordinates.longitude}`,
    destination_place_id: option.id,
    travelmode: transport === "walk" ? "walking" : "driving",
  });
  return `https://www.google.com/maps/dir/?${query}`;
}

export function isStale(checkedAt: string, now = Date.now()) {
  return now - new Date(checkedAt).getTime() > 60 * 60 * 1000;
}
