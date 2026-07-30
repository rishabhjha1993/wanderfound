import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AdventureSetup,
  AdventureSetupComplete,
} from "@/components/adventure-setup";
import {
  EMPTY_ADVENTURE_SETUP,
  readAdventureSetupDraft,
} from "@/lib/adventure/setup-session";

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdventureSetup", () => {
  it("requires one complete, plainly explained selection from every group", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(
      <AdventureSetup
        initialDraft={EMPTY_ADVENTURE_SETUP}
        onBack={vi.fn()}
        onComplete={onComplete}
      />,
    );

    const continueButton = screen.getByRole("button", {
      name: "Set my compass",
    });
    expect(continueButton).toBeDisabled();
    expect(
      screen.getByText(
        "Old walls, forgotten names, and stories hiding in plain sight.",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("radio", { name: /half a day/i }));
    await user.click(screen.getByRole("radio", { name: /Strange/i }));
    await user.click(screen.getByRole("radio", { name: /Couple \/ friends/i }));

    expect(screen.getByText("3 of 3 choices ready")).toBeVisible();
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);

    expect(onComplete).toHaveBeenCalledWith({
      dayShape: "half_day",
      mood: "strange",
      partyMode: "couple_friends",
    });
  });

  it("remembers partial choices across a remount", async () => {
    const user = userEvent.setup();
    const firstRender = render(
      <AdventureSetup
        initialDraft={EMPTY_ADVENTURE_SETUP}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /a full day/i }));
    await user.click(screen.getByRole("radio", { name: /Beautiful/i }));

    firstRender.unmount();
    const storedDraft = readAdventureSetupDraft();

    render(
      <AdventureSetup
        initialDraft={storedDraft}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: /a full day/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Beautiful/i })).toBeChecked();
    expect(screen.getByText("2 of 3 choices ready")).toBeVisible();
  });
});

describe("AdventureSetupComplete", () => {
  it("visibly scouts and displays the provider-grounded shortlist", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn(async () =>
      Response.json({
        radiusMeters: 800,
        candidateCount: 8,
        selectionMethod: "sol",
        places: [
          {
            providerPlaceId: "google-place-1",
            name: "A Real Place",
            primaryCategory: "heritage",
            address: "A public street",
            openingStatus: "open",
            googleMapsUrl: "https://maps.google.com/?cid=1",
          },
        ],
        attribution: "Google",
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    render(
      <AdventureSetupComplete
        location={{
          latitude: 28.6139,
          longitude: 77.209,
          accuracyM: 20,
          capturedAt: Date.now(),
        }}
        setup={{
          dayShape: "half_day",
          mood: "historical",
          partyMode: "solo",
        }}
        onEdit={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Discover what’s around me" }),
    );

    expect(await screen.findByText("A Real Place")).toBeVisible();
    expect(screen.getByText("Curated by Sol")).toBeVisible();
    expect(screen.getByText(/Places supplied by Google/)).toBeVisible();
    expect(fetcher).toHaveBeenCalledWith(
      "/api/places/discover",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
