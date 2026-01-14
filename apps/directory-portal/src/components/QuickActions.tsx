import React from "react";
import { Box, Text } from "@radix-ui/themes";

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface QuickActionsProps {
  title: string;
  actions: QuickAction[];
  helpText?: string;
  helpLink?: {
    text: string;
    onClick: () => void;
  };
}

const QuickActions: React.FC<QuickActionsProps> = ({
  title,
  actions,
  helpText,
  helpLink,
}) => {
  return (
    <Box
      style={{
        background: "white",
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
        padding: "24px",
      }}
    >
      <Text
        style={{
          fontSize: "18px",
          fontWeight: "700",
          color: "#111827",
          marginBottom: "20px",
          display: "block",
        }}
      >
        {title}
      </Text>

      <Box style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {actions.map((action) => (
          <Box
            key={action.id}
            onClick={action.onClick}
            style={{
              padding: "12px 16px",
              background: "#F9FAFB",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#F3F4F6";
              (e.currentTarget as HTMLElement).style.borderColor = "#D1D5DB";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#F9FAFB";
              (e.currentTarget as HTMLElement).style.borderColor = "transparent";
            }}
          >
            <Box style={{ color: "#6B7280", display: "flex", alignItems: "center" }}>
              {action.icon}
            </Box>
            <Text
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#111827",
              }}
            >
              {action.label}
            </Text>
          </Box>
        ))}
      </Box>

      {(helpText || helpLink) && (
        <Box
          style={{
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid #E5E7EB",
          }}
        >
          {helpText && (
            <Text
              style={{
                fontSize: "13px",
                color: "#6B7280",
                display: "block",
                marginBottom: "8px",
              }}
            >
              {helpText}
            </Text>
          )}
          {helpLink && (
            <Text
              onClick={helpLink.onClick}
              style={{
                fontSize: "13px",
                color: "#0A0552",
                fontWeight: "600",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {helpLink.text}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export default QuickActions;
