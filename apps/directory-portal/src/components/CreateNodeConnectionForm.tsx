import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  Callout,
  Flex,
  Spinner,
  Text,
  Tooltip,
  Select,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./NodeForm.css";

interface Node {
  id: number;
  name: string;
  organizationId: number;
  organizationName: string;
  type: 'internal' | 'external';
}

interface CreateInvitationData {
  fromNodeId: number;
  targetNodeId: number;
  message?: string;
}

interface CreateNodeConnectionFormProps {
  /** When provided, locks the "From Node" to this node ID. */
  fromNodeId?: number;
  /** Called when the user clicks Cancel or Close. */
  onCancel?: () => void;
}

const CreateNodeConnectionForm: React.FC<CreateNodeConnectionFormProps> = ({
  fromNodeId: lockedFromNodeId,
  onCancel,
}) => {
  const { profileData } = useAuth();
  const navigate = useNavigate();
  const [availableNodes, setAvailableNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetNode, setTargetNode] = useState<Node | null>(null);
  const [formData, setFormData] = useState<CreateInvitationData>({
    fromNodeId: lockedFromNodeId ?? 0,
    targetNodeId: 0,
    message: "",
  });
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [creating, setCreating] = useState(false);

  // Fetch available nodes
  const fetchNodes = useCallback(async () => {
    if (!profileData?.organizationId) {
      setErrorMessage("Organization information not available");
      setStatus("error");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch nodes from the current user's organization
      const nodesResponse = await fetchWithAuth(
        `/organizations/${profileData.organizationId}/nodes?pageSize=100`
      );
      if (!nodesResponse || !nodesResponse.ok) {
        throw new Error("Failed to fetch available nodes");
      }
      const nodesResult = await nodesResponse.json();
      setAvailableNodes(nodesResult.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching nodes:", error);
      setErrorMessage("Failed to load nodes. Please try again.");
      setStatus("error");
      setLoading(false);
    }
  }, [profileData]);

  useEffect(() => {
    if (profileData) {
      fetchNodes();
    }
  }, [profileData, fetchNodes]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.fromNodeId) {
      setErrorMessage("Please select a source node");
      setStatus("error");
      return;
    }

    if (!formData.targetNodeId) {
      setErrorMessage("Please select a target node");
      setStatus("error");
      return;
    }

    if (formData.fromNodeId === formData.targetNodeId) {
      setErrorMessage("Source and target nodes must be different");
      setStatus("error");
      return;
    }

    try {
      setCreating(true);
      setStatus(null);
      setErrorMessage("");

      const dataToSend: { targetNodeId: number; message?: string } = {
        targetNodeId: formData.targetNodeId,
      };

      if (formData.message && formData.message.trim()) {
        dataToSend.message = formData.message.trim();
      }

      const response = await fetchWithAuth(
        `/nodes/${formData.fromNodeId}/invitations`,
        {
          method: "POST",
          body: JSON.stringify(dataToSend),
        }
      );

      setCreating(false);

      if (response!.ok) {
        await response!.json();
        setStatus("success");
      } else {
        const errorResponse = await response!.json();
        setErrorMessage(
          errorResponse.message || "Failed to create connection invitation"
        );
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

  const handleFromNodeChange = (value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      fromNodeId: parseInt(value),
    }));
  };

  const handleTargetNodeChange = (value: string) => {
    const selected = availableNodes.find((n) => n.id === parseInt(value)) ?? null;
    setTargetNode(selected);
    setFormData((prevData) => ({
      ...prevData,
      targetNodeId: parseInt(value),
    }));
  };

  // Filter available target nodes (exclude the selected from node)
  const availableTargetNodes = availableNodes.filter(
    (node) => node.id !== formData.fromNodeId
  );

  if (loading) {
    return (
      <Box className="node-form-loading">
        <Spinner loading />
        <Text>Loading nodes...</Text>
      </Box>
    );
  }

  return (
    <Box className="node-form">
      <Callout.Root variant="soft" mb="4">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          Create a connection invitation between two nodes in your organization.
          The target node will need to accept this invitation to establish the connection and exchange credentials.
        </Callout.Text>
      </Callout.Root>

      <Form.Root autoComplete="off" onSubmit={handleSubmit}>
        {/* From Node Selection */}
        <Form.Field name="fromNodeId" className="form-field">
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Form.Label className="field-label" style={{ margin: 0 }}>
              From Node<span className="required-asterisk">*</span>
            </Form.Label>
            <Tooltip content="Select the node that will initiate the connection." delayDuration={0}>
              <InfoCircledIcon
                width={20}
                height={20}
                color="var(--accent-12)"
                style={{ cursor: "help" }}
              />
            </Tooltip>
          </Box>
          {lockedFromNodeId ? (
            <div className="readonly-field">
              {availableNodes.find((n) => n.id === lockedFromNodeId)?.name ?? `Node #${lockedFromNodeId}`}
            </div>
          ) : (
            <Select.Root
              value={formData.fromNodeId > 0 ? formData.fromNodeId.toString() : undefined}
              onValueChange={handleFromNodeChange}
            >
              <Select.Trigger placeholder="Select source node" />
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
          )}
        </Form.Field>

        {/* Target Node Selection */}
        <Form.Field name="targetNodeId" className="form-field">
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Form.Label className="field-label" style={{ margin: 0 }}>
              Target Node<span className="required-asterisk">*</span>
            </Form.Label>
            <Tooltip content="Select the node that will receive the connection invitation. The target node must accept the invitation to establish the connection." delayDuration={0}>
              <InfoCircledIcon
                width={20}
                height={20}
                color="var(--accent-12)"
                style={{ cursor: "help" }}
              />
            </Tooltip>
          </Box>
          <Select.Root
            value={formData.targetNodeId > 0 ? formData.targetNodeId.toString() : undefined}
            onValueChange={handleTargetNodeChange}
            disabled={!formData.fromNodeId}
          >
            <Select.Trigger placeholder={formData.fromNodeId ? "Select target node" : "Select source node first"} />
            <Select.Content position="popper">
              {availableTargetNodes.length === 0 ? (
                <Select.Item value="none" disabled>
                  {formData.fromNodeId ? "No other nodes available" : "Select source node first"}
                </Select.Item>
              ) : (
                availableTargetNodes.map((node) => (
                  <Select.Item key={node.id} value={node.id.toString()}>
                    {node.name} ({node.type})
                  </Select.Item>
                ))
              )}
            </Select.Content>
          </Select.Root>
        </Form.Field>

        {/* Optional Message */}
        <Form.Field name="message" className="form-field">
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Form.Label className="field-label" style={{ margin: 0 }}>
              Message (Optional)
            </Form.Label>
            <Tooltip content="You can include a message to provide context about why you want to establish this connection." delayDuration={0}>
              <InfoCircledIcon
                width={20}
                height={20}
                color="var(--accent-12)"
                style={{ cursor: "help" }}
              />
            </Tooltip>
          </Box>
          <Form.Control asChild>
            <textarea
              value={formData.message}
              onChange={handleMessageChange}
              placeholder="Add an optional message for the target node"
              rows={4}
              className="editable-field"
              style={{
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </Form.Control>
        </Form.Field>

        <Flex justify="end" gap="3" mt="6">
          <Button 
            type="button" 
            color="jade"
            onClick={onCancel}
            disabled={creating}
          >
            Cancel
          </Button>
          <Form.Submit asChild>
            <Button 
              type="submit"
              disabled={creating || availableNodes.length === 0}
            >
              {creating && <Spinner loading />}
              {creating ? "Creating..." : "Create Invitation"}
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
            <Box style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span>
                Connection invitation sent to <strong>{targetNode?.name}</strong>. Go to that node's dashboard to accept it.
              </span>
              <Box style={{ display: "flex", gap: "8px" }}>
                <Button size="2" variant="soft" color="green" onClick={() => { onCancel?.(); navigate(`/nodes/${targetNode?.id}`); }}>
                  Go to {targetNode?.name}
                </Button>
                <Button size="2" color="jade" onClick={onCancel}>
                  Close
                </Button>
              </Box>
            </Box>
          </Callout.Text>
        </Callout.Root>
      )}

      {status === "error" && (
        <Callout.Root color="bronze" highContrast variant="surface" mt="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {errorMessage || "Error creating invitation, please try again."}
          </Callout.Text>
        </Callout.Root>
      )}
    </Box>
  );
};

export default CreateNodeConnectionForm;
