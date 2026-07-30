import type { GeoCoordinate } from "@/lib/providers/domain";

const EARTH_RADIUS_METERS = 6_371_000;

export type SweepShape = {
  /** How far from the player the day may reach, in metres. */
  reachMeters: number;
  /** Radius of each individual provider search. */
  searchRadiusMeters: number;
  /** Rings of centres around the player, excluding the player's own position. */
  rings: number;
  /** Centres placed on each ring. */
  centresPerRing: number;
};

/**
 * Places the points a city sweep will search from.
 *
 * A Nearby Search answers a point, not a city: it returns at most twenty
 * results, and widening the radius returns the same twenty prominent places
 * spread thinner rather than more of them. Covering a city therefore means
 * asking in several places.
 *
 * Centres are derived geometrically from the player's position. They are never
 * read from a list of named districts, because such a list works in the cities
 * someone remembered to add and silently fails everywhere else, which is
 * exactly the worldwide guarantee this product makes.
 *
 * Rings are offset by half a step so centres do not stack along the same
 * bearings, which would leave wedges of the city unsearched.
 */
export function deriveSearchCentres(
  origin: GeoCoordinate,
  shape: SweepShape,
): GeoCoordinate[] {
  const centres: GeoCoordinate[] = [origin];

  for (let ring = 1; ring <= shape.rings; ring += 1) {
    const distance = (shape.reachMeters * ring) / shape.rings;
    const bearingStep = 360 / shape.centresPerRing;
    const bearingOffset = ring % 2 === 0 ? bearingStep / 2 : 0;

    for (let index = 0; index < shape.centresPerRing; index += 1) {
      centres.push(
        destinationPoint(origin, distance, bearingOffset + index * bearingStep),
      );
    }
  }

  return centres;
}

/** Total provider calls a sweep will make, so cost is known before spending. */
export function sweepCallCount(shape: SweepShape, searchGroups: number) {
  return (1 + shape.rings * shape.centresPerRing) * searchGroups;
}

/**
 * Where you arrive travelling `distanceMeters` from `origin` on `bearing`,
 * along a great circle. Accurate enough at city scale, and unlike a flat
 * offset it does not distort as latitude increases — the product is meant to
 * work in Reykjavik as well as in Panjim.
 */
function destinationPoint(
  origin: GeoCoordinate,
  distanceMeters: number,
  bearingDegrees: number,
): GeoCoordinate {
  const angular = distanceMeters / EARTH_RADIUS_METERS;
  const bearing = toRadians(bearingDegrees);
  const latitude = toRadians(origin.latitude);
  const longitude = toRadians(origin.longitude);

  const destinationLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angular) +
      Math.cos(latitude) * Math.sin(angular) * Math.cos(bearing),
  );
  const destinationLongitude =
    longitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(latitude),
      Math.cos(angular) - Math.sin(latitude) * Math.sin(destinationLatitude),
    );

  return {
    latitude: toDegrees(destinationLatitude),
    // Keep longitude in [-180, 180] so a sweep near the date line stays valid.
    longitude: ((toDegrees(destinationLongitude) + 540) % 360) - 180,
  };
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}
