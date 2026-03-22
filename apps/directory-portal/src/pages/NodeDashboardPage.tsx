import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Heading,
  Separator,
  Text,
  Box,
  Flex
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  InputIcon,
  Link2Icon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useNavigate, useParams } from "react-router-dom";
import { FormPageLayout } from "../layouts";
import PaginatedDataTable, { PaginationInfo } from "../components/PaginatedDataTable";
import { Column } from "../components/DataTable";
import SlideOverPanel from "../components/SlideOverPanel";
import NodeForm from "../components/NodeForm";
import NodeConnectionsManager from "../components/NodeConnectionsManager";
import CreateNodeConnectionForm from "../components/CreateNodeConnectionForm";
import "./NodeDashboardPage.css";

interface NodeData {
  id: number;
  name: string;
  type: "internal" | "external";
  status: "active" | "inactive" | "pending";
  apiUrl?: string;
  organizationId: number;
  organizationName?: string;
  createdAt: string;
  updatedAt: string;
  connectionsCount?: number;
}

interface ActivityLog {
  id: number;
  path: string;
  level: string;
  message: string;
  createdAt: string;
}

type PanelState =
  | { mode: "closed" }
  | { mode: "edit" }
  | { mode: "connections" }
  | { mode: "createConnection" };

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

const getStatusColor = (
  status: string
): "green" | "gray" | "yellow" => {
  switch (status) {
    case "active":
      return "green";
    case "inactive":
      return "gray";
    case "pending":
      return "yellow";
    default:
      return "gray";
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

const NodeDashboardPage: React.FC = () => {
  const { id: nodeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [nodeLoading, setNodeLoading] = useState(true);
  const [nodeError, setNodeError] = useState("");

  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const closePanel = useCallback(() => setPanel({ mode: "closed" }), []);
  const handleSaved = useCallback(() => {
    closePanel();
    setRefreshTrigger((prev) => prev + 1);
  }, [closePanel]);

  const fetchPendingCount = useCallback(async () => {
    if (!nodeId) return;
    try {
      const res = await fetchWithAuth(`/nodes/${nodeId}/invitations?pageSize=1`);
      if (!res?.ok) return;
      const result = await res.json();
      setPendingInvitationsCount(result.pagination?.total ?? 0);
    } catch {
      // silently ignore — badge is non-critical
    }
  }, [nodeId]);

  useEffect(() => {
    const fetchNodeData = async () => {      try {
        setNodeError("");
        setNodeLoading(true);
        const res = await fetchWithAuth(`/nodes/${nodeId}`);
        if (!res || !res.ok) throw new Error("Failed to fetch node");
        const data: NodeData = await res.json();
        setNodeData(data);
      } catch (error) {
        setNodeError("Failed to load node data.");
        console.error("Error fetching node data:", error);
      } finally {
        setNodeLoading(false);
      }
    };
    fetchNodeData();
  }, [nodeId, refreshTrigger]);

  // Fetch pending invitations count on load and whenever the panel closes
  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount, refreshTrigger]);

  const handlePanelClose = useCallback(() => {
    closePanel();
    fetchPendingCount();
  }, [closePanel, fetchPendingCount]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${nodeData?.name}"? This action cannot be undone.`)) return;
    try {
      setDeleting(true);
      const response = await fetchWithAuth(`/nodes/${nodeId}`, { method: "DELETE" });
      if (response?.ok) {
        navigate("/nodes");
      } else {
        const err = await response?.json();
        setDeleteError(err?.message ?? "Failed to delete node");
      }
    } catch {
      setDeleteError("An error occurred while deleting the node");
    } finally {
      setDeleting(false);
    }
  };

  const fetchLogs = useCallback(async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: ActivityLog[]; pagination: PaginationInfo }> => {
    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
      ...(params.search && { search: params.search }),
    });
    const response = await fetchWithAuth(`/activity-logs/nodes/${nodeId}?${queryParams}`);
    if (!response?.ok) throw new Error("Failed to fetch activity logs");
    const result: { logs: ActivityLog[]; total: number } = await response.json();
    return {
      data: result.logs,
      pagination: {
        total: result.total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil(result.total / params.pageSize),
        hasNext: params.page < Math.ceil(result.total / params.pageSize),
        hasPrevious: params.page > 1,
      },
    };
  }, [nodeId]);

  const logColumns: Column<ActivityLog>[] = [
    {
      key: "path",
      header: "Path",
      render: (log) => (
        <Text style={{ fontFamily: "monospace", fontSize: "0.9em" }}>{log.path}</Text>
      ),
    },
    {
      key: "level",
      header: "Level",
      render: (log) => (
        <Badge color={getLevelColor(log.level)}>{log.level.toUpperCase()}</Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Time",
      render: (log) => <Text size="2">{formatDate(log.createdAt)}</Text>,
    },
    {
      key: "message",
      header: "Message",
      render: (log) => (
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
          {log.message}
        </Text>
      ),
    },
  ];

  const panelTitle =
    panel.mode === "edit" ? "Edit Node" :
    panel.mode === "connections" ? "Connections & Invitations" :
    panel.mode === "createConnection" ? "Create Connection" :
    "";

  const panelSubtitle = nodeData?.name;

  return (
    <FormPageLayout 
      title={`Node ${nodeData?.name ?? ""}`}
      subtitle={nodeData?.organizationName}
      loading={nodeLoading}
      loadingMessage="loading node..."
      actions={
        <>
          <Button onClick={() => navigate("/nodes")}>
            <ArrowLeftIcon /> Back
          </Button>

          <Button onClick={() => setPanel({ mode: "edit" })}>
            <InputIcon /> Edit Node
          </Button>

          <Button onClick={() => setPanel({ mode: "connections" })}>
            <Link2Icon /> Manage Connections
            {pendingInvitationsCount > 0 && (
              <span className="node-pending-badge">{pendingInvitationsCount}</span>
            )}
          </Button>

          <Button onClick={() => setPanel({ mode: "createConnection" })}>
            <PlusIcon /> Create Connection
          </Button>

          <Button color="red" disabled={deleting} onClick={handleDelete}>
            <TrashIcon />
            Delete Node
          </Button>
        </>
      }>

          {nodeError && (
            <Callout.Root color="red" mb="4">
              <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
              <Callout.Text>{nodeError}</Callout.Text>
            </Callout.Root>
          )}

          {deleteError && (
            <Callout.Root color="red" mb="2">
              <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
              <Callout.Text>{deleteError}</Callout.Text>
            </Callout.Root>
          )}

          {nodeData && (
            <div className="node-meta-row">
              <Badge color={getStatusColor(nodeData.status)} size="2" style={{ textTransform: "capitalize" }}>
                {nodeData.status}
              </Badge>
              <Badge color="gray" size="2" style={{ textTransform: "capitalize" }}>
                {nodeData.type}
              </Badge>
              {nodeData.connectionsCount !== undefined && (
                <Text size="2" color="gray">
                  {nodeData.connectionsCount} connection{nodeData.connectionsCount !== 1 ? "s" : ""}
                </Text>
              )}
              {nodeData.apiUrl && (
                <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>
                  {nodeData.apiUrl}
                </Text>
              )}
            </div>
          )}

          <Separator size="4" my="4" />

          {/* PCF Exchange Section */}
          <section className="node-dashboard-section">
            <Flex mb="3" gap="2">
              <Box flexGrow="1">
                <Heading size="4">PCF Exchange</Heading>
              </Box>
              <Button onClick={() => navigate(`/nodes/${nodeId}/footprints/new`)}>
                <PlusIcon /> Add PCF
              </Button>
            </Flex>
            <div className="node-dashboard-placeholder">
              <Text color="gray" size="2">
                PCF data exchange activity between this node and its connected peers will appear here.
              </Text>
            </div>
          </section>

          <Separator size="4" my="4" />

          {/* Activity Logs Section */}
          <section className="node-dashboard-section">
            <Heading size="4" mb="3">Activity Logs</Heading>
            <PaginatedDataTable<ActivityLog>
              isSearchable={true}
              searchPlaceholder="Search log paths..."
              fetchData={fetchLogs}
              columns={logColumns}
              idColumnName="id"
              defaultPageSize={10}
              emptyState={{
                title: "No activity logs found",
                description: "Activity logs will appear here as this node operates.",
              }}
              onRowClick={(log) =>
                navigate(`/activity-logs/path?path=${encodeURIComponent(log.path)}`)
              }
            />
          </section>

      {/* Slide-over panels */}
      <SlideOverPanel
        open={panel.mode !== "closed"}
        onClose={handlePanelClose}
        title={panelTitle}
        subtitle={panelSubtitle}
      >
        {panel.mode === "edit" && nodeId && (
          <NodeForm
            key={nodeId}
            nodeId={Number(nodeId)}
            onCancel={closePanel}
            onSaved={handleSaved}
          />
        )}
        {panel.mode === "connections" && nodeId && (
          <NodeConnectionsManager
            key={nodeId}
            nodeId={nodeId}
            onClose={closePanel}
          />
        )}
        {panel.mode === "createConnection" && nodeId && (
          <CreateNodeConnectionForm
            key={nodeId}
            fromNodeId={Number(nodeId)}
            onCancel={handlePanelClose}
          />
        )}
      </SlideOverPanel>
    </FormPageLayout>
  );
};

export default NodeDashboardPage;