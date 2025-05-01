import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button, Spinner } from "@radix-ui/themes";
import SideNav from "../components/SideNav";
import { fetchWithAuth } from "../utils/auth-fetch";

const RequestStatus = {
  PENDING: "pending",
  NOREQUEST: "no-request",
  ACCEPTED: "accepted",
  RECEIVED: "received",
};

const CompanyProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [requestStatus, setRequestStatus] = useState(RequestStatus.NOREQUEST);

  const [loadingData, setLoadingData] = useState(true);

  const [profileData, setProfileData] = useState({
    companyName: "",
    companyIdentifier: "",
    companyIdentifierDescription: "",
    fullName: "",
    email: "",
    solutionApiUrl: "",
    registrationCode: "",
    networkKey: "",
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await fetchWithAuth(`/companies/profile/${id}`);

        if (!response || !response.ok) {
          throw new Error("Failed to fetch profile data");
        }

        const data = await response.json();

        setLoadingData(false);

        setProfileData(data.company);

        if (data.sentConnectionRequest) {
          setRequestStatus(RequestStatus.PENDING);
        } else if (data.connectedToCurrentCompany) {
          setRequestStatus(RequestStatus.ACCEPTED);
        } else if (data.receivedConnectionRequest) {
          setRequestStatus(RequestStatus.RECEIVED);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    fetchProfileData();
  }, [id]);

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
        "/companies/create-connection-request",
        {
          method: "POST",
          body: JSON.stringify({ companyId: id }),
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
      "When you click Connect, PACT Identity Management Service will send a request to this company, requesting their permission to create an authenticated connection between your PACT Conformant Solution and theirs.",
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
      {loadingData ? (
        <Box
          style={{
            padding: "20px",
            maxWidth: "800px",
            width: "800px",
          }}
        >
          <Spinner size="3" />
        </Box>
      ) : (
        <main className="main">
          <div className="header">
            <h2>{profileData.companyName}</h2>
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
            {requestStatus === RequestStatus.ACCEPTED && (
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
          </Box>
        </main>
      )}
    </>
  );
};

export default CompanyProfile;
