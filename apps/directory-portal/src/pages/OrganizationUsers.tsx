import React from "react";
import SideNav from "../components/SideNav";

const OrganizationUsers: React.FC = () => {
  // fetch users from api
  const [users, setUsers] = React.useState([]);

  React.useEffect(() => {
    // Placeholder for fetching users from the API
    const fetchUsers = async () => {
      try {
        const response = await fetch(
          "/api/directory/organizations/{id}/users",
          {
            credentials: "include",
          }
        );
        if (response.ok) {
          const data = await response.json();
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
          <p>This is the Organization Users page.</p>
        </div>
      </main>
    </>
  );
};
export default OrganizationUsers;
