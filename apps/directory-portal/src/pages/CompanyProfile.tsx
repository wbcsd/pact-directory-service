import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button, Flex } from "@radix-ui/themes";
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

  const [profileData, setProfileData] = useState({
    companyName: "",
    companyIdentifier: "",
    fullName: "",
    email: "",
    solutionApiUrl: "",
    registrationCode: "",
    networkId: "",
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await fetchWithAuth(`/companies/profile/${id}`);

        if (!response || !response.ok) {
          throw new Error("Failed to fetch profile data");
        }

        const data = await response.json();

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
      "When you click Connect, PACT Identity Management Service will send a request to this supplier, requesting their permission to create an authenticated connection between your PACT Conformant Solution and theirs.",
    [RequestStatus.ACCEPTED]: "You are connected with this organization.",
    [RequestStatus.RECEIVED]:
      "This organization has sent you a connection request, you can accept it in the Manage Connections page.",
  };

  return (
    <Flex gap={"5"} justify={"center"}>
      <Box>
        <SideNav />
      </Box>
      <Box
        style={{
          padding: "20px",
          maxWidth: "800px",
          width: "800px",
        }}
      >
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
          <h2>{profileData.companyName}</h2>

          <div>
            <h3>Company Identifier</h3>
            <p>{profileData.companyIdentifier}</p>
          </div>
          <div>
            <h3>Contact's Name</h3>
            <p>{profileData.fullName}</p>
          </div>
          <div>
            <h3>Contact's Email</h3>
            <p>{profileData.email}</p>
          </div>
          {requestStatus === RequestStatus.ACCEPTED && (
            <>
              <h2 style={{ margin: 0, marginTop: "20px" }}>
                Api Configuration
              </h2>
              <div>
                <h3>Network Identifier</h3>
                <p>{profileData.networkId}</p>
              </div>
              <div>
                <h3>Solution API URL</h3>
                <p>{profileData.solutionApiUrl}</p>
              </div>
            </>
          )}
        </Box>
      </Box>
    </Flex>
  );
};

export default CompanyProfile;
