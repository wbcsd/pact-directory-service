import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import * as Switch from "@radix-ui/react-switch";
import {
  Box,
  Button,
  Text,
  Callout,
  Spinner,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { TextField, TooltipIcon } from "../components/ui";
import "./NodeForm.css"; // Reuse the same CSS

export interface OrganizationFormData {
  organizationName: string;
  organizationDescription: string;
  solutionApiUrl: string;
  status: "active" | "disabled";
}

interface OrganizationFormProps {
  /** When set, the form loads and edits an existing organization. */
  organizationId?: number | string;
  /** Called after a successful save. Receives the saved organization data. */
  onSaved?: (organization: unknown) => void;
  /** Called when the user clicks Cancel. */
  onCancel?: () => void;
}

const OrganizationForm: React.FC<OrganizationFormProps> = ({
  organizationId,
  onSaved,
  onCancel,
}) => {
  const isEditMode = organizationId != null;

  const [formData, setFormData] = useState<OrganizationFormData>({
    organizationName: "",
    organizationDescription: "",
    solutionApiUrl: "",
    status: "active",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  // Load existing organization data for edit mode
  const loadOrganization = useCallback(async () => {
    if (!isEditMode) return;
    try {
      const response = await fetchWithAuth(`/organizations/${organizationId}`);
      if (response!.ok) {
        const org = await response!.json();
        setFormData({
          organizationName: org.organizationName,
          organizationDescription: org.organizationDescription,
          solutionApiUrl: org.solutionApiUrl || "",
          status: org.status,
        });
      } else {
        setErrorMessage("Failed to load organization data");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Error loading organization data");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, [organizationId, isEditMode]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setStatus(null);
      setErrorMessage("");

      const response = await fetchWithAuth(`/organizations/${organizationId}`, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setSubmitting(false);

      if (response!.ok) {
        const savedOrg = await response!.json();
        setStatus("success");
        onSaved?.(savedOrg);
      } else {
        const errorResponse = await response!.json();
        setErrorMessage(
          errorResponse.message || "Failed to update organization"
        );
        setStatus("error");
      }
    } catch {
      setStatus("error");
      setErrorMessage("An error occurred while updating the organization");
      setSubmitting(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      status: checked ? "active" : "disabled",
    }));
  };

  if (loading) {
    return (
      <Box className="node-form-loading">
        <Spinner loading />
        <Text>Loading organization data...</Text>
      </Box>
    );
  }

  return (
    <Box className="node-form">
      <Form.Root autoComplete="off" onSubmit={handleSubmit}>
        {/* Organization Name */}
        <TextField
          name="organizationName"
          label="Organization Name"
          required
          value={formData.organizationName}
          placeholder="Enter organization name"
          tooltip="The display name of the organization"
          onChange={handleChange}
        />

        {/* Organization Description */}
        <TextField
          name="organizationDescription"
          label="Organization Description"
          value={formData.organizationDescription}
          placeholder="Enter organization description"
          tooltip="A brief description of the organization"
          onChange={handleChange}
        />

        {/* Solution API URL */}
        <TextField
          name="solutionApiUrl"
          label="Solution API URL"
          value={formData.solutionApiUrl}
          type="url"
          placeholder="Enter solution API URL"
          tooltip="The API endpoint for the organization's solution"
          onChange={handleChange}
          customErrors={
            <Form.Message match="typeMismatch" className="validation-message">
              Please enter a valid URL.
            </Form.Message>
          }
        />

        {/* Status Toggle */}
        <Box className="form-field">
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text className="field-label">
              Status
              <TooltipIcon text="Enable or disable the organization" />
            </Text>
            <Box style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Text size="2" color={formData.status === "active" ? "green" : "gray"}>
                {formData.status === "active" ? "Active" : "Disabled"}
              </Text>
              <Switch.Root
                checked={formData.status === "active"}
                onCheckedChange={handleStatusChange}
                className="switch-root"
              >
                <Switch.Thumb className="switch-thumb" />
              </Switch.Root>
            </Box>
          </Box>
        </Box>

        <Box className="button-group">
          <Button 
            type="button" 
            variant="soft"
            color="gray"
            className="cancel-button" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Form.Submit asChild>
            <Button 
              disabled={submitting} 
              variant="soft"
              className="submit-button"
            >
              {submitting && <Spinner loading />}
              {submitting ? "Updating..." : "Update Organization"}
            </Button>
          </Form.Submit>
        </Box>
      </Form.Root>

      {status === "success" && (
        <Callout.Root color="green" highContrast variant="surface" mt={"4"}>
          <Callout.Icon>
            <CheckIcon />
          </Callout.Icon>
          <Callout.Text>Organization updated successfully!</Callout.Text>
        </Callout.Root>
      )}

      {status === "error" && (
        <Callout.Root color="bronze" highContrast variant="surface" mt={"4"}>
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {errorMessage || "Error updating organization, please try again."}
          </Callout.Text>
        </Callout.Root>
      )}
    </Box>
  );
};

export default OrganizationForm;
