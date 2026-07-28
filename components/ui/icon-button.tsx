import type { ButtonHTMLAttributes } from "react";
import styles from "./ui.module.css";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function IconButton({
  label,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`${styles.iconButton} ${className}`}
      type={type}
      {...props}
    />
  );
}
