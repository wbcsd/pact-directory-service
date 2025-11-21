import React, { useEffect, useState } from "react";
import { Box, Button, AlertDialog, Flex } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import SideNav from "../components/SideNav";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useAuth } from "../contexts/AuthContext";

interface ConnectionRequest {
  id: number;
  organizationName: string;
  organizationId: number;
  status: string;
  createdAt: Date;
}

interface ConnectedOrganization {
  organizationId: number;
  organizationName: string;
  requestedAt: Date;
  createdAt: Date;
}

const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const ManageConnections: React.FC = () => {
  const { profileData } = useAuth();
  const [connectionsData, setConnectionsData] = useState<{
    sent: ConnectionRequest[];
    received: ConnectionRequest[];
    connectedOrganizations: ConnectedOrganization[];
  }>({
    sent: [],
    received: [],
    connectedOrganizations: [],
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConnectionsData = async () => {
    if (!profileData?.organizationId) {
      return; // Don't fetch if profileData is not yet loaded
    }

    try {
      setIsLoading(true);

      // Fetch connections and connection requests in parallel
      const [connectionsResponse, connectionRequestsResponse] = await Promise.all([
        fetchWithAuth(`/organizations/${profileData.organizationId}/connections`),
        fetchWithAuth(`/organizations/${profileData.organizationId}/connection-requests`)
      ]);

      if (!connectionsResponse?.ok || !connectionRequestsResponse?.ok) {
        throw new Error("Failed to fetch connections data");
      }

      const [connectionsData, connectionRequestsData] = await Promise.all([
        connectionsResponse.json(),
        connectionRequestsResponse.json()
      ]);

      setConnectionsData({
        sent: connectionRequestsData.data || [],

        received: connectionRequestsData.data || [],
        connectedOrganizations: connectionsData.data || [],
      });
    } catch (error) {
      console.error("Error fetching connections data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionsData();
  }, [profileData]); // Add profileData as dependency so it refetches when profile loads

  const handleAccept = async (requestId: number) => {
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error("No token found");
      }

      const response = await fetchWithAuth(
        "/organizations/connection-request-action",
        {
          method: "POST",
          body: JSON.stringify({ requestId }),
        }
      );

      if (!response || !response.ok) {
        throw new Error("Failed to accept connection request");
      }

      setIsDialogOpen(true);

      await fetchConnectionsData();
    } catch (error) {
      console.error("Error accepting connection request:", error);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <AlertDialog.Root open={isDialogOpen}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Connection request accepted</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Now you are able to exchange PCF data using your PACT Conformant
            Solution with the organization you just connected with
          </AlertDialog.Description>

          <Flex mt="4" justify="center">
            <AlertDialog.Action>
              <Button onClick={handleDialogClose} variant="solid" color="blue">
                Ok
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <h2>Manage Connections</h2>
        </div>

        {isLoading ? (
          <p>Loading connections...</p>
        ) : (
          <>
        <Box>
          <h2>Connected organizations</h2>
          {connectionsData.connectedOrganizations.length > 0 ? (
            <>
              {connectionsData.connectedOrganizations.map((connection) => (
                <div className="connection" key={connection.organizationId}>
                  <p>
                    <Link to={`/organization/${connection.organizationId}`}>
                      {connection.organizationName}
                    </Link>
                  </p>
                  <p className="biline">
                    Connected on {formatDate(new Date(connection.createdAt))}
                  </p>
                </div>
              ))}
            </>
          ) : (
            <p style={{ marginBottom: "20px" }}>No connected organizations.</p>
          )}
        </Box>
        <Box>
          <h2>Sent Connection Requests</h2>
          {connectionsData.sent.length > 0 ? (
            <>
              {connectionsData.sent.map((request) => (
                <div className="connection" key={request.id}>
                  <p>
                    <Link to={`/organization/${request.organizationId}`}>
                      {request.organizationName}
                    </Link>
                  </p>
                  <p className="biline">
                    Status: {request.status} | Sent on{" "}
                    {formatDate(new Date(request.createdAt))}
                  </p>
                </div>
              ))}
            </>
          ) : (
            <p style={{ marginBottom: "20px" }}>
              No sent connection requests.{" "}
              <Link to={"/search"}>Search for companies</Link>
            </p>
          )}
        </Box>
        <Box>
          <h2>Received Connection Requests</h2>
          {connectionsData.received.length > 0 ? (
            <>
              {connectionsData.received.map((request) => (
                <div className="connection" key={request.id}>
                  <Flex gap={"3"} justify={"between"}>
                    <Box>
                      <Link to={`/organization/${request.organizationId}`}>
                        {request.organizationName}
                      </Link>
                      <p className="biline">
                        Status: {request.status} | Received on{" "}
                        {formatDate(new Date(request.createdAt))}
                      </p>
                    </Box>
                    <Box
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Button onClick={() => handleAccept(request.id)}>
                        Accept request
                      </Button>
                    </Box>
                  </Flex>
                </div>
              ))}
            </>
          ) : (
            <p style={{ marginBottom: "20px" }}>
              No received connection requests.
            </p>
          )}
        </Box>
          </>
        )}
      </main>
    </>
  );
};

export default ManageConnections;
