import { notFound, redirect } from "next/navigation";
import { PlayabilityDebugger } from "@/components/playability-debugger";
import { isDebugToolingEnabled } from "@/lib/discovery/debug-access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlayabilityDebugPage() {
  if (!isDebugToolingEnabled()) {
    notFound();
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/");
  }

  return <PlayabilityDebugger />;
}
