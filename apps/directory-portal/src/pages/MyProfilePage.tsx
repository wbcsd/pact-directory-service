import React, { useEffect, useState } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  TextField,
  Text,
  Callout,
  Spinner,
} from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import SideNav from "../components/SideNav";
import { useAuth } from "../contexts/AuthContext";
import { fetchWithAuth } from "../utils/auth-fetch";
import "./MyProfilePage.css";

const MyProfilePage: React.FC = () => {
  const { profileData } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    solutionApiUrl: "",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  useEffect(() => {
    if (profileData) {
      setFormData({
        fullName: profileData.fullName || "",
        solutionApiUrl: profileData.solutionApiUrl || "",
      });
    }
  }, [profileData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setErrorMessage("");

    try {
      setUpdating(true);
      const updatePromises = [];

      // Queue an update for full name if changed
      if (formData.fullName !== profileData?.fullName && formData.fullName.trim() !== "") {
        updatePromises.push(async () => {
          const response = await fetchWithAuth(`/organizations/${profileData?.organizationId}/users/${profileData?.id}`, {
            method: "POST",
            body: JSON.stringify({ fullName: formData.fullName }),
          });
          return response!.ok;
         }
        );
      }

      // Queue an update for solution API URL if changed
      if (formData.solutionApiUrl !== profileData?.solutionApiUrl && formData.solutionApiUrl.trim() !== "") {
        updatePromises.push(async () => {
          const response = await fetchWithAuth(`/organizations/${profileData?.organizationId}`, {
            method: "POST",
            body: JSON.stringify({ solutionApiUrl: formData.solutionApiUrl }),
          });
          return response!.ok;
        });
      }

      const results = await Promise.all(updatePromises.map((fn) => fn()));
      const allSuccessful = results.every((res) => res === true);

      if (allSuccessful) {
        setStatus("success");
      } else {
        setErrorMessage("Failed to update profile");
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("An error occurred while updating your profile");
      console.error("An error occurred:", error);
    }
  };

  if (!profileData) {
    return (
      <Box className="loading-container">
        <Spinner loading />
        <Text className="loading-text">Loading profile data...</Text>
      </Box>
    );
  }

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <h2>My Profile</h2>
        </div>

        <Box className="form-container">
          <Form.Root onSubmit={handleSubmit}>
            {/* Read-only User ID */}
            <Box className="form-field">
              <Text className="field-label">User ID</Text>
              <TextField.Root
                value={profileData.id.toString()}
                readOnly
                disabled
                className="readonly-field"
              />
            </Box>

            {/* Read-only Email */}
            <Box className="form-field">
              <Text className="field-label">Email Address</Text>
              <TextField.Root
                value={profileData.email}
                readOnly
                disabled
                className="readonly-field"
              />
            </Box>

            {/* Editable Full Name */}
            <Form.Field name="fullName">
              <Form.Label className="field-label">
                Full Name<span className="required-asterisk">*</span>
              </Form.Label>
              <Form.Control asChild>
                <TextField.Root
                  value={formData.fullName}
                  required
                  placeholder="Enter your full name"
                  onChange={handleChange}
                  className="editable-field"
                >
                  <TextField.Slot side="right">
                    <Tooltip.Provider delayDuration={0}>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <InfoCircledIcon
                            width={20}
                            height={20}
                            color="#0A0552"
                            className="info-icon"
                          />
                        </Tooltip.Trigger>
                        <Tooltip.Content
                          className="TooltipContent"
                          side="right"
                          align="center"
                          sideOffset={5}
                        >
                          Your full name as it appears in the system
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </TextField.Slot>
                </TextField.Root>
              </Form.Control>
              <Form.Message match="valueMissing" className="validation-message">
                Full name is required.
              </Form.Message>
            </Form.Field>

            {/* Read-only Organization Name */}
            <Box className="form-field">
              <Text className="field-label">Organization Name</Text>
              <TextField.Root
                value={profileData.organizationName || ""}
                readOnly
                disabled
                className="readonly-field"
              />
            </Box>

            {/* Read-only Organization Identifier */}
            <Box className="form-field">
              <Text className="field-label">Organization Identifier</Text>
              <TextField.Root
                value={profileData.organizationIdentifier || ""}
                readOnly
                disabled
                className="readonly-field"
              />
            </Box>

            {/* Read-only Organization Description */}
            <Box className="form-field">
              <Text className="field-label">Organization Description</Text>
              <TextField.Root
                value={profileData.organizationDescription || "No description available"}
                readOnly
                disabled
                className="readonly-field"
              />
            </Box>

            {/* Editable Solution API URL */}
            <Form.Field name="solutionApiUrl">
              <Form.Label className="field-label">
                Solution API URL
              </Form.Label>
              <Form.Control asChild>
                <TextField.Root
                  value={formData.solutionApiUrl}
                  placeholder="Enter API URL"
                  onChange={handleChange}
                  className="editable-field"
                >
                  <TextField.Slot side="right">
                    <Tooltip.Provider delayDuration={0}>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <InfoCircledIcon
                            width={20}
                            height={20}
                            color="#0A0552"
                            className="info-icon"
                          />
                        </Tooltip.Trigger>
                        <Tooltip.Content
                          className="TooltipContent"
                          side="right"
                          align="center"
                          sideOffset={5}
                        >
                          The API endpoint URL for your organization
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </TextField.Slot>
                </TextField.Root>
              </Form.Control>
            </Form.Field>

            <Box className="button-group">
              <Form.Submit asChild>
                <Button disabled={updating} className="submit-button">
                  {updating && <Spinner loading />}
                  {updating ? "Updating..." : "Save Changes"}
                </Button>
              </Form.Submit>
            </Box>
          </Form.Root>

          {status === "success" && (
            <Callout.Root color="green" highContrast variant="surface" mt="4">
              <Callout.Icon>
                <CheckIcon />
              </Callout.Icon>
              <Callout.Text>Profile updated successfully!</Callout.Text>
            </Callout.Root>
          )}

          {status === "error" && (
            <Callout.Root color="bronze" highContrast variant="surface" mt="4">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                {errorMessage || "Error updating profile, please try again."}
              </Callout.Text>
            </Callout.Root>
          )}
        </Box>
      </main>
    </>
  );
};

export default MyProfilePage;