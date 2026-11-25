import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  Text,
  Callout,
  Flex,
  Grid,
  Spinner,
  Select,
  Switch
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  CheckIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useAuth } from "../contexts/AuthContext";
import { FormField, TextField, SelectField } from "../components/ui";

enum NodeType {
  INTERNAL = "internal",
  EXTERNAL = "external",
}

const VERSION_OPTIONS = [
  { value: "V2.0", label: "2.0" },
  { value: "V2.1", label: "2.1" },
  { value: "V2.2", label: "2.2" },
  { value: "V2.3", label: "2.3" },
  { value: "V3.0", label: "3.0" },
];

export interface NodeFormData {
  name: string;
  type: NodeType;
  apiUrl?: string;
  authBaseUrl?: string;
  scope?: string;
  audience?: string;
  resource?: string;
  specVersion?: string;
  discoverable: boolean;
  organizationId?: number;
}

interface Organization {
  id: number;
  organizationName: string;
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
  // const isRoot = profileData?.role === "root";
  const isRoot = profileData?.policies?.includes("view-nodes-all-organizations") ?? false;
  //const isRoot = true;

  const [formData, setFormData] = useState<NodeFormData>({
    name: "",
    type: NodeType.INTERNAL,
    apiUrl: "",
    authBaseUrl: "",
    scope: "",
    audience: "",
    resource: "",
    specVersion: "V3.0",
    discoverable: false,
    organizationId: isRoot ? undefined : profileData?.organizationId,
  });
  const [readOnlyOrganization, setReadOnlyOrganization] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(isEditMode || (isRoot && !isEditMode));
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
          authBaseUrl: node.authBaseUrl || "",
          scope: node.scope || "",
          audience: node.audience || "",
          resource: node.resource || "",
          specVersion: node.specVersion || "",
          discoverable: node.discoverable ?? false,
          organizationId: node.organizationId,
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

  const loadOrganizations = useCallback(async () => {
    if (!isRoot || isEditMode) return;
    try {
      const response = await fetchWithAuth("/organizations");
      if (response!.ok) {
        const result = await response!.json();
        const orgs = result.data || [];
        setOrganizations(orgs);
        if (orgs.length > 0 && !formData.organizationId) {
          const currentOrgId = profileData?.organizationId;
          const selectedOrgId = currentOrgId && orgs.some(o => o.id === currentOrgId)
            ? currentOrgId
            : orgs[0].id;
          setFormData((prev) => ({ ...prev, organizationId: selectedOrgId }));
        }
      } else {
        setErrorMessage("Failed to load organizations");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Error loading organizations");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, [isRoot, isEditMode, formData.organizationId, profileData?.organizationId]);

  useEffect(() => {
    if (isEditMode) {
      loadNode();
    } else if (isRoot) {
      loadOrganizations();
    } else {
      setLoading(false);
    }
  }, [loadNode, loadOrganizations, isEditMode, isRoot]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setStatus(null);
      setErrorMessage("");

      const dataToSend: NodeFormData = {
        name: formData.name,
        type: formData.type,
        discoverable: formData.discoverable,
      };
      if (formData.type === NodeType.EXTERNAL && formData.apiUrl) {
        dataToSend.apiUrl = formData.apiUrl;
      }
      if (formData.type === NodeType.EXTERNAL) {
        if (formData.authBaseUrl) dataToSend.authBaseUrl = formData.authBaseUrl;
        if (formData.scope) dataToSend.scope = formData.scope;
        if (formData.audience) dataToSend.audience = formData.audience;
        if (formData.resource) dataToSend.resource = formData.resource;
        if (formData.specVersion) dataToSend.specVersion = formData.specVersion;
      }

      const organizationId = isEditMode
        ? (formData.organizationId || profileData?.organizationId)
        : (formData.organizationId || profileData?.organizationId);

      const url = isEditMode
        ? `/nodes/${nodeId}`
        : `/organizations/${organizationId}/nodes`;
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
      authBaseUrl: value === NodeType.INTERNAL ? "" : prev.authBaseUrl,
      scope: value === NodeType.INTERNAL ? "" : prev.scope,
      audience: value === NodeType.INTERNAL ? "" : prev.audience,
      resource: value === NodeType.INTERNAL ? "" : prev.resource,
      specVersion: value === NodeType.INTERNAL ? "" : prev.specVersion,
    }));
  };

  const isExternalNode = formData.type === NodeType.EXTERNAL;

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

      {/* Intro text */}
      <Box mb="4">
        <Text as="p" size="2">
          A Node represents a PACT-conformant solution endpoint in the PACT Network.
          An <strong>internal</strong> node belongs to your own organization and is hosted within the PACT Directory.
          An <strong>external</strong> node is a PACT-conformant endpoint hosted outside this system that you register for network connectivity.
        </Text>
      </Box>

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

      {/* Organization (read-only for edit mode, selectable for root in create mode) */}
      {isRoot && !isEditMode && (
        <FormField name="organization" label="Organization" required>
          <Select.Root
            value={formData.organizationId?.toString() || ""}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, organizationId: parseInt(value) }))
            }
          >
            <Select.Trigger />
            <Select.Content>
              {organizations.map((org) => (
                <Select.Item key={org.id} value={org.id.toString()}>
                  {org.organizationName}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </FormField>
      )}

      {/* Organization (read-only in edit mode) */}
      {isRoot && isEditMode && (
        <FormField name="organization" label="Organization">
          <TextField
            name="organization"
            value={readOnlyOrganization}
            disabled
          />
        </FormField>
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

      {/* Auth fields (external only) */}
      {isExternalNode && (
        <>
          <FormField name="authBaseUrl" label="Auth Base URL">
            <TextField
              value={formData.authBaseUrl || ""}
              type="url"
              placeholder="e.g. https://auth.example.com"
              tooltip="The base URL of the OAuth2 authorization server"
              onChange={handleChange}
            />
            <Form.Message match="typeMismatch" className="validation-message">
              Please enter a valid URL.
            </Form.Message>
          </FormField>
          <Callout.Root variant="soft" mb="4">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              The client ID and secret issued to you by this node's operator are
              stored on the connection that uses them, not on the node. Add them
              when you create a connection to this node.
            </Callout.Text>
          </Callout.Root>
          <Grid columns={{ initial: "1", sm: "3" }} gap="3">
            <FormField name="scope" label="Scope">
              <TextField
                value={formData.scope || ""}
                placeholder="all:read"
                tooltip="OAuth2 scope to request when authenticating"
                onChange={handleChange}
              />
            </FormField>
            <FormField name="audience" label="Audience">
              <TextField
                value={formData.audience || ""}
                placeholder="https://api.example.com"
                tooltip="OAuth2 audience parameter"
                onChange={handleChange}
              />
            </FormField>
            <FormField name="resource" label="Resource">
              <TextField
                value={formData.resource || ""}
                placeholder="https://api.example.com"
                tooltip="OAuth2 resource parameter"
                onChange={handleChange}
              />
            </FormField>
          </Grid>
          <FormField
            name="specVersion"
            label="Supported Version">
            <SelectField
              value={formData.specVersion || "V3.0"}
              options={VERSION_OPTIONS}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, specVersion: value }))
              }
            />
          </FormField>
        </>
      )}

      {/* Discoverable */}
      <Flex align="center" gap="3" mt="2">
        <Switch
          id="discoverable"
          checked={formData.discoverable}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, discoverable: checked }))
          }
        />
        <Box>
          <Text as="label" htmlFor="discoverable" size="2" weight="medium">
            Discoverable on PACT Network
          </Text>
          <Text as="p" size="1" color="gray">
            Allow organizations outside yours to find and connect to this node.
          </Text>
        </Box>
      </Flex>

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
