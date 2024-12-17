import React, { useEffect, useState } from "react";
import { Box, Button, AlertDialog, Flex } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import SideNav from "../components/SideNav";

interface ConnectionRequest {
  id: number;
  companyName: string;
  companyId: number;
  status: string;
  createdAt: Date;
}

interface ConnectedOrganization {
  companyId: number;
  companyName: string;
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
  const [connectionsData, setConnectionsData] = useState<{
    sent: ConnectionRequest[];
    received: ConnectionRequest[];
    connectedCompanies: ConnectedOrganization[];
  }>({
    sent: [],
    received: [],
    connectedCompanies: [],
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchConnectionsData = async () => {
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error("No token found");
      }

      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API_URL}/companies/my-profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch connections data");
      }

      const data = await response.json();

      setConnectionsData({
        ...data.connectionRequests,
        connectedCompanies: data.connectedCompanies,
      });
    } catch (error) {
      console.error("Error fetching connections data:", error);
    }
  };

  useEffect(() => {
    fetchConnectionsData();
  }, []);

  const handleAccept = async (requestId: number) => {
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error("No token found");
      }

      const response = await fetch(
        `${
          import.meta.env.VITE_DIRECTORY_API_URL
        }/companies/connection-request-action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ requestId }),
        }
      );

      if (!response.ok) {
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
            Now both companies are able to exchange PCF data through PACT
            conformant apis using the authentication service.
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

      <Flex gap={"5"} justify={"center"}>
        <Box>
          <SideNav />
        </Box>

        <Box
          style={{
            padding: "20px",
            maxWidth: "600px",
            width: "600px",
          }}
        >
          <Box>
            <h2>Connected organizations</h2>
            {connectionsData.connectedCompanies.length > 0 ? (
              <>
                {connectionsData.connectedCompanies.map((connection) => (
                  <div className="connection" key={connection.companyId}>
                    <p>
                      <Link to={`/company/${connection.companyId}`}>
                        {connection.companyName}
                      </Link>
                    </p>
                    <p className="biline">
                      Connected on {formatDate(new Date(connection.createdAt))}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <p style={{ marginBottom: "20px" }}>
                No connected organizations.
              </p>
            )}
          </Box>
          <Box>
            <h2>Sent Connection Requests</h2>
            {connectionsData.sent.length > 0 ? (
              <>
                {connectionsData.sent.map((request) => (
                  <div className="connection" key={request.id}>
                    <p>
                      <Link to={`/company/${request.companyId}`}>
                        {request.companyName}
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
                        <Link to={`/company/${request.companyId}`}>
                          {request.companyName}
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
                        <a
                          style={{ fontSize: "0.85em", cursor: "pointer" }}
                          onClick={() => handleAccept(request.id)}
                        >
                          Accept request
                        </a>
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
        </Box>
      </Flex>
    </>
  );
};

export default ManageConnections;
