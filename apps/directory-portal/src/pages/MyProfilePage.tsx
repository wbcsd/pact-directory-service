import React, { useEffect, useState } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  TextField as RadixTextField,
  Text,
  Callout,
  Spinner,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { useAuth } from "../contexts/AuthContext";
import { fetchWithAuth } from "../utils/auth-fetch";
import "../components/NodeForm.css";
import { FormPageLayout } from "../layouts";
import { TextField } from "../components/ui";

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

  return (
    <FormPageLayout
      title="My Profile"
      loading={!profileData}
      loadingMessage="Loading profile data..."
    >
          <Form.Root onSubmit={handleSubmit}>
            {/* Read-only Email */}
            <Box className="form-field">
              <Text className="field-label">Email Address</Text>
              <RadixTextField.Root
                value={profileData?.email}
                readOnly
                disabled
                className="readonly-field"
              />
            </Box>

            {/* Editable Full Name */}
            <TextField
              name="fullName"
              label="Full Name"
              required
              value={formData.fullName}
              placeholder="Enter your full name"
              tooltip="Your full name as it appears in the system"
              onChange={handleChange}
            />

            {/* Editable Organization Name */}
            <TextField
              name="organizationName"
              label="Organization Name"
              required
              value={formData.organizationName}
              placeholder="Enter Organization name"
              tooltip="Your organization name"
              onChange={handleChange}
            />

            {/* Editable Organization Description */}
            <TextField
              name="organizationDescription"
              label="Organization Description"
              value={formData.organizationDescription}
              placeholder="Enter Organization Description"
              tooltip="The organization description"
              onChange={handleChange}
            />

            {/* Editable Solution API URL */}
            <TextField
              name="solutionApiUrl"
              label="Organization Website"
              value={formData.solutionApiUrl}
              placeholder="Enter API URL"
              tooltip="The address of your organization's website"
              onChange={handleChange}
            />

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
    </FormPageLayout>
  );
};

export default MyProfilePage;