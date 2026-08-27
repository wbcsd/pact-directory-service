import React, { useCallback, useState } from "react";
import { Badge, Button, Callout, Flex, IconButton, Link, Text } from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  Pencil1Icon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { fetchWithAuth } from "../utils/auth-fetch";
import PaginatedDataTable, {
  PaginationInfo,
} from "../components/PaginatedDataTable";
import { Column } from "../components/DataTable";
import { GridPageLayout } from "../layouts";
import SlideOverPanel from "../components/SlideOverPanel";
import DataModelExtensionForm from "../components/DataModelExtensionForm";
import PolicyGuard from "../components/PolicyGuard";
import { useAuth } from "../contexts/AuthContext";
import { useConfirm } from "../contexts/ConfirmContext";
import type { DataModelExtension } from "../types/dataModelExtension";

type PanelState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; extensionId: number; extensionName: string };

const DataModelExtensionsList: React.FC = () => {
  const { profileData } = useAuth();
  const confirm = useConfirm();
  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canManage =
    profileData?.policies?.includes("manage-data-model-extensions") ?? false;

  const closePanel = useCallback(() => setPanel({ mode: "closed" }), []);

  const handleSaved = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => closePanel(), 1200);
  }, [closePanel]);

  const fetchExtensions = useCallback(
    async (params: {
      page: number;
      pageSize: number;
      search?: string;
    }): Promise<{ data: DataModelExtension[]; pagination: PaginationInfo }> => {
      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        pageSize: params.pageSize.toString(),
      });
      if (params.search) {
        queryParams.append("search", params.search);
      }

      const response = await fetchWithAuth(
        `/data-model-extensions?${queryParams.toString()}`
      );

      if (!response || !response.ok) {
        throw new Error("Failed to fetch data model extensions");
      }

      return response.json();
    },
    []
  );

  const handleDelete = useCallback(
    async (extension: DataModelExtension) => {
      const confirmed = await confirm({
        title: `Delete "${extension.name}"?`,
        description:
          "This removes the extension from the central registry. This cannot be undone.",
        confirmLabel: "Delete",
      });
      if (!confirmed) return;

      setError(null);
      const response = await fetchWithAuth(
        `/data-model-extensions/${extension.id}`,
        { method: "DELETE" }
      );

      if (response && response.ok) {
        setRefreshTrigger((prev) => prev + 1);
      } else {
        const body = await response?.json().catch(() => null);
        setError(body?.message || "Failed to delete the data model extension");
      }
    },
    [confirm]
  );

  const columns: Column<DataModelExtension>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <Flex direction="column">
          <Text>{row.name}</Text>
          {row.description && (
            <Text size="1" color="gray">
              {row.description}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      key: "version",
      header: "Version",
      sortable: true,
      sortValue: (row) => row.version ?? "",
      render: (row) => row.version || "—",
    },
    {
      key: "specVersion",
      header: "Spec Version",
      sortable: true,
      sortValue: (row) => row.specVersion,
      render: (row) => row.specVersion,
    },
    {
      key: "author",
      header: "Author",
      sortable: true,
      sortValue: (row) => row.author ?? "",
      render: (row) => row.author || "—",
    },
    {
      key: "dataSchemaUrl",
      header: "Schema",
      render: (row) => (
        <Link
          href={row.dataSchemaUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          <Flex align="center" gap="1">
            Schema <ExternalLinkIcon />
          </Flex>
        </Link>
      ),
    },
    {
      key: "nodesCount",
      header: "Nodes",
      sortable: true,
      sortValue: (row) => Number(row.nodesCount ?? 0),
      render: (row) => Number(row.nodesCount ?? 0),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => row.status,
      render: (row) => (
        <Badge color={row.status === "active" ? "green" : "gray"} variant="soft">
          {row.status === "active" ? "Active" : "Deprecated"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) =>
        canManage ? (
          <Flex gap="2" justify="end">
            <IconButton
              variant="ghost"
              color="gray"
              aria-label={`Edit ${row.name}`}
              onClick={(event) => {
                event.stopPropagation();
                setPanel({
                  mode: "edit",
                  extensionId: row.id,
                  extensionName: row.name,
                });
              }}
            >
              <Pencil1Icon />
            </IconButton>
            <IconButton
              variant="ghost"
              color="red"
              aria-label={`Delete ${row.name}`}
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(row);
              }}
            >
              <TrashIcon />
            </IconButton>
          </Flex>
        ) : null,
    },
  ];

  return (
    <GridPageLayout
      title="Data Model Extensions"
      subtitle="A central registry of known PACT data model extensions. Each entry points at a publicly accessible JSON Schema file that defines additional attributes a ProductFootprint can carry. Nodes can declare which extensions they support."
      actions={
        <PolicyGuard policies={["manage-data-model-extensions"]}>
          <Button onClick={() => setPanel({ mode: "add" })}>
            <PlusIcon /> Add Extension
          </Button>
        </PolicyGuard>
      }
    >
      {error && (
        <Callout.Root color="red" highContrast variant="surface" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <PaginatedDataTable<DataModelExtension>
        isSearchable={true}
        searchPlaceholder="Search by name, author or schema URL..."
        fetchData={fetchExtensions}
        columns={columns}
        idColumnName="id"
        defaultPageSize={50}
        refreshTrigger={refreshTrigger}
        emptyState={{
          title: "No data model extensions found",
          description: "No extensions match your search criteria",
        }}
      />

      <SlideOverPanel
        open={panel.mode !== "closed"}
        onClose={closePanel}
        title={
          panel.mode === "add"
            ? "Add Data Model Extension"
            : panel.mode === "edit"
              ? "Edit Data Model Extension"
              : ""
        }
        subtitle={panel.mode === "edit" ? panel.extensionName : undefined}
      >
        {panel.mode === "add" && (
          <DataModelExtensionForm onCancel={closePanel} onSaved={handleSaved} />
        )}
        {panel.mode === "edit" && (
          <DataModelExtensionForm
            key={panel.extensionId}
            extensionId={panel.extensionId}
            onCancel={closePanel}
            onSaved={handleSaved}
          />
        )}
      </SlideOverPanel>
    </GridPageLayout>
  );
};

export default DataModelExtensionsList;
