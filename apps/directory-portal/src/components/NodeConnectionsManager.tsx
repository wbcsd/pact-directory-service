import React, { useState } from "react";
import { fetchWithAuth } from "../utils/auth-fetch";
import PaginatedDataTable, { PaginationInfo } from "./PaginatedDataTable";
import { Column } from "./DataTable";
import { Box, Button, Callout, Text, Separator } from "@radix-ui/themes";
import { CheckIcon, Cross2Icon, ExclamationTriangleIcon, TrashIcon } from "@radix-ui/react-icons";
import "./NodeForm.css";

export interface NodeConnection {
  id: number;
  fromNodeId: number;
  fromNodeName?: string;
  targetNodeId: number;
  targetNodeName?: string;
  clientId: string;
  clientSecret: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface NodeInvitation {
  id: number;
  fromNodeId: number;
  fromNodeName?: string;
  targetNodeId: number;
  targetNodeName?: string;
  clientId: string;
  clientSecret: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

interface ConnectionCredentials {
  connectionId: number;
  clientId: string;
  clientSecret: string;
}

interface NodeConnectionsManagerProps {
  nodeId: number | string;
  onClose?: () => void;
}

const NodeConnectionsManager: React.FC<NodeConnectionsManagerProps> = ({ nodeId }) => {
  const [connectionsRefreshKey, setConnectionsRefreshKey] = useState(0);
  const [invitationsRefreshKey, setInvitationsRefreshKey] = useState(0);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showCredentials, setShowCredentials] = useState<ConnectionCredentials | null>(null);

  // Fetch connections
  const fetchConnections = async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: NodeConnection[]; pagination: PaginationInfo }> => {
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

  // Fetch invitations
  const fetchInvitations = async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: NodeInvitation[]; pagination: PaginationInfo }> => {
    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    });

    if (params.search) {
      queryParams.append("search", params.search);
    }

    const response = await fetchWithAuth(
      `/nodes/${nodeId}/invitations?${queryParams.toString()}`
    );
    
    if (!response || !response.ok) {
      throw new Error("Failed to fetch invitations");
    }

    const result = await response.json();
    return result;
  };

  const handleRemoveConnection = async (connectionId: number) => {
    if (!confirm("Are you sure you want to remove this connection? This action cannot be undone.")) {
      return;
    }

    try {
      setActionMessage(null);
      const response = await fetchWithAuth(
        `/node-invitations/${connectionId}`,
        { method: "DELETE" }
      );

      if (!response || !response.ok) {
        const error = await response?.json();
        setActionMessage({ 
          type: 'error', 
          message: error?.message || 'Failed to remove connection' 
        });
        return;
      }

      setActionMessage({ 
        type: 'success', 
        message: 'Connection removed successfully' 
      });
      
      setConnectionsRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error removing connection:", error);
      setActionMessage({ 
        type: 'error', 
        message: 'An error occurred while removing the connection' 
      });
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      setActionMessage(null);
      const response = await fetchWithAuth(
        `/node-invitations/${invitationId}/accept`,
        { method: "POST" }
      );

      if (!response || !response.ok) {
        const error = await response?.json();
        setActionMessage({ 
          type: 'error', 
          message: error?.message || 'Failed to accept invitation' 
        });
        return;
      }

      const credentials: ConnectionCredentials = await response.json();
      setShowCredentials(credentials);
      setActionMessage({ 
        type: 'success', 
        message: 'Invitation accepted successfully! Save the credentials below.' 
      });
      
      setInvitationsRefreshKey(prev => prev + 1);
      setConnectionsRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      setActionMessage({ 
        type: 'error', 
        message: 'An error occurred while accepting the invitation' 
      });
    }
  };

  const handleRejectInvitation = async (invitationId: number) => {
    if (!confirm("Are you sure you want to reject this invitation?")) {
      return;
    }

    try {
      setActionMessage(null);
      const response = await fetchWithAuth(
        `/node-invitations/${invitationId}/reject`,
        { method: "POST" }
      );

      if (!response || !response.ok) {
        const error = await response?.json();
        setActionMessage({ 
          type: 'error', 
          message: error?.message || 'Failed to reject invitation' 
        });
        return;
      }

      setActionMessage({ 
        type: 'success', 
        message: 'Invitation rejected successfully' 
      });
      
      setInvitationsRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      setActionMessage({ 
        type: 'error', 
        message: 'An error occurred while rejecting the invitation' 
      });
    }
  };

  const connectionColumns: Column<NodeConnection>[] = [
    {
      key: "id",
      header: "ID",
      sortable: true,
      sortValue: (row: NodeConnection) => row.id,
      render: (row: NodeConnection) => `#${row.id}`,
    },
    {
      key: "fromNodeId",
      header: "From Node",
      sortable: true,
      sortValue: (row: NodeConnection) => row.fromNodeName ?? row.fromNodeId,
      render: (row: NodeConnection) => {
        const isOutgoing = row.fromNodeId === Number(nodeId);
        const label = row.fromNodeName ?? `Node #${row.fromNodeId}`;
        return (
          <span style={{ fontWeight: isOutgoing ? '600' : 'normal' }}>
            {label} {isOutgoing && '(This Node)'}
          </span>
        );
      },
    },
    {
      key: "targetNodeId",
      header: "Target Node",
      sortable: true,
      sortValue: (row: NodeConnection) => row.targetNodeName ?? row.targetNodeId,
      render: (row: NodeConnection) => {
        const isIncoming = row.targetNodeId === Number(nodeId);
        const label = row.targetNodeName ?? `Node #${row.targetNodeId}`;
        return (
          <span style={{ fontWeight: isIncoming ? '600' : 'normal' }}>
            {label} {isIncoming && '(This Node)'}
          </span>
        );
      },
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
      key: "actions",
      header: "Actions",
      extendedStyle: { textAlign: 'right' },
      render: (row: NodeConnection) => (
        <Button
          size="1"
          variant="soft"
          color="red"
          onClick={() => handleRemoveConnection(row.id)}
        >
          <TrashIcon style={{ marginRight: '4px' }} />
          Remove
        </Button>
      ),
    },
  ];

  const invitationColumns: Column<NodeInvitation>[] = [
    {
      key: "id",
      header: "ID",
      sortable: true,
      sortValue: (row: NodeInvitation) => row.id,
      render: (row: NodeInvitation) => `#${row.id}`,
    },
    {
      key: "fromNodeId",
      header: "From Node",
      sortable: true,
      sortValue: (row: NodeInvitation) => row.fromNodeName ?? row.fromNodeId,
      render: (row: NodeInvitation) => row.fromNodeName ?? `Node #${row.fromNodeId}`,
    },
    {
      key: "targetNodeId",
      header: "Target Node",
      sortable: true,
      sortValue: (row: NodeInvitation) => row.targetNodeName ?? row.targetNodeId,
      render: (row: NodeInvitation) => (
        <span style={{ fontWeight: '600' }}>
          {row.targetNodeName ?? `Node #${row.targetNodeId}`} (This Node)
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Received",
      sortable: true,
      sortValue: (row: NodeInvitation) => {
        const date = new Date(row.createdAt);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      },
      render: (row: NodeInvitation) => {
        const date = new Date(row.createdAt);
        return isNaN(date.getTime())
          ? "—"
          : date.toLocaleDateString();
      },
    },
    {
      key: "actions",
      header: "Actions",
      extendedStyle: { textAlign: 'right' },
      render: (row: NodeInvitation) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button
            size="1"
            variant="soft"
            color="green"
            onClick={() => handleAcceptInvitation(row.id)}
          >
            <CheckIcon style={{ marginRight: '4px' }} />
            Accept
          </Button>
          <Button
            size="1"
            variant="soft"
            color="red"
            onClick={() => handleRejectInvitation(row.id)}
          >
            <Cross2Icon style={{ marginRight: '4px' }} />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Box className="node-form">
      {actionMessage && (
        <Callout.Root 
          color={actionMessage.type === 'success' ? 'green' : 'red'} 
          mb="4"
        >
          <Callout.Icon>
            {actionMessage.type === 'success' ? <CheckIcon /> : <ExclamationTriangleIcon />}
          </Callout.Icon>
          <Callout.Text>{actionMessage.message}</Callout.Text>
        </Callout.Root>
      )}

      {showCredentials && (
        <Callout.Root color="blue" mb="4">
          <Callout.Icon>
            <CheckIcon />
          </Callout.Icon>
          <Callout.Text>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>
              Connection Credentials - Save these securely!
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8' }}>
              <div><strong>Connection ID:</strong> {showCredentials.connectionId}</div>
              <div><strong>Client ID:</strong> {showCredentials.clientId}</div>
              <div><strong>Client Secret:</strong> {showCredentials.clientSecret}</div>
            </div>
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#0A0552' }}>
              ⚠️ The client secret will only be shown once. Make sure to save it securely.
            </div>
            <Button
              size="1"
              variant="soft"
              mt="2"
              onClick={() => setShowCredentials(null)}
              style={{ marginTop: '12px' }}
            >
              Close
            </Button>
          </Callout.Text>
        </Callout.Root>
      )}

      {/* Active Connections Section */}
      <Box mb="6">
        <Text size="4" weight="bold" mb="3" style={{ display: 'block' }}>
          Active Connections
        </Text>
        <PaginatedDataTable<NodeConnection>
          refreshTrigger={connectionsRefreshKey}
          isSearchable={false}
          fetchData={fetchConnections}
          columns={connectionColumns}
          idColumnName="id"
          emptyState={{
            title: "No connections found",
            description: "This node doesn't have any active connections yet.",
          }}
        />
      </Box>

      <Separator size="4" mb="6" />

      <br />

      {/* Pending Invitations Section */}
      <Box>
        <Text size="4" weight="bold" mb="3" style={{ display: 'block' }}>
          Pending Invitations
        </Text>
        <PaginatedDataTable<NodeInvitation>
          refreshTrigger={invitationsRefreshKey}
          isSearchable={false}
          fetchData={fetchInvitations}
          columns={invitationColumns}
          idColumnName="id"
          emptyState={{
            title: "No pending invitations",
            description: "You don't have any pending connection invitations for this node.",
          }}
        />
      </Box>
    </Box>
  );
};

export default NodeConnectionsManager;
