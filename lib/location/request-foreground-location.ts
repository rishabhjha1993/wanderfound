export type ForegroundLocation = {
  latitude: number;
  longitude: number;
  accuracyM: number;
  capturedAt: number;
};

export type LocationRequestFailure =
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "unsupported"
  | "unknown";

export type LocationRequestResult =
  | { ok: true; location: ForegroundLocation }
  | { ok: false; reason: LocationRequestFailure };

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10_000,
};

export function requestForegroundLocation(): Promise<LocationRequestResult> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.geolocation === "undefined"
  ) {
    return Promise.resolve({ ok: false, reason: "unsupported" });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyM: position.coords.accuracy,
            capturedAt: position.timestamp,
          },
        });
      },
      (error) => {
        const reason: LocationRequestFailure =
          error.code === error.PERMISSION_DENIED
            ? "permission_denied"
            : error.code === error.POSITION_UNAVAILABLE
              ? "position_unavailable"
              : error.code === error.TIMEOUT
                ? "timeout"
                : "unknown";

        resolve({ ok: false, reason });
      },
      GEOLOCATION_OPTIONS,
    );
  });
}
