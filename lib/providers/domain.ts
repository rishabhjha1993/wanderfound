import { z } from "zod";

const NonEmptyStringSchema = z.string().trim().min(1).max(500);
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const GeoCoordinateSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();

export const ProviderAttributionSchema = z
  .object({
    provider: NonEmptyStringSchema.max(80),
    displayName: NonEmptyStringSchema.max(160),
    sourceUrl: z.string().url().max(2048).optional(),
    licenseName: NonEmptyStringSchema.max(160).optional(),
    requiredNotice: NonEmptyStringSchema.max(500).optional(),
    storagePolicy: z.enum(["transient", "identifier_only", "permitted"]),
    retrievedAt: IsoDateTimeSchema,
  })
  .strict();

export const GroundedFactSchema = z
  .object({
    id: NonEmptyStringSchema.max(160),
    text: NonEmptyStringSchema.max(800),
    sourceTitle: NonEmptyStringSchema.max(240),
    sourceUrl: z.string().url().max(2048),
    confidence: z.number().finite().min(0).max(1),
    attribution: ProviderAttributionSchema,
  })
  .strict();

export const PlaceCategorySchema = z.enum([
  "architecture",
  "civic",
  "culinary",
  "garden",
  "heritage",
  "market",
  "museum",
  "public_art",
  "religious",
  "viewpoint",
  "waterfront",
]);

export const PlaceHazardSchema = z.enum([
  "cliff",
  "construction",
  "motorway",
  "private_property",
  "railway",
  "unsafe_crossing",
  "water",
]);

export const PlaceCandidateSchema = z
  .object({
    provider: NonEmptyStringSchema.max(80),
    providerPlaceId: NonEmptyStringSchema.max(240),
    name: NonEmptyStringSchema.max(240),
    primaryCategory: PlaceCategorySchema,
    categories: z.array(PlaceCategorySchema).min(1).max(12),
    coordinates: GeoCoordinateSchema,
    address: NonEmptyStringSchema.max(500).optional(),
    /**
     * `closed` means shut right now and likely open again later; a chapel in
     * the evening. `permanently_closed` means the place is gone. Collapsing
     * the two would either send players to a demolished building or discard
     * every shopfront that happens to be shut tonight.
     */
    openingStatus: z.enum(["open", "closed", "permanently_closed", "unknown"]),
    publicAccess: z.enum(["yes", "no", "unknown"]),
    indoorOutdoor: z.enum(["indoor", "outdoor", "mixed", "unknown"]),
    purchaseRequired: z.enum(["yes", "no", "unknown"]),
    commercialVenue: z.boolean(),
    /**
     * Whether the discovery can be made from public ground without entering.
     * A church that has closed for the evening still has a carved door, a
     * plaque and a facade, and remains playable when this is true.
     */
    exteriorObservable: z.boolean(),
    /**
     * Provider review count, used as an "off the beaten track" signal. Absent
     * when the provider did not report one. Low counts mean obscure rather
     * than bad; zero-count places are usually unverified and are not treated
     * as obscure gems.
     */
    reviewCount: z.number().int().nonnegative().optional(),
    /**
     * How many language editions of Wikipedia carry an article about this
     * place. Absent for places no knowledge source recognises.
     *
     * This is the difference between a place that matters and a place that is
     * merely nearby. A pickle store in a Dwarka flat has a Google review count
     * and no article anywhere; Humayun's Tomb has sixty-nine.
     */
    sitelinkCount: z.number().int().nonnegative().optional(),
    /**
     * The provider tagged this as a landmark, monument or heritage place
     * rather than merely as a building of that kind.
     *
     * Being a church is not the same as being historically significant. Every
     * Indian neighbourhood has working temples and parish churches, and
     * treating the category as the qualification filled a "historical"
     * adventure with ordinary places of worship.
     */
    landmarkSignal: z.boolean(),
    hazards: z.array(PlaceHazardSchema).max(12),
    groundedFacts: z.array(GroundedFactSchema).max(20),
    visualSignals: z.array(NonEmptyStringSchema.max(240)).max(20),
    attributions: z.array(ProviderAttributionSchema).min(1).max(12),
    retrievedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((candidate, context) => {
    if (!candidate.categories.includes(candidate.primaryCategory)) {
      context.addIssue({
        code: "custom",
        message: "categories must include primaryCategory",
        path: ["categories"],
      });
    }
  });

export const NearbyPlacesInputSchema = z
  .object({
    origin: GeoCoordinateSchema,
    /**
     * Up to metropolitan scale. A proximity search is capped far lower by its
     * provider, but a knowledge source answers a whole region in one query,
     * and Delhi NCR is roughly sixty kilometres across.
     */
    radiusMeters: z.number().int().min(100).max(60_000),
    maxResults: z.number().int().min(1).max(60),
    categories: z.array(PlaceCategorySchema).min(1).max(12),
    languageCode: z
      .string()
      .trim()
      .regex(/^[a-z]{2}$/),
    regionCode: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/)
      .optional(),
    /**
     * This shapes the candidate pool, not the final selection — choosing is
     * the curator's job.
     *
     * It matters because Nearby Search returns at most twenty results and
     * always applies a ranking. Asked for popular food places near Fontainhas
     * it returns Panjim's twenty busiest restaurants, so a curator looking for
     * somewhere off the beaten track has no such place to choose from. Ranking
     * by distance is popularity-neutral and puts small, overlooked places in
     * front of the curator.
     */
    rankBy: z.enum(["popularity", "distance"]).default("popularity"),
  })
  .strict();

export const WalkingRouteInputSchema = z
  .object({
    origin: GeoCoordinateSchema,
    destination: GeoCoordinateSchema,
    languageCode: z
      .string()
      .trim()
      .regex(/^[a-z]{2}$/),
    regionCode: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/)
      .optional(),
  })
  .strict();

export const WalkingRouteStepSchema = z
  .object({
    instruction: NonEmptyStringSchema.max(800),
    distanceMeters: z.number().int().nonnegative(),
    durationSeconds: z.number().int().nonnegative(),
    start: GeoCoordinateSchema,
    end: GeoCoordinateSchema,
    path: z.array(GeoCoordinateSchema).min(2).max(10_000),
  })
  .strict();

export const WalkingRouteSchema = z
  .object({
    provider: NonEmptyStringSchema.max(80),
    providerRouteId: NonEmptyStringSchema.max(240).optional(),
    origin: GeoCoordinateSchema,
    destination: GeoCoordinateSchema,
    distanceMeters: z.number().int().positive(),
    durationSeconds: z.number().int().positive(),
    path: z.array(GeoCoordinateSchema).min(2).max(50_000),
    steps: z.array(WalkingRouteStepSchema).min(1).max(1_000),
    attributions: z.array(ProviderAttributionSchema).min(1).max(12),
    retrievedAt: IsoDateTimeSchema,
  })
  .strict();

export const PlaceIdentitySchema = z
  .object({
    provider: NonEmptyStringSchema.max(80),
    providerPlaceId: NonEmptyStringSchema.max(240),
  })
  .strict();

export const GroundedPlaceFactsSchema = z
  .object({
    place: PlaceIdentitySchema,
    matchedEntity: z
      .object({
        provider: NonEmptyStringSchema.max(80),
        entityId: NonEmptyStringSchema.max(240),
        confidence: z.number().finite().min(0).max(1),
      })
      .strict()
      .optional(),
    facts: z.array(GroundedFactSchema).min(1).max(20),
    attributions: z.array(ProviderAttributionSchema).min(1).max(12),
    retrievedAt: IsoDateTimeSchema,
  })
  .strict();

export type GeoCoordinate = z.infer<typeof GeoCoordinateSchema>;
export type ProviderAttribution = z.infer<typeof ProviderAttributionSchema>;
export type GroundedFact = z.infer<typeof GroundedFactSchema>;
export type PlaceCategory = z.infer<typeof PlaceCategorySchema>;
export type PlaceHazard = z.infer<typeof PlaceHazardSchema>;
export type PlaceCandidate = z.infer<typeof PlaceCandidateSchema>;
/**
 * The input type, so callers may omit fields that carry a schema default;
 * provider implementations read the parsed output, where they are present.
 */
export type NearbyPlacesInput = z.input<typeof NearbyPlacesInputSchema>;
export type WalkingRouteInput = z.infer<typeof WalkingRouteInputSchema>;
export type WalkingRouteStep = z.infer<typeof WalkingRouteStepSchema>;
export type WalkingRoute = z.infer<typeof WalkingRouteSchema>;
export type GroundedPlaceFacts = z.infer<typeof GroundedPlaceFactsSchema>;
