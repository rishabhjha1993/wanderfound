"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { createClient } from "@/lib/supabase/client";
import styles from "./arrival-experience.module.css";

export function ArrivalExperience() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setAuthError(null);
    setIsRedirecting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/start`,
        },
      });

      if (error) {
        throw error;
      }
    } catch {
      setAuthError("Google sign-in could not start. Please try again.");
      setIsRedirecting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.topography} aria-hidden="true">
        <span className={styles.contourOne} />
        <span className={styles.contourTwo} />
        <span className={styles.contourThree} />
      </div>

      <header className={styles.header}>
        <Link
          className={styles.wordmark}
          href="/"
          aria-label="Wanderfound home"
        >
          <span className={styles.mark} aria-hidden="true">
            <span />
          </span>
          Wanderfound
        </Link>
      </header>

      <section className={styles.hero} aria-labelledby="arrival-title">
        <h1 id="arrival-title">The world is hiding in plain sight.</h1>
        <p className={styles.intro}>
          Turn the streets around you into a walkable mystery—made in the
          moment, and discovered one clue at a time.
        </p>
      </section>

      <div className={styles.discoveryMap} aria-hidden="true">
        <div className={styles.route}>
          <span className={styles.routeStart} />
          <span className={styles.routeDotOne} />
          <span className={styles.routeDotTwo} />
          <span className={styles.routeEnd}>
            <i />
          </span>
        </div>
        <span className={styles.mapLabelOne}>You are here</span>
        <span className={styles.mapLabelTwo}>Something waits nearby</span>
      </div>

      <Card className={styles.actionCard}>
        <div className={styles.actionHeading}>
          <span className={styles.step}>01</span>
          <div>
            <h2>Begin where you are</h2>
            <p>
              We’ll use your location only while you play. Background tracking
              is never requested.
            </p>
          </div>
        </div>

        <Button fullWidth disabled={isRedirecting} onClick={signInWithGoogle}>
          <GoogleIcon />
          {isRedirecting ? "Opening Google…" : "Continue with Google"}
        </Button>

        {authError ? (
          <p className={styles.authError} role="alert">
            {authError}
          </p>
        ) : null}

        <Notice className={styles.privacyNotice}>
          <span className={styles.shield} aria-hidden="true">
            ◇
          </span>
          <span>
            Your precise location stays out of analytics. You can pause or end
            an adventure at any time.
          </span>
        </Notice>
      </Card>

      <footer className={styles.footer}>
        <button type="button">How it works</button>
        <span aria-hidden="true">·</span>
        <button type="button">Safety &amp; privacy</button>
        <span className={styles.footerMark}>Wander. Notice. Find.</span>
      </footer>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg
      className={styles.googleIcon}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      <path
        fill="#4285f4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34a853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.98v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#fbbc05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.05l2.99-2.33Z"
      />
      <path
        fill="#ea4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.95l2.99 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
