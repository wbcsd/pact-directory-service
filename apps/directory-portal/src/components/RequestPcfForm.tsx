import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  Callout,
  Checkbox,
  Flex,
  Select,
  Spinner,
  Text,
  TextField,
} from "@radix-ui/themes";
import {
  CheckIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import "./NodeForm.css";

interface NodeConnection {
  id: number;
  fromNodeId: number;
  targetNodeId: number;
  targetNodeName?: string;
  fromNodeName?: string;
  status: string;
}

interface FootprintFilters {
  productId?: string[];
  companyId?: string[];
  geography?: string[];
  classification?: string[];
  status?: string;
  validOn?: string;
  validAfter?: string;
  validBefore?: string;
}

interface RequestPcfFormProps {
  fromNodeId: number;
  onCancel: () => void;
  onSent: () => void;
}

/** Parse a comma-separated string into a trimmed non-empty string array */
function parseArray(value: string): string[] | undefined {
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

const RequestPcfForm: React.FC<RequestPcfFormProps> = ({
  fromNodeId,
  onCancel,
  onSent,
}) => {
  const [connections, setConnections] = useState<NodeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [connectionId, setConnectionId] = useState<number | null>(null);

  // Filter fields (raw string state; arrays are comma-separated)
  const [productId, setProductId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [geography, setGeography] = useState("");
  const [classification, setClassification] = useState("");
  const [includeDeprecated, setIncludeDeprecated] = useState(false);
  const [validDate, setValidDate] = useState("");
  const [validOperand, setValidOperand] = useState<"on" | "after" | "before">("on");

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(
        `/nodes/${fromNodeId}/connections?pageSize=100`
      );
      if (!res?.ok) throw new Error("Failed to fetch connections");
      const result = await res.json();
      // Only show outgoing connections (where this node is the initiator) — those are
      // the ones with valid credentials to call the target's PACT API.
      const all: NodeConnection[] = result.data ?? [];
      setConnections(all.filter((c) => c.fromNodeId === fromNodeId));
    } catch {
      setErrorMessage("Failed to load connections. Please try again.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, [fromNodeId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const hasAtLeastOneFilter = () =>
    parseArray(productId) ||
    parseArray(companyId) ||
    parseArray(geography) ||
    parseArray(classification) ||
    includeDeprecated ||
    validDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connectionId) {
      setErrorMessage("Please select a target connection");
      setStatus("error");
      return;
    }

    if (!hasAtLeastOneFilter()) {
      setErrorMessage("At least one filter field must be specified");
      setStatus("error");
      return;
    }

    const filters: FootprintFilters = {};
    const parsedProductId = parseArray(productId);
    if (parsedProductId) filters.productId = parsedProductId;
    const parsedCompanyId = parseArray(companyId);
    if (parsedCompanyId) filters.companyId = parsedCompanyId;
    const parsedGeography = parseArray(geography);
    if (parsedGeography) filters.geography = parsedGeography;
    const parsedClassification = parseArray(classification);
    if (parsedClassification) filters.classification = parsedClassification;
    if (!includeDeprecated) filters.status = "Active";
    if (validDate) {
      if (validOperand === "on") filters.validOn = validDate;
      else if (validOperand === "after") filters.validAfter = validDate;
      else filters.validBefore = validDate;
    }

    try {
      setSubmitting(true);
      setStatus(null);
      setErrorMessage("");

      const res = await fetchWithAuth(`/nodes/${fromNodeId}/pcf-requests`, {
        method: "POST",
        body: JSON.stringify({ connectionId, filters }),
      });

      if (res?.ok) {
        setStatus("success");
        setTimeout(() => onSent(), 1500);
      } else {
        const err = await res?.json();
        setErrorMessage(err?.message ?? "Failed to send PCF request");
        setStatus("error");
      }
    } catch {
      setErrorMessage("An error occurred while sending the request");
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box className="node-form-loading">
        <Spinner loading />
        <Text>Loading connections...</Text>
      </Box>
    );
  }

  if (status === "success") {
    return (
      <Box className="node-form">
        <Callout.Root color="green" mb="4">
          <Callout.Icon>
            <CheckIcon />
          </Callout.Icon>
          <Callout.Text>
            PCF request sent successfully. The target node will respond asynchronously.
          </Callout.Text>
        </Callout.Root>
        <Button variant="soft" onClick={onCancel}>
          Close
        </Button>
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
          Select a connected node and specify at least one filter to request a
          Product Carbon Footprint. The target node will respond asynchronously.
        </Callout.Text>
      </Callout.Root>

      {status === "error" && errorMessage && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{errorMessage}</Callout.Text>
        </Callout.Root>
      )}

      <Form.Root autoComplete="off" onSubmit={handleSubmit}>
        {/* Connection selector */}
        <Form.Field name="connectionId" className="form-field">
          <Form.Label className="field-label">
            Target Node (Connection)<span className="required-asterisk">*</span>
          </Form.Label>
          {connections.length === 0 ? (
            <Callout.Root color="orange" size="1">
              <Callout.Text>
                No active connections found. Create a connection first.
              </Callout.Text>
            </Callout.Root>
          ) : (
            <Select.Root
              value={connectionId ? String(connectionId) : ""}
              onValueChange={(v) => setConnectionId(parseInt(v))}
            >
              <Select.Trigger placeholder="Select a connection…" style={{ width: "100%" }} />
              <Select.Content>
                {connections.map((c) => {
                  const label =
                    c.targetNodeId === fromNodeId
                      ? (c.fromNodeName ?? `Node #${c.fromNodeId}`)
                      : (c.targetNodeName ?? `Node #${c.targetNodeId}`);
                  return (
                    <Select.Item key={c.id} value={String(c.id)}>
                      {label}
                    </Select.Item>
                  );
                })}
              </Select.Content>
            </Select.Root>
          )}
        </Form.Field>

        <Text size="3" weight="bold" mt="4" mb="2" style={{ display: "block" }}>
          Filters — at least one required
        </Text>

        {/* Product ID + Company ID side by side */}
        <Flex gap="3">
          <Form.Field name="productId" className="form-field" style={{ flex: 1 }}>
            <Form.Label className="field-label">Product ID(s)</Form.Label>
            <TextField.Root
              placeholder="e.g. urn:uuid:abc, urn:uuid:def"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            />
            <Text size="1" color="gray">Comma-separated URNs</Text>
          </Form.Field>

          <Form.Field name="companyId" className="form-field" style={{ flex: 1 }}>
            <Form.Label className="field-label">Company ID(s)</Form.Label>
            <TextField.Root
              placeholder="e.g. urn:uuid:org1"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            />
            <Text size="1" color="gray">Comma-separated URNs</Text>
          </Form.Field>
        </Flex>

        <Form.Field name="geography" className="form-field">
          <Form.Label className="field-label">Geography</Form.Label>
          <TextField.Root
            placeholder="e.g. DE, Europe"
            value={geography}
            onChange={(e) => setGeography(e.target.value)}
          />
          <Text size="1" color="gray">Country codes, regions, or subdivisions</Text>
        </Form.Field>

        <Form.Field name="classification" className="form-field">
          <Form.Label className="field-label">Classification</Form.Label>
          <TextField.Root
            placeholder="e.g. urn:pact:classification:steel"
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
          />
          <Text size="1" color="gray">Comma-separated product classification URNs</Text>
        </Form.Field>

        {/* Valid date with operand selector */}
        <Form.Field name="validDate" className="form-field">
          <Form.Label className="field-label">Valid Date</Form.Label>
          <Flex gap="2">
            <Select.Root
              value={validOperand}
              onValueChange={(v) => setValidOperand(v as "on" | "after" | "before")}
            >
              <Select.Trigger style={{ width: "120px" }} />
              <Select.Content>
                <Select.Item value="on">On</Select.Item>
                <Select.Item value="after">After</Select.Item>
                <Select.Item value="before">Before</Select.Item>
              </Select.Content>
            </Select.Root>
            <TextField.Root
              type="date"
              value={validDate}
              onChange={(e) => setValidDate(e.target.value)}
              style={{ flex: 1 }}
            />
          </Flex>
        </Form.Field>

        {/* Include deprecated checkbox */}
        <Box className="form-field">
          <Text as="label" size="2">
            <Flex gap="2" align="center">
              <Checkbox
                checked={includeDeprecated}
                onCheckedChange={(checked) => setIncludeDeprecated(checked === true)}
              />
              Include deprecated PCFs?
            </Flex>
          </Text>
        </Box>

        <Flex gap="3" mt="5">
          <Button type="submit" disabled={submitting || connections.length === 0}>
            {submitting ? <Spinner loading /> : null}
            Send Request
          </Button>
          <Button type="button" variant="soft" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        </Flex>
      </Form.Root>
    </Box>
  );
};

export default RequestPcfForm;
