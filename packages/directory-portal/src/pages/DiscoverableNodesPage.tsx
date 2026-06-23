import React, { useState, useCallback } from "react";
import { Badge, Button, Flex, Text } from "@radix-ui/themes";
import { Link2Icon } from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import PaginatedDataTable, { PaginationInfo } from "../components/PaginatedDataTable";
import { Column } from "../components/DataTable";
import { GridPageLayout } from "../layouts";
import SlideOverPanel from "../components/SlideOverPanel";
import CreateNodeConnectionForm from "../components/CreateNodeConnectionForm";
import PolicyGuard from "../components/PolicyGuard";

interface DiscoverableNode {
  id: number;
  name: string;
  type: "internal" | "external";
  status: "active" | "inactive" | "pending";
  organizationId: number;
  organizationName?: string;
  discoverable: boolean;
}

type PanelState =
  | { mode: "closed" }
  | { mode: "connect"; targetNodeId: number; targetNodeName: string };

const DiscoverableNodesPage: React.FC = () => {
  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  const [refreshTrigger] = useState(0);

  const closePanel = useCallback(() => setPanel({ mode: "closed" }), []);

  const fetchDiscoverableNodes = useCallback(
    async (params: {
      page: number;
      pageSize: number;
      search?: string;
    }): Promise<{ data: DiscoverableNode[]; pagination: PaginationInfo }> => {
      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        pageSize: params.pageSize.toString(),
        ...(params.search && { search: params.search }),
      });
      const response = await fetchWithAuth(`/nodes/discoverable?${queryParams}`);
      if (!response?.ok) throw new Error("Failed to fetch discoverable nodes");
      return response.json();
    },
    []
  );

  const columns: Column<DiscoverableNode>[] = [
    {
      key: "name",
      header: "Node",
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <Flex align="center" gap="2">
          <Text size="2" weight="medium">{row.name}</Text>
          <Badge size="1" color="gray" variant="soft" style={{ textTransform: "capitalize" }}>
            {row.type}
          </Badge>
        </Flex>
      ),
    },
    {
      key: "organizationName",
      header: "Organization",
      sortable: true,
      sortValue: (row) => row.organizationName ?? "",
      render: (row) => (
        <Text size="2">{row.organizationName ?? "—"}</Text>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const colors: Record<string, "green" | "gray" | "yellow"> = {
          active: "green",
          inactive: "gray",
          pending: "yellow",
        };
        return (
          <Badge color={colors[row.status] ?? "gray"} style={{ textTransform: "capitalize" }}>
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      extendedStyle: { textAlign: "right" },
      render: (row) => (
        <Button
          size="1"
          variant="soft"
          onClick={() =>
            setPanel({ mode: "connect", targetNodeId: row.id, targetNodeName: row.name })
          }
        >
          <Link2Icon /> Connect
        </Button>
      ),
    },
  ];

  return (
    <PolicyGuard policies={["view-nodes-own-organization", "view-nodes-all-organizations"]}>
      <GridPageLayout
        title="Discoverable Nodes"
        subtitle="Nodes from other organizations that are open to connections on the PACT Network."
      >
        <PaginatedDataTable<DiscoverableNode>
          isSearchable={true}
          searchPlaceholder="Search by node or organization name..."
          fetchData={fetchDiscoverableNodes}
          columns={columns}
          idColumnName="id"
          defaultPageSize={20}
          refreshTrigger={refreshTrigger}
          emptyState={{
            title: "No discoverable nodes found",
            description:
              "Other organizations haven't made any nodes discoverable yet.",
          }}
        />

        <SlideOverPanel
          open={panel.mode === "connect"}
          onClose={closePanel}
          title="Connect to Node"
          subtitle={panel.mode === "connect" ? panel.targetNodeName : undefined}
        >
          {panel.mode === "connect" && (
            <CreateNodeConnectionForm
              key={panel.targetNodeId}
              targetNodeId={panel.targetNodeId}
              targetNodeName={panel.targetNodeName}
              onCancel={closePanel}
            />
          )}
        </SlideOverPanel>
      </GridPageLayout>
    </PolicyGuard>
  );
};

export default DiscoverableNodesPage;
