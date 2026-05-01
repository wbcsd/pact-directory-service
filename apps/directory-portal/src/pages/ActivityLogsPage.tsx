import React from "react";
import { Badge, Text } from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";
import PaginatedDataTable, {
  PaginationInfo,
} from "../components/PaginatedDataTable";
import { Column } from "../components/DataTable";
import { fetchWithAuth } from "../utils/auth-fetch";
import { GridPageLayout } from "../layouts";

interface ActivityLogGrouped {
  path: string;
  count: number;
  lastCreatedAt: string;
  lastLevel: string;
  lastMessage: string;
}

interface ActivityLogsResponse {
  data: ActivityLogGrouped[];
  pagination: PaginationInfo;
}

const ActivityLogsPage: React.FC = () => {
  const navigate = useNavigate();

  const fetchLogs = async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: ActivityLogGrouped[]; pagination: PaginationInfo }> => {
    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
      ...(params.search && { search: params.search }),
    });

    const response = await fetchWithAuth(`/activity-logs?${queryParams}`);

    if (!response!.ok) {
      throw new Error("Failed to fetch activity logs");
    }

    const result: ActivityLogsResponse = await response!.json();
    return result;
  };

  const getLevelColor = (
    level: string
  ): "blue" | "green" | "yellow" | "red" | "gray" => {
    switch (level.toLowerCase()) {
      case "info":
        return "blue";
      case "debug":
        return "gray";
      case "warn":
        return "yellow";
      case "error":
        return "red";
      case "fatal":
        return "red";
      default:
        return "blue";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleRowClick = (log: ActivityLogGrouped) => {
    navigate(`/activity-logs/path?path=${encodeURIComponent(log.path)}`);
  };

  const columns: Column<ActivityLogGrouped>[] = [
    {
      key: "path",
      header: "Path",
      render: (log: ActivityLogGrouped) => (
        <Text style={{ fontFamily: "monospace", fontSize: "0.9em" }}>
          {log.path}
        </Text>
      ),
    },
    {
      key: "count",
      header: "Count",
      render: (log: ActivityLogGrouped) => <Badge color="gray">{log.count}</Badge>,
    },
    {
      key: "lastCreatedAt",
      header: "Last Activity",
      render: (log: ActivityLogGrouped) => (
        <Text size="2">{formatDate(log.lastCreatedAt)}</Text>
      ),
    },
    {
      key: "lastLevel",
      header: "Level",
      render: (log: ActivityLogGrouped) => (
        <Badge color={getLevelColor(log.lastLevel)}>
          {log.lastLevel.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "lastMessage",
      header: "Last Message",
      render: (log: ActivityLogGrouped) => (
        <Text
          size="2"
          style={{
            maxWidth: "400px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          {log.lastMessage}
        </Text>
      ),
    },
  ];

  return (
    <GridPageLayout
      title="Activity Logs"
      subtitle="Monitor and view all activity in your organization"
      >
        <PaginatedDataTable<ActivityLogGrouped>
          isSearchable={true}
          searchPlaceholder="Search log paths..."
          fetchData={fetchLogs}
          columns={columns}
          idColumnName="path"
          defaultPageSize={50}
          emptyState={{
            title: "No activity logs found",
            description: "Activity logs will appear here as your system operates.",
          }}
          onRowClick={handleRowClick}
        />
    </GridPageLayout>
  );
};

export default ActivityLogsPage;
