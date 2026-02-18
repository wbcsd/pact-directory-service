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
import { fetchWithAuth } from "../utils/auth-fetch";
import "./EditUserPage.css";
import { useAuth } from "../contexts/AuthContext";

enum NodeType {
  INTERNAL = "internal",
  EXTERNAL = "external",
}

interface Node {
  id: number;
  name: string;
  type: NodeType;
  apiUrl?: string;
  organizationName: string;
}

interface UpdateNodeData {
  name: string;
  type: NodeType;
  apiUrl?: string;
}

const EditNodePage: React.FC = () => {
  const navigate = useNavigate();
  const { id: nodeId } = useParams<{ id: string }>();
  const { profileData } = useAuth();
  const [formData, setFormData] = useState<UpdateNodeData>({
    name: "",
    type: NodeType.INTERNAL,
    apiUrl: "",
  });
  const [readOnlyData, setReadOnlyData] = useState({
    id: 0,
    organizationName: "",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchNode = async () => {
      try {
        const response = await fetchWithAuth(
          `/nodes/${nodeId}`
        );

        if (response!.ok) {
          const node: Node = await response!.json();
          setFormData({
            name: node.name,
            type: node.type,
            apiUrl: node.apiUrl || "",
          });
          setReadOnlyData({
            id: node.id,
            organizationName: node.organizationName,
          });
        } else {
          setErrorMessage("Failed to load node data");
          setStatus("error");
        }
      } catch (error) {
        setErrorMessage("Error loading node data");
        setStatus("error");
        console.error("An error occurred:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNode();
  }, [nodeId, profileData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setUpdating(true);
      setStatus(null);
      setErrorMessage("");

      // Prepare the data to send - omit apiUrl if not needed
      const dataToSend: UpdateNodeData = {
        name: formData.name,
        type: formData.type,
      };

      // Only include apiUrl for external nodes
      if (formData.type === NodeType.EXTERNAL && formData.apiUrl) {
        dataToSend.apiUrl = formData.apiUrl;
      }

      const response = await fetchWithAuth(
        `/nodes/${nodeId}`,
        {
          method: "PUT",
          body: JSON.stringify(dataToSend),
        }
      );

      setUpdating(false);

      if (response!.ok) {
        setStatus("success");
      } else {
        const errorResponse = await response!.json();
        if (errorResponse.message) {
          setErrorMessage(errorResponse.message);
        } else {
          setErrorMessage("Failed to update node");
        }
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("An error occurred while updating the node");
      console.error("An error occurred:", error);
      setUpdating(false);
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
      apiUrl: value === NodeType.INTERNAL ? "" : prevData.apiUrl,
    }));
  };

  const isExternalNode = formData.type === NodeType.EXTERNAL;

  if (loading) {
    return (
      <Box className="loading-container">
        <Spinner loading />
        <Text className="loading-text">Loading node data...</Text>
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
          <h2>Edit Node</h2>
        </div>
        <div>
          <Box className="form-container">
            <Form.Root onSubmit={handleSubmit}>
              {/* Editable Name */}
              <Form.Field name="name">
                <Form.Label className="field-label">
                  Node Name<span className="required-asterisk">*</span>
                </Form.Label>
                <Form.Control asChild>
                  <TextField.Root
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
                            The name of the node
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

              {/* Editable Type (Dropdown) */}
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
                  onClick={() => navigate("/organization/nodes")}
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
                <Callout.Text>Node updated successfully!</Callout.Text>
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
                  {errorMessage || "Error updating node, please try again."}
                </Callout.Text>
              </Callout.Root>
            )}
          </Box>
        </div>
      </main>
    </>
  );
};

export default EditNodePage;