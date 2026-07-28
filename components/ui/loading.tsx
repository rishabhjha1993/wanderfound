import styles from "./ui.module.css";

export function Loading({ label = "Reading the surroundings" }) {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.loadingMark} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
