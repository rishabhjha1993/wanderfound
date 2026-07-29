export type GoogleMapsBrowserConfig = {
  apiKey: string;
  mapId: string;
};

export type GoogleMapsConfigIssue =
  "missing_api_key" | "invalid_api_key" | "missing_map_id" | "invalid_map_id";

export type GoogleMapsConfigResult =
  | { ok: true; config: GoogleMapsBrowserConfig }
  | { ok: false; issues: GoogleMapsConfigIssue[] };

const GOOGLE_BROWSER_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{20,}$/;
const GOOGLE_MAP_ID_PATTERN = /^[0-9a-f]{16,32}$/i;

export function getGoogleMapsBrowserConfig(): GoogleMapsConfigResult {
  return validateGoogleMapsBrowserConfig({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "",
  });
}

export function validateGoogleMapsBrowserConfig({
  apiKey,
  mapId,
}: GoogleMapsBrowserConfig): GoogleMapsConfigResult {
  const normalisedApiKey = apiKey.trim();
  const normalisedMapId = mapId.trim();
  const issues: GoogleMapsConfigIssue[] = [];

  if (!normalisedApiKey) {
    issues.push("missing_api_key");
  } else if (!GOOGLE_BROWSER_KEY_PATTERN.test(normalisedApiKey)) {
    issues.push("invalid_api_key");
  }

  if (!normalisedMapId) {
    issues.push("missing_map_id");
  } else if (!GOOGLE_MAP_ID_PATTERN.test(normalisedMapId)) {
    issues.push("invalid_map_id");
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    config: {
      apiKey: normalisedApiKey,
      mapId: normalisedMapId,
    },
  };
}

export function describeGoogleMapsConfigIssues(
  issues: GoogleMapsConfigIssue[],
) {
  const variables = new Set<string>();

  for (const issue of issues) {
    variables.add(
      issue === "missing_api_key" || issue === "invalid_api_key"
        ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
        : "NEXT_PUBLIC_GOOGLE_MAP_ID",
    );
  }

  return [...variables];
}
