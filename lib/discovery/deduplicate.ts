import type { GeoCoordinate, PlaceCandidate } from "@/lib/providers/domain";

const NEAR_DUPLICATE_DISTANCE_METERS = 120;
const NEAR_DUPLICATE_NAME_SIMILARITY = 0.84;

export function deduplicatePlaceCandidates(
  candidates: PlaceCandidate[],
): PlaceCandidate[] {
  const unique: PlaceCandidate[] = [];
  const providerIds = new Set<string>();
  const exactNames = new Set<string>();

  for (const candidate of candidates) {
    const providerIdentity = `${candidate.provider}:${candidate.providerPlaceId}`;
    const normalisedName = normalisePlaceName(candidate.name);

    if (
      providerIds.has(providerIdentity) ||
      (normalisedName && exactNames.has(normalisedName)) ||
      unique.some(
        (existing) =>
          distanceMeters(existing.coordinates, candidate.coordinates) <=
            NEAR_DUPLICATE_DISTANCE_METERS &&
          placeNameSimilarity(existing.name, candidate.name) >=
            NEAR_DUPLICATE_NAME_SIMILARITY,
      )
    ) {
      continue;
    }

    providerIds.add(providerIdentity);
    exactNames.add(normalisedName);
    unique.push(candidate);
  }

  return unique;
}

export function distanceMeters(first: GeoCoordinate, second: GeoCoordinate) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = degreesToRadians(second.latitude - first.latitude);
  const longitudeDelta = degreesToRadians(second.longitude - first.longitude);
  const firstLatitude = degreesToRadians(first.latitude);
  const secondLatitude = degreesToRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function normalisePlaceName(name: string) {
  return name
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function placeNameSimilarity(first: string, second: string) {
  const firstTokens = new Set(
    normalisePlaceName(first).split(" ").filter(Boolean),
  );
  const secondTokens = new Set(
    normalisePlaceName(second).split(" ").filter(Boolean),
  );

  if (firstTokens.size === 0 || secondTokens.size === 0) {
    return 0;
  }

  const intersection = [...firstTokens].filter((token) =>
    secondTokens.has(token),
  ).length;
  const union = new Set([...firstTokens, ...secondTokens]).size;

  return intersection / union;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
