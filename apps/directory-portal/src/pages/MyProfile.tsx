import React from "react";
import { Box } from "@radix-ui/themes";
import SideNav from "../components/SideNav";
import Spinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

const MyProfile: React.FC = () => {
  const { profileData } = useAuth();

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      {!profileData ? (
        <Box
          style={{
            padding: "20px",
            verticalAlign: "middle",
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Spinner />
        </Box>
      ) : (
        <main className="main">
          <div className="header">
            <h2>My Profile: {profileData.organizationName}</h2>
          </div>

          <div>
            <h3>Organization Identifier</h3>
            <p>{profileData.organizationIdentifier}</p>
          </div>
          <div>
            <h3>Organization Description</h3>
            <p>{profileData.organizationDescription || "No description available"}</p>
          </div>
          <div>
            <h3>Account Admin Full Name</h3>
            <p>{profileData.fullName}</p>
          </div>
          <div>
            <h3>Account Admin Email</h3>
            <p>{profileData.email}</p>
          </div>
          <div>
            <h3>Solution API URL</h3>
            <p>{profileData.solutionApiUrl || "Not configured"}</p>
          </div>
        </main>
      )}
    </>
  );
};

export default MyProfile;
