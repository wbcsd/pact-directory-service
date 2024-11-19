import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box } from "@radix-ui/themes";

const CompanyProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    fetchProfileData();
  }, [id]);

  return (
    <Box
      style={{
        padding: "20px",
        maxWidth: "600px",
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
      <div>
        <h3>Solution API Prod URL</h3>
        <p>{profileData.solutionApiProdUrl}</p>
      </div>
      <div>
        <h3>Solution API Dev URL</h3>
        <p>{profileData.solutionApiDevUrl}</p>
      </div>
    </Box>
  );
};

export default CompanyProfile;
