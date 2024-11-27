import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button } from "@radix-ui/themes";

const RequestStatus = {
  PENDING: "pending",
  NOREQUEST: "no-request",
  ACCEPTED: "accepted",
};

const CompanyProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [requestStatus, setRequestStatus] = useState(RequestStatus.NOREQUEST);

  const [profileData, setProfileData] = useState({
    companyName: "",
    companyIdentifier: "",
    fullName: "",
    email: "",
    solutionApiProdUrl: "",
    solutionApiDevUrl: "",
    registrationCode: "",
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem("jwt");
        if (!token) {
          throw new Error("No token found");
        }

        const response = await fetch(
          `http://localhost:3010/api/directory/companies/profile/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch profile data");
        }

        const data = await response.json();

        setProfileData(data.company);

        if (data.sentConnectionRequest) {
          setRequestStatus(RequestStatus.PENDING);
        } else if (data.connectedToCurrentCompany) {
          setRequestStatus(RequestStatus.ACCEPTED);
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

      const response = await fetch(
        "http://localhost:3010/api/directory/companies/create-connection-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ companyId: id }),
        }
      );

      if (!response.ok) {
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

  return (
    <>
      <Box
        style={{
          padding: "20px",
          maxWidth: "800px",
          margin: "0 auto",
          display: "flex",
          gap: "16px",
        }}
      >
        <Box
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
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
        <Box>
          {requestStatus === RequestStatus.ACCEPTED
            ? "You are connected with this supplier."
            : "When you click Connect, PACT Identity Management Service will send a request to this supplier, requesting their permission to create an authenticated connection between your PACT Conformant Solution and theirs."}
        </Box>
      </Box>
      <Box
        style={{
          padding: "20px",
          paddingTop: "0",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h2>Company Profile</h2>
        <div>
          <h3>Company Name</h3>
          <p>{profileData.companyName}</p>
        </div>
        <div>
          <h3>Company Identifier</h3>
          <p>{profileData.companyIdentifier}</p>
        </div>
        <div>
          <h3>Full Name</h3>
          <p>{profileData.fullName}</p>
        </div>
        <div>
          <h3>Email</h3>
          <p>{profileData.email}</p>
        </div>
        {requestStatus === RequestStatus.ACCEPTED && (
          <>
            <div>
              <h3>Solution API Prod URL</h3>
              <p>{profileData.solutionApiProdUrl}</p>
            </div>
            <div>
              <h3>Solution API Dev URL</h3>
              <p>{profileData.solutionApiDevUrl}</p>
            </div>
          </>
        )}
      </Box>
    </>
  );
};

export default CompanyProfile;
