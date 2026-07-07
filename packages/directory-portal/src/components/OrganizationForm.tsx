import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Button,
  Flex,
  Text,
  Callout,
  Spinner,
  Switch,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { FormField, TextField } from "./ui";

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
      <Flex direction="column" align="center" justify="center" gap="3" py="7">
        <Spinner loading />
        <Text>Loading organization data...</Text>
      </Flex>
    );
  }

  return (
    <div>
      <Form.Root autoComplete="off" onSubmit={handleSubmit}>
        <FormField name="organizationName" label="Organization Name" required>
          <TextField
            required
            value={formData.organizationName}
            placeholder="Enter organization name"
            tooltip="The display name of the organization"
            onChange={handleChange}
          />
        </FormField>

        <FormField name="organizationDescription" label="Organization Description">
          <TextField
            value={formData.organizationDescription}
            placeholder="Enter organization description"
            tooltip="A brief description of the organization"
            onChange={handleChange}
          />
        </FormField>

        <FormField name="solutionApiUrl" label="Solution API URL">
          <TextField
            value={formData.solutionApiUrl}
            type="url"
            placeholder="Enter solution API URL"
            tooltip="The API endpoint for the organization's solution"
            onChange={handleChange}
          />
          <Form.Message match="typeMismatch">
            Please enter a valid URL.
          </Form.Message>
        </FormField>

        <FormField name="status" label="Status">
          <Flex gap="2">
            <Switch
              radius="large"
              checked={formData.status === "active"}
              onCheckedChange={handleStatusChange}
            />
            <Text size="2" color={formData.status === "active" ? "green" : "gray"}>
              {formData.status === "active" ? "Active" : "Disabled"}
            </Text>
          </Flex>
        </FormField>

        <Flex justify="end" gap="3" mt="6">
          {onCancel && (
            <Button type="button" color="jade" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Form.Submit asChild>
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner loading />}
              {submitting ? "Updating..." : "Update Organization"}
            </Button>
          </Form.Submit>
        </Flex>
      </Form.Root>

      {status === "success" && (
        <Callout.Root color="green" highContrast variant="surface" mt="4">
          <Callout.Icon>
            <CheckIcon />
          </Callout.Icon>
          <Callout.Text>Organization updated successfully!</Callout.Text>
        </Callout.Root>
      )}

      {status === "error" && (
        <Callout.Root color="bronze" highContrast variant="surface" mt="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {errorMessage || "Error updating organization, please try again."}
          </Callout.Text>
        </Callout.Root>
      )}
    </div>
  );
};

export default OrganizationForm;
