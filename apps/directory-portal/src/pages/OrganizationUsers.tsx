import React, { useState, useCallback } from "react";
import { fetchWithAuth } from "../utils/auth-fetch";
import PaginatedDataTable from "../components/PaginatedDataTable";
import { Column } from "../components/DataTable";
import { useAuth } from "../contexts/AuthContext";
import { InputIcon, PlusIcon } from "@radix-ui/react-icons";
import { Box, Button, IconButton, Text } from "@radix-ui/themes";
import StatusBadge from "../components/StatusBadge";
import { GridPageLayout } from "../layouts";
import PolicyGuard from "../components/PolicyGuard";
import SlideOverPanel from "../components/SlideOverPanel";
import UserForm from "../components/UserForm";

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

type PanelState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; userId: number; userName: string; organizationId: number };

const OrganizationUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<(string | number)[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  
  const { profileData, isAuthenticated } = useAuth();

  const closePanel = useCallback(() => setPanel({ mode: "closed" }), []);

  const handleSaved = useCallback(() => {
    // Refresh the table data to reflect changes
    setRefreshTrigger((prev) => prev + 1);
    // Auto-close after a short delay so the user sees the success message
    setTimeout(() => closePanel(), 1200);
  }, [closePanel]);

  const fetchUsers = async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: User[]; pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrevious: boolean } }> => {
    if (!profileData?.organizationId) {
      return {
        data: [],
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }

    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    });

    if (params.search) {
      queryParams.append("search", params.search);
    }

    const response = await fetchWithAuth(
      // TODO: Update to use orgId from params if implementing multi-org admin
      `/organizations/${profileData.organizationId}/users?${queryParams.toString()}`
    );

    if (!response || !response.ok) {
      throw new Error("Failed to fetch users");
    }

    const result = await response.json();
    setSelectedUserIds([]);
    return result;
  };

  // Get selected users
  const selectedUsers = users.filter(user => 
    selectedUserIds.includes(user.id)
  );

  const usersToEnable = selectedUsers.filter((user) => user.status === "disabled");
  const usersToDisable = selectedUsers.filter(
    (user) => user.status !== "disabled" && user.status !== "deleted"
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
        setRefreshTrigger((current) => current + 1);
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
    await runBulkAction('disable', usersToDisable);
  };

  const handleBulkEnable = async () => {
    setBulkActionLoading(true);
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
        <PolicyGuard policies={["edit-users", "edit-all-users"]}>
          <IconButton
            title="Edit User Details"
            variant="soft"
            color="gray"
            size="1"
            onClick={() =>
              setPanel({
                mode: "edit",
                userId: row.id,
                userName: row.fullName,
                organizationId: row.organizationId,
              })
            }
          >
            <InputIcon />
          </IconButton>
        </PolicyGuard>
      ),
    },
  ];

  // Disable row selection for deleted users
  const disabledRowIds = users
    .filter(user => user.status === 'deleted')
    .map(user => user.id);

  const panelTitle =
    panel.mode === "add"
      ? "Create User"
      : panel.mode === "edit"
        ? "Edit User"
        : "";

  const panelSubtitle =
    panel.mode === "add"
      ? profileData?.organizationName
      : panel.mode === "edit"
        ? panel.userName
        : undefined;

  return (
    <GridPageLayout
      title="Users"
      subtitle="Manage and view users in your organization"
      loading={isAuthenticated && !profileData}
      loadingMessage="Loading profile data..."
      actions={
        <PolicyGuard policies={["edit-all-users","edit-users"]}>
          <Button onClick={() => setPanel({ mode: "add" })}>
            <PlusIcon />
            <span style={{ marginLeft: '4px' }}>Add User</span>
          </Button>
        </PolicyGuard>
      }
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

      {profileData?.organizationId && (
        <PaginatedDataTable<User>
          isSearchable={true}
          searchPlaceholder="Search by name or email..."
          fetchData={fetchUsers}
          columns={columns}
          idColumnName="id"
          refreshTrigger={refreshTrigger}
          headerActions={
            <>
              <PolicyGuard policies={["edit-users", "edit-all-users"]}>
                <>
                  <Button
                    color="green"
                    onClick={handleBulkEnable}
                    disabled={bulkActionLoading || usersToEnable.length === 0}
                  >
                    {bulkActionLoading ? 'Processing...' : 'Enable Selected'}
                  </Button>
                  <Button
                    color="orange"
                    onClick={handleBulkDisable}
                    disabled={bulkActionLoading || usersToDisable.length === 0}
                  >
                    {bulkActionLoading ? 'Processing...' : 'Disable Selected'}
                  </Button>
                </>
              </PolicyGuard>
              <Button
                color="gray"
                onClick={() => setSelectedUserIds([])}
                disabled={bulkActionLoading || selectedUserIds.length === 0}
              >
                Clear
              </Button>
            </>
          }
          selectable={true}
          selectedIds={selectedUserIds}
          onSelectionChange={setSelectedUserIds}
          disabledRowIds={disabledRowIds}
          selectAllText="Select all users"
          onDataLoaded={setUsers}
          emptyState={{
            title: "No users found",
            description: "No users match your search criteria",
          }}
        />
      )}

      {/* Modal dialog for Add / Edit */}
      <SlideOverPanel
        open={panel.mode !== "closed"}
        onClose={closePanel}
        title={panelTitle}
        subtitle={panelSubtitle}
      >
        {panel.mode === "add" && profileData?.organizationId && (
          <UserForm
            organizationId={profileData.organizationId}
            onCancel={closePanel}
            onSaved={handleSaved}
          />
        )}
        {panel.mode === "edit" && (
          <UserForm
            key={panel.userId}
            organizationId={panel.organizationId}
            userId={panel.userId}
            onCancel={closePanel}
            onSaved={handleSaved}
          />
        )}
      </SlideOverPanel>
    </GridPageLayout>
  );
};

export default OrganizationUsers;