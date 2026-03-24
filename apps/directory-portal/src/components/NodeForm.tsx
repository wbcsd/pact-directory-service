import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  Text,
  Callout,
  Flex,
  Spinner,
  Select
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useAuth } from "../contexts/AuthContext";
import { FormField, TextField } from "../components/ui";

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
    <Form.Root autoComplete="off" onSubmit={handleSubmit}>

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

      {/* Name */}
      <FormField name="name" label="Node Name" required>
        <TextField
          required
          value={formData.name}
          placeholder="Enter node name"
          tooltip="The name of the node"
          onChange={handleChange}
        />
      </FormField>

      {/* Type */}
      <FormField name="type" label="Node Type" required>
        <Select.Root value={formData.type} onValueChange={handleTypeChange}>
          <Select.Trigger/>
          <Select.Content>
            <Select.Item value={NodeType.INTERNAL}>Internal</Select.Item>
            <Select.Item value={NodeType.EXTERNAL}>External</Select.Item>
          </Select.Content>
        </Select.Root>
      </FormField>

      {/* API URL (external only) */}
      {isExternalNode && (
        <FormField name="apiUrl" label="API URL" required>
          <TextField
            required
            value={formData.apiUrl || ""}
            type="url"
            placeholder="Enter API URL"
            tooltip="The API URL for the external node"
            onChange={handleChange}
          />                  
          <Form.Message match="typeMismatch" className="validation-message">
            Please enter a valid URL.
          </Form.Message>
        </FormField>
      )}

      {/* Organization (read-only) */}        
      <TextField
        name="organization"
        value={organizationName}
        disabled
      />

      {/* Actions */}
      <Flex gap="3" mt="2" justify="end">
        {onCancel && (
          <Box>
          <Button type="button" color="jade" onClick={onCancel}>
            Cancel
          </Button></Box>
        )}
        <Form.Submit asChild>
          <Button type="submit" disabled={submitting}>
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
      </Flex>
    </Form.Root>
  );
};

export default NodeForm;
