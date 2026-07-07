import React from "react";
import { Badge } from "@radix-ui/themes";

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let displayText = "";
  let color: "green" | "red" | "yellow" | "gray" = "gray";

  switch (status) {
    case "PASS":
    case "COMPLETED":
    case "enabled":
      displayText = status === "enabled" ? "Enabled" : "Passed";
      color = "green";
      break;
    case "FAIL":
    case "FAILED":
      displayText = "Failed";
      color = "red";
      break;
    case "PENDING":
    case "IN_PROGRESS":
      displayText = "Pending";
      color = "yellow";
      break;
    case "disabled":
      displayText = "Disabled";
      color = "red";
      break;
    case "unverified":
      displayText = "Unverified";
      color = "yellow";
      break;
    case "deleted":
      displayText = "Deleted";
      color = "gray";
      break;
    default:
      displayText = status;
      color = "gray";
  }

  return (
    <Badge color={color} variant="soft" radius="full">
      {displayText}
    </Badge>
  );
};

export default StatusBadge;
