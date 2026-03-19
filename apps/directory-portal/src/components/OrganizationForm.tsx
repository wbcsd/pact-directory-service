import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  TextField as RadixTextField,
  Text,
  Callout,
  Spinner,
  Switch,
  Flex
} from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { FormField } from "../components/ui";

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
        <Form.Field name="organizationName">
          <Form.Label className="field-label">
            Organization Name<span className="required-asterisk">*</span>
          </Form.Label>
          <Form.Control asChild>
            <RadixTextField.Root
              autoComplete="off"
              value={formData.organizationName}
              required
              placeholder="Enter organization name"
              onChange={handleChange}
              className="editable-field"
            >
              <RadixTextField.Slot side="right">
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
              </RadixTextField.Slot>
            </RadixTextField.Root>
          </Form.Control>
          <Form.Message match="valueMissing" className="validation-message">
            Organization name is required.
          </Form.Message>
        </Form.Field>

        {/* Organization Description */}
        <Form.Field name="organizationDescription">
          <Form.Label className="field-label">
            Organization Description
          </Form.Label>
          <Form.Control asChild>
            <RadixTextField.Root
              autoComplete="off"
              value={formData.organizationDescription}
              placeholder="Enter organization description"
              onChange={handleChange}
              className="editable-field"
            >
              <RadixTextField.Slot side="right">
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
              </RadixTextField.Slot>
            </RadixTextField.Root>
          </Form.Control>
        </Form.Field>

        {/* Solution API URL */}
        <Form.Field name="solutionApiUrl">
          <Form.Label className="field-label">Solution API URL</Form.Label>
          <Form.Control asChild>
            <RadixTextField.Root
              autoComplete="off"
              value={formData.solutionApiUrl}
              type="url"
              placeholder="Enter solution API URL"
              onChange={handleChange}
              className="editable-field"
            >
              <RadixTextField.Slot side="right">
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
                      The API endpoint for the organization's solution
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </RadixTextField.Slot>
            </RadixTextField.Root>
          </Form.Control>
          <Form.Message match="typeMismatch" className="validation-message">
            Please enter a valid URL.
          </Form.Message>
        </Form.Field>

        {/* Status Toggle */}
        <FormField name="status" label="Status">
          <Flex gap="2">
          <Switch radius="large"
            checked={formData.status === "active"}
            onCheckedChange={handleStatusChange}
          />
          <Text size="2" color={formData.status === "active" ? "green" : "gray"}>
            {formData.status === "active" ? "Active" : "Disabled"}
          </Text>
          </Flex>
        </FormField>

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
