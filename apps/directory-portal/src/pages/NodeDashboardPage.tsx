import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Dialog,
  DropdownMenu,
  Heading,
  IconButton,
  Separator,
  Text,
  Box,
  Flex
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CheckIcon,
  Cross2Icon,
  DotsHorizontalIcon,
  ExclamationTriangleIcon,
  InputIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useNavigate, useParams } from "react-router-dom";
import { FormPageLayout } from "../layouts";
import PaginatedDataTable, { PaginationInfo } from "../components/PaginatedDataTable";
import { Column } from "../components/DataTable";
import SlideOverPanel from "../components/SlideOverPanel";
import NodeForm from "../components/NodeForm";
import { NodeConnection } from "../components/NodeConnectionsManager";
import CreateNodeConnectionForm from "../components/CreateNodeConnectionForm";
import RequestPcfForm from "../components/RequestPcfForm";
import ImportFootprintsForm from "../components/ImportFootprintsForm";
import FulfillPcfRequestForm from "../components/FulfillPcfRequestForm";
import NodeLink from "../components/NodeLink";
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

interface Footprint {
  id: string;
  nodeId: number;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ConnectionCredentials {
  connectionId: number;
  clientId: string;
  clientSecret: string;
  requestingNodeName?: string;
  requestingNodeType?: "internal" | "external";
}

interface PcfRequest {
  id: number;
  fromNodeId: number | null;
  fromNodeName?: string;
  targetNodeId: number;
  targetNodeName?: string;
  connectionId: number | null;
  requestEventId: string;
  source: string | null;
  filters: Record<string, unknown>;
  status: "pending" | "fulfilled" | "rejected";
  resultCount: number | null;
  fulfilledFootprintIds: unknown[] | null;
  direction: "outgoing" | "incoming";
  fulfillable?: boolean;
  createdAt: string;
  updatedAt: string;
}

type PanelState =
  | { mode: "closed" }
  | { mode: "edit" }
  | { mode: "connections" }
  | { mode: "createConnection" }
  | { mode: "requestPcf" }
  | { mode: "importPcf" }
  | { mode: "fulfillPcfRequest"; request: PcfRequest };

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

const NodeDashboardPage: React.FC = () => {
  const { id: nodeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [nodeLoading, setNodeLoading] = useState(true);
  const [nodeError, setNodeError] = useState("");

  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [connectionsRefreshTrigger, setConnectionsRefreshTrigger] = useState(0);
  const [acceptedCredentials, setAcceptedCredentials] = useState<ConnectionCredentials | null>(null);
  const [pcfRequestsRefreshTrigger, setPcfRequestsRefreshTrigger] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const copyToClipboard = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op if clipboard API is unavailable
    }
  }, []);

  const truncateCredential = useCallback((value: string) => {
    if (value.length <= 30) return value;
    return `${value.slice(0, 30)}...`;
  }, []);

  const closePanel = useCallback(() => setPanel({ mode: "closed" }), []);
  const handleSaved = useCallback(() => {
    closePanel();
    setRefreshTrigger((prev) => prev + 1);
  }, [closePanel]);

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

  const handlePanelClose = useCallback(() => {
    closePanel();
    setConnectionsRefreshTrigger(prev => prev + 1);
  }, [closePanel]);

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

  const fetchFootprints = useCallback(async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: Footprint[]; pagination: PaginationInfo }> => {
    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    });
    const response = await fetchWithAuth(`/nodes/${nodeId}/footprints?${queryParams}`);
    if (!response?.ok) throw new Error("Failed to fetch PCF records");
    return response.json();
  }, [nodeId]);

  const fetchConnections = useCallback(async (params: {
    page: number;
    pageSize: number;
  }): Promise<{ data: NodeConnection[]; pagination: PaginationInfo }> => {
    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    });
    const response = await fetchWithAuth(`/nodes/${nodeId}/connections?${queryParams}`);
    if (!response?.ok) throw new Error("Failed to fetch connections");
    return response.json();
  }, [nodeId]);

  const handleRemoveConnection = useCallback(async (connectionId: number) => {
    if (!confirm("Are you sure you want to remove this connection? This action cannot be undone.")) return;
    try {
      const response = await fetchWithAuth(`/node-invitations/${connectionId}`, { method: "DELETE" });
      if (response?.ok) {
        setConnectionsRefreshTrigger(prev => prev + 1);
      }
    } catch {
      // silently ignore — table will retain current state
    }
  }, []);

  const handleAcceptInvitation = useCallback(async (invitationId: number) => {
    try {
      const response = await fetchWithAuth(`/node-invitations/${invitationId}/accept`, { method: "POST" });
      if (response?.ok) {
        const credentials: ConnectionCredentials = await response.json();
        setAcceptedCredentials(credentials);
        setConnectionsRefreshTrigger(prev => prev + 1);
      }
    } catch {
      // silently ignore
    }
  }, []);

  const handleRejectInvitation = useCallback(async (invitationId: number) => {
    if (!confirm("Are you sure you want to reject this invitation?")) return;
    try {
      const response = await fetchWithAuth(`/node-invitations/${invitationId}/reject`, { method: "POST" });
      if (response?.ok) {
        setConnectionsRefreshTrigger(prev => prev + 1);
      }
    } catch {
      // silently ignore
    }
  }, []);
  const handleRejectPcfRequest = useCallback(async (request: PcfRequest) => {
    if (!confirm(`Reject PCF request from ${request.fromNodeName ?? `Node #${request.fromNodeId}`}? A rejection event will be sent.`)) return;
    setRejectingId(request.id);
    try {
      await fetchWithAuth(`/nodes/${nodeId}/pcf-requests/${request.id}/reject`, { method: "POST" });
      setPcfRequestsRefreshTrigger((prev) => prev + 1);
    } catch {
      // silently ignore
    } finally {
      setRejectingId(null);
    }
  }, [nodeId]);

  const fetchPcfRequests = useCallback(async (params: {
    page: number;
    pageSize: number;
  }): Promise<{ data: PcfRequest[]; pagination: PaginationInfo }> => {
    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    });
    const response = await fetchWithAuth(`/nodes/${nodeId}/pcf-requests?${queryParams}`);
    if (!response?.ok) throw new Error("Failed to fetch PCF requests");
    return response.json();
  }, [nodeId]);

  const footprintColumns: Column<Footprint>[] = [
    {
      key: "data.productNameCompany",
      header: "Product Name",
      render: (row) => (
        <Text size="2">{(row.data.productNameCompany as string) || "—"}</Text>
      ),
    },
    {
      key: "data.companyName",
      header: "Company",
      render: (row) => (
        <Text size="2">{(row.data.companyName as string) || "—"}</Text>
      ),
    },
    {
      key: "data.status",
      header: "Status",
      render: (row) => {
        const status = (row.data.status as string) || "—";
        return (
          <Badge color={status === "Active" ? "green" : "gray"}>
            {status}
          </Badge>
        );
      },
    },
    {
      key: "data.declaredUnitOfMeasurement",
      header: "Unit",
      render: (row) => (
        <Text size="2">{(row.data.declaredUnitOfMeasurement as string) || "—"}</Text>
      ),
    },
    {
      key: "data.productIds",
      header: "ProductIDs",
      render: (row) => {
        const ids = row.data.productIds as string[] | undefined;
        if (!ids?.length) return <Text size="2" color="gray">—</Text>;
        return (
          <Flex direction="column" gap="1">
            {ids.map((id: string) => (
              <Flex key={id} align="center" gap="2">
                <Text size="2" style={{ fontFamily: "monospace" }}>{id}</Text>
                <Button
                  size="1"
                  variant="soft"
                  onClick={(event) => {
                    event.stopPropagation();
                    copyToClipboard(id);
                  }}
                >
                  Copy
                </Button>
              </Flex>
            ))}
          </Flex>
        );
      },
    },
    {
      key: "data.pcf.geographyCountry",
      header: "Geography",
      render: (row) => {
        const pcf = row.data.pcf as Record<string, unknown> | undefined;
        const value = (pcf?.geographyCountrySubdivision ?? pcf?.geographyCountry ?? pcf?.geographyRegion) as string | undefined;
        return <Text size="2">{value || "—"}</Text>;
      },
    },
    {
      key: "data.pcf.pcfIncludingBiogenicUptake",
      header: "PCF",
      render: (row) => {
        const pcf = row.data.pcf as Record<string, unknown> | undefined;
        const value = (pcf?.pcfIncludingBiogenicUptake ?? pcf?.pCfIncludingBiogenic) as string | undefined;
        return <Text size="2">{value ||  "—"}</Text>;
      },
    },
    {
      key: "data.pcf.fossilGhgEmissions",
      header: "Fossil Emissions",
      render: (row) => {
        const pcf = row.data.pcf as Record<string, unknown> | undefined;
        const value = pcf?.fossilGhgEmissions as string | undefined;
        return <Text size="2">{value || "—"}</Text>;
      },
    },
    {
      key: "data.pcf.primaryDataShare",
      header: "Primary Data Share",
      render: (row) => {
        const pcf = row.data.pcf as Record<string, unknown> | undefined;
        const value = pcf?.primaryDataShare as string | undefined;
        return <Text size="2">{value != null ? `${value}%` : "—"}</Text>;
      },
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => <Text size="2">{new Date(row.createdAt).toLocaleDateString()}</Text>,
    },
  ];

  const connectionColumns: Column<NodeConnection>[] = [
    {
      key: "connectedNode",
      header: "Connected Node",
      sortable: true,
      sortValue: (row: NodeConnection) => {
        const isOutgoing = row.fromNodeId === Number(nodeId);
        return isOutgoing
          ? (row.targetNodeName ?? row.targetNodeId)
          : (row.fromNodeName ?? row.fromNodeId);
      },
      render: (row: NodeConnection) => {
        const isOutgoing = row.fromNodeId === Number(nodeId);
        const otherNodeId = isOutgoing ? row.targetNodeId : row.fromNodeId;
        const otherName = isOutgoing
          ? (row.targetNodeName ?? `Node #${row.targetNodeId}`)
          : (row.fromNodeName ?? `Node #${row.fromNodeId}`);
        return (
          <Flex align="center" gap="2">
            <NodeLink id={otherNodeId} name={otherName} />
            <Badge size="1" color="gray" variant="soft">
              {isOutgoing ? "Outgoing" : "Incoming"}
            </Badge>
          </Flex>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row: NodeConnection) => row.status,
      render: (row: NodeConnection) => {
        const statusColors: Record<string, "green" | "yellow" | "red"> = {
          accepted: "green",
          pending: "yellow",
          rejected: "red",
        };
        return (
          <Badge color={statusColors[row.status] ?? "gray"} style={{ textTransform: "capitalize" }}>
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      extendedStyle: { textAlign: "right" },
      render: (row: NodeConnection) => {
        const isIncomingPending = row.status === "pending" && row.targetNodeId === Number(nodeId);
        const isOutgoingPending = row.status === "pending" && row.fromNodeId === Number(nodeId);
        if (isIncomingPending) {
          return (
            <Flex gap="2" justify="end">
              <Button size="1" variant="soft" color="green" onClick={() => handleAcceptInvitation(row.id)}>
                <CheckIcon />
                Accept
              </Button>
              <Button size="1" variant="soft" color="red" onClick={() => handleRejectInvitation(row.id)}>
                <Cross2Icon />
                Reject
              </Button>
            </Flex>
          );
        }
        if (isOutgoingPending) {
          return (
            <Flex gap="2" justify="end">
              <Button size="1" variant="soft" color="red" onClick={() => handleRemoveConnection(row.id)}>
                <TrashIcon />
                Cancel
              </Button>
            </Flex>
          );
        }
        return (
          <Flex gap="2" justify="end">
            <Button size="1" variant="soft" color="red" onClick={() => handleRemoveConnection(row.id)}>
              <TrashIcon />
              Remove
            </Button>
          </Flex>
        );
      },
    },
  ];

  const getPcfRequestStatusColor = (
    status: string
  ): "green" | "orange" | "red" | "gray" => {
    switch (status) {
      case "fulfilled": return "green";
      case "pending": return "orange";
      case "rejected": return "red";
      default: return "gray";
    }
  };

  const pcfRequestColumns: Column<PcfRequest>[] = [
    {
      key: "direction",
      header: "Direction",
      render: (row) => (
        <Badge color={row.direction === "incoming" ? "jade" : "gray"} variant="soft" style={{ textTransform: "capitalize" }}>
          {row.direction === "incoming" ? "Received" : "Sent"}
        </Badge>
      ),
    },
    {
      key: "node",
      header: "Node",
      render: (row) => {
        if (row.direction === "incoming") {
          if (!row.fromNodeId) return <Text size="2">External</Text>;
          return <NodeLink id={row.fromNodeId} name={row.fromNodeName ?? `Node #${row.fromNodeId}`} />;
        }
        return <NodeLink id={row.targetNodeId} name={row.targetNodeName ?? `Node #${row.targetNodeId}`} />;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge color={getPcfRequestStatusColor(row.status)} style={{ textTransform: "capitalize" }}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "fulfillable",
      header: "Fulfillable",
      render: (row) => {
        if (row.direction !== "incoming" || row.status !== "pending") return <Text size="2" color="gray">—</Text>;
        return (
          <Badge color={row.fulfillable ? "green" : "gray"} variant="soft">
            {row.fulfillable ? "Yes" : "No"}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Date",
      render: (row) => <Text size="2">{new Date(row.createdAt).toLocaleString()}</Text>,
    },
    {
      key: "actions",
      header: "",
      extendedStyle: { textAlign: "right", whiteSpace: "nowrap" },
      render: (row) => {
        if (row.direction !== "incoming" || row.status !== "pending") return null;
        return (
          <Flex gap="2" justify="end">
            <Button
              size="1"
              variant="soft"
              color="green"
              onClick={(e) => { e.stopPropagation(); setPanel({ mode: "fulfillPcfRequest", request: row }); }}
            >
              <CheckIcon /> Fulfill
            </Button>
            <Button
              size="1"
              variant="soft"
              onClick={(e) => { e.stopPropagation(); navigate(`/nodes/${nodeId}/footprints/new`); }}
            >
              <PlusIcon /> Create &amp; Fulfill
            </Button>
            <Button
              size="1"
              variant="soft"
              color="red"
              disabled={rejectingId === row.id}
              onClick={(e) => { e.stopPropagation(); handleRejectPcfRequest(row); }}
            >
              <Cross2Icon /> Reject
            </Button>
          </Flex>
        );
      },
    },
  ];

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
      render: (log) => <Text size="2">{new Date(log.createdAt).toLocaleString()}</Text>,
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
    panel.mode === "createConnection" ? "Create Connection" :
    panel.mode === "requestPcf" ? "Request Footprint" :
    panel.mode === "importPcf" ? "Import Footprints" :
    panel.mode === "fulfillPcfRequest" ? "Fulfill Footprint Request" :
    "";

  const panelSubtitle = nodeData?.name;

  return (
    <FormPageLayout 
      title={nodeData?.name ? `Node : ${nodeData.name}` : "Node"}
      subtitle={nodeData?.organizationName}
      loading={nodeLoading}
      loadingMessage="loading node..."
      actions={
        <>
          <Button onClick={() => navigate("/nodes")}>
            <ArrowLeftIcon /> Back
          </Button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton variant="soft" size="2">
                <DotsHorizontalIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item onSelect={() => setPanel({ mode: "edit" })}>
                <InputIcon /> Edit Node
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => setPanel({ mode: "createConnection" })}>
                <PlusIcon /> Create Connection
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => setPanel({ mode: "requestPcf" })}>
                <PlusIcon /> Request Footprint
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => setPanel({ mode: "importPcf" })}>
                <UploadIcon /> Import Footprints
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item color="red" disabled={deleting} onSelect={handleDelete}>
                <TrashIcon /> Delete Node
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
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

          {/* Connections Section */}
          <section className="node-dashboard-section">
            <Flex mb="3" gap="2">
              <Box flexGrow="1">
                <Heading size="4">Connections</Heading>
              </Box>
              <Button onClick={() => setPanel({ mode: "createConnection" })}>
                <PlusIcon /> Create Connection
              </Button>
            </Flex>
            <PaginatedDataTable<NodeConnection>
              isSearchable={false}
              fetchData={fetchConnections}
              columns={connectionColumns}
              idColumnName="id"
              defaultPageSize={10}
              refreshTrigger={connectionsRefreshTrigger}
              emptyState={{
                title: "No connections found",
                description: "This node doesn't have any active connections yet.",
              }}
            />
          </section>

          <Separator size="4" my="4" />

          {/* Footprints Section */}
          <section className="node-dashboard-section">
            <Flex mb="3" gap="2">
              <Box flexGrow="1">
                <Heading size="4">Footprints</Heading>
              </Box>
              <Button variant="soft" onClick={() => setPanel({ mode: "importPcf" })}>
                <UploadIcon /> Import
              </Button>
              <Button onClick={() => navigate(`/nodes/${nodeId}/footprints/new`)}>
                <PlusIcon /> Add Footprint
              </Button>
            </Flex>
            <PaginatedDataTable<Footprint>
              isSearchable={false}
              fetchData={fetchFootprints}
              columns={footprintColumns}
              idColumnName="id"
              defaultPageSize={10}
              refreshTrigger={refreshTrigger}
              emptyState={{
                title: "No PCF records found",
                description: "Product Carbon Footprint records for this node will appear here.",
              }}
              onRowClick={(footprint) => navigate(`/nodes/${nodeId}/footprints/${footprint.id}`)}
            />
          </section>

          <Separator size="4" my="4" />

          {/* Footprint Requests Section */}
          <section className="node-dashboard-section">
            <Flex mb="3" gap="2">
              <Box flexGrow="1">
                <Heading size="4">Footprint Requests</Heading>
              </Box>
              <Button onClick={() => setPanel({ mode: "requestPcf" })}>
                <PlusIcon /> Request Footprint
              </Button>
            </Flex>
            <PaginatedDataTable<PcfRequest>
              isSearchable={false}
              fetchData={fetchPcfRequests}
              columns={pcfRequestColumns}
              idColumnName="id"
              defaultPageSize={5}
              refreshTrigger={pcfRequestsRefreshTrigger}
              emptyState={{
                title: "No PCF requests",
                description: "Sent and received PCF requests will appear here.",
              }}
            />
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

      {/* Credentials dialog after accepting invitation */}
      <Dialog.Root open={acceptedCredentials !== null} onOpenChange={(open) => { if (!open) setAcceptedCredentials(null); }}>
        <Dialog.Content maxWidth="480px">
          <Dialog.Title>Connection Accepted</Dialog.Title>
          <Dialog.Description size="2" color="gray" mb="4">
            Save these credentials securely. They are used by the requesting node to authenticate against this node.
          </Dialog.Description>
          {acceptedCredentials && (
            <>
              <Box mb="4" p="3" style={{ background: 'var(--gray-a3)', borderRadius: 'var(--radius-2)', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8' }}>
                <div><strong>Connection ID:</strong> {acceptedCredentials.connectionId}</div>
                <Flex align="center" gap="2">
                  <strong>Client ID:</strong> {truncateCredential(acceptedCredentials.clientId)}
                  <Button size="1" variant="soft" onClick={() => copyToClipboard(acceptedCredentials.clientId)}>
                    Copy
                  </Button>
                </Flex>
                <Flex align="center" gap="2">
                  <strong>Client Secret:</strong> {truncateCredential(acceptedCredentials.clientSecret)}
                  <Button size="1" variant="soft" onClick={() => copyToClipboard(acceptedCredentials.clientSecret)}>
                    Copy
                  </Button>
                </Flex>
              </Box>
              <Callout.Root color="yellow" mb="4">
                <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
                <Callout.Text>The client secret will only be shown once. Make sure to copy and store it securely before closing this dialog.</Callout.Text>
              </Callout.Root>
              <Callout.Root color="blue" mb="4">
                <Callout.Icon><CheckIcon /></Callout.Icon>
                <Callout.Text>
                  Register this client ID and client secret in the <strong>{acceptedCredentials.requestingNodeName ?? "requesting"}</strong> node configuration.
                  {acceptedCredentials.requestingNodeType === "external" && " If that node is managed in external software, open that software and add these credentials there."}
                </Callout.Text>
              </Callout.Root>
            </>
          )}
          <Flex justify="end">
            <Dialog.Close>
              <Button variant="soft">Close</Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

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
        {panel.mode === "createConnection" && nodeId && (
          <CreateNodeConnectionForm
            key={nodeId}
            fromNodeId={Number(nodeId)}
            onCancel={handlePanelClose}
          />
        )}
        {panel.mode === "requestPcf" && nodeId && (
          <RequestPcfForm
            key={nodeId}
            fromNodeId={Number(nodeId)}
            onCancel={handlePanelClose}
            onSent={() => {
              setPcfRequestsRefreshTrigger(prev => prev + 1);
              handlePanelClose();
            }}
          />
        )}
        {panel.mode === "importPcf" && nodeId && (
          <ImportFootprintsForm
            key={nodeId}
            nodeId={Number(nodeId)}
            onCancel={handlePanelClose}
            onImported={() => setRefreshTrigger((prev) => prev + 1)}
          />
        )}
        {panel.mode === "fulfillPcfRequest" && nodeId && (
          <FulfillPcfRequestForm
            key={panel.request.id}
            nodeId={Number(nodeId)}
            request={panel.request}
            onCancel={handlePanelClose}
            onFulfilled={() => {
              setPcfRequestsRefreshTrigger((prev) => prev + 1);
              handlePanelClose();
            }}
          />
        )}
      </SlideOverPanel>
    </FormPageLayout>
  );
};

export default NodeDashboardPage;