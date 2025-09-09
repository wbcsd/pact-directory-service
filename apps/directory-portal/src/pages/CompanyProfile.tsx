import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button } from "@radix-ui/themes";
import SideNav from "../components/SideNav";
import { fetchWithAuth } from "../utils/auth-fetch";
import Spinner from "../components/LoadingSpinner";
import { useTranslation } from "react-i18next";

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
    networkKey: "",
  });

  const { t } = useTranslation();

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
    [RequestStatus.PENDING]: "companyprofile.status.pending",
    [RequestStatus.NOREQUEST]: "companyprofile.status.norequest",
    [RequestStatus.ACCEPTED]: "companyprofile.status.accepted",
  };

  const connectionStatusTextMapping = {
    [RequestStatus.PENDING]: "companyprofile.requeststatus.pending",
    [RequestStatus.NOREQUEST]: "companyprofile.requeststatus.norequest",
    [RequestStatus.ACCEPTED]: "companyprofile.requeststatus.accepted",
    [RequestStatus.RECEIVED]: "companyprofile.requeststatus.received",
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
            <h2>{profileData.companyName}</h2>
          </div>

          {requestStatus === RequestStatus.RECEIVED ? (
            <Box
              style={{
                marginBottom: "20px",
              }}
            >
              {t(connectionStatusTextMapping[RequestStatus.RECEIVED])}
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
                  {t(statusLabelMapping[requestStatus])}
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
                {t(connectionStatusTextMapping[requestStatus])}
              </Box>
            </Box>
          )}

          <Box>
            <div>
              <h3>{t("companyprofile.profile.companyIdentifier")}</h3>
              <p>{profileData.companyIdentifier}</p>
            </div>
            <div>
              <h3>
                {t("companyprofile.profile.companyIdentifierDescription")}
              </h3>
              <p>{profileData.companyIdentifierDescription}</p>
            </div>
            <div>
              <h3>{t("companyprofile.profile.fullName")}</h3>
              <p>{profileData.fullName}</p>
            </div>
            <div>
              <h3>{t("companyprofile.profile.adminEmail")}</h3>
              <p>{profileData.email}</p>
            </div>
            {requestStatus === RequestStatus.ACCEPTED && (
              <>
                <h2 style={{ margin: 0, marginTop: "20px" }}>
                  Api Configuration
                </h2>
                <div>
                  <h3>{t("companyprofile.profile.networKey")}</h3>
                  <p>{profileData.networkKey}</p>
                </div>
                <div>
                  <h3>{t("companyprofile.profile.solutionApiUrl")}</h3>
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
