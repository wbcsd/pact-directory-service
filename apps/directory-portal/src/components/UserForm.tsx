import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import * as Select from "@radix-ui/react-select";
import {
  Box,
  Button,
  TextField,
  Text,
  Callout,
  Spinner,
} from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useAuth } from "../contexts/AuthContext";
import "./NodeForm.css"; // Reuse the same CSS

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
      <Box className="node-form-loading">
        <Spinner loading />
        <Text>Loading user data...</Text>
      </Box>
    );
  }

  return (
    <Box className="node-form">
      <Form.Root autoComplete="off" onSubmit={handleSubmit}>
        {/* Email Field */}
        <Form.Field name="email">
          <Form.Label className="field-label">
            Email Address<span className="required-asterisk">*</span>
          </Form.Label>
          <Form.Control asChild>
            <TextField.Root
              autoComplete="off"
              value={formData.email}
              required
              type="email"
              placeholder="Enter email address"
              onChange={handleChange}
              className="editable-field"
              disabled={isEditMode}
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
                      The email address for the user
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </TextField.Slot>
            </TextField.Root>
          </Form.Control>
          <Form.Message match="valueMissing" className="validation-message">
            Email address is required.
          </Form.Message>
          <Form.Message match="typeMismatch" className="validation-message">
            Please enter a valid email address.
          </Form.Message>
        </Form.Field>

        {/* Full Name Field */}
        <Form.Field name="fullName">
          <Form.Label className="field-label">
            Full Name<span className="required-asterisk">*</span>
          </Form.Label>
          <Form.Control asChild>
            <TextField.Root
              autoComplete="off"
              value={formData.fullName}
              required
              placeholder="Enter full name"
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
                      The full name of the user
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </TextField.Slot>
            </TextField.Root>
          </Form.Control>
          <Form.Message match="valueMissing" className="validation-message">
            Full name is required.
          </Form.Message>
        </Form.Field>

        {/* Role Field */}
        <Box className="form-field">
          <Text className="field-label">
            Role<span className="required-asterisk">*</span>
          </Text>
          <Select.Root value={formData.role} onValueChange={handleRoleChange}>
            <Select.Trigger className="select-trigger">
              <Select.Value placeholder="Select a role" />
              <Select.Icon>
                <ChevronDownIcon />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="select-content">
                <Select.Viewport>
                  <Select.Item value="administrator" className="select-item">
                    <Select.ItemText>Administrator</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="user" className="select-item">
                    <Select.ItemText>User</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Box>

        {/* Organization Info Display */}
        <Box className="form-field">
          <Text className="field-label">Organization</Text>
          <TextField.Root
            value={organizationName}
            readOnly
            disabled
            className="readonly-field"
          />
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
              {submitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                  ? "Update User"
                  : "Create User"}
            </Button>
          </Form.Submit>
        </Box>
      </Form.Root>

      {status === "success" && (
        <Callout.Root color="green" highContrast variant="surface" mt={"4"}>
          <Callout.Icon>
            <CheckIcon />
          </Callout.Icon>
          <Callout.Text>
            User {isEditMode ? "updated" : "created"} successfully!
          </Callout.Text>
        </Callout.Root>
      )}

      {status === "error" && (
        <Callout.Root color="bronze" highContrast variant="surface" mt={"4"}>
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {errorMessage ||
              `Error ${isEditMode ? "updating" : "creating"} user, please try again.`}
          </Callout.Text>
        </Callout.Root>
      )}
    </Box>
  );
};

export default UserForm;
