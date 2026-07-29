"use client";

import {
  importLibrary,
  setOptions,
  type APIOptions,
} from "@googlemaps/js-api-loader";
import type {
  FrontendMapAdapter,
  PlayerMapHandle,
  PlayerMapLocation,
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
      const { Circle, Map } = await importLibrary("maps");
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
        recenter() {
          map.panTo(toLatLng(currentLocation));
        },
        destroy() {
          accuracyCircle.setMap(null);
          playerDot.setMap(null);
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

function toLatLng(location: PlayerMapLocation) {
  return {
    lat: location.latitude,
    lng: location.longitude,
  };
}
