import { NextResponse } from "next/server";
import { getSupabaseConfigurationStatus } from "@/lib/supabase/config";
import { APP_VERSION } from "@/lib/version";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "wanderfound-web",
      experience: "goa-outings-v0",
      revision: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? null,
      version: APP_VERSION,
      integrations: {
        supabase: getSupabaseConfigurationStatus(),
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
