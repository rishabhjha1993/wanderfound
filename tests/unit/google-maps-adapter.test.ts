import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGoogleMapsAdapter } from "@/lib/maps/google-maps-adapter";

const { importLibrary, setOptions } = vi.hoisted(() => ({
  importLibrary: vi.fn(),
  setOptions: vi.fn(),
}));

vi.mock("@googlemaps/js-api-loader", () => ({
  importLibrary,
  setOptions,
}));

const mapInstances: FakeMap[] = [];
const circleInstances: FakeCircle[] = [];
const polylineInstances: FakePolyline[] = [];

class FakeMap {
  panTo = vi.fn();

  constructor(
    public container: HTMLElement,
    public options: Record<string, unknown>,
  ) {
    mapInstances.push(this);
  }
}

class FakeCircle {
  setCenter = vi.fn();
  setMap = vi.fn();
  setRadius = vi.fn();

  constructor(public options: Record<string, unknown>) {
    circleInstances.push(this);
  }
}

class FakePolyline {
  setMap = vi.fn();

  constructor(public options: Record<string, unknown>) {
    polylineInstances.push(this);
  }
}

beforeEach(() => {
  setOptions.mockClear();
  importLibrary.mockReset();
  mapInstances.length = 0;
  circleInstances.length = 0;
  polylineInstances.length = 0;
  importLibrary.mockResolvedValue({
    Circle: FakeCircle,
    Map: FakeMap,
    Polyline: FakePolyline,
  });
});

describe("Google Maps adapter", () => {
  it("mounts a privacy-aware map and exposes provider-neutral controls", async () => {
    const adapter = createGoogleMapsAdapter({
      apiKey: "AIzaSyabcdefghijklmnopqrstuvwxyz123456789",
      mapId: "8e0a97af9386fef0",
    });
    const container = document.createElement("div");
    const handle = await adapter.mount(container, {
      accuracyM: 42,
      latitude: 15.4989,
      longitude: 73.8278,
    });

    expect(setOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        authReferrerPolicy: "origin",
        mapIds: ["8e0a97af9386fef0"],
        region: "IN",
        v: "quarterly",
      }),
    );
    expect(mapInstances[0].options).toEqual(
      expect.objectContaining({
        clickableIcons: false,
        disableDefaultUI: true,
        gestureHandling: "cooperative",
        mapId: "8e0a97af9386fef0",
      }),
    );
    expect(circleInstances).toHaveLength(2);
    expect(circleInstances[0].options).toEqual(
      expect.objectContaining({
        radius: 42,
        fillOpacity: 0.14,
      }),
    );

    handle.updatePlayerLocation({
      accuracyM: 20,
      latitude: 15.49,
      longitude: 73.82,
    });
    expect(circleInstances[0].setRadius).toHaveBeenCalledWith(20);
    expect(mapInstances[0].panTo).toHaveBeenCalledWith({
      lat: 15.49,
      lng: 73.82,
    });

    handle.setSearchArea({
      latitude: 15.5,
      longitude: 73.83,
      radiusM: 45,
    });
    expect(circleInstances[2].options).toEqual(
      expect.objectContaining({
        radius: 56.25,
        fillColor: "#e9b949",
      }),
    );
    expect(circleInstances[3].options).toEqual(
      expect.objectContaining({
        radius: 45,
        fillColor: "#f2684a",
      }),
    );

    handle.setRoute({
      points: [
        { latitude: 15.49, longitude: 73.82 },
        { latitude: 15.5, longitude: 73.83 },
      ],
      state: "active",
    });
    expect(polylineInstances[0].options).toEqual(
      expect.objectContaining({
        path: [
          { lat: 15.49, lng: 73.82 },
          { lat: 15.5, lng: 73.83 },
        ],
        strokeColor: "#153d35",
        strokeOpacity: 0.92,
      }),
    );

    handle.setDiscoveredStages([
      { id: "stage-1", latitude: 15.495, longitude: 73.825 },
    ]);
    expect(circleInstances[4].options).toEqual(
      expect.objectContaining({
        center: { lat: 15.495, lng: 73.825 },
        fillColor: "#e9b949",
      }),
    );

    handle.recenter();
    expect(mapInstances[0].panTo).toHaveBeenLastCalledWith({
      lat: 15.49,
      lng: 73.82,
    });

    handle.destroy();
    expect(circleInstances[0].setMap).toHaveBeenCalledWith(null);
    expect(circleInstances[1].setMap).toHaveBeenCalledWith(null);
    expect(circleInstances[2].setMap).toHaveBeenCalledWith(null);
    expect(circleInstances[3].setMap).toHaveBeenCalledWith(null);
    expect(circleInstances[4].setMap).toHaveBeenCalledWith(null);
    expect(polylineInstances[0].setMap).toHaveBeenCalledWith(null);
  });
});
