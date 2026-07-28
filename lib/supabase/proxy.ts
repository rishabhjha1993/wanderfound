import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseConfigurationStatus,
  getSupabasePublicConfig,
} from "@/lib/supabase/config";

const PROTECTED_PREFIXES = ["/start", "/adventure", "/account"];

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
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!claims && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("sign_in", "required");
    return NextResponse.redirect(redirectUrl);
  }

  if (claims && pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/start";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
