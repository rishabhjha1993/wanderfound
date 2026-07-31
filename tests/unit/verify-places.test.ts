import { describe, expect, it, vi } from "vitest";
import { verifySelectedPlaces } from "@/lib/discovery/verify-places";
import type { PlaceVerifier } from "@/lib/providers/contracts";
import { MOCK_PLACE_CANDIDATES } from "@/lib/providers/mock/fixtures";
import type { PlaceCandidate } from "@/lib/providers/domain";

function place(overrides: Partial<PlaceCandidate> = {}): PlaceCandidate {
  return { ...MOCK_PLACE_CANDIDATES[0]!, ...overrides };
}

function verifierReturning(
  handler: (candidate: PlaceCandidate) => Promise<PlaceCandidate>,
): PlaceVerifier {
  const wrap = async (candidate: PlaceCandidate) => ({
    place: await handler(candidate),
    matched: true,
  });
  return {
    descriptor: {
      id: "test_verifier",
      kind: "places",
      name: "Test verifier",
      status: "ready",
    },
    verify: vi.fn(wrap),
  };
}

describe("verifying selected places", () => {
  it("passes each selected place through the verifier", async () => {
    const verifier = verifierReturning(async (candidate) => candidate);
    const selected = [
      place({ providerPlaceId: "a" }),
      place({ providerPlaceId: "b" }),
    ];

    const result = await verifySelectedPlaces({ places: selected, verifier });

    expect(verifier.verify).toHaveBeenCalledTimes(2);
    expect(result.verifiedCount).toBe(2);
    expect(result.places).toHaveLength(2);
  });

  // Verification exists to catch exactly this: a knowledge source describes a
  // building it has no idea was demolished.
  it("drops a place verification proves is gone", async () => {
    const verifier = verifierReturning(async (candidate) => ({
      ...candidate,
      openingStatus: "permanently_closed" as const,
    }));

    const result = await verifySelectedPlaces({
      places: [place({ providerPlaceId: "demolished" })],
      verifier,
    });

    expect(result.places).toEqual([]);
    expect(result.dropped[0]).toMatchObject({ reason: "permanently_closed" });
  });

  it("keeps a place that is merely shut for the evening", async () => {
    const verifier = verifierReturning(async (candidate) => ({
      ...candidate,
      openingStatus: "closed" as const,
      exteriorObservable: true,
    }));

    const result = await verifySelectedPlaces({
      places: [place({ providerPlaceId: "chapel" })],
      verifier,
    });

    expect(result.places).toHaveLength(1);
    expect(result.dropped).toEqual([]);
  });

  it("keeps whatever the verifier learned about a surviving place", async () => {
    const verifier = verifierReturning(async (candidate) => ({
      ...candidate,
      openingStatus: "open" as const,
      address: "Nizamuddin East, New Delhi",
    }));

    const result = await verifySelectedPlaces({
      places: [place({ providerPlaceId: "tomb" })],
      verifier,
    });

    expect(result.places[0]).toMatchObject({
      openingStatus: "open",
      address: "Nizamuddin East, New Delhi",
    });
  });

  // A provider outage is not evidence against a place, and must not silently
  // empty a day.
  it("keeps a place unverified when the verifier fails", async () => {
    const verifier = verifierReturning(async () => {
      throw new Error("provider outage");
    });

    const result = await verifySelectedPlaces({
      places: [place({ providerPlaceId: "unreachable" })],
      verifier,
    });

    expect(result.places).toHaveLength(1);
    expect(result.failedCount).toBe(1);
    expect(result.dropped).toEqual([]);
  });

  it("preserves the order the curator chose", async () => {
    const verifier = verifierReturning(async (candidate) => candidate);
    const selected = ["c", "a", "b"].map((id) =>
      place({ providerPlaceId: id }),
    );

    const result = await verifySelectedPlaces({ places: selected, verifier });

    expect(result.places.map((entry) => entry.providerPlaceId)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("does nothing when no verifier is configured", async () => {
    const selected = [place({ providerPlaceId: "a" })];

    const result = await verifySelectedPlaces({ places: selected });

    expect(result.places).toEqual(selected);
    expect(result.verifiedCount).toBe(0);
  });

  it("makes no call for an empty selection", async () => {
    const verifier = verifierReturning(async (candidate) => candidate);

    await verifySelectedPlaces({ places: [], verifier });

    expect(verifier.verify).not.toHaveBeenCalled();
  });
});
