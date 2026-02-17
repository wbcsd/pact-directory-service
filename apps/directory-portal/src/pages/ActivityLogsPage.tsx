import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Table,
  Text,
  Badge,
  Heading,
  Flex,
  Button,
} from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";
import FunctionalPageLayout from "../layouts/FunctionalPageLayout";

interface ActivityLogGrouped {
  path: string;
  count: number;
  lastCreatedAt: string;
  lastLevel: string;
  lastMessage: string;
}

interface ActivityLogsResponse {
  logs: ActivityLogGrouped[];
  total: number;
}

const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogGrouped[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API}/activity-logs?limit=100&offset=0`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch activity logs");
      }

      const data: ActivityLogsResponse = await response.json();
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string): "blue" | "green" | "yellow" | "red" | "gray" => {
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

  const handleRowClick = (path: string) => {
    navigate(`/activity-logs/path?path=${encodeURIComponent(path)}`);
  };

  return (
    <FunctionalPageLayout loading={loading} loadingMessage="Loading activity logs...">
      <Box style={{ padding: "2rem" }}>
        <Flex justify="between" align="center" mb="4">
          <Heading size="6">Activity Logs</Heading>
          <Button onClick={fetchLogs} variant="soft">
            Refresh
          </Button>
        </Flex>

        {error && (
          <Card style={{ marginBottom: "1rem", backgroundColor: "#fee" }}>
            <Text color="red">{error}</Text>
          </Card>
        )}

        <Card>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Path</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Count</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Last Activity</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Level</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Last Message</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {logs.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={5}>
                    <Text color="gray">No activity logs found</Text>
                  </Table.Cell>
                </Table.Row>
              ) : (
                logs.map((log) => (
                  <Table.Row
                    key={log.path}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleRowClick(log.path)}
                  >
                    <Table.Cell>
                      <Text style={{ fontFamily: "monospace", fontSize: "0.9em" }}>
                        {log.path}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color="gray">{log.count}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="2">{formatDate(log.lastCreatedAt)}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={getLevelColor(log.lastLevel)}>
                        {log.lastLevel.toUpperCase()}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
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
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </Card>
      </Box>
    </FunctionalPageLayout>
  );
};

export default ActivityLogsPage;
