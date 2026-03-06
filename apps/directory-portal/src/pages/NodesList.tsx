import React, { useState, useCallback } from "react";
import { fetchWithAuth } from "../utils/auth-fetch";
import PaginatedDataTable, { PaginationInfo } from "../components/PaginatedDataTable";
import { Column } from "../components/DataTable";
import { useAuth } from "../contexts/AuthContext";
import { InputIcon, Link2Icon, PlusIcon } from "@radix-ui/react-icons";
import { GridPageLayout } from "../layouts";
import ActionButton from "../components/ActionButton";
import SlideOverPanel from "../components/SlideOverPanel";
import NodeForm from "../components/NodeForm";
import NodeConnectionsManager from "../components/NodeConnectionsManager";
import { useNavigate } from "react-router-dom";

export interface Node {
  id: number;
  organizationId: number;
  organizationName: string;
  name: string;
  type: 'internal' | 'external';
  apiUrl?: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
  connectionsCount?: number;
}

type PanelState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; nodeId: number; nodeName: string }
  | { mode: "connections"; nodeId: number; nodeName: string };

const NodesList: React.FC = () => {
  const { profileData } = useAuth();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const closePanel = useCallback(() => setPanel({ mode: "closed" }), []);

  const handleSaved = useCallback(() => {
    // Refresh the table data to reflect changes
    setRefreshTrigger((prev) => prev + 1);
    // Auto-close after a short delay so the user sees the success message
    setTimeout(() => closePanel(), 1200);
  }, [closePanel]);

  // Fetch function for DataTableWithSearch
  const fetchNodes = useCallback(async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: Node[]; pagination: PaginationInfo }> => {
    if (!profileData?.organizationId) {
      throw new Error("Organization not loaded");
    }

    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    });

    if (params.search) {
      queryParams.append("search", params.search);
    }

    const response = await fetchWithAuth(
      `/organizations/${profileData.organizationId}/nodes?${queryParams.toString()}`
    );
    
    if (!response || !response.ok) {
      throw new Error("Failed to fetch nodes");
    }

    const result = await response.json();
    return result;
  }, [profileData]);

  const columns: Column<Node>[] = [
    {
      key: "name",
      header: "Node Name",
      sortable: true,
      sortValue: (row: Node) => row.name,
      render: (row: Node) => row.name,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (row: Node) => row.type,
      render: (row: Node) => (
        <span style={{ textTransform: 'capitalize' }}>{row.type}</span>
      ),
    },
    {
      key: "connectionsCount",
      header: "Connections",
      sortable: true,
      sortValue: (row: Node) => row.connectionsCount ?? 0,
      render: (row: Node) => (
        <span>
          {row.connectionsCount ?? 0}
        </span>
      ),
    },
    {
      key: "apiUrl",
      header: "API URL",
      sortable: false,
      render: (row: Node) => row.apiUrl || "—",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row: Node) => row.status,
      render: (row: Node) => (
        <span style={{ textTransform: 'capitalize' }}>{row.status}</span>
      ),
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      sortable: true,
      sortValue: (row: Node) => {
        const date = new Date(row.updatedAt);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      },
      render: (row: Node) => {
        const date = new Date(row.updatedAt);
        return isNaN(date.getTime())
          ? "—"
          : date.toLocaleDateString() + " " + date.toLocaleTimeString();
      },
    },
    {
      key: "actions",
      header: "",
      extendedStyle: { textAlign: 'right' },
      render: (row: Node) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <ActionButton
            title="View Connections"
            variant="secondary"
            size="small"
            onClick={() =>
              setPanel({ mode: "connections", nodeId: row.id, nodeName: row.name })
            }
          >
            <Link2Icon />
          </ActionButton>
          <ActionButton
            title="Edit Node Details"
            variant="secondary"
            size="small"
            onClick={() =>
              setPanel({ mode: "edit", nodeId: row.id, nodeName: row.name })
            }
          >
            <InputIcon />
          </ActionButton>
        </div>
      ),
    },
  ];

  const panelTitle =
    panel.mode === "add"
      ? "Create Node"
      : panel.mode === "edit"
        ? "Edit Node"
        : panel.mode === "connections"
          ? "Node Connections"
          : "";

  const panelSubtitle =
    panel.mode === "add"
      ? profileData?.organizationName
        ? `For ${profileData.organizationName}`
        : undefined
      : panel.mode === "edit"
        ? panel.nodeName
        : panel.mode === "connections"
          ? panel.nodeName
          : undefined;

  return (
    <GridPageLayout
      title="Nodes"
      subtitle="Manage and view all nodes in your organization"
      actions={
        <ActionButton variant="primary" onClick={() => setPanel({ mode: "add" })}>
          <PlusIcon /> Add Node
        </ActionButton>
      }
      loading={!profileData}
      loadingMessage="Loading nodes..."
    >
      {profileData && (
        <PaginatedDataTable<Node>
          isSearchable={true}
          searchPlaceholder="Search by node name..."
          fetchData={fetchNodes}
          columns={columns}
          idColumnName="id"
          defaultPageSize={50}
          refreshTrigger={refreshTrigger}
          emptyState={{
            title: "No nodes found",
            description: "No nodes match your search criteria",
          }}
          onRowClick={(row) => navigate(`/nodes/${row.id}`)}
        />
      )}

      {/* Slide-over panel for Add / Edit / Connections */}
      <SlideOverPanel
        open={panel.mode !== "closed"}
        onClose={closePanel}
        title={panelTitle}
        subtitle={panelSubtitle}
      >
        {panel.mode === "add" && (
          <NodeForm onCancel={closePanel} onSaved={handleSaved} />
        )}
        {panel.mode === "edit" && (
          <NodeForm
            key={panel.nodeId}
            nodeId={panel.nodeId}
            onCancel={closePanel}
            onSaved={handleSaved}
          />
        )}
        {panel.mode === "connections" && (
          <NodeConnectionsManager
            key={panel.nodeId}
            nodeId={panel.nodeId}
            onClose={closePanel}
          />
        )}
      </SlideOverPanel>
    </GridPageLayout>
  );
};

export default NodesList;
