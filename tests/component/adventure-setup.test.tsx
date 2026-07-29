import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdventureSetup } from "@/components/adventure-setup";
import {
  EMPTY_ADVENTURE_SETUP,
  readAdventureSetupDraft,
} from "@/lib/adventure/setup-session";

beforeEach(() => {
  window.sessionStorage.clear();
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

    await user.click(screen.getByRole("radio", { name: /30 minutes/i }));
    await user.click(screen.getByRole("radio", { name: /Strange/i }));
    await user.click(screen.getByRole("radio", { name: /Couple \/ friends/i }));

    expect(screen.getByText("3 of 3 choices ready")).toBeVisible();
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);

    expect(onComplete).toHaveBeenCalledWith({
      durationMinutes: 30,
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

    await user.click(screen.getByRole("radio", { name: /60 minutes/i }));
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

    expect(screen.getByRole("radio", { name: /60 minutes/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Beautiful/i })).toBeChecked();
    expect(screen.getByText("2 of 3 choices ready")).toBeVisible();
  });
});
