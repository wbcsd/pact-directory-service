import React from "react";
import { Button } from "@radix-ui/themes";

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  type?: "button" | "submit";
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  children,
  variant = "primary",
  size = "medium",
  disabled = false,
  type = "button",
}) => {
  const getButtonStyles = () => {
    const baseStyles = {
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      fontWeight: "600",
    };

    const sizeStyles = {
      small: { padding: "6px 12px", minHeight: "32px", fontSize: "0.875em" },
      medium: { padding: "8px 16px", minHeight: "36px", fontSize: "1em" },
      large: { padding: "12px 24px", minHeight: "44px", fontSize: "1.125em" },
    };

    const variantStyles = {
      primary: {
        background: disabled ? "#ccc" : "#0A0552",
        color: "white",
      },
      secondary: {
        background: disabled ? "#f5f5f5" : "transparent",
        color: disabled ? "#999" : "#0A0552",
        border: `1px solid ${disabled ? "#ddd" : "#EBF0F5"}`,
      },
      outline: {
        background: "transparent",
        color: disabled ? "#999" : "#0A0552",
        border: `1px solid ${disabled ? "#ddd" : "#0A0552"}`,
      },
    };

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={getButtonStyles()}
    >
      {children}
    </Button>
  );
};

export default ActionButton;