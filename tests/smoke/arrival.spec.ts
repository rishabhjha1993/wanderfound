import { expect, test } from "@playwright/test";

test("arrival route loads on a mobile viewport", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "The world is hiding in plain sight.",
    }),
  ).toBeVisible();

  const begin = page.getByRole("button", { name: /Begin where I am/ });
  await expect(begin).toBeVisible();
  await begin.click();
  await expect(page.getByText(/trailhead is ready/i)).toBeVisible();
});

test("arrival remains usable at 320px with large text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const begin = page.getByRole("button", { name: /Begin where I am/ });
  await expect(begin).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("health endpoint reports a safe build status", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.ok()).toBe(true);

  const payload = await response.json();
  expect(payload.status).toBe("ok");
  expect(payload.service).toBe("wanderfound-web");
  expect(payload).not.toHaveProperty("secrets");
});
