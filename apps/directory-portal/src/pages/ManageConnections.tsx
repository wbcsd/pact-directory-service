import React, { useEffect, useState } from "react";
import { Box, Button, AlertDialog, Flex } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import SideNav from "../components/SideNav";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useTranslation } from "react-i18next";

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

  const { t } = useTranslation();

  const fetchConnectionsData = async () => {
    try {
      const response = await fetchWithAuth(`/companies/my-profile`);

      if (!response || !response.ok) {
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

      const response = await fetchWithAuth(
        "/companies/connection-request-action",
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
          <AlertDialog.Title>
            {t("manageconnections.dialog.acceptedTitle")}
          </AlertDialog.Title>
          <AlertDialog.Description size="2">
            {t("manageconnections.dialog.acceptedDescription")}
          </AlertDialog.Description>

          <Flex mt="4" justify="center">
            <AlertDialog.Action>
              <Button onClick={handleDialogClose} variant="solid" color="blue">
                {t("manageconnections.dialog.ok")}
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
          <h2>{t("manageconnections.title")}</h2>
        </div>

        <Box>
          <h2>{t("manageconnections.connectedOrgs.title")}</h2>
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
                    {t("manageconnections.connectedOrgs.connectedOn", {
                      date: formatDate(new Date(connection.createdAt)),
                    })}
                  </p>
                </div>
              ))}
            </>
          ) : (
            <p style={{ marginBottom: "20px" }}>
              {t("manageconnections.connectedOrgs.empty")}
            </p>
          )}
        </Box>
        <Box>
          <h2>{t("manageconnections.sentRequests.title")}</h2>
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
                    {t("manageconnections.sentRequests.status", {
                      status: request.status,
                      date: formatDate(new Date(request.createdAt)),
                    })}
                  </p>
                </div>
              ))}
            </>
          ) : (
            <p style={{ marginBottom: "20px" }}>
              {t("manageconnections.sentRequests.empty")}{" "}
              <Link to={"/search"}>
                {t("manageconnections.sentRequests.searchLink")}
              </Link>
            </p>
          )}
        </Box>
        <Box>
          <h2>{t("manageconnections.receivedRequests.title")}</h2>
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
                        {t("manageconnections.receivedRequests.status", {
                          status: request.status,
                          date: formatDate(new Date(request.createdAt)),
                        })}
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
                        {t("manageconnections.receivedRequests.accept")}
                      </Button>
                    </Box>
                  </Flex>
                </div>
              ))}
            </>
          ) : (
            <p style={{ marginBottom: "20px" }}>
              {t("manageconnections.receivedRequests.empty")}
            </p>
          )}
        </Box>
      </main>
    </>
  );
};

export default ManageConnections;
