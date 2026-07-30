import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayabilityDebugger } from "@/components/playability-debugger";

afterEach(() => {
  vi.unstubAllGlobals();
});

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    providerPlaceId: "place-1",
    name: "St. Thomas Chapel",
    primaryCategory: "religious",
    categories: ["religious"],
    coordinates: { latitude: 15.4989, longitude: 73.8317 },
    openingStatus: "open",
    publicAccess: "yes",
    purchaseRequired: "no",
    exteriorObservable: true,
    commercialVenue: false,
    reviewCount: 26,
    ...overrides,
  };
}

const RESULT = {
  radiusMeters: 1_500,
  rankBy: "distance",
  retrievedCount: 20,
  candidateCount: 2,
  rejectedCount: 1,
  selectionMethod: "sol",
  aiCuratorRequested: true,
  aiCuratorConfigured: true,
  candidates: [
    candidate({ selected: true }),
    candidate({
      providerPlaceId: "place-2",
      name: "Mario Gallery",
      primaryCategory: "museum",
      selected: false,
    }),
  ],
  rejected: [
    candidate({
      providerPlaceId: "place-3",
      name: "Nail point",
      primaryCategory: "heritage",
      reviewCount: 4,
      reason: "unverified_identity",
      detail: "Only 4 reviews, below the 5 needed to trust the label.",
    }),
  ],
};

function stubFetch(payload: unknown, ok = true) {
  const fetcher = vi.fn(async () =>
    ok
      ? Response.json(payload, { status: 200 })
      : Response.json(payload, { status: 502 }),
  );

  vi.stubGlobal("fetch", fetcher);

  return fetcher;
}

describe("PlayabilityDebugger", () => {
  it("shows retrieved, kept and rejected places with the reason for each rejection", async () => {
    const user = userEvent.setup();
    stubFetch(RESULT);

    render(<PlayabilityDebugger />);
    await user.click(screen.getByRole("button", { name: "Run discovery" }));

    expect(await screen.findByText("Passed filters (2)")).toBeVisible();
    expect(screen.getByText("Rejected (1)")).toBeVisible();
    expect(screen.getByText("Nail point")).toBeVisible();
    expect(screen.getByText("unverified_identity")).toBeVisible();
  });

  it("marks which places the curator chose", async () => {
    const user = userEvent.setup();
    stubFetch(RESULT);

    render(<PlayabilityDebugger />);
    await user.click(screen.getByRole("button", { name: "Run discovery" }));

    const chapelRow = (await screen.findByText("St. Thomas Chapel")).closest(
      "tr",
    )!;
    const galleryRow = screen.getByText("Mario Gallery").closest("tr")!;

    expect(within(chapelRow).getByText("chosen")).toBeVisible();
    expect(within(galleryRow).queryByText("chosen")).toBeNull();
  });

  it("reports how the selection was made", async () => {
    const user = userEvent.setup();
    stubFetch(RESULT);

    render(<PlayabilityDebugger />);
    await user.click(screen.getByRole("button", { name: "Run discovery" }));

    expect(await screen.findByText("sol")).toBeVisible();
    expect(screen.getByText("distance")).toBeVisible();
  });

  // A silent fallback to the deterministic curator previously looked identical
  // to a successful AI selection.
  it("says so when Sol was asked for but did not produce the selection", async () => {
    const user = userEvent.setup();
    stubFetch({ ...RESULT, selectionMethod: "deterministic" });

    render(<PlayabilityDebugger />);
    await user.click(screen.getByRole("button", { name: "Run discovery" }));

    expect(
      await screen.findByText(/Sol was requested but did not produce/),
    ).toBeVisible();
  });

  it("surfaces a provider failure code rather than a blank screen", async () => {
    const user = userEvent.setup();
    stubFetch({ error: "Discovery failed.", code: "rate_limited" }, false);

    render(<PlayabilityDebugger />);
    await user.click(screen.getByRole("button", { name: "Run discovery" }));

    expect(
      await screen.findByText("Discovery failed. (rate_limited)"),
    ).toBeVisible();
  });

  it("sends the chosen setup to the debug endpoint", async () => {
    const user = userEvent.setup();
    const fetcher = stubFetch(RESULT);

    render(<PlayabilityDebugger />);
    await user.selectOptions(screen.getByLabelText(/Mood/), "strange");
    await user.click(screen.getByRole("button", { name: "Run discovery" }));

    const [, options] = fetcher.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];

    expect(JSON.parse(options.body)).toMatchObject({
      mood: "strange",
      durationMinutes: 60,
      partyMode: "solo",
      useAiCurator: true,
      origin: { latitude: 15.4989, longitude: 73.8317 },
    });
  });
});
