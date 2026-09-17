import { expect, test } from "@playwright/test";

const fixture = {
  id: "88f0be84-d9ed-4f93-9bdd-40fcab25e1f9",
  area: "Panjim",
  summary: "A little art and a slower afternoon.",
  clarification: null,
  checkedAt: new Date().toISOString(),
  transport: "drive",
  hours: 3,
  weather: null,
  notices: ["Check hours before leaving."],
  agent: {
    decision: "Go to Goa State Museum for a quiet cultural afternoon.",
    primaryId: "test-place",
    fallbackId: null,
    nextAction: "Open the route when ready.",
    itinerary: ["Travel to the museum", "Explore for about an hour"],
    watchFor: ["Check access before leaving."],
  },
  options: [
    {
      id: "test-place",
      name: "Goa State Museum",
      title: "An afternoon with Goa’s stories",
      why: "A cultural visit that fits your afternoon.",
      experience: "Browse the museum collection at your own pace.",
      category: "culture",
      coordinates: { latitude: 15.5, longitude: 73.83 },
      address: "Panjim, Goa",
      mapsUrl: "https://www.google.com/maps",
      website: null,
      openNow: true,
      weeklyHours: ["Monday: 10:00–17:00"],
      priceLabel: "Cost not verified",
      visitMinutes: 60,
      travelMinutes: 15,
      distanceKm: 5,
      practicalNote: "Check access before leaving.",
      sources: [{ title: "Museum", url: "https://museum.goa.gov.in/" }],
    },
  ],
};

test("agent decides, replans, restores and remembers an outing", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) =>
        sessionStorage.setItem("test-share-url", data.url ?? ""),
    });
  });
  const requests: Array<Record<string, unknown>> = [];
  const events: Array<{ name: string }> = [];
  await page.route("**/api/outings/events", async (route) => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/outings", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/x-ndjson",
      body:
        JSON.stringify({ type: "progress", stage: "Checking places" }) +
        "\n" +
        JSON.stringify({ type: "result", result: fixture }) +
        "\n",
    });
  });
  await page.goto("/");
  await page
    .getByLabel("What is your situation right now?")
    .fill("Something cultural tomorrow afternoon");
  await page.getByLabel("STARTING AROUND").fill("Panjim");
  await page.getByRole("button", { name: /Let the agent decide/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "An afternoon with Goa’s stories",
      level: 2,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Put the agent on duty/ }).click();
  await expect(page.getByText("AGENT ON DUTY")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open live route/ }),
  ).toHaveAttribute("href", /destination_place_id=test-place/);
  await page.getByRole("button", { name: /We’re hungry/ }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].message).toContain("hungry now");
  expect(JSON.stringify(requests[1].history)).toContain(
    "Something cultural tomorrow afternoon",
  );
  await page.getByRole("button", { name: /Put the agent on duty/ }).click();
  await page.reload();
  await expect(page.getByText("AGENT ON DUTY")).toBeVisible();
  await page.getByRole("button", { name: /done with this outing/ }).click();
  await page.getByRole("button", { name: /We like a slow pace/ }).click();
  await expect
    .poll(() => events.some((event) => event.name === "went"))
    .toBe(true);
  await expect
    .poll(() => events.some((event) => event.name === "memory_added"))
    .toBe(true);
  await page.getByRole("button", { name: /Plan what’s next/ }).click();
  await expect(page.getByText("We like a slow pace")).toBeVisible();
  await page
    .getByLabel("What is your situation right now?")
    .fill("Another cultural place");
  await page.getByRole("button", { name: /Let the agent decide/ }).click();
  await page.getByRole("button", { name: /Put the agent on duty/ }).click();
  await page.getByRole("button", { name: "Share this plan" }).click();
  const shareUrl = await page.evaluate(() =>
    sessionStorage.getItem("test-share-url"),
  );
  expect(shareUrl).toContain("#outing=");
  await page.goto(shareUrl!);
  await expect(page.getByText("A PLAN, PASSED ALONG")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open live route/ }),
  ).toBeVisible();
});

test("a failed request preserves the draft for retry", async ({ page }) => {
  await page.route("**/api/outings", (route) =>
    route.fulfill({
      status: 429,
      json: { error: "Please wait and try again." },
    }),
  );
  await page.goto("/");
  await page
    .getByLabel("What is your situation right now?")
    .fill("A good local bakery");
  await page.getByRole("button", { name: /Let the agent decide/ }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Please wait" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("What is your situation right now?"),
  ).toHaveValue("A good local bakery");
  await expect(
    page.getByRole("button", { name: /Let the agent decide/ }),
  ).toBeEnabled();
});
