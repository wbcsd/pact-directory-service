import React, { useEffect } from "react";
import SideNav from "../components/SideNav";
import { fetchWithAuth } from "../utils/auth-fetch";
import DataTable, { Column } from "../components/DataTable";
import { useAuth } from "../contexts/AuthContext";

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

const OrganizationUsers: React.FC = () => {
  // fetch users from api
  const [users, setUsers] = React.useState([]);
  const { profileData } = useAuth();

  useEffect(() => {
    // Placeholder for fetching users from the API
    if (!profileData) return;

    const fetchUsers = async () => {
      try {
        const response = await fetchWithAuth(
          `/organizations/${profileData?.organizationId}/members`
        );
        if (response!.ok) {
          const { members } = await response!.json();
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
      key: "fullName",
      header: "Full Name",
      sortable: true,
      sortValue: (row: User) => row.fullName,
      render: (row: User) => row.fullName,
    },
    {
      key: "email",
      header: "E-Mail",
      sortable: true,
      sortValue: (row: User) => row.email,
      render: (row: User) => row.email,
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      sortValue: (row: User) => row.role,
      render: (row: User) => row.role,
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
        </div>
        <div>
          <DataTable idColumnName="id" columns={columns} data={users} />
        </div>
      </main>
    </>
  );
};
export default OrganizationUsers;
