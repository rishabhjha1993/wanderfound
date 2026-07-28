import { redirect } from "next/navigation";
import { LocationPermissionExperience } from "@/components/location-permission-experience";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (!claims) {
    redirect("/");
  }

  return <LocationPermissionExperience />;
}
