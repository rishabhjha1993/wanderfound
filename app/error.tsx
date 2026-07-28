"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import styles from "./error.module.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        event: "ui_error_boundary",
        message: error.message,
        digest: error.digest,
      }),
    );
  }, [error]);

  return (
    <main className={styles.page}>
      <div className={styles.compass} aria-hidden="true">
        !
      </div>
      <p className={styles.eyebrow}>The trail went quiet</p>
      <h1>We lost the thread for a moment.</h1>
      <p>
        Your surroundings are still here. Try returning to the trail; if that
        does not work, you can safely begin again.
      </p>
      <Button onClick={reset}>Return to the trail</Button>
    </main>
  );
}
