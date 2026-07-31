import type {
  GroundedPlaceFacts,
  NearbyPlacesInput,
  PlaceCandidate,
  WalkingRoute,
  WalkingRouteInput,
} from "@/lib/providers/domain";

export type ProviderKind =
  | "map"
  | "places"
  | "routing"
  | "knowledge"
  | "ai"
  | "weather"
  | "payments"
  | "analytics";

export type ProviderStatus = "unconfigured" | "ready" | "degraded";

export interface ProviderDescriptor {
  id?: string;
  kind: ProviderKind;
  name: string;
  status: ProviderStatus;
}

/**
 * Provider implementations must normalise and validate external responses
 * before returning from these methods.
 */
export interface PlacesProvider {
  readonly descriptor: ProviderDescriptor & {
    id: string;
    kind: "places";
  };
  nearby(input: NearbyPlacesInput): Promise<PlaceCandidate[]>;
}

/**
 * Fills in what a knowledge source cannot know about a place it found: whether
 * it is open, still standing, and exactly where.
 *
 * Separate from `PlacesProvider` because it answers about one known place
 * rather than searching an area, and because it must run only for places a
 * trail selected — verifying a whole region costs a call per candidate and
 * buys nothing for the ones nobody visits.
 *
 * Implementations return the candidate unchanged when no confident match
 * exists. An unverified place is a worse trail than a verified one, and a
 * better trail than a wrong one.
 *
 * `matched` is reported separately from the place because a successful call
 * and a successful match are different things, and conflating them hides the
 * case where verification runs on every place and confirms none of them.
 */
export type PlaceVerification = {
  place: PlaceCandidate;
  matched: boolean;
};

export interface PlaceVerifier {
  readonly descriptor: ProviderDescriptor & {
    id: string;
    kind: "places";
  };
  verify(candidate: PlaceCandidate): Promise<PlaceVerification>;
}

export interface RoutingProvider {
  readonly descriptor: ProviderDescriptor & {
    id: string;
    kind: "routing";
  };
  walkingRoute(input: WalkingRouteInput): Promise<WalkingRoute>;
}

export interface KnowledgeProvider {
  readonly descriptor: ProviderDescriptor & {
    id: string;
    kind: "knowledge";
  };
  enrich(place: PlaceCandidate): Promise<GroundedPlaceFacts>;
}
