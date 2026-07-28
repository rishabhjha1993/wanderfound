import { afterEach, describe, expect, it } from "vitest";
import {
  getSupabaseConfigurationStatus,
  getSupabasePublicConfig,
} from "@/lib/supabase/config";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  }

  if (originalKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});

describe("Supabase public configuration", () => {
  it("accepts an HTTPS project URL and modern publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";

    expect(getSupabasePublicConfig()).toEqual({
      url: "https://example.supabase.co/",
      publishableKey: "sb_publishable_example",
    });
    expect(getSupabaseConfigurationStatus()).toBe("configured");
  });

  it("reports missing configuration without exposing values", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(getSupabaseConfigurationStatus()).toBe("missing");
    expect(() => getSupabasePublicConfig()).toThrow(
      "Supabase configuration is missing.",
    );
  });

  it("rejects insecure remote URLs and non-publishable keys", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "legacy-or-secret-key";

    expect(getSupabaseConfigurationStatus()).toBe("invalid");
    expect(() => getSupabasePublicConfig()).toThrow(
      "must use HTTPS outside local development",
    );
  });
});
