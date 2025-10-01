import React from "react";
import SideNav from "../components/SideNav";

const OrganizationUsers: React.FC = () => {
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
