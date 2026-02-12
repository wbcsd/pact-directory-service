import React, { useState } from "react";
import { fetchWithAuth } from "../utils/auth-fetch";
import SearchableDataTable, { PaginationInfo } from "../components/SearchableDataTable";
import { Column } from "../components/DataTable";
import { useParams } from "react-router-dom";
import { GridPageLayout } from "../layouts";
import { Button, Callout } from "@radix-ui/themes";
import { CheckIcon, Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";

export interface NodeInvitation {
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

interface ConnectionCredentials {
  connectionId: number;
  clientId: string;
  clientSecret: string;
}

const NodeInvitationsList: React.FC = () => {
  const { id: nodeId } = useParams<{ id: string }>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showCredentials, setShowCredentials] = useState<ConnectionCredentials | null>(null);

  // Fetch function for DataTableWithSearch
  const fetchInvitations = async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: NodeInvitation[]; pagination: PaginationInfo }> => {
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
      `/nodes/${nodeId}/invitations?${queryParams.toString()}`
    );
    
    if (!response || !response.ok) {
      throw new Error("Failed to fetch invitations");
    }

    const result = await response.json();
    return result;
  };

  const handleAccept = async (invitationId: number) => {
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
      
      // Refresh the table
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      setActionMessage({ 
        type: 'error', 
        message: 'An error occurred while accepting the invitation' 
      });
    }
  };

  const handleReject = async (invitationId: number) => {
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
      
      // Refresh the table
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      setActionMessage({ 
        type: 'error', 
        message: 'An error occurred while rejecting the invitation' 
      });
    }
  };

  const columns: Column<NodeInvitation>[] = [
    {
      key: "id",
      header: "Invitation ID",
      sortable: true,
      sortValue: (row: NodeInvitation) => row.id,
      render: (row: NodeInvitation) => `#${row.id}`,
    },
    {
      key: "fromNodeId",
      header: "From Node",
      sortable: true,
      sortValue: (row: NodeInvitation) => row.fromNodeId,
      render: (row: NodeInvitation) => `Node #${row.fromNodeId}`,
    },
    {
      key: "targetNodeId",
      header: "Target Node",
      sortable: true,
      sortValue: (row: NodeInvitation) => row.targetNodeId,
      render: (row: NodeInvitation) => (
        <span style={{ fontWeight: '600' }}>
          Node #{row.targetNodeId} (This Node)
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
          : date.toLocaleDateString() + " " + date.toLocaleTimeString();
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
            onClick={() => handleAccept(row.id)}
          >
            <CheckIcon style={{ marginRight: '4px' }} />
            Accept
          </Button>
          <Button
            size="1"
            variant="soft"
            color="red"
            onClick={() => handleReject(row.id)}
          >
            <Cross2Icon style={{ marginRight: '4px' }} />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <GridPageLayout
      title=""
      loading={false}
      loadingMessage="Loading invitations..."
    >
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Pending Invitations</h2>
        <p style={{ margin: '4px 0 0 0', color: '#666' }}>
          Connection invitations received by Node #{nodeId}
        </p>
      </div>

      {actionMessage && (
        <Callout.Root 
          color={actionMessage.type === 'success' ? 'green' : 'red'} 
          mb="4"
          style={{ marginBottom: '16px' }}
        >
          <Callout.Icon>
            {actionMessage.type === 'success' ? <CheckIcon /> : <ExclamationTriangleIcon />}
          </Callout.Icon>
          <Callout.Text>{actionMessage.message}</Callout.Text>
        </Callout.Root>
      )}

      {showCredentials && (
        <Callout.Root color="blue" mb="4" style={{ marginBottom: '16px' }}>
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
      
      <SearchableDataTable<NodeInvitation>
        key={refreshKey}
        searchPlaceholder="Search invitations..."
        fetchData={fetchInvitations}
        columns={columns}
        idColumnName="id"
        emptyState={{
          title: "No pending invitations",
          description: "You don't have any pending connection invitations for this node.",
        }}
      />
    </GridPageLayout>
  );
};

export default NodeInvitationsList;
