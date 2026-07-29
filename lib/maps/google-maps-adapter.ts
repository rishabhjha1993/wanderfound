"use client";

import {
  importLibrary,
  setOptions,
  type APIOptions,
} from "@googlemaps/js-api-loader";
import type {
  FrontendMapAdapter,
  MapCoordinate,
  MapDiscoveredStage,
  MapRoute,
  MapSearchArea,
  PlayerMapHandle,
} from "@/lib/maps/contracts";
import type { GoogleMapsBrowserConfig } from "@/lib/maps/config";

const MAP_OPTIONS = {
  clickableIcons: false,
  disableDefaultUI: true,
  fullscreenControl: false,
  gestureHandling: "cooperative",
  keyboardShortcuts: false,
  mapTypeControl: false,
  rotateControl: false,
  scaleControl: false,
  streetViewControl: false,
  zoomControl: false,
} as const;

let configuredLoaderKey: string | null = null;

export function createGoogleMapsAdapter(
  config: GoogleMapsBrowserConfig,
): FrontendMapAdapter {
  configureLoader(config);

  return {
    async mount(container, location) {
      const { Circle, Map, Polyline } = await importLibrary("maps");
      const center = toLatLng(location);
      const map = new Map(container, {
        ...MAP_OPTIONS,
        backgroundColor: "#e8dfca",
        center,
        mapId: config.mapId,
        zoom: location.accuracyM <= 25 ? 17 : 16,
      });

      const accuracyCircle = new Circle({
        center,
        clickable: false,
        fillColor: "#f2684a",
        fillOpacity: 0.14,
        map,
        radius: location.accuracyM,
        strokeColor: "#c9472f",
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
        zIndex: 1,
      });

      const playerDot = new Circle({
        center,
        clickable: false,
        fillColor: "#153d35",
        fillOpacity: 1,
        map,
        radius: Math.min(6, Math.max(3, location.accuracyM / 6)),
        strokeColor: "#fffdf8",
        strokeOpacity: 1,
        strokeWeight: 3,
        zIndex: 2,
      });

      let currentLocation = location;
      let routeLine: google.maps.Polyline | null = null;
      let searchAreaCircles: google.maps.Circle[] = [];
      let discoveredStageCircles: google.maps.Circle[] = [];

      const handle: PlayerMapHandle = {
        updatePlayerLocation(nextLocation) {
          currentLocation = nextLocation;
          const nextCenter = toLatLng(nextLocation);

          accuracyCircle.setCenter(nextCenter);
          accuracyCircle.setRadius(nextLocation.accuracyM);
          playerDot.setCenter(nextCenter);
          playerDot.setRadius(
            Math.min(6, Math.max(3, nextLocation.accuracyM / 6)),
          );
          map.panTo(nextCenter);
        },
        setSearchArea(area) {
          clearCircles(searchAreaCircles);
          searchAreaCircles = area
            ? createSearchAreaCircles(Circle, map, area)
            : [];
        },
        setRoute(route) {
          routeLine?.setMap(null);
          routeLine = route ? createRouteLine(Polyline, map, route) : null;
        },
        setDiscoveredStages(stages) {
          clearCircles(discoveredStageCircles);
          discoveredStageCircles = stages.map((stage) =>
            createDiscoveredStageCircle(Circle, map, stage),
          );
        },
        recenter() {
          map.panTo(toLatLng(currentLocation));
        },
        destroy() {
          accuracyCircle.setMap(null);
          playerDot.setMap(null);
          routeLine?.setMap(null);
          clearCircles(searchAreaCircles);
          clearCircles(discoveredStageCircles);
        },
      };

      return handle;
    },
  };
}

function configureLoader(config: GoogleMapsBrowserConfig) {
  const loaderKey = `${config.apiKey}:${config.mapId}`;

  if (configuredLoaderKey === loaderKey) {
    return;
  }

  if (configuredLoaderKey !== null) {
    throw new Error("Google Maps loader was already configured.");
  }

  const options: APIOptions = {
    authReferrerPolicy: "origin",
    key: config.apiKey,
    mapIds: [config.mapId],
    region: "IN",
    v: "quarterly",
  };

  setOptions(options);
  configuredLoaderKey = loaderKey;
}

function createSearchAreaCircles(
  Circle: typeof google.maps.Circle,
  map: google.maps.Map,
  area: MapSearchArea,
) {
  const center = toLatLng(area);

  return [
    new Circle({
      center,
      clickable: false,
      fillColor: "#e9b949",
      fillOpacity: 0.1,
      map,
      radius: area.radiusM * 1.25,
      strokeColor: "#e9b949",
      strokeOpacity: 0.22,
      strokeWeight: 8,
      zIndex: 3,
    }),
    new Circle({
      center,
      clickable: false,
      fillColor: "#f2684a",
      fillOpacity: 0.16,
      map,
      radius: area.radiusM,
      strokeColor: "#c9472f",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      zIndex: 4,
    }),
  ];
}

function createRouteLine(
  Polyline: typeof google.maps.Polyline,
  map: google.maps.Map,
  route: MapRoute,
) {
  const discovered = route.state === "discovered";

  return new Polyline({
    clickable: false,
    geodesic: true,
    map,
    path: route.points.map(toLatLng),
    strokeColor: discovered ? "#6f8880" : "#153d35",
    strokeOpacity: discovered ? 0.42 : 0.92,
    strokeWeight: discovered ? 4 : 5,
    zIndex: 2,
  });
}

function createDiscoveredStageCircle(
  Circle: typeof google.maps.Circle,
  map: google.maps.Map,
  stage: MapDiscoveredStage,
) {
  return new Circle({
    center: toLatLng(stage),
    clickable: false,
    fillColor: "#e9b949",
    fillOpacity: 1,
    map,
    radius: 6,
    strokeColor: "#153d35",
    strokeOpacity: 1,
    strokeWeight: 3,
    zIndex: 5,
  });
}

function clearCircles(circles: google.maps.Circle[]) {
  circles.forEach((circle) => circle.setMap(null));
}

function toLatLng(location: MapCoordinate) {
  return {
    lat: location.latitude,
    lng: location.longitude,
  };
}
