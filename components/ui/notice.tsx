import type { HTMLAttributes } from "react";
import styles from "./ui.module.css";

type NoticeProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "info" | "safety";
};

export function Notice({
  className = "",
  tone = "info",
  ...props
}: NoticeProps) {
  return (
    <div
      className={`${styles.notice} ${styles[tone]} ${className}`}
      role="note"
      {...props}
    />
  );
}
