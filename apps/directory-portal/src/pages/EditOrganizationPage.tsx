import React, { useState, useEffect } from "react";
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
import { useNavigate, useParams } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import SideNav from "../components/SideNav";
import { useAuth } from "../contexts/AuthContext";
import { fetchWithAuth } from "../utils/auth-fetch";
import "./EditOrganizationPage.css";

export interface Organization {
  id: number;
  organizationName: string;
  organizationIdentifier: string;
  organizationDescription: string;
  networkKey: string;
}

const EditOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: organizationId } = useParams<{ id: string }>();
  const [formData, setFormData] = useState({
    organizationName: "",
    organizationDescription: "",
    networkKey: "",
  });
  const [readOnlyData, setReadOnlyData] = useState({
    id: 0,
    organizationIdentifier: "",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { profileData } = useAuth();

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!profileData) return;

      try {
        const response = await fetchWithAuth(
          `/organizations/${organizationId}`
        );

        if (response!.ok) {
          const organization: Organization = await response!.json();
          setFormData({
            organizationName: organization.organizationName,
            organizationDescription: organization.organizationDescription,
            networkKey: organization.networkKey,
          });
          setReadOnlyData({
            id: organization.id,
            organizationIdentifier: organization.organizationIdentifier,
          });
        } else {
          setErrorMessage("Failed to load organization data");
          setStatus("error");
        }
      } catch (error) {
        setErrorMessage("Error loading organization data");
        setStatus("error");
        console.error("An error occurred:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [organizationId, profileData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanedFormData = {
      ...formData,
    };

    try {
      setUpdating(true);

      const response = await fetchWithAuth(
        `/organizations/${organizationId}`,
        {
          method: "POST",
          body: JSON.stringify(cleanedFormData),
        }
      );

      setUpdating(false);

      if (response!.ok) {
        setStatus("success");
      } else {
        const errorResponse = await response!.json();
        if (errorResponse.message) {
          setErrorMessage(errorResponse.message);
        }
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("An error occurred while updating the organization");
      console.error("An error occurred:", error);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  if (loading) {
    return (
      <Box className="loading-container">
        <Spinner loading />
        <Text className="loading-text">Loading organization data...</Text>
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
          <h2>Edit Organization</h2>
        </div>
        <div>
          <Box className="form-container">
            <Form.Root onSubmit={handleSubmit}>
              {/* Read-only Organization ID */}
              <Box className="form-field">
                <Text className="field-label">Organization ID</Text>
                <TextField.Root
                  value={readOnlyData.id.toString()}
                  readOnly
                  disabled
                  className="readonly-field"
                />
              </Box>

              {/* Read-only Organization Identifier */}
              <Box className="form-field">
                <Text className="field-label">Organization Identifier</Text>
                <TextField.Root
                  value={readOnlyData.organizationIdentifier}
                  readOnly
                  disabled
                  className="readonly-field"
                />
              </Box>

              {/* Editable Organization Name */}
              <Form.Field name="organizationName">
                <Form.Label className="field-label">
                  Organization Name<span className="required-asterisk">*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.organizationName}
                    required
                    placeholder="Enter organization name"
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
                            The display name of the organization
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    </TextField.Slot>
                  </TextField.Root>
                </Form.Control>
                <Form.Message
                  match="valueMissing"
                  className="validation-message"
                >
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
                    placeholder="Enter organization description"
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
                            A brief description of the organization
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    </TextField.Slot>
                  </TextField.Root>
                </Form.Control>
              </Form.Field>

              {/* Editable API URL (networkKey) */}
              <Form.Field name="networkKey">
                <Form.Label className="field-label">
                  API URL<span className="required-asterisk">*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.networkKey}
                    required
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
                            The API endpoint URL for this organization
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    </TextField.Slot>
                  </TextField.Root>
                </Form.Control>
                <Form.Message
                  match="valueMissing"
                  className="validation-message"
                >
                  API URL is required.
                </Form.Message>
              </Form.Field>

              <Box className="button-group">
                <Button
                  type="button"
                  className="cancel-button"
                  onClick={() => navigate("/organizations")}
                >
                  Cancel
                </Button>
                <Form.Submit asChild>
                  <Button disabled={updating} className="submit-button">
                    {updating && <Spinner loading />}
                    {updating ? "Updating..." : "Save Changes"}
                  </Button>
                </Form.Submit>
              </Box>
            </Form.Root>

            {status === "success" && (
              <Callout.Root
                color="green"
                highContrast
                variant="surface"
                mt={"4"}
              >
                <Callout.Icon>
                  <CheckIcon />
                </Callout.Icon>
                <Callout.Text>
                  Organization updated successfully!
                </Callout.Text>
              </Callout.Root>
            )}

            {status === "error" && (
              <Callout.Root
                color="bronze"
                highContrast
                variant="surface"
                mt={"4"}
              >
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  {errorMessage ||
                    "Error updating organization, please try again."}
                </Callout.Text>
              </Callout.Root>
            )}
          </Box>
        </div>
      </main>
    </>
  );
};

export default EditOrganizationPage;