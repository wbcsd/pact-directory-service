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
import { fetchWithAuth } from "../utils/auth-fetch";
import "./EditUserPage.css";
import { useAuth } from "../contexts/AuthContext";

enum NodeType {
  INTERNAL = "internal",
  EXTERNAL = "external",
}

export interface CreateNodeData {
  name: string;
  type: NodeType;
  apiUrl?: string;
}

const AddNodePage: React.FC = () => {
  const navigate = useNavigate();
  const { profileData } = useAuth();
  const [formData, setFormData] = useState<CreateNodeData>({
    name: "",
    type: NodeType.INTERNAL,
    apiUrl: "",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setCreating(true);
      setStatus(null);
      setErrorMessage("");

      // Prepare the data to send - omit apiUrl if not needed
      const dataToSend: CreateNodeData = {
        name: formData.name,
        type: formData.type,
      };

      // Only include apiUrl for external nodes
      if (formData.type === NodeType.EXTERNAL && formData.apiUrl) {
        dataToSend.apiUrl = formData.apiUrl;
      }

      const response = await fetchWithAuth(`/organizations/${profileData?.organizationId}/nodes`, {
        method: "POST",
        body: JSON.stringify(dataToSend),
      });

      setCreating(false);

      if (response!.ok) {
        setStatus("success");
        // Reset form after successful creation
        setTimeout(() => {
          navigate("/organization/nodes");
        }, 2000);
      } else {
        const errorResponse = await response!.json();
        if (errorResponse.message) {
          setErrorMessage(errorResponse.message);
        } else {
          setErrorMessage("Failed to create node");
        }
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("An error occurred while creating the node");
      console.error("An error occurred:", error);
      setCreating(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleTypeChange = (value: string) => {
    setFormData((prevData) => ({ 
      ...prevData, 
      type: value as NodeType,
      // Clear apiUrl when switching to internal
      apiUrl: value === NodeType.INTERNAL ? "" : prevData.apiUrl
    }));
  };

  const isExternalNode = formData.type === NodeType.EXTERNAL;

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <h2>Create node for {profileData?.organizationName}</h2>
        </div>
        <div>
          <Box className="form-container">
            <Form.Root autoComplete="off" onSubmit={handleSubmit}>
              {/* Name Field */}
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
                            The name for the new node
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
                  Node name is required.
                </Form.Message>
              </Form.Field>

              {/* Type Field */}
              <Box className="form-field">
                <Text className="field-label">
                  Node Type<span className="required-asterisk">*</span>
                </Text>
                <Select.Root
                  value={formData.type}
                  onValueChange={handleTypeChange}
                >
                  <Select.Trigger className="select-trigger">
                    <Select.Value placeholder="Select a node type" />
                    <Select.Icon>
                      <ChevronDownIcon />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="select-content">
                      <Select.Viewport>
                        <Select.Item
                          value={NodeType.INTERNAL}
                          className="select-item"
                        >
                          <Select.ItemText>Internal</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value={NodeType.EXTERNAL}
                          className="select-item"
                        >
                          <Select.ItemText>External</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </Box>

              {/* API URL Field - Only shown for external nodes */}
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
                              The API URL for the external node
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
                    API URL is required for external nodes.
                  </Form.Message>
                  <Form.Message
                    match="typeMismatch"
                    className="validation-message"
                  >
                    Please enter a valid URL.
                  </Form.Message>
                </Form.Field>
              )}

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
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Form.Submit asChild>
                  <Button disabled={creating} className="submit-button">
                    {creating && <Spinner loading />}
                    {creating ? "Creating..." : "Create Node"}
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
                  Node created successfully! Redirecting to nodes list...
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
                  {errorMessage || "Error creating node, please try again."}
                </Callout.Text>
              </Callout.Root>
            )}
          </Box>
        </div>
      </main>
    </>
  );
};

export default AddNodePage;