import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Text,
  Heading,
  Flex,
  Button,
  ScrollArea,
  Code,
  Badge,
} from "@radix-ui/themes";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import FunctionalPageLayout from "../layouts/FunctionalPageLayout";
import { LazyLog } from "@melloware/react-logviewer";
import { fetchWithAuth } from "../utils/auth-fetch";

interface ActivityLog {
  id: number;
  path: string;
  level: string;
  message: string;
  content: Record<string, unknown> | null;
  nodeId: number | null;
  organizationId: number | null;
  userId: number | null;
  createdAt: string;
}

interface ActivityLogsResponse {
  logs: ActivityLog[];
  total: number;
}

const ActivityLogDetailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const path = searchParams.get("path");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "raw">("table");
  const navigate = useNavigate();

  useEffect(() => {
    const loadLogs = async () => {
      if (!path) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithAuth(
          `/activity-logs/path?path=${encodeURIComponent(path)}&limit=500&offset=0`
        );

        if (!response!.ok) {
          throw new Error("Failed to fetch activity logs");
        }

        const data: ActivityLogsResponse = await response!.json();
        setLogs(data.logs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [path]);

  const fetchLogs = async () => {
    if (!path) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(
        `/activity-logs/path?path=${encodeURIComponent(path)}&limit=500&offset=0`
      );

      if (!response!.ok) {
        throw new Error("Failed to fetch activity logs");
      }

      const data: ActivityLogsResponse = await response!.json();
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

  const formatLogAsText = () => {
    return logs
      .map((log) => {
        const timestamp = new Date(log.createdAt).toISOString();
        const level = log.level.toUpperCase().padEnd(5);
        const content = log.content ? JSON.stringify(log.content) : "";
        return `${timestamp} ${level} ${log.message} ${content}`;
      })
      .join("\n");
  };

  if (!path) {
    return (
      <FunctionalPageLayout>
        <Box style={{ padding: "2rem" }}>
          <Text color="red">No path specified</Text>
        </Box>
      </FunctionalPageLayout>
    );
  }

  return (
    <FunctionalPageLayout loading={loading} loadingMessage="Loading activity logs...">
      <Box style={{ padding: "2rem" }}>
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center">
            <Flex align="center" gap="3">
              <Button
                variant="soft"
                onClick={() => navigate("/activity-logs")}
              >
                <ArrowLeftIcon /> Back
              </Button>
              <Heading size="6">Activity Logs</Heading>
            </Flex>
            <Flex gap="2">
              <Button
                variant={viewMode === "table" ? "solid" : "soft"}
                onClick={() => setViewMode("table")}
              >
                Table View
              </Button>
              <Button
                variant={viewMode === "raw" ? "solid" : "soft"}
                onClick={() => setViewMode("raw")}
              >
                Raw Logs
              </Button>
              <Button onClick={fetchLogs} variant="soft">
                Refresh
              </Button>
            </Flex>
          </Flex>

          <Card>
            <Flex direction="column" gap="2">
              <Text weight="bold">Path:</Text>
              <Code style={{ fontSize: "0.9em" }}>{path}</Code>
              <Text size="2" color="gray">
                Total logs: {logs.length}
              </Text>
            </Flex>
          </Card>

          {error && (
            <Card style={{ backgroundColor: "#fee" }}>
              <Text color="red">{error}</Text>
            </Card>
          )}

          {viewMode === "table" ? (
            <Card>
              <ScrollArea style={{ height: "600px" }}>
                <Box style={{ padding: "1rem" }}>
                  {logs.length === 0 ? (
                    <Text color="gray">No logs found</Text>
                  ) : (
                    <Flex direction="column" gap="3">
                      {logs.map((log) => (
                        <Card key={log.id} style={{ padding: "1rem" }}>
                          <Flex direction="column" gap="2">
                            <Flex justify="between" align="center">
                              <Badge color={getLevelColor(log.level)}>
                                {log.level.toUpperCase()}
                              </Badge>
                              <Text size="1" color="gray">
                                {formatDate(log.createdAt)}
                              </Text>
                            </Flex>
                            <Text>{log.message}</Text>
                            {log.content && (
                              <Box
                                style={{
                                  backgroundColor: "#f5f5f5",
                                  padding: "0.5rem",
                                  borderRadius: "4px",
                                  fontFamily: "monospace",
                                  fontSize: "0.85em",
                                  overflow: "auto",
                                }}
                              >
                                <pre style={{ margin: 0 }}>
                                  {JSON.stringify(log.content, null, 2)}
                                </pre>
                              </Box>
                            )}
                            {(log.nodeId || log.organizationId || log.userId) && (
                              <Flex gap="2" wrap="wrap">
                                {log.nodeId && (
                                  <Badge color="blue" variant="soft">
                                    Node: {log.nodeId}
                                  </Badge>
                                )}
                                {log.organizationId && (
                                  <Badge color="green" variant="soft">
                                    Org: {log.organizationId}
                                  </Badge>
                                )}
                                {log.userId && (
                                  <Badge color="purple" variant="soft">
                                    User: {log.userId}
                                  </Badge>
                                )}
                              </Flex>
                            )}
                          </Flex>
                        </Card>
                      ))}
                    </Flex>
                  )}
                </Box>
              </ScrollArea>
            </Card>
          ) : (
            <Card style={{ height: "600px" }}>
              <LazyLog
                text={formatLogAsText()}
                enableSearch
                caseInsensitive
                selectableLines
                style={{ height: "100%" }}
              />
            </Card>
          )}
        </Flex>
      </Box>
    </FunctionalPageLayout>
  );
};

export default ActivityLogDetailPage;
