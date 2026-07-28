export const LOCATION_POLICY = {
  foregroundOnly: true,
  backgroundTracking: false,
  preciseCoordinatesInAnalytics: false,
} as const;

export const SAFETY_POLICY = {
  navigationIsNotThePuzzle: true,
  emergencyExitRequired: true,
  unsafeStageReportingRequired: true,
} as const;
