import React from "react";

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let displayText = "";
  let className = "";

  switch (status) {
    case "PASS":
    case "COMPLETED":
      displayText = "Passed";
      className = "passed";
      break;
    case "FAIL":
    case "FAILED":
      displayText = "Failed";
      className = "failed";
      break;
    case "PENDING":
    case "IN_PROGRESS":
      displayText = "Pending";
      className = "pending";
      break;
    default:
      displayText = status;
      className = "default";
  }

  return <span className={`status ${className}`}>{displayText}</span>;
};

export default StatusBadge;
