import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocationPermissionExperience } from "@/components/location-permission-experience";
import { PRODUCT_EVENT_NAME } from "@/lib/analytics/product-events";

const getCurrentPosition = vi.fn();

beforeEach(() => {
  getCurrentPosition.mockReset();
  window.sessionStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAP_ID", "");

  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("LocationPermissionExperience", () => {
  it("educates before asking the browser for location", async () => {
    const user = userEvent.setup();
    render(<LocationPermissionExperience />);

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", {
        name: "Let Wanderfound find your trailhead.",
      }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Use my location" }));

    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it("shows a privacy-safe success state", async () => {
    const user = userEvent.setup();
    render(<LocationPermissionExperience />);

    await user.click(screen.getByRole("button", { name: "Use my location" }));

    const success = getCurrentPosition.mock.calls[0][0];
    success({
      coords: {
        accuracy: 18,
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
    });

    expect(
      await screen.findByRole("heading", {
        name: "Here is your trailhead.",
      }),
    ).toBeVisible();
    expect(screen.getByText("Signal: strong · about 18 m")).toBeVisible();
    expect(
      await screen.findByText("The map still needs its key."),
    ).toBeVisible();
    expect(screen.queryByText("15.4989")).not.toBeInTheDocument();
    expect(screen.queryByText("73.8278")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Choose my adventure" }),
    ).toBeVisible();
  });

  it("completes setup and tracks only the selected values", async () => {
    const events: Array<{
      name: string;
      properties: Record<string, string | number>;
    }> = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    window.addEventListener(PRODUCT_EVENT_NAME, listener);
    const user = userEvent.setup();
    render(<LocationPermissionExperience />);

    await user.click(screen.getByRole("button", { name: "Use my location" }));
    const success = getCurrentPosition.mock.calls[0][0];
    success({
      coords: {
        accuracy: 18,
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
    });

    await user.click(
      await screen.findByRole("button", { name: "Choose my adventure" }),
    );
    await user.click(screen.getByRole("radio", { name: /60 minutes/i }));
    await user.click(screen.getByRole("radio", { name: /Culinary/i }));
    await user.click(screen.getByRole("radio", { name: /Family/i }));
    await user.click(screen.getByRole("button", { name: "Set my compass" }));

    expect(
      await screen.findByRole("heading", {
        name: "Your kind of mystery is ready.",
      }),
    ).toBeVisible();
    expect(events).toContainEqual({
      name: "setup_completed",
      properties: {
        duration_minutes: 60,
        mood: "culinary",
        party_mode: "family",
      },
    });

    window.removeEventListener(PRODUCT_EVENT_NAME, listener);
  });

  it("refuses to begin from an unusably broad location", async () => {
    const user = userEvent.setup();
    render(<LocationPermissionExperience />);

    await user.click(screen.getByRole("button", { name: "Use my location" }));

    const success = getCurrentPosition.mock.calls[0][0];
    success({
      coords: {
        accuracy: 600,
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
    });

    expect(
      await screen.findByRole("heading", {
        name: "That area is too broad to start safely.",
      }),
    ).toBeVisible();
    expect(screen.getByText("Current accuracy: about 600 m")).toBeVisible();
    expect(screen.getByRole("button", { name: "Find me again" })).toBeVisible();
  });

  it("distinguishes permission denial and allows retry", async () => {
    const events: string[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail.name);
    };

    window.addEventListener(PRODUCT_EVENT_NAME, listener);
    const user = userEvent.setup();
    render(<LocationPermissionExperience />);

    await user.click(screen.getByRole("button", { name: "Use my location" }));

    const failure = getCurrentPosition.mock.calls[0][1];
    failure({
      code: 1,
      message: "Denied",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    });

    expect(
      await screen.findByRole("heading", {
        name: "Location is switched off.",
      }),
    ).toBeVisible();
    expect(events).toContain("location_denied");

    await user.click(
      screen.getByRole("button", { name: "Try location again" }),
    );
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);

    window.removeEventListener(PRODUCT_EVENT_NAME, listener);
  });

  it("lets the user defer without triggering geolocation", async () => {
    render(<LocationPermissionExperience />);

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("heading", {
        name: "We’ll wait at the trailhead.",
      }),
    ).toBeVisible();
  });
});
