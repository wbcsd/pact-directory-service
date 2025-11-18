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

  // Business rules validation
  const getAdminCount = () => {
    return users.filter(u => u.role === 'admin' && u.status === 'enabled').length;
  };

  const canDisableSelectedUsers = () => {
    const selectedAdmins = selectedUsers.filter(u => u.role === 'admin' && u.status === 'enabled');
    const totalAdmins = getAdminCount();
    
    // Can't disable all admins
    if (selectedAdmins.length >= totalAdmins) {
      return {
        canDisable: false,
        reason: "Cannot disable all administrators. At least one admin must remain enabled."
      };
    }
    
    // Check if any selected users are already disabled or deleted
    const disabledOrDeleted = selectedUsers.filter(u => 
      u.status === 'disabled' || u.status === 'deleted'
    );
    
    if (disabledOrDeleted.length === selectedUsers.length) {
      return {
        canDisable: false,
        reason: "All selected users are already disabled or deleted."
      };
    }
    
    return { canDisable: true };
  };

  const canEnableSelectedUsers = () => {
    // Can't enable deleted users
    const deletedUsers = selectedUsers.filter(u => u.status === 'deleted');
    if (deletedUsers.length > 0) {
      return {
        canEnable: false,
        reason: "Cannot enable deleted users."
      };
    }
    
    // Can't enable unverified users
    const unverifiedUsers = selectedUsers.filter(u => u.status === 'unverified');
    if (unverifiedUsers.length > 0) {
      return {
        canEnable: false,
        reason: "Cannot enable unverified users."
      };
    }
    
    // Check if all selected users are already enabled
    const alreadyEnabled = selectedUsers.filter(u => u.status === 'enabled');
    if (alreadyEnabled.length === selectedUsers.length) {
      return {
        canEnable: false,
        reason: "All selected users are already enabled."
      };
    }
    
    return { canEnable: true };
  };

  // Bulk operations
  const handleBulkDisable = async () => {
    const validation = canDisableSelectedUsers();
    if (!validation.canDisable) {
      showNotification('error', validation.reason!);
      return;
    }

    setBulkActionLoading(true);
    try {
      const usersToDisable = selectedUsers.filter(u => 
        u.status !== 'disabled' && u.status !== 'deleted'
      );
      
      const results = await Promise.allSettled(
        usersToDisable.map(user =>
          fetchWithAuth(
            `/organizations/${profileData?.organizationId}/users/${user.id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'disabled' })
            }
          )
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      if (successCount > 0) {
        showNotification(
          'success',
          `Successfully disabled ${successCount} user${successCount > 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`
        );
        await fetchUsers();
        setSelectedUserIds([]);
      } else {
        showNotification('error', 'Failed to disable users');
      }
    } catch (error) {
      showNotification('error', 'An error occurred during bulk disable operation');
      console.error('Bulk disable error:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkEnable = async () => {
    const validation = canEnableSelectedUsers();
    if (!validation.canEnable) {
      showNotification('error', validation.reason!);
      return;
    }

    setBulkActionLoading(true);
    try {
      const usersToEnable = selectedUsers.filter(u => u.status === 'disabled');
      
      const results = await Promise.allSettled(
        usersToEnable.map(user =>
          fetchWithAuth(
            `/organizations/${profileData?.organizationId}/users/${user.id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'enabled' })
            }
          )
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      if (successCount > 0) {
        showNotification(
          'success',
          `Successfully enabled ${successCount} user${successCount > 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`
        );
        await fetchUsers();
        setSelectedUserIds([]);
      } else {
        showNotification('error', 'Failed to enable users');
      }
    } catch (error) {
      showNotification('error', 'An error occurred during bulk enable operation');
      console.error('Bulk enable error:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const disableValidation = canDisableSelectedUsers();
  const enableValidation = canEnableSelectedUsers();

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
        row.lastLogin ? new Date(row.lastLogin).toLocaleString() : "Never",
    },
    {
      key: "actions",
      header: "",
      render: (row: User) => (
        <ActionButton
          variant="secondary"
          size="small"
          onClick={() => navigate(`/organization/users/${row.id}`)}
        >
          <InputIcon />
          Edit
        </ActionButton>
      ),
    },
  ];

  const headerActions = (
    <PolicyGuard policies={["edit-users"]}>
      <ActionButton
        variant="primary"
        onClick={() => navigate("/organization/users/add")}
      >
        <PlusIcon />
        Add User
      </ActionButton>
    </PolicyGuard>
  );

  // Disable row selection for deleted users
  const disabledRowIds = users
    .filter(user => user.status === 'deleted')
    .map(user => user.id);

  return (
    <GridPageLayout
      title="Organization Users"
      actions={headerActions}
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
              <PolicyGuard policies={["edit-users"]}>
                <>
                  <Button
                    color="green"
                    onClick={handleBulkEnable}
                    disabled={bulkActionLoading || !enableValidation.canEnable}
                    title={enableValidation.canEnable ? undefined : enableValidation.reason}
                  >
                    {bulkActionLoading ? 'Processing...' : 'Enable Selected'}
                  </Button>
                  <Button
                    color="orange"
                    onClick={handleBulkDisable}
                    disabled={bulkActionLoading || !disableValidation.canDisable}
                    title={disableValidation.canDisable ? undefined : disableValidation.reason}
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