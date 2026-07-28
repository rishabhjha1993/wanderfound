import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GlobalError from "@/app/error";

describe("GlobalError", () => {
  it("offers a graceful recovery action", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<GlobalError error={new Error("simulated")} reset={reset} />);

    await user.click(
      screen.getByRole("button", { name: "Return to the trail" }),
    );

    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByText("The trail went quiet")).toBeVisible();
  });
});
