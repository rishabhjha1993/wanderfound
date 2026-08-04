import { attestationOf } from "@/lib/discovery/attestation";
import { distanceMeters } from "@/lib/discovery/deduplicate";
import type { GeoCoordinate, PlaceCandidate } from "@/lib/providers/domain";

export type PocketPolicy = {
  /**
   * How far apart two places may be and still belong to the same pocket. This
   * is a walking decision: it is the step by which a pocket grows, not its
   * total width.
   */
  linkMetres: number;
  /** Fewest places that make a pocket worth travelling to. */
  minPlaces: number;
  /** Widest a pocket may be end to end before it stops being walkable. */
  maxSpanMetres: number;
  /**
   * Fewest distinct categories a pocket must offer.
   *
   * Headcount alone is not substance. A live sweep of Panjim produced pockets
   * of four neighbourhood temples and nothing else — the same complaint that
   * started this work, reappearing one level up. Variety is what makes a
   * pocket a chapter rather than a list.
   */
  minCategories: number;
};

export type Pocket = {
  id: string;
  places: PlaceCandidate[];
  /** Mean position of the pocket's places, used to plan travel between them. */
  centre: GeoCoordinate;
  /** Greatest distance between any two places in the pocket. */
  spanMetres: number;
  categories: string[];
};

/**
 * Groups candidates into walkable pockets.
 *
 * A pocket is found in the data, never declared in advance. A list of named
 * quarters would work in the cities somebody remembered to add and fail
 * silently everywhere else, which would break the promise that this works
 * wherever the player happens to be standing.
 *
 * The method is single-link clustering: two places join the same pocket when
 * they are within `linkMetres` of each other, and a pocket is the transitive
 * closure of that relation. That matches how a neighbourhood actually feels —
 * a chain of places each a short walk from the next — rather than imposing a
 * circle of fixed size on a city that does not have one.
 *
 * Single-link clustering can chain indefinitely along a dense street, so a
 * pocket that grows wider than `maxSpanMetres` is split rather than handed to a
 * player as one walk.
 */
export function findPockets(
  candidates: PlaceCandidate[],
  policy: PocketPolicy,
): Pocket[] {
  const groups = singleLinkGroups(candidates, policy.linkMetres);
  // Judged against the sweep rather than a fixed number, so a small town's
  // best places are not measured by a metropolis's review counts.
  const anchorBar = anchorBarFor(candidates);
  const pockets: Pocket[] = [];

  for (const group of groups) {
    for (const part of splitOversizedGroup(group, policy)) {
      if (part.length < policy.minPlaces) {
        continue;
      }

      const pocket = toPocket(part);

      if (pocket.categories.length < policy.minCategories) {
        continue;
      }

      // Every pocket needs at least one place worth the journey. Without this
      // a day fills with clusters that are merely nearby.
      if (!part.some((place) => isAnchor(place, anchorBar))) {
        continue;
      }

      pockets.push(pocket);
    }
  }

  // Densest first: a pocket with more to find is the better chapter, and the
  // day assembler reads this order when it decides what fits.
  return pockets.sort(
    (first, second) => second.places.length - first.places.length,
  );
}

function singleLinkGroups(candidates: PlaceCandidate[], linkMetres: number) {
  const unassigned = new Set(candidates.map((_, index) => index));
  const groups: PlaceCandidate[][] = [];

  while (unassigned.size > 0) {
    const seed = unassigned.values().next().value as number;
    unassigned.delete(seed);

    const group = [candidates[seed]!];
    const queue = [seed];

    while (queue.length > 0) {
      const current = candidates[queue.pop()!]!;

      for (const index of [...unassigned]) {
        const candidate = candidates[index]!;

        if (
          distanceMeters(current.coordinates, candidate.coordinates) <=
          linkMetres
        ) {
          unassigned.delete(index);
          group.push(candidate);
          queue.push(index);
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Splits a group that chained its way across a city into walkable parts.
 *
 * The places are first walked in nearest-neighbour order from one end of the
 * chain, then cut whenever adding the next would exceed the span. Ordering
 * matters more than it looks: sorting outwards from the centre alternates
 * between opposite ends of a chain, so every cut lands between places that are
 * far apart and the parts come out as single stranded places rather than as
 * neighbourhoods.
 */
function splitOversizedGroup(group: PlaceCandidate[], policy: PocketPolicy) {
  if (spanOf(group) <= policy.maxSpanMetres) {
    return [group];
  }

  const ordered = walkOrder(group);
  const parts: PlaceCandidate[][] = [];
  let part: PlaceCandidate[] = [];

  for (const candidate of ordered) {
    const grown = [...part, candidate];

    if (part.length > 0 && spanOf(grown) > policy.maxSpanMetres) {
      parts.push(part);
      part = [candidate];
      continue;
    }

    part = grown;
  }

  if (part.length > 0) {
    parts.push(part);
  }

  return parts;
}

/**
 * Orders places as somebody would actually walk them: start at one end of the
 * group, then always step to the nearest place not yet visited.
 */
function walkOrder(group: PlaceCandidate[]) {
  const centre = centroidOf(group);
  const remaining = [...group].sort(
    (first, second) =>
      distanceMeters(centre, second.coordinates) -
      distanceMeters(centre, first.coordinates),
  );
  const ordered = [remaining.shift()!];

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1]!;
    let nearest = 0;

    for (let index = 1; index < remaining.length; index += 1) {
      if (
        distanceMeters(current.coordinates, remaining[index]!.coordinates) <
        distanceMeters(current.coordinates, remaining[nearest]!.coordinates)
      ) {
        nearest = index;
      }
    }

    ordered.push(remaining.splice(nearest, 1)[0]!);
  }

  return ordered;
}

function toPocket(places: PlaceCandidate[]): Pocket {
  return {
    // Derived from the places themselves so the same pocket keeps the same id
    // across regenerations, which the debug view relies on.
    id: places
      .map((place) => place.providerPlaceId)
      .sort()
      .join("|")
      .slice(0, 120),
    places,
    centre: centroidOf(places),
    spanMetres: Math.round(spanOf(places)),
    // A fort may be primarily heritage and also architecture; throwing away
    // those provider-backed secondary categories made varied historical
    // pockets look like three copies of the same thing.
    categories: [...new Set(places.flatMap((place) => place.categories))],
  };
}

/** A place notable enough to justify travelling to the pocket it sits in. */
function isAnchor(place: PlaceCandidate, bar: number) {
  return place.landmarkSignal || attestationOf(place) >= bar;
}

/**
 * The bar an anchor must clear, taken from the upper quartile of the sweep.
 *
 * A median would be no bar at all, since half the pool clears it by
 * definition, and a pocket of unremarkable places would always find something
 * to call its anchor. A quartile keeps this relative — a small town is still
 * judged against itself — while actually meaning notable.
 */
function anchorBarFor(candidates: PlaceCandidate[]) {
  if (candidates.length === 0) {
    return 0;
  }

  const counts = candidates
    .map((candidate) => attestationOf(candidate))
    .sort((first, second) => first - second);

  return counts[Math.min(counts.length - 1, Math.floor(counts.length * 0.75))]!;
}

function centroidOf(places: PlaceCandidate[]): GeoCoordinate {
  const total = places.reduce(
    (accumulator, place) => ({
      latitude: accumulator.latitude + place.coordinates.latitude,
      longitude: accumulator.longitude + place.coordinates.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: total.latitude / places.length,
    longitude: total.longitude / places.length,
  };
}

function spanOf(places: PlaceCandidate[]) {
  let widest = 0;

  for (let first = 0; first < places.length; first += 1) {
    for (let second = first + 1; second < places.length; second += 1) {
      widest = Math.max(
        widest,
        distanceMeters(places[first]!.coordinates, places[second]!.coordinates),
      );
    }
  }

  return widest;
}
