import React, { useEffect, useState } from "react";
import { Box } from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";

const MyProfile: React.FC = () => {
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState({
    companyName: "",
    companyIdentifier: "",
    fullName: "",
    email: "",
    solutionApiProdUrl: "",
    solutionApiDevUrl: "",
    registrationCode: "",
    clientId: "",
    clientSecret: "",
  });

  const [showCredentials, setShowCredentials] = useState(false);

  const toggleCredentials = () => {
    setShowCredentials((prevState) => !prevState);
  };

  const maskValue = (value: string) => {
    return value.replace(/.(?=.{4})/g, "*");
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem("jwt");
        if (!token) {
          navigate("/login");
        }
        // TODO: store api url properly in .env
        const response = await fetch(
          "http://localhost:3010/api/directory/companies/my-profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          // TODO show error message to user or redirect to login
          throw new Error("Failed to fetch profile data");
        }

        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    fetchProfileData();
  }, [navigate]);

  return (
    <Box
      style={{
        padding: "20px",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <h2>My Profile</h2>
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
      <div>
        <h3>Solution API Prod URL</h3>
        <p>{profileData.solutionApiProdUrl}</p>
      </div>
      <div>
        <h3>Solution API Dev URL</h3>
        <p>{profileData.solutionApiDevUrl}</p>
      </div>

      <h2>Credentials</h2>
      <a href="#" onClick={toggleCredentials} style={{ marginLeft: "10px" }}>
        {showCredentials ? "Hide Credentials" : "Show Credentials"}
      </a>
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
    </Box>
  );
};

export default MyProfile;
