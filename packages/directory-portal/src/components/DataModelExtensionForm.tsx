import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Button,
  Code,
  Flex,
  Text,
  Callout,
  ScrollArea,
  Spinner,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  CheckIcon,
  DownloadIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { FormField, TextField, SelectField } from "./ui";
import type {
  DataModelExtension,
  DataModelExtensionFormData,
} from "../types/dataModelExtension";

const SPEC_VERSION_OPTIONS = [
  { value: "2.0.0", label: "2.0.0" },
  { value: "1.0.0", label: "1.0.0" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "deprecated", label: "Deprecated" },
];

const EMPTY_FORM: DataModelExtensionFormData = {
  name: "",
  dataSchemaUrl: "",
  documentationUrl: "",
  specVersion: "2.0.0",
  version: "",
  description: "",
  author: "",
  contactEmail: "",
  status: "active",
};

interface DataModelExtensionFormProps {
  /** When set, the form loads and edits an existing extension. */
  extensionId?: number | string;
  onSaved?: (extension: DataModelExtension) => void;
  onCancel?: () => void;
}

const DataModelExtensionForm: React.FC<DataModelExtensionFormProps> = ({
  extensionId,
  onSaved,
  onCancel,
}) => {
  const isEditMode = extensionId != null;

  const [formData, setFormData] =
    useState<DataModelExtensionFormData>(EMPTY_FORM);
  const [schemaJson, setSchemaJson] = useState<Record<string, unknown> | null>(
    null
  );
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingSchema, setFetchingSchema] = useState(false);
  const [schemaMessage, setSchemaMessage] = useState("");

  const loadExtension = useCallback(async () => {
    if (!isEditMode) return;
    try {
      const response = await fetchWithAuth(
        `/data-model-extensions/${extensionId}`
      );
      if (response!.ok) {
        const extension: DataModelExtension = await response!.json();
        setFormData({
          name: extension.name,
          dataSchemaUrl: extension.dataSchemaUrl,
          documentationUrl: extension.documentationUrl || "",
          specVersion: extension.specVersion || "2.0.0",
          version: extension.version || "",
          description: extension.description || "",
          author: extension.author || "",
          contactEmail: extension.contactEmail || "",
          status: extension.status,
        });
        setSchemaJson(extension.schemaJson);
      } else {
        setErrorMessage("Failed to load data model extension");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Error loading data model extension");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, [extensionId, isEditMode]);

  useEffect(() => {
    loadExtension();
  }, [loadExtension]);

  const handleFetchSchema = async () => {
    setSchemaMessage("");
    setFetchingSchema(true);
    try {
      const response = await fetchWithAuth(
        "/data-model-extensions/fetch-schema",
        {
          method: "POST",
          body: JSON.stringify({ dataSchemaUrl: formData.dataSchemaUrl }),
        }
      );
      const body = await response!.json();
      if (response!.ok) {
        setSchemaJson(body.schemaJson);
        setFormData((prev) => ({
          ...prev,
          name: prev.name || body.name || "",
          description: prev.description || body.description || "",
        }));
        setSchemaMessage("Schema retrieved successfully.");
      } else {
        setSchemaMessage(body.message || "Failed to retrieve schema");
      }
    } catch {
      setSchemaMessage("An error occurred while retrieving the schema");
    } finally {
      setFetchingSchema(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setStatus(null);
      setErrorMessage("");

      const response = await fetchWithAuth(
        isEditMode
          ? `/data-model-extensions/${extensionId}`
          : "/data-model-extensions",
        {
          method: isEditMode ? "PUT" : "POST",
          body: JSON.stringify({
            name: formData.name,
            dataSchemaUrl: formData.dataSchemaUrl,
            documentationUrl: formData.documentationUrl || null,
            specVersion: formData.specVersion,
            version: formData.version || null,
            description: formData.description || null,
            author: formData.author || null,
            contactEmail: formData.contactEmail || null,
            status: formData.status,
            schemaJson,
          }),
        }
      );

      setSubmitting(false);

      if (response!.ok) {
        const saved: DataModelExtension = await response!.json();
        setStatus("success");
        onSaved?.(saved);
      } else {
        const errorResponse = await response!.json();
        setErrorMessage(
          errorResponse.message ||
            `Failed to ${isEditMode ? "update" : "create"} data model extension`
        );
        setStatus("error");
      }
    } catch {
      setStatus("error");
      setErrorMessage(
        `An error occurred while ${
          isEditMode ? "updating" : "creating"
        } the data model extension`
      );
      setSubmitting(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <Flex direction="column" align="center" justify="center" gap="3" py="7">
        <Spinner loading />
        <Text>Loading data model extension...</Text>
      </Flex>
    );
  }

  return (
    <div>
      <Form.Root autoComplete="off" onSubmit={handleSubmit}>
        <FormField
          name="dataSchemaUrl"
          label="Data Schema URL"
          required
          description="HTTPS URL of the publicly accessible JSON Schema file that defines the extension."
        >
          <TextField
            required
            type="url"
            value={formData.dataSchemaUrl}
            placeholder="https://catalog.carbon-transparency.com/…/schema.json"
            onChange={handleChange}
          />
          <Form.Message match="typeMismatch">
            Please enter a valid URL.
          </Form.Message>
        </FormField>

        <Flex justify="start" mb="4">
          <Button
            type="button"
            variant="soft"
            disabled={!formData.dataSchemaUrl || fetchingSchema}
            onClick={handleFetchSchema}
          >
            {fetchingSchema ? <Spinner loading /> : <DownloadIcon />}
            {fetchingSchema ? "Fetching…" : "Fetch schema"}
          </Button>
        </Flex>

        {schemaMessage && (
          <Text as="p" size="1" color="gray" mb="3">
            {schemaMessage}
          </Text>
        )}

        {schemaJson && (
          <ScrollArea style={{ maxHeight: 180 }} mb="4">
            <Code
              variant="soft"
              style={{ display: "block", whiteSpace: "pre-wrap" }}
            >
              {JSON.stringify(schemaJson, null, 2)}
            </Code>
          </ScrollArea>
        )}

        <FormField name="name" label="Name" required>
          <TextField
            required
            value={formData.name}
            placeholder="e.g. PACT Primary Data Share"
            onChange={handleChange}
          />
        </FormField>

        <FormField name="description" label="Description">
          <TextField
            value={formData.description}
            placeholder="What business case does this extension address?"
            onChange={handleChange}
          />
        </FormField>

        <FormField
          name="documentationUrl"
          label="Documentation URL"
          description="HTTPS URL of the human-readable extension documentation."
        >
          <TextField
            type="url"
            value={formData.documentationUrl}
            placeholder="https://catalog.carbon-transparency.com/…/documentation/"
            onChange={handleChange}
          />
          <Form.Message match="typeMismatch">
            Please enter a valid URL.
          </Form.Message>
        </FormField>

        <FormField
          name="specVersion"
          label="Spec Version"
          description="Version of the Data Model Extension specification this entry conforms to."
        >
          <SelectField
            name="specVersion"
            value={formData.specVersion}
            options={SPEC_VERSION_OPTIONS}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, specVersion: value }))
            }
          />
        </FormField>

        <FormField
          name="version"
          label="Extension Version"
          description="Semantic version of the extension itself, e.g. 1.0.0."
        >
          <TextField
            value={formData.version}
            placeholder="1.0.0"
            onChange={handleChange}
          />
        </FormField>

        <FormField name="author" label="Author">
          <TextField
            value={formData.author}
            placeholder="Owning organization or initiative"
            onChange={handleChange}
          />
        </FormField>

        <FormField name="contactEmail" label="Contact Email">
          <TextField
            type="email"
            value={formData.contactEmail}
            placeholder="maintainer@example.com"
            onChange={handleChange}
          />
          <Form.Message match="typeMismatch">
            Please enter a valid email address.
          </Form.Message>
        </FormField>

        <FormField name="status" label="Status">
          <SelectField
            name="status"
            value={formData.status}
            options={STATUS_OPTIONS}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                status: value as DataModelExtensionFormData["status"],
              }))
            }
          />
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
              {submitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                  ? "Update Extension"
                  : "Create Extension"}
            </Button>
          </Form.Submit>
        </Flex>
      </Form.Root>

      {status === "success" && (
        <Callout.Root color="green" highContrast variant="surface" mt="4">
          <Callout.Icon>
            <CheckIcon />
          </Callout.Icon>
          <Callout.Text>
            {isEditMode
              ? "Data model extension updated successfully!"
              : "Data model extension created successfully!"}
          </Callout.Text>
        </Callout.Root>
      )}

      {status === "error" && (
        <Callout.Root color="red" highContrast variant="surface" mt="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{errorMessage}</Callout.Text>
        </Callout.Root>
      )}
    </div>
  );
};

export default DataModelExtensionForm;
