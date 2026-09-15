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

test("guest generates, revises, restores and reports an outing", async ({
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
    .getByLabel("What would you like to do?")
    .fill("Something cultural tomorrow afternoon");
  await page.getByLabel("STARTING AROUND").fill("Panjim");
  await page.getByRole("button", { name: /Find my next move/ }).click();
  await expect(
    page.getByRole("heading", { name: "An afternoon with Goa’s stories" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /A little closer/ }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].message).toBe("A little closer");
  expect(JSON.stringify(requests[1].history)).toContain(
    "Something cultural tomorrow afternoon",
  );
  await page.getByRole("button", { name: /This is my kind of outing/ }).click();
  await expect(page.getByRole("link", { name: /Let’s go/ })).toHaveAttribute(
    "href",
    /destination_place_id=test-place/,
  );
  await page.reload();
  await expect(page.getByRole("link", { name: /Let’s go/ })).toBeVisible();
  await page.getByRole("button", { name: "We went", exact: true }).click();
  await page.getByRole("button", { name: "Yes, worth it" }).click();
  await expect
    .poll(() => events.some((event) => event.name === "went"))
    .toBe(true);
  await expect
    .poll(() => events.some((event) => event.name === "useful"))
    .toBe(true);
  await page.getByRole("button", { name: "Share Goa State Museum" }).click();
  const shareUrl = await page.evaluate(() =>
    sessionStorage.getItem("test-share-url"),
  );
  expect(shareUrl).toContain("#outing=");
  await page.goto(shareUrl!);
  await expect(page.getByText("A DISCOVERY, PASSED ALONG")).toBeVisible();
  await expect(page.getByRole("link", { name: /Let’s go/ })).toBeVisible();
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
    .getByLabel("What would you like to do?")
    .fill("A good local bakery");
  await page.getByRole("button", { name: /Find my next move/ }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Please wait" }),
  ).toBeVisible();
  await expect(page.getByLabel("What would you like to do?")).toHaveValue(
    "A good local bakery",
  );
  await expect(
    page.getByRole("button", { name: /Find my next move/ }),
  ).toBeEnabled();
});
