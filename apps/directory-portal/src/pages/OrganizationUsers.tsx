import React, { useEffect } from "react";
import { Button } from "@radix-ui/themes";
import SideNav from "../components/SideNav";
import { fetchWithAuth } from "../utils/auth-fetch";
import DataTable, { Column } from "../components/DataTable";
import { useAuth } from "../contexts/AuthContext";
import { InputIcon, PlusIcon } from "@radix-ui/react-icons";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import PolicyGuard from "../components/PolicyGuard";

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: 'unverified' | 'enabled' | 'disabled' | 'deleted';
  organizationName: string;
  organizationId: number;
  organizationIdentifier: string;
}

const OrganizationUsers: React.FC = () => {
  // fetch users from api
  const [users, setUsers] = React.useState([]);
  const navigate = useNavigate();
  const { profileData } = useAuth();

  useEffect(() => {
    // Placeholder for fetching users from the API
    if (!profileData) return;

    const fetchUsers = async () => {
      try {
        const response = await fetchWithAuth(
          `/organizations/${profileData?.organizationId}/users`
        );
        if (response!.ok) {
          const members = await response!.json();
          setUsers(members);
        } else {
          console.error("Failed to fetch users");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
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
      header: "Email",
      sortable: true,
      sortValue: (row: User) => row.email,
      render: (row: User) => row.email,
    },
    {
      key: "actions",
      header: "",
      render: (row: User) => (
        <Button
          onClick={() => {
            navigate(`/organization/users/${row.id}`);
          }}
          style={{
            background: "transparent",
            color: "#0A0552",
            border: "1px solid #EBF0F5",
            padding: "8px 12px",
            minHeight: "0",
          }}
        >
          <InputIcon />
          Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <h2>Organization Users</h2>
          <PolicyGuard policies={["add-users"]}>
            <Button
              onClick={() => navigate("/organization/users/add")}
              style={{
                background: "#0A0552",
                color: "white",
                border: "none",
                padding: "8px 16px",
                minHeight: "36px",
              }}
            >
              <PlusIcon />
              Add User
            </Button>
          </PolicyGuard>
        </div>
        <div>
          <DataTable idColumnName="id" columns={columns} data={users} />
        </div>
      </main>
    </>
  );
};
export default OrganizationUsers;
