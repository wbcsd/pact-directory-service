import React, { useEffect, useState } from "react";
import { Box, Button } from "@radix-ui/themes";

interface ConnectionRequest {
  companyName: string;
  status: string;
  createdAt: Date;
}

const ManageConnections: React.FC = () => {
  const [connectionsData, setConnectionsData] = useState<{
    sent: ConnectionRequest[];
    received: ConnectionRequest[];
  }>({
    sent: [],
    received: [],
  });

  useEffect(() => {
    const fetchConnectionsData = async () => {
      try {
        const token = localStorage.getItem("jwt");
        if (!token) {
          throw new Error("No token found");
        }

        const response = await fetch(
          "http://localhost:3010/api/directory/companies/my-profile",
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
        console.log(data);
        setConnectionsData(data.connectionRequests);
      } catch (error) {
        console.error("Error fetching connections data:", error);
      }
    };

    fetchConnectionsData();
  }, []);

  return (
    <Box
      style={{
        padding: "20px",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <h2>Manage Connections</h2>
      <Box>
        <h3>Sent Connection Requests</h3>
        {connectionsData.sent.length > 0 ? (
          <ul>
            {connectionsData.sent.map((request, index) => (
              <li key={index}>
                <p>Company Name: {request.companyName}</p>
                <p>Status: {request.status}</p>
                <p>
                  Created At: {new Date(request.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No sent connection requests.</p>
        )}
      </Box>
      <Box>
        <h3>Received Connection Requests</h3>
        {connectionsData.received.length > 0 ? (
          <ul>
            {connectionsData.received.map((request, index) => (
              <li key={index}>
                <p>Company Name: {request.companyName}</p>
                <p>Status: {request.status}</p>
                <p>
                  Created At: {new Date(request.createdAt).toLocaleString()}
                </p>

                <Button>Accept</Button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No received connection requests.</p>
        )}
      </Box>
    </Box>
  );
};

export default ManageConnections;
