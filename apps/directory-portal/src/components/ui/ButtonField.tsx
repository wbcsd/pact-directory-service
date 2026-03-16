import React from "react";
import styles from "./ButtonField.module.css";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonFieldProps {
  type?: "button" | "submit" | "reset";
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ButtonField: React.FC<ButtonFieldProps> = ({
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  children,
  onClick,
}) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={[
      styles.button,
      styles[variant],
      styles[size],
      fullWidth ? styles.full : "",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {children}
  </button>
);

export { ButtonField };
export type { ButtonFieldProps, ButtonVariant, ButtonSize };
