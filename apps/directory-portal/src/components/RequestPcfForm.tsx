import React, { useState, useEffect, useCallback } from "react";
import * as Form from "@radix-ui/react-form";
import {
  Box,
  Button,
  Callout,
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
  const [filterStatus, setFilterStatus] = useState("");
  const [validOn, setValidOn] = useState("");
  const [validAfter, setValidAfter] = useState("");
  const [validBefore, setValidBefore] = useState("");

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(
        `/nodes/${fromNodeId}/connections?pageSize=100`
      );
      if (!res?.ok) throw new Error("Failed to fetch connections");
      const result = await res.json();
      setConnections(result.data ?? []);
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
    filterStatus ||
    validOn ||
    validAfter ||
    validBefore;

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
    if (filterStatus) filters.status = filterStatus;
    if (validOn) filters.validOn = validOn;
    if (validAfter) filters.validAfter = validAfter;
    if (validBefore) filters.validBefore = validBefore;

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

        <Form.Field name="productId" className="form-field">
          <Form.Label className="field-label">Product ID(s)</Form.Label>
          <TextField.Root
            placeholder="e.g. urn:uuid:abc, urn:uuid:def"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />
          <Text size="1" color="gray">Comma-separated product identifier URNs</Text>
        </Form.Field>

        <Form.Field name="companyId" className="form-field">
          <Form.Label className="field-label">Company ID(s)</Form.Label>
          <TextField.Root
            placeholder="e.g. urn:uuid:org1"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          />
          <Text size="1" color="gray">Comma-separated company identifier URNs</Text>
        </Form.Field>

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

        <Form.Field name="filterStatus" className="form-field">
          <Form.Label className="field-label">Status</Form.Label>
          <Select.Root
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v === "any" ? "" : v)}
          >
            <Select.Trigger placeholder="Any" style={{ width: "100%" }} />
            <Select.Content>
              <Select.Item value="any">Any</Select.Item>
              <Select.Item value="Active">Active</Select.Item>
              <Select.Item value="Deprecated">Deprecated</Select.Item>
            </Select.Content>
          </Select.Root>
        </Form.Field>

        <Form.Field name="validOn" className="form-field">
          <Form.Label className="field-label">Valid On</Form.Label>
          <TextField.Root
            type="date"
            value={validOn}
            onChange={(e) => setValidOn(e.target.value)}
          />
        </Form.Field>

        <Form.Field name="validAfter" className="form-field">
          <Form.Label className="field-label">Valid After</Form.Label>
          <TextField.Root
            type="date"
            value={validAfter}
            onChange={(e) => setValidAfter(e.target.value)}
          />
        </Form.Field>

        <Form.Field name="validBefore" className="form-field">
          <Form.Label className="field-label">Valid Before</Form.Label>
          <TextField.Root
            type="date"
            value={validBefore}
            onChange={(e) => setValidBefore(e.target.value)}
          />
        </Form.Field>

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
