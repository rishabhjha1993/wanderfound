import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCATION_ACCURACY_THRESHOLDS_M,
  classifyLocationAccuracy,
  clearSessionLocation,
  readSessionLocation,
  requestForegroundLocation,
  storeSessionLocation,
  type ForegroundLocation,
} from "@/lib/location/request-foreground-location";

const getCurrentPosition = vi.fn();

beforeEach(() => {
  getCurrentPosition.mockReset();
  sessionStorage.clear();

  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
});

describe("geolocation accuracy", () => {
  it("uses explicit strong, usable, weak and unusable boundaries", () => {
    expect(
      classifyLocationAccuracy(LOCATION_ACCURACY_THRESHOLDS_M.strong),
    ).toBe("strong");
    expect(
      classifyLocationAccuracy(LOCATION_ACCURACY_THRESHOLDS_M.strong + 1),
    ).toBe("usable");
    expect(
      classifyLocationAccuracy(LOCATION_ACCURACY_THRESHOLDS_M.usable + 1),
    ).toBe("weak");
    expect(
      classifyLocationAccuracy(LOCATION_ACCURACY_THRESHOLDS_M.weak + 1),
    ).toBe("unusable");
    expect(classifyLocationAccuracy(Number.NaN)).toBe("unusable");
  });
});

describe("requestForegroundLocation", () => {
  it("normalises a browser position and stores it for this tab", async () => {
    const request = requestForegroundLocation();
    const success = getCurrentPosition.mock.calls[0][0];

    success(position({ accuracy: 42 }));

    await expect(request).resolves.toMatchObject({
      ok: true,
      quality: "usable",
      location: {
        latitude: 15.4989,
        longitude: 73.8278,
        accuracyM: 42,
      },
    });
    expect(readSessionLocation()).toMatchObject({ accuracyM: 42 });
  });

  it.each([
    [1, "permission_denied"],
    [2, "position_unavailable"],
    [3, "timeout"],
    [9, "unknown"],
  ])("maps browser error %i to %s", async (code, reason) => {
    const request = requestForegroundLocation();
    const failure = getCurrentPosition.mock.calls[0][1];

    failure({ code });

    await expect(request).resolves.toEqual({ ok: false, reason });
  });

  it("reports unsupported browsers without throwing", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });

    await expect(requestForegroundLocation()).resolves.toEqual({
      ok: false,
      reason: "unsupported",
    });
  });
});

describe("temporary location storage", () => {
  const location: ForegroundLocation = {
    latitude: 15.4989,
    longitude: 73.8278,
    accuracyM: 18,
    capturedAt: 1_000_000,
  };

  it("keeps a valid recent location in session storage", () => {
    expect(storeSessionLocation(location)).toBe(true);
    expect(readSessionLocation(1_000_500)).toEqual(location);
  });

  it("removes expired or malformed locations", () => {
    storeSessionLocation(location);
    expect(readSessionLocation(2_000_000, 1_000)).toBeNull();

    sessionStorage.setItem(
      "wanderfound:foreground-location:v1",
      JSON.stringify({
        version: 1,
        location: { ...location, latitude: 950 },
      }),
    );
    expect(readSessionLocation(1_000_500)).toBeNull();
  });

  it("can clear the current tab location", () => {
    storeSessionLocation(location);
    clearSessionLocation();
    expect(readSessionLocation(1_000_500)).toBeNull();
  });
});

function position({ accuracy }: { accuracy: number }): GeolocationPosition {
  return {
    coords: {
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      latitude: 15.4989,
      longitude: 73.8278,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  };
}
