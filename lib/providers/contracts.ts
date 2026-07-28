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
  kind: ProviderKind;
  name: string;
  status: ProviderStatus;
}
