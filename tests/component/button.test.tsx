import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("supports keyboard and pointer activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Begin where I am</Button>);
    await user.click(screen.getByRole("button", { name: "Begin where I am" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
