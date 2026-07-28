import { NextResponse } from "next/server";
import { getSupabaseConfigurationStatus } from "@/lib/supabase/config";
import { APP_VERSION } from "@/lib/version";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "wanderfound-web",
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
