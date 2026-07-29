export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type PlayerMapLocation = MapCoordinate & {
  accuracyM: number;
};

export type MapSearchArea = MapCoordinate & {
  radiusM: number;
};

export type MapRoute = {
  points: MapCoordinate[];
  state: "active" | "discovered";
};

export type MapDiscoveredStage = MapCoordinate & {
  id: string;
};

export type PlayerMapLayers = {
  searchArea?: MapSearchArea | null;
  route?: MapRoute | null;
  discoveredStages?: MapDiscoveredStage[];
};

export interface PlayerMapHandle {
  updatePlayerLocation(location: PlayerMapLocation): void;
  setSearchArea(area: MapSearchArea | null): void;
  setRoute(route: MapRoute | null): void;
  setDiscoveredStages(stages: MapDiscoveredStage[]): void;
  recenter(): void;
  destroy(): void;
}

export interface FrontendMapAdapter {
  mount(
    container: HTMLElement,
    location: PlayerMapLocation,
  ): Promise<PlayerMapHandle>;
}
