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
    organizationName: "",
    organizationDescription: "",
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
        organizationDescription: profileData.organizationDescription || "",
        organizationName: profileData.organizationName || "",
      });
    }
  }, [profileData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setErrorMessage("");
    setUpdating(true);

    try {
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

      // Queue an update for organization description if changed
      if (formData.organizationDescription !== profileData?.organizationDescription && formData.organizationDescription.trim() !== "") {
        updatePromises.push(async () => {
          const response = await fetchWithAuth(`/organizations/${profileData?.organizationId}`, {
            method: "POST",
            body: JSON.stringify({ organizationDescription: formData.organizationDescription }),
          });
          return response!.ok;
        });
      }

      // Queue an update for organization name if changed
      if (formData.organizationName !== profileData?.organizationName && formData.organizationName.trim() !== "") {
        updatePromises.push(async () => {
          const response = await fetchWithAuth(`/organizations/${profileData?.organizationId}`, {
            method: "POST",
            body: JSON.stringify({ organizationName: formData.organizationName }),
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
    } finally {
      setUpdating(false);
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

            {/* Editable Organization Name */}
            <Form.Field name="organizationName">
              <Form.Label className="field-label">
                Organization Name<span className="required-asterisk">*</span>
              </Form.Label>
              <Form.Control asChild>
                <TextField.Root
                  value={formData.organizationName}
                  required
                  placeholder="Enter Organization name"
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
                          Your organization name
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </TextField.Slot>
                </TextField.Root>
              </Form.Control>
              <Form.Message match="valueMissing" className="validation-message">
                Organization name is required.
              </Form.Message>
            </Form.Field>

            {/* Editable Organization Description */}
            <Form.Field name="organizationDescription">
              <Form.Label className="field-label">
                Organization Description
              </Form.Label>
              <Form.Control asChild>
                <TextField.Root
                  value={formData.organizationDescription}
                  placeholder="Enter Organization Description"
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
                          The organization description
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </TextField.Slot>
                </TextField.Root>
              </Form.Control>
            </Form.Field>

            {/* Editable Solution API URL */}
            <Form.Field name="solutionApiUrl">
              <Form.Label className="field-label">
                Organization Website
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
                          The address of your organization's website
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