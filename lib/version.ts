export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ??
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  process.env.CF_PAGES_COMMIT_SHA?.slice(0, 8) ??
  "0.2.0-outings";
