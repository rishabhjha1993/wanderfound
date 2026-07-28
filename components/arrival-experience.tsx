"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import styles from "./arrival-experience.module.css";

export function ArrivalExperience() {
  const [isReady, setIsReady] = useState(false);

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
        <span className={styles.edition}>Field edition · Goa</span>
      </header>

      <section className={styles.hero} aria-labelledby="arrival-title">
        <div className={styles.eyebrow}>
          <span className={styles.coordinates}>15.49° N · 73.83° E</span>
          <span className={styles.rule} aria-hidden="true" />
          <span>Adventure 001</span>
        </div>

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

        <Button
          fullWidth
          aria-expanded={isReady}
          aria-controls="foundation-status"
          onClick={() => setIsReady(true)}
        >
          Begin where I am
          <span aria-hidden="true"> →</span>
        </Button>

        <div
          className={styles.status}
          id="foundation-status"
          aria-live="polite"
          hidden={!isReady}
        >
          <span aria-hidden="true">✓</span>
          The trailhead is ready. Location setup arrives in the next build
          milestone.
        </div>

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
