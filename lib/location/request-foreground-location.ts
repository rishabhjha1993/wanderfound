export type ForegroundLocation = {
  latitude: number;
  longitude: number;
  accuracyM: number;
  capturedAt: number;
};

export type LocationAccuracyQuality = "strong" | "usable" | "weak" | "unusable";

export type LocationRequestFailure =
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "unsupported"
  | "unknown";

export type LocationRequestResult =
  | {
      ok: true;
      location: ForegroundLocation;
      quality: LocationAccuracyQuality;
    }
  | { ok: false; reason: LocationRequestFailure };

export const LOCATION_ACCURACY_THRESHOLDS_M = {
  strong: 25,
  usable: 100,
  weak: 250,
} as const;

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10_000,
};

const LOCATION_SESSION_KEY = "wanderfound:foreground-location:v1";
const LOCATION_SESSION_VERSION = 1;
export const LOCATION_CACHE_MAX_AGE_MS = 15 * 60 * 1000;

type StoredLocation = {
  version: typeof LOCATION_SESSION_VERSION;
  location: ForegroundLocation;
};

export async function requestForegroundLocation(): Promise<LocationRequestResult> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.geolocation === "undefined"
  ) {
    return { ok: false, reason: "unsupported" };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: ForegroundLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
          capturedAt: position.timestamp || Date.now(),
        };
        const quality = classifyLocationAccuracy(location.accuracyM);

        storeSessionLocation(location);
        resolve({ ok: true, location, quality });
      },
      (error) => {
        resolve({ ok: false, reason: mapGeolocationError(error.code) });
      },
      GEOLOCATION_OPTIONS,
    );
  });
}

export function classifyLocationAccuracy(
  accuracyM: number,
): LocationAccuracyQuality {
  if (!Number.isFinite(accuracyM) || accuracyM <= 0) {
    return "unusable";
  }

  if (accuracyM <= LOCATION_ACCURACY_THRESHOLDS_M.strong) {
    return "strong";
  }

  if (accuracyM <= LOCATION_ACCURACY_THRESHOLDS_M.usable) {
    return "usable";
  }

  if (accuracyM <= LOCATION_ACCURACY_THRESHOLDS_M.weak) {
    return "weak";
  }

  return "unusable";
}

export function isUsableLocationQuality(quality: LocationAccuracyQuality) {
  return quality === "strong" || quality === "usable";
}

export function storeSessionLocation(location: ForegroundLocation) {
  if (typeof window === "undefined" || !isValidLocation(location)) {
    return false;
  }

  try {
    const stored: StoredLocation = {
      version: LOCATION_SESSION_VERSION,
      location,
    };
    window.sessionStorage.setItem(LOCATION_SESSION_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

export function readSessionLocation(
  now = Date.now(),
  maxAgeMs = LOCATION_CACHE_MAX_AGE_MS,
): ForegroundLocation | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(LOCATION_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const stored = JSON.parse(raw) as Partial<StoredLocation>;
    if (
      stored.version !== LOCATION_SESSION_VERSION ||
      !isValidLocation(stored.location)
    ) {
      clearSessionLocation();
      return null;
    }

    if (now - stored.location.capturedAt > maxAgeMs) {
      clearSessionLocation();
      return null;
    }

    return stored.location;
  } catch {
    clearSessionLocation();
    return null;
  }
}

export function clearSessionLocation() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(LOCATION_SESSION_KEY);
  } catch {
    // A browser may disable storage. Location requests can still work in memory.
  }
}

function mapGeolocationError(code: number): LocationRequestFailure {
  if (code === 1) {
    return "permission_denied";
  }

  if (code === 2) {
    return "position_unavailable";
  }

  if (code === 3) {
    return "timeout";
  }

  return "unknown";
}

function isValidLocation(
  location: Partial<ForegroundLocation> | undefined,
): location is ForegroundLocation {
  return Boolean(
    location &&
    Number.isFinite(location.latitude) &&
    location.latitude! >= -90 &&
    location.latitude! <= 90 &&
    Number.isFinite(location.longitude) &&
    location.longitude! >= -180 &&
    location.longitude! <= 180 &&
    Number.isFinite(location.accuracyM) &&
    location.accuracyM! > 0 &&
    Number.isFinite(location.capturedAt) &&
    location.capturedAt! > 0,
  );
}
