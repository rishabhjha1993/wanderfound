import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path === "/" ||
    path === "/start" ||
    path === "/api/outings" ||
    path.startsWith("/api/outings/")
  ) {
    return NextResponse.next({ request });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
