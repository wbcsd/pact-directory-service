import React, { useState } from "react";
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
import { useNavigate } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import SideNav from "../components/SideNav";
import { useAuth } from "../contexts/AuthContext";
import { fetchWithAuth } from "../utils/auth-fetch";
import "./EditUserPage.css";

const AddUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "",
    password: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const { profileData } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Client-side password validation
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match");
      setStatus("error");
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      setStatus("error");
      return;
    }

    try {
      setCreating(true);
      setStatus(null);
      setErrorMessage("");

      const response = await fetchWithAuth(
        `/organizations/${profileData?.organizationId}/users`,
        {
          method: "POST",
          body: JSON.stringify(formData),
        }
      );

      setCreating(false);

      if (response!.ok) {
        setStatus("success");
        // Reset form after successful creation
        setTimeout(() => {
          navigate("/organization/users");
        }, 2000);
      } else {
        const errorResponse = await response!.json();
        if (errorResponse.error) {
          setErrorMessage(errorResponse.error);
        } else {
          setErrorMessage("Failed to create user");
        }
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("An error occurred while creating the user");
      console.error("An error occurred:", error);
      setCreating(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prevData) => ({ ...prevData, role: value }));
  };

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <h2>Add New User</h2>
        </div>
        <div>
          <Box className="form-container">
            <Form.Root onSubmit={handleSubmit}>
              {/* Email Field */}
              <Form.Field name="email">
                <Form.Label className="field-label">
                  Email Address<span className="required-asterisk">*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.email}
                    required
                    type="email"
                    placeholder="Enter email address"
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
                            The email address for the new user
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
                  Email address is required.
                </Form.Message>
                <Form.Message
                  match="typeMismatch"
                  className="validation-message"
                >
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
                <Form.Message
                  match="valueMissing"
                  className="validation-message"
                >
                  Full name is required.
                </Form.Message>
              </Form.Field>

              {/* Role Field */}
              <Box className="form-field">
                <Text className="field-label">
                  Role<span className="required-asterisk">*</span>
                </Text>
                <Select.Root
                  value={formData.role}
                  onValueChange={handleRoleChange}
                >
                  <Select.Trigger className="select-trigger">
                    <Select.Value placeholder="Select a role" />
                    <Select.Icon>
                      <ChevronDownIcon />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="select-content">
                      <Select.Viewport>
                        <Select.Item
                          value="administrator"
                          className="select-item"
                        >
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

              {/* Password Field */}
              <Form.Field name="password">
                <Form.Label className="field-label">
                  Password<span className="required-asterisk">*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.password}
                    required
                    type="password"
                    placeholder="Enter password"
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
                            Password must be at least 6 characters long
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
                  Password is required.
                </Form.Message>
              </Form.Field>

              {/* Confirm Password Field */}
              <Form.Field name="confirmPassword">
                <Form.Label className="field-label">
                  Confirm Password<span className="required-asterisk">*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.confirmPassword}
                    required
                    type="password"
                    placeholder="Confirm password"
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
                            Re-enter the password to confirm
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
                  Please confirm your password.
                </Form.Message>
              </Form.Field>

              {/* Organization Info Display */}
              <Box className="form-field">
                <Text className="field-label">Organization</Text>
                <TextField.Root
                  value={profileData?.organizationName || ""}
                  readOnly
                  disabled
                  className="readonly-field"
                />
              </Box>

              <Box className="button-group">
                <Button
                  type="button"
                  className="cancel-button"
                  onClick={() => navigate("/organization/users")}
                >
                  Cancel
                </Button>
                <Form.Submit asChild>
                  <Button disabled={creating} className="submit-button">
                    {creating && <Spinner loading />}
                    {creating ? "Creating..." : "Create User"}
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
                  User created successfully! Redirecting to users list...
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
                  {errorMessage || "Error creating user, please try again."}
                </Callout.Text>
              </Callout.Root>
            )}
          </Box>
        </div>
      </main>
    </>
  );
};

export default AddUserPage;