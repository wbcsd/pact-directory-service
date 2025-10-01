import React, { useEffect } from "react";
import SideNav from "../components/SideNav";
import { fetchWithAuth } from "../utils/auth-fetch";
import DataTable, { Column } from "../components/DataTable";
import { render } from "react-dom";

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

const OrganizationUsers: React.FC = () => {
  // fetch users from api
  const [users, setUsers] = React.useState([]);

  useEffect(() => {
    // Placeholder for fetching users from the API
    const fetchUsers = async () => {
      try {
        const response = await fetchWithAuth("/organizations/users");
        if (response!.ok) {
          const data = await response!.json();
          setUsers(data);
        } else {
          console.error("Failed to fetch users");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  const columns: Column<User>[] = [
    {
      key: "fullName",
      header: "Full Name",
      render: (row: User) => row.fullName,
    },
    { key: "email", header: "E-Mail", render: (row: User) => row.email },
    { key: "role", header: "Role", render: (row: User) => row.role },
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
