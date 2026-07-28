import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

type SheetProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  children: ReactNode;
};

export function Sheet({
  title,
  children,
  className = "",
  ...props
}: SheetProps) {
  return (
    <section
      aria-labelledby="sheet-title"
      className={`${styles.sheet} ${className}`}
      {...props}
    >
      <span className={styles.sheetHandle} aria-hidden="true" />
      <h2 id="sheet-title">{title}</h2>
      {children}
    </section>
  );
}
