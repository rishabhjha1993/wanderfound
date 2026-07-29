/**
 * WF-201a — live candidate audit.
 *
 * Runs the real Google Places provider against fixed contrasting coordinates
 * for every mood, and writes a markdown report. This exists so the mood-to-
 * category mapping and the eight-candidate viability bar are judged against
 * observed provider output rather than assumption, before scoring, routing and
 * trail search are built on top of the candidate pool.
 *
 * It deliberately does not call the AI curator: this audits the factual pool,
 * not the selection taste, and costs nothing in model tokens.
 *
 * Defaults to Fontainhas, Panjim alone — four calls, one per mood. The broader
 * evidence about how this engine behaves in different kinds of place is meant
 * to come from real sessions run at the founder's actual location, not from a
 * guessed coordinate list. The wider list below stays available for the moment
 * a specific question needs it.
 *
 *   npm run audit:candidates
 *   npm run audit:candidates -- --all
 *   npm run audit:candidates -- --locations=anjuna,rural-maharashtra
 *   npm run audit:candidates -- --moods=historical
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ADVENTURE_MOODS,
  type AdventureDuration,
  type AdventureMood,
} from "@/lib/adventure/setup-session";
import { deduplicatePlaceCandidates } from "@/lib/discovery/deduplicate";
import { getDiscoveryPolicy } from "@/lib/discovery/policy";
import type { PlaceCandidate } from "@/lib/providers/domain";
import { ProviderError } from "@/lib/providers/errors";
import { GooglePlacesProvider } from "@/lib/providers/google";

type AuditLocation = {
  slug: string;
  label: string;
  character: string;
  latitude: number;
  longitude: number;
  regionCode: string;
};

/**
 * Chosen to span the conditions that decide whether this product works at all:
 * dense Indian urban, Goan tourist coast, Goan village, Indian heritage core,
 * a dense European old town as a contrast case, and deliberately sparse areas
 * that should produce a truthful refusal rather than a thin trail.
 */
const LOCATIONS: AuditLocation[] = [
  {
    slug: "delhi-connaught",
    label: "Connaught Place, Delhi",
    character: "dense Indian urban core",
    latitude: 28.6315,
    longitude: 77.2167,
    regionCode: "IN",
  },
  {
    slug: "delhi-hauz-khas",
    label: "Hauz Khas Village, Delhi",
    character: "heritage plus nightlife mix",
    latitude: 28.5535,
    longitude: 77.1943,
    regionCode: "IN",
  },
  {
    slug: "delhi-mehrauli",
    label: "Mehrauli Archaeological Park, Delhi",
    character: "monument-dense, low commercial",
    latitude: 28.5245,
    longitude: 77.1855,
    regionCode: "IN",
  },
  {
    slug: "panjim-fontainhas",
    label: "Fontainhas, Panjim",
    character: "Goan heritage quarter",
    latitude: 15.4989,
    longitude: 73.8317,
    regionCode: "IN",
  },
  {
    slug: "old-goa",
    label: "Old Goa basilica complex",
    character: "religious heritage cluster",
    latitude: 15.5009,
    longitude: 73.9116,
    regionCode: "IN",
  },
  {
    slug: "anjuna",
    label: "Anjuna, Goa",
    character: "tourist coast, restaurant-heavy",
    latitude: 15.5752,
    longitude: 73.7401,
    regionCode: "IN",
  },
  {
    slug: "assagao",
    label: "Assagao, Goa",
    character: "Goan village, low density",
    latitude: 15.5952,
    longitude: 73.7724,
    regionCode: "IN",
  },
  {
    slug: "palolem",
    label: "Palolem, South Goa",
    character: "beach village, thin inland POIs",
    latitude: 15.01,
    longitude: 74.0233,
    regionCode: "IN",
  },
  {
    slug: "mumbai-fort",
    label: "Fort, Mumbai",
    character: "colonial architecture density",
    latitude: 18.9322,
    longitude: 72.8328,
    regionCode: "IN",
  },
  {
    slug: "bengaluru-basavanagudi",
    label: "Basavanagudi, Bengaluru",
    character: "residential with temples and markets",
    latitude: 12.9422,
    longitude: 77.5736,
    regionCode: "IN",
  },
  {
    slug: "jaipur-pinkcity",
    label: "Pink City, Jaipur",
    character: "walled heritage city",
    latitude: 26.9239,
    longitude: 75.8267,
    regionCode: "IN",
  },
  {
    slug: "lisbon-alfama",
    label: "Alfama, Lisbon",
    character: "dense European old town",
    latitude: 38.7118,
    longitude: -9.1304,
    regionCode: "PT",
  },
  {
    slug: "kyoto-gion",
    label: "Gion, Kyoto",
    character: "non-Latin script, heritage dense",
    latitude: 35.0037,
    longitude: 135.7788,
    regionCode: "JP",
  },
  {
    slug: "rural-maharashtra",
    label: "Rural Maharashtra",
    character: "sparse: refusal expected",
    latitude: 19.4521,
    longitude: 74.6187,
    regionCode: "IN",
  },
  {
    slug: "coastal-sparse",
    label: "Coastal Karnataka backroad",
    character: "sparse coastal: refusal expected",
    latitude: 14.4523,
    longitude: 74.3512,
    regionCode: "IN",
  },
];

const DEFAULT_LOCATION_SLUGS = ["panjim-fontainhas"];
const DURATION: AdventureDuration = 60;
const REQUEST_SPACING_MS = 350;
const VIABILITY_BAR = 8;

type MoodResult = {
  mood: AdventureMood;
  radiusMeters: number;
  rawCount: number;
  uniqueCount: number;
  conservativeCount: number;
  categories: Map<string, number>;
  openNow: number;
  unknownOpening: number;
  commercial: number;
  candidates: PlaceCandidate[];
  error?: string;
};

type LocationResult = {
  location: AuditLocation;
  moods: MoodResult[];
};

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!process.env.GOOGLE_MAPS_SERVER_API_KEY) {
    console.error(
      "GOOGLE_MAPS_SERVER_API_KEY is not set. Add it to .env.local and rerun.",
    );
    process.exitCode = 1;
    return;
  }

  const requestedSlugs = options.all
    ? LOCATIONS.map((location) => location.slug)
    : options.locations.length > 0
      ? options.locations
      : DEFAULT_LOCATION_SLUGS;
  const locations = LOCATIONS.filter((location) =>
    requestedSlugs.includes(location.slug),
  );
  const moods = ADVENTURE_MOODS.filter(
    (mood) => options.moods.length === 0 || options.moods.includes(mood),
  );

  if (locations.length === 0 || moods.length === 0) {
    console.error("No locations or moods matched the given filters.");
    process.exitCode = 1;
    return;
  }

  const totalCalls = locations.length * moods.length;
  console.info(
    `Auditing ${totalCalls} Places calls: ${locations
      .map((location) => location.slug)
      .join(", ")} x ${moods.join(", ")}.`,
  );

  const provider = new GooglePlacesProvider();
  const results: LocationResult[] = [];

  for (const location of locations) {
    const moodResults: MoodResult[] = [];

    for (const mood of moods) {
      process.stdout.write(`  ${location.slug} / ${mood} ... `);
      moodResults.push(await auditOne(provider, location, mood));
      console.info("done");
      await delay(REQUEST_SPACING_MS);
    }

    results.push({ location, moods: moodResults });
  }

  const reportPath = await writeReport(results);
  console.info(`\nReport written to ${reportPath}`);
}

async function auditOne(
  provider: GooglePlacesProvider,
  location: AuditLocation,
  mood: AdventureMood,
): Promise<MoodResult> {
  const policy = getDiscoveryPolicy(DURATION, mood);
  const base: MoodResult = {
    mood,
    radiusMeters: policy.radiusMeters,
    rawCount: 0,
    uniqueCount: 0,
    conservativeCount: 0,
    categories: new Map(),
    openNow: 0,
    unknownOpening: 0,
    commercial: 0,
    candidates: [],
  };

  try {
    const raw = await provider.nearby({
      origin: { latitude: location.latitude, longitude: location.longitude },
      radiusMeters: policy.radiusMeters,
      maxResults: policy.candidateLimit,
      categories: policy.categories,
      languageCode: "en",
      regionCode: location.regionCode,
    });
    const unique = deduplicatePlaceCandidates(raw);

    for (const candidate of unique) {
      base.categories.set(
        candidate.primaryCategory,
        (base.categories.get(candidate.primaryCategory) ?? 0) + 1,
      );

      if (candidate.openingStatus === "open") {
        base.openNow += 1;
      }

      if (candidate.openingStatus === "unknown") {
        base.unknownOpening += 1;
      }

      if (candidate.commercialVenue) {
        base.commercial += 1;
      }
    }

    return {
      ...base,
      rawCount: raw.length,
      uniqueCount: unique.length,
      conservativeCount: unique.filter(survivesConservativeFilters).length,
      candidates: unique,
    };
  } catch (error) {
    return {
      ...base,
      error:
        error instanceof ProviderError
          ? `${error.code}${error.retryable ? " (retryable)" : ""}`
          : "unknown error",
    };
  }
}

/**
 * A preview of WF-202a's "unknown is not permission" stance. This is the number
 * that matters: if it lands below the viability bar in ordinary neighbourhoods,
 * either the bar or the conservative default has to change, and it is far
 * cheaper to learn that here than after scoring and routing are built.
 */
function survivesConservativeFilters(candidate: PlaceCandidate) {
  return (
    candidate.openingStatus !== "closed" &&
    candidate.publicAccess !== "no" &&
    candidate.purchaseRequired !== "yes" &&
    candidate.hazards.length === 0
  );
}

async function writeReport(results: LocationResult[]) {
  const generatedAt = new Date().toISOString();
  const lines: string[] = [
    "# Wanderfound candidate audit",
    "",
    `Generated: ${generatedAt}`,
    `Duration profile: ${DURATION} minutes`,
    `Viability bar: ${VIABILITY_BAR} surviving candidates`,
    "",
    "`Unique` is after deduplication. `Conservative` applies the WF-202a stance",
    "that unknown access is not permission. `Conservative` is the number that",
    "decides whether a trail can be built here.",
    "",
    "## Summary",
    "",
    "| Location | Character | Mood | Unique | Conservative | Viable | Categories | Commercial |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const { location, moods } of results) {
    for (const result of moods) {
      if (result.error) {
        lines.push(
          `| ${location.label} | ${location.character} | ${result.mood} | — | — | ERROR | ${result.error} | — |`,
        );
        continue;
      }

      lines.push(
        [
          "",
          location.label,
          location.character,
          result.mood,
          String(result.uniqueCount),
          String(result.conservativeCount),
          result.conservativeCount >= VIABILITY_BAR ? "yes" : "**no**",
          String(result.categories.size),
          String(result.commercial),
          "",
        ].join(" | "),
      );
    }
  }

  lines.push("", "## Detail", "");

  for (const { location, moods } of results) {
    lines.push(
      `### ${location.label}`,
      "",
      `${location.character} — ${location.latitude}, ${location.longitude}`,
      "",
    );

    for (const result of moods) {
      lines.push(`#### ${result.mood} (${result.radiusMeters} m)`, "");

      if (result.error) {
        lines.push(`Provider error: ${result.error}`, "");
        continue;
      }

      const categories = [...result.categories.entries()]
        .sort((first, second) => second[1] - first[1])
        .map(([category, count]) => `${category} ${count}`)
        .join(", ");

      lines.push(
        `- Raw ${result.rawCount}, unique ${result.uniqueCount}, conservative ${result.conservativeCount}`,
        `- Open now ${result.openNow}, unknown opening ${result.unknownOpening}, commercial ${result.commercial}`,
        `- Categories: ${categories || "none"}`,
        "",
      );

      if (result.candidates.length > 0) {
        lines.push("| Name | Category | Opening | Access | Purchase |");
        lines.push("| --- | --- | --- | --- | --- |");

        for (const candidate of result.candidates) {
          lines.push(
            [
              "",
              candidate.name.replaceAll("|", "/"),
              candidate.primaryCategory,
              candidate.openingStatus,
              candidate.publicAccess,
              candidate.purchaseRequired,
              "",
            ].join(" | "),
          );
        }

        lines.push("");
      }
    }
  }

  const directory = path.resolve(process.cwd(), ".audit");
  const filePath = path.join(
    directory,
    `candidate-audit-${generatedAt.replaceAll(":", "-")}.md`,
  );

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");

  return path.relative(process.cwd(), filePath);
}

function parseArgs(argv: string[]) {
  const read = (flag: string) =>
    argv
      .find((argument) => argument.startsWith(`--${flag}=`))
      ?.split("=")[1]
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

  return {
    all: argv.includes("--all"),
    locations: read("locations"),
    moods: read("moods") as AdventureMood[],
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await main();
