import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocationPermissionExperience } from "@/components/location-permission-experience";
import { PRODUCT_EVENT_NAME } from "@/lib/analytics/product-events";

const getCurrentPosition = vi.fn();

beforeEach(() => {
  getCurrentPosition.mockReset();

  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
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
        name: "We found your trailhead.",
      }),
    ).toBeVisible();
    expect(screen.getByText("Signal: strong")).toBeVisible();
    expect(screen.queryByText("15.4989")).not.toBeInTheDocument();
    expect(screen.queryByText("73.8278")).not.toBeInTheDocument();
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
