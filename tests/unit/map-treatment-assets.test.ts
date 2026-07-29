import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import mapStyle from "@/config/wanderfound-map-style.json";

describe("Wanderfound map treatment", () => {
  it("keeps the cloud map warm and removes irrelevant POI labels", () => {
    expect(mapStyle).toMatchObject({
      variant: "light",
      backgroundColor: "#f6f1e4",
    });
    expect(mapStyle.styles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "pointOfInterest",
          label: expect.objectContaining({ visible: false }),
        }),
        expect.objectContaining({
          id: "natural.water",
          geometry: expect.objectContaining({ fillColor: "#b9d3ca" }),
        }),
      ]),
    );
  });

  it("includes reduced-motion and bright-light contrast fallbacks", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/player-location-map.module.css"),
      "utf8",
    );

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (prefers-contrast: more)");
    expect(css).toContain("border-width: 2px");
    expect(css).toContain("background: var(--color-white)");
  });
});
