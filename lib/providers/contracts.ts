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
