import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseConfigurationStatus,
  getSupabasePublicConfig,
} from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  if (getSupabaseConfigurationStatus() !== "configured") {
    return NextResponse.next({ request });
  }

  const { url, publishableKey } = getSupabasePublicConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  // This validates any auth token and refreshes its cookies when necessary.
  // Server authorization must use getClaims(), never an unverified session.
  await supabase.auth.getClaims();

  return response;
}
