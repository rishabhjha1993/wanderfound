import { describe, expect, it, vi } from "vitest";
import { WikidataPlacesProvider } from "@/lib/providers/wikidata";
import type { NearbyPlacesInput } from "@/lib/providers/domain";
import { PlacesProviderError } from "@/lib/providers/errors";

const INPUT: NearbyPlacesInput = {
  origin: { latitude: 28.5921, longitude: 77.046 },
  radiusMeters: 40_000,
  maxResults: 20,
  categories: ["heritage", "museum", "culinary"],
  languageCode: "en",
};

function binding(overrides: Record<string, unknown> = {}) {
  return {
    item: { value: "http://www.wikidata.org/entity/Q207590" },
    itemLabel: { value: "Humayun's Tomb" },
    lat: { value: "28.593333" },
    lon: { value: "77.250833" },
    cls: { value: "http://www.wikidata.org/entity/Q381885" },
    links: { value: "69" },
    ...overrides,
  };
}

function respondWith(bindings: unknown[]) {
  return vi.fn<typeof fetch>(async () =>
    Promise.resolve(Response.json({ results: { bindings } }, { status: 200 })),
  );
}

describe("WikidataPlacesProvider", () => {
  it("normalises a monument into a candidate", async () => {
    const provider = new WikidataPlacesProvider({
      fetcher: respondWith([binding()]),
      now: () => new Date("2026-07-30T10:00:00.000Z"),
    });

    const [place] = await provider.nearby(INPUT);

    expect(place).toMatchObject({
      provider: "wikidata",
      providerPlaceId: "Q207590",
      name: "Humayun's Tomb",
      primaryCategory: "heritage",
      sitelinkCount: 69,
      // Being described in an encyclopaedia is the landmark signal.
      landmarkSignal: true,
      publicAccess: "yes",
      exteriorObservable: true,
    });
    expect(place!.attributions[0]).toMatchObject({
      provider: "wikidata",
      licenseName: "CC0-1.0",
    });
  });

  it("records something observable, so the filters do not reject it", async () => {
    const provider = new WikidataPlacesProvider({
      fetcher: respondWith([binding()]),
    });

    const [place] = await provider.nearby(INPUT);

    expect(place!.visualSignals.length).toBeGreaterThan(0);
  });

  // The whole point of this provider: notability is a property of the place,
  // not a count of who walked past it.
  it("asks for the places an encyclopaedia describes, ranked by how widely", async () => {
    const fetcher = respondWith([]);
    const provider = new WikidataPlacesProvider({ fetcher });

    await provider.nearby(INPUT);

    // URLSearchParams encodes spaces as "+", which decodeURIComponent leaves.
    const query = decodeURIComponent(
      String(fetcher.mock.calls[0]![0]),
    ).replaceAll("+", " ");

    expect(query).toContain("wikibase:around");
    expect(query).toContain("wikibase:radius");
    expect(query).toContain("ORDER BY DESC(?links)");
    // 40 km, expressed in kilometres.
    expect(query).toContain('"40"');
  });

  it("identifies itself to a free service it depends on", async () => {
    const fetcher = respondWith([]);
    const provider = new WikidataPlacesProvider({ fetcher });

    await provider.nearby(INPUT);

    const headers = fetcher.mock.calls[0]![1]?.headers as Record<
      string,
      string
    >;

    expect(headers["User-Agent"]).toContain("Wanderfound");
  });

  // Wikidata has no entry for a good litti chokha stall, and inventing one
  // would return restaurant chains rather than food anyone travels for.
  it("makes no request when a mood asks only for food", async () => {
    const fetcher = respondWith([]);
    const provider = new WikidataPlacesProvider({ fetcher });

    await expect(
      provider.nearby({ ...INPUT, categories: ["culinary"] }),
    ).resolves.toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("drops a place the caller did not ask for", async () => {
    const provider = new WikidataPlacesProvider({
      // A park, when only heritage, museum and culinary were requested.
      fetcher: respondWith([
        binding({ cls: { value: "http://www.wikidata.org/entity/Q22698" } }),
      ]),
    });

    await expect(provider.nearby(INPUT)).resolves.toEqual([]);
  });

  // An unnamed place cannot carry a clue.
  it("drops an item Wikidata could not name in any requested language", async () => {
    const provider = new WikidataPlacesProvider({
      fetcher: respondWith([binding({ itemLabel: { value: "Q4115712" } })]),
    });

    await expect(provider.nearby(INPUT)).resolves.toEqual([]);
  });

  it("returns an item once even when it instantiates several matched classes", async () => {
    const provider = new WikidataPlacesProvider({
      fetcher: respondWith([
        binding(),
        binding({ cls: { value: "http://www.wikidata.org/entity/Q4989906" } }),
      ]),
    });

    await expect(provider.nearby(INPUT)).resolves.toHaveLength(1);
  });

  it("turns provider failures into typed errors", async () => {
    const provider = new WikidataPlacesProvider({
      fetcher: vi.fn<typeof fetch>(async () =>
        Promise.resolve(new Response(null, { status: 429 })),
      ),
    });

    await expect(provider.nearby(INPUT)).rejects.toMatchObject({
      code: "rate_limited",
      retryable: true,
    } satisfies Partial<PlacesProviderError>);
  });

  it("rejects a malformed request before calling out", async () => {
    const fetcher = respondWith([]);
    const provider = new WikidataPlacesProvider({ fetcher });

    await expect(
      provider.nearby({ ...INPUT, radiusMeters: 10 }),
    ).rejects.toMatchObject({ code: "invalid_request" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
