import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Button,
  Flex,
  Text,
  Callout,
  Spinner,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useAuth } from "../contexts/AuthContext";
import { FormField, TextField, SelectField } from "./ui";

export interface UserFormData {
  fullName: string;
  email: string;
  role: string;
}

interface UserFormProps {
  /** Organization ID for creating/editing users */
  organizationId: number;
  /** When set, the form loads and edits an existing user. When absent, creates a new one. */
  userId?: number | string;
  /** Called after a successful save. Receives the saved user data. */
  onSaved?: (user: unknown) => void;
  /** Called when the user clicks Cancel. */
  onCancel?: () => void;
}

const UserForm: React.FC<UserFormProps> = ({
  organizationId,
  userId,
  onSaved,
  onCancel,
}) => {
  const isEditMode = userId != null;
  const { profileData } = useAuth();

  const [formData, setFormData] = useState<UserFormData>({
    fullName: "",
    email: "",
    role: "",
  });
  const [readOnlyOrganization, setReadOnlyOrganization] = useState("");
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  // Load existing user data for edit mode
  const loadUser = useCallback(async () => {
    if (!isEditMode) return;
    try {
      const response = await fetchWithAuth(
        `/organizations/${organizationId}/users/${userId}`
      );
      if (response!.ok) {
        const user = await response!.json();
        setFormData({
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        });
        setReadOnlyOrganization(user.organizationName || "");
      } else {
        setErrorMessage("Failed to load user data");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Error loading user data");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, [userId, organizationId, isEditMode]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setStatus(null);
      setErrorMessage("");

      const dataToSend = isEditMode
        ? { fullName: formData.fullName, role: formData.role }
        : formData;

      const url = `/organizations/${organizationId}/users${isEditMode ? `/${userId}` : ""}`;
      const method = "POST";

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(dataToSend),
      });

      setSubmitting(false);

      if (response!.ok) {
        const savedUser = await response!.json();
        setStatus("success");
        onSaved?.(savedUser);
      } else {
        const errorResponse = await response!.json();
        setErrorMessage(
          errorResponse.message ||
            `Failed to ${isEditMode ? "update" : "create"} user`
        );
        setStatus("error");
      }
    } catch {
      setStatus("error");
      setErrorMessage(
        `An error occurred while ${isEditMode ? "updating" : "creating"} the user`
      );
      setSubmitting(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const organizationName =
    readOnlyOrganization || profileData?.organizationName || "";

  if (loading) {
    return (
      <Flex direction="column" align="center" justify="center" gap="3" py="7">
        <Spinner loading />
        <Text>Loading user data...</Text>
      </Flex>
    );
  }

  return (
    <div>
      <Form.Root autoComplete="off" onSubmit={handleSubmit}>
        <FormField name="email" label="Email Address" required>
          <TextField
            required
            type="email"
            value={formData.email}
            placeholder="Enter email address"
            tooltip="The email address for the user"
            disabled={isEditMode}
            onChange={handleChange}
          />
          <Form.Message match="typeMismatch">
            Please enter a valid email address.
          </Form.Message>
        </FormField>

        <FormField name="fullName" label="Full Name" required>
          <TextField
            required
            value={formData.fullName}
            placeholder="Enter full name"
            tooltip="The full name of the user"
            onChange={handleChange}
          />
        </FormField>

        <FormField name="role" label="Role" required>
          <SelectField
            value={formData.role}
            required
            options={[
              { value: "administrator", label: "Administrator" },
              { value: "user", label: "User" },
            ]}
            onValueChange={handleRoleChange}
          />
        </FormField>

        <FormField name="organization" label="Organization">
          <TextField
            value={organizationName}
            disabled
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
                  ? "Update User"
                  : "Create User"}
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
            User {isEditMode ? "updated" : "created"} successfully!
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
              `Error ${isEditMode ? "updating" : "creating"} user, please try again.`}
          </Callout.Text>
        </Callout.Root>
      )}
    </div>
  );
};

export default UserForm;
