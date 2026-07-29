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
import { WANDERFOUND_RASTER_STYLE } from "@/lib/maps/wanderfound-raster-style";

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
      const { Circle, Map, Polyline, RenderingType } =
        await importLibrary("maps");
      const center = toLatLng(location);
      const map = new Map(container, {
        ...MAP_OPTIONS,
        backgroundColor: "#102f2b",
        center,
        renderingType: RenderingType.RASTER,
        styles: WANDERFOUND_RASTER_STYLE,
        zoom: location.accuracyM <= 25 ? 17 : 16,
      });

      const accuracyCircle = new Circle({
        center,
        clickable: false,
        fillColor: "#f5b85f",
        fillOpacity: 0.1,
        map,
        radius: location.accuracyM,
        strokeColor: "#ffd996",
        strokeOpacity: 0.62,
        strokeWeight: 1.8,
        zIndex: 1,
      });

      const playerDot = new Circle({
        center,
        clickable: false,
        fillColor: "#f06449",
        fillOpacity: 1,
        map,
        radius: Math.min(6, Math.max(3, location.accuracyM / 6)),
        strokeColor: "#fff1c7",
        strokeOpacity: 1,
        strokeWeight: 3,
        zIndex: 6,
      });

      let currentLocation = location;
      let routeLines: google.maps.Polyline[] = [];
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
          clearPolylines(routeLines);
          routeLines = route ? createRouteLines(Polyline, map, route) : [];
        },
        setDiscoveredStages(stages) {
          clearCircles(discoveredStageCircles);
          discoveredStageCircles = stages.flatMap((stage) =>
            createDiscoveredStageCircles(Circle, map, stage),
          );
        },
        recenter() {
          map.panTo(toLatLng(currentLocation));
        },
        destroy() {
          accuracyCircle.setMap(null);
          playerDot.setMap(null);
          clearPolylines(routeLines);
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
      fillColor: "#f4b85f",
      fillOpacity: 0.035,
      map,
      radius: area.radiusM * 1.65,
      strokeColor: "#f4b85f",
      strokeOpacity: 0.09,
      strokeWeight: 14,
      zIndex: 2,
    }),
    new Circle({
      center,
      clickable: false,
      fillColor: "#f4c875",
      fillOpacity: 0.08,
      map,
      radius: area.radiusM * 1.25,
      strokeColor: "#f4c875",
      strokeOpacity: 0.25,
      strokeWeight: 8,
      zIndex: 3,
    }),
    new Circle({
      center,
      clickable: false,
      fillColor: "#f06449",
      fillOpacity: 0.18,
      map,
      radius: area.radiusM,
      strokeColor: "#ffd895",
      strokeOpacity: 0.86,
      strokeWeight: 2,
      zIndex: 4,
    }),
  ];
}

function createRouteLines(
  Polyline: typeof google.maps.Polyline,
  map: google.maps.Map,
  route: MapRoute,
) {
  const discovered = route.state === "discovered";
  const path = route.points.map(toLatLng);

  return [
    new Polyline({
      clickable: false,
      geodesic: true,
      map,
      path,
      strokeColor: discovered ? "#78a69a" : "#f4ae4f",
      strokeOpacity: discovered ? 0.16 : 0.24,
      strokeWeight: discovered ? 9 : 13,
      zIndex: 2,
    }),
    new Polyline({
      clickable: false,
      geodesic: true,
      map,
      path,
      strokeColor: discovered ? "#9ab8aa" : "#ffe6a8",
      strokeOpacity: discovered ? 0.48 : 0.96,
      strokeWeight: discovered ? 3 : 4,
      zIndex: 3,
    }),
  ];
}

function createDiscoveredStageCircles(
  Circle: typeof google.maps.Circle,
  map: google.maps.Map,
  stage: MapDiscoveredStage,
) {
  const center = toLatLng(stage);

  return [
    new Circle({
      center,
      clickable: false,
      fillColor: "#f4c875",
      fillOpacity: 0.12,
      map,
      radius: 15,
      strokeColor: "#f4c875",
      strokeOpacity: 0.2,
      strokeWeight: 7,
      zIndex: 4,
    }),
    new Circle({
      center,
      clickable: false,
      fillColor: "#f7ca68",
      fillOpacity: 1,
      map,
      radius: 6,
      strokeColor: "#fff0c8",
      strokeOpacity: 1,
      strokeWeight: 2.5,
      zIndex: 5,
    }),
  ];
}

function clearCircles(circles: google.maps.Circle[]) {
  circles.forEach((circle) => circle.setMap(null));
}

function clearPolylines(polylines: google.maps.Polyline[]) {
  polylines.forEach((polyline) => polyline.setMap(null));
}

function toLatLng(location: MapCoordinate) {
  return {
    lat: location.latitude,
    lng: location.longitude,
  };
}
