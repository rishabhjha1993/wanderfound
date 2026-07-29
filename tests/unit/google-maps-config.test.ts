import { describe, expect, it } from "vitest";
import {
  describeGoogleMapsConfigIssues,
  validateGoogleMapsBrowserConfig,
} from "@/lib/maps/config";

describe("Google Maps browser configuration", () => {
  it("reports both missing public values", () => {
    const result = validateGoogleMapsBrowserConfig({
      apiKey: "",
      mapId: "",
    });

    expect(result).toEqual({
      ok: false,
      issues: ["missing_api_key", "missing_map_id"],
    });

    if (!result.ok) {
      expect(describeGoogleMapsConfigIssues(result.issues)).toEqual([
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
        "NEXT_PUBLIC_GOOGLE_MAP_ID",
      ]);
    }
  });

  it("rejects placeholder-shaped values before loading Google", () => {
    expect(
      validateGoogleMapsBrowserConfig({
        apiKey: "not-a-google-browser-key",
        mapId: "not-a-map-id",
      }),
    ).toEqual({
      ok: false,
      issues: ["invalid_api_key", "invalid_map_id"],
    });
  });

  it("normalises and accepts Google-shaped values", () => {
    expect(
      validateGoogleMapsBrowserConfig({
        apiKey: "  AIzaSyabcdefghijklmnopqrstuvwxyz123456789  ",
        mapId: "  8e0a97af9386fef0  ",
      }),
    ).toEqual({
      ok: true,
      config: {
        apiKey: "AIzaSyabcdefghijklmnopqrstuvwxyz123456789",
        mapId: "8e0a97af9386fef0",
      },
    });
  });
});
