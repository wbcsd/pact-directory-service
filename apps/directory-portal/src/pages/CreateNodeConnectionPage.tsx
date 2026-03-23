import React, { useState, useEffect } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  Callout,
  Spinner,
  Tooltip,
  Select,
} from "@radix-ui/themes";
import { useNavigate, useParams } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useAuth } from "../contexts/AuthContext";
import "../components/NodeForm.css";
import { FormPageLayout } from "../layouts";

interface Node {
  id: number;
  name: string;
  organizationId: number;
  organizationName: string;
  type: 'internal' | 'external';
}

interface CreateInvitationData {
  targetNodeId: number;
  message?: string;
}

const CreateNodeConnectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: fromNodeId } = useParams<{ id: string }>();
  const { profileData } = useAuth();
  const [fromNode, setFromNode] = useState<Node | null>(null);
  const [availableNodes, setAvailableNodes] = useState<Node[]>([]);
  const [targetNode, setTargetNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CreateInvitationData>({
    targetNodeId: 0,
    message: "",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [creating, setCreating] = useState(false);

  // Fetch the current node and available nodes
  useEffect(() => {
    const fetchData = async () => {
      if (!profileData?.organizationId) {
        setErrorMessage("Organization information not available");
        setStatus("error");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch the from node details
        const nodeResponse = await fetchWithAuth(`/nodes/${fromNodeId}`);
        if (!nodeResponse || !nodeResponse.ok) {
          throw new Error("Failed to fetch node details");
        }
        const nodeData = await nodeResponse.json();
        setFromNode(nodeData);

        // Fetch nodes from the current user's organization
        const nodesResponse = await fetchWithAuth(
          `/organizations/${profileData.organizationId}/nodes?pageSize=100`
        );
        if (!nodesResponse || !nodesResponse.ok) {
          throw new Error("Failed to fetch available nodes");
        }
        const nodesResult = await nodesResponse.json();
        
        // Filter out the current node from available nodes
        const filteredNodes = nodesResult.data.filter(
          (node: Node) => node.id !== Number(fromNodeId)
        );
        setAvailableNodes(filteredNodes);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorMessage("Failed to load node information. Please try again.");
        setStatus("error");
        setLoading(false);
      }
    };

    if (fromNodeId && profileData) {
      fetchData();
    }
  }, [fromNodeId, profileData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.targetNodeId) {
      setErrorMessage("Please select a target node");
      setStatus("error");
      return;
    }

    try {
      setCreating(true);
      setStatus(null);
      setErrorMessage("");

      const dataToSend: CreateInvitationData = {
        targetNodeId: formData.targetNodeId,
      };

      if (formData.message && formData.message.trim()) {
        dataToSend.message = formData.message.trim();
      }

      const response = await fetchWithAuth(
        `/nodes/${fromNodeId}/invitations`,
        {
          method: "POST",
          body: JSON.stringify(dataToSend),
        }
      );

      setCreating(false);

      if (response!.ok) {
        setStatus("success");
      } else {
        const errorResponse = await response!.json();
        if (errorResponse.message) {
          setErrorMessage(errorResponse.message);
        } else {
          setErrorMessage("Failed to create connection invitation");
        }
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("An error occurred while creating the invitation");
      console.error("An error occurred:", error);
      setCreating(false);
    }
  };

  const handleMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prevData) => ({ ...prevData, message: event.target.value }));
  };

  const handleTargetNodeChange = (value: string) => {
    const selected = availableNodes.find((n) => n.id === parseInt(value)) ?? null;
    setTargetNode(selected);
    setFormData((prevData) => ({
      ...prevData,
      targetNodeId: parseInt(value),
    }));
  };

  const pageTitle = fromNode
    ? `Create Connection from ${fromNode.name}`
    : "Create Node Connection";

  return (
    <FormPageLayout
      title={pageTitle}
      loading={loading}
      loadingMessage="Loading node information..."
    >
            <Callout.Root variant="soft" mb="4">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                You are creating a connection invitation from <strong>{fromNode?.name}</strong> to another node in your organization.
                The target node will need to accept this invitation to establish the connection and exchange credentials.
              </Callout.Text>
            </Callout.Root>

            <Form.Root autoComplete="off" onSubmit={handleSubmit}>
              {/* Target Node Selection */}
              <Form.Field name="targetNodeId">
                <Form.Label className="field-label">
                  Target Node<span className="required-asterisk">*</span>
                </Form.Label>
                <Select.Root
                  value={formData.targetNodeId > 0 ? formData.targetNodeId.toString() : undefined}
                  onValueChange={handleTargetNodeChange}
                >
                  <Select.Trigger placeholder="Select a target node" />
                  <Select.Content position="popper">
                    {availableNodes.length === 0 ? (
                      <Select.Item value="none" disabled>No available nodes</Select.Item>
                    ) : (
                      availableNodes.map((node) => (
                        <Select.Item key={node.id} value={node.id.toString()}>
                          {node.name} ({node.type})
                        </Select.Item>
                      ))
                    )}
                  </Select.Content>
                </Select.Root>
                <Box mt="2">
                  <Tooltip content="Select the node within your organization that you want to connect to. The target node must accept the invitation to establish the connection." delayDuration={0}>
                    <InfoCircledIcon
                      width={20}
                      height={20}
                      color="var(--accent-12)"
                      style={{ cursor: "help" }}
                    />
                  </Tooltip>
                </Box>
              </Form.Field>

              {/* Optional Message */}
              <Form.Field name="message" style={{ marginTop: "20px" }}>
                <Form.Label className="field-label">
                  Message (Optional)
                </Form.Label>
                <Form.Control asChild>
                  <textarea
                    value={formData.message}
                    onChange={handleMessageChange}
                    placeholder="Add an optional message for the target organization"
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      border: "1px solid var(--gray-7)",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      resize: "vertical",
                    }}
                  />
                </Form.Control>
                <Box mt="2">
                  <Tooltip content="You can include a message to provide context about why you want to establish this connection." delayDuration={0}>
                    <InfoCircledIcon
                      width={20}
                      height={20}
                      color="var(--accent-12)"
                      style={{ cursor: "help" }}
                    />
                  </Tooltip>
                </Box>
              </Form.Field>

              {/* Status Messages */}
              {status === "success" && (
                <Callout.Root color="green" mt="4">
                  <Callout.Icon>
                    <CheckIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    <Box style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <span>
                        Connection invitation sent to <strong>{targetNode?.name}</strong>. Go to that node's dashboard to accept it.
                      </span>
                      <Box style={{ display: "flex", gap: "8px" }}>
                        <Button
                          size="2"
                          onClick={() => navigate(`/nodes/${targetNode?.id}`)}
                        >
                          Go to {targetNode?.name}
                        </Button>
                        <Button
                          size="2"
                          variant="soft"
                          onClick={() => navigate(`/nodes/${fromNodeId}`)}
                        >
                          Back to {fromNode?.name}
                        </Button>
                      </Box>
                    </Box>
                  </Callout.Text>
                </Callout.Root>
              )}

              {status === "error" && (
                <Callout.Root color="red" mt="4">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>{errorMessage}</Callout.Text>
                </Callout.Root>
              )}

              {/* Submit Button */}
              <Box mt="4" style={{ display: "flex", gap: "12px" }}>
                <Form.Submit asChild>
                  <Button disabled={creating || availableNodes.length === 0}>
                    {creating ? (
                      <>
                        <Spinner size="1" style={{ marginRight: "8px" }} />
                        Creating Invitation...
                      </>
                    ) : (
                      "Create Invitation"
                    )}
                  </Button>
                </Form.Submit>
                <Button
                  type="button"
                  onClick={() => navigate(`/nodes/${fromNodeId}/connections`)}
                  disabled={creating}
                >
                  Cancel
                </Button>
              </Box>
            </Form.Root>
    </FormPageLayout>
  );
};

export default CreateNodeConnectionPage;
