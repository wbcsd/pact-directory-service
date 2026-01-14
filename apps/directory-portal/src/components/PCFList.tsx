import React from "react";
import { Box, Text } from "@radix-ui/themes";

export interface PCFItem {
  id: string;
  name: string;
  pcfId: string;
  source: string;
  value: string;
  unit: string;
  timestamp: string;
  status?: "pending" | "validated" | "draft" | "under review";
}

interface PCFListProps {
  title: string;
  subtitle: string;
  items: PCFItem[];
  icon?: React.ReactNode;
}

const PCFList: React.FC<PCFListProps> = ({ title, subtitle, items, icon }) => {
  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusStyles: Record<string, { bg: string; color: string; text: string }> = {
      pending: { bg: "#FEF3C7", color: "#92400E", text: "pending" },
      validated: { bg: "#D1FAE5", color: "#065F46", text: "validated" },
      draft: { bg: "#E5E7EB", color: "#374151", text: "draft" },
      "under review": { bg: "#DBEAFE", color: "#1E40AF", text: "under review" },
    };

    const style = statusStyles[status] || statusStyles.draft;

    return (
      <span
        style={{
          fontSize: "11px",
          padding: "2px 8px",
          borderRadius: "12px",
          background: style.bg,
          color: style.color,
          fontWeight: "600",
          textTransform: "lowercase",
        }}
      >
        {style.text}
      </span>
    );
  };

  return (
    <Box
      style={{
        background: "white",
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
        padding: "24px",
      }}
    >
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        {icon && <Box style={{ color: "#6B7280" }}>{icon}</Box>}
        <Text
          style={{
            fontSize: "18px",
            fontWeight: "700",
            color: "#111827",
          }}
        >
          {title}
        </Text>
      </Box>
      <Text
        style={{
          fontSize: "13px",
          color: "#6B7280",
          marginBottom: "20px",
          display: "block",
        }}
      >
        {subtitle}
      </Text>

      <Box style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {items.map((item) => (
          <Box
            key={item.id}
            style={{
              padding: "16px",
              background: "#F9FAFB",
              borderRadius: "6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "background 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#F3F4F6";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#F9FAFB";
            }}
          >
            <Box style={{ flex: 1 }}>
              <Box
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <Text
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  {item.name}
                </Text>
                {item.status && getStatusBadge(item.status)}
              </Box>
              <Text
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  display: "block",
                }}
              >
                {item.pcfId} • from {item.source}
              </Text>
            </Box>
            <Box style={{ textAlign: "right" }}>
              <Text
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#0A0552",
                  display: "block",
                }}
              >
                {item.value} {item.unit}
              </Text>
              <Text
                style={{
                  fontSize: "12px",
                  color: "#9CA3AF",
                }}
              >
                {item.timestamp}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default PCFList;
