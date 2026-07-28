import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import styles from "./start.module.css";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (!claims) {
    redirect("/");
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <p className={styles.eyebrow}>Google account connected</p>
        <h1>Your trailhead is ready.</h1>
        <p className={styles.description}>
          You’re securely signed in. Location and adventure choices arrive in
          the next step.
        </p>
        <form action="/auth/signout" method="post">
          <button className={styles.signOut} type="submit">
            Sign out
          </button>
        </form>
      </Card>
    </main>
  );
}
