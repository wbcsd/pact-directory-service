import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button, Flex } from "@radix-ui/themes";
import SideNav from "../components/SideNav";
import { fetchWithAuth } from "../utils/auth-fetch";
import Spinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

const RequestStatus = {
  PENDING: "pending",
  NOREQUEST: "no-request",
  ACCEPTED: "accepted",
  RECEIVED: "received",
};

const OrganizationProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profileData: userProfileData } = useAuth();
  const [requestStatus, setRequestStatus] = useState(RequestStatus.NOREQUEST);
  const [showCredentials, setShowCredentials] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [loadingConnections, setLoadingConnections] = useState(true);

  const [profileData, setProfileData] = useState({
    organizationName: "",
    organizationIdentifier: "",
    organizationDescription: "",
    fullName: "",
    email: "",
    solutionApiUrl: "",
    networkKey: "",
  });

  const [credentialsData, setCredentialsData] = useState({
    clientId: "",
    clientSecret: "",
    networkKey: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfileData?.organizationId) return;

      try {
        // Fetch organization profile
        const orgResponse = await fetchWithAuth(`/organizations/${id}`);
        if (!orgResponse || !orgResponse.ok) {
          throw new Error("Failed to fetch organization data");
        }
        const orgData = await orgResponse.json();
        setProfileData(orgData);
        
        // If viewing own organization, fetch credentials separately
        if (userProfileData.organizationId.toString() === id) {
          setCredentialsData({
            clientId: orgData.clientId || "",
            clientSecret: orgData.clientSecret || "",
            networkKey: orgData.networkKey || "",
          });
        }
        
        setLoadingData(false);

        // Fetch connection requests to determine status
        const [connectionsResponse, connectionRequestsResponse] = await Promise.all([
          fetchWithAuth(`/organizations/${userProfileData.organizationId}/connections`),
          fetchWithAuth(`/organizations/${userProfileData.organizationId}/connection-requests`)
        ]);

        if (!connectionsResponse?.ok || !connectionRequestsResponse?.ok) {
          console.error("Failed to fetch connection data");
          setLoadingConnections(false);
          return;
        }

        const connectionsData = await connectionsResponse.json();
        const connectionRequestsData = await connectionRequestsResponse.json();

        // Check if organizations are connected
        const isConnected = connectionsData.data.some((conn: any) => 
          conn.connectedCompanyOneId.toString() === id || 
          conn.connectedCompanyTwoId.toString() === id
        );

        if (isConnected) {
          setRequestStatus(RequestStatus.ACCEPTED);
          setLoadingConnections(false);
          return;
        }

        // Check sent connection requests
        const sentRequest = connectionRequestsData.data.find((req: any) => 
          req.requestedCompanyId.toString() === id && req.status === 'pending'
        );

        if (sentRequest) {
          setRequestStatus(RequestStatus.PENDING);
          setLoadingConnections(false);
          return;
        }

        // Check received connection requests  
        const receivedRequest = connectionRequestsData.data.find((req: any) => 
          req.requestingCompanyId.toString() === id && req.status === 'pending'
        );

        if (receivedRequest) {
          setRequestStatus(RequestStatus.RECEIVED);
        } else {
          setRequestStatus(RequestStatus.NOREQUEST);
        }

        setLoadingConnections(false);

      } catch (error) {
        console.error("Error fetching data:", error);
        setLoadingData(false);
        setLoadingConnections(false);
      }
    };

    fetchData();
  }, [id, userProfileData]);

  const toggleCredentials = () => {
    setShowCredentials((prevState) => !prevState);
  };

  const maskValue = (value: string) => {
    return value ? value.replace(/.(?=.{4})/g, "*") : "";
  };

  // Check if this is the user's own organization
  const isOwnOrganization = userProfileData && userProfileData.organizationId.toString() === id;

  const handleConnect = async () => {
    try {
      if (requestStatus !== RequestStatus.NOREQUEST) {
        return;
      }

      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error("No token found");
      }

      const response = await fetchWithAuth(
        "/organizations/create-connection-request",
        {
          method: "POST",
          body: JSON.stringify({ requestedOrganizationId: parseInt(id!) }),
        }
      );

      if (!response || !response.ok) {
        throw new Error("Failed to create connection request");
      }

      setRequestStatus(RequestStatus.PENDING);
    } catch (error) {
      console.error("Error creating connection request:", error);
    }
  };

  const statusLabelMapping = {
    [RequestStatus.PENDING]: "Pending",
    [RequestStatus.NOREQUEST]: "Connect",
    [RequestStatus.ACCEPTED]: "Connected",
  };

  const connectionStatusTextMapping = {
    [RequestStatus.PENDING]:
      "Your connection request is pending approval from this organization.",
    [RequestStatus.NOREQUEST]:
      "When you click Connect, PACT Identity Management Service will send a request to this organization, requesting their permission to create an authenticated connection between your PACT Conformant Solution and theirs.",
    [RequestStatus.ACCEPTED]: "You are connected with this organization.",
    [RequestStatus.RECEIVED]:
      "This organization has sent you a connection request, you can accept it in the Manage Connections page.",
  };

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      {loadingData || loadingConnections ? (
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
            <h2>{profileData.organizationName}</h2>
          </div>

          {requestStatus === RequestStatus.RECEIVED ? (
            <Box
              style={{
                marginBottom: "20px",
              }}
            >
              {connectionStatusTextMapping[RequestStatus.RECEIVED]}
            </Box>
          ) : (
            <Box
              style={{
                marginBottom: "20px",
                display: "flex",
                gap: "16px",
              }}
            >
              <Box>
                <Button
                  onClick={handleConnect}
                  style={
                    requestStatus !== RequestStatus.NOREQUEST
                      ? { backgroundColor: "gray" }
                      : {}
                  }
                >
                  {statusLabelMapping[requestStatus]}
                </Button>
              </Box>
              <Box
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {connectionStatusTextMapping[requestStatus]}
              </Box>
            </Box>
          )}

          <Box>
            <div>
              <h3>Organization Identifier</h3>
              <p>{profileData.organizationIdentifier}</p>
            </div>
            <div>
              <h3>Organization Description</h3>
              <p>{profileData.organizationDescription}</p>
            </div>
            <div>
              <h3>Account Admin Full Name</h3>
              <p>{profileData.fullName}</p>
            </div>
            <div>
              <h3>Account Admin Email</h3>
              <p>{profileData.email}</p>
            </div>
            {requestStatus === RequestStatus.ACCEPTED && !isOwnOrganization && (
              <>
                <h2 style={{ margin: 0, marginTop: "20px" }}>
                  Api Configuration
                </h2>
                <div>
                  <h3>Network Key</h3>
                  <p>{profileData.networkKey}</p>
                </div>
                <div>
                  <h3>Solution API URL</h3>
                  <p>{profileData.solutionApiUrl}</p>
                </div>
              </>
            )}
            {isOwnOrganization && userProfileData && (
              <>
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
                  <p>{credentialsData.networkKey}</p>
                </div>
                <div>
                  <h3>ClientId</h3>
                  <p>
                    {showCredentials
                      ? credentialsData.clientId
                      : maskValue(credentialsData.clientId)}
                  </p>
                </div>
                <div>
                  <h3>ClientSecret</h3>
                  <p>
                    {showCredentials
                      ? credentialsData.clientSecret
                      : maskValue(credentialsData.clientSecret)}
                  </p>
                </div>
              </>
            )}
          </Box>
        </main>
      )}
    </>
  );
};

export default OrganizationProfile;
