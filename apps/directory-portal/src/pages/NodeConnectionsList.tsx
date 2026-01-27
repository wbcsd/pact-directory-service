import React from "react";
import { fetchWithAuth } from "../utils/auth-fetch";
import SearchableDataTable, { PaginationInfo } from "../components/SearchableDataTable";
import { Column } from "../components/DataTable";
import { useParams, useNavigate } from "react-router-dom";
import { GridPageLayout } from "../layouts";
import { Button, Box } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";

export interface NodeConnection {
  id: number;
  fromNodeId: number;
  targetNodeId: number;
  clientId: string;
  clientSecret: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

const NodeConnectionsList: React.FC = () => {
  const { id: nodeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch function for DataTableWithSearch
  const fetchConnections = async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: NodeConnection[]; pagination: PaginationInfo }> => {
    if (!nodeId) {
      throw new Error("Node ID not available");
    }

    // Build query string
    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    });

    if (params.search) {
      queryParams.append("search", params.search);
    }

    const response = await fetchWithAuth(
      `/nodes/${nodeId}/connections?${queryParams.toString()}`
    );
    
    if (!response || !response.ok) {
      throw new Error("Failed to fetch connections");
    }

    const result = await response.json();
    return result;
  };

  const columns: Column<NodeConnection>[] = [
    {
      key: "id",
      header: "Connection ID",
      sortable: true,
      sortValue: (row: NodeConnection) => row.id,
      render: (row: NodeConnection) => `#${row.id}`,
    },
    {
      key: "fromNodeId",
      header: "From Node",
      sortable: true,
      sortValue: (row: NodeConnection) => row.fromNodeId,
      render: (row: NodeConnection) => {
        const isOutgoing = row.fromNodeId === Number(nodeId);
        return (
          <span style={{ fontWeight: isOutgoing ? '600' : 'normal' }}>
            Node #{row.fromNodeId} {isOutgoing && '(This Node)'}
          </span>
        );
      },
    },
    {
      key: "targetNodeId",
      header: "Target Node",
      sortable: true,
      sortValue: (row: NodeConnection) => row.targetNodeId,
      render: (row: NodeConnection) => {
        const isIncoming = row.targetNodeId === Number(nodeId);
        return (
          <span style={{ fontWeight: isIncoming ? '600' : 'normal' }}>
            Node #{row.targetNodeId} {isIncoming && '(This Node)'}
          </span>
        );
      },
    },
    {
      key: "clientId",
      header: "Client ID",
      sortable: false,
      render: (row: NodeConnection) => (
        <code style={{ fontSize: '12px', padding: '2px 6px', background: '#f5f5f5', borderRadius: '4px' }}>
          {row.clientId.substring(0, 16)}...
        </code>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row: NodeConnection) => row.status,
      render: (row: NodeConnection) => {
        const statusColors = {
          accepted: '#16a34a',
          pending: '#ea580c',
          rejected: '#dc2626',
        };
        return (
          <span 
            style={{ 
              textTransform: 'capitalize',
              color: statusColors[row.status],
              fontWeight: '600',
            }}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      key: "expiresAt",
      header: "Expires At",
      sortable: true,
      sortValue: (row: NodeConnection) => {
        if (!row.expiresAt) return 0;
        const date = new Date(row.expiresAt);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      },
      render: (row: NodeConnection) => {
        if (!row.expiresAt) return "—";
        const date = new Date(row.expiresAt);
        if (isNaN(date.getTime())) return "—";
        
        const isExpired = date < new Date();
        return (
          <span style={{ color: isExpired ? '#dc2626' : 'inherit' }}>
            {date.toLocaleDateString()}
            {isExpired && ' (Expired)'}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      sortValue: (row: NodeConnection) => {
        const date = new Date(row.createdAt);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      },
      render: (row: NodeConnection) => {
        const date = new Date(row.createdAt);
        return isNaN(date.getTime())
          ? "—"
          : date.toLocaleDateString();
      },
    },
  ];

  return (
    <GridPageLayout
      title=""
      loading={false}
      loadingMessage="Loading connections..."
    >
      <Box mb="4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h2 style={{ margin: 0, marginBottom: '8px' }}>Viewing all connections for Node #{nodeId}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            onClick={() => navigate(`/nodes/${nodeId}/invitations`)}
          >
            View Pending Invitations
          </Button>
          <Button onClick={() => navigate(`/nodes/${nodeId}/create-connection`)}>
            <PlusIcon style={{ marginRight: '6px' }} />
            Add Connection
          </Button>
        </div>
      </Box>
      
      <SearchableDataTable<NodeConnection>
        title=""
        subtitle=""
        searchPlaceholder="Search connections..."
        fetchData={fetchConnections}
        columns={columns}
        idColumnName="id"
        defaultPageSize={50}
        emptyState={{
          title: "No connections found",
          description: "This node doesn't have any active connections yet. Create a connection to get started.",
        }}
      />
    </GridPageLayout>
  );
};

export default NodeConnectionsList;
