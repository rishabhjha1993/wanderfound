import Link from "next/link";
import { Card } from "@/components/ui/card";
import styles from "../auth.module.css";

export default function AuthCodeErrorPage() {
  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <h1>That doorway closed.</h1>
        <p>
          Google sign-in was cancelled, expired, or could not be verified.
          Nothing was saved. You can safely try again.
        </p>
        <Link className={styles.link} href="/">
          Return to Wanderfound
        </Link>
      </Card>
    </main>
  );
}
