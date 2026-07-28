export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ??
  process.env.CF_PAGES_COMMIT_SHA?.slice(0, 8) ??
  "0.1.0-local";
