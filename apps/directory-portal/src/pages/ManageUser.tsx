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

const EditUserPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: userId } = useParams<{ id: string }>();
  const [formData, setFormData] = useState({
    fullName: "",
    role: "",
  });
  const [readOnlyData, setReadOnlyData] = useState({
    id: 0,
    email: "",
    organizationName: "",
    organizationId: 0,
    organizationIdentifier: "",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await Promise.resolve({
          ok: true,
          json: async () => ({
            userId: 1,
            fullName: "John Doe",
            email: "john@doe.com",
            role: "administrator",
            organizationName: "Example Org",
            organizationId: 123,
            organizationIdentifier: "EX123",
          }),
        });

        if (response.ok) {
          const user: User = await response.json();
          setFormData({
            fullName: user.fullName,
            role: user.role,
          });
          setReadOnlyData({
            email: user.email,
            id: user.userId,
            organizationName: user.organizationName,
            organizationId: user.organizationId,
            organizationIdentifier: user.organizationIdentifier,
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
  }, [userId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanedFormData = {
      ...formData,
    };

    try {
      setUpdating(true);
      const token = localStorage.getItem("jwt");

      const response = await fetch(
        `${import.meta.env.VITE_DIRECTORY_API}/directory/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(cleanedFormData),
        }
      );

      setUpdating(false);

      if (response.ok) {
        setStatus("success");
        setTimeout(() => navigate("/users"), 1500);
      } else {
        const errorResponse = await response.json();
        if (errorResponse.error) {
          setErrorMessage(errorResponse.error);
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
      <Box style={{ padding: "40px", textAlign: "center" }}>
        <Spinner loading />
        <Text style={{ display: "block", marginTop: "20px" }}>
          Loading user data...
        </Text>
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
          <h2>Organization Users</h2>
        </div>
        <div>
          <Box style={{ margin: "0 auto", paddingTop: "40px" }}>
            <h2 style={{ marginBottom: "30px" }}>Edit User</h2>

            <Form.Root onSubmit={handleSubmit}>
              {/* Read-only User Email */}
              <Box style={{ marginBottom: "20px" }}>
                <Text
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Email Address
                </Text>
                <TextField.Root
                  value={readOnlyData.email.toString()}
                  readOnly
                  disabled
                  style={{
                    width: "100%",
                    backgroundColor: "#f5f5f5",
                    opacity: 0.7,
                  }}
                />
              </Box>

              {/* Editable Full Name */}
              <Form.Field name="fullName">
                <Form.Label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Full Name<span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
                    value={formData.fullName}
                    required
                    placeholder="Enter full name"
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      border: "1px solid #ccc",
                      fontSize: "16px",
                    }}
                  >
                    <TextField.Slot side="right">
                      <Tooltip.Provider delayDuration={0}>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <InfoCircledIcon
                              width={20}
                              height={20}
                              color="#0A0552"
                              style={{ cursor: "pointer" }}
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
                  style={{
                    color: "var(--base-color-brand--light-blue)",
                    fontSize: "0.85em",
                  }}
                >
                  Full name is required.
                </Form.Message>
              </Form.Field>

              {/* Editable Role (Dropdown) */}
              <Box style={{ marginBottom: "20px" }}>
                <Text
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Role<span style={{ color: "red" }}>*</span>
                </Text>
                <Select.Root
                  value={formData.role}
                  onValueChange={handleRoleChange}
                >
                  <Select.Trigger
                    style={{
                      width: "100%",
                      border: "1px solid #ccc",
                      padding: "12px",
                      fontSize: "16px",
                      backgroundColor: "white",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderRadius: "4px",
                    }}
                  >
                    <Select.Value placeholder="Select a role" />
                    <Select.Icon>
                      <ChevronDownIcon />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      style={{
                        backgroundColor: "white",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                    >
                      <Select.Viewport>
                        <Select.Item
                          value="administrator"
                          style={{
                            padding: "12px",
                            cursor: "pointer",
                            position: "relative",
                          }}
                        >
                          <Select.ItemText>Admin</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value="user"
                          style={{
                            padding: "12px",
                            cursor: "pointer",
                            position: "relative",
                          }}
                        >
                          <Select.ItemText>User</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value="viewer"
                          style={{
                            padding: "12px",
                            cursor: "pointer",
                            position: "relative",
                          }}
                        >
                          <Select.ItemText>Viewer</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </Box>

              {/* Read-only Organization Name */}
              <Box style={{ marginBottom: "20px" }}>
                <Text
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Organization Name
                </Text>
                <TextField.Root
                  value={readOnlyData.organizationName}
                  readOnly
                  disabled
                  style={{
                    width: "100%",
                    backgroundColor: "#f5f5f5",
                    opacity: 0.7,
                  }}
                />
              </Box>

              {/* Read-only Organization ID */}
              <Box style={{ marginBottom: "20px" }}>
                <Text
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Organization ID
                </Text>
                <TextField.Root
                  value={readOnlyData.organizationId.toString()}
                  readOnly
                  disabled
                  style={{
                    width: "100%",
                    backgroundColor: "#f5f5f5",
                    opacity: 0.7,
                  }}
                />
              </Box>

              {/* Read-only Organization Identifier */}
              <Box style={{ marginBottom: "20px" }}>
                <Text
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  Organization Identifier
                </Text>
                <TextField.Root
                  value={readOnlyData.organizationIdentifier}
                  readOnly
                  disabled
                  style={{
                    width: "100%",
                    backgroundColor: "#f5f5f5",
                    opacity: 0.7,
                  }}
                />
              </Box>

              <Box style={{ display: "flex", gap: "10px", marginTop: "40px" }}>
                <Button
                  type="button"
                  style={{ flex: 1 }}
                  onClick={() => navigate("/organization/users")}
                >
                  Cancel
                </Button>
                <Form.Submit asChild>
                  <Button disabled={updating} style={{ flex: 1 }}>
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
