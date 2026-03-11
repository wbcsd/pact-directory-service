import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import * as Select from "@radix-ui/react-select";
import {
  Box,
  Button,
  Callout,
  Spinner,
  Text,
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
  /** Called after a successful invitation creation. */
  onSaved?: (data: unknown) => void;
  /** Called when the user clicks Cancel. */
  onCancel?: () => void;
}

const CreateNodeConnectionForm: React.FC<CreateNodeConnectionFormProps> = ({
  fromNodeId: lockedFromNodeId,
  onSaved,
  onCancel,
}) => {
  const { profileData } = useAuth();
  const [availableNodes, setAvailableNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
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
        const savedData = await response!.json();
        setStatus("success");
        onSaved?.(savedData);
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
            <Tooltip.Provider delayDuration={0}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <InfoCircledIcon
                    width={20}
                    height={20}
                    color="#0A0552"
                    className="info-icon"
                    style={{ cursor: "help" }}
                  />
                </Tooltip.Trigger>
                <Tooltip.Content className="TooltipContent" sideOffset={5}>
                  Select the node that will initiate the connection.
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Box>
          {lockedFromNodeId ? (
            <div className="readonly-field">
              {availableNodes.find((n) => n.id === lockedFromNodeId)?.name ?? `Node #${lockedFromNodeId}`}
            </div>
          ) : (
            <Select.Root
              value={formData.fromNodeId > 0 ? formData.fromNodeId.toString() : ""}
              onValueChange={handleFromNodeChange}
            >
              <Select.Trigger className="select-trigger">
                <Select.Value placeholder="Select source node" />
                <Select.Icon>
                  <ChevronDownIcon />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="select-content" position="popper">
                  <Select.Viewport>
                    {availableNodes.length === 0 ? (
                      <Select.Item value="none" disabled className="select-item">
                        <Select.ItemText>No available nodes</Select.ItemText>
                      </Select.Item>
                    ) : (
                      availableNodes.map((node) => (
                        <Select.Item
                          key={node.id}
                          value={node.id.toString()}
                          className="select-item"
                        >
                          <Select.ItemText>
                            {node.name} - <span style={{ textTransform: 'capitalize', color: '#666' }}>{node.type}</span>
                          </Select.ItemText>
                          <Select.ItemIndicator style={{ marginLeft: "auto" }}>
                            <CheckIcon />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))
                    )}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          )}
        </Form.Field>

        {/* Target Node Selection */}
        <Form.Field name="targetNodeId" className="form-field">
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Form.Label className="field-label" style={{ margin: 0 }}>
              Target Node<span className="required-asterisk">*</span>
            </Form.Label>
            <Tooltip.Provider delayDuration={0}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <InfoCircledIcon
                    width={20}
                    height={20}
                    color="#0A0552"
                    className="info-icon"
                    style={{ cursor: "help" }}
                  />
                </Tooltip.Trigger>
                <Tooltip.Content className="TooltipContent" sideOffset={5}>
                  Select the node that will receive the connection invitation. The target node must accept the invitation to establish the connection.
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </Box>
          <Select.Root
            value={formData.targetNodeId > 0 ? formData.targetNodeId.toString() : ""}
            onValueChange={handleTargetNodeChange}
            disabled={!formData.fromNodeId}
          >
            <Select.Trigger className="select-trigger">
              <Select.Value placeholder={formData.fromNodeId ? "Select target node" : "Select source node first"} />
              <Select.Icon>
                <ChevronDownIcon />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="select-content" position="popper">
                <Select.Viewport>
                  {availableTargetNodes.length === 0 ? (
                    <Select.Item value="none" disabled className="select-item">
                      <Select.ItemText>
                        {formData.fromNodeId ? "No other nodes available" : "Select source node first"}
                      </Select.ItemText>
                    </Select.Item>
                  ) : (
                    availableTargetNodes.map((node) => (
                      <Select.Item
                        key={node.id}
                        value={node.id.toString()}
                        className="select-item"
                      >
                        <Select.ItemText>
                          {node.name} - <span style={{ textTransform: 'capitalize', color: '#666' }}>{node.type}</span>
                        </Select.ItemText>
                        <Select.ItemIndicator style={{ marginLeft: "auto" }}>
                          <CheckIcon />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))
                  )}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Form.Field>

        {/* Optional Message */}
        <Form.Field name="message" className="form-field">
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Form.Label className="field-label" style={{ margin: 0 }}>
              Message (Optional)
            </Form.Label>
            <Tooltip.Provider delayDuration={0}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <InfoCircledIcon
                    width={20}
                    height={20}
                    color="#0A0552"
                    className="info-icon"
                    style={{ cursor: "help" }}
                  />
                </Tooltip.Trigger>
                <Tooltip.Content className="TooltipContent" sideOffset={5}>
                  You can include a message to provide context about why you want to establish this connection.
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
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

        <Box className="button-group">
          <Button 
            type="button" 
            variant="soft"
            color="gray"
            className="cancel-button" 
            onClick={onCancel}
            disabled={creating}
          >
            Cancel
          </Button>
          <Form.Submit asChild>
            <Button 
              disabled={creating || availableNodes.length === 0} 
              variant="soft"
              className="submit-button"
            >
              {creating && <Spinner loading />}
              {creating ? "Creating..." : "Create Invitation"}
            </Button>
          </Form.Submit>
        </Box>
      </Form.Root>

      {status === "success" && (
        <Callout.Root color="green" highContrast variant="surface" mt="4">
          <Callout.Icon>
            <CheckIcon />
          </Callout.Icon>
          <Callout.Text>
            Connection invitation created successfully! The target node will be notified.
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
