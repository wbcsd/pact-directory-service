import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../utils/auth-fetch";
import DataTable, { Column } from "../components/DataTable";
import { useAuth } from "../contexts/AuthContext";
import { InputIcon, PlusIcon } from "@radix-ui/react-icons";
import { useNavigate } from "react-router-dom";
import { Box, Button, Text } from "@radix-ui/themes";
import StatusBadge from "../components/StatusBadge";
import { GridPageLayout } from "../layouts";
import ActionButton from "../components/ActionButton";
import PolicyGuard from "../components/PolicyGuard";
import "./OrganizationUsers.css";

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: 'unverified' | 'enabled' | 'disabled' | 'deleted';
  lastLogin: string | null;
  organizationName: string;
  organizationId: number;
  organizationIdentifier: string;
}

const OrganizationUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<(string | number)[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  
  const navigate = useNavigate();
  const { profileData } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, [profileData]);

  const fetchUsers = async () => {
    if (!profileData) return;
    
    try {
      setLoading(true);
      const response = await fetchWithAuth(
        // TODO: Update to use orgId from params if implementing multi-org admin
        `/organizations/${profileData?.organizationId}/users`
      );
      if (response!.ok) {
        const members = await response!.json();
        setUsers(members.data);
      } else {
        console.error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get selected users
  const selectedUsers = users.filter(user => 
    selectedUserIds.includes(user.id)
  );

  // runUsers Bulk action (enable/disable)
  // Only count the promise as fulfilled if the response is ok
  const runBulkAction = async (
    action: 'enable' | 'disable',
    usersToProcess: User[]
  ) => {
    setBulkActionLoading(true);
    try {
      const results = await Promise.allSettled(
        usersToProcess.map(async user => {
          const response = await fetchWithAuth(
            `/organizations/${user.organizationId}/users/${user.id}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: action === 'enable' ? 'enabled' : 'disabled' })
            }
          );

          if (!response!.ok) {
            return Promise.reject(`Failed to ${action} user ID ${user.id}`);
          }
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      if (successCount > 0) {
        showNotification(
          'success',
          `Successfully ${action}d ${successCount} user${successCount > 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`
        );
        await fetchUsers();
        setSelectedUserIds([]);
      } else {
        showNotification('error', `Failed to ${action} users`);
      }
    } catch (error) {
      showNotification('error', `An error occurred during bulk ${action} operation`);
      console.error(`Bulk ${action} error:`, error);
    } finally {
      setBulkActionLoading(false);
    }
  }

  // Bulk operations
  const handleBulkDisable = async () => {
    setBulkActionLoading(true);
    const usersToDisable = selectedUsers.filter(u => 
      u.status !== 'disabled' && u.status !== 'deleted'
    );
    await runBulkAction('disable', usersToDisable);
  };

  const handleBulkEnable = async () => {
    setBulkActionLoading(true);
    const usersToEnable = selectedUsers.filter(u => u.status === 'disabled');
    await runBulkAction('enable', usersToEnable);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const columns: Column<User>[] = [
    {
      key: "organizationName",
      header: "Organization",
      sortable: true,
      sortValue: (row: User) => row?.organizationName,
      render: (row: User) => row?.organizationName,
    },
    {
      key: "fullName",
      header: "Full Name",
      sortable: true,
      sortValue: (row: User) => row.fullName,
      render: (row: User) => row.fullName,
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      sortValue: (row: User) => row.role,
      render: (row: User) => row.role,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row: User) => row.status,
      render: (row: User) => <StatusBadge status={row.status} />,
    },
    {
      key: "email",
      header: "E-Mail",
      sortable: true,
      sortValue: (row: User) => row.email,
      render: (row: User) => row.email,
    },
    {
      key: "lastLogin",
      header: "Last Login",
      sortable: true,
      sortValue: (row: User) => (row.lastLogin ? new Date(row.lastLogin).getTime() : 0),
      render: (row: User) =>
        row.lastLogin ? new Date(row.lastLogin).toLocaleString() : "—",
    },
    {
      key: "actions",
      header: "",
      render: (row: User) => (
          <>
          <PolicyGuard policies={["edit-users", "edit-all-users"]}>
            <ActionButton
              title="Edit User Details"
              variant="secondary"
              size="small"
              onClick={() => navigate(`/organization/${row.organizationId}/users/${row.id}`)}
            >
              <InputIcon />
            </ActionButton>
          </PolicyGuard>
          <span>&nbsp;</span>
          <PolicyGuard policies={["edit-all-users"]}>
            <ActionButton
              title="Add New User"
              variant="secondary"
              size="small"
              onClick={() => navigate(`/organization/${row.organizationId}/${row.organizationName}/add-user`)}
            >
              <PlusIcon />
            </ActionButton>
          </PolicyGuard>
          </>
      ),
    },
  ];

  // Disable row selection for deleted users
  const disabledRowIds = users
    .filter(user => user.status === 'deleted')
    .map(user => user.id);

  return (
    <GridPageLayout
      title="Organization Users"
      actions={
        <PolicyGuard policies={["edit-users"]}>
          <Button
            onClick={() => navigate(`/organization/${profileData?.organizationId}/${profileData?.organizationName}/add-user`)}
          >
            <PlusIcon />
            <span style={{ marginLeft: '4px' }}>Add User</span>
          </Button>
        </PolicyGuard>
      }
      loading={loading}
      loadingMessage="Loading users..."
    >
      {/* Notification Toast */}
      {notification && (
        <Box className={`notification notification-${notification.type}`}>
          <Text>{notification.message}</Text>
          <button
            className="notification-close"
            onClick={() => setNotification(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </Box>
      )}

      {/* Bulk Action Bar */}
      {selectedUserIds.length > 0 && (
        <Box className="bulk-action-bar">
          <div className="bulk-action-content">
            <Text size="3" weight="medium">
              {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''} selected
            </Text>
            <div className="bulk-action-buttons">
              <PolicyGuard policies={["edit-users", "edit-all-users"]}>
                <>
                  <Button
                    color="green"
                    onClick={handleBulkEnable}
                    disabled={bulkActionLoading}
                  >
                    {bulkActionLoading ? 'Processing...' : 'Enable Selected'}
                  </Button>
                  <Button
                    color="orange"
                    onClick={handleBulkDisable}
                    disabled={bulkActionLoading}
                  >
                    {bulkActionLoading ? 'Processing...' : 'Disable Selected'}
                  </Button>
                </>
              </PolicyGuard>
              <Button
                color="gray"
                onClick={() => setSelectedUserIds([])}
                disabled={bulkActionLoading}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </Box>
      )}

      <DataTable
        idColumnName="id"
        columns={columns}
        data={users}
        selectable={true}
        selectedIds={selectedUserIds}
        onSelectionChange={setSelectedUserIds}
        disabledRowIds={disabledRowIds}
        selectAllText="Select all users"
      />
    </GridPageLayout>
  );
};

export default OrganizationUsers;