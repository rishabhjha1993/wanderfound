export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type PlayerMapLocation = MapCoordinate & {
  accuracyM: number;
};

export interface PlayerMapHandle {
  updatePlayerLocation(location: PlayerMapLocation): void;
  recenter(): void;
  destroy(): void;
}

export interface FrontendMapAdapter {
  mount(
    container: HTMLElement,
    location: PlayerMapLocation,
  ): Promise<PlayerMapHandle>;
}
