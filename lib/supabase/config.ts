const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_KEY_ENV = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export type SupabasePublicConfig = Readonly<{
  url: string;
  publishableKey: string;
}>;

export type SupabaseConfigurationStatus = "configured" | "missing" | "invalid";

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env[SUPABASE_URL_ENV]?.trim();
  const publishableKey = process.env[SUPABASE_KEY_ENV]?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      `Supabase configuration is missing. Set ${SUPABASE_URL_ENV} and ${SUPABASE_KEY_ENV}.`,
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`${SUPABASE_URL_ENV} must be a valid URL.`);
  }

  const isLocalSupabase =
    parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";

  if (parsedUrl.protocol !== "https:" && !isLocalSupabase) {
    throw new Error(
      `${SUPABASE_URL_ENV} must use HTTPS outside local development.`,
    );
  }

  if (!publishableKey.startsWith("sb_publishable_")) {
    throw new Error(
      `${SUPABASE_KEY_ENV} must be a modern Supabase publishable key.`,
    );
  }

  return Object.freeze({ url: parsedUrl.toString(), publishableKey });
}

export function getSupabaseConfigurationStatus(): SupabaseConfigurationStatus {
  const hasUrl = Boolean(process.env[SUPABASE_URL_ENV]?.trim());
  const hasKey = Boolean(process.env[SUPABASE_KEY_ENV]?.trim());

  if (!hasUrl && !hasKey) {
    return "missing";
  }

  try {
    getSupabasePublicConfig();
    return "configured";
  } catch {
    return "invalid";
  }
}
