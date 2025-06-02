import React, { useState } from "react";
import { Box, Flex } from "@radix-ui/themes";
import SideNav from "../components/SideNav";
import Spinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

const MyProfile: React.FC = () => {
  const { profileData, refreshProfileData } = useAuth();

  const [showCredentials, setShowCredentials] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleCredentials = () => {
    setShowCredentials((prevState) => !prevState);
  };

  const maskValue = (value: string) => {
    return value ? value.replace(/.(?=.{4})/g, "*") : "";
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfileData();
    setIsRefreshing(false);
  };

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
            <h2>My Profile: {profileData.companyName}</h2>
          </div>

          <div>
            <h3>Company Identifier</h3>
            <p>{profileData.companyIdentifier}</p>
          </div>
          <div>
            <h3>Company Identifier Description</h3>
            <p>{profileData.companyIdentifierDescription}</p>
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
            <p>{profileData.solutionApiUrl}</p>
          </div>

          <Flex gap={"3"} style={{ marginTop: "20px", marginBottom: "5px" }}>
            <Box>
              <h2 style={{ margin: 0 }}>Credentials</h2>
            </Box>
            <Box
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <a
                onClick={toggleCredentials}
                style={{
                  color: "var(--base-color-brand--light-blue)",
                  cursor: "pointer",
                  fontSize: "0.90em",
                  textDecoration: "underline",
                  marginTop: "10px",
                }}
              >
                {showCredentials ? "Hide Credentials" : "Show Credentials"}
              </a>
            </Box>
          </Flex>
          <div>
            <h3>Network Key</h3>
            <p>{profileData.networkKey}</p>
          </div>
          <div>
            <h3>ClientId</h3>
            <p>
              {showCredentials
                ? profileData.clientId
                : maskValue(profileData.clientId)}
            </p>
          </div>
          <div>
            <h3>ClientSecret</h3>
            <p>
              {showCredentials
                ? profileData.clientSecret
                : maskValue(profileData.clientSecret)}
            </p>
          </div>
        </main>
      )}
    </>
  );
};

export default MyProfile;
