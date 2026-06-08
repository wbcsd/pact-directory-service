import React, { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Callout,
  Checkbox,
  Flex,
  Spinner,
  Text,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";

interface PcfRequest {
  id: number;
  fromNodeId: number | null;
  fromNodeName?: string;
  requestEventId: string;
  filters: Record<string, unknown>;
}

interface Footprint {
  id: string;
  data: {
    id?: string;
    productNameCompany?: string;
    companyName?: string;
    status?: string;
    productIds?: string[];
  };
}

interface Props {
  nodeId: number;
  request: PcfRequest;
  onCancel: () => void;
  onFulfilled: () => void;
}

const FulfillPcfRequestForm: React.FC<Props> = ({
  nodeId,
  request,
  onCancel,
  onFulfilled,
}) => {
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fromNodeLabel =
    request.fromNodeName ??
    (request.fromNodeId ? `Node #${request.fromNodeId}` : "External node");

  const productIds = (request.filters.productId as string[] | undefined) ?? [];
  const requestComment = (request.filters.requestComment as string | undefined)?.trim();

  useEffect(() => {
    const load = async () => {
      try {
        setLoadError(null);
        // Fetch footprints for this node (up to 100; user can filter further if needed)
        const res = await fetchWithAuth(`/nodes/${nodeId}/footprints?page=1&pageSize=100`);
        if (!res?.ok) throw new Error("Failed to load footprints");
        const result = await res.json();
        const rows: Footprint[] = (result.data ?? []).map((row: { id: string; data: Footprint["data"] }) => ({
          id: row.id,
          data: row.data ?? {},
        }));
        setFootprints(rows);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load footprints");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [nodeId]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) {
      setSubmitError("Select at least one PCF record to fulfill the request.");
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError(null);
      const res = await fetchWithAuth(
        `/nodes/${nodeId}/pcf-requests/${request.id}/fulfill`,
        {
          method: "POST",
          body: JSON.stringify({ footprintIds: Array.from(selected) }),
        }
      );
      if (!res?.ok) {
        const body = await res?.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to fulfill request");
      }
      onFulfilled();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Flex direction="column" gap="4">
      {/* Request context */}
      <Callout.Root color="gray" variant="soft">
        <Callout.Icon><InfoCircledIcon /></Callout.Icon>
        <Callout.Text>
          <strong>From:</strong> {fromNodeLabel}
          {productIds.length > 0 && (
            <>
              {" · "}
              <strong>Product IDs:</strong> {productIds.join(", ")}
            </>
          )}
          {requestComment && (
            <>
              <br />
              <strong>Requester context:</strong> {requestComment}
            </>
          )}
        </Callout.Text>
      </Callout.Root>

      {/* Footprint list */}
      {loading && (
        <Flex align="center" justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      )}

      {loadError && (
        <Callout.Root color="red">
          <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
          <Callout.Text>{loadError}</Callout.Text>
        </Callout.Root>
      )}

      {!loading && !loadError && footprints.length === 0 && (
        <Callout.Root color="yellow">
          <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
          <Callout.Text>
            No PCF records found for this node. Use <strong>Create &amp; Fulfill</strong> to add one first.
          </Callout.Text>
        </Callout.Root>
      )}

      {!loading && footprints.length > 0 && (
        <Box>
          <Text size="2" color="gray" mb="2" as="p">
            Select the PCF records to include in the response:
          </Text>
          <Flex direction="column" gap="2">
            {footprints.map((fp) => {
              const pcfId = fp.data.id ?? fp.id;
              const name = fp.data.productNameCompany ?? pcfId;
              const company = fp.data.companyName;
              const status = fp.data.status;
              return (
                <Box
                  key={fp.id}
                  p="3"
                  style={{
                    border: "1px solid var(--gray-a5)",
                    borderRadius: "var(--radius-2)",
                    cursor: "pointer",
                    background: selected.has(fp.id) ? "var(--accent-a2)" : undefined,
                  }}
                  onClick={() => toggleSelected(fp.id)}
                >
                  <Flex align="center" gap="3">
                    <Checkbox checked={selected.has(fp.id)} onCheckedChange={() => toggleSelected(fp.id)} />
                    <Box flexGrow="1">
                      <Text size="2" weight="medium">{name}</Text>
                      {company && <Text size="1" color="gray" as="p">{company}</Text>}
                    </Box>
                    {status && (
                      <Badge color={status === "Active" ? "green" : "gray"} size="1">
                        {status}
                      </Badge>
                    )}
                  </Flex>
                </Box>
              );
            })}
          </Flex>
        </Box>
      )}

      {submitError && (
        <Callout.Root color="red">
          <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
          <Callout.Text>{submitError}</Callout.Text>
        </Callout.Root>
      )}

      <Flex gap="2" justify="end" mt="2">
        <Button variant="soft" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || loading || footprints.length === 0}
          loading={submitting}
        >
          Fulfill Request
        </Button>
      </Flex>
    </Flex>
  );
};

export default FulfillPcfRequestForm;
