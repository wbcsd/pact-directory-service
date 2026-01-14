import React from "react";
import { Box, Text } from "@radix-ui/themes";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    type: "positive" | "negative" | "neutral";
  };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
}) => {
  const getTrendColor = () => {
    if (!trend) return "#666";
    switch (trend.type) {
      case "positive":
        return "#16a34a";
      case "negative":
        return "#dc2626";
      default:
        return "#666";
    }
  };

  return (
    <Box
      style={{
        background: "white",
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
        padding: "20px",
        minHeight: "120px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
        }}
      >
        <Text
          style={{
            fontSize: "14px",
            color: "#6B7280",
            fontWeight: "500",
          }}
        >
          {title}
        </Text>
        {icon && (
          <Box style={{ color: "#9CA3AF" }}>
            {icon}
          </Box>
        )}
      </Box>
      <Box>
        <Text
          style={{
            fontSize: "32px",
            fontWeight: "700",
            color: "#111827",
            lineHeight: "1.2",
          }}
        >
          {value}
        </Text>
        {(subtitle || trend) && (
          <Box
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "8px",
              alignItems: "center",
            }}
          >
            {trend && (
              <Text
                style={{
                  fontSize: "13px",
                  color: getTrendColor(),
                  fontWeight: "600",
                }}
              >
                {trend.value}
              </Text>
            )}
            {subtitle && (
              <Text
                style={{
                  fontSize: "13px",
                  color: "#6B7280",
                }}
              >
                {subtitle}
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default StatCard;
