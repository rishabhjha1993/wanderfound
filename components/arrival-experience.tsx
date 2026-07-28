"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
        <span className={styles.headerNote}>Walking mysteries in Goa</span>
      </header>

      <div className={styles.arrival}>
        <section className={styles.hero} aria-labelledby="arrival-title">
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            Your next hour, hiding nearby
          </p>
          <h1 id="arrival-title">
            Go out.
            <br />
            Look <em>closer.</em>
          </h1>
          <p className={styles.intro}>
            Wanderfound turns the streets around you into a one-of-a-kind
            walking mystery, revealed clue by clue.
          </p>

          <div className={styles.discoveryMap} aria-hidden="true">
            <div className={styles.route}>
              <span className={styles.routeStart} />
              <span className={styles.routeDotOne} />
              <span className={styles.routeDotTwo} />
              <span className={styles.routeEnd}>
                <i />
              </span>
            </div>
            <span className={styles.mapLabelOne}>You</span>
            <span className={styles.mapLabelTwo}>The unknown</span>
          </div>
        </section>

        <Card className={styles.actionCard}>
          <p className={styles.cardKicker}>Ready when you are</p>
          <h2>Start your adventure</h2>
          <p className={styles.cardIntro}>
            Sign in once, then we’ll build a trail around where you’re standing.
          </p>

          <Button
            className={styles.googleButton}
            variant="quiet"
            fullWidth
            disabled={isRedirecting}
            onClick={signInWithGoogle}
          >
            <GoogleIcon />
            {isRedirecting ? "Opening Google…" : "Continue with Google"}
          </Button>

          {authError ? (
            <p className={styles.authError} role="alert">
              {authError}
            </p>
          ) : null}

          <div className={styles.promises}>
            <p>
              <span aria-hidden="true">⌖</span>
              Location only while you play
            </p>
            <p>
              <span aria-hidden="true">○</span>
              No background tracking
            </p>
          </div>
        </Card>
      </div>

      <footer className={styles.footer}>
        <span>Made for curious feet</span>
        <span className={styles.footerMark}>Wander · Notice · Find</span>
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
