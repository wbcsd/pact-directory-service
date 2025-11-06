import React, { useEffect } from "react";
import { fetchWithAuth } from "../utils/auth-fetch";
import DataTable, { Column } from "../components/DataTable";
import { useAuth } from "../contexts/AuthContext";
import { InputIcon, PlusIcon } from "@radix-ui/react-icons";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import { GridPageLayout } from "../layouts";
import ActionButton from "../components/ActionButton";
import PolicyGuard from "../components/PolicyGuard";

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
  // fetch users from api
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();
  const { profileData } = useAuth();

  useEffect(() => {
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

    fetchUsers();
  }, [profileData]);

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

  return (
    <GridPageLayout
      title="Organization Users"
      actions={headerActions}
      loading={loading}
      loadingMessage="Loading users..."
    >
      <DataTable idColumnName="id" columns={columns} data={users} />
    </GridPageLayout>
  );
};
export default OrganizationUsers;
