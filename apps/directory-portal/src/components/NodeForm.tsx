import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  TextField,
  Text,
  Callout,
  Spinner,
  Tooltip,
  Select,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useAuth } from "../contexts/AuthContext";
import "./NodeForm.css";

enum NodeType {
  INTERNAL = "internal",
  EXTERNAL = "external",
}

export interface NodeFormData {
  name: string;
  type: NodeType;
  apiUrl?: string;
}

interface NodeFormProps {
  /** When set, the form loads and edits an existing node. When absent, creates a new one. */
  nodeId?: number | string;
  /** Called after a successful save. Receives the saved node data. */
  onSaved?: (node: unknown) => void;
  /** Called when the user clicks Cancel. */
  onCancel?: () => void;
}

const NodeForm: React.FC<NodeFormProps> = ({ nodeId, onSaved, onCancel }) => {
  const isEditMode = nodeId != null;
  const { profileData } = useAuth();

  const [formData, setFormData] = useState<NodeFormData>({
    name: "",
    type: NodeType.INTERNAL,
    apiUrl: "",
  });
  const [readOnlyOrganization, setReadOnlyOrganization] = useState("");
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  // Load existing node data for edit mode
  const loadNode = useCallback(async () => {
    if (!isEditMode) return;
    try {
      const response = await fetchWithAuth(`/nodes/${nodeId}`);
      if (response!.ok) {
        const node = await response!.json();
        setFormData({
          name: node.name,
          type: node.type,
          apiUrl: node.apiUrl || "",
        });
        setReadOnlyOrganization(node.organizationName || "");
      } else {
        setErrorMessage("Failed to load node data");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Error loading node data");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, [nodeId, isEditMode]);

  useEffect(() => {
    loadNode();
  }, [loadNode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setStatus(null);
      setErrorMessage("");

      const dataToSend: NodeFormData = {
        name: formData.name,
        type: formData.type,
      };
      if (formData.type === NodeType.EXTERNAL && formData.apiUrl) {
        dataToSend.apiUrl = formData.apiUrl;
      }

      const url = isEditMode
        ? `/nodes/${nodeId}`
        : `/organizations/${profileData?.organizationId}/nodes`;
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(dataToSend),
      });

      setSubmitting(false);

      if (response!.ok) {
        const savedNode = await response!.json();
        setStatus("success");
        onSaved?.(savedNode);
      } else {
        const errorResponse = await response!.json();
        setErrorMessage(
          errorResponse.message ||
            `Failed to ${isEditMode ? "update" : "create"} node`
        );
        setStatus("error");
      }
    } catch {
      setStatus("error");
      setErrorMessage(
        `An error occurred while ${isEditMode ? "updating" : "creating"} the node`
      );
      setSubmitting(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      type: value as NodeType,
      apiUrl: value === NodeType.INTERNAL ? "" : prev.apiUrl,
    }));
  };

  const isExternalNode = formData.type === NodeType.EXTERNAL;
  const organizationName =
    readOnlyOrganization || profileData?.organizationName || "";

  if (loading) {
    return (
      <Box className="node-form-loading">
        <Spinner loading />
        <Text>Loading node data...</Text>
      </Box>
    );
  }

  return (
    <Box className="node-form">
      <Form.Root autoComplete="off" onSubmit={handleSubmit}>
        {/* Name */}
        <Form.Field name="name">
          <Form.Label className="field-label">
            Node Name<span className="required-asterisk">*</span>
          </Form.Label>
          <Form.Control asChild>
            <TextField.Root
              autoComplete="off"
              value={formData.name}
              required
              placeholder="Enter node name"
              onChange={handleChange}
              className="editable-field"
            >
              <TextField.Slot side="right">
                <Tooltip content="The name of the node" side="right" delayDuration={0}>
                  <InfoCircledIcon
                    width={20}
                    height={20}
                    color="var(--accent-12)"
                    className="info-icon"
                  />
                </Tooltip>
              </TextField.Slot>
            </TextField.Root>
          </Form.Control>
          <Form.Message match="valueMissing" className="validation-message">
            Node name is required.
          </Form.Message>
        </Form.Field>

        {/* Type */}
        <Box className="form-field">
          <Text className="field-label">
            Node Type<span className="required-asterisk">*</span>
          </Text>
          <Select.Root
            value={formData.type}
            onValueChange={handleTypeChange}
          >
            <Select.Trigger placeholder="Select a node type" />
            <Select.Content position="popper">
              <Select.Item value={NodeType.INTERNAL}>Internal</Select.Item>
              <Select.Item value={NodeType.EXTERNAL}>External</Select.Item>
            </Select.Content>
          </Select.Root>
        </Box>

        {/* API URL (external only) */}
        {isExternalNode && (
          <Form.Field name="apiUrl">
            <Form.Label className="field-label">
              API URL<span className="required-asterisk">*</span>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                autoComplete="off"
                value={formData.apiUrl}
                required={isExternalNode}
                type="url"
                placeholder="Enter API URL"
                onChange={handleChange}
                className="editable-field"
              >
                <TextField.Slot side="right">
                  <Tooltip content="The API URL for the external node" side="right" delayDuration={0}>
                    <InfoCircledIcon
                      width={20}
                      height={20}
                      color="var(--accent-12)"
                      className="info-icon"
                    />
                  </Tooltip>
                </TextField.Slot>
              </TextField.Root>
            </Form.Control>
            <Form.Message match="valueMissing" className="validation-message">
              API URL is required for external nodes.
            </Form.Message>
            <Form.Message match="typeMismatch" className="validation-message">
              Please enter a valid URL.
            </Form.Message>
          </Form.Field>
        )}

        {/* Organization (read-only) */}
        <Box className="form-field">
          <Text className="field-label">Organization</Text>
          <TextField.Root
            value={organizationName}
            readOnly
            disabled
            className="readonly-field"
          />
        </Box>

        {/* Actions */}
        <Box className="node-form-actions">
          {onCancel && (
            <Button
              type="button"
              className="cancel-button"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Form.Submit asChild>
            <Button disabled={submitting} className="submit-button">
              {submitting && <Spinner loading />}
              {submitting
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                  ? "Save Changes"
                  : "Create Node"}
            </Button>
          </Form.Submit>
        </Box>
      </Form.Root>

      {status === "success" && (
        <Callout.Root color="green" highContrast variant="surface" mt="4">
          <Callout.Icon>
            <CheckIcon />
          </Callout.Icon>
          <Callout.Text>
            {isEditMode
              ? "Node updated successfully!"
              : "Node created successfully!"}
          </Callout.Text>
        </Callout.Root>
      )}

      {status === "error" && (
        <Callout.Root color="bronze" highContrast variant="surface" mt="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {errorMessage ||
              `Error ${isEditMode ? "updating" : "creating"} node, please try again.`}
          </Callout.Text>
        </Callout.Root>
      )}
    </Box>
  );
};

export default NodeForm;
