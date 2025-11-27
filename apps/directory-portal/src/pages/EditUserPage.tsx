import React, { useState, useEffect } from "react";
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
import { useNavigate, useParams } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import SideNav from "../components/SideNav";
import { User } from "./OrganizationUsers";
import { fetchWithAuth } from "../utils/auth-fetch";
import "./EditUserPage.css";
import PolicyGuard from "../components/PolicyGuard";

const EditUserPage: React.FC = () => {
  const navigate = useNavigate();
  const { orgId, userId } = useParams<{ orgId: string, userId: string }>();
  const [formData, setFormData] = useState({
    fullName: "",
    role: "",
  });
  const [readOnlyData, setReadOnlyData] = useState({
    id: 0,
    email: "",
    organizationName: "",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetchWithAuth(
          `/organizations/${orgId}/users/${userId}`
        );

        if (response!.ok) {
          const user: User = await response!.json();
          setFormData({
            fullName: user.fullName,
            role: user.role,
          });
          setReadOnlyData({
            email: user.email,
            id: user.id,
            organizationName: user.organizationName,
          });
        } else {
          setErrorMessage("Failed to load user data");
          setStatus("error");
        }
      } catch (error) {
        setErrorMessage("Error loading user data");
        setStatus("error");
        console.error("An error occurred:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, orgId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanedFormData = {
      ...formData,
    };

    try {
      setUpdating(true);

      const response = await fetchWithAuth(
        `/organizations/${orgId}/users/${userId}`,
        {
          method: "POST",
          body: JSON.stringify(cleanedFormData),
        }
      );

      setUpdating(false);

      if (response!.ok) {
        setStatus("success");
      } else {
        const errorResponse = await response!.json();
        if (errorResponse.message) {
          setErrorMessage(errorResponse.message);
        }
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("An error occurred while updating the user");
      console.error("An error occurred:", error);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prevData) => ({ ...prevData, role: value }));
  };

  if (loading) {
    return (
      <Box className="loading-container">
        <Spinner loading />
        <Text className="loading-text">Loading user data...</Text>
      </Box>
    );
  }

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <h2>Edit User</h2>
        </div>
        <div>
          <Box className="form-container">
            <Form.Root onSubmit={handleSubmit}>
              {/* Read-only User Email */}
              <Box className="form-field">
                <Text className="field-label">Email Address</Text>
                <TextField.Root
                  value={readOnlyData.email.toString()}
                  readOnly
                  disabled
                  className="readonly-field"
                />
              </Box>

              {/* Editable Full Name */}
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

              {/* Editable Role (Dropdown) */}
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
                        <PolicyGuard policies={["assign-root-role"]}>
                          <Select.Item
                            value="root"
                            className="select-item"
                          >
                            <Select.ItemText>Root</Select.ItemText>
                          </Select.Item>
                        </PolicyGuard>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </Box>

              {/* Read-only Organization Name */}
              <Box className="form-field">
                <Text className="field-label">Organization Name</Text>
                <TextField.Root
                  value={readOnlyData.organizationName}
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
                  <Button disabled={updating} className="submit-button">
                    {updating && <Spinner loading />}
                    {updating ? "Updating..." : "Save Changes"}
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
                <Callout.Text>User updated successfully!</Callout.Text>
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
                  {errorMessage || "Error updating user, please try again."}
                </Callout.Text>
              </Callout.Root>
            )}
          </Box>
        </div>
      </main>
    </>
  );
};

export default EditUserPage;
