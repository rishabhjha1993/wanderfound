import { GoogleRoutesProvider } from "../lib/providers/google/google-routes-provider";
import { ProviderError } from "../lib/providers/errors";

const locations = [
  { name: "Qutub Minar", latitude: 28.5244, longitude: 77.1855 },
  { name: "Jamali Kamali", latitude: 28.5249, longitude: 77.1814 },
  { name: "Rajon ki Baoli", latitude: 28.5205, longitude: 77.1801 },
];

const provider = new GoogleRoutesProvider();

try {
  const matrix = await provider.walkingMatrix({
    locations: locations.map(({ latitude, longitude }) => ({
      latitude,
      longitude,
    })),
    languageCode: "en",
    regionCode: "IN",
  });
  const route = await provider.walkingRoute({
    origin: locations[0]!,
    destination: locations[1]!,
    languageCode: "en",
    regionCode: "IN",
  });
  const reachable = matrix.elements.filter(
    (element) =>
      element.originIndex !== element.destinationIndex &&
      element.condition === "route_exists",
  );

  console.log(
    JSON.stringify(
      {
        status: "passed",
        matrixElements: matrix.elements.length,
        reachableDirectedPairs: reachable.length,
        sampledRoute: {
          from: locations[0]!.name,
          to: locations[1]!.name,
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          geometryPoints: route.path.length,
          steps: route.steps.length,
        },
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        provider: error instanceof ProviderError ? error.providerId : "unknown",
        code: error instanceof ProviderError ? error.code : "unknown",
        retryable: error instanceof ProviderError ? error.retryable : false,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
